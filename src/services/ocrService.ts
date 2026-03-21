import * as pdfjsLib from 'pdfjs-dist';
import {
  VERIFIER_MODEL_NAME,
  DEFAULT_VERIFIER_SYSTEM_PROMPT,
  DEFAULT_VERIFIER_USER_PROMPT,
  DEFAULT_OCR_MODEL,
} from '../constants';
import { PageData, RestoreFormat } from '../types';
import {
  getApiKey as readApiKeyFromConfig,
  getDefaultOcrModel,
  OcrProviderId,
  saveApiKey as persistApiKeyToConfig,
} from './configAdapter';

pdfjsLib.GlobalWorkerOptions.workerSrc = `https://esm.sh/pdfjs-dist@4.4.168/build/pdf.worker.min.mjs`;

const UCLOUD_BASE_URL = 'https://api.modelverse.cn/v1';
const SILICONFLOW_BASE_URL = 'https://api.siliconflow.cn/v1';
const BIGMODEL_BASE_URL = 'https://open.bigmodel.cn/api';
const PROMPT_STORAGE_KEY = 'VERIFIER_SYSTEM_PROMPT_LOGIC_V6';

export interface OcrTaskContext {
  providerId?: OcrProviderId;
  modelId?: string;
  docType?: string;  // 文档类型提示，用于优化PaddleOCR prompt选择
}

export const checkApiKey = (providerId: OcrProviderId = 'ucloud') => {
  return readApiKeyFromConfig(providerId);
};

export const saveApiKey = (key: string, providerId: OcrProviderId = 'ucloud') => {
  persistApiKeyToConfig(key, providerId);
};

export const getVerifierPrompt = () => {
  return localStorage.getItem(PROMPT_STORAGE_KEY) || DEFAULT_VERIFIER_SYSTEM_PROMPT;
};

export const saveVerifierPrompt = (prompt: string) => {
  localStorage.setItem(PROMPT_STORAGE_KEY, prompt);
};

// Phase-1 fixed model (kept for compatibility with existing imports)
export const getOcrModelName = () => getDefaultOcrModel().modelId || DEFAULT_OCR_MODEL;
export const saveOcrModelName = (_modelName: string) => {
  // no-op: App side now persists through configAdapter
};

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

type RenderPurpose = 'ocr' | 'preview';

interface RenderPageOptions {
  modelId?: string;
  purpose?: RenderPurpose;
}

const getRenderConfig = (options?: RenderPageOptions): { scale: number; mimeType: 'image/jpeg' | 'image/png'; quality?: number } => {
  const purpose = options?.purpose || 'ocr';
  const modelId = options?.modelId || '';

  if (purpose === 'preview') {
    return { scale: 2.0, mimeType: 'image/jpeg', quality: 0.85 };
  }

  if (/paddleocr/i.test(modelId)) {
    // PaddleOCR-VL is sensitive to tiny Chinese text and table lines; use higher-res lossless image.
    return { scale: 3.0, mimeType: 'image/png' };
  }

  return { scale: 2.2, mimeType: 'image/jpeg', quality: 0.9 };
};

const renderPageToImage = async (pdf: any, pageNum: number, options?: RenderPageOptions): Promise<string> => {
  const page = await pdf.getPage(pageNum);
  const config = getRenderConfig(options);
  const viewport = page.getViewport({ scale: config.scale });
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');

  canvas.height = viewport.height;
  canvas.width = viewport.width;

  if (!context) throw new Error('Canvas context missing');

  await page.render({ canvasContext: context, viewport }).promise;

  return config.mimeType === 'image/png'
    ? canvas.toDataURL(config.mimeType)
    : canvas.toDataURL(config.mimeType, config.quality ?? 0.85);
};

const getProviderApiKeyError = (providerId: OcrProviderId): string => {
  return providerId === 'bigmodel'
    ? '缺少 BigModel API Key，请在设置中配置。'
    : '缺少 SiliconFlow API Key，请在设置中配置。';
};

