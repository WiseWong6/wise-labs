import { RestoreFormat, RestoreMode, UnifiedProvider, UnifiedModel, ModelCapability } from '../types';

export type OcrProviderId = 'ucloud' | 'siliconflow' | 'bigmodel';
export type OcrProviderLabel = 'UCloud' | 'SiliconFlow' | 'BigModel';

const API_KEY_STORAGE_KEYS: Record<OcrProviderId, string> = {
  ucloud: 'UCLOUD_API_KEY',
  siliconflow: 'SILICONFLOW_API_KEY',
  bigmodel: 'BIGMODEL_API_KEY',
};
const ENABLED_MODELS_STORAGE_KEYS: Record<OcrProviderId, string> = {
  ucloud: 'DOCURENDER_ENABLED_OCR_MODELS_ucloud_V1',
  siliconflow: 'DOCURENDER_ENABLED_OCR_MODELS_siliconflow_V1',
  bigmodel: 'DOCURENDER_ENABLED_OCR_MODELS_bigmodel_V1',
};
const ENABLED_PROVIDERS_STORAGE_KEY = 'DOCURENDER_ENABLED_PROVIDERS_V1';
const DEFAULT_PROVIDER_STORAGE_KEY = 'DOCURENDER_DEFAULT_PROVIDER_V1';
const RESTORE_SETTINGS_STORAGE_KEY = 'DOCURENDER_RESTORE_SETTINGS_V1';

export interface OcrModelConfig {
  providerId: OcrProviderId;
  providerLabel: OcrProviderLabel;
  modelId: 'deepseek-ai/DeepSeek-OCR-2' | 'deepseek-ai/DeepSeek-OCR' | 'PaddlePaddle/PaddleOCR-VL-1.5' | 'glm-ocr';
  modelLabel: 'DeepSeek-OCR-2' | 'DeepSeek-OCR' | 'PaddleOCR-VL-1.5' | 'GLM-OCR';
}

export interface OcrProviderConfig {
  id: OcrProviderId;
  label: OcrProviderLabel;
}

export interface DefaultRestoreSettings {
  mode: RestoreMode;
  format: RestoreFormat;
  systemPrompt?: string;
  prompt?: string;
  llmModelId?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  timeout?: number;
  enableThinking?: boolean;
}

const AVAILABLE_PROVIDERS: OcrProviderConfig[] = [
  { id: 'ucloud', label: 'UCloud' },
  { id: 'siliconflow', label: 'SiliconFlow' },
  { id: 'bigmodel', label: 'BigModel' },
];

const AVAILABLE_OCR_MODELS: OcrModelConfig[] = [
  {
    providerId: 'ucloud',
    providerLabel: 'UCloud',
    modelId: 'deepseek-ai/DeepSeek-OCR-2',
    modelLabel: 'DeepSeek-OCR-2',
  },
  {
    providerId: 'siliconflow',
    providerLabel: 'SiliconFlow',
    modelId: 'deepseek-ai/DeepSeek-OCR',
    modelLabel: 'DeepSeek-OCR',
  },
  {
    providerId: 'siliconflow',
    providerLabel: 'SiliconFlow',
    modelId: 'PaddlePaddle/PaddleOCR-VL-1.5',
    modelLabel: 'PaddleOCR-VL-1.5',
  },
  {
    providerId: 'bigmodel',
    providerLabel: 'BigModel',
    modelId: 'glm-ocr',
    modelLabel: 'GLM-OCR',
  },
];

const isValidProviderId = (providerId: string | null): providerId is OcrProviderId => {
  return providerId === 'ucloud' || providerId === 'siliconflow' || providerId === 'bigmodel';
};

const getModelsByProvider = (providerId: OcrProviderId): OcrModelConfig[] => {
  return AVAILABLE_OCR_MODELS.filter(model => model.providerId === providerId);
};

const normalizeEnabledModelIds = (
  providerId: OcrProviderId,
  modelIds: OcrModelConfig['modelId'][]
): OcrModelConfig['modelId'][] => {
  const availableIds = new Set(getModelsByProvider(providerId).map(model => model.modelId));
  return modelIds.filter((id, index) => availableIds.has(id) && modelIds.indexOf(id) === index);
};

export const getAvailableProviders = (): OcrProviderConfig[] => {
  return [...AVAILABLE_PROVIDERS];
};

export const getEnabledProviderIds = (): OcrProviderId[] => {
  const stored = localStorage.getItem(ENABLED_PROVIDERS_STORAGE_KEY);
  if (!stored) {
    return AVAILABLE_PROVIDERS.map(provider => provider.id);
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return AVAILABLE_PROVIDERS.map(provider => provider.id);
    }
    const valid = parsed.filter((providerId, index) => {
      return isValidProviderId(providerId) && parsed.indexOf(providerId) === index;
    }) as OcrProviderId[];
    return valid.length > 0 ? valid : AVAILABLE_PROVIDERS.map(provider => provider.id);
  } catch {
    return AVAILABLE_PROVIDERS.map(provider => provider.id);
  }
};

