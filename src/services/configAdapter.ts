import { RestoreFormat, RestoreMode } from '../types';

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
  try {
    const stored = localStorage.getItem(RESTORE_SETTINGS_STORAGE_KEY);
    if (!stored) {
      return { mode: 'default', format: 'auto' };
    }

    const parsed = JSON.parse(stored) as Partial<DefaultRestoreSettings>;
    return {
      mode: parsed.mode === 'prompt' ? 'prompt' : 'default',
      format:
        parsed.format === 'json' ||
        parsed.format === 'html' ||
        parsed.format === 'md' ||
        parsed.format === 'auto'
          ? parsed.format
          : 'auto',
    };
  } catch {
    return { mode: 'default', format: 'auto' };
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
