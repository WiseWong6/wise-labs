import React, { useState, useCallback, useRef, useEffect } from 'react';

interface ZoomableWrapperProps {
  children: React.ReactNode;
  className?: string;
  scale: number;
  fullWidth?: boolean;
}

const ZoomableWrapper: React.FC<ZoomableWrapperProps> = ({ children, className = '', scale, fullWidth }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [naturalSize, setNaturalSize] = useState({ width: 0, height: 0 });
  const [isPanning, setIsPanning] = useState(false);

  // Measure natural size on mount / when children change, and keep observing
  useEffect(() => {
    if (!contentRef.current) return;
    const measure = () => {
      const el = contentRef.current;
      if (!el) return;
      const originalTransform = el.style.transform;
      el.style.transform = 'none';
      const rect = el.getBoundingClientRect();
      el.style.transform = originalTransform;
      setNaturalSize({ width: rect.width, height: rect.height + 24 });
    };
    measure();
    const timer = setTimeout(measure, 800);

    const ro = new ResizeObserver(measure);
    ro.observe(contentRef.current);

    return () => {
      clearTimeout(timer);
      ro.disconnect();
    };
  }, [children]);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      containerRef.current?.scrollTo({ left: 0, top: 0 });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [children]);

  // Drag-to-pan using scrollLeft/scrollTop
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    const container = containerRef.current;
    if (!container || scale === 1) return;
    setIsPanning(true);
    const startX = e.clientX;
    const startY = e.clientY;
    const startScrollLeft = container.scrollLeft;
    const startScrollTop = container.scrollTop;

    const onMove = (ev: MouseEvent) => {
      container.scrollLeft = startScrollLeft + (startX - ev.clientX);
      container.scrollTop = startScrollTop + (startY - ev.clientY);
    };
    const onUp = () => {
      setIsPanning(false);
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onUp);
    };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
    e.preventDefault();
  }, [scale]);

  const scaledWidth = naturalSize.width > 0 ? naturalSize.width * scale : undefined;
  const scaledHeight = naturalSize.height > 0 ? naturalSize.height * scale : undefined;
  const contentWidth = fullWidth && naturalSize.width > 0 ? `${naturalSize.width}px` : fullWidth ? '100%' : undefined;

  return (
    <div
      ref={containerRef}
      className={`overflow-auto ${className}`}
      onMouseDown={handleMouseDown}
      style={{ cursor: isPanning ? 'grabbing' : scale !== 1 ? 'grab' : 'default' }}
    >
      <div
        className={fullWidth ? 'w-full' : ''}
        style={{
          width: scaledWidth,
          minWidth: fullWidth ? '100%' : scaledWidth,
          height: scaledHeight,
          minHeight: scaledHeight,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'flex-start',
        }}
      >
        <div
          ref={contentRef}
          style={{
            transform: `scale(${scale})`,
            transformOrigin: 'top center',
            display: fullWidth ? 'block' : 'inline-block',
            width: contentWidth,
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
};

export default ZoomableWrapper;
