import { Task, PageData, OcrProviderId } from '../types';
import { processDocument, parsePageRange, processSinglePage } from './ocrService';
import { pdfjsLib } from './pdfRenderer';
import { buildDefaultVariants } from '../utils/helpers';

type TaskUpdater = (taskId: string, updater: (task: Task) => Task) => void;
type SourceFileUpdater = (sourceFileId: string, pageMap: number[]) => void;

interface QueueCallbacks {
  updateTask: TaskUpdater;
  updateSourceFilePageMap: SourceFileUpdater;
  getTask: (taskId: string) => Task | undefined;
  getSourceFile: (sourceFileId: string) => { originalFile: File; pageRange: string; pageMap: number[] } | undefined;
}

/**
 * Per-provider serial, cross-provider parallel task queue.
 * Each provider has its own queue. Tasks within a provider run serially.
 * Tasks across different providers run in parallel.
 */
export class TaskQueue {
  private providerQueues: Map<string, string[]> = new Map(); // providerId -> taskId[]
  private runningProviders: Set<string> = new Set();
  private abortControllers: Map<string, AbortController> = new Map();
  private callbacks: QueueCallbacks;

  constructor(callbacks: QueueCallbacks) {
    this.callbacks = callbacks;
  }

  enqueue(task: Task): void {
    const providerId = task.providerId;
    if (!this.providerQueues.has(providerId)) {
      this.providerQueues.set(providerId, []);
    }
    this.providerQueues.get(providerId)!.push(task.id);
    this.processNext(providerId);
  }

  enqueueBatch(tasks: Task[]): void {
    for (const task of tasks) {
      const providerId = task.providerId;
      if (!this.providerQueues.has(providerId)) {
        this.providerQueues.set(providerId, []);
      }
      this.providerQueues.get(providerId)!.push(task.id);
    }
    // Kick off all provider queues
    const providers = new Set(tasks.map(t => t.providerId));
    for (const providerId of providers) {
      this.processNext(providerId);
    }
  }

