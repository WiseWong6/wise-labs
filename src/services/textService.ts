import { getApiKey } from './configAdapter';
import { getTextProviderConfigs } from './configAdapter';

interface TextModelResult {
  content: string;
  tokenUsage?: { prompt: number; completion: number };
}

/**
 * Call a text model (OpenAI-compatible or Anthropic) for Prompt Playground.
 */
export async function callTextModel(
  providerId: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number }
): Promise<TextModelResult> {
  const configs = getTextProviderConfigs();
  const providerConfig = configs.find(c => c.id === providerId);

  if (!providerConfig) {
    // Fallback: try using SiliconFlow OCR key for siliconflow-text
    if (providerId === 'siliconflow-text') {
      const apiKey = getApiKey('siliconflow');
      if (!apiKey) throw new Error('未配置 SiliconFlow API Key');
      return callOpenAICompat(
        'https://api.siliconflow.cn/v1',
        apiKey,
        modelId,
        systemPrompt,
        userPrompt,
        signal,
        options
      );
    }
    throw new Error(`未找到供应商配置: ${providerId}`);
  }

  if (!providerConfig.apiKey) {
    throw new Error(`未配置 ${providerConfig.label} API Key`);
  }

  if (providerConfig.type === 'anthropic') {
    return callAnthropic(
      providerConfig.baseUrl,
      providerConfig.apiKey,
      modelId,
      systemPrompt,
      userPrompt,
      signal,
      options
    );
  }

  return callOpenAICompat(
    providerConfig.baseUrl,
    providerConfig.apiKey,
    modelId,
    systemPrompt,
    userPrompt,
    signal,
    options
  );
}

async function callOpenAICompat(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number }
): Promise<TextModelResult> {
  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt.trim()) {
    messages.push({ role: 'system', content: systemPrompt });
  }
  messages.push({ role: 'user', content: userPrompt });

  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: modelId,
      messages,
      stream: false,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
    }),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `API Error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content || '';
  const usage = data.usage;

  return {
    content,
    tokenUsage: usage
      ? { prompt: usage.prompt_tokens || 0, completion: usage.completion_tokens || 0 }
      : undefined,
  };
}

async function callAnthropic(
  baseUrl: string,
  apiKey: string,
  modelId: string,
  systemPrompt: string,
  userPrompt: string,
  signal?: AbortSignal,
  options?: { temperature?: number; maxTokens?: number }
): Promise<TextModelResult> {
  const body: any = {
    model: modelId,
    max_tokens: options?.maxTokens ?? 4096,
    temperature: options?.temperature ?? 0.7,
    messages: [{ role: 'user', content: userPrompt }],
  };
  if (systemPrompt.trim()) {
    body.system = systemPrompt;
  }

  const response = await fetch(`${baseUrl}/v1/messages`, {
    method: 'POST',
    headers: {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify(body),
    signal,
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err?.error?.message || `Anthropic API Error: ${response.status}`);
  }

  const data = await response.json();
  const textBlock = data.content?.find((b: any) => b.type === 'text');
  const content = textBlock?.text || '';
  const usage = data.usage;

  return {
    content,
    tokenUsage: usage
      ? { prompt: usage.input_tokens || 0, completion: usage.output_tokens || 0 }
      : undefined,
  };
}
