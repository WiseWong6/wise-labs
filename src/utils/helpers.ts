export const escapeHtml = (unsafe: string): string => {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

export const isValidJson = (input: string): boolean => {
  if (!input?.trim()) return false;
  try {
    JSON.parse(input);
    return true;
  } catch {
    return false;
  }
};

export const formatJsonSafe = (input: string): string => {
  if (isValidJson(input)) {
    return JSON.stringify(JSON.parse(input), null, 2);
  }
  return JSON.stringify({ content: input }, null, 2);
};

export const hasLikelyHtml = (input: string): boolean => {
  return /<table|<\/?[a-z][\s\S]*?>/i.test(input || '');
};

export const detectFormatFromContent = (content: string): 'json' | 'html' | 'md' => {
  if (isValidJson(content)) return 'json';
  if (hasLikelyHtml(content)) return 'html';
  return 'md';
};

export const buildDefaultVariants = (
  rawOCR: string,
  restored: string | null
): { json: string; html: string; md: string } => {
  const base = (restored || rawOCR || '').trim();
  const md = base;
  const html = hasLikelyHtml(base) ? base : `<pre>${escapeHtml(base)}</pre>`;
  const json = formatJsonSafe(base);
  return { json, html, md };
};

export const generateId = (prefix = ''): string => {
  return `${prefix}${Math.random().toString(36).slice(2, 10)}`;
};

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
};

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};
