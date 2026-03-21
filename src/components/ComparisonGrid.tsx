import React, { useState, useMemo, useCallback } from 'react';
import { Loader2, ChevronLeft, ChevronRight, Eye, Code2, FileText } from 'lucide-react';
import { useStore } from '../state/store';
import { formatDuration } from '../utils/helpers';
import type { Task, PageData, ProcessingStatus, RestoreFormat } from '../types';
import PdfViewer from './PdfViewer';
import MarkdownRenderer from './MarkdownRenderer';

// ============================================================
// Status Badge
// ============================================================
const statusConfig: Record<ProcessingStatus, { bg: string; text: string; ring: string; label: string }> = {
  pending:  { bg: 'bg-slate-50',    text: 'text-slate-600',   ring: 'ring-slate-200',   label: '待处理' },
  queued:   { bg: 'bg-amber-50',    text: 'text-amber-700',   ring: 'ring-amber-200',   label: '排队中' },
  running:  { bg: 'bg-indigo-50',   text: 'text-indigo-700',  ring: 'ring-indigo-200',  label: '处理中' },
  done:     { bg: 'bg-emerald-50',  text: 'text-emerald-700', ring: 'ring-emerald-200', label: '已完成' },
  error:    { bg: 'bg-red-50',      text: 'text-red-700',     ring: 'ring-red-200',     label: '错误' },
};

