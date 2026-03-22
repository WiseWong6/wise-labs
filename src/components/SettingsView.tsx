import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft, Key, Plus, Trash2, Eye, EyeOff, ChevronDown, ChevronRight,
  Settings, CheckCircle2, Database, Wand2, FileBox, Brain, Layers, Zap,
  Cpu, Eye as EyeIcon, Wrench,
} from 'lucide-react';
import { useStore } from '../state/store';
import {
  saveDefaultRestoreSettings, getUnifiedProviders, saveUnifiedProviders,
} from '../services/configAdapter';
import type { RestoreMode, RestoreFormat, UnifiedProvider, UnifiedModel, ModelCapability } from '../types';

type TabId = 'providers' | 'restore';

const LabeledSlider: React.FC<{
  label: string; value: number; min: number; max: number; step: number;
  onChange: (v: number) => void; format?: (v: number) => string; left?: string; right?: string;
}> = ({ label, value, min, max, step, onChange, format, left, right }) => (
  <div>
    <label className="flex justify-between text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">
      <span>{label}</span>
      <span className="text-purple-600 font-mono">{format ? format(value) : value}</span>
    </label>
    <input type="range" min={min} max={max} step={step} value={value}
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

// Toggle pill
const Toggle: React.FC<{ value: boolean; onChange: (v: boolean) => void; label: string; icon?: React.ReactNode; hint?: string }> = ({ value, onChange, label, icon, hint }) => (
  <div
    onClick={() => onChange(!value)}
    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border cursor-pointer select-none transition-all ${
      value ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
    }`}
  >
    <span className={value ? 'text-indigo-500' : 'text-slate-400'}>{icon ?? <Cpu size={13} />}</span>
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold leading-tight">{label}</p>
      {hint && <p className="text-[10px] text-slate-400 leading-tight mt-0.5">{hint}</p>}
    </div>
    <div className={`relative w-8 h-4 rounded-full transition-colors shrink-0 ${value ? 'bg-indigo-500' : 'bg-slate-200'}`}>
      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full shadow transition-all ${value ? 'left-4' : 'left-0.5'}`} />
    </div>
  </div>
);

