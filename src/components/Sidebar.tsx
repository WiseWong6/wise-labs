import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
  Upload,
  FileText,
  MessageSquare,
  Loader2,
  Hourglass,
  CheckCircle2,
  AlertCircle,
  FileType,
} from 'lucide-react';
import { useStore } from '../state/store';
import { Task, ProcessingStatus, AppMode } from '../types';
import { formatDuration } from '../utils/helpers';

interface SidebarProps {
  onUploadClick: () => void;
}

const statusIconMap: Record<ProcessingStatus, React.ReactNode> = {
  pending: <FileType className="w-4 h-4 text-slate-500" />,
  queued: <Hourglass className="w-4 h-4 text-amber-500" />,
  running: <Loader2 className="w-4 h-4 text-indigo-400 animate-spin" />,
  done: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
  error: <AlertCircle className="w-4 h-4 text-red-400" />,
};

const Sidebar: React.FC<SidebarProps> = ({ onUploadClick }) => {
  const { state, dispatch, groupedTasks } = useStore();
  const { mode, activeGroupId, activeTaskId, sidebarOpen } = state;

  const handleToggleSidebar = () => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  };

  const handleGroupClick = (groupId: string) => {
    dispatch({ type: 'SET_ACTIVE_GROUP', groupId });
  };

  const handleTaskClick = (e: React.MouseEvent, taskId: string) => {
    e.stopPropagation();
    dispatch({ type: 'SET_ACTIVE_TASK', taskId });
  };

  const handleSettingsClick = () => {
    dispatch({ type: 'SET_SETTINGS_OPEN', open: true });
  };

  const handleModeSwitch = (newMode: AppMode) => {
    if (newMode !== mode) {
      dispatch({ type: 'SET_MODE', mode: newMode });
    }
  };

  const getElapsedTime = (task: Task): string | null => {
    if (task.startedAt && task.completedAt) {
      return formatDuration(task.completedAt - task.startedAt);
    }
    return null;
  };

  // Collapsed sidebar
  if (!sidebarOpen) {
    return (
      <div className="flex flex-col items-center w-14 glass-dark border-r border-white/[0.06] py-3 gap-3 shrink-0">
        <button
          onClick={handleToggleSidebar}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-150"
          title="展开侧栏"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <button
          onClick={handleSettingsClick}
          className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-150"
          title="设置"
        >
          <Settings className="w-4 h-4" />
        </button>
        {mode === 'ocr' && (
          <button
            onClick={onUploadClick}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-150"
            title="上传文件"
          >
            <Upload className="w-4 h-4" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col w-72 glass-dark border-r border-white/[0.06] shrink-0">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/[0.06]">
        <div className="flex items-center gap-2.5 min-w-0">
          {mode === 'ocr' ? (
            <FileText className="w-4 h-4 text-indigo-400 shrink-0" />
          ) : (
            <MessageSquare className="w-4 h-4 text-indigo-400 shrink-0" />
          )}
          <span className="text-sm font-semibold text-slate-200 truncate">
            {mode === 'ocr' ? 'OCR 评测' : 'LLM 评测'}
          </span>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={handleSettingsClick}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-150"
            title="设置"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleToggleSidebar}
            className="p-1.5 rounded-lg hover:bg-white/[0.06] text-slate-400 hover:text-slate-200 transition-all duration-150"
            title="收起侧栏"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mode Tabs - Pill segment control */}
      <div className="px-3 py-2.5 border-b border-white/[0.06]">
        <div className="flex bg-white/[0.06] rounded-lg p-0.5">
          <button
            onClick={() => handleModeSwitch('prompt')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mode === 'prompt'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            LLM
          </button>
          <button
            onClick={() => handleModeSwitch('ocr')}
            className={`flex-1 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150 ${
              mode === 'ocr'
                ? 'bg-white/[0.12] text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-300'
            }`}
          >
            OCR
          </button>
        </div>
      </div>

      {/* Upload Button (OCR mode only) */}
      {mode === 'ocr' && (
        <div className="px-3 py-2.5 border-b border-white/[0.06]">
          <button
            onClick={onUploadClick}
            className="flex items-center justify-center gap-2 w-full px-3 py-2 text-xs font-medium text-white bg-gradient-to-r from-indigo-500 to-violet-500 hover:from-indigo-400 hover:to-violet-400 rounded-lg shadow-lg shadow-indigo-500/20 transition-all duration-150 active:scale-[0.97]"
          >
            <Upload className="w-3.5 h-3.5" />
            上传文件
          </button>
        </div>
      )}

      {/* Task Groups */}
      <div className="flex-1 overflow-y-auto sidebar-scroll">
        {groupedTasks.size === 0 ? (
          <div className="px-4 py-8 text-center">
            <p className="text-sm text-slate-500">
              {mode === 'ocr' ? '暂无文件，请上传 PDF' : '暂无任务'}
            </p>
          </div>
        ) : (
          <div className="py-1">
            {Array.from(groupedTasks.entries()).map(([groupId, group]) => {
              const isActive = activeGroupId === groupId;
              const doneCount = group.tasks.filter(t => t.status === 'done').length;
              const totalCount = group.tasks.length;

              return (
                <div key={groupId} className="mb-0.5">
                  {/* Group Header */}
                  <button
                    onClick={() => handleGroupClick(groupId)}
                    className={`flex items-center w-full px-3 py-2.5 text-left transition-all duration-150 ${
                      isActive
                        ? 'bg-white/[0.08] text-slate-200'
                        : 'text-slate-300 hover:bg-white/[0.04] hover:text-slate-200'
                    }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {mode === 'ocr' ? (
                          <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        ) : (
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                        )}
                        <span className="text-sm font-medium truncate" title={group.label}>
                          {group.label}
                        </span>
                      </div>
                    </div>
                    <span className="text-[11px] font-medium text-slate-500 bg-white/[0.06] px-1.5 py-0.5 rounded-full shrink-0 ml-2">
                      {doneCount}/{totalCount}
                    </span>
                  </button>

                  {/* Task List within Group */}
                  {isActive && group.tasks.length > 0 && (
                    <div className="pb-1">
                      {group.tasks.map(task => {
                        const isTaskActive = activeTaskId === task.id;
                        const elapsed = getElapsedTime(task);

                        return (
                          <button
                            key={task.id}
                            onClick={(e) => handleTaskClick(e, task.id)}
                            className={`flex items-center w-full px-3 pl-10 py-2 text-left transition-all duration-150 ${
                              isTaskActive
                                ? 'bg-indigo-500/[0.12] text-slate-200 border-l-2 border-indigo-400'
                                : 'text-slate-400 hover:bg-white/[0.04] hover:text-slate-300 border-l-2 border-transparent'
                            }`}
                          >
                            <span className="shrink-0 mr-2">
                              {statusIconMap[task.status]}
                            </span>
                            <span className="flex-1 text-sm truncate" title={task.modelLabel}>
                              {task.modelLabel}
                            </span>
                            {elapsed && (
                              <span className="text-[11px] text-slate-500 shrink-0 ml-2 font-mono">
                                {elapsed}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
