import React, { useState, useEffect, useCallback } from 'react';
import { Key, Save, X, Plus, Trash2 } from 'lucide-react';
import { useStore } from '../state/store';
import {
  getAvailableOcrModels,
  saveApiKey,
  saveEnabledProviderIds,
  saveEnabledModelIds,
  saveDefaultProviderId,
  saveDefaultRestoreSettings,
  getTextProviderConfigs,
  saveTextProviderConfigs,
  OcrProviderId,
} from '../services/configAdapter';
import { DEFAULT_TEXT_PROVIDERS } from '../constants';
import type { RestoreMode, RestoreFormat } from '../types';

type TabId = 'ocr' | 'text';

interface TextProviderLocal {
  id: string;
  label: string;
  type: 'openai-compat' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: Array<{ id: string; label: string; enabled: boolean }>;
  isDefault?: boolean;
}

const SettingsModal: React.FC = () => {
  const { state, dispatch, availableProviders } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('ocr');

  // --- OCR local state ---
  const [enabledProviderIds, setEnabledProviderIds] = useState<OcrProviderId[]>(
    () => [...state.enabledProviderIds],
  );
  const [apiKeys, setApiKeys] = useState<Record<OcrProviderId, string>>(
    () => ({ ...state.providerApiKeys }),
  );
  const [enabledModels, setEnabledModels] = useState<Record<OcrProviderId, string[]>>(
    () => {
      const copy: Record<string, string[]> = {};
      for (const key of Object.keys(state.enabledModelsByProvider)) {
        copy[key] = [...(state.enabledModelsByProvider[key as OcrProviderId] || [])];
      }
      return copy as Record<OcrProviderId, string[]>;
    },
  );
  const [restoreMode, setRestoreMode] = useState<RestoreMode>(state.restoreMode);
  const [restoreFormat, setRestoreFormat] = useState<RestoreFormat>(state.restoreFormat);

  // --- Text model local state ---
  const [textProviders, setTextProviders] = useState<TextProviderLocal[]>(() => {
    const stored = getTextProviderConfigs();
    if (stored.length > 0) {
      return stored.map(p => ({
        ...p,
        isDefault: DEFAULT_TEXT_PROVIDERS.some(d => d.id === p.id),
      }));
    }
    // Initialize from defaults
    return DEFAULT_TEXT_PROVIDERS.map(d => ({
      id: d.id,
      label: d.label,
      type: d.type,
      baseUrl: d.baseUrl,
      apiKey: '',
      enabled: true,
      models: d.models.map(m => ({ id: m.id, label: m.label, enabled: true })),
      isDefault: true,
    }));
  });

  // Sync local state if store changes externally
  useEffect(() => {
    setEnabledProviderIds([...state.enabledProviderIds]);
    setApiKeys({ ...state.providerApiKeys });
    const copy: Record<string, string[]> = {};
    for (const key of Object.keys(state.enabledModelsByProvider)) {
      copy[key] = [...(state.enabledModelsByProvider[key as OcrProviderId] || [])];
    }
    setEnabledModels(copy as Record<OcrProviderId, string[]>);
    setRestoreMode(state.restoreMode);
    setRestoreFormat(state.restoreFormat);
  }, [state.settingsOpen]);

  // --- OCR handlers ---
  const toggleProvider = useCallback((providerId: OcrProviderId) => {
    setEnabledProviderIds(prev => {
      if (prev.includes(providerId)) {
        // Don't allow disabling all providers
        if (prev.length <= 1) return prev;
        return prev.filter(id => id !== providerId);
      }
      return [...prev, providerId];
    });
  }, []);

  const updateApiKey = useCallback((providerId: OcrProviderId, key: string) => {
    setApiKeys(prev => ({ ...prev, [providerId]: key }));
  }, []);

  const toggleModel = useCallback((providerId: OcrProviderId, modelId: string) => {
    setEnabledModels(prev => {
      const current = prev[providerId] || [];
      if (current.includes(modelId)) {
        return { ...prev, [providerId]: current.filter(id => id !== modelId) };
      }
      return { ...prev, [providerId]: [...current, modelId] };
    });
  }, []);

  // --- Text provider handlers ---
  const updateTextProvider = useCallback((id: string, updates: Partial<TextProviderLocal>) => {
    setTextProviders(prev =>
      prev.map(p => (p.id === id ? { ...p, ...updates } : p)),
    );
  }, []);

  const toggleTextModel = useCallback((providerId: string, modelId: string) => {
    setTextProviders(prev =>
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

  const addCustomProvider = useCallback(() => {
    const newId = `custom-${Date.now()}`;
    setTextProviders(prev => [
      ...prev,
      {
        id: newId,
        label: 'Custom Provider',
        type: 'openai-compat' as const,
        baseUrl: '',
        apiKey: '',
        enabled: true,
        models: [],
        isDefault: false,
      },
    ]);
  }, []);

  const removeTextProvider = useCallback((id: string) => {
    setTextProviders(prev => prev.filter(p => p.id !== id));
  }, []);

  const addModelToProvider = useCallback((providerId: string) => {
    setTextProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        const newModelId = `model-${Date.now()}`;
        return {
          ...p,
          models: [...p.models, { id: newModelId, label: '', enabled: true }],
        };
      }),
    );
  }, []);

  const updateModelInProvider = useCallback(
    (providerId: string, modelId: string, updates: Partial<{ id: string; label: string }>) => {
      setTextProviders(prev =>
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
    },
    [],
  );

  const removeModelFromProvider = useCallback((providerId: string, modelId: string) => {
    setTextProviders(prev =>
      prev.map(p => {
        if (p.id !== providerId) return p;
        return { ...p, models: p.models.filter(m => m.id !== modelId) };
      }),
    );
  }, []);

  // --- Save ---
  const handleSave = useCallback(() => {
    // Persist OCR settings
    saveEnabledProviderIds(enabledProviderIds);
    for (const providerId of availableProviders.map(p => p.id)) {
      saveApiKey(apiKeys[providerId] || '', providerId);
      saveEnabledModelIds(providerId, (enabledModels[providerId] || []) as Parameters<typeof saveEnabledModelIds>[1]);
    }
    if (enabledProviderIds.length > 0) {
      saveDefaultProviderId(enabledProviderIds[0]);
    }
    saveDefaultRestoreSettings({ mode: restoreMode, format: restoreFormat });

    // Persist text provider settings
    const textConfigsToSave = textProviders.map(({ isDefault, ...rest }) => rest);
    saveTextProviderConfigs(textConfigsToSave);

    // Dispatch to store
    dispatch({ type: 'SET_ENABLED_PROVIDERS', ids: enabledProviderIds });
    for (const providerId of availableProviders.map(p => p.id)) {
      dispatch({ type: 'SET_PROVIDER_API_KEY', providerId, key: apiKeys[providerId] || '' });
      dispatch({ type: 'SET_ENABLED_MODELS', providerId, modelIds: enabledModels[providerId] || [] });
    }
    dispatch({ type: 'SET_RESTORE_MODE', mode: restoreMode });
    dispatch({ type: 'SET_RESTORE_FORMAT', format: restoreFormat });

    dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  }, [
    enabledProviderIds, apiKeys, enabledModels, restoreMode, restoreFormat,
    textProviders, availableProviders, dispatch,
  ]);

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
        className="relative w-full max-w-[560px] max-h-[85vh] bg-white rounded-2xl shadow-modal flex flex-col overflow-hidden modal-panel"
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

        {/* Tabs - Pill segment */}
        <div className="px-6 py-3 border-b border-gray-100">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'ocr'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('ocr')}
            >
              OCR 供应商
            </button>
            <button
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-all duration-150 ${
                activeTab === 'text'
                  ? 'bg-white text-indigo-600 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
              onClick={() => setActiveTab('text')}
            >
              文本模型
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-5">
          {activeTab === 'ocr' ? (
            <OcrTabContent
              availableProviders={availableProviders}
              enabledProviderIds={enabledProviderIds}
              apiKeys={apiKeys}
              enabledModels={enabledModels}
              restoreMode={restoreMode}
              restoreFormat={restoreFormat}
              onToggleProvider={toggleProvider}
              onUpdateApiKey={updateApiKey}
              onToggleModel={toggleModel}
              onSetRestoreMode={setRestoreMode}
              onSetRestoreFormat={setRestoreFormat}
            />
          ) : (
            <TextTabContent
              providers={textProviders}
              onUpdateProvider={updateTextProvider}
              onToggleModel={toggleTextModel}
              onAddProvider={addCustomProvider}
              onRemoveProvider={removeTextProvider}
              onAddModel={addModelToProvider}
              onUpdateModel={updateModelInProvider}
              onRemoveModel={removeModelFromProvider}
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
// OCR Tab
// ============================================================
interface OcrTabProps {
  availableProviders: Array<{ id: OcrProviderId; label: string }>;
  enabledProviderIds: OcrProviderId[];
  apiKeys: Record<OcrProviderId, string>;
  enabledModels: Record<OcrProviderId, string[]>;
  restoreMode: RestoreMode;
  restoreFormat: RestoreFormat;
  onToggleProvider: (id: OcrProviderId) => void;
  onUpdateApiKey: (id: OcrProviderId, key: string) => void;
  onToggleModel: (providerId: OcrProviderId, modelId: string) => void;
  onSetRestoreMode: (mode: RestoreMode) => void;
  onSetRestoreFormat: (format: RestoreFormat) => void;
}

const OcrTabContent: React.FC<OcrTabProps> = ({
  availableProviders,
  enabledProviderIds,
  apiKeys,
  enabledModels,
  restoreMode,
  restoreFormat,
  onToggleProvider,
  onUpdateApiKey,
  onToggleModel,
  onSetRestoreMode,
  onSetRestoreFormat,
}) => {
  return (
    <>
      {/* Provider table */}
      <div className="space-y-3">
        <h3 className="text-sm font-medium text-gray-700">OCR 供应商配置</h3>
        <div className="border border-gray-200 rounded-lg overflow-hidden shadow-card">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                <th className="px-3 py-2.5 text-left w-10">启用</th>
                <th className="px-3 py-2.5 text-left w-28">供应商</th>
                <th className="px-3 py-2.5 text-left">API Key</th>
                <th className="px-3 py-2.5 text-left w-40">可用模型</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {availableProviders.map(provider => {
                const isEnabled = enabledProviderIds.includes(provider.id);
                const models = getAvailableOcrModels(provider.id);
                const providerEnabledModels = enabledModels[provider.id] || [];

                return (
                  <tr
                    key={provider.id}
                    className={`${isEnabled ? 'bg-white' : 'bg-gray-50/50'} transition-colors`}
                  >
                    {/* Enable checkbox */}
                    <td className="px-3 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={isEnabled}
                        onChange={() => onToggleProvider(provider.id)}
                        className="checkbox-custom"
                      />
                    </td>

                    {/* Provider name */}
                    <td className="px-3 py-3">
                      <span className={`font-medium ${isEnabled ? 'text-gray-800' : 'text-gray-400'}`}>
                        {provider.label}
                      </span>
                    </td>

                    {/* API Key */}
                    <td className="px-3 py-3">
                      <div className="relative">
                        <Key size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                        <input
                          type="password"
                          placeholder="sk-..."
                          value={apiKeys[provider.id] || ''}
                          onChange={e => onUpdateApiKey(provider.id, e.target.value)}
                          disabled={!isEnabled}
                          className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-300 transition-all duration-150"
                        />
                      </div>
                    </td>

                    {/* Models */}
                    <td className="px-3 py-3">
                      <div className="flex flex-col gap-1.5">
                        {models.map(model => (
                          <label
                            key={model.modelId}
                            className={`flex items-center gap-1.5 text-sm cursor-pointer ${
                              isEnabled ? 'text-gray-700' : 'text-gray-400'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={providerEnabledModels.includes(model.modelId)}
                              onChange={() => onToggleModel(provider.id, model.modelId)}
                              disabled={!isEnabled}
                              className="checkbox-custom"
                            />
                            {model.modelLabel}
                          </label>
                        ))}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Restore settings */}
      <div className="space-y-3 pt-2">
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
    </>
  );
};

// ============================================================
// Text Models Tab
// ============================================================
interface TextTabProps {
  providers: TextProviderLocal[];
  onUpdateProvider: (id: string, updates: Partial<TextProviderLocal>) => void;
  onToggleModel: (providerId: string, modelId: string) => void;
  onAddProvider: () => void;
  onRemoveProvider: (id: string) => void;
  onAddModel: (providerId: string) => void;
  onUpdateModel: (providerId: string, modelId: string, updates: Partial<{ id: string; label: string }>) => void;
  onRemoveModel: (providerId: string, modelId: string) => void;
}

const TextTabContent: React.FC<TextTabProps> = ({
  providers,
  onUpdateProvider,
  onToggleModel,
  onAddProvider,
  onRemoveProvider,
  onAddModel,
  onUpdateModel,
  onRemoveModel,
}) => {
  return (
    <>
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-700">文本模型供应商</h3>

        {providers.map(provider => (
          <div
            key={provider.id}
            className="border border-gray-200 rounded-lg overflow-hidden shadow-card hover:shadow-card-hover transition-shadow duration-200"
          >
            {/* Provider header */}
            <div className="flex items-center justify-between px-4 py-3 bg-gray-50">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={provider.enabled}
                  onChange={() => onUpdateProvider(provider.id, { enabled: !provider.enabled })}
                  className="checkbox-custom"
                />
                {provider.isDefault ? (
                  <span className="text-sm font-medium text-gray-800">{provider.label}</span>
                ) : (
                  <input
                    type="text"
                    value={provider.label}
                    onChange={e => onUpdateProvider(provider.id, { label: e.target.value })}
                    className="text-sm font-medium text-gray-800 bg-transparent border-b border-dashed border-gray-300 focus:border-indigo-400 focus:outline-none px-0 py-0"
                    placeholder="Provider Name"
                  />
                )}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-200 text-gray-500 font-mono">
                  {provider.type}
                </span>
              </div>
              {!provider.isDefault && (
                <button
                  onClick={() => onRemoveProvider(provider.id)}
                  className="p-1 text-gray-400 hover:text-red-500 transition-all duration-150"
                  title="删除供应商"
                >
                  <Trash2 size={14} />
                </button>
              )}
            </div>

            {/* Provider details */}
            <div className="px-4 py-3 space-y-3">
              {/* Base URL */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">Base URL</label>
                <input
                  type="text"
                  value={provider.baseUrl}
                  onChange={e => onUpdateProvider(provider.id, { baseUrl: e.target.value })}
                  readOnly={provider.isDefault}
                  placeholder="https://api.example.com/v1"
                  className={`w-full px-3 py-2 text-sm rounded-lg border border-gray-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all duration-150 ${
                    provider.isDefault
                      ? 'bg-gray-50 text-gray-500 cursor-default'
                      : 'bg-white'
                  }`}
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-xs text-gray-500 mb-1.5">API Key</label>
                <div className="relative">
                  <Key size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    value={provider.apiKey}
                    onChange={e => onUpdateProvider(provider.id, { apiKey: e.target.value })}
                    placeholder="sk-..."
                    disabled={!provider.enabled}
                    className="w-full pl-8 pr-3 py-2 text-sm rounded-lg border border-gray-200 bg-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 disabled:bg-gray-50 disabled:text-gray-300 transition-all duration-150"
                  />
                </div>
              </div>

              {/* Models */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs text-gray-500">模型</label>
                  {!provider.isDefault && (
                    <button
                      onClick={() => onAddModel(provider.id)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors"
                    >
                      <Plus size={12} />
                      添加模型
                    </button>
                  )}
                </div>
                <div className="space-y-1.5">
                  {provider.models.map(model => (
                    <div key={model.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={model.enabled}
                        onChange={() => onToggleModel(provider.id, model.id)}
                        disabled={!provider.enabled}
                        className="checkbox-custom"
                      />
                      {provider.isDefault ? (
                        <span className="text-sm text-gray-700 flex-1">{model.label}</span>
                      ) : (
                        <>
                          <input
                            type="text"
                            value={model.id}
                            onChange={e => onUpdateModel(provider.id, model.id, { id: e.target.value })}
                            placeholder="model-id"
                            className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 font-mono transition-all duration-150"
                          />
                          <input
                            type="text"
                            value={model.label}
                            onChange={e => onUpdateModel(provider.id, model.id, { label: e.target.value })}
                            placeholder="Display Name"
                            className="w-28 text-sm px-2.5 py-1.5 rounded-lg border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all duration-150"
                          />
                          <button
                            onClick={() => onRemoveModel(provider.id, model.id)}
                            className="p-0.5 text-gray-400 hover:text-red-500 transition-all duration-150"
                          >
                            <Trash2 size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  ))}
                  {provider.models.length === 0 && (
                    <p className="text-sm text-gray-400 italic">暂无模型，请添加。</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add custom provider */}
      <button
        onClick={onAddProvider}
        className="flex items-center gap-2 w-full px-4 py-2.5 text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg hover:border-indigo-400 hover:text-indigo-600 transition-all duration-150"
      >
        <Plus size={16} />
        添加自定义供应商 (OpenAI Compatible)
      </button>
    </>
  );
};

export default SettingsModal;
