// ============================================================
// Unified type definitions for Model Evaluation Workbench
// ============================================================

// --- Processing Status ---
export type ProcessingStatus = 'pending' | 'queued' | 'running' | 'done' | 'error';

// --- Restore/Preview modes (legacy compat) ---
export type RestoreMode = 'default' | 'prompt';
export type RestoreFormat = 'auto' | 'json' | 'html' | 'md';

// --- App Mode ---
export type AppMode = 'ocr' | 'prompt';

// --- View Mode ---
export type ViewMode = 'comparison' | 'detail';

// --- Page Data (OCR result per page) ---
export interface PageData {
  rawOCR: string;
  restored: string | null;
  restoredVariants?: {
    json?: string;
    html?: string;
    md?: string;
  };
  promptRestoredVariants?: {
    json?: string;
    html?: string;
    md?: string;
  };
  status: 'pending' | 'ocr_success' | 'restoring' | 'complete' | 'error';
  verificationResult?: {
    hasTable: boolean;
    reason?: string;
    modelReasoning?: string;
  };
  errorMessage?: string;
}

// --- Source File ---
export interface SourceFile {
  id: string;
  name: string;
  sizeLabel: string;
  lastModified: number;
  originalFile: File;
  pdfUrl?: string;
  pageRange: string;
  pageMap: number[];
}

// --- Unified Task ---
export interface Task {
  id: string;
  type: 'ocr' | 'prompt';
  groupId: string;          // sourceFileId for OCR, promptGroupId for Prompt

  // Provider info
  providerId: string;
  providerLabel: string;
  modelId: string;
  modelLabel: string;

  // Status
  status: ProcessingStatus;
  statusMessage?: string;
  error?: string;
  startedAt?: number;
  completedAt?: number;

  // OCR-specific
  sourceFileId?: string;
  fileName?: string;
  pagesData: Record<number, PageData>;

  // Prompt-specific
  systemPrompt?: string;
  userPrompt?: string;
  response?: string;
  tokenUsage?: { prompt: number; completion: number };
  temperature?: number;
  maxTokens?: number;
}

// --- Provider Config ---
export type OcrProviderId = 'ucloud' | 'siliconflow' | 'bigmodel';
export type OcrProviderLabel = 'UCloud' | 'SiliconFlow' | 'BigModel';

export interface ProviderConfig {
  id: string;
  label: string;
  type: 'ocr' | 'text';
  baseUrl: string;
  enabled: boolean;
  models: ModelConfig[];
}

export interface ModelConfig {
  id: string;
  label: string;
  enabled: boolean;
  providerId: string;
  providerLabel: string;
}

export interface OcrModelConfig {
  providerId: OcrProviderId;
  providerLabel: OcrProviderLabel;
  modelId: string;
  modelLabel: string;
}

export interface OcrProviderConfig {
  id: OcrProviderId;
  label: OcrProviderLabel;
}

export interface DefaultRestoreSettings {
  mode: RestoreMode;
  format: RestoreFormat;
}

// --- Text Model Config (for Prompt Playground) ---
export interface TextProviderConfig {
  id: string;
  label: string;
  type: 'openai-compat' | 'anthropic';
  baseUrl: string;
  apiKey: string;
  enabled: boolean;
  models: TextModelConfig[];
}

export interface TextModelConfig {
  id: string;
  label: string;
  enabled: boolean;
}

// --- Upload Config ---
export interface UploadConfigItem {
  id: string;
  file: File;
  rangeMode: 'all' | 'custom';
  customPages: string;
}

// --- Prompt Group ---
export interface PromptGroup {
  id: string;
  label: string;
  systemPrompt: string;
  userPrompt: string;
  createdAt: number;
}

// --- Chat Message (for future use) ---
export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  isThinking?: boolean;
}