export const saveEnabledProviderIds = (providerIds: OcrProviderId[]): void => {
  const valid = providerIds.filter((providerId, index) => {
    return isValidProviderId(providerId) && providerIds.indexOf(providerId) === index;
  });
  localStorage.setItem(ENABLED_PROVIDERS_STORAGE_KEY, JSON.stringify(valid));
};

export const getDefaultProviderId = (): OcrProviderId => {
  const enabledProviderIds = getEnabledProviderIds();
  const providerId = localStorage.getItem(DEFAULT_PROVIDER_STORAGE_KEY);
  if (!providerId || !isValidProviderId(providerId)) {
    return enabledProviderIds[0] || 'siliconflow';
  }
  if (!enabledProviderIds.includes(providerId)) {
    return enabledProviderIds[0] || 'siliconflow';
  }
  return providerId;
};

export const saveDefaultProviderId = (providerId: OcrProviderId): void => {
  localStorage.setItem(DEFAULT_PROVIDER_STORAGE_KEY, providerId);
};

export const getApiKey = (providerId: OcrProviderId = 'siliconflow'): string => {
  return localStorage.getItem(API_KEY_STORAGE_KEYS[providerId]) || '';
};

export const saveApiKey = (apiKey: string, providerId: OcrProviderId = 'siliconflow'): void => {
  localStorage.setItem(API_KEY_STORAGE_KEYS[providerId], apiKey.trim());
};

export const getAvailableOcrModels = (providerId?: OcrProviderId): OcrModelConfig[] => {
  if (!providerId) return [...AVAILABLE_OCR_MODELS];
  return getModelsByProvider(providerId);
};

export const getEnabledModelIds = (providerId: OcrProviderId): OcrModelConfig['modelId'][] => {
  const stored = localStorage.getItem(ENABLED_MODELS_STORAGE_KEYS[providerId]);
  if (!stored) {
    return getModelsByProvider(providerId).map(model => model.modelId);
  }

  try {
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) {
      return getModelsByProvider(providerId).map(model => model.modelId);
    }
    return normalizeEnabledModelIds(providerId, parsed as OcrModelConfig['modelId'][]);
  } catch {
    return getModelsByProvider(providerId).map(model => model.modelId);
  }
};

export const saveEnabledModelIds = (
  providerId: OcrProviderId,
  modelIds: OcrModelConfig['modelId'][]
): void => {
  const normalized = normalizeEnabledModelIds(providerId, modelIds);
  localStorage.setItem(ENABLED_MODELS_STORAGE_KEYS[providerId], JSON.stringify(normalized));
};

export const getOpenOcrModels = (providerId: OcrProviderId): OcrModelConfig[] => {
  const enabledIds = new Set(getEnabledModelIds(providerId));
  return getModelsByProvider(providerId).filter(model => enabledIds.has(model.modelId));
};

export const getDefaultOcrModel = (): OcrModelConfig => {
  const providerId = getDefaultProviderId();
  const openModels = getOpenOcrModels(providerId);
  if (openModels.length > 0) {
    return openModels[0];
  }
  const providerModels = getModelsByProvider(providerId);
  if (providerModels.length > 0) {
    return providerModels[0];
  }
  return AVAILABLE_OCR_MODELS[0];
};

export const getDefaultRestoreSettings = (): DefaultRestoreSettings => {
  const defaults: DefaultRestoreSettings = {
    mode: 'default', format: 'auto', systemPrompt: '', prompt: '',
    llmModelId: '', temperature: 0.7, maxTokens: 4096, topP: 1.0, timeout: 60, enableThinking: false,
  };
  try {
    const stored = localStorage.getItem(RESTORE_SETTINGS_STORAGE_KEY);
    if (!stored) return defaults;
    const parsed = JSON.parse(stored) as Partial<DefaultRestoreSettings>;
    return {
      mode: parsed.mode === 'prompt' ? 'prompt' : 'default',
      format: (['json','html','md','auto'] as any[]).includes(parsed.format) ? parsed.format! : 'auto',
      systemPrompt: parsed.systemPrompt ?? '',
      prompt: parsed.prompt ?? '',
      llmModelId: parsed.llmModelId ?? '',
      temperature: typeof parsed.temperature === 'number' ? parsed.temperature : 0.7,
      maxTokens: typeof parsed.maxTokens === 'number' ? parsed.maxTokens : 4096,
      topP: typeof parsed.topP === 'number' ? parsed.topP : 1.0,
      timeout: typeof parsed.timeout === 'number' ? parsed.timeout : 60,
      enableThinking: typeof parsed.enableThinking === 'boolean' ? parsed.enableThinking : false,
    };
  } catch {
    return defaults;
  }
};