const StatusBadge: React.FC<{ status: ProcessingStatus }> = ({ status }) => {
  const cfg = statusConfig[status];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ring-1 ${cfg.bg} ${cfg.text} ${cfg.ring}`}>
      {status === 'running' && <Loader2 size={11} className="animate-spin" />}
      {cfg.label}
    </span>
  );
};

// ============================================================
// Skeleton Loading
// ============================================================
const SkeletonBlock: React.FC = () => (
  <div className="p-4 space-y-3 animate-fade-in">
    <div className="skeleton h-4 w-3/4" />
    <div className="skeleton h-4 w-full" />
    <div className="skeleton h-4 w-5/6" />
    <div className="skeleton h-32 w-full mt-4" />
    <div className="skeleton h-4 w-2/3" />
    <div className="skeleton h-4 w-4/5" />
  </div>
);

// ============================================================
// Page Content Renderer
// ============================================================
interface PageContentProps {
  pageData: PageData | undefined;
  format: RestoreFormat;
  showRestored: boolean;
}

const PageContent: React.FC<PageContentProps> = ({ pageData, format, showRestored }) => {
  if (!pageData) {
    return (
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
        <span>暂无数据</span>
      </div>
    );
  }

  if (pageData.status === 'pending') {
    return <SkeletonBlock />;
  }

  if (pageData.status === 'error') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-red-400 p-4">
        <span className="text-sm font-medium mb-1">识别出错</span>
        {pageData.errorMessage && (
          <span className="text-xs text-red-300 text-center">{pageData.errorMessage}</span>
        )}
      </div>
    );
  }

  // Determine which content to display
  let content = pageData.rawOCR || '';

  if (showRestored) {
    const effectiveFormat = format === 'auto' ? 'md' : format;
    const variants = pageData.restoredVariants;
    if (variants) {
      content = variants[effectiveFormat] || pageData.restored || content;
    } else if (pageData.restored) {
      content = pageData.restored;
    }
  }

  // Determine the rendering format
  const effectiveFormat = format === 'auto' ? 'md' : format;

  if (!showRestored) {
    // Raw OCR always renders as markdown
    return (
      <div className="p-4 overflow-auto h-full">
        <MarkdownRenderer content={content} />
      </div>
    );
  }

  switch (effectiveFormat) {
    case 'md':
      return (
        <div className="p-4 overflow-auto h-full">
          <MarkdownRenderer content={content} />
        </div>
      );
    case 'html':
      return (
        <div
          className="p-4 overflow-auto h-full prose prose-sm max-w-none"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      );
    case 'json':
      return (
        <pre className="p-4 overflow-auto h-full text-xs font-mono text-slate-700 bg-slate-50 whitespace-pre-wrap break-words">
          {(() => {
            try {
              return JSON.stringify(JSON.parse(content), null, 2);
            } catch {
              return content;
            }
          })()}
        </pre>
      );
    default:
      return (
        <div className="p-4 overflow-auto h-full">
          <MarkdownRenderer content={content} />
        </div>
      );
  }
};

// ============================================================
// Model Column
// ============================================================
interface ModelColumnProps {
  task: Task;
  currentPage: number;
  format: RestoreFormat;
  showRestored: boolean;
  compact?: boolean;
}

const ModelColumn: React.FC<ModelColumnProps> = ({ task, currentPage, format, showRestored, compact }) => {
  const pageData = task.pagesData[currentPage - 1];
  const elapsed =
    task.startedAt && task.completedAt
      ? formatDuration(task.completedAt - task.startedAt)
      : task.startedAt
        ? formatDuration(Date.now() - task.startedAt)
        : null;

  return (
    <div className="flex flex-col min-w-[280px] h-full">
      {/* Column divider + content */}
      <div className="flex h-full">
        <div className="column-divider shrink-0" />
        <div className="flex flex-col flex-1 min-w-0">
          {/* Column Header */}
          <div className={`flex-none ${compact ? 'px-2.5 py-2' : 'px-3 py-2.5'} bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-200`}>
            <div className={`flex items-center ${compact ? 'gap-1.5' : 'gap-2'} ${compact ? 'flex-col items-start' : 'justify-between'}`}>
              <div className="min-w-0 flex-1 w-full">
                <div className={`${compact ? 'text-xs' : 'text-sm'} font-bold text-slate-800 truncate`} title={task.modelLabel}>
                  {task.modelLabel}
                </div>
                {!compact && (
                  <div className="text-[11px] text-slate-400 truncate" title={task.providerLabel}>
                    {task.providerLabel}
                  </div>
                )}
              </div>
              <div className="flex-none flex items-center gap-1.5">
                <StatusBadge status={task.status} />
                {elapsed && task.status === 'done' && (
                  <span className="text-[11px] text-slate-400 font-mono whitespace-nowrap">{elapsed}</span>
                )}
              </div>
            </div>
            {task.error && (
              <div className="mt-1 text-[11px] text-red-500 truncate" title={task.error}>
                {task.error}
              </div>
            )}
          </div>

          {/* Column Body */}
          <div className="flex-1 overflow-auto bg-white">
            {task.status === 'running' && !pageData ? (
              <SkeletonBlock />
            ) : (
              <PageContent pageData={pageData} format={format} showRestored={showRestored} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Source Column
// ============================================================
interface SourceColumnProps {
  pdfUrl?: string;
  physicalPage: number;
  pageMap: number[];
  currentPage: number;
  totalPages: number;
  onPageChange: (physicalPage: number) => void;
  fileName?: string;
  isImage?: boolean;
  imageUrl?: string;
}

const SourceColumn: React.FC<SourceColumnProps> = ({
  pdfUrl,
  physicalPage,
  pageMap,
  currentPage,
  totalPages,
  onPageChange,
  fileName,
  isImage,
  imageUrl,
}) => {
  return (
    <div className="flex flex-col h-full min-w-[320px]">
      {/* Column Header */}
      <div className="flex-none px-3 py-2.5 bg-gradient-to-b from-white to-slate-50/50 border-b border-slate-200">
        <div className="flex items-center gap-2">
          <FileText size={14} className="text-slate-400 flex-none" />
          <div className="min-w-0 flex-1">
            <div className="text-sm font-bold text-slate-800 truncate" title={fileName}>
              {fileName || '源文件'}
            </div>
            <div className="text-[11px] text-slate-400">
              第 {currentPage} / {totalPages} 页 (���理页 {physicalPage})
            </div>
          </div>
        </div>
      </div>

      {/* Column Body */}
      <div className="flex-1 overflow-hidden bg-slate-100">
        {isImage && imageUrl ? (
          <div className="h-full overflow-auto flex items-start justify-center p-4">
            <img
              src={imageUrl}
              alt={fileName || 'Source image'}
              className="max-w-full h-auto shadow-lg rounded"
            />
          </div>
        ) : pdfUrl ? (
          <PdfViewer
            url={pdfUrl}
            physicalPage={physicalPage}
            pageMap={pageMap}
            onPageChange={onPageChange}
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            无法预览
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================================
// Page Navigation Bar
// ============================================================
interface PageNavProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

const PageNav: React.FC<PageNavProps> = ({ currentPage, totalPages, onPageChange }) => {
  const canPrev = currentPage > 1;
  const canNext = currentPage < totalPages;

  return (
    <div className="flex items-center justify-center gap-3 px-4 py-2.5 bg-white/80 backdrop-blur-sm border-t border-slate-200 select-none">
      <button
        disabled={!canPrev}
        onClick={() => onPageChange(currentPage - 1)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.96]"
      >
        <ChevronLeft size={16} />
        上一页
      </button>

      <span className="text-sm text-slate-700 font-medium tabular-nums min-w-[80px] text-center">
        第 {currentPage} / {totalPages} 页
      </span>

      <button
        disabled={!canNext}
        onClick={() => onPageChange(currentPage + 1)}
        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed transition-all duration-150 active:scale-[0.96]"
      >
        下一页
        <ChevronRight size={16} />
      </button>
    </div>
  );
};

// ============================================================
// ComparisonGrid (Main Export)
// ============================================================
const ComparisonGrid: React.FC = () => {
  const { state, dispatch, activeGroup } = useStore();
  const [showRestored, setShowRestored] = useState(false);

  const { currentPage, restoreFormat } = state;

  // Determine source file info
  const sourceFile = activeGroup?.sourceFile;
  const tasks = activeGroup?.tasks ?? [];

  // Adaptive layout based on model count
  const modelCount = tasks.length;
  const sourceWidthPct = useMemo(() => {
    if (modelCount <= 1) return '45%';
    if (modelCount === 2) return '38%';
    if (modelCount === 3) return '30%';
    return '25%'; // 4+
  }, [modelCount]);
  const modelMinWidth = modelCount >= 4 ? 220 : 280;

  const pageMap = sourceFile?.pageMap ?? [];
  const totalPages = pageMap.length || 1;

  // Physical page for PDF viewer (from pageMap)
  const physicalPage = pageMap[currentPage - 1] ?? 1;

  // Detect if the source is an image rather than PDF
  const isImage = useMemo(() => {
    if (!sourceFile) return false;
    const name = sourceFile.name.toLowerCase();
    return /\.(png|jpe?g|gif|bmp|webp|tiff?)$/i.test(name);
  }, [sourceFile]);

  const imageUrl = useMemo(() => {
    if (!isImage || !sourceFile) return undefined;
    return URL.createObjectURL(sourceFile.originalFile);
  }, [isImage, sourceFile]);

  // Check if any task has restored content
  const hasRestoredContent = useMemo(() => {
    return tasks.some(task => {
      const pd = task.pagesData[currentPage - 1];
      return pd && (pd.restored || pd.restoredVariants);
    });
  }, [tasks, currentPage]);

  // Handle page change - dispatches to global store
  const handlePageChange = useCallback(
    (page: number) => {
      if (page >= 1 && page <= totalPages) {
        dispatch({ type: 'SET_CURRENT_PAGE', page });
      }
    },
    [dispatch, totalPages],
  );

  // Handle PDF viewer page change (when navigating via PDF controls)
  const handlePdfPageChange = useCallback(
    (newPhysicalPage: number) => {
      const newIndex = pageMap.indexOf(newPhysicalPage);
      if (newIndex !== -1) {
        dispatch({ type: 'SET_CURRENT_PAGE', page: newIndex + 1 });
      }
    },
    [dispatch, pageMap],
  );

  // ── Empty State ───────────────────────────────────────────
  if (!activeGroup) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <div className="text-center animate-fade-in">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center mx-auto mb-4 shadow-card">
            <FileText size={28} className="text-indigo-400" />
          </div>
          <p className="text-slate-600 text-lg font-semibold">请选择文件查看对比</p>
          <p className="text-slate-400 text-sm mt-1">从左侧列表选择一个文件开始</p>
        </div>
      </div>
    );
  }

  // ── No Tasks State ────────────────────────────────────────
  if (tasks.length === 0) {
    return (
      <div className="flex-1 flex flex-col bg-slate-50">
        {/* Source only */}
        <div className="flex-1 flex">
          {sourceFile && (
            <div className="w-full">
              <SourceColumn
                pdfUrl={sourceFile.pdfUrl}
                physicalPage={physicalPage}
                pageMap={pageMap}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={handlePdfPageChange}
                fileName={sourceFile.name}
                isImage={isImage}
                imageUrl={imageUrl}
              />
            </div>
          )}
          {!sourceFile && (
            <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
              暂无识别任务
            </div>
          )}
        </div>
        {totalPages > 1 && (
          <PageNav currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
        )}
      </div>
    );
  }

  // ── Main Grid ─────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col min-h-0 bg-slate-50">
      {/* Toolbar */}
      <div className="flex-none flex items-center justify-between px-4 py-2.5 bg-white border-b border-slate-200">
        <div className="text-sm text-slate-500">
          {tasks.length} 个模型对比 &middot; 共 {totalPages} 页
        </div>
        <div className="flex items-center gap-2">
          {hasRestoredContent && (
            <button
              onClick={() => setShowRestored(prev => !prev)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 active:scale-[0.97] ${
                showRestored
                  ? 'bg-indigo-50 text-indigo-600 border border-indigo-200 shadow-sm'
                  : 'bg-slate-50 text-slate-500 border border-slate-200 hover:bg-slate-100 hover:shadow-card'
              }`}
              title={showRestored ? '显示原始OCR' : '显示还原结果'}
            >
              {showRestored ? <Eye size={13} /> : <Code2 size={13} />}
              {showRestored ? '还原结果' : '原始OCR'}
            </button>
          )}
        </div>
      </div>

      {/* Grid Container */}
      <div className="flex-1 flex min-h-0 overflow-x-auto">
        {/* Source Column - adaptive width based on model count */}
        {sourceFile && (
          <div className="flex-none shrink-0" style={{ width: sourceWidthPct, minWidth: modelCount >= 4 ? 280 : 320 }}>
            <SourceColumn
              pdfUrl={sourceFile.pdfUrl}
              physicalPage={physicalPage}
              pageMap={pageMap}
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={handlePdfPageChange}
              fileName={sourceFile.name}
              isImage={isImage}
              imageUrl={imageUrl}
            />
          </div>
        )}

        {/* Model Columns - adaptive min-width */}
        {tasks.map(task => (
          <div
            key={task.id}
            className="flex-1"
            style={{ minWidth: modelMinWidth }}
          >
            <ModelColumn
              task={task}
              currentPage={currentPage}
              format={restoreFormat}
              showRestored={showRestored}
              compact={modelCount >= 4}
            />
          </div>
        ))}
      </div>

      {/* Synchronized Page Navigation */}
      {totalPages > 1 && (
        <PageNav currentPage={currentPage} totalPages={totalPages} onPageChange={handlePageChange} />
      )}
    </div>
  );
};

export default ComparisonGrid;
