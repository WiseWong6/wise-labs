const DARK_FALLBACK = {
  colorScheme: 'dark',
  background: '#111113',
  foreground: '#d1d1d6',
};

const LIGHT_FALLBACK = {
  colorScheme: 'light',
  background: '#ffffff',
  foreground: '#0f172a',
};

const TRANSPARENT_COLOR_RE = /^rgba?\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)$/i;

const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light');

export const getThemeFallbackPalette = (theme) =>
  normalizeTheme(theme) === 'dark' ? { ...DARK_FALLBACK } : { ...LIGHT_FALLBACK };

const parseRgb = (value) => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  const hexMatch = trimmed.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const hex = hexMatch[1];
    if (hex.length === 3) {
      return {
        r: Number.parseInt(hex[0] + hex[0], 16),
        g: Number.parseInt(hex[1] + hex[1], 16),
        b: Number.parseInt(hex[2] + hex[2], 16),
        a: 1,
      };
    }

    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const match = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!match) return null;

  const [r, g, b, a = 1] = match[1].split(',').map((part) => Number.parseFloat(part.trim()));
  if (![r, g, b, a].every(Number.isFinite)) return null;
  return { r, g, b, a };
};

const srgbToLinear = (value) => {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
};

const getLuminance = (rgb) =>
  0.2126 * srgbToLinear(rgb.r) + 0.7152 * srgbToLinear(rgb.g) + 0.0722 * srgbToLinear(rgb.b);

const getContrastRatio = (foreground, background) => {
  const lighter = Math.max(getLuminance(foreground), getLuminance(background));
  const darker = Math.min(getLuminance(foreground), getLuminance(background));
  return (lighter + 0.05) / (darker + 0.05);
};

const sameRgb = (left, right) =>
  Boolean(left && right) &&
  left.r === right.r &&
  left.g === right.g &&
  left.b === right.b &&
  Math.round((left.a ?? 1) * 1000) === Math.round((right.a ?? 1) * 1000);

const isTransparent = (value) =>
  value === 'transparent' || (typeof value === 'string' && TRANSPARENT_COLOR_RE.test(value.trim()));

/**
 * Pick a readable fallback color only when the element is inheriting a color
 * that becomes unreadable on its own custom background.
 *
 * @param {{
 *   backgroundColor: string,
 *   computedColor: string,
 *   inheritedColor?: string | null,
 *   minimumContrast?: number,
 *   theme?: 'dark' | 'light',
 * }} input
 * @returns {string | null}
 */
export const pickAdaptiveTextColor = ({
  backgroundColor,
  computedColor,
  inheritedColor = null,
  minimumContrast = 4.5,
  theme = 'light',
}) => {
  if (isTransparent(backgroundColor)) return null;

  const background = parseRgb(backgroundColor);
  const current = parseRgb(computedColor);
  if (!background || !current) return null;

  const inherited = inheritedColor ? parseRgb(inheritedColor) : null;
  if (inherited && !sameRgb(current, inherited)) {
    return null;
  }

  if (getContrastRatio(current, background) >= minimumContrast) {
    return null;
  }

  const palette = getThemeFallbackPalette(theme);
  const darkCandidate = parseRgb(DARK_FALLBACK.background);
  const lightCandidate = parseRgb(DARK_FALLBACK.foreground);
  if (!darkCandidate || !lightCandidate) {
    return palette.foreground;
  }

  return getContrastRatio(darkCandidate, background) >= getContrastRatio(lightCandidate, background)
    ? DARK_FALLBACK.background
    : DARK_FALLBACK.foreground;
};

/**
 * Inject a conservative theme bridge for HTML preview iframes.
 * It only fills in html/body background and foreground when they are still
 * transparent or on browser-default black text in dark mode.
 *
 * @param {'dark' | 'light'} theme
 * @returns {string}
 */
export const buildHtmlPreviewThemeBridge = (theme) => {
  const palette = getThemeFallbackPalette(theme);
  const palettes = {
    dark: getThemeFallbackPalette('dark'),
    light: getThemeFallbackPalette('light'),
  };
  const escapedBackground = JSON.stringify(palette.background);
  const escapedForeground = JSON.stringify(palette.foreground);
  const escapedScheme = JSON.stringify(palette.colorScheme);
  const escapedPalettes = JSON.stringify(palettes);

  return `
<style>:root { color-scheme: ${palette.colorScheme}; }</style>
<script>
(function() {
  var palettes = ${escapedPalettes};
  var fallbackTheme = {
    colorScheme: ${escapedScheme},
    backgroundColor: ${escapedBackground},
    foregroundColor: ${escapedForeground}
  };
  var transparentValues = ['transparent', 'rgba(0, 0, 0, 0)', 'rgba(0,0,0,0)'];
  var isTransparent = function(value) {
    return transparentValues.indexOf(value) !== -1;
  };
  var hasInlineColor = function(el) {
    return !!(el && el.style && el.style.color);
  };
  var setTheme = function(theme) {
    var next = palettes[theme === 'dark' ? 'dark' : 'light'];
    fallbackTheme = {
      colorScheme: next.colorScheme,
      backgroundColor: next.background,
      foregroundColor: next.foreground
    };
    apply();
  };
  var apply = function() {
    var html = document.documentElement;
    var body = document.body;
    if (!html || !body) return;
    html.style.colorScheme = fallbackTheme.colorScheme;
    [html, body].forEach(function(el) {
      var computed = window.getComputedStyle(el);
      if (isTransparent(computed.backgroundColor)) {
        el.style.backgroundColor = fallbackTheme.backgroundColor;
      }
      if (
        fallbackTheme.colorScheme === 'dark' &&
        !hasInlineColor(el) &&
        computed.color === 'rgb(0, 0, 0)'
      ) {
        el.style.color = fallbackTheme.foregroundColor;
      }
    });
  };
  window.__setArtifactPreviewTheme = setTheme;
  window.addEventListener('message', function(event) {
    if (event && event.data && event.data.type === 'html-preview-theme') {
      setTheme(event.data.theme);
    }
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }
})();
</script>`;
};

