const GANTT_CONTINUATION_RE =
  /^((?:\d{4}-\d{2}(?:-\d{2})?|\d+(?:ms|s|m|h|d|w)|after\s+[\w-]+|until\s+[\w-]+)\b.*)$/i;

export const getMermaidDiagramType = (code) => {
  const firstLine = code
    .trim()
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('%%'));

  return firstLine?.split(/\s+/)[0] ?? '';
};

export const normalizeMermaidSourceForRender = (code) => {
  if (getMermaidDiagramType(code) !== 'gantt') return code;

  const lines = code.split('\n');
  const normalizedLines = [];

  for (const rawLine of lines) {
    const continuation = rawLine.trim();
    const previousIndex = normalizedLines.length - 1;
    const previousLine = previousIndex >= 0 ? normalizedLines[previousIndex] : '';

    if (
      previousLine.trimEnd().endsWith(',') &&
      continuation &&
      GANTT_CONTINUATION_RE.test(continuation)
    ) {
      normalizedLines[previousIndex] = `${previousLine.trimEnd()} ${continuation}`;
      continue;
    }

    normalizedLines.push(rawLine.replace(/(:\s*)planned\s*,\s*/i, '$1'));
  }

  return normalizedLines.join('\n');
};