const extractBigmodelMarkdown = (data: any): string => {
  if (typeof data?.md_results === 'string' && data.md_results.trim()) {
    return data.md_results;
  }

  if (Array.isArray(data?.layout_details)) {
    const blocks = data.layout_details
      .flatMap((pageDetails: any) => (Array.isArray(pageDetails) ? pageDetails : []))
      .map((detail: any) => (typeof detail?.content === 'string' ? detail.content : ''))
      .filter((content: string) => content.trim().length > 0);

    if (blocks.length > 0) {
      return blocks.join('\n\n');
    }
  }

  return '';
};

/**
 * 获取PaddleOCR-VL的推荐Prompt
 * 根据官方文档，应使用简洁的Task Prompt而非复杂指令
 * @see https://paddlepaddle.github.io/PaddleOCR/main/version3.x/pipeline_usage/PaddleOCR-VL.html
 */
const getPaddleOcrPrompt = (docType?: string): string => {
  // 根据文档类型选择最佳prompt
  // 官方推荐的简洁prompt格式，避免给0.9B轻量模型过多负担
  if (docType?.includes('table') || docType?.includes('清单') || docType?.includes('列表')) {
    return 'Table Recognition:';  // 表格识别
  }
  if (docType?.includes('formula') || docType?.includes('公式')) {
    return 'Formula Recognition:';  // 公式识别
  }
  if (docType?.includes('chart') || docType?.includes('图表')) {
    return 'Chart Recognition:';  // 图表识别
  }
  if (docType?.includes('seal') || docType?.includes('印章')) {
    return 'Seal Recognition:';  // 印章识别
  }
  // 默认OCR，适用于普通医疗票据
  return 'OCR:';
};

