import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Document, Page } from 'react-pdf';
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Loader2, RotateCw, Maximize } from 'lucide-react';

interface PdfViewerProps {
  url: string;
  physicalPage: number;
  pageMap?: number[];
  onPageChange: (physicalPage: number) => void;
  highlightText?: string;
  onRetryPage?: () => void;
  isRetrying?: boolean;
}

const PdfViewer: React.FC<PdfViewerProps> = ({
  url,
  physicalPage,
  pageMap,
  onPageChange,
  highlightText,
  onRetryPage,
  isRetrying = false
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState<number | 'auto'>('auto'); // Start with auto
  const [loading, setLoading] = useState(true);
  const [renderErrorKey, setRenderErrorKey] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(0);

  useEffect(() => {
    setLoading(true);
    setRenderErrorKey(0);
  }, [url]);

  // Track container width for Auto-Fit
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
         if (entry.contentRect.width > 0) {
            // OPTIMIZATION: Debounce or just set state.
            // React-PDF handles width prop updates well without remounting if key doesn't change.
            setContainerWidth(entry.contentRect.width);
         }
      }
    });
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  function onDocumentLoadSuccess({ numPages }: { numPages: number }) {
    setNumPages(numPages);
    setLoading(false);
  }

  // Navigation Logic
  const handlePrev = () => {
    if (pageMap && pageMap.length > 0) {
      const currentIndex = pageMap.indexOf(physicalPage);
      if (currentIndex > 0) onPageChange(pageMap[currentIndex - 1]);
    } else {
      if (physicalPage > 1) onPageChange(physicalPage - 1);
    }
  };

  const handleNext = () => {
    if (pageMap && pageMap.length > 0) {
      const currentIndex = pageMap.indexOf(physicalPage);
      if (currentIndex !== -1 && currentIndex < pageMap.length - 1) onPageChange(pageMap[currentIndex + 1]);
    } else {
      if (numPages && physicalPage < numPages) onPageChange(physicalPage + 1);
    }
  };

  const canGoPrev = pageMap ? pageMap.indexOf(physicalPage) > 0 : physicalPage > 1;
  const canGoNext = pageMap ? pageMap.indexOf(physicalPage) < pageMap.length - 1 : (numPages ? physicalPage < numPages : false);

  const pageDisplay = pageMap ? `${physicalPage} (共 ${numPages})` : `${physicalPage} / ${numPages || '--'}`;

  // Zoom Logic
  function changeScale(delta: number) {
    setScale(prev => {
       const current = prev === 'auto' ? 1.0 : prev;
       return Math.max(0.5, Math.min(2.5, current + delta));
    });
  }

  const setFitWidth = () => {
     setScale('auto');
  };

  const customTextRenderer = useCallback((textItem: any) => {
    if (!highlightText || highlightText.trim().length < 2) return textItem.str;
    const str = textItem.str;
    const lowerStr = str.toLowerCase();
    const lowerHighlight = highlightText.toLowerCase();

    if (lowerStr.includes(lowerHighlight)) {
      return str.replace(
        new RegExp(highlightText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
        (match: string) => `<span class="highlight">${match}</span>`
      );
    }
    return str;
  }, [highlightText]);

  return (
    <div className="flex flex-col h-full bg-slate-200">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-slate-100 border-b border-slate-300 select-none">
        <div className="flex items-center space-x-2">
          <button onClick={() => changeScale(-0.1)} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="缩小"><ZoomOut size={16} /></button>
          <span className="text-xs font-mono text-slate-500 w-12 text-center">
             {scale === 'auto' ? '自动' : `${Math.round(scale * 100)}%`}
          </span>
          <button onClick={() => changeScale(0.1)} className="p-1 hover:bg-slate-200 rounded text-slate-600" title="放大"><ZoomIn size={16} /></button>
          <div className="w-px h-4 bg-slate-300 mx-1"></div>
          <button onClick={setFitWidth} className={`p-1 rounded ${scale === 'auto' ? 'bg-indigo-100 text-indigo-600' : 'text-slate-600 hover:bg-slate-200'}`} title="适应宽度"><Maximize size={16} /></button>
        </div>

        {/* Page Navigation */}
        <div className="flex items-center space-x-2">
          <button disabled={!canGoPrev} onClick={handlePrev} className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <span className="text-xs font-medium text-slate-700 min-w-[60px] text-center">{pageDisplay}</span>
          <button disabled={!canGoNext} onClick={handleNext} className="p-1 hover:bg-slate-200 rounded text-slate-600 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>

        {/* Retry Button */}
        <div>
           {onRetryPage && (
              <button
                onClick={onRetryPage}
                disabled={isRetrying}
                className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-medium transition-colors border ${
                  isRetrying ? 'bg-indigo-50 border-indigo-200 text-indigo-400 cursor-not-allowed' : 'bg-white border-slate-200 text-slate-600 hover:text-indigo-600 hover:border-indigo-300 shadow-sm'
                }`}
              >
                <RotateCw size={12} className={isRetrying ? 'animate-spin' : ''} />
                {isRetrying ? '识别中...' : '重试本页'}
              </button>
           )}
        </div>
      </div>

      {/* PDF Canvas Area */}
      <div
        ref={containerRef}
        className="flex-1 overflow-auto p-4 flex justify-center items-start relative"
      >
        <Document
          key={`doc-${url}-${renderErrorKey}`}
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          loading={
            <div className="flex flex-col items-center justify-center pt-20 text-slate-400">
              <Loader2 className="animate-spin mb-2" size={32} />
              <span className="text-sm">加载 PDF 中...</span>
            </div>
          }
          error={
            <div className="pt-20 text-center text-red-400">
              <p className="text-sm font-semibold">PDF 加载失败</p>
              <button onClick={() => setRenderErrorKey(p => p+1)} className="mt-4 text-xs bg-red-50 text-red-600 px-3 py-1 rounded">重载视图</button>
            </div>
          }
        >
          {!loading && (
            <Page
              // Do NOT include `containerWidth` or `scale` in the key.
              key={`page-${physicalPage}`}

              pageNumber={physicalPage}
              scale={typeof scale === 'number' ? scale : undefined}
              width={scale === 'auto' ? Math.max(containerWidth - 48, 300) : undefined}
              renderTextLayer={true}
              renderAnnotationLayer={false}
              customTextRenderer={customTextRenderer}
              className="shadow-lg bg-white transition-all duration-200"
              loading={<div style={{ width: containerWidth - 48, height: 600 }} className="bg-white flex items-center justify-center"><Loader2 className="animate-spin text-slate-300" size={32} /></div>}
            />
          )}
        </Document>
      </div>
    </div>
  );
};

// Use React.memo to prevent re-renders when parent state (like progress messages) changes
// only re-render if PDF URL, page number, or retry status changes.
export default React.memo(PdfViewer);
