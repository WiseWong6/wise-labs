import React, { useState, useEffect } from 'react';
import { Play, Loader2, Maximize2, X, Sparkles, Wand2, Terminal, Clock, CheckCircle2, AlertCircle } from 'lucide-react';
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
// StatusDot
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
// ResultContent
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
                  title="全屏查看"
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
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-slate-50 flex flex-col">
          {/* Overlay header */}
          <div className="flex-none bg-white border-b border-slate-200 px-4 py-3 flex items-center gap-4">
            <h2 className="text-sm font-semibold text-slate-700">测试结果</h2>
            <div className="flex-1 overflow-x-auto">{tabStrip}</div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 flex-none"
            >
              <X size={20} />
            </button>
          </div>

          {/* Overlay content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl border border-slate-200 shadow-sm">
              <ResultContent task={activeTask} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptResultsPanel;
