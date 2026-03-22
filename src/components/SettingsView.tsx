import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Key, Save, Plus, Trash2, Eye, EyeOff,
  Settings, CheckCircle2, Database, Wand2, FileBox, ChevronDown, ChevronUp, Brain,
} from 'lucide-react';
import { useStore } from '../state/store';
import {
  saveDefaultRestoreSettings, getUnifiedProviders, saveUnifiedProviders,
} from '../services/configAdapter';
import type { RestoreMode, RestoreFormat, UnifiedProvider, UnifiedModel, ModelCapability } from '../types';

type TabId = 'providers' | 'restore';

// ── Helpers ─────────────────────────────────────────────────────────────────

interface LabeledSlider {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  left?: string;
  right?: string;
}
const LabeledSlider: React.FC<LabeledSlider> = ({
  label, value, min, max, step, onChange, format, left, right
}) => (
  <div>
    <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
      <span>{label}</span>
      <span className="text-purple-600 font-mono">{format ? format(value) : value}</span>
    </label>
    <input
      type="range" min={min} max={max} step={step} value={value}
      onChange={e => onChange(parseFloat(e.target.value))}
      className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-purple-600"
    />
    {(left || right) && (
      <div className="flex justify-between text-[10px] text-slate-400 mt-1.5 font-medium">
        <span>{left}</span><span>{right}</span>
      </div>
    )}
  </div>
);

// ── SettingsView (root) ──────────────────────────────────────────────────────