const callSiliconFlowOcr = async (
  imageBase64: string,
  apiKey: string,
  modelId: string,
  customPrompt?: string,
  signal?: AbortSignal,
  docType?: string  // 新增：文档类型提示
): Promise<string> => {
  // PaddleOCR-VL-1.5 使用官方推荐的简洁prompt
  // DeepSeek-OCR 使用其特有的 grounding prompt
  const defaultPrompt = /paddleocr/i.test(modelId)
    ? getPaddleOcrPrompt(docType)
    : '<image>\n<|grounding|>Convert the document to markdown.';
  const finalPrompt = customPrompt || defaultPrompt;

  const isPaddleOcr = /paddleocr/i.test(modelId);

  const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: imageBase64 } },
            { type: 'text', text: finalPrompt },
          ],
        },
      ],
      stream: false,
      // PaddleOCR-VL 使用稍高的temperature (0.1) 给0.9B模型一些灵活性
      // DeepSeek-OCR 保持0.0以获得确定性输出
      temperature: isPaddleOcr ? 0.1 : 0.0,
      max_tokens: isPaddleOcr ? 4096 : 4096,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API Key');
    if (response.status === 429) throw new Error('API Error: 429 Rate Limit Exceeded');
    const err = await response.json();
    throw new Error(err.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  return content.replace(/^```markdown\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
};

/**
 * 调用 UCloud ModelVerse OCR API
 * UCloud API 是 OpenAI 兼容格式，但 message content 顺序不同（text 在前，image 在后）
 */
const callUcloudOcr = async (
  imageBase64: string,
  apiKey: string,
  modelId: string,
  customPrompt?: string,
  signal?: AbortSignal
): Promise<string> => {
  // DeepSeek-OCR-2 默认 prompt
  const defaultPrompt = '请提取图片中的所有文字内容';
  const finalPrompt = customPrompt || defaultPrompt;

  const response = await fetch(`${UCLOUD_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        {
          role: 'user',
          content: [
            // UCloud: text 在前，image 在后
            { type: 'text', text: finalPrompt },
            { type: 'image_url', image_url: { url: imageBase64 } },
          ],
        },
      ],
      stream: false,
      temperature: 0.1,
      max_tokens: 4096,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API Key');
    if (response.status === 429) throw new Error('API Error: 429 Rate Limit Exceeded');
    const err = await response.json();
    throw new Error(err.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content || '';
  return content.replace(/^```markdown\s*/, '').replace(/^```\s*/, '').replace(/\s*```$/, '');
};

const callBigModelOcr = async (
  imageBase64: string,
  apiKey: string,
  modelId: string,
  signal?: AbortSignal
): Promise<string> => {
  const authHeader = apiKey.startsWith('Bearer ') ? apiKey : apiKey.trim();

  const response = await fetch(`${BIGMODEL_BASE_URL}/paas/v4/layout_parsing`, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId || 'glm-ocr',
      file: imageBase64,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API Key');
    if (response.status === 429) throw new Error('API Error: 429 Rate Limit Exceeded');
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = extractBigmodelMarkdown(data);
  if (!content.trim()) {
    throw new Error('GLM-OCR returned empty content');
  }
  return content.replace(/^```(markdown|md)?\s*/i, '').replace(/\s*```$/i, '');
};

const callOcrModel = async (
  imageBase64: string,
  apiKey: string,
  pageLabel: string,
  customPrompt?: string,
  retries = 5,
  signal?: AbortSignal,
  taskContext?: OcrTaskContext
): Promise<string> => {
  let lastError: any;
  const modelId = taskContext?.modelId || DEFAULT_OCR_MODEL;
  const providerId = taskContext?.providerId || 'ucloud';

  console.log(`[OCR] Starting Request for ${pageLabel} using provider=${providerId}, model=${modelId}`);

  for (let i = 0; i < retries; i++) {
    if (signal?.aborted) throw new Error('Process aborted by user');

    try {
      const docType = taskContext?.docType;
      let content: string;

      // 根据 provider 选择对应的 OCR 调用
      switch (providerId) {
        case 'ucloud':
          content = await callUcloudOcr(imageBase64, apiKey, modelId, customPrompt, signal);
          break;
        case 'bigmodel':
          content = await callBigModelOcr(imageBase64, apiKey, modelId, signal);
          break;
        case 'siliconflow':
        default:
          content = await callSiliconFlowOcr(imageBase64, apiKey, modelId, customPrompt, signal, docType);
          break;
      }

      console.log(`[OCR] Success for ${pageLabel} (Length: ${content.length})`);
      return content;
    } catch (error: any) {
      if (error.name === 'AbortError' || signal?.aborted) throw new Error('Process aborted by user');

      lastError = error;
      const isRateLimit = typeof error.message === 'string' && error.message.includes('429');

      console.warn(`[OCR] Failed ${pageLabel} (Attempt ${i + 1}/${retries}).`, error);

      if (i < retries - 1) {
        const waitTime = isRateLimit ? 5000 * (i + 1) : 1000 * Math.pow(2, i);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  throw lastError;
};

const callLayoutRestorationModel = async (
  imageBase64: string,
  rawOcrText: string,
  apiKey: string,
  signal?: AbortSignal,
  retries = 3
): Promise<{ content: string; hasRealTable: boolean; cleaned: boolean; reasoning?: string }> => {
  const parts = rawOcrText.split(/(<table[^>]*>[\s\S]*?<\/table>)/i);

  if (parts.length <= 1) {
    return {
      content: rawOcrText,
      hasRealTable: false,
      cleaned: false,
      reasoning: 'No tables detected in OCR.',
    };
  }

  const systemPrompt = getVerifierPrompt();
  let fullReasoningLog = '';
  let hasAnyRealTable = false;
  let hasAnyCleaned = false;

  const processedParts = await Promise.all(
    parts.map(async (part, index) => {
      if (!part.match(/^<table/i)) {
        return part;
      }

      const tableIndex = Math.floor(index / 2) + 1;
      const tableHtml = part;
      const userPromptText = DEFAULT_VERIFIER_USER_PROMPT.replace('{{ocr_html}}', tableHtml).replace('{{pdf_img}}', '(见附图)');

      for (let i = 0; i < retries; i++) {
        if (signal?.aborted) throw new Error('Process aborted by user');

        try {
          const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              model: VERIFIER_MODEL_NAME,
              messages: [
                { role: 'system', content: systemPrompt },
                {
                  role: 'user',
                  content: [
                    { type: 'image_url', image_url: { url: imageBase64 } },
                    { type: 'text', text: userPromptText },
                  ],
                },
              ],
              stream: false,
              temperature: 0.1,
              max_tokens: 3000,
            }),
            signal,
          });

          if (!response.ok) {
            if (response.status === 429) throw new Error('429 Rate Limit');
            throw new Error(`API Error: ${response.status}`);
          }

          const data = await response.json();
          const message = data.choices[0]?.message;
          let finalContent = message?.content || '';

          const reasoningContent = message?.reasoning_content || '';
          if (reasoningContent) {
            fullReasoningLog += `\n[Table #${tableIndex} Thinking]:\n${reasoningContent}\n`;
          }

          finalContent = finalContent
            .replace(/^```(markdown|html|xml)?\s*/i, '')
            .replace(/\s*```$/i, '')
            .trim();

          const outputHasHtmlTable = /<table/i.test(finalContent);
          const outputHasMarkdownTable = /\|[\s-]*:?---[\s-]*\|/.test(finalContent);

          if (outputHasHtmlTable || outputHasMarkdownTable) {
            hasAnyRealTable = true;
          } else {
            hasAnyCleaned = true;
          }

          return finalContent;
        } catch (error: any) {
          if (error.name === 'AbortError' || signal?.aborted) throw new Error('Process aborted by user');

          if (i === retries - 1) {
            fullReasoningLog += `[Table Segment ${tableIndex}]: Failed (${error.message})\n`;
            return tableHtml;
          }

          const waitTime = error.message.includes('429') ? 2000 * (i + 1) : 1000;
          await new Promise(r => setTimeout(r, waitTime));
        }
      }

      return tableHtml;
    })
  );

  return {
    content: processedParts.join(''),
    hasRealTable: hasAnyRealTable,
    cleaned: hasAnyCleaned,
    reasoning: fullReasoningLog || 'Table segments processed individually.',
  };
};

