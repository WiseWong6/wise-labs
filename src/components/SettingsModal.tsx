import React, { useState, useEffect, useCallback } from 'react';
import { Key, Save, X, Plus, Trash2, Eye, EyeOff } from 'lucide-react';
import { useStore } from '../state/store';
import {
  saveDefaultRestoreSettings,
  getUnifiedProviders,
  saveUnifiedProviders,
} from '../services/configAdapter';
import type { RestoreMode, RestoreFormat, UnifiedProvider, UnifiedModel, ModelCapability } from '../types';

type TabId = 'providers' | 'restore';

const SettingsModal: React.FC = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('providers');

  // --- Unified providers local state ---
  const [providers, setProviders] = useState<UnifiedProvider[]>(() => getUnifiedProviders());

  // --- Restore settings ---
  const [restoreMode, setRestoreMode] = useState<RestoreMode>(state.restoreMode);
  const [restoreFormat, setRestoreFormat] = useState<RestoreFormat>(state.restoreFormat);

  // Sync local state if store changes externally
  useEffect(() => {
    setRestoreMode(state.restoreMode);
    setRestoreFormat(state.restoreFormat);
  }, [state.settingsOpen]);

  // --- Handlers ---
  const toggleProvider = useCallback((id: string) => {
    setProviders(prev =>
      prev.map(p => (p.id === id ? { ...p, enabled: !p.enabled } : p)),
    );
  }, []);

  const updateProvider = useCallback((id: string, updates: Partial<UnifiedProvider>) => {
    setProviders(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, []);

  const removeProvider = useCallback((id: string) => {
    setProviders(prev => prev.filter(p => p.id !== id));
  }, []);

  const addProvider = useCallback((
    label: string,
    type: 'openai-compat' | 'anthropic',
    baseUrl: string,
    apiKey: string,
  ) => {
    const newId = `custom-${Date.now()}`;
    setProviders(prev => [
      ...prev,
      {
        id: newId,
        label,
        type,
        baseUrl,
        apiKey,
        enabled: true,
        isDefault: false,
        models: [],
      },
    ]);
  }, []);

  const toggleModel = useCallback((providerId: string, modelId: string) => {
    setProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        return {
          ...p,
          models: p.models.map(m =>
            m.id === modelId ? { ...m, enabled: !m.enabled } : m,
          ),
        };
      }),
    );
  }, []);

  const addModelWithDetails = useCallback((
    providerId: string,
    id: string,
    label: string,
    capabilities: ModelCapability,
  ) => {
    setProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        return {
          ...p,
          models: [...p.models, {
            id,
            label,
            capabilities,
            enabled: true,
          }],
        };
      }),
    );
  }, []);

  const updateModel = useCallback((
    providerId: string,
    modelId: string,
    updates: Partial<UnifiedModel>,
  ) => {
    setProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        return {
          ...p,
          models: p.models.map(m =>
            m.id === modelId ? { ...m, ...updates } : m,
          ),
        };
      }),
    );
  }, []);

  const removeModel = useCallback((providerId: string, modelId: string) => {
    setProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        return { ...p, models: p.models.filter(m => m.id !== modelId) };
      }),
    );
  }, []);

  // --- Save ---
  const handleSave = useCallback(() => {
    // Persist unified providers
    saveUnifiedProviders(providers);
    saveDefaultRestoreSettings({ mode: restoreMode, format: restoreFormat });

    dispatch({ type: 'SET_RESTORE_MODE', mode: restoreMode });
    dispatch({ type: 'SET_RESTORE_FORMAT', format: restoreFormat });
    dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  }, [providers, restoreMode, restoreFormat, dispatch]);

  const handleClose = useCallback(() => {
    dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  }, [dispatch]);

  if (!state.settingsOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm modal-overlay"
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-[720px] max-h-[85vh] bg-white rounded-2xl shadow-modal flex flex-col overflow-hidden modal-panel"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-800">设置</h2>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all duration-150"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'providers'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('providers')}
            >
              供应商配置
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'restore'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('restore')}
            >
              还原设置
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {activeTab === 'providers' ? (
            <ProvidersTabContent
              providers={providers}
              onToggleProvider={toggleProvider}
              onUpdateProvider={updateProvider}
              onRemoveProvider={removeProvider}
              onAddProvider={addProvider}
              onToggleModel={toggleModel}
              onAddModel={addModelWithDetails}
              onUpdateModel={updateModel}
              onRemoveModel={removeModel}
            />
          ) : (
            <RestoreTabContent
              restoreMode={restoreMode}
              restoreFormat={restoreFormat}
              onSetRestoreMode={setRestoreMode}
              onSetRestoreFormat={setRestoreFormat}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 bg-gray-50/50">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-all duration-150 active:scale-[0.97]"
          >
            取消
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all duration-150 active:scale-[0.97]"
          >
            <Save size={15} />
            保存
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================
// Unified Providers Tab (OCR + LLM in one list)
// ============================================================
interface ProvidersTabProps {
  providers: UnifiedProvider[];
  onToggleProvider: (id: string) => void;
  onUpdateProvider: (id: string, updates: Partial<UnifiedProvider>) => void;
  onRemoveProvider: (id: string) => void;
  onAddProvider: (label: string, type: 'openai-compat' | 'anthropic', baseUrl: string, apiKey: string) => void;
  onToggleModel: (providerId: string, modelId: string) => void;
  onAddModel: (providerId: string, id: string, label: string, capabilities: ModelCapability) => void;
  onUpdateModel: (providerId: string, modelId: string, updates: Partial<UnifiedModel>) => void;
  onRemoveModel: (providerId: string, modelId: string) => void;
}

const ProvidersTabContent: React.FC<ProvidersTabProps> = ({
  providers,
  onToggleProvider,
  onUpdateProvider,
  onRemoveProvider,
  onAddProvider,
  onToggleModel,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [expandedProviders, setExpandedProviders] = useState<Set<string>>(new Set());
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null);
  const [newModelId, setNewModelId] = useState('');
  const [newModelLabel, setNewModelLabel] = useState('');
  const [newModelCapability, setNewModelCapability] = useState<ModelCapability>('llm');
  const [addingProvider, setAddingProvider] = useState(false);
  const [newProviderLabel, setNewProviderLabel] = useState('');
  const [newProviderType, setNewProviderType] = useState<'openai-compat' | 'anthropic'>('openai-compat');
  const [newProviderBaseUrl, setNewProviderBaseUrl] = useState('');
  const [newProviderApiKey, setNewProviderApiKey] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const toggleShowKey = (id: string) => {
    setShowKeys(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const toggleExpanded = (id: string) => {
    setExpandedProviders(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleAddModelSubmit = (providerId: string) => {
    if (!newModelId.trim()) return;
    onAddModel(providerId, newModelId.trim(), newModelLabel.trim() || newModelId.trim(), newModelCapability);
    setAddingModelFor(null);
    setNewModelId('');
    setNewModelLabel('');
    setNewModelCapability('llm');
  };

  const handleAddProviderSubmit = () => {
    if (!newProviderLabel.trim() || !newProviderBaseUrl.trim()) return;
    onAddProvider(newProviderLabel.trim(), newProviderType, newProviderBaseUrl.trim(), newProviderApiKey.trim());
    setAddingProvider(false);
    setNewProviderLabel('');
    setNewProviderType('openai-compat');
    setNewProviderBaseUrl('');
    setNewProviderApiKey('');
  };

  const handleDeleteProvider = (id: string) => {
    const provider = providers.find(p => p.id === id);
    if (provider?.isDefault) {
      setDeleteConfirm(id);
    } else {
      onRemoveProvider(id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Provider List */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        {providers.map(provider => {
          const isExpanded = expandedProviders.has(provider.id);
          const isAddingModel = addingModelFor === provider.id;

          return (
            <div
              key={provider.id}
              className={`${provider.enabled ? 'bg-white' : 'bg-gray-50/50'} ${
                providers.indexOf(provider) !== providers.length - 1 ? 'border-b border-gray-100' : ''
              }`}
            >
              {/* Provider Header */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors">
                {/* Enable checkbox */}
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={() => onToggleProvider(provider.id)}
                  className="checkbox-custom"
                />

                {/* Provider name (always editable) */}
                <input
                  type="text"
                  value={provider.label}
                  onChange={e => onUpdateProvider(provider.id, { label: e.target.value })}
                  disabled={provider.isDefault}
                  className={`text-sm font-medium bg-transparent border-b border-dashed focus:border-indigo-400 focus:outline-none px-0 py-0 disabled:border-transparent disabled:cursor-default ${
                    provider.enabled ? 'text-gray-800' : 'text-gray-400'
                  } ${provider.isDefault ? '' : 'border-gray-300'}`}
                  placeholder="Provider Name"
                />

                {/* Type badge */}
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 font-mono">
                  {provider.type === 'anthropic' ? 'anthropic' : 'openai'}
                </span>

                {/* Base URL (truncated) */}
                <span className="text-xs text-gray-400 truncate flex-1 max-w-[200px]" title={provider.baseUrl}>
                  {provider.baseUrl || '—'}
                </span>

                {/* Actions */}
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => toggleExpanded(provider.id)}
                    className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                    title={isExpanded ? '收起' : '展开'}
                  >
                    <svg
                      className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleDeleteProvider(provider.id)}
                    className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                    title={provider.isDefault ? '默认供应商不可删除' : '删除供应商'}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {/* Expanded: API Key + Models */}
              {isExpanded && (
                <div className="px-4 pb-4 pl-8 space-y-3">
                  {/* API Key */}
                  <div className="flex items-center gap-2">
                    <Key size={12} className="text-gray-400" />
                    <div className="relative flex-1 max-w-[300px]">
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        placeholder="API Key"
                        value={provider.apiKey}
                        onChange={e => onUpdateProvider(provider.id, { apiKey: e.target.value })}
                        disabled={!provider.enabled}
                        className="w-full pl-7 pr-7 py-1.5 text-xs rounded border border-gray-200 bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-50 disabled:text-gray-300"
                      />
                      <button
                        onClick={() => toggleShowKey(provider.id)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      >
                        {showKeys[provider.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </div>

                  {/* Base URL (editable for all) */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-400 w-16">Base URL:</span>
                    <input
                      type="text"
                      value={provider.baseUrl}
                      onChange={e => onUpdateProvider(provider.id, { baseUrl: e.target.value })}
                      disabled={provider.isDefault || !provider.enabled}
                      placeholder="https://api.example.com/v1"
                      className="flex-1 max-w-[300px] text-xs px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 disabled:bg-gray-50 disabled:cursor-default"
                    />
                  </div>

                  {/* Models */}
                  <div className="space-y-1.5">
                    {provider.models.map(model => (
                      <div
                        key={model.id}
                        className="flex items-center gap-2 py-1"
                      >
                        <input
                          type="checkbox"
                          checked={model.enabled}
                          onChange={() => onToggleModel(provider.id, model.id)}
                          disabled={!provider.enabled}
                          className="checkbox-custom"
                        />
                        {/* Model ID (editable for all) */}
                        <input
                          type="text"
                          value={model.id}
                          onChange={e => onUpdateModel(provider.id, model.id, { id: e.target.value })}
                          disabled={provider.isDefault || !provider.enabled}
                          placeholder="model-id"
                          className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 bg-white font-mono disabled:bg-gray-50 disabled:cursor-default"
                        />
                        {/* Model Label (editable for all) */}
                        <input
                          type="text"
                          value={model.label}
                          onChange={e => onUpdateModel(provider.id, model.id, { label: e.target.value })}
                          disabled={provider.isDefault || !provider.enabled}
                          placeholder="Name"
                          className="w-24 text-xs px-2 py-1 rounded border border-gray-200 bg-white disabled:bg-gray-50 disabled:cursor-default"
                        />
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                          model.capabilities === 'llm'
                            ? 'bg-purple-100 text-purple-600'
                            : 'bg-blue-100 text-blue-600'
                        }`}>
                          {model.capabilities.toUpperCase()}
                        </span>
                        <button
                          onClick={() => {
                            if (provider.isDefault) {
                              // For default providers, confirm before deleting last model
                              if (provider.models.length <= 1) {
                                setDeleteConfirm(`model::${provider.id}::${model.id}`);
                              } else {
                                onRemoveModel(provider.id, model.id);
                              }
                            } else {
                              onRemoveModel(provider.id, model.id);
                            }
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-500"
                          title={provider.isDefault ? '默认供应商的模型不可删除' : '删除模型'}
                          disabled={provider.isDefault}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}

                    {/* Add Model (for all providers) */}
                    {isAddingModel ? (
                      <div className="flex items-center gap-2 py-1 pl-2">
                        <input
                          type="text"
                          value={newModelId}
                          onChange={e => setNewModelId(e.target.value)}
                          placeholder="model-id"
                          className="flex-1 text-xs px-2 py-1 rounded border border-gray-200 bg-white font-mono"
                          autoFocus
                        />
                        <input
                          type="text"
                          value={newModelLabel}
                          onChange={e => setNewModelLabel(e.target.value)}
                          placeholder="Name"
                          className="w-24 text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                        />
                        <select
                          value={newModelCapability}
                          onChange={e => setNewModelCapability(e.target.value as ModelCapability)}
                          className="text-xs px-2 py-1 rounded border border-gray-200 bg-white"
                        >
                          <option value="llm">LLM</option>
                          <option value="ocr">OCR</option>
                        </select>
                        <button
                          onClick={() => handleAddModelSubmit(provider.id)}
                          className="text-xs text-indigo-600 hover:text-indigo-700"
                        >
                          确认
                        </button>
                        <button
                          onClick={() => {
                            setAddingModelFor(null);
                            setNewModelId('');
                            setNewModelLabel('');
                          }}
                          className="text-xs text-gray-400 hover:text-gray-600"
                        >
                          取消
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setAddingModelFor(provider.id)}
                        className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 mt-1"
                      >
                        <Plus size={12} />
                        添加模型
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Provider */}
      {addingProvider ? (
        <div className="border border-dashed border-gray-300 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20">名称:</span>
            <input
              type="text"
              value={newProviderLabel}
              onChange={e => setNewProviderLabel(e.target.value)}
              placeholder="Provider Name"
              className="flex-1 text-sm px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
              autoFocus
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20">类型:</span>
            <select
              value={newProviderType}
              onChange={e => setNewProviderType(e.target.value as 'openai-compat' | 'anthropic')}
              className="text-sm px-2 py-1.5 rounded border border-gray-200 bg-white"
            >
              <option value="openai-compat">OpenAI Compatible</option>
              <option value="anthropic">Anthropic</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20">Base URL:</span>
            <input
              type="text"
              value={newProviderBaseUrl}
              onChange={e => setNewProviderBaseUrl(e.target.value)}
              placeholder="https://api.example.com/v1"
              className="flex-1 text-sm px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600 w-20">API Key:</span>
            <input
              type="password"
              value={newProviderApiKey}
              onChange={e => setNewProviderApiKey(e.target.value)}
              placeholder="sk-..."
              className="flex-1 text-sm px-2 py-1.5 rounded border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setAddingProvider(false);
                setNewProviderLabel('');
                setNewProviderType('openai-compat');
                setNewProviderBaseUrl('');
                setNewProviderApiKey('');
              }}
              className="px-3 py-1.5 text-sm text-gray-500 hover:text-gray-700"
            >
              取消
            </button>
            <button
              onClick={handleAddProviderSubmit}
              disabled={!newProviderLabel.trim() || !newProviderBaseUrl.trim()}
              className="px-3 py-1.5 text-sm text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              确认添加
            </button>
          </div>
        </div>
      ) : (
        <button
          onClick={() => setAddingProvider(true)}
          className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-all duration-150"
        >
          <Plus size={16} />
          添加供应商
        </button>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-lg font-medium text-gray-800 mb-2">
              {deleteConfirm.startsWith('model::') ? '删除模型?' : '删除供应商?'}
            </h3>
            <p className="text-sm text-gray-500 mb-4">
              {deleteConfirm.startsWith('model::')
                ? '确定要删除这个模型吗？删除后无法恢复。'
                : '确定要删除这个供应商吗？删除后无法恢复。'}
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="px-4 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (deleteConfirm.startsWith('model::')) {
                    const [, providerId, modelId] = deleteConfirm.split('::');
                    onRemoveModel(providerId, modelId);
                  } else {
                    onRemoveProvider(deleteConfirm);
                  }
                  setDeleteConfirm(null);
                }}
                className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// Restore Settings Tab
// ============================================================
interface RestoreTabProps {
  restoreMode: RestoreMode;
  restoreFormat: RestoreFormat;
  onSetRestoreMode: (mode: RestoreMode) => void;
  onSetRestoreFormat: (format: RestoreFormat) => void;
}

const RestoreTabContent: React.FC<RestoreTabProps> = ({
  restoreMode,
  restoreFormat,
  onSetRestoreMode,
  onSetRestoreFormat,
}) => {
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-medium text-gray-700">还原设置</h3>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">还原模式</label>
          <select
            value={restoreMode}
            onChange={e => onSetRestoreMode(e.target.value as RestoreMode)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
          >
            <option value="default">默认</option>
            <option value="prompt">Prompt</option>
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1.5">还原格式</label>
          <select
            value={restoreFormat}
            onChange={e => onSetRestoreFormat(e.target.value as RestoreFormat)}
            className="w-full px-3 py-2 text-sm rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150"
          >
            <option value="auto">Auto</option>
            <option value="json">JSON</option>
            <option value="html">HTML</option>
            <option value="md">Markdown</option>
          </select>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