export const saveDefaultRestoreSettings = (settings: DefaultRestoreSettings): void => {
  localStorage.setItem(RESTORE_SETTINGS_STORAGE_KEY, JSON.stringify(settings));
};

// --- Text Model Provider Config ---
const TEXT_PROVIDERS_STORAGE_KEY = 'WORKBENCH_TEXT_PROVIDERS_V1';

export const getTextProviderConfigs = (): Array<{
  id: string;
  label: string;
  type: 'openai-compat' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: Array<{ id: string; label: string; enabled: boolean }>;
}> => {
  try {
    const stored = localStorage.getItem(TEXT_PROVIDERS_STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
};

export const saveTextProviderConfigs = (configs: Array<{
  id: string;
  label: string;
  type: 'openai-compat' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: Array<{ id: string; label: string; enabled: boolean }>;
}>): void => {
  localStorage.setItem(TEXT_PROVIDERS_STORAGE_KEY, JSON.stringify(configs));
};

// --- Unified Provider Config (合并 OCR + LLM) ---
const UNIFIED_PROVIDERS_STORAGE_KEY = 'WORKBENCH_UNIFIED_PROVIDERS_V1';

// 默认供应商
const DEFAULT_UNIFIED_PROVIDERS: UnifiedProvider[] = [
  {
    id: 'openai',
    label: 'OpenAI',
    type: 'openai-compat',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: '',
    enabled: true,
    isDefault: true,
    models: [
      { id: 'gpt-4o', label: 'GPT-4o', capabilities: 'llm', enabled: true },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini', capabilities: 'llm', enabled: true },
    ],
  },
  {
    id: 'anthropic',
    label: 'Anthropic',
    type: 'anthropic',
    baseUrl: 'https://api.anthropic.com',
    apiKey: '',
    enabled: true,
    isDefault: true,
    models: [
      { id: 'claude-sonnet-4-20250514', label: 'Claude Sonnet 4', capabilities: 'llm', enabled: true },
    ],
  },
  {
    id: 'siliconflow',
    label: 'SiliconFlow',
    type: 'openai-compat',
    baseUrl: 'https://api.siliconflow.cn/v1',
    apiKey: '',
    enabled: false,
    isDefault: false,
    models: [
      { id: 'deepseek-ai/DeepSeek-V3', label: 'DeepSeek-V3', capabilities: 'llm', enabled: false },
      { id: 'Qwen/Qwen3-235B-A22B', label: 'Qwen3-235B', capabilities: 'llm', enabled: false },
      { id: 'deepseek-ai/DeepSeek-OCR', label: 'DeepSeek-OCR', capabilities: 'ocr', enabled: false },
    ],
  },
];

export const getUnifiedProviders = (): UnifiedProvider[] => {
  try {
    const stored = localStorage.getItem(UNIFIED_PROVIDERS_STORAGE_KEY);
    if (!stored) {
      // 尝试从旧数据迁移
      return migrateToUnified();
    }
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      return DEFAULT_UNIFIED_PROVIDERS;
    }
    return parsed;
  } catch {
    return DEFAULT_UNIFIED_PROVIDERS;
  }
};

export const saveUnifiedProviders = (providers: UnifiedProvider[]): void => {
  localStorage.setItem(UNIFIED_PROVIDERS_STORAGE_KEY, JSON.stringify(providers));
};

// 从旧数据迁移到统一格式
function migrateToUnified(): UnifiedProvider[] {
  const providers: UnifiedProvider[] = [...DEFAULT_UNIFIED_PROVIDERS];

  // 读取旧的 LLM 配置
  const oldTextProviders = getTextProviderConfigs();
  for (const old of oldTextProviders) {
    // 跳过默认供应商（已内置）
    if (old.id === 'openai' || old.id === 'anthropic') continue;

    const newProvider: UnifiedProvider = {
      id: old.id,
      label: old.label,
      type: old.type,
      baseUrl: old.baseUrl,
      apiKey: old.apiKey,
      enabled: old.enabled,
      isDefault: false,
      models: old.models.map(m => ({
        id: m.id,
        label: m.label,
        capabilities: 'llm' as ModelCapability,
        enabled: m.enabled,
      })),
    };
    providers.push(newProvider);
  }

  // 读取旧的 OCR 配置，合并到 SiliconFlow
  const enabledOcrProviders = getEnabledProviderIds();
  const siliconflowProvider = providers.find(p => p.id === 'siliconflow');
  if (siliconflowProvider && enabledOcrProviders.includes('siliconflow')) {
    const apiKey = getApiKey('siliconflow');
    if (apiKey) {
      siliconflowProvider.apiKey = apiKey;
      siliconflowProvider.enabled = true;
    }
    const enabledModels = getEnabledModelIds('siliconflow');
    for (const model of siliconflowProvider.models) {
      if (model.capabilities === 'ocr') {
        model.enabled = (enabledModels as string[]).includes(model.id);
      }
    }
  }

  saveUnifiedProviders(providers);
  return providers;
}