  abort(taskId: string): void {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
    }
  }

  abortAll(): void {
    for (const [, controller] of this.abortControllers) {
      controller.abort();
    }
  }

  private async processNext(providerId: string): Promise<void> {
    if (this.runningProviders.has(providerId)) return;

    const queue = this.providerQueues.get(providerId);
    if (!queue || queue.length === 0) return;

    const taskId = queue.shift()!;
    const task = this.callbacks.getTask(taskId);
    if (!task || task.status === 'done' || task.status === 'error') {
      this.processNext(providerId);
      return;
    }

    this.runningProviders.add(providerId);

    if (task.type === 'ocr') {
      await this.runOcrTask(taskId, providerId);
    } else {
      await this.runPromptTask(taskId, providerId);
    }

    this.runningProviders.delete(providerId);
    this.processNext(providerId);
  }

  private syncPageVariants(page: PageData): PageData {
    const variants = buildDefaultVariants(page.rawOCR || '', page.restored ?? null);
    return { ...page, restoredVariants: variants };
  }

  private async runOcrTask(taskId: string, providerId: string): Promise<void> {
    const task = this.callbacks.getTask(taskId);
    if (!task || !task.sourceFileId) return;

    const source = this.callbacks.getSourceFile(task.sourceFileId);
    if (!source) {
      this.callbacks.updateTask(taskId, t => ({
        ...t,
        status: 'error',
        statusMessage: '源文件不存在',
      }));
      return;
    }

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    this.callbacks.updateTask(taskId, t => ({
      ...t,
      status: 'running',
      statusMessage: '启动中...',
      startedAt: Date.now(),
      pagesData: {},
    }));

    try {
      let pageMap: number[] = [1];
      if (source.originalFile.type === 'application/pdf') {
        const ab = await source.originalFile.arrayBuffer();
        const doc = await pdfjsLib.getDocument(ab).promise;
        pageMap = parsePageRange(source.pageRange || 'all', doc.numPages);
      }

      this.callbacks.updateSourceFilePageMap(task.sourceFileId, pageMap);

      const initialPagesData: Record<number, PageData> = {};
      pageMap.forEach((_, idx) => {
        initialPagesData[idx] = {
          rawOCR: '',
          restored: null,
          restoredVariants: { json: '{}', html: '<pre></pre>', md: '' },
          status: 'pending',
        };
      });

      this.callbacks.updateTask(taskId, t => ({ ...t, pagesData: initialPagesData }));

      await processDocument(
        source.originalFile,
        msg => {
          this.callbacks.updateTask(taskId, t => ({ ...t, statusMessage: msg }));
        },
        (pageIndex, pageUpdate) => {
          this.callbacks.updateTask(taskId, t => {
            const existing = t.pagesData[pageIndex] || {
              rawOCR: '',
              restored: null,
              status: 'pending' as const,
            };
            const merged = this.syncPageVariants({ ...existing, ...pageUpdate });
            return {
              ...t,
              pagesData: { ...t.pagesData, [pageIndex]: merged },
            };
          });
        },
        pageMap,
        controller.signal,
        { providerId: task.providerId as OcrProviderId, modelId: task.modelId }
      );

      this.callbacks.updateTask(taskId, t => ({
        ...t,
        status: 'done',
        statusMessage: '完成',
        completedAt: Date.now(),
      }));
    } catch (error: any) {
      const aborted = error?.message === 'Process aborted by user';
      this.callbacks.updateTask(taskId, t => ({
        ...t,
        status: aborted ? 'queued' : 'error',
        statusMessage: aborted ? '已停止' : error?.message || '处理失败',
        completedAt: aborted ? undefined : Date.now(),
      }));
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  private async runPromptTask(taskId: string, _providerId: string): Promise<void> {
    const task = this.callbacks.getTask(taskId);
    if (!task) return;

    const controller = new AbortController();
    this.abortControllers.set(taskId, controller);

    this.callbacks.updateTask(taskId, t => ({
      ...t,
      status: 'running',
      statusMessage: '请求中...',
      startedAt: Date.now(),
    }));

    try {
      const { callTextModel } = await import('./textService');
      const result = await callTextModel(
        task.providerId,
        task.modelId,
        task.systemPrompt || '',
        task.userPrompt || '',
        controller.signal,
        { temperature: task.temperature, maxTokens: task.maxTokens }
      );

      this.callbacks.updateTask(taskId, t => ({
        ...t,
        status: 'done',
        statusMessage: '完成',
        response: result.content,
        tokenUsage: result.tokenUsage,
        completedAt: Date.now(),
      }));
    } catch (error: any) {
      const aborted = error?.message?.includes('abort');
      this.callbacks.updateTask(taskId, t => ({
        ...t,
        status: aborted ? 'queued' : 'error',
        statusMessage: aborted ? '已停止' : error?.message || '请求失败',
        completedAt: aborted ? undefined : Date.now(),
      }));
    } finally {
      this.abortControllers.delete(taskId);
    }
  }

  /** Retry a single page of an OCR task */
  async retrySinglePage(
    taskId: string,
    physicalPageNum: number,
    editorPageIndex: number
  ): Promise<void> {
    const task = this.callbacks.getTask(taskId);
    if (!task || !task.sourceFileId) return;

    const source = this.callbacks.getSourceFile(task.sourceFileId);
    if (!source) return;

    const result = await processSinglePage(
      source.originalFile,
      physicalPageNum,
      undefined,
      { providerId: task.providerId as OcrProviderId, modelId: task.modelId }
    );

    this.callbacks.updateTask(taskId, t => {
      const updatedPage = this.syncPageVariants({
        rawOCR: result.raw,
        restored: result.restored,
        status: 'complete',
        verificationResult: result.verificationResult,
      });
      return {
        ...t,
        pagesData: { ...t.pagesData, [editorPageIndex]: updatedPage },
      };
    });
  }
}
