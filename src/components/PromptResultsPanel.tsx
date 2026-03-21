import React, { useState, useEffect } from 'react';
import { Play, Loader2, Maximize2, X } from 'lucide-react';
import { useStore } from '../state/store';
import MarkdownRenderer from './MarkdownRenderer';
import { Task } from '../types';

interface Props {
  isRunning: boolean;
  canRun: boolean;
  selectedCount: number;
  onRun: () => void;
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

function StatusDot({ status }: { status: Task['status'] }) {
  let colorClass: string;
  switch (status) {
    case 'queued':
      colorClass = 'bg-amber-400';
      break;
    case 'running':
      colorClass = 'bg-indigo-500 animate-pulse';
      break;
    case 'done':
      colorClass = 'bg-emerald-500';
      break;
    case 'error':
      colorClass = 'bg-red-500';
      break;
    default:
      colorClass = 'bg-slate-300';
  }
  return <span className={`w-2 h-2 rounded-full flex-none ${colorClass}`} />;
}

// ============================================================
// ResultContent
// ============================================================

function ResultContent({ task }: { task: Task | null }) {
  if (!task) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-2 text-slate-400 p-8">
        <Play size={20} className="text-slate-300 ml-0.5" />
        <span className="text-sm">输入 Prompt 后点击 Run</span>
        <span className="text-xs text-slate-300">结果将在这里以标签页形式展示</span>
      </div>
    );
  }

  if (task.status === 'queued' || task.status === 'running') {
    return (
      <div className="p-6 flex flex-col gap-3">
        <div className="h-3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 bg-slate-100 rounded animate-pulse" />
        <div className="h-3 bg-slate-100 rounded animate-pulse w-2/3" />
      </div>
    );
  }

  if (task.status === 'error') {
    return (
      <div className="text-sm text-red-500 bg-red-50 rounded-lg p-4 m-4 border border-red-100">
        {task.statusMessage || task.error || '发生未知错误'}
      </div>
    );
  }

  if (task.status === 'done' && task.response) {
    return (
      <div className="p-4">
        {task.tokenUsage && (
          <p className="text-xs text-slate-400 mb-3">
            输入 {task.tokenUsage.prompt} tokens，输出 {task.tokenUsage.completion} tokens
          </p>
        )}
        <MarkdownRenderer content={task.response} />
      </div>
    );
  }

  return null;
}

// ============================================================
// PromptResultsPanel
// ============================================================

const PromptResultsPanel: React.FC<Props> = ({ isRunning, canRun, selectedCount, onRun }) => {
  const { activeGroup } = useStore();
  const tasks = activeGroup?.tasks ?? [];

  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Auto-select first tab when tasks change
  const taskIdsKey = tasks.map(t => t.id).join(',');
  useEffect(() => {
    if (tasks.length > 0) {
      setActiveTab(prev => {
        // If current tab still exists in new tasks, keep it
        if (prev && tasks.some(t => t.id === prev)) return prev;
        return tasks[0].id;
      });
    } else {
      setActiveTab(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  // ---- Tab strip (reused in both main view and fullscreen) ----
  const tabStrip = (
    <div className="flex gap-1.5 overflow-x-auto pb-0.5">
      {tasks.map(task => {
        const isActive = task.id === activeTab;
        const elapsed = formatMs(task.startedAt, task.completedAt);
        return (
          <button
            key={task.id}
            onClick={() => setActiveTab(task.id)}
            className={[
              'flex items-center gap-1.5 px-2.5 py-1 rounded-md border text-xs whitespace-nowrap',
              'transition-colors duration-100',
              isActive
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300',
            ].join(' ')}
          >
            <StatusDot status={task.status} />
            <span>{task.modelLabel}</span>
            {elapsed && (
              <span className={isActive ? 'text-indigo-400' : 'text-slate-400'}>
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
      {/* ---- Main view ---- */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white min-w-0">
        {/* Top area */}
        <div className="flex-none border-b border-slate-100 px-4 py-3 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            {/* Run button */}
            <button
              onClick={onRun}
              disabled={!canRun || isRunning}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white rounded-lg text-sm font-medium disabled:opacity-40 shadow-sm shadow-indigo-200 transition-all duration-150 active:scale-[0.97]"
            >
              {isRunning
                ? <Loader2 size={14} className="animate-spin" />
                : <Play size={14} />
              }
              {selectedCount > 0 ? `Run (${selectedCount})` : 'Run'}
            </button>

            {/* Fullscreen button */}
            {tasks.length > 0 && (
              <button
                onClick={() => setIsFullscreen(true)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400"
              >
                <Maximize2 size={16} />
              </button>
            )}
          </div>

          {/* Tabs */}
          {tasks.length > 0 && tabStrip}
        </div>

        {/* Results area */}
        <div className="flex-1 overflow-y-auto">
          <ResultContent task={activeTask} />
        </div>
      </div>

      {/* ---- Fullscreen overlay ---- */}
      {isFullscreen && (
        <div className="fixed inset-0 z-50 bg-white flex flex-col">
          {/* Overlay top bar */}
          <div className="flex-none border-b border-slate-100 px-4 py-3 flex items-center">
            <div className="flex-1 overflow-x-auto">{tabStrip}</div>
            <button
              onClick={() => setIsFullscreen(false)}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 flex-none ml-4"
            >
              <X size={18} />
            </button>
          </div>

          {/* Overlay content */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-4xl mx-auto p-8">
              <ResultContent task={activeTask} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PromptResultsPanel;