// ── SettingsView ─────────────────────────────────────────────────────────────
const SettingsView: React.FC = () => {
  const { state, dispatch } = useStore();
  const [activeTab, setActiveTab] = useState<TabId>('providers');
  const [providers, setProviders] = useState<UnifiedProvider[]>(() => getUnifiedProviders());

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
    setProviders(getUnifiedProviders());
    setRestoreMode(state.restoreMode); setRestoreFormat(state.restoreFormat);
    setRestoreSystemPrompt(state.restoreSystemPrompt); setRestorePrompt(state.restorePrompt);
    setRestoreLlmModelId(state.restoreLlmModelId); setRestoreTemperature(state.restoreTemperature);
    setRestoreMaxTokens(state.restoreMaxTokens); setRestoreTopP(state.restoreTopP);
    setRestoreTimeout(state.restoreTimeout); setRestoreEnableThinking(state.restoreEnableThinking);
  }, [state.settingsOpen]);

  const updateProviders = useCallback((next: UnifiedProvider[] | ((p: UnifiedProvider[]) => UnifiedProvider[])) => {
    setProviders(prev => {
      const n = typeof next === 'function' ? next(prev) : next;
      saveUnifiedProviders(n);
      return n;
    });
  }, []);

  const persistRestore = useCallback((overrides: Record<string, unknown> = {}) => {
    saveDefaultRestoreSettings({
      mode: restoreMode, format: restoreFormat,
      systemPrompt: restoreSystemPrompt, prompt: restorePrompt,
      llmModelId: restoreLlmModelId, temperature: restoreTemperature,
      maxTokens: restoreMaxTokens, topP: restoreTopP,
      timeout: restoreTimeout, enableThinking: restoreEnableThinking,
      ...overrides,
    });
  }, [restoreMode, restoreFormat, restoreSystemPrompt, restorePrompt,
    restoreLlmModelId, restoreTemperature, restoreMaxTokens, restoreTopP, restoreTimeout, restoreEnableThinking]);

  const handleClose = useCallback(() => {
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
    dispatch({ type: 'SET_SETTINGS_OPEN', open: false });
  }, [dispatch, restoreMode, restoreFormat, restoreSystemPrompt, restorePrompt,
    restoreLlmModelId, restoreTemperature, restoreMaxTokens, restoreTopP, restoreTimeout, restoreEnableThinking]);

  // Provider mutators
  const toggleProvider   = (id: string) => updateProviders(p => p.map(x => x.id === id ? { ...x, enabled: !x.enabled } : x));
  const removeProvider   = (id: string) => updateProviders(p => p.filter(x => x.id !== id));
  const updateProvider   = (id: string, u: Partial<UnifiedProvider>) => updateProviders(p => p.map(x => x.id === id ? { ...x, ...u } : x));
  const addProvider      = (label: string, type: 'openai-compat' | 'anthropic', baseUrl: string, apiKey: string) =>
    updateProviders(p => [...p, { id: `custom-${Date.now()}`, label, type, baseUrl, apiKey, enabled: true, isDefault: false, models: [] }]);
  const toggleModel      = (pid: string, mid: string) => updateProviders(p => p.map(x => x.id !== pid ? x : { ...x, models: x.models.map(m => m.id === mid ? { ...m, enabled: !m.enabled } : m) }));
  const addModel         = (pid: string, mdl: UnifiedModel) => updateProviders(p => p.map(x => x.id !== pid ? x : { ...x, models: [...x.models, mdl] }));
  const updateModel      = (pid: string, mid: string, u: Partial<UnifiedModel>) => updateProviders(p => p.map(x => x.id !== pid ? x : { ...x, models: x.models.map(m => m.id === mid ? { ...m, ...u } : m) }));
  const removeModel      = (pid: string, mid: string) => updateProviders(p => p.map(x => x.id !== pid ? x : { ...x, models: x.models.filter(m => m.id !== mid) }));

  const stats = useMemo(() => {
    const ep = providers.filter(p => p.enabled);
    return {
      providers: ep.length,
      llm: ep.flatMap(p => p.models.filter(m => m.enabled && m.capabilities === 'llm')).length,
      ocr: ep.flatMap(p => p.models.filter(m => m.enabled && m.capabilities === 'ocr')).length,
    };
  }, [providers]);

  return (
    <div className="absolute inset-0 z-50 bg-slate-50 flex flex-col">
      <div className="h-12 bg-white/90 backdrop-blur-md border-b border-slate-200 flex items-center justify-between px-5 shadow-sm shrink-0">
        <button onClick={handleClose} className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium text-sm px-3 py-1.5 rounded-lg hover:bg-slate-100 transition-colors">
          <ArrowLeft size={15} />返回工作台
        </button>
        <span className="text-xs text-slate-400">修改即时生效 · 自动保存</span>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Left nav */}
        <div className="w-48 border-r border-slate-200 bg-white flex flex-col shrink-0">
          <div className="p-4 pb-2">
            <h2 className="text-sm font-bold text-slate-700">配置中心</h2>
          </div>
          <div className="px-2 py-2 space-y-0.5">
            {(['providers', 'restore'] as const).map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab)}
                className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeTab === tab
                    ? tab === 'providers' ? 'bg-indigo-50 text-indigo-700' : 'bg-purple-50 text-purple-700'
                    : 'text-slate-600 hover:bg-slate-50'
                }`}>
                {tab === 'providers' ? <><Database size={14} />模型资产</> : <><Wand2 size={14} />还原管线</>}
              </button>
            ))}
          </div>
        </div>

        {/* Right content */}
        <div className="flex-1 overflow-hidden flex flex-col min-w-0">
          {activeTab === 'providers' ? (
            <ProvidersTab
              providers={providers} stats={stats}
              onToggleProvider={toggleProvider} onUpdateProvider={updateProvider}
              onRemoveProvider={removeProvider} onAddProvider={addProvider}
              onToggleModel={toggleModel} onAddModel={addModel}
              onUpdateModel={updateModel} onRemoveModel={removeModel}
            />
          ) : (
            <div className="flex-1 overflow-y-auto px-8 py-6">
              <RestoreTab
                restoreMode={restoreMode} restoreFormat={restoreFormat}
                restoreSystemPrompt={restoreSystemPrompt} restorePrompt={restorePrompt}
                restoreLlmModelId={restoreLlmModelId} restoreTemperature={restoreTemperature}
                restoreMaxTokens={restoreMaxTokens} restoreTopP={restoreTopP}
                restoreTimeout={restoreTimeout} restoreEnableThinking={restoreEnableThinking}
                providers={providers}
                onSetMode={v => { setRestoreMode(v); persistRestore({ mode: v }); }}
                onSetFormat={v => { setRestoreFormat(v); persistRestore({ format: v }); }}
                onSetSystemPrompt={setRestoreSystemPrompt}
                onSetPrompt={setRestorePrompt}
                onSetLlmModel={v => { setRestoreLlmModelId(v); persistRestore({ llmModelId: v }); }}
                onSetTemperature={v => { setRestoreTemperature(v); persistRestore({ temperature: v }); }}
                onSetMaxTokens={setRestoreMaxTokens}
                onSetTopP={v => { setRestoreTopP(v); persistRestore({ topP: v }); }}
                onSetTimeout={setRestoreTimeout}
                onSetEnableThinking={v => { setRestoreEnableThinking(v); persistRestore({ enableThinking: v }); }}
                onBlurPersist={() => persistRestore()}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ── ProvidersTab ─────────────────────────────────────────────────────────────
interface ProvidersTabProps {
  providers: UnifiedProvider[];
  stats: { providers: number; llm: number; ocr: number };
  onToggleProvider: (id: string) => void;
  onUpdateProvider: (id: string, u: Partial<UnifiedProvider>) => void;
  onRemoveProvider: (id: string) => void;
  onAddProvider: (label: string, type: 'openai-compat' | 'anthropic', baseUrl: string, apiKey: string) => void;
  onToggleModel: (pid: string, mid: string) => void;
  onAddModel: (pid: string, mdl: UnifiedModel) => void;
  onUpdateModel: (pid: string, mid: string, u: Partial<UnifiedModel>) => void;
  onRemoveModel: (pid: string, mid: string) => void;
}

const ProvidersTab: React.FC<ProvidersTabProps> = ({
  providers, stats, onToggleProvider, onUpdateProvider, onRemoveProvider, onAddProvider,
  onToggleModel, onAddModel, onUpdateModel, onRemoveModel,
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(providers[0]?.id ?? null);
  const [addingProvider, setAddingProvider] = useState(false);
  const [npLabel, setNpLabel] = useState('');
  const [npType, setNpType] = useState<'openai-compat' | 'anthropic'>('openai-compat');
  const [npBaseUrl, setNpBaseUrl] = useState('');
  const [npApiKey, setNpApiKey] = useState('');

  const selected = providers.find(p => p.id === selectedId) ?? null;

  const submitProvider = () => {
    if (!npLabel.trim() || !npBaseUrl.trim()) return;
    onAddProvider(npLabel.trim(), npType, npBaseUrl.trim(), npApiKey.trim());
    setAddingProvider(false); setNpLabel(''); setNpBaseUrl(''); setNpApiKey('');
    setTimeout(() => setSelectedId(providers[providers.length - 1]?.id ?? null), 80);
  };

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left list */}
      <div className="w-64 border-r border-slate-200 bg-white flex flex-col shrink-0">
        {/* Summary bar */}
        <div className="px-4 py-2.5 border-b border-slate-100 bg-slate-50 flex items-center gap-4 text-xs">
          <span className="flex items-center gap-1.5 text-slate-500 font-semibold"><Layers size={11} />{stats.providers} 供应商</span>
          <span className="flex items-center gap-1.5 text-purple-600 font-semibold"><Database size={11} />{stats.llm} LLM</span>
          <span className="flex items-center gap-1.5 text-blue-600 font-semibold"><Zap size={11} />{stats.ocr} OCR</span>
        </div>

        <div className="flex-1 overflow-y-auto">
          {providers.map(p => {
            const llms = p.models.filter(m => m.enabled && m.capabilities === 'llm');
            const ocrs = p.models.filter(m => m.enabled && m.capabilities === 'ocr');
            const isActive = selectedId === p.id && !addingProvider;
            return (
              <button key={p.id} onClick={() => { setSelectedId(p.id); setAddingProvider(false); }}
                className={`w-full text-left px-3 py-3 border-l-2 transition-all ${isActive ? 'bg-indigo-50/80 border-indigo-500' : 'border-transparent hover:bg-slate-50 hover:border-slate-200'}`}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${p.enabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className={`text-sm font-bold truncate flex-1 ${isActive ? 'text-indigo-800' : p.enabled ? 'text-slate-800' : 'text-slate-400'}`}>{p.label}</span>
                  <span className="text-[9px] text-slate-300 font-medium shrink-0">{p.type === 'anthropic' ? 'ANT' : 'OAI'}</span>
                </div>
                {p.enabled && (llms.length > 0 || ocrs.length > 0) ? (
                  <div className="pl-3 space-y-1">
                    {llms.map(m => <ModelBadge key={m.id} model={m} type="llm" />)}
                    {ocrs.map(m => <ModelBadge key={m.id} model={m} type="ocr" />)}
                  </div>
                ) : (
                  <p className="text-[11px] text-slate-300 pl-3">{p.enabled ? '暂无端点' : '已停用'}</p>
                )}
              </button>
            );
          })}
        </div>

        <div className="p-3 border-t border-slate-100">
          <button onClick={() => { setAddingProvider(true); setSelectedId(null); }}
            className="flex items-center justify-center gap-1.5 w-full py-2 text-sm font-medium text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors">
            <Plus size={13} />新增供应商
          </button>
        </div>
      </div>

      {/* Right detail */}
      <div className="flex-1 overflow-y-auto bg-slate-50/60 min-w-0">
        <div className="max-w-2xl px-7 py-6">
          {addingProvider ? (
            <AddProviderForm {...{ npLabel, setNpLabel, npType, setNpType, npBaseUrl, setNpBaseUrl, npApiKey, setNpApiKey }}
              onSubmit={submitProvider} onCancel={() => { setAddingProvider(false); setSelectedId(providers[0]?.id ?? null); }} />
          ) : selected ? (
            <ProviderDetail
              key={selected.id} provider={selected}
              onToggle={() => onToggleProvider(selected.id)}
              onUpdateField={u => onUpdateProvider(selected.id, u)}
              onRemove={() => { onRemoveProvider(selected.id); setSelectedId(providers.find(p => p.id !== selected.id)?.id ?? null); }}
              onToggleModel={mid => onToggleModel(selected.id, mid)}
              onAddModel={mdl => onAddModel(selected.id, mdl)}
              onUpdateModel={(mid, u) => onUpdateModel(selected.id, mid, u)}
              onRemoveModel={mid => onRemoveModel(selected.id, mid)}
            />
          ) : (
            <div className="h-40 flex items-center justify-center text-slate-300 text-sm">从左侧选择供应商</div>
          )}
        </div>
      </div>
    </div>
  );
};

// Mini badge shown in left sidebar
const ModelBadge: React.FC<{ model: UnifiedModel; type: 'llm' | 'ocr' }> = ({ model, type }) => (
  <div className="flex items-center gap-1.5">
    <span className={`w-1 h-1 rounded-full shrink-0 ${type === 'llm' ? 'bg-purple-400' : 'bg-blue-400'}`} />
    <span className={`text-[11px] font-medium truncate ${type === 'llm' ? 'text-purple-700' : 'text-blue-700'}`}>{model.label}</span>
    {model.thinking && <Brain size={9} className="text-purple-400 shrink-0" />}
    {model.tools && <Wrench size={9} className="text-slate-400 shrink-0" />}
    {model.vision && <EyeIcon size={9} className="text-teal-400 shrink-0" />}
    <span className={`text-[9px] shrink-0 ${type === 'llm' ? 'text-purple-400' : 'text-blue-400'}`}>{type.toUpperCase()}</span>
  </div>
);

// ── AddProviderForm ──────────────────────────────────────────────────────────
const AddProviderForm: React.FC<{
  npLabel: string; setNpLabel: (v: string) => void;
  npType: 'openai-compat' | 'anthropic'; setNpType: (v: 'openai-compat' | 'anthropic') => void;
  npBaseUrl: string; setNpBaseUrl: (v: string) => void;
  npApiKey: string; setNpApiKey: (v: string) => void;
  onSubmit: () => void; onCancel: () => void;
}> = ({ npLabel, setNpLabel, npType, setNpType, npBaseUrl, setNpBaseUrl, npApiKey, setNpApiKey, onSubmit, onCancel }) => (
  <div className="bg-white rounded-2xl border border-indigo-200 p-6 animate-in fade-in duration-200">
    <h3 className="text-base font-bold text-slate-800 mb-5">引入新供应商</h3>
    <div className="grid grid-cols-2 gap-4 mb-4">
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">名称</label>
        <input autoFocus type="text" value={npLabel} onChange={e => setNpLabel(e.target.value)} placeholder="如: DeepSeek 官方"
          className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30" />
      </div>
      <div>
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">网关类型</label>
        <select value={npType} onChange={e => setNpType(e.target.value as any)}
          className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white">
          <option value="openai-compat">OpenAI Compatible</option>
          <option value="anthropic">Anthropic</option>
        </select>
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">Base URL</label>
        <input type="text" value={npBaseUrl} onChange={e => setNpBaseUrl(e.target.value)} placeholder="https://api.example.com/v1"
          className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
      </div>
      <div className="col-span-2">
        <label className="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
        <input type="password" value={npApiKey} onChange={e => setNpApiKey(e.target.value)} placeholder="sk-..."
          className="w-full text-sm px-3 py-2.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
      </div>
    </div>
    <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
      <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
      <button onClick={onSubmit} disabled={!npLabel.trim() || !npBaseUrl.trim()}
        className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">确认引入</button>
    </div>
  </div>
);

// ── ProviderDetail ───────────────────────────────────────────────────────────
const ProviderDetail: React.FC<{
  provider: UnifiedProvider;
  onToggle: () => void;
  onUpdateField: (u: Partial<UnifiedProvider>) => void;
  onRemove: () => void;
  onToggleModel: (mid: string) => void;
  onAddModel: (mdl: UnifiedModel) => void;
  onUpdateModel: (mid: string, u: Partial<UnifiedModel>) => void;
  onRemoveModel: (mid: string) => void;
}> = ({ provider, onToggle, onUpdateField, onRemove, onToggleModel, onAddModel, onUpdateModel, onRemoveModel }) => {
  const [showKey, setShowKey] = useState(false);
  const [addingModel, setAddingModel] = useState(false);
  const [newId, setNewId] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [newCap, setNewCap] = useState<ModelCapability>('llm');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [expandedModelId, setExpandedModelId] = useState<string | null>(null);

  const submitModel = () => {
    if (!newId.trim()) return;
    const mdl: UnifiedModel = {
      id: newId.trim(), label: newLabel.trim() || newId.trim(),
      capabilities: newCap, enabled: true,
      vision: false, tools: false, thinking: false,
      maxOutputTokens: 8192, contextWindow: 128000,
    };
    onAddModel(mdl);
    setAddingModel(false); setNewId(''); setNewLabel(''); setNewCap('llm');
    setExpandedModelId(mdl.id);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-150 pb-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div onClick={onToggle}
          className={`w-5 h-5 rounded border-2 flex items-center justify-center cursor-pointer shrink-0 transition-all ${
            provider.enabled ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 hover:border-indigo-400'
          }`}>
          {provider.enabled && <CheckCircle2 size={13} strokeWidth={3} className="text-white" />}
        </div>
        {/* Editable provider name */}
        <input
          type="text"
          value={provider.label}
          onChange={e => onUpdateField({ label: e.target.value })}
          className="flex-1 text-base font-bold text-slate-800 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-indigo-400 focus:outline-none px-1 py-0.5 transition-all min-w-0 rounded"
          placeholder="供应商名称"
        />
        <button onClick={() => setDeleteConfirm(true)} disabled={provider.isDefault}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all disabled:opacity-20 disabled:cursor-not-allowed shrink-0">
          <Trash2 size={12} />删除
        </button>
      </div>

      {/* Credentials */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
          <Settings size={11} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">连接凭据</span>
        </div>
        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">Base URL</label>
            <input type="text" value={provider.baseUrl} onChange={e => onUpdateField({ baseUrl: e.target.value })}
              placeholder="https://api.example.com/v1"
              className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1.5">API Key</label>
            <div className="relative">
              <Key size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type={showKey ? 'text' : 'password'} value={provider.apiKey}
                onChange={e => onUpdateField({ apiKey: e.target.value })}
                className="w-full pl-8 pr-8 py-2 text-sm rounded-lg border border-slate-200 bg-white font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                placeholder="sk-..." />
              <button onClick={() => setShowKey(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                {showKey ? <EyeOff size={13} /> : <Eye size={13} />}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Models — accordion */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5">
          <Database size={11} className="text-slate-400" />
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">模型列表</span>
          <span className="ml-auto text-[10px] text-slate-400">
            {provider.models.filter(m => m.enabled).length} 已启用 / {provider.models.length} 总计
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {provider.models.map(model => (
            <ModelAccordionRow
              key={model.id}
              model={model}
              expanded={expandedModelId === model.id}
              onToggleExpand={() => setExpandedModelId(prev => prev === model.id ? null : model.id)}
              onToggle={() => onToggleModel(model.id)}
              onUpdate={u => onUpdateModel(model.id, u)}
              onRemove={() => onRemoveModel(model.id)}
              readonly={provider.isDefault}
            />
          ))}

          {/* Add model form */}
          {addingModel ? (
            <div className="p-3 bg-indigo-50/60 border-t border-indigo-100 space-y-3">
              <div className="grid grid-cols-[1fr_120px_60px] gap-2">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">Model ID</label>
                  <input autoFocus type="text" value={newId} onChange={e => setNewId(e.target.value)} placeholder="如: deepseek-chat"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white font-mono focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">显示名称</label>
                  <input type="text" value={newLabel} onChange={e => setNewLabel(e.target.value)} placeholder="DeepSeek Chat"
                    className="w-full text-xs px-2.5 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/30" />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 mb-1">类型</label>
                  <select value={newCap} onChange={e => setNewCap(e.target.value as ModelCapability)}
                    className="w-full text-xs px-2 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-indigo-500/30">
                    <option value="llm">LLM</option>
                    <option value="ocr">OCR</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button onClick={() => { setAddingModel(false); setNewId(''); setNewLabel(''); }} className="px-3 py-1.5 text-xs text-slate-500 hover:bg-slate-100 rounded-lg">取消</button>
                <button onClick={submitModel} disabled={!newId.trim()} className="px-4 py-1.5 text-xs font-bold text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">添加模型</button>
              </div>
            </div>
          ) : (
            <div className="p-2">
              <button onClick={() => setAddingModel(true)}
                className="flex w-full items-center justify-center gap-1.5 py-2 text-xs font-medium text-indigo-600 hover:bg-indigo-50 border border-dashed border-slate-200 hover:border-indigo-300 rounded-lg transition-all">
                <Plus size={12} />注册模型 ID
              </button>
            </div>
          )}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in zoom-in-95 duration-200">
            <div className="w-9 h-9 rounded-full bg-red-100 flex items-center justify-center text-red-500 mb-4"><Trash2 size={18} /></div>
            <h3 className="text-base font-bold text-slate-900 mb-1.5">删除「{provider.label}」？</h3>
            <p className="text-slate-500 text-sm mb-5">此操作不可还原，依赖此凭据的任务将失败。</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50">取消</button>
              <button onClick={() => { onRemove(); setDeleteConfirm(false); }} className="px-4 py-2 text-sm font-bold text-white bg-red-600 rounded-lg hover:bg-red-700">确认删除</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── ModelAccordionRow ────────────────────────────────────────────────────────
const ModelAccordionRow: React.FC<{
  model: UnifiedModel;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggle: () => void;
  onUpdate: (u: Partial<UnifiedModel>) => void;
  onRemove: () => void;
  readonly: boolean;
}> = ({ model, expanded, onToggleExpand, onToggle, onUpdate, onRemove, readonly }) => {
  return (
    <div className={`transition-colors ${expanded ? 'bg-slate-50/80' : ''}`}>
      {/* Summary row */}
      <div className="flex items-center gap-2 px-3 py-2.5 group">
        <input type="checkbox" checked={model.enabled} onChange={onToggle}
          className="w-3.5 h-3.5 text-indigo-600 border-slate-300 rounded cursor-pointer shrink-0" />

        {/* Model ID — editable inline */}
        <input
          type="text"
          value={model.id}
          onChange={e => !readonly && onUpdate({ id: e.target.value })}
          readOnly={readonly}
          className={`text-xs font-mono text-slate-700 bg-transparent border-b border-transparent min-w-0 flex-1 focus:outline-none transition-all ${
            readonly ? 'cursor-default' : 'hover:border-slate-200 focus:border-indigo-400 cursor-text'
          }`}
          title="Model ID"
        />

        {/* Display name — editable inline */}
        <input
          type="text"
          value={model.label}
          onChange={e => !readonly && onUpdate({ label: e.target.value })}
          readOnly={readonly}
          className={`text-xs font-medium text-slate-600 bg-transparent border-b border-transparent w-28 focus:outline-none transition-all ${
            readonly ? 'cursor-default' : 'hover:border-slate-200 focus:border-indigo-400 cursor-text'
          }`}
          title="显示名称"
        />

        {/* Capability badges */}
        <div className="flex items-center gap-1 shrink-0">
          <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${model.capabilities === 'llm' ? 'bg-purple-50 text-purple-600' : 'bg-blue-50 text-blue-600'}`}>
            {model.capabilities.toUpperCase()}
          </span>
          {model.thinking && <span title="思考模式" className="text-[9px] px-1 py-0.5 bg-orange-50 text-orange-500 rounded font-bold border border-orange-100">T</span>}
          {model.tools && <span title="工具调用" className="text-[9px] px-1 py-0.5 bg-teal-50 text-teal-600 rounded font-bold border border-teal-100">F</span>}
          {model.vision && <span title="视觉处理" className="text-[9px] px-1 py-0.5 bg-sky-50 text-sky-600 rounded font-bold border border-sky-100">V</span>}
        </div>

        {/* Controls */}
        {!readonly && (
          <button onClick={onRemove} className="opacity-0 group-hover:opacity-100 p-0.5 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0">
            <Trash2 size={12} />
          </button>
        )}
        <button onClick={onToggleExpand} className="p-0.5 text-slate-400 hover:text-indigo-600 transition-colors shrink-0">
          {expanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        </button>
      </div>

      {/* Expanded capabilities panel */}
      {expanded && (
        <div className="px-4 pb-4 pt-1 space-y-4 border-t border-slate-100 animate-in slide-in-from-top-1 duration-150">
          <p className="text-[11px] text-slate-400 font-semibold uppercase tracking-wider pt-1">模型能力配置</p>
          <div className="grid grid-cols-3 gap-2">
            <Toggle value={!!model.thinking} onChange={v => onUpdate({ thinking: v })}
              label="深度思考" hint="Extended Thinking" icon={<Brain size={13} />} />
            <Toggle value={!!model.tools} onChange={v => onUpdate({ tools: v })}
              label="工具调用" hint="Function Calling" icon={<Wrench size={13} />} />
            <Toggle value={!!model.vision} onChange={v => onUpdate({ vision: v })}
              label="视觉处理" hint="Vision Input" icon={<EyeIcon size={13} />} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                最大输出 Tokens
                <span className="ml-2 font-mono text-indigo-500 normal-case">{(model.maxOutputTokens ?? 8192).toLocaleString()}</span>
              </label>
              <input type="number" min={256} max={128000} step={256} value={model.maxOutputTokens ?? 8192}
                onChange={e => onUpdate({ maxOutputTokens: parseInt(e.target.value) || 8192 })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
              <p className="text-[10px] text-slate-400 mt-1">推荐: 普通 4096–8192 · 思考模型 32768–64000</p>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                上下文窗口
                <span className="ml-2 font-mono text-indigo-500 normal-case">{((model.contextWindow ?? 128000) / 1000).toFixed(0)}K</span>
              </label>
              <input type="number" min={4096} max={2000000} step={4096} value={model.contextWindow ?? 128000}
                onChange={e => onUpdate({ contextWindow: parseInt(e.target.value) || 128000 })}
                className="w-full text-xs px-3 py-2 border border-slate-200 rounded-lg bg-white focus:ring-2 focus:ring-indigo-500/30 font-mono" />
              <p className="text-[10px] text-slate-400 mt-1">如: 128000 = 128K · 1000000 = 1M</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ── RestoreTab ───────────────────────────────────────────────────────────────
interface RestoreTabProps {
  restoreMode: RestoreMode; restoreFormat: RestoreFormat;
  restoreSystemPrompt: string; restorePrompt: string; restoreLlmModelId: string;
  restoreTemperature: number; restoreMaxTokens: number; restoreTopP: number;
  restoreTimeout: number; restoreEnableThinking: boolean;
  providers: UnifiedProvider[];
  onSetMode: (m: RestoreMode) => void; onSetFormat: (f: RestoreFormat) => void;
  onSetSystemPrompt: (s: string) => void; onSetPrompt: (s: string) => void;
  onSetLlmModel: (id: string) => void; onSetTemperature: (v: number) => void;
  onSetMaxTokens: (v: number) => void; onSetTopP: (v: number) => void;
  onSetTimeout: (v: number) => void; onSetEnableThinking: (v: boolean) => void;
  onBlurPersist: () => void;
}

const RestoreTab: React.FC<RestoreTabProps> = ({
  restoreMode, restoreFormat, restoreSystemPrompt, restorePrompt,
  restoreLlmModelId, restoreTemperature, restoreMaxTokens, restoreTopP,
  restoreTimeout, restoreEnableThinking, providers,
  onSetMode, onSetFormat, onSetSystemPrompt, onSetPrompt, onSetLlmModel,
  onSetTemperature, onSetMaxTokens, onSetTopP, onSetTimeout, onSetEnableThinking,
  onBlurPersist,
}) => {
  const llmModels = useMemo(() =>
    providers.filter(p => p.enabled).flatMap(p =>
      p.models.filter(m => m.enabled && m.capabilities === 'llm')
        .map(m => ({ fullId: `${p.id}::${m.id}`, label: `[${p.label}] ${m.label}` }))
    ), [providers]);

  useEffect(() => {
    if (llmModels.length > 0 && !llmModels.find(m => m.fullId === restoreLlmModelId)) {
      onSetLlmModel(llmModels[0].fullId);
    }
  }, [llmModels, restoreLlmModelId, onSetLlmModel]);

  return (
    <div className="space-y-5 pb-12 max-w-3xl">
      <div>
        <h3 className="text-lg font-bold text-slate-800">OCR 内容还原配置</h3>
        <p className="text-slate-400 text-xs mt-1">控制 OCR 识别文本如何被下游处理和渲染。所有更改自动保存。</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {([
          { mode: 'default' as RestoreMode, icon: <FileBox size={16} />, title: '规则引擎渲染', desc: '本地解析，0 Token，即时成型', color: 'indigo' },
          { mode: 'prompt' as RestoreMode, icon: <Wand2 size={16} />, title: 'AI 大模型重构', desc: 'LLM 深度理解，智能修复版面', color: 'purple' },
        ]).map(opt => {
          const active = restoreMode === opt.mode;
          const C = opt.color === 'indigo'
            ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
            : 'border-purple-500 bg-purple-50 text-purple-700';
          return (
            <button key={opt.mode} onClick={() => onSetMode(opt.mode)}
              className={`text-left p-4 rounded-xl border-2 transition-all ${active ? C : 'border-slate-200 bg-white hover:border-slate-300'}`}>
              <div className="flex justify-between items-start mb-2">
                <span className={active ? '' : 'text-slate-400'}>{opt.icon}</span>
                <div className={`w-3.5 h-3.5 rounded-full border-2 flex items-center justify-center ${active ? (opt.color === 'indigo' ? 'border-indigo-500' : 'border-purple-500') : 'border-slate-300'}`}>
                  {active && <div className={`w-2 h-2 rounded-full ${opt.color === 'indigo' ? 'bg-indigo-500' : 'bg-purple-500'}`} />}
                </div>
              </div>
              <p className={`text-sm font-bold ${active ? '' : 'text-slate-700'}`}>{opt.title}</p>
              <p className="text-xs text-slate-500 mt-0.5">{opt.desc}</p>
            </button>
          );
        })}
      </div>

      {restoreMode === 'default' && (
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-3">输出格式</label>
          <div className="flex gap-2 flex-wrap">
            {(['auto', 'md', 'html', 'json'] as RestoreFormat[]).map(fmt => (
              <button key={fmt} onClick={() => onSetFormat(fmt)}
                className={`px-4 py-1.5 text-sm font-bold rounded-lg border transition-all ${restoreFormat === fmt ? 'bg-indigo-600 border-indigo-600 text-white' : 'bg-white border-slate-200 text-slate-600 hover:border-indigo-300'}`}>
                {fmt.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
      )}

      {restoreMode === 'prompt' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">① 模型与参数</span>
            </div>
            <div className="p-4 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1.5">执行模型</label>
                <select value={restoreLlmModelId} onChange={e => onSetLlmModel(e.target.value)}
                  className="w-full text-sm px-3 py-2 rounded-lg border border-slate-200 bg-white focus:ring-2 focus:ring-purple-500/30 font-medium">
                  {llmModels.length === 0 && <option value="">暂无可用 LLM — 请先在供应商中启用</option>}
                  {llmModels.map(m => <option key={m.fullId} value={m.fullId}>{m.label}</option>)}
                </select>
              </div>
              <div className="flex items-center justify-between py-3 px-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2.5">
                  <Brain size={16} className={restoreEnableThinking ? 'text-purple-600' : 'text-slate-400'} />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">思考模式 (Extended Thinking)</p>
                    <p className="text-[11px] text-slate-400">仅支持 Claude 3.7、Qwen3 等模型</p>
                  </div>
                </div>
                <button onClick={() => onSetEnableThinking(!restoreEnableThinking)}
                  className={`relative w-10 h-5 rounded-full transition-colors ${restoreEnableThinking ? 'bg-purple-600' : 'bg-slate-200'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${restoreEnableThinking ? 'left-5' : 'left-0.5'}`} />
                </button>
              </div>
              <div className="grid grid-cols-2 gap-5">
                <LabeledSlider label="Temperature" value={restoreTemperature} min={0} max={2} step={0.05}
                  onChange={onSetTemperature} format={v => v.toFixed(2)} left="确定性" right="发散" />
                <LabeledSlider label="Top-P" value={restoreTopP} min={0} max={1} step={0.01}
                  onChange={onSetTopP} format={v => v.toFixed(2)} />
                <div>
                  <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    Max Tokens<span className="text-purple-600 font-mono normal-case">{restoreMaxTokens.toLocaleString()}</span>
                  </label>
                  <input type="number" min={256} max={128000} step={256} value={restoreMaxTokens}
                    onChange={e => onSetMaxTokens(parseInt(e.target.value) || 4096)} onBlur={onBlurPersist}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/30 font-mono" />
                </div>
                <div>
                  <label className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                    超时 (秒)<span className="text-purple-600 font-mono normal-case">{restoreTimeout}s</span>
                  </label>
                  <input type="number" min={10} max={300} step={5} value={restoreTimeout}
                    onChange={e => onSetTimeout(parseInt(e.target.value) || 60)} onBlur={onBlurPersist}
                    className="w-full text-sm px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-purple-500/30 font-mono" />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-100">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">② Prompt 模板</span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                可用变量：
                <code className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 font-mono">{`{{ocr_text}}`}</code>
                <code className="px-1.5 py-0.5 bg-purple-50 text-purple-600 rounded border border-purple-100 font-mono">{`{{source_image}}`}</code>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">System Prompt</label>
                <textarea value={restoreSystemPrompt} onChange={e => onSetSystemPrompt(e.target.value)}
                  onBlur={onBlurPersist} rows={4} placeholder="你是一位专业的文档重排版助手…"
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono leading-relaxed resize-y placeholder-slate-300 transition-all" />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">User Prompt</label>
                <textarea value={restorePrompt} onChange={e => onSetPrompt(e.target.value)}
                  onBlur={onBlurPersist} rows={7} placeholder={`请重排以下 OCR 识别文本，恢复版面结构：\n\n{{ocr_text}}`}
                  className="w-full text-sm p-3 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500/30 font-mono leading-relaxed resize-y placeholder-slate-300 transition-all" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsView;