const normalizePromptFormat = (format: RestoreFormat): 'json' | 'html' | 'md' => {
  if (format === 'json' || format === 'html' || format === 'md') {
    return format;
  }
  return 'md';
};

export const restoreTextWithPrompt = async (
  rawContent: string,
  customPrompt: string,
  targetFormat: RestoreFormat,
  signal?: AbortSignal
): Promise<string> => {
  const apiKey = checkApiKey('siliconflow');
  if (!apiKey) {
    throw new Error('缺少 SiliconFlow API Key，无法执行提示词还原。');
  }

  const format = normalizePromptFormat(targetFormat);
  const formatInstruction =
    format === 'json'
      ? '输出必须是有效 JSON 字符串，不要额外解释。'
      : format === 'html'
      ? '输出必须是 HTML 字符串，不要额外解释。'
      : '输出必须是 Markdown 字符串，不要额外解释。';

  const response = await fetch(`${SILICONFLOW_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: VERIFIER_MODEL_NAME,
      messages: [
        {
          role: 'system',
          content: [
            '你是文档结构还原助手。',
            formatInstruction,
            '必须保留关键信息，避免丢字段。',
          ].join('\n'),
        },
        {
          role: 'user',
          content: [
            `用户提示词：${customPrompt || '请做结构化还原'}`,
            `目标格式：${format}`,
            '原始 OCR 内容如下：',
            rawContent,
          ].join('\n\n'),
        },
      ],
      stream: false,
      temperature: 0.2,
      max_tokens: 4096,
    }),
    signal,
  });

  if (!response.ok) {
    if (response.status === 401) throw new Error('Invalid API Key');
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Restore API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  return content
    .replace(/^```(json|html|markdown|md)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
};

export const processSinglePage = async (
  file: File,
  physicalPageNum: number,
  customPrompt?: string,
  taskContext?: OcrTaskContext
): Promise<{
  raw: string;
  restored: string | null;
  verificationResult?: { hasTable: boolean; reason: string; modelReasoning?: string };
}> => {
  const providerId = taskContext?.providerId || 'siliconflow';
  const apiKey = checkApiKey(providerId);
  if (!apiKey) throw new Error(getProviderApiKeyError(providerId));

  let imageBase64 = '';
  if (file.type === 'application/pdf') {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    imageBase64 = await renderPageToImage(pdf, physicalPageNum, {
      modelId: taskContext?.modelId,
      purpose: 'ocr',
    });
  } else {
    imageBase64 = await fileToBase64(file);
  }

  const rawContent = await callOcrModel(imageBase64, apiKey, `Page ${physicalPageNum}`, customPrompt, 5, undefined, taskContext);
  const hasTable = /<table/i.test(rawContent);

  if (!hasTable) {
    return {
      raw: rawContent,
      restored: rawContent,
      verificationResult: { hasTable: false, reason: '无表格 (无需重绘)' },
    };
  }

  const restorationApiKey = checkApiKey('siliconflow');
  if (!restorationApiKey) {
    return {
      raw: rawContent,
      restored: rawContent,
      verificationResult: {
        hasTable: true,
        reason: '检测到表格，未配置 SiliconFlow Key，跳过二次还原',
      },
    };
  }

  const restorationResult = await callLayoutRestorationModel(imageBase64, rawContent, restorationApiKey, undefined, 2);

  return {
    raw: rawContent,
    restored: restorationResult.content,
    verificationResult: {
      hasTable: restorationResult.hasRealTable,
      reason: restorationResult.cleaned ? '文档结构已还原' : '表格已保留',
      modelReasoning: restorationResult.reasoning,
    },
  };
};

export const parsePageRange = (rangeStr: string, totalPages: number): number[] => {
  const pages = new Set<number>();
  if (!rangeStr || rangeStr === 'all') {
    for (let i = 1; i <= totalPages; i++) pages.add(i);
    return Array.from(pages).sort((a, b) => a - b);
  }

  const parts = rangeStr.split(/[,;]/);
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map(Number);
      if (!isNaN(start) && !isNaN(end)) {
        for (let i = start; i <= end; i++) {
          if (i >= 1 && i <= totalPages) pages.add(i);
        }
      }
    } else {
      const page = Number(trimmed);
      if (!isNaN(page) && page >= 1 && page <= totalPages) {
        pages.add(page);
      }
    }
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  return sorted.length > 0 ? sorted : Array.from({ length: totalPages }, (_, i) => i + 1);
};

