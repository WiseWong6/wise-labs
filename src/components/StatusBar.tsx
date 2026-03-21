import React, { useMemo } from 'react';
import { Loader2 } from 'lucide-react';
import { useStore } from '../state/store';
import { formatDuration } from '../utils/helpers';

const StatusBar: React.FC = () => {
  const { state } = useStore();

  const stats = useMemo(() => {
    const tasks = state.tasks.filter(t => t.type === state.mode);
    const total = tasks.length;
    const done = tasks.filter(t => t.status === 'done').length;
    const running = tasks.filter(t => t.status === 'running').length;
    const errors = tasks.filter(t => t.status === 'error').length;
    const queued = tasks.filter(t => t.status === 'queued').length;

    const totalDuration = tasks
      .filter(t => t.startedAt && t.completedAt)
      .reduce((sum, t) => sum + (t.completedAt! - t.startedAt!), 0);

    return { total, done, running, errors, queued, totalDuration };
  }, [state.tasks, state.mode]);

  if (stats.total === 0) return null;

  return (
    <div className="h-9 border-t border-slate-200/80 bg-white/80 backdrop-blur-sm flex items-center justify-between px-4 text-xs text-slate-500 select-none flex-shrink-0">
      <div className="flex items-center gap-3">
        {stats.running > 0 && (
          <span className="flex items-center gap-1.5 text-indigo-600 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse-subtle" />
            <Loader2 size={11} className="animate-spin" />
            {stats.running} 个任务运行中
          </span>
        )}
        {stats.running > 0 && stats.queued > 0 && (
          <span className="text-slate-300">|</span>
        )}
        {stats.queued > 0 && (
          <span className="flex items-center gap-1.5 text-amber-600">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
            {stats.queued} 个排队中
          </span>
        )}
        {(stats.running > 0 || stats.queued > 0) && (
          <span className="text-slate-300">|</span>
        )}
        <span className="flex items-center gap-1.5 text-emerald-600">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
          {stats.done}/{stats.total} 已完成
        </span>
        {stats.errors > 0 && (
          <>
            <span className="text-slate-300">|</span>
            <span className="flex items-center gap-1.5 text-red-500">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              {stats.errors} 个失败
            </span>
          </>
        )}
      </div>
      <div>
        {stats.totalDuration > 0 && (
          <span className="font-mono">总耗时: {formatDuration(stats.totalDuration)}</span>
        )}
      </div>
    </div>
  );
};

export default StatusBar;
