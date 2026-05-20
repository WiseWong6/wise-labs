import React, { useEffect, useState } from 'react';
import { X, Coffee, Newspaper } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen && isVisible) {
      const timer = setTimeout(() => setIsVisible(false), 250);
      return () => clearTimeout(timer);
    }
  }, [isOpen, isVisible]);

  useEffect(() => {
    if (!isVisible) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isVisible, onClose]);

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/40 transition-opacity duration-200"
        style={{ opacity: isAnimating ? 1 : 0 }}
        onClick={onClose}
      />
      <div
        className="relative bg-slate-50 rounded-xl shadow-2xl w-full max-w-2xl mx-2 md:mx-4 max-h-[85vh] overflow-y-auto transition-all ease-out"
        style={{
          opacity: isAnimating ? 1 : 0,
          transform: isAnimating ? 'scale(1) translateY(0)' : 'scale(0.95) translateY(12px)',
          transitionDuration: '250ms',
          pointerEvents: isAnimating ? 'auto' : 'none',
        }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-slate-50 px-6 pt-6 pb-4 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900">关于 Mira Open</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="关闭"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-5 space-y-6">
          {/* 解决的问题 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              解决的问题
            </h3>
            <ul className="space-y-2 text-sm text-slate-600 leading-relaxed">
              <li className="flex gap-2">
                <span className="text-indigo-600 mt-0.5 shrink-0">•</span>
                <span>Agent 生成之后，人类交付之前的基础预览工作台</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 mt-0.5 shrink-0">•</span>
                <span>支持 Markdown、JSON、Mermaid、HTML iframe 和混合内容的基础预览</span>
              </li>
              <li className="flex gap-2">
                <span className="text-indigo-600 mt-0.5 shrink-0">•</span>
                <span>保留源码复制、JSON 复制、Mermaid SVG/PNG 下载和基础 HTML 导出</span>
              </li>
            </ul>
          </section>

          {/* 怎么用 */}
          <section>
            <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
              怎么用
            </h3>
            <p className="text-sm text-slate-600 leading-relaxed">
              把你要渲染的格式复制进来就好了。
            </p>
          </section>

          {/* 请我喝咖啡 + 关注我 */}
          <section className="pt-2 border-t border-slate-200">
            <div className="grid grid-cols-2 gap-4">
              {/* 请我喝咖啡 */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  <Coffee size={14} className="text-indigo-600" />
                  请我喝咖啡
                </h3>
                <div className="w-full aspect-square max-w-[220px] mx-auto rounded-xl border border-slate-200 overflow-hidden">
                  <img
                    src="./reward.jpg"
                    alt="赞赏码"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>

              {/* 关注我 */}
              <div>
                <h3 className="flex items-center gap-2 text-sm font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  <Newspaper size={14} className="text-indigo-600" />
                  关注我
                </h3>
                <div className="w-full aspect-square max-w-[220px] mx-auto rounded-xl border border-slate-200 overflow-hidden">
                  <img
                    src="./qrcode.jpg"
                    alt="公众号二维码"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
            <p className="text-sm text-slate-500 text-center mt-5">
              如果这个工具对你有帮助，可以请 Wise 喝一杯咖啡，你的支持是我持续迭代的动力
            </p>
          </section>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-slate-50 px-6 py-4 border-t border-slate-200">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors"
          >
            知道了
          </button>
        </div>
      </div>
    </div>
  );
};

export default AboutModal;