export const buildStandaloneThemeCss = (theme) => {
  const normalizedTheme = normalizeTheme(theme);

  if (normalizedTheme === 'dark') {
    return `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.75;color:#d1d1d6;background:#111113}
main.container{max-width:900px;margin:0 auto;padding:40px 24px;background:#18181b;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,0.32)}
h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.75em;line-height:1.3;font-weight:600;color:#f5f5f7}
p{margin:.75em 0}
a{color:#60a5fa;text-decoration:none}
a:hover{text-decoration:underline}
img,svg{max-width:100%;height:auto;display:block;margin:1em auto}
pre{background:#0f172a;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-family:'JetBrains Mono','Fira Code',monospace;font-size:14px;line-height:1.6;margin:1em 0}
code{background:#1f2937;color:#fb923c;padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.875em}
pre code{background:transparent;color:inherit;padding:0}
blockquote{margin:1em 0;padding:.5em 1em;border-left:4px solid #374151;color:#9ca3af;background:#1f2937}
table{width:100%;border-collapse:collapse;margin:1em 0}
th,td{border:1px solid #374151;padding:8px 12px;text-align:left}
th{background:#1f2937;font-weight:600}
ul,ol{margin:.75em 0;padding-left:1.5em}
li{margin:.25em 0}
hr{border:0;border-top:1px solid #374151;margin:1.5em 0}
`;
  }

  return `
*,*::before,*::after{box-sizing:border-box}
body{margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Inter','PingFang SC','Microsoft YaHei',sans-serif;line-height:1.75;color:#1f2937;background:#f8fafc}
main.container{max-width:900px;margin:0 auto;padding:40px 24px;background:#fff;min-height:100vh;box-shadow:0 0 40px rgba(0,0,0,0.04)}
h1,h2,h3,h4,h5,h6{margin-top:1.5em;margin-bottom:0.75em;line-height:1.3;font-weight:600;color:#111827}
p{margin:.75em 0}
a{color:#2563eb;text-decoration:none}
a:hover{text-decoration:underline}
img,svg{max-width:100%;height:auto;display:block;margin:1em auto}
pre{background:#1e293b;color:#e2e8f0;padding:16px;border-radius:8px;overflow-x:auto;font-family:'JetBrains Mono','Fira Code',monospace;font-size:14px;line-height:1.6;margin:1em 0}
code{background:#f1f5f9;color:#c2410c;padding:2px 6px;border-radius:4px;font-family:'JetBrains Mono','Fira Code',monospace;font-size:.875em}
pre code{background:transparent;color:inherit;padding:0}
blockquote{margin:1em 0;padding:.5em 1em;border-left:4px solid #e5e7eb;color:#4b5563;background:#f9fafb}
table{width:100%;border-collapse:collapse;margin:1em 0}
th,td{border:1px solid #e5e7eb;padding:8px 12px;text-align:left}
th{background:#f9fafb;font-weight:600}
ul,ol{margin:.75em 0;padding-left:1.5em}
li{margin:.25em 0}
hr{border:0;border-top:1px solid #e5e7eb;margin:1.5em 0}
`;
};

export const injectThemeBridgeIntoHtmlDocument = (html, theme) => {
  const trimmed = html.trim();
  if (!trimmed) return trimmed;

  const bridge = buildHtmlPreviewThemeBridge(theme);
  const charsetMetaPattern =
    /(<meta\b[^>]*(?:charset\s*=|content\s*=\s*["'][^"']*charset\s*=)[^>]*>)/i;
  const charsetMeta = '<meta charset="UTF-8">';
  const headContent = `${charsetMeta}${bridge}`;

  if (/<head[\s>]/i.test(trimmed)) {
    return trimmed.replace(/(<head[^>]*>)([\s\S]*?)(<\/head>)/i, (_, openHead, head, closeHead) => {
      if (charsetMetaPattern.test(head)) {
        return `${openHead}${head.replace(charsetMetaPattern, `$1${bridge}`)}${closeHead}`;
      }

      return `${openHead}${headContent}${head}${closeHead}`;
    });
  }

  if (/<html[\s>]/i.test(trimmed)) {
    return trimmed.replace(/(<html[^>]*>)/i, `$1<head>${headContent}</head>`);
  }

  if (/^<!doctype\s+html[\s>]/i.test(trimmed)) {
    return trimmed.replace(/^(<!doctype\s+html[^>]*>)/i, `$1<html><head>${headContent}</head>`);
  }

  return `${headContent}${trimmed}`;
};