const SettingsView: React.FC = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('providers');
  const [providers, setProviders] = useState<UnifiedProvider[]>(() => getUnifiedProviders());

  // Restore local state
  const [restoreMode, setRestoreMode] = useState<RestoreMode>(state.restoreMode);
  const [restoreFormat, setRestoreFormat] = useState<RestoreFormat>(state.restoreFormat);
  const [restoreSystemPrompt, setRestoreSystemPrompt] = useState(state.restoreSystemPrompt);
  const [restorePrompt, setRestorePrompt] = useState(state.restorePrompt);
  const [restoreLlmModelId, setRestoreLlmModelId] = useState(state.restoreLlmModelId);
  const [restoreTemperature, setRestoreTemperature] = useState(state.restoreTemperature);
  const [restoreMaxTokens, setRestoreMaxTokens] = useState(state.restoreMaxTokens);
  const [restoreTopP, setRestoreTopP] = useState(state.restoreTopP);
  const [restoreTimeout, setRestoreTimeout] = useState(state.restoreTimeout);
  const [restoreEnableThinking, setRestoreEnableThinking] = useState(state.restoreEnableThinking);

  useEffect(() => {
    setRestoreMode(state.restoreMode);
    setRestoreFormat(state.restoreFormat);
    setRestoreSystemPrompt(state.restoreSystemPrompt);
    setRestorePrompt(state.restorePrompt);
    setRestoreLlmModelId(state.restoreLlmModelId);
    setRestoreTemperature(state.restoreTemperature);
    setRestoreMaxTokens(state.restoreMaxTokens);
    setRestoreTopP(state.restoreTopP);
    setRestoreTimeout(state.restoreTimeout);
    setRestoreEnableThinking(state.restoreEnableThinking);
  }, [state.settingsOpen]);

  const handleClose = useCallback(() => dispatch({ type: 'SET_SETTINGS_OPEN', open: false }), [dispatch]);

  const handleSave = useCallback(() => {
    saveUnifiedProviders(providers);
    saveDefaultRestoreSettings({
      mode: restoreMode, format: restoreFormat,
      systemPrompt: restoreSystemPrompt, prompt: restorePrompt,
      llmModelId: restoreLlmModelId, temperature: restoreTemperature,
      maxTokens: restoreMaxTokens, topP: restoreTopP,
      timeout: restoreTimeout, enableThinking: restoreEnableThinking,
    });
    dispatch({ type: 'SET_RESTORE_MODE', mode: restoreMode });
    dispatch({ type: 'SET_RESTORE_FORMAT', format: restoreFormat });
    dispatch({ type: 'SET_RESTORE_SYSTEM_PROMPT', prompt: restoreSystemPrompt });
    dispatch({ type: 'SET_RESTORE_PROMPT', prompt: restorePrompt });
    dispatch({ type: 'SET_RESTORE_LLM_MODEL', modelId: restoreLlmModelId });
    dispatch({ type: 'SET_RESTORE_TEMPERATURE', temperature: restoreTemperature });
    dispatch({ type: 'SET_RESTORE_MAX_TOKENS', maxTokens: restoreMaxTokens });
    dispatch({ type: 'SET_RESTORE_TOP_P', topP: restoreTopP });
    dispatch({ type: 'SET_RESTORE_TIMEOUT', timeout: restoreTimeout });
    dispatch({ type: 'SET_RESTORE_ENABLE_THINKING', enabled: restoreEnableThinking });
    handleClose();
  }, [
    providers, restoreMode, restoreFormat, restoreSystemPrompt, restorePrompt,
    restoreLlmModelId, restoreTemperature, restoreMaxTokens, restoreTopP,
    restoreTimeout, restoreEnableThinking, dispatch, handleClose,
  ]);

  // Provider mutators
  const toggleProvider = useCallback((id: string) => setProviders(prev => prev.map(p => p.id === id ? { ...p, enabled: !p.enabled } : p)), []);
  const updateProvider = useCallback((id: string, u: Partial<UnifiedProvider>) => setProviders(prev => prev.map(p => p.id === id ? { ...p, ...u } : p)), []);
  const removeProvider = useCallback((id: string) => setProviders(prev => prev.filter(p => p.id !== id)), []);
  const addProvider = useCallback((label: string, type: 'openai-compat' | 'anthropic', baseUrl: string, apiKey: string) => {
    setProviders(prev => [...prev, { id: `custom-${Date.now()}`, label, type, baseUrl, apiKey, enabled: true, isDefault: false, models: [] }]);
  }, []);
  const toggleModel = useCallback((pid: string, mid: string) => setProviders(prev => prev.map(p => p.id !== pid ? p : { ...p, models: p.models.map(m => m.id === mid ? { ...m, enabled: !m.enabled } : m) })), []);
  const addModel = useCallback((pid: string, id: string, label: string, cap: ModelCapability) => setProviders(prev => prev.map(p => p.id !== pid ? p : { ...p, models: [...p.models, { id, label, capabilities: cap, enabled: true }] })), []);
  const updateModel = useCallback((pid: string, mid: string, u: Partial<UnifiedModel>) => setProviders(prev => prev.map(p => p.id !== pid ? p : { ...p, models: p.models.map(m => m.id === mid ? { ...m, ...u } : m) })), []);
  const removeModel = useCallback((pid: string, mid: string) => setProviders(prev => prev.map(p => p.id !== pid ? p : { ...p, models: p.models.filter(m => m.id !== mid) })), []);

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col" style={{ top: 56 }}>
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 h-14 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-6 z-10 shadow-sm" style={{ marginTop: -56 }}>
        <button onClick={handleClose} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft size={16} />返回工作台
        </button>
        <div className="flex items-center gap-3">
          <button onClick={handleClose} className="px-5 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all">放弃修改</button>
          <button onClick={handleSave} className="flex items-center gap-2 px-6 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 shadow-sm transition-all">
            <Save size={16} />保存全部设置
          </button>
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden" style={{ marginTop: 0 }}>
        {/* Left nav */}
        <div className="w-60 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-5 pb-2">
            <h2 className="text-lg font-bold text-slate-800">配置中心</h2>
            <p className="text-xs text-slate-400 mt-0.5">管理模型节点与工作流引擎</p>
          </div>
          <div className="flex-1 px-3 py-3 space-y-1">
            <NavBtn active={activeTab === 'providers'} icon={<Database size={15} />} onClick={() => setActiveTab('providers')} color="indigo">模型资产与供应商</NavBtn>
            <NavBtn active={activeTab === 'restore'} icon={<Wand2 size={15} />} onClick={() => setActiveTab('restore')} color="purple">还原管线设置</NavBtn>
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-y-auto bg-slate-50/60">
          <div className="max-w-4xl mx-auto px-8 py-8">
            {activeTab === 'providers' ? (
              <ProvidersTab
                providers={providers}
                onToggleProvider={toggleProvider}
                onUpdateProvider={updateProvider}
                onRemoveProvider={removeProvider}
                onAddProvider={addProvider}
                onToggleModel={toggleModel}
                onAddModel={addModel}
                onUpdateModel={updateModel}
                onRemoveModel={removeModel}
              />
            ) : (
              <RestoreTab
                restoreMode={restoreMode}
                restoreFormat={restoreFormat}
                restoreSystemPrompt={restoreSystemPrompt}
                restorePrompt={restorePrompt}
                restoreLlmModelId={restoreLlmModelId}
                restoreTemperature={restoreTemperature}
                restoreMaxTokens={restoreMaxTokens}
                restoreTopP={restoreTopP}
                restoreTimeout={restoreTimeout}
                restoreEnableThinking={restoreEnableThinking}
                providers={providers}
                onSetMode={setRestoreMode}
                onSetFormat={setRestoreFormat}
                onSetSystemPrompt={setRestoreSystemPrompt}
                onSetPrompt={setRestorePrompt}
                onSetLlmModel={setRestoreLlmModelId}
                onSetTemperature={setRestoreTemperature}
                onSetMaxTokens={setRestoreMaxTokens}
                onSetTopP={setRestoreTopP}
                onSetTimeout={setRestoreTimeout}
                onSetEnableThinking={setRestoreEnableThinking}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── NavBtn ───────────────────────────────────────────────────────────────────
const NavBtn: React.FC<{ active: boolean; icon: React.ReactNode; onClick: () => void; color: string; children: React.ReactNode }> = ({ active, icon, onClick, color, children }) => {
  const activeClass = color === 'indigo' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700';
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${active ? activeClass : 'text-slate-600 hover:bg-slate-50'}`}
    >
      {icon}{children}
    </button>
  );
};

// ── ProvidersTab ─────────────────────────────────────────────────────────────
interface ProvidersTabProps {
  providers: UnifiedProvider[];
  onToggleProvider: (id: string) => void;
  onUpdateProvider: (id: string, u: Partial<UnifiedProvider>) => void;
  onRemoveProvider: (id: string) => void;
  onAddProvider: (label: string, type: 'openai-compat' | 'anthropic', baseUrl: string, apiKey: string) => void;
  onToggleModel: (pid: string, mid: string) => void;
  onAddModel: (pid: string, id: string, label: string, cap: ModelCapability) => void;
  onUpdateModel: (pid: string, mid: string, u: Partial<UnifiedModel>) => void;
  onRemoveModel: (pid: string, mid: string) => void;
}

const ProvidersTab: React.FC<ProvidersTabProps> = ({
  providers, onToggleProvider, onUpdateProvider, onRemoveProvider, onAddProvider,
  onToggleModel, onAddModel, onUpdateModel, onRemoveModel,
}) => {
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [addingModelFor, setAddingModelFor] = useState<string | null>(null);
  const [newModelId, setNewModelId] = useState('');
  const [newModelLabel, setNewModelLabel] = useState('');
  const [newModelCap, setNewModelCap] = useState<ModelCapability>('llm');

  const [addingProvider, setAddingProvider] = useState(false);
  const [npLabel, setNpLabel] = useState('');
  const [npType, setNpType] = useState<'openai-compat' | 'anthropic'>('openai-compat');
  const [npBaseUrl, setNpBaseUrl] = useState('');
  const [npApiKey, setNpApiKey] = useState('');

  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const submitModel = (pid: string) => {
    if (!newModelId.trim()) return;
    onAddModel(pid, newModelId.trim(), newModelLabel.trim() || newModelId.trim(), newModelCap);
    setAddingModelFor(null); setNewModelId(''); setNewModelLabel(''); setNewModelCap('llm');
  };

  const submitProvider = () => {
    if (!npLabel.trim() || !npBaseUrl.trim()) return;
    onAddProvider(npLabel.trim(), npType, npBaseUrl.trim(), npApiKey.trim());
    setAddingProvider(false); setNpLabel(''); setNpBaseUrl(''); setNpApiKey('');
  };

  const activeCount = providers.filter(p => p.enabled).length;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h3 className="text-xl font-bold text-slate-800">模型提供商管理</h3>
        <p className="text-slate-500 text-sm mt-1">已启用 {activeCount} 个接入凭据，全局模型路由依此配置。</p>
      </div>

      {providers.map(provider => {
        const activeModels = provider.models.filter(m => m.enabled).length;
        return (
          <div
            key={provider.id}
            className={`bg-white rounded-2xl border transition-all ${
              provider.enabled ? 'border-indigo-100 shadow-sm' : 'border-slate-200 opacity-70'
            }`}
          >
            {/* ── Provider header ── */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-slate-100">
              <div
                onClick={() => onToggleProvider(provider.id)}
                className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all ${
                  provider.enabled ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
                }`}
              >
                {provider.enabled && <CheckCircle2 size={13} strokeWidth={3} className="text-white" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className={`font-bold text-base ${provider.enabled ? 'text-slate-900' : 'text-slate-500'}`}>{provider.label}</span>
                  <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-500 font-medium">
                    {provider.type === 'anthropic' ? 'Anthropic' : 'OpenAI Compat'}
                  </span>
                </div>
                <p className={`text-xs mt-0.5 ${provider.enabled ? 'text-indigo-600' : 'text-slate-400'}`}>
                  {provider.enabled ? (activeModels > 0 ? `${activeModels} 个端点已激活` : '暂无可用端点') : '全局停用'}
                </p>
              </div>
              <button
                onClick={() => setDeleteConfirm(provider.id)}
                disabled={provider.isDefault}
                className="p-1.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-30"
                title={provider.isDefault ? '内置提供商不可删除' : '删除此供应商'}
              >
                <Trash2 size={16} />
              </button>
            </div>

            {/* ── Provider body: vertical layout ── */}
            <div className={`transition-all ${provider.enabled ? '' : 'opacity-50 pointer-events-none'}`}>
              {/* Section A: Credentials */}
              <div className="px-5 py-5 border-b border-slate-100">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  <Settings size={12} className="text-indigo-400" /> 连接凭据
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">Base URL</label>
                    <input
                      type="text"
                      value={provider.baseUrl}
                      onChange={e => onUpdateProvider(provider.id, { baseUrl: e.target.value })}
                      disabled={provider.isDefault}
                      className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all disabled:bg-slate-50 disabled:text-slate-400"
                      placeholder="https://api.example.com/v1"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
                    <div className="relative">
                      <Key size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input
                        type={showKeys[provider.id] ? 'text' : 'password'}
                        value={provider.apiKey}
                        onChange={e => onUpdateProvider(provider.id, { apiKey: e.target.value })}
                        className="w-full pl-9 pr-9 py-2.5 text-sm rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-400 transition-all"
                        placeholder="sk-..."
                      />
                      <button
                        onClick={() => setShowKeys(p => ({ ...p, [provider.id]: !p[provider.id] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showKeys[provider.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Section B: Models — full width, stacked vertically */}
              <div className="px-5 py-5">
                <h4 className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                  <Database size={12} className="text-indigo-400" /> 模型列表
                </h4>

                {/* Table header */}
                <div className="grid grid-cols-[20px_1fr_140px_56px_32px] gap-x-3 items-center px-2 mb-2">
                  <span />
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Model ID</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">显示名称</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">类型</span>
                  <span />
                </div>

                <div className="space-y-1.5">
                  {provider.models.map(model => (
                    <div
                      key={model.id}
                      className={`grid grid-cols-[20px_1fr_140px_56px_32px] gap-x-3 items-center px-3 py-2.5 rounded-xl border transition-all ${
                        model.enabled ? 'bg-white border-slate-200 hover:border-slate-300' : 'bg-slate-50 border-slate-100 opacity-60'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={model.enabled}
                        onChange={() => onToggleModel(provider.id, model.id)}
                        className="w-4 h-4 text-indigo-600 border-slate-300 rounded cursor-pointer"
                      />
                      <input
                        type="text"
                        value={model.id}
                        onChange={e => onUpdateModel(provider.id, model.id, { id: e.target.value })}
                        disabled={provider.isDefault}
                        className="text-sm px-2 py-1 rounded font-mono text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400/40 border border-transparent hover:border-slate-200 focus:border-indigo-300 transition-all disabled:opacity-60 w-full min-w-0"
                      />
                      <input
                        type="text"
                        value={model.label}
                        onChange={e => onUpdateModel(provider.id, model.id, { label: e.target.value })}
                        disabled={provider.isDefault}
                        className="text-sm px-2 py-1 rounded font-medium text-slate-700 bg-transparent hover:bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-400/40 border border-transparent hover:border-slate-200 focus:border-indigo-300 transition-all disabled:opacity-60 w-full"
                      />
                      <span className={`text-[10px] px-2 py-1 rounded-md font-bold uppercase text-center ${
                        model.capabilities === 'llm'
                          ? 'bg-purple-50 text-purple-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {model.capabilities}
                      </span>
                      <button
                        onClick={() => { if (!provider.isDefault) onRemoveModel(provider.id, model.id); }}
                        disabled={provider.isDefault}
                        className="p-1 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-md transition-all disabled:opacity-20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}

                  {addingModelFor === provider.id ? (
                    <div className="grid grid-cols-[1fr_140px_56px_auto] gap-x-3 items-start p-3 bg-indigo-50/60 rounded-xl border border-indigo-100">
                      <input
                        type="text" value={newModelId} onChange={e => setNewModelId(e.target.value)}
                        placeholder="model-id (如: deepseek-chat)"
                        className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500/30"
                        autoFocus
                      />
                      <input
                        type="text" value={newModelLabel} onChange={e => setNewModelLabel(e.target.value)}
                        placeholder="UI 显示名"
                        className="text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/30"
                      />
                      <select
                        value={newModelCap} onChange={e => setNewModelCap(e.target.value as ModelCapability)}
                        className="text-sm px-2 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/30"
                      >
                        <option value="llm">LLM</option>
                        <option value="ocr">OCR</option>
                      </select>
                      <div className="flex gap-2">
                        <button onClick={() => submitModel(provider.id)} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 whitespace-nowrap">添加</button>
                        <button onClick={() => { setAddingModelFor(null); setNewModelId(''); setNewModelLabel(''); }} className="px-3 py-2 text-sm text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setAddingModelFor(provider.id)}
                      className="flex w-full items-center justify-center gap-2 py-2.5 mt-1 text-sm font-medium text-indigo-600 bg-transparent hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-300 rounded-xl transition-all"
                    >
                      <Plus size={14} />注册新的模型 ID
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}

      {/* Add new provider */}
      {addingProvider ? (
        <div className="bg-white rounded-2xl border border-indigo-200 p-6">
          <h3 className="text-base font-bold text-slate-800 mb-5">引入新供应商</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">供应商名称</label>
              <input type="text" value={npLabel} onChange={e => setNpLabel(e.target.value)} placeholder="如: DeepSeek 官方" autoFocus
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 focus:ring-2 focus:ring-indigo-500/30 bg-slate-50 focus:bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">网关类型</label>
              <select value={npType} onChange={e => setNpType(e.target.value as any)}
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white">
                <option value="openai-compat">OpenAI Compatible</option>
                <option value="anthropic">Anthropic</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">Base URL</label>
              <input type="text" value={npBaseUrl} onChange={e => setNpBaseUrl(e.target.value)} placeholder="https://api.deepseek.com/v1"
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
              <input type="password" value={npApiKey} onChange={e => setNpApiKey(e.target.value)} placeholder="sk-..."
                className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button onClick={() => { setAddingProvider(false); setNpLabel(''); setNpBaseUrl(''); setNpApiKey(''); }}
              className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
            <button onClick={submitProvider} disabled={!npLabel.trim() || !npBaseUrl.trim()}
              className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">验证并引入</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setAddingProvider(true)}
          className="flex items-center justify-center gap-2 w-full py-8 bg-white border-2 border-dashed border-slate-200 rounded-2xl hover:border-indigo-400 hover:bg-indigo-50/20 group transition-all">
          <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center group-hover:bg-indigo-100 group-hover:text-indigo-600 text-slate-400 transition-colors">
            <Plus size={20} />
          </div>
          <span className="text-sm font-bold text-slate-500 group-hover:text-indigo-600 transition-colors">接入新的供应商</span>
        </button>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 border border-slate-100">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4"><Trash2 size={20} /></div>
            <h3 className="text-lg font-bold text-slate-900 mb-1.5">确认删除提供商？</h3>
            <p className="text-slate-500 text-sm mb-5">此操作不可还原，依赖此凭据运行的任务将失败。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={() => { onRemoveProvider(deleteConfirm); setDeleteConfirm(null); }}
                className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};


// ── RestoreTab ───────────────────────────────────────────────────────────────
interface RestoreTabProps {
  restoreMode: RestoreMode;
  restoreFormat: RestoreFormat;
  restoreSystemPrompt: string;
  restorePrompt: string;
  restoreLlmModelId: string;
  restoreTemperature: number;
  restoreMaxTokens: number;
  restoreTopP: number;
  restoreTimeout: number;
  restoreEnableThinking: boolean;
  providers: UnifiedProvider[];
  onSetMode: (m: RestoreMode) => void;
  onSetFormat: (f: RestoreFormat) => void;
  onSetSystemPrompt: (s: string) => void;
  onSetPrompt: (s: string) => void;
  onSetLlmModel: (id: string) => void;
  onSetTemperature: (v: number) => void;
  onSetMaxTokens: (v: number) => void;
  onSetTopP: (v: number) => void;
  onSetTimeout: (v: number) => void;
  onSetEnableThinking: (v: boolean) => void;
}

const RestoreTab: React.FC<RestoreTabProps> = ({
  restoreMode, restoreFormat, restoreSystemPrompt, restorePrompt,
  restoreLlmModelId, restoreTemperature, restoreMaxTokens, restoreTopP,
  restoreTimeout, restoreEnableThinking, providers,
  onSetMode, onSetFormat, onSetSystemPrompt, onSetPrompt, onSetLlmModel,
  onSetTemperature, onSetMaxTokens, onSetTopP, onSetTimeout, onSetEnableThinking,
}) => {
  const llmModels = useMemo(() =>
    providers.filter(p => p.enabled).flatMap(p =>
      p.models.filter(m => m.enabled && m.capabilities === 'llm').map(m => ({
        fullId: `${p.id}::${m.id}`, label: `[${p.label}] ${m.label}`,
      }))
    ), [providers]);

  useEffect(() => {
    if (llmModels.length > 0 && !llmModels.find(m => m.fullId === restoreLlmModelId)) {
      onSetLlmModel(llmModels[0].fullId);
    }
  }, [llmModels, restoreLlmModelId, onSetLlmModel]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-200">
      <div>
        <h3 className="text-xl font-bold text-slate-800">OCR 内容还原配置</h3>
        <p className="text-slate-500 text-sm mt-1">控制 OCR 识别文本如何被下游处理和渲染。</p>
      </div>

      {/* Mode selection */}
      <div className="grid grid-cols-2 gap-4">
        <ModeCard
          active={restoreMode === 'default'}
          icon={<FileBox size={18} />}
          title="规则引擎渲染"
          desc="本地解析，0 Token，立即成型"
          color="indigo"
          onClick={() => onSetMode('default')}
        />
        <ModeCard
          active={restoreMode === 'prompt'}
          icon={<Wand2 size={18} />}
          title="AI 大模型重构"
          desc="LLM 深度理解，智能排版修复"
          color="purple"
          onClick={() => onSetMode('prompt')}
        />
      </div>

      {/* Default mode options */}
      {restoreMode === 'default' && (
        <div className="bg-white rounded-2xl border border-indigo-100 p-5">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">渲染格式</label>
          <div className="flex gap-2 flex-wrap">
            {(['auto', 'md', 'html', 'json'] as RestoreFormat[]).map(fmt => (
              <button
                key={fmt}
                onClick={() => onSetFormat(fmt)}
                className={`px-5 py-2 text-sm font-bold rounded-lg transition-all border ${
                  restoreFormat === fmt
                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'
                }`}
              >
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* AI mode options */}
      {restoreMode === 'prompt' && (
        <div className="space-y-5">
          {/* Model & Parameters */}
          <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
            <div className="px-5 py-3 bg-purple-50/60 border-b border-purple-100">
              <h4 className="text-sm font-bold text-purple-900">① 模型与参数配置</h4>
            </div>
            <div className="p-5 space-y-6">
              {/* Model select */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">执行模型</label>
                <select
                  value={restoreLlmModelId}
                  onChange={e => onSetLlmModel(e.target.value)}
                  className="w-full text-sm px-4 py-2.5 rounded-xl border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500/30 font-semibold"
                >
                  {llmModels.length === 0 && <option value="">暂无可用 LLM，请先在供应商中启用</option>}
                  {llmModels.map(m => <option key={m.fullId} value={m.fullId}>{m.label}</option>)}
                </select>
              </div>

              {/* Thinking toggle */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <Brain size={18} className={restoreEnableThinking ? 'text-purple-600' : 'text-slate-400'} />
                  <div>
                    <p className="text-sm font-bold text-slate-800">开启思考模式 (Extended Thinking)</p>
                    <p className="text-xs text-slate-500 mt-0.5">仅支持 Claude 3.7 Sonnet、Qwen3 等思考型模型</p>
                  </div>
                </div>
                <button
                  onClick={() => onSetEnableThinking(!restoreEnableThinking)}
                  className={`relative w-11 h-6 rounded-full transition-colors ${restoreEnableThinking ? 'bg-purple-600' : 'bg-slate-200'}`}
                >
                  <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-all ${restoreEnableThinking ? 'left-6' : 'left-1'}`} />
                </button>
              </div>

              {/* Sliders grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <LabeledSlider
                  label="Temperature" value={restoreTemperature} min={0} max={2} step={0.05}
                  onChange={onSetTemperature} format={v => v.toFixed(2)}
                  left="0 (确定性)" right="2 (发散)"
                />
                <LabeledSlider
                  label="Top-P (nucleus sampling)" value={restoreTopP} min={0} max={1} step={0.01}
                  onChange={onSetTopP} format={v => v.toFixed(2)}
                  left="0" right="1"
                />
                <div>
                  <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    <span>Max Tokens</span>
                    <span className="text-purple-600 font-mono">{restoreMaxTokens.toLocaleString()}</span>
                  </label>
                  <input
                    type="number" min={256} max={32768} step={256} value={restoreMaxTokens}
                    onChange={e => onSetMaxTokens(parseInt(e.target.value) || 4096)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/30 font-mono"
                  />
                </div>
                <div>
                  <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
                    <span>请求超时 (秒)</span>
                    <span className="text-purple-600 font-mono">{restoreTimeout}s</span>
                  </label>
                  <input
                    type="number" min={10} max={300} step={5} value={restoreTimeout}
                    onChange={e => onSetTimeout(parseInt(e.target.value) || 60)}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/30 font-mono"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Prompts */}
          <div className="bg-white rounded-2xl border border-purple-100 overflow-hidden">
            <div className="px-5 py-3 bg-purple-50/60 border-b border-purple-100">
              <h4 className="text-sm font-bold text-purple-900">② Prompt 模板配置</h4>
            </div>
            <div className="p-5 space-y-5">
              {/* Variables reminder */}
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="text-slate-500 self-center">可用变量：</span>
                <code className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 font-mono">{`{{ocr_text}}`}</code>
                <span className="text-slate-400 self-center">— OCR 原始文本</span>
                <code className="px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-100 font-mono">{`{{source_image}}`}</code>
                <span className="text-slate-400 self-center">— 原图 Base64（多模态）</span>
              </div>

              {/* System Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">System Prompt（角色设定）</label>
                <textarea
                  value={restoreSystemPrompt}
                  onChange={e => onSetSystemPrompt(e.target.value)}
                  rows={5}
                  placeholder="你是一位专业的文档重排版助手…"
                  className="w-full text-sm p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 font-mono leading-relaxed resize-y placeholder-slate-300 transition-all"
                />
              </div>

              {/* User Prompt */}
              <div>
                <label className="block text-xs font-bold text-slate-600 uppercase tracking-widest mb-2">User Prompt（任务指令 + 变量注入）</label>
                <textarea
                  value={restorePrompt}
                  onChange={e => onSetPrompt(e.target.value)}
                  rows={8}
                  placeholder={`请重排以下 OCR 识别文本，恢复原始版面结构：\n\n{{ocr_text}}\n\n请参考原始图像：{{source_image}}`}
                  className="w-full text-sm p-3.5 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 focus:border-purple-400 font-mono leading-relaxed resize-y placeholder-slate-300 transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ModeCard ─────────────────────────────────────────────────────────────────
const ModeCard: React.FC<{
  active: boolean; icon: React.ReactNode; title: string; desc: string; color: string; onClick: () => void;
}> = ({ active, icon, title, desc, color, onClick }) => {
  const colors = color === 'indigo'
    ? { border: 'border-indigo-500', bg: 'bg-indigo-50', text: 'text-indigo-700', radio: 'border-indigo-600', dot: 'bg-indigo-600' }
    : { border: 'border-purple-500', bg: 'bg-purple-50', text: 'text-purple-700', radio: 'border-purple-600', dot: 'bg-purple-600' };

  return (
    <button
      onClick={onClick}
      className={`text-left p-5 rounded-2xl border-2 transition-all ${
        active ? `${colors.border} ${colors.bg} shadow-md` : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={active ? colors.text : 'text-slate-400'}>{icon}</span>
        <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${active ? colors.radio : 'border-slate-300'}`}>
          {active && <div className={`w-2 h-2 rounded-full ${colors.dot}`} />}
        </div>
      </div>
      <p className={`text-sm font-bold ${active ? colors.text : 'text-slate-700'}`}>{title}</p>
      <p className="text-xs text-slate-500 mt-1 leading-snug">{desc}</p>
    </button>
  );
};

export default SettingsView;
