const EVENT_HANDLER_ATTR_RE = /\s+on[a-z]+\s*=\s*(?:"[^"]*"|'[^']*'|[^\s>]+)/gi;
const JAVASCRIPT_URL_ATTR_RE =
  /\s+(href|src|xlink:href)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi;

export const sanitizeHtmlForStaticCapture = (html) => {
  if (typeof globalThis.DOMParser === 'undefined') {
    return html
      .replace(EVENT_HANDLER_ATTR_RE, '')
      .replace(JAVASCRIPT_URL_ATTR_RE, '');
  }

  const doc = new globalThis.DOMParser().parseFromString(html, 'text/html');
  doc.querySelectorAll('*').forEach((element) => {
    Array.from(element.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim().toLowerCase();

      if (name.startsWith('on') || value.startsWith('javascript:')) {
        element.removeAttribute(attribute.name);
      }
    });
  });

  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
};

export const getHtmlPreviewCaptureSource = (iframe) => {
  const srcDoc = iframe?.srcdoc || iframe?.getAttribute?.('srcdoc') || '';
  if (!srcDoc.trim()) {
    throw new Error('HTML preview source is not ready');
  }

  return sanitizeHtmlForStaticCapture(srcDoc);
};