export const processDocument = async (
  file: File,
  onProgress: (status: string) => void,
  onPageUpdate: (pageIndex: number, data: Partial<PageData>) => void,
  pagesToProcess: number[],
  signal?: AbortSignal,
  taskContext?: OcrTaskContext
): Promise<string> => {
  const providerId = taskContext?.providerId || 'siliconflow';
  const apiKey = checkApiKey(providerId);
  if (!apiKey) {
    throw new Error(getProviderApiKeyError(providerId));
  }
  const restorationApiKey = checkApiKey('siliconflow');
  const canRestoreTables = Boolean(restorationApiKey);

  const fileType = file.type;

  try {
    if (fileType === 'application/pdf') {
      onProgress('正在加载 PDF...');
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      const pdf = await loadingTask.promise;

      const restorationPromises: Promise<void>[] = [];

      for (let i = 0; i < pagesToProcess.length; i++) {
        if (signal?.aborted) throw new Error('Process aborted by user');

        const pageNum = pagesToProcess[i];
        onPageUpdate(i, { status: 'pending' });

        try {
          onProgress(`正在处理: �� ${pageNum} 页 (OCR识别中)...`);

          const imageBase64 = await renderPageToImage(pdf, pageNum, {
            modelId: taskContext?.modelId,
            purpose: 'ocr',
          });
          if (signal?.aborted) throw new Error('Process aborted by user');

          const rawContent = await callOcrModel(imageBase64, apiKey, `Page ${pageNum}`, undefined, 5, signal, taskContext);

          onPageUpdate(i, {
            rawOCR: rawContent,
            restored: null,
            status: 'ocr_success',
          });

          const hasTable = /<table/i.test(rawContent);

          if (!hasTable) {
            onPageUpdate(i, {
              status: 'complete',
              verificationResult: {
                hasTable: false,
                reason: '无表格 (无需重绘)',
              },
            });
          } else {
            if (!canRestoreTables || !restorationApiKey) {
              onPageUpdate(i, {
                restored: rawContent,
                status: 'complete',
                verificationResult: {
                  hasTable: true,
                  reason: '检测到表格，未配置 SiliconFlow Key，跳过二次还原',
                },
              });
              continue;
            }

            const restorationTask = (async () => {
              if (signal?.aborted) return;

              await new Promise(r => setTimeout(r, 200));

              onPageUpdate(i, { status: 'restoring' });

              try {
                const restorationResult = await callLayoutRestorationModel(imageBase64, rawContent, restorationApiKey, signal, 3);

                if (signal?.aborted) return;

                onPageUpdate(i, {
                  restored: restorationResult.content,
                  status: 'complete',
                  verificationResult: {
                    hasTable: restorationResult.hasRealTable,
                    reason: restorationResult.cleaned ? '文档结构已还原' : '表格已保留',
                    modelReasoning: restorationResult.reasoning,
                  },
                });
              } catch (err: any) {
                if (signal?.aborted) return;
                onPageUpdate(i, {
                  status: 'error',
                  errorMessage: `还原失败: ${err.message}`,
                });
              }
            })();
            restorationPromises.push(restorationTask);
          }
        } catch (pageError: any) {
          if (signal?.aborted || pageError.message === 'Process aborted by user') throw new Error('Process aborted by user');

          onPageUpdate(i, {
            status: 'error',
            errorMessage: pageError.message || 'Unknown error',
          });
        }
      }

      if (restorationPromises.length > 0) {
        onProgress('OCR 扫描完成，正在等待后台排版优化...');
        await Promise.all(restorationPromises);
      } else {
        onProgress('OCR 扫描完成。');
      }

      return 'DONE';
    }

    if (fileType.startsWith('image/')) {
      onProgress('正在处理图片...');
      const imageBase64 = await fileToBase64(file);

      onPageUpdate(0, { status: 'pending' });

      const rawContent = await callOcrModel(imageBase64, apiKey, 'Image', undefined, 5, signal, taskContext);
      onPageUpdate(0, { rawOCR: rawContent, status: 'ocr_success' });

      const hasTable = /<table/i.test(rawContent);
      if (!hasTable) {
        onPageUpdate(0, {
          status: 'complete',
          verificationResult: { hasTable: false, reason: '无表格' },
        });
        return rawContent;
      }

      if (!canRestoreTables || !restorationApiKey) {
        onPageUpdate(0, {
          restored: rawContent,
          status: 'complete',
          verificationResult: {
            hasTable: true,
            reason: '检测到表格，未配置 SiliconFlow Key，跳过二次还原',
          },
        });
        return rawContent;
      }

      onProgress('正在智能还原版式...');
      const restorationResult = await callLayoutRestorationModel(imageBase64, rawContent, restorationApiKey, signal);

      onPageUpdate(0, {
        restored: restorationResult.content,
        status: 'complete',
        verificationResult: {
          hasTable: restorationResult.hasRealTable,
          reason: restorationResult.cleaned ? '文档结构已还原' : '表格已保留',
          modelReasoning: restorationResult.reasoning,
        },
      });
      return restorationResult.content;
    }

    throw new Error('不支持的文件类型。');
  } catch (error: any) {
    if (error.message === 'Process aborted by user') {
      throw error;
    }
    throw new Error(error.message || '文档处理失败');
  }
};
