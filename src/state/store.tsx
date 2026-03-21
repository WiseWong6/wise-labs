import React, { createContext, useContext, useReducer, useRef, useCallback, useMemo, useEffect } from 'react';
import {
  AppMode,
  ViewMode,
  Task,
  SourceFile,
  ProcessingStatus,
  RestoreMode,
  RestoreFormat,
  UploadConfigItem,
  OcrProviderId,
  OcrProviderLabel,
  OcrModelConfig,
  PromptGroup,
} from '../types';
import {
  getApiKey,
  getAvailableProviders,
  getAvailableOcrModels,
  getEnabledProviderIds,
  getEnabledModelIds,
  getDefaultProviderId,
  getDefaultRestoreSettings,
} from '../services/configAdapter';
import { TaskQueue } from '../services/taskQueue';
import { generateId } from '../utils/helpers';

// ============================================================
// State Shape
// ============================================================
export interface WorkbenchState {
  mode: AppMode;
  viewMode: ViewMode;

  // Data
  sourceFiles: SourceFile[];
  tasks: Task[];
  promptGroups: PromptGroup[];

  // Selection
  activeGroupId: string | null;  // sourceFileId (OCR) or promptGroupId (Prompt)
  activeTaskId: string | null;   // for detail view
  currentPage: number;           // 1-based page index for comparison grid

  // UI
  sidebarOpen: boolean;
  settingsOpen: boolean;
  uploadOpen: boolean;

  // Provider config (in-memory mirror of localStorage)
  enabledProviderIds: OcrProviderId[];
  providerApiKeys: Record<OcrProviderId, string>;
  enabledModelsByProvider: Record<OcrProviderId, string[]>;
  selectedModelKeys: string[]; // for upload modal

  // Restore
  restoreMode: RestoreMode;
  restoreFormat: RestoreFormat;

  // Upload
  pendingUploads: UploadConfigItem[];
}

const initialState: WorkbenchState = {
  mode: 'prompt',
  viewMode: 'comparison',
  sourceFiles: [],
  tasks: [],
  promptGroups: [],
  activeGroupId: null,
  activeTaskId: null,
  currentPage: 1,
  sidebarOpen: true,
  settingsOpen: false,
  uploadOpen: false,
  enabledProviderIds: getEnabledProviderIds(),
  providerApiKeys: {
    ucloud: getApiKey('ucloud'),
    siliconflow: getApiKey('siliconflow'),
    bigmodel: getApiKey('bigmodel'),
  },
  enabledModelsByProvider: {
    ucloud: getEnabledModelIds('ucloud'),
    siliconflow: getEnabledModelIds('siliconflow'),
    bigmodel: getEnabledModelIds('bigmodel'),
  },
  selectedModelKeys: [],
  restoreMode: getDefaultRestoreSettings().mode,
  restoreFormat: getDefaultRestoreSettings().format,
  pendingUploads: [],
};

// ============================================================
// Actions
// ============================================================
type Action =
  | { type: 'SET_MODE'; mode: AppMode }
  | { type: 'SET_VIEW_MODE'; viewMode: ViewMode }
  | { type: 'SET_ACTIVE_GROUP'; groupId: string | null }
  | { type: 'SET_ACTIVE_TASK'; taskId: string | null }
  | { type: 'SET_CURRENT_PAGE'; page: number }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_SETTINGS_OPEN'; open: boolean }
  | { type: 'SET_UPLOAD_OPEN'; open: boolean }
  | { type: 'ADD_SOURCE_FILES'; files: SourceFile[] }
  | { type: 'UPDATE_SOURCE_FILE'; id: string; updates: Partial<SourceFile> }
  | { type: 'ADD_TASKS'; tasks: Task[] }
  | { type: 'UPDATE_TASK'; taskId: string; updater: (task: Task) => Task }
  | { type: 'REMOVE_TASK'; taskId: string }
  | { type: 'REMOVE_SOURCE_FILE'; id: string }
  | { type: 'SET_ENABLED_PROVIDERS'; ids: OcrProviderId[] }
  | { type: 'SET_PROVIDER_API_KEY'; providerId: OcrProviderId; key: string }
  | { type: 'SET_ENABLED_MODELS'; providerId: OcrProviderId; modelIds: string[] }
  | { type: 'SET_SELECTED_MODEL_KEYS'; keys: string[] }
  | { type: 'SET_RESTORE_MODE'; mode: RestoreMode }
  | { type: 'SET_RESTORE_FORMAT'; format: RestoreFormat }
  | { type: 'SET_PENDING_UPLOADS'; items: UploadConfigItem[] }
  | { type: 'UPDATE_PENDING_UPLOAD'; id: string; updates: Partial<UploadConfigItem> }
  | { type: 'REMOVE_PENDING_UPLOAD'; id: string }
  | { type: 'ADD_PROMPT_GROUP'; group: PromptGroup }
  | { type: 'BATCH_UPDATE'; updates: Partial<WorkbenchState> };

