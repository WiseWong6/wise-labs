import React, { useState, useEffect, useRef } from 'react';
import { Play, Loader2, Maximize2, X, Sparkles, Wand2, Terminal, Clock, CheckCircle2, AlertCircle, ChevronLeft, ChevronRight } from 'lucide-react';
import { useStore } from '../state/store';
import MarkdownRenderer from './MarkdownRenderer';
import { Task } from '../types';

interface Props {
  isRunning: boolean;
  canRun: boolean;
  selectedCount: number;
  onRun: () => void;
  onMockRun?: () => void;
}

// ============================================================
// Helpers
// ============================================================

function formatMs(start?: number, end?: number): string {
  if (!start || !end) return '';
  const ms = end - start;
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)}s` : `${ms}ms`;
}

// ============================================================
// StatusIcon
// ============================================================

function StatusIcon({ status }: { status: Task['status'] }) {
  switch (status) {
    case 'queued':
      return <Clock size={12} className="text-amber-500" />;
    case 'running':
      return <Loader2 size={12} className="text-indigo-500 animate-spin" />;
    case 'done':
      return <CheckCircle2 size={12} className="text-emerald-500" />;
    case 'error':
      return <AlertCircle size={12} className="text-red-500" />;
    default:
      return <span className="w-3 h-3 rounded-full bg-slate-300" />;
  }
}

// ============================================================
// SingleResultCard
// ============================================================

function SingleResultCard({ task }: { task: Task }) {
  return (
    <div className="flex-1 flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-w-0">
      {/* Card Header */}
      <div className="flex-none px-4 py-3 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2">
        <StatusIcon status={task.status} />
        <span className="text-sm font-semibold text-slate-700 truncate">{task.modelLabel}</span>
        <span className="text-[10px] text-slate-400 ml-auto">{task.providerLabel}</span>
      </div>

      {/* Card Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {task.status === 'queued' && (
          <div className="flex flex-col items-center justify-center gap-2 text-slate-400 py-8">
            <Clock size={24} className="text-amber-400" />
            <span className="text-sm">等待处理...</span>
          </div>
        )}

        {task.status === 'running' && (
          <div className="py-4">
            <div className="flex items-center gap-2 mb-4">
              <Loader2 size={16} className="text-indigo-500 animate-spin" />
              <span className="text-sm text-slate-600">模型推理中...</span>
            </div>
            <div className="space-y-2">
              <div className="h-3 bg-slate-100 rounded animate-pulse" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-[90%]" />
              <div className="h-3 bg-slate-100 rounded animate-pulse w-[80%]" />
            </div>
          </div>
        )}

        {task.status === 'error' && (
          <div className="p-4 rounded-xl bg-red-50 border border-red-100">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle size={16} className="text-red-500" />
              <span className="text-sm font-medium text-red-700">运行出错</span>
            </div>
            <p className="text-sm text-red-600">{task.statusMessage || task.error || '发生未知错误'}</p>
          </div>
        )}

        {task.status === 'done' && task.response && (
          <div>
            {task.tokenUsage && (
              <div className="flex items-center gap-3 mb-3 pb-2 border-b border-slate-100 text-[10px] text-slate-500">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  输入: {task.tokenUsage.prompt}
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                  输出: {task.tokenUsage.completion}
                </span>
                {task.startedAt && task.completedAt && (
                  <span className="ml-auto flex items-center gap-1">
                    <Clock size={10} />
                    {formatMs(task.startedAt, task.completedAt)}
                  </span>
                )}
              </div>
            )}
            <div className="prose prose-sm max-w-none">
              <MarkdownRenderer content={task.response} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// FullscreenResults - Grid/Scroll View
// ============================================================

function FullscreenResults({ tasks, onClose }: { tasks: Task[]; onClose: () => void }) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 0);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener('scroll', checkScroll);
    window.addEventListener('resize', checkScroll);
    return () => {
      el.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [tasks]);

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const scrollAmount = el.clientWidth * 0.8;
    el.scrollBy({ left: direction === 'left' ? -scrollAmount : scrollAmount, behavior: 'smooth' });
  };

  // Calculate grid columns based on task count
  // 1 task = 100%, 2 tasks = 50% each, 3 tasks = 33.3% each, 4+ tasks = 25% each (with scroll)
  const getGridClass = () => {
    const count = tasks.length;
    if (count === 1) return 'grid-cols-1';
    if (count === 2) return 'grid-cols-2';
    if (count === 3) return 'grid-cols-3';
    return 'grid-cols-4'; // 4 or more
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-100 flex flex-col">
      {/* Header */}
      <div className="flex-none bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
        <h2 className="text-sm font-semibold text-slate-700">测试结果对比</h2>
        <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
          {tasks.length} 个模型
        </span>
        <div className="flex-1" />
        <button
          onClick={onClose}
          className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 flex-none"
        >
          <X size={20} />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 relative p-4">
        {/* Scroll buttons */}
        {tasks.length > 4 && canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="absolute left-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ChevronLeft size={20} />
          </button>
        )}
        {tasks.length > 4 && canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="absolute right-2 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white shadow-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-all"
          >
            <ChevronRight size={20} />
          </button>
        )}

        {/* Results grid */}
        <div
          ref={scrollRef}
          className={`h-full grid ${getGridClass()} gap-4 ${tasks.length > 4 ? 'overflow-x-auto' : ''}`}
          style={{ 
            gridAutoColumns: tasks.length > 4 ? 'minmax(320px, 25%)' : undefined,
            minWidth: tasks.length > 4 ? `${tasks.length * 320}px` : undefined
          }}
        >
          {tasks.map(task => (
            <SingleResultCard key={task.id} task={task} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ResultContent (for normal view)
// ============================================================

function ResultContent({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-slate-400 p-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-50 to-violet-50 flex items-center justify-center">
          <Terminal size={28} className="text-indigo-300" />
        </div>
        <div className="text-center">
          <p className="text-sm font-medium text-slate-500 mb-1">准备就绪</p>
          <p className="text-xs text-slate-400">配置好提示词和模型后点击 Run 开始测试</p>
        </div>
      </div>
    );
  }

  if (task.status === 'queued') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-3 text-slate-400 p-8">
        <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center">
          <Clock size={24} className="text-amber-400" />
        </div>
        <p className="text-sm text-slate-500">等待处理...</p>
      </div>
    );
  }

  if (task.status === 'running') {
    return (
      <div className="p-8">
        <div className="flex items-center gap-2 mb-4">
          <Loader2 size={16} className="text-indigo-500 animate-spin" />
          <span className="text-sm text-slate-600">模型推理中...</span>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-[90%]" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-[80%]" />
          <div className="h-4 bg-slate-100 rounded-lg animate-pulse w-[60%]" />
          <div className="h-20 bg-slate-100 rounded-lg animate-pulse mt-4" />
        </div>
      </div>
    );
  }

  if (task.status === 'error') {
    return (
      <div className="p-6">
        <div className="p-4 rounded-xl bg-red-50 border border-red-100">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <span className="text-sm font-medium text-red-700">运行出错</span>
          </div>
          <p className="text-sm text-red-600">{task.statusMessage || task.error || '发生未知错误'}</p>
        </div>
      </div>
    );
  }

  if (task.status === 'done' && task.response) {
    return (
      <div className="p-5">
        {task.tokenUsage && (
          <div className="flex items-center gap-4 mb-4 pb-3 border-b border-slate-100">
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              输入: <span className="font-mono text-slate-700">{task.tokenUsage.prompt}</span> tokens
            </div>
            <div className="flex items-center gap-1.5 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-blue-400" />
              输出: <span className="font-mono text-slate-700">{task.tokenUsage.completion}</span> tokens
            </div>
            {task.startedAt && task.completedAt && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 ml-auto">
                <Clock size={12} />
                {formatMs(task.startedAt, task.completedAt)}
              </div>
            )}
          </div>
        )}
        <div className="prose prose-sm max-w-none">
          <MarkdownRenderer content={task.response} />
        </div>
      </div>
    );
  }

  return null;
}

// ============================================================
// PromptResultsPanel
// ============================================================

const PromptResultsPanel: React.FC<Props> = ({ isRunning, canRun, selectedCount, onRun, onMockRun }) => {
  const { activeGroup } = useStore();
  const tasks = activeGroup?.tasks ?? [];

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-select first tab when tasks change
  const taskIdsKey = tasks.map(t => t.id).join(',');
  useEffect(() => {
    if (tasks.length > 0) {
      setActiveTab(prev => {
        if (prev && tasks.some(t => t.id === prev)) return prev;
        return tasks[0].id;
      });
    } else {
      setActiveTab(null);
    }
  }, [taskIdsKey]);

  // Escape key closes fullscreen
  useEffect(() => {
    if (!isFullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsFullscreen(false);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isFullscreen]);

  const activeTask = tasks.find(t => t.id === activeTab) ?? null;

  // Tab strip
  const tabStrip = (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {tasks.map(task => {
        const isActive = task.id === activeTab;
        const elapsed = formatMs(task.startedAt, task.completedAt);
        return (
          <button
            key={task.id}
            onClick={() => setActiveTab(task.id)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-xs whitespace-nowrap transition-all duration-150 ${
              isActive
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700 shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            <StatusIcon status={task.status} />
            <span className="font-medium">{task.modelLabel}</span>
            {elapsed && (
              <span className={`text-[10px] ${isActive ? 'text-indigo-400' : 'text-slate-400'}`}>
                {elapsed}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <>
      {/* Main view */}
      <div className="flex-1 flex flex-col overflow-hidden bg-slate-50/50 min-w-0">
        {/* Header */}
        <div className="flex-none bg-white border-b border-slate-200 px-4 py-3">
          <div className="flex items-center justify-between gap-4">
            {/* Left: Title and stats */}
            <div className="flex items-center gap-3">
              <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <span className="w-5 h-5 rounded-md bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <Sparkles size={12} />
                </span>
                测试结果
              </h2>
              {tasks.length > 0 && (
                <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full">
                  {tasks.length} 个任务
                </span>
              )}
            </div>

            {/* Right: Action buttons */}
            <div className="flex items-center gap-2">
              {/* Mock button */}
              {onMockRun && (
                <button
                  onClick={onMockRun}
                  disabled={!canRun || isRunning}
                  className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-xl text-xs font-medium disabled:opacity-40 transition-all duration-150 active:scale-[0.97] border border-amber-200"
                  title="使用模拟数据预览 UI"
                >
                  <Wand2 size={14} />
                  Mock
                </button>
              )}
              
              {/* Run button */}
              <button
                onClick={() => onRun()}
                disabled={!canRun || isRunning}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-xl text-sm font-medium disabled:opacity-40 shadow-lg shadow-indigo-200 transition-all duration-150 active:scale-[0.97]"
              >
                {isRunning ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Play size={16} className="fill-white" />
                )}
                {selectedCount > 0 ? `Run (${selectedCount})` : 'Run'}
              </button>

              {/* Fullscreen button */}
              {tasks.length > 0 && (
                <button
                  onClick={() => setIsFullscreen(true)}
                  className="p-2 rounded-xl hover:bg-slate-100 text-slate-400 transition-all"
                  title="全屏对比"
                >
                  <Maximize2 size={18} />
                </button>
              )}
            </div>
          </div>

          {/* Tabs */}
          {tasks.length > 0 && (
            <div className="mt-3 pt-2 border-t border-slate-100">
              {tabStrip}
            </div>
          )}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto bg-white m-3 rounded-2xl border border-slate-200 shadow-sm">
          <ResultContent task={activeTask} />
        </div>
      </div>

      {/* Fullscreen overlay */}
      {isFullscreen && tasks.length > 0 && (
        <FullscreenResults 
          tasks={tasks} 
          onClose={() => setIsFullscreen(false)} 
        />
      )}
    </>
  );
};

export default PromptResultsPanel;