function reducer(state: WorkbenchState, action: Action): WorkbenchState {
  switch (action.type) {
    case 'SET_MODE':
      return { ...state, mode: action.mode, viewMode: 'comparison', activeGroupId: null, activeTaskId: null, currentPage: 1 };
    case 'SET_VIEW_MODE':
      return { ...state, viewMode: action.viewMode };
    case 'SET_ACTIVE_GROUP':
      return { ...state, activeGroupId: action.groupId, activeTaskId: null, currentPage: 1 };
    case 'SET_ACTIVE_TASK':
      return { ...state, activeTaskId: action.taskId, viewMode: action.taskId ? 'detail' : 'comparison' };
    case 'SET_CURRENT_PAGE':
      return { ...state, currentPage: action.page };
    case 'TOGGLE_SIDEBAR':
      return { ...state, sidebarOpen: !state.sidebarOpen };
    case 'SET_SETTINGS_OPEN':
      return { ...state, settingsOpen: action.open };
    case 'SET_UPLOAD_OPEN':
      return { ...state, uploadOpen: action.open };
    case 'ADD_SOURCE_FILES':
      return { ...state, sourceFiles: [...state.sourceFiles, ...action.files] };
    case 'UPDATE_SOURCE_FILE':
      return {
        ...state,
        sourceFiles: state.sourceFiles.map(f =>
          f.id === action.id ? { ...f, ...action.updates } : f
        ),
      };
    case 'ADD_TASKS':
      return { ...state, tasks: [...state.tasks, ...action.tasks] };
    case 'UPDATE_TASK':
      return {
        ...state,
        tasks: state.tasks.map(t => (t.id === action.taskId ? action.updater(t) : t)),
      };
    case 'REMOVE_TASK': {
      const newTasks = state.tasks.filter(t => t.id !== action.taskId);
      const removed = state.tasks.find(t => t.id === action.taskId);
      let newSourceFiles = state.sourceFiles;
      if (removed?.sourceFileId) {
        const stillUsed = newTasks.some(t => t.sourceFileId === removed.sourceFileId);
        if (!stillUsed) {
          const sf = state.sourceFiles.find(f => f.id === removed.sourceFileId);
          if (sf?.pdfUrl) URL.revokeObjectURL(sf.pdfUrl);
          newSourceFiles = state.sourceFiles.filter(f => f.id !== removed.sourceFileId);
        }
      }
      return {
        ...state,
        tasks: newTasks,
        sourceFiles: newSourceFiles,
        activeTaskId: state.activeTaskId === action.taskId ? null : state.activeTaskId,
      };
    }
    case 'REMOVE_SOURCE_FILE': {
      const sf = state.sourceFiles.find(f => f.id === action.id);
      if (sf?.pdfUrl) URL.revokeObjectURL(sf.pdfUrl);
      return {
        ...state,
        sourceFiles: state.sourceFiles.filter(f => f.id !== action.id),
        tasks: state.tasks.filter(t => t.sourceFileId !== action.id),
      };
    }
    case 'SET_ENABLED_PROVIDERS':
      return { ...state, enabledProviderIds: action.ids };
    case 'SET_PROVIDER_API_KEY':
      return { ...state, providerApiKeys: { ...state.providerApiKeys, [action.providerId]: action.key } };
    case 'SET_ENABLED_MODELS':
      return { ...state, enabledModelsByProvider: { ...state.enabledModelsByProvider, [action.providerId]: action.modelIds } };
    case 'SET_SELECTED_MODEL_KEYS':
      return { ...state, selectedModelKeys: action.keys };
    case 'SET_RESTORE_MODE':
      return { ...state, restoreMode: action.mode };
    case 'SET_RESTORE_FORMAT':
      return { ...state, restoreFormat: action.format };
    case 'SET_PENDING_UPLOADS':
      return { ...state, pendingUploads: action.items };
    case 'UPDATE_PENDING_UPLOAD':
      return {
        ...state,
        pendingUploads: state.pendingUploads.map(u =>
          u.id === action.id ? { ...u, ...action.updates } : u
        ),
      };
    case 'REMOVE_PENDING_UPLOAD':
      return { ...state, pendingUploads: state.pendingUploads.filter(u => u.id !== action.id) };
    case 'ADD_PROMPT_GROUP':
      return { ...state, promptGroups: [...state.promptGroups, action.group] };
    case 'BATCH_UPDATE':
      return { ...state, ...action.updates };
    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================
interface StoreContextValue {
  state: WorkbenchState;
  dispatch: React.Dispatch<Action>;
  taskQueue: TaskQueue;

  // Derived
  activeGroup: { sourceFile?: SourceFile; tasks: Task[] } | null;
  activeTask: Task | null;
  groupedTasks: Map<string, { label: string; sourceFile?: SourceFile; tasks: Task[] }>;
  availableProviders: ReturnType<typeof getAvailableProviders>;
}

const StoreContext = createContext<StoreContextValue>(null!);

export const useStore = () => useContext(StoreContext);

// ============================================================
// Provider
// ============================================================
export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const taskQueue = useMemo(() => {
    return new TaskQueue({
      updateTask: (taskId, updater) => {
        dispatch({ type: 'UPDATE_TASK', taskId, updater });
      },
      updateSourceFilePageMap: (sourceFileId, pageMap) => {
        dispatch({ type: 'UPDATE_SOURCE_FILE', id: sourceFileId, updates: { pageMap } });
      },
      getTask: (taskId) => stateRef.current.tasks.find(t => t.id === taskId),
      getSourceFile: (sourceFileId) => {
        const sf = stateRef.current.sourceFiles.find(f => f.id === sourceFileId);
        if (!sf) return undefined;
        return { originalFile: sf.originalFile, pageRange: sf.pageRange, pageMap: sf.pageMap };
      },
    });
  }, []);

  const availableProviders = useMemo(() => getAvailableProviders(), []);

  // Derive active group
  const activeGroup = useMemo(() => {
    if (!state.activeGroupId) return null;
    if (state.mode === 'ocr') {
      const sourceFile = state.sourceFiles.find(f => f.id === state.activeGroupId);
      const tasks = state.tasks.filter(t => t.sourceFileId === state.activeGroupId);
      return { sourceFile, tasks };
    }
    // Prompt mode
    const tasks = state.tasks.filter(t => t.groupId === state.activeGroupId);
    return { tasks };
  }, [state.activeGroupId, state.mode, state.sourceFiles, state.tasks]);

  const activeTask = useMemo(
    () => state.tasks.find(t => t.id === state.activeTaskId) || null,
    [state.tasks, state.activeTaskId]
  );

  // Group tasks by source file (OCR) or prompt group (Prompt)
  const groupedTasks = useMemo(() => {
    const groups = new Map<string, { label: string; sourceFile?: SourceFile; tasks: Task[] }>();

    if (state.mode === 'ocr') {
      for (const task of state.tasks) {
        if (task.type !== 'ocr') continue;
        const key = task.sourceFileId || task.groupId;
        if (!groups.has(key)) {
          const sf = state.sourceFiles.find(f => f.id === key);
          groups.set(key, { label: sf?.name || task.fileName || '未知文件', sourceFile: sf, tasks: [] });
        }
        groups.get(key)!.tasks.push(task);
      }
    } else {
      for (const task of state.tasks) {
        if (task.type !== 'prompt') continue;
        const key = task.groupId;
        if (!groups.has(key)) {
          const pg = state.promptGroups.find(g => g.id === key);
          groups.set(key, { label: pg?.label || task.userPrompt?.slice(0, 30) || '提示词', tasks: [] });
        }
        groups.get(key)!.tasks.push(task);
      }
    }

    return groups;
  }, [state.mode, state.tasks, state.sourceFiles, state.promptGroups]);

  // Auto-select first group if none selected
  useEffect(() => {
    if (!state.activeGroupId && groupedTasks.size > 0) {
      const firstKey = groupedTasks.keys().next().value;
      if (firstKey) {
        dispatch({ type: 'SET_ACTIVE_GROUP', groupId: firstKey });
      }
    }
  }, [state.activeGroupId, groupedTasks]);

  const value = useMemo(
    () => ({ state, dispatch, taskQueue, activeGroup, activeTask, groupedTasks, availableProviders }),
    [state, dispatch, taskQueue, activeGroup, activeTask, groupedTasks, availableProviders]
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
};

// ============================================================
// Helper hooks
// ============================================================
export const useDispatch = () => useStore().dispatch;
export const useTaskQueue = () => useStore().taskQueue;

export const buildModelKey = (providerId: string, modelId: string): string => {
  return `${providerId}::${modelId}`;
};

export const getProviderLabel = (providerId: OcrProviderId): OcrProviderLabel => {
  const providers = getAvailableProviders();
  return (providers.find(p => p.id === providerId)?.label || 'SiliconFlow') as OcrProviderLabel;
};

export const getOpenModelsForProvider = (
  providerId: OcrProviderId,
  enabledModels: Record<OcrProviderId, string[]>
): OcrModelConfig[] => {
  const enabledIds = new Set(enabledModels[providerId] || []);
  return getAvailableOcrModels(providerId).filter(m => enabledIds.has(m.modelId));
};
