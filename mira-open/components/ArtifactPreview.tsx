import React, { useEffect, useLayoutEffect, useRef, useState, useCallback, useMemo } from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';
import {
  Download,
  FileDown,
  Image as ImageIcon,
  Copy,
  Check,
  PanelLeftClose,
  PanelTopClose,
  PanelTopOpen,
  Sidebar,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Loader2,
} from 'lucide-react';
import ZoomableWrapper from './ZoomableWrapper';
import JSON5 from 'json5';
import {
  buildStandaloneThemeCss,
  buildHtmlPreviewThemeBridge,
  injectThemeBridgeIntoHtmlDocument,
  pickAdaptiveTextColor,
} from '../utils/html-theme.js';
import { getHtmlPreviewCaptureSource } from '../utils/html-preview-capture-source.js';
import { resolveMeasuredHtmlPreviewExtent } from '../utils/html-preview-size.js';
import {
  applyMermaidNodeTextContrast,
  getMermaidDiagramScale,
  getMermaidThemePalette,
} from '../utils/mermaid-theme.js';
import {
  getCachedMermaidSvg,
  prewarmAlternateMermaidTheme,
  renderMermaidSvg,
} from '../utils/mermaid-renderer.js';
import { normalizeMermaidSourceForRender } from '../utils/mermaid-source.js';

const MERMAID_DEFAULT_SCALE = 1;
const MERMAID_CANVAS_BASE_WIDTH = 580;
const MERMAID_DISPLAY_MAX_HEIGHT = 560;
const MERMAID_VIEWBOX_PADDING_X = 12;
const MERMAID_VIEWBOX_PADDING_TOP = 48;
const MERMAID_VIEWBOX_PADDING_BOTTOM = 24;
const LUCIDE_ICON_VIEWBOX = '0 0 24 24';
const MERMAID_READY_TIMEOUT_MS = 25000;
const MERMAID_BACKGROUND_RENDER_DELAY_MS = 1200;
const MERMAID_RENDER_REQUEST_EVENT = 'artifact-desk:mermaid-render-request';
const HTML_PREVIEW_MIN_HEIGHT = 200;
const HTML_PREVIEW_MAX_HEIGHT = 8000;
const HTML_PREVIEW_SETTLE_MS = 150;
const HTML_PREVIEW_HEIGHT_EPSILON = 4;

const waitForDelay = (ms: number) =>
  new Promise<void>((resolve) => {
    window.setTimeout(resolve, ms);
  });

const getMermaidCanvasScale = (code: string) => getMermaidDiagramScale(code);

interface ArtifactPreviewProps {
  code: string;
  stateResetKey?: string;
  onError: (error: string | null) => void;
  isCollapsed?: boolean;
  isMobile?: boolean;
  onToggleSidebar?: () => void;
}

type ContentType = 'markdown' | 'json' | 'html' | 'mermaid' | 'mixed';

type InlineStyleOptions = {
  styleProps?: readonly string[];
  inlineImages?: boolean;
};

type HtmlCapture = {
  blob: Blob;
  width: number;
  height: number;
};

type PreviewTheme = 'dark' | 'light';

type MermaidRenderStatus = {
  total: number;
  ready: number;
  error: number;
  pending: number;
};

type CaptureRect = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const PreviewThemeContext = React.createContext<PreviewTheme>('light');

const WECHAT_ARTICLE_WIDTH = 677;
const MAX_INLINE_IMAGE_PIXELS = 4_000_000;
const MERMAID_IMAGE_PADDING = 24;
const MERMAID_IMAGE_SCALE = 2;
const MERMAID_IMAGE_MAX_EDGE = 4096;
const HTML_PREVIEW_LANGUAGES = new Set(['html', 'html-preview']);
const HTML_FRAGMENT_TAGS = [
  'article',
  'aside',
  'body',
  'br',
  'button',
  'canvas',
  'div',
  'figure',
  'footer',
  'form',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'header',
  'hr',
  'img',
  'main',
  'nav',
  'ol',
  'p',
  'section',
  'span',
  'style',
  'svg',
  'table',
  'ul',
] as const;

const COPY_STYLE_PROPS = [
  'display',
  'box-sizing',
  'flex',
  'flex-basis',
  'flex-direction',
  'flex-flow',
  'flex-grow',
  'flex-shrink',
  'flex-wrap',
  'align-content',
  'align-items',
  'align-self',
  'justify-content',
  'justify-items',
  'justify-self',
  'gap',
  'row-gap',
  'column-gap',
  'grid',
  'grid-area',
  'grid-auto-columns',
  'grid-auto-flow',
  'grid-auto-rows',
  'grid-column',
  'grid-column-end',
  'grid-column-start',
  'grid-row',
  'grid-row-end',
  'grid-row-start',
  'grid-template',
  'grid-template-areas',
  'grid-template-columns',
  'grid-template-rows',
  'position',
  'top',
  'right',
  'bottom',
  'left',
  'z-index',
  'width',
  'min-width',
  'max-width',
  'height',
  'min-height',
  'max-height',
  'overflow',
  'overflow-x',
  'overflow-y',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'border',
  'border-width',
  'border-style',
  'border-color',
  'border-top',
  'border-top-width',
  'border-top-style',
  'border-top-color',
  'border-right',
  'border-right-width',
  'border-right-style',
  'border-right-color',
  'border-bottom',
  'border-bottom-width',
  'border-bottom-style',
  'border-bottom-color',
  'border-left',
  'border-left-width',
  'border-left-style',
  'border-left-color',
  'border-radius',
  'border-top-left-radius',
  'border-top-right-radius',
  'border-bottom-right-radius',
  'border-bottom-left-radius',
  'background',
  'background-color',
  'background-image',
  'background-size',
  'background-position',
  'background-repeat',
  'color',
  'font',
  'font-family',
  'font-size',
  'font-style',
  'font-weight',
  'letter-spacing',
  'line-height',
  'text-align',
  'text-decoration',
  'text-transform',
  'white-space',
  'word-break',
  'overflow-wrap',
  'vertical-align',
  'list-style',
  'list-style-type',
  'list-style-position',
  'border-collapse',
  'border-spacing',
  'table-layout',
  'box-shadow',
  'transform',
  'transform-origin',
  'object-fit',
  'object-position',
  'opacity',
  'break-inside',
  'page-break-inside',
] as const;

const FLOW_TEXT_TAGS = new Set([
  'article',
  'section',
  'div',
  'p',
  'blockquote',
  'ul',
  'ol',
  'li',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
  'span',
  'strong',
  'em',
  'code',
]);

const RESPONSIVE_MEDIA_TAGS = new Set(['img', 'svg', 'canvas', 'video']);
const PRESERVE_LAYOUT_ATTR = 'data-copy-preserve-layout';
const HTML_THEME_SKIP_TAGS = new Set(['code', 'iframe', 'img', 'pre', 'script', 'style', 'svg', 'template']);

const getReadableText = (element: HTMLElement) =>
  (element.innerText || element.textContent || '').replace(/\n{3,}/g, '\n\n').trim();

const isTransparentOrEmptyCssColor = (value: string | null | undefined) =>
  !value || value === 'transparent' || value === 'rgba(0, 0, 0, 0)' || value === 'rgba(0,0,0,0)';

const shouldSkipAdaptiveTextNode = (element: HTMLElement) => {
  const tagName = element.tagName.toLowerCase();
  return HTML_THEME_SKIP_TAGS.has(tagName) || Boolean(element.closest('code, pre, svg, iframe'));
};

const adaptHtmlFragmentTextColors = (root: HTMLElement, theme: PreviewTheme) => {
  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];

  for (const element of elements) {
    if (shouldSkipAdaptiveTextNode(element)) continue;
    if (!getReadableText(element)) continue;

    const computedStyle = window.getComputedStyle(element);
    if (isTransparentOrEmptyCssColor(computedStyle.backgroundColor)) continue;
    if (element.style.color) continue;

    const inheritedColor = element.parentElement
      ? window.getComputedStyle(element.parentElement).color
      : null;
    const adaptiveColor = pickAdaptiveTextColor({
      theme,
      backgroundColor: computedStyle.backgroundColor,
      computedColor: computedStyle.color,
      inheritedColor,
    });

    if (adaptiveColor) {
      element.style.color = adaptiveColor;
    }
  }
};

const looksLikeHtml = (rawCode: string) => {
  const trimmed = rawCode.trim();
  if (!trimmed) return false;

  if (/^<!doctype\s+html[\s>]/i.test(trimmed) || /^<html[\s>]/i.test(trimmed)) {
    return true;
  }

  const tagNames = HTML_FRAGMENT_TAGS.join('|');
  const startsWithHtmlTag = new RegExp(`^<(${tagNames})(\\s|>|/)`, 'i').test(trimmed);
  const hasPairedHtmlTag = new RegExp(`<(${tagNames})(\\s|>)[\\s\\S]*<\\/\\1>`, 'i').test(trimmed);

  return startsWithHtmlTag || hasPairedHtmlTag;
};

const hasMultipleFencedCodeBlocks = (rawCode: string) => {
  const codeBlockMatches = rawCode.trim().match(/```[a-zA-Z]/g);
  return Boolean(codeBlockMatches && codeBlockMatches.length >= 2);
};

const imageToDataUrl = (image: HTMLImageElement, quality = 0.82) => {
  try {
    if (!image.naturalWidth || !image.naturalHeight) {
      return image.currentSrc || image.src;
    }
    if (image.naturalWidth * image.naturalHeight > MAX_INLINE_IMAGE_PIXELS) {
      return image.currentSrc || image.src;
    }

    const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    const context = canvas.getContext('2d');
    if (!context) {
      return image.currentSrc || image.src;
    }

    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0);

    return canvas.toDataURL('image/jpeg', quality);
  } catch (err) {
    console.warn('Image data URL fallback:', err);
    return image.currentSrc || image.src;
  }
};

const appendInlineStyles = (source: Element, target: Element, options: InlineStyleOptions = {}) => {
  const view = source.ownerDocument.defaultView;
  const computedStyle = view?.getComputedStyle(source);
  const targetStyle = (target as HTMLElement | SVGElement).style;
  const styleProps = options.styleProps ?? COPY_STYLE_PROPS;
  const inlineImages = options.inlineImages ?? true;

  if (computedStyle && targetStyle) {
    styleProps.forEach((prop) => {
      const value = computedStyle.getPropertyValue(prop);
      if (value) {
        targetStyle.setProperty(prop, value);
      }
    });
  }

  const sourceTagName = source.tagName.toLowerCase();
  const targetTagName = target.tagName.toLowerCase();

  if (inlineImages && sourceTagName === 'img' && targetTagName === 'img') {
    (target as HTMLImageElement).src = imageToDataUrl(source as HTMLImageElement);
  }

  if (sourceTagName === 'li' && targetTagName === 'li' && view) {
    const beforeContent = view.getComputedStyle(source, '::before').content;
    if (beforeContent && beforeContent !== 'none' && beforeContent !== 'normal') {
      const cleanContent = beforeContent.replace(/^["']|["']$/g, '').trim();
      if (cleanContent) {
        target.insertBefore(document.createTextNode(`${cleanContent} `), target.firstChild);
      }
    }
  }

  const SVG_ROOT_LAYOUT_PROPS = [
    'display',
    'width',
    'max-width',
    'height',
    'aspect-ratio',
    'margin',
    'vertical-align',
    'overflow',
  ];

  Array.from(source.children).forEach((sourceChild, index) => {
    const targetChild = target.children[index];
    if (!targetChild) return;

    // Mermaid SVGs are self-contained (embedded <style> + presentation attributes).
    // Skip the entire subtree and only copy layout props on the <svg> root to avoid
    // hundreds of thousands of getComputedStyle calls on SVG sub-elements.
    if (
      sourceChild.tagName.toLowerCase() === 'svg' &&
      sourceChild.closest('[data-copy-role="mermaid-block"]')
    ) {
      const childComputedStyle = view?.getComputedStyle(sourceChild);
      const childTargetStyle = (targetChild as SVGElement).style;
      if (childComputedStyle && childTargetStyle) {
        SVG_ROOT_LAYOUT_PROPS.forEach((prop) => {
          const value = childComputedStyle.getPropertyValue(prop);
          if (value) childTargetStyle.setProperty(prop, value);
        });
      }
      return;
    }

    appendInlineStyles(sourceChild, targetChild, options);
  });
};

const cleanupPortableHtml = (root: HTMLElement) => {
  root.querySelectorAll('[data-copy-remove="true"], script').forEach((element) => {
    element.remove();
  });

  const elements = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))];
  const preserveLayoutElements = new WeakSet<HTMLElement>();
  elements.forEach((element) => {
    if (element.closest(`[${PRESERVE_LAYOUT_ATTR}="true"]`)) {
      preserveLayoutElements.add(element);
    }
  });

  elements.forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-copy-')) {
        element.removeAttribute(attr.name);
      }
    });
    if (element.closest('svg')) {
      element.removeAttribute('contenteditable');
    } else {
      element.removeAttribute('class');
      element.removeAttribute('id');
      element.removeAttribute('contenteditable');
    }

    const tagName = element.tagName.toLowerCase();
    const preserveLayout = preserveLayoutElements.has(element);

    if (!preserveLayout && FLOW_TEXT_TAGS.has(tagName)) {
      element.style.removeProperty('width');
      element.style.removeProperty('min-width');
      element.style.removeProperty('height');
      element.style.removeProperty('min-height');
      element.style.removeProperty('max-height');
      element.style.removeProperty('overflow');
      element.style.removeProperty('overflow-x');
      element.style.removeProperty('overflow-y');
    }

    if (RESPONSIVE_MEDIA_TAGS.has(tagName)) {
      if (preserveLayout) {
        element.style.setProperty('vertical-align', 'top');
      } else {
        element.removeAttribute('width');
        element.removeAttribute('height');
        element.style.setProperty('max-width', '100%');
        element.style.setProperty('height', 'auto');
        element.style.setProperty('vertical-align', 'top');
        element.style.setProperty('display', 'block');
        element.style.setProperty('width', '100%');
        element.style.setProperty('margin', '16px auto');
        element.style.setProperty('border', '0');
      }
    }

    if (!preserveLayout && tagName === 'table') {
      element.style.setProperty('width', '100%');
      element.style.setProperty('max-width', '100%');
      element.style.setProperty('border-collapse', 'collapse');
      element.style.setProperty('table-layout', 'auto');
    }

    if (!preserveLayout && tagName === 'pre') {
      element.style.removeProperty('height');
      element.style.removeProperty('max-height');
      element.style.setProperty('max-width', '100%');
      element.style.setProperty('white-space', 'pre-wrap');
      element.style.setProperty('word-break', 'break-word');
      element.style.setProperty('overflow-wrap', 'anywhere');
    }
  });
};

const copyPlainText = async (text: string) => {
  const trimmed = text.trim();
  if (!trimmed) return;

  try {
    await navigator.clipboard.writeText(trimmed);
    return;
  } catch (err) {
    console.warn('navigator.clipboard.writeText failed, falling back to selection copy:', err);
  }

  const textarea = document.createElement('textarea');
  textarea.value = trimmed;
  textarea.setAttribute('readonly', 'true');
  textarea.style.cssText = 'position:fixed;left:-9999px;top:0;opacity:0;';
  document.body.appendChild(textarea);
  textarea.select();

  try {
    if (!document.execCommand('copy')) {
      throw new Error('document.execCommand("copy") returned false');
    }
  } finally {
    document.body.removeChild(textarea);
  }
};

const detectContentType = (rawCode: string): ContentType => {
  const trimmed = rawCode.trim();
  if (!trimmed) return 'markdown';

  // Pure JSON
  if (
    (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
    (trimmed.startsWith('[') && trimmed.endsWith(']'))
  ) {
    try {
      JSON5.parse(trimmed);
      return 'json';
    } catch {
      // fall through
    }
  }

  // Pure Mermaid
  const mermaidKeywords = [
    'graph',
    'flowchart',
    'sequenceDiagram',
    'classDiagram',
    'stateDiagram',
    'stateDiagram-v2',
    'erDiagram',
    'gantt',
    'pie',
    'journey',
    'mindmap',
    'timeline',
    'gitGraph',
    'architecture',
    'architecture-beta',
    'quadrantChart',
    'xychart-beta',
    'sankey-beta',
    'treemap',
    'venn-beta',
    'requirementDiagram',
    'kanban',
    'ishikawa-beta',
    'block-beta',
    'block',
    'packet-beta',
    'C4Context',
    'C4Container',
    'C4Component',
    'C4Dynamic',
    'C4Deployment',
  ];
  const firstWord = trimmed.split(/\s+/)[0];
  if (mermaidKeywords.includes(firstWord)) {
    return 'mermaid';
  }

  // Mixed: contains two or more code blocks
  if (hasMultipleFencedCodeBlocks(trimmed)) {
    return 'mixed';
  }

  // Pure HTML documents or fragments
  if (looksLikeHtml(trimmed)) {
    return 'html';
  }

  return 'markdown';
};

const parseSvgLength = (value: string | null) => {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const isUsableSvgRect = (rect: CaptureRect | DOMRect | SVGRect | null | undefined): rect is CaptureRect =>
  Boolean(
    rect &&
      [rect.x, rect.y, rect.width, rect.height].every(Number.isFinite) &&
      rect.width > 0 &&
      rect.height > 0,
  );

const rectToViewBox = (rect: CaptureRect) =>
  [rect.x, rect.y, rect.width, rect.height].map((value) => Number(value.toFixed(3))).join(' ');

const getPaddedMermaidRect = (rect: CaptureRect): CaptureRect => ({
  x: rect.x - MERMAID_VIEWBOX_PADDING_X,
  y: rect.y - MERMAID_VIEWBOX_PADDING_TOP,
  width: rect.width + MERMAID_VIEWBOX_PADDING_X * 2,
  height: rect.height + MERMAID_VIEWBOX_PADDING_TOP + MERMAID_VIEWBOX_PADDING_BOTTOM,
});

const SVG_HREF_ATTRS = new Set(['href', 'xlink:href']);
const SVG_TOKEN_ID_REFERENCE_ATTRS = new Set(['aria-labelledby', 'aria-describedby']);

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const replaceSvgUrlReferences = (value: string, idMap: Map<string, string>) => {
  let nextValue = value;
  idMap.forEach((nextId, oldId) => {
    const escapedId = escapeRegExp(oldId);
    nextValue = nextValue.replace(
      new RegExp(`url\\(\\s*(['"]?)#${escapedId}\\1\\s*\\)`, 'g'),
      (_match, quote: string) => `url(${quote}#${nextId}${quote})`,
    );
  });
  return nextValue;
};

const replaceSvgCssIdSelectors = (value: string, idMap: Map<string, string>) => {
  let nextValue = value;
  idMap.forEach((nextId, oldId) => {
    nextValue = nextValue.replace(
      new RegExp(`#${escapeRegExp(oldId)}(?=[\\s.#:,>{}+~)\\[]|$)`, 'g'),
      `#${nextId}`,
    );
  });
  return nextValue;
};

const replaceSvgTokenIds = (value: string, idMap: Map<string, string>) =>
  value
    .split(/\s+/)
    .map((token) => idMap.get(token) ?? token)
    .join(' ');

const replaceSvgAttributeIdReferences = (
  name: string,
  value: string,
  idMap: Map<string, string>,
) => {
  if (SVG_TOKEN_ID_REFERENCE_ATTRS.has(name)) {
    return replaceSvgTokenIds(value, idMap);
  }

  if (SVG_HREF_ATTRS.has(name) && value.startsWith('#')) {
    const targetId = value.slice(1);
    return idMap.has(targetId) ? `#${idMap.get(targetId)}` : value;
  }

  return replaceSvgUrlReferences(value, idMap);
};

const stabilizeStandaloneSvgIds = (svgElement: SVGSVGElement, idPrefix: string) => {
  const elements = [svgElement, ...Array.from(svgElement.querySelectorAll<SVGElement>('[id]'))];
  const idMap = new Map<string, string>();
  const seenIds = new Map<string, number>();
  const idAssignments: Array<{ element: SVGElement; nextId: string }> = [];

  elements.forEach((element) => {
    if (!element.id) return;
    const oldId = element.id;
    const count = seenIds.get(oldId) ?? 0;
    const baseId = `${idPrefix}${oldId}`;
    const nextId = count === 0 ? baseId : `${baseId}-${count + 1}`;
    seenIds.set(oldId, count + 1);
    idAssignments.push({ element, nextId });
    if (!idMap.has(oldId)) {
      idMap.set(oldId, nextId);
    }
  });

  if (idAssignments.length === 0) return;

  idAssignments.forEach(({ element, nextId }) => {
    element.id = nextId;
  });

  [svgElement, ...Array.from(svgElement.querySelectorAll<SVGElement>('*'))].forEach((element) => {
    Array.from(element.attributes).forEach((attr) => {
      if (attr.name === 'id') return;
      const nextValue = replaceSvgAttributeIdReferences(attr.name, attr.value, idMap);
      if (nextValue !== attr.value) {
        element.setAttribute(attr.name, nextValue);
      }
    });
  });

  svgElement.querySelectorAll('style').forEach((styleElement) => {
    if (!styleElement.textContent) return;
    styleElement.textContent = replaceSvgCssIdSelectors(
      replaceSvgUrlReferences(styleElement.textContent, idMap),
      idMap,
    );
  });
};

const getSvgLogicalRect = (svgEl: Element) => {
  const viewBox = svgEl.getAttribute('viewBox');
  if (viewBox) {
    const parts = viewBox.split(/\s+|,/).filter(Boolean).map(Number.parseFloat);
    if (parts.length >= 4 && parts.every(Number.isFinite) && parts[2] > 0 && parts[3] > 0) {
      return {
        x: parts[0],
        y: parts[1],
        width: parts[2],
        height: parts[3],
      };
    }
  }

  return {
    x: 0,
    y: 0,
    width: parseSvgLength(svgEl.getAttribute('width')) || WECHAT_ARTICLE_WIDTH,
    height: parseSvgLength(svgEl.getAttribute('height')) || 480,
  };
};

const getSvgRectFromMarkup = (svg: string): CaptureRect | null => {
  if (!svg.trim()) return null;

  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgEl = doc.documentElement;
    if (svgEl?.tagName.toLowerCase() === 'svg') {
      const rect = getSvgLogicalRect(svgEl);
      return isUsableSvgRect(rect) ? rect : null;
    }
  }

  const viewBoxMatch = svg.match(/viewBox=["']([^"']+)["']/i);
  if (!viewBoxMatch) return null;

  const parts = viewBoxMatch[1].split(/[\s,]+/).filter(Boolean).map(Number.parseFloat);
  if (parts.length < 4 || !parts.every(Number.isFinite) || parts[2] <= 0 || parts[3] <= 0) {
    return null;
  }

  return {
    x: parts[0],
    y: parts[1],
    width: parts[2],
    height: parts[3],
  };
};

const getMermaidDisplayWidth = (code: string, svg: string) => {
  const baseWidth = Math.max(
    1,
    Math.round(MERMAID_CANVAS_BASE_WIDTH * getMermaidCanvasScale(code)),
  );
  const rect = getSvgRectFromMarkup(svg);
  if (!rect) return baseWidth;

  const projectedHeight = (baseWidth * rect.height) / rect.width;
  if (projectedHeight <= MERMAID_DISPLAY_MAX_HEIGHT) {
    return baseWidth;
  }

  return Math.max(1, Math.round((MERMAID_DISPLAY_MAX_HEIGHT * rect.width) / rect.height));
};

const applyMermaidSvgViewport = (
  svgElement: SVGSVGElement,
  contentRect: CaptureRect,
) => {
  const viewportRect = getPaddedMermaidRect(contentRect);
  svgElement.setAttribute('viewBox', rectToViewBox(viewportRect));
  svgElement.setAttribute('width', '100%');
  svgElement.removeAttribute('height');
  svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  svgElement.style.removeProperty('max-width');
  svgElement.style.setProperty('width', '100%');
  svgElement.style.setProperty('height', 'auto');
  svgElement.style.setProperty('display', 'block');
};

const isMermaidSvg = (svg: SVGElement): svg is SVGSVGElement => {
  if (svg.tagName.toLowerCase() !== 'svg') return false;
  if (svg.closest('[data-copy-remove="true"]')) return false;
  if (svg.id.startsWith('mermaid-')) return true;

  const viewBox = svg.getAttribute('viewBox')?.trim();
  return Boolean(viewBox && viewBox !== LUCIDE_ICON_VIEWBOX && svg.closest('.mermaid-container'));
};

const normalizeMermaidSvg = (svg: string, theme: PreviewTheme = 'light') => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(svg, 'image/svg+xml');
  let svgEl: Element = doc.documentElement;

  if (svgEl.tagName.toLowerCase() !== 'svg') {
    const template = document.createElement('template');
    template.innerHTML = svg.trim();
    const htmlSvg = template.content.querySelector('svg');
    if (htmlSvg?.namespaceURI !== 'http://www.w3.org/2000/svg') {
      return applyMermaidNodeTextContrast(svg, theme);
    }
    svgEl = htmlSvg;
  }

  const svgElement = svgEl as unknown as SVGSVGElement;
  applyMermaidSvgViewport(svgElement, getSvgLogicalRect(svgElement));

  if (!svgElement.getAttribute('xmlns')) {
    svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
  }

  return applyMermaidNodeTextContrast(new XMLSerializer().serializeToString(svgElement), theme);
};

const getSvgElementForCapture = (source: string | SVGSVGElement) => {
  if (typeof source !== 'string') {
    return source.cloneNode(true) as SVGSVGElement;
  }

  const parser = new DOMParser();
  const parsed = parser.parseFromString(source, 'image/svg+xml');
  const parsedSvg = parsed.documentElement;
  if (parsedSvg.tagName.toLowerCase() === 'svg') {
    return parsedSvg as unknown as SVGSVGElement;
  }

  // Some Mermaid diagrams include markup that survives browser rendering but
  // does not round-trip through the strict XML parser. Fall back to HTML
  // parsing so we can serialize the live SVG structure for export.
  const template = document.createElement('template');
  template.innerHTML = source.trim();
  const htmlSvg = template.content.querySelector('svg');
  if (htmlSvg?.namespaceURI === 'http://www.w3.org/2000/svg') {
    return htmlSvg.cloneNode(true) as SVGSVGElement;
  }

  throw new Error('Invalid SVG content');
};

// Convert Mermaid SVG to PNG without pixel-cropping or forced upscaling.
const svgToPngCapture = (svgSource: string | SVGSVGElement): Promise<HtmlCapture> => {
  return new Promise((resolve, reject) => {
    let svgElement: SVGSVGElement;
    try {
      svgElement = getSvgElementForCapture(svgSource);
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Invalid SVG content'));
      return;
    }

    if (svgElement.tagName.toLowerCase() !== 'svg') {
      reject(new Error('Invalid SVG content'));
      return;
    }

    const baseRect = getSvgLogicalRect(svgElement);
    const logicalWidth = Math.ceil(baseRect.width + MERMAID_IMAGE_PADDING * 2);
    const logicalHeight = Math.ceil(baseRect.height + MERMAID_IMAGE_PADDING * 2);
    const renderScale = Math.max(
      1,
      Math.min(
        MERMAID_IMAGE_SCALE,
        MERMAID_IMAGE_MAX_EDGE / logicalWidth,
        MERMAID_IMAGE_MAX_EDGE / logicalHeight,
      ),
    );
    const renderWidth = Math.max(1, Math.ceil(logicalWidth * renderScale));
    const renderHeight = Math.max(1, Math.ceil(logicalHeight * renderScale));

    svgElement.setAttribute(
      'viewBox',
      [
        baseRect.x - MERMAID_IMAGE_PADDING,
        baseRect.y - MERMAID_IMAGE_PADDING,
        logicalWidth,
        logicalHeight,
      ].join(' '),
    );
    svgElement.setAttribute('width', String(renderWidth));
    svgElement.setAttribute('height', String(renderHeight));
    svgElement.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    svgElement.style.removeProperty('max-width');
    svgElement.style.removeProperty('width');
    svgElement.style.removeProperty('height');
    if (!svgElement.getAttribute('xmlns')) {
      svgElement.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    }

    const serializer = new XMLSerializer();
    const newSvgString = serializer.serializeToString(svgElement);

    const img = new Image();
    const svg64 = btoa(unescape(encodeURIComponent(newSvgString)));
    const image64 = `data:image/svg+xml;base64,${svg64}`;
    let settled = false;
    const timeoutId = window.setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Timed out while rendering SVG image'));
    }, 5000);

    img.onload = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      const canvas = document.createElement('canvas');
      canvas.width = renderWidth;
      canvas.height = renderHeight;

      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      canvas.toBlob((blob) => {
        if (blob) {
          resolve({
            blob,
            width: logicalWidth,
            height: logicalHeight,
          });
        }
        else reject(new Error('Failed to create blob'));
      }, 'image/png');
    };
    img.onerror = () => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeoutId);
      reject(new Error('Failed to load SVG image'));
    };
    img.src = image64;
  });
};


const escapeHtmlAttribute = (value: string) =>
  value.replace(/[&<>"']/g, (char) => {
    switch (char) {
      case '&':
        return '&amp;';
      case '<':
        return '&lt;';
      case '>':
        return '&gt;';
      case '"':
        return '&quot;';
      default:
        return '&#39;';
    }
  });

const getMermaidRenderStatus = (
  root: HTMLElement,
  expectedTheme?: PreviewTheme,
): MermaidRenderStatus => {
  const blocks = Array.from(
    root.querySelectorAll<HTMLElement>('[data-copy-role="mermaid-block"]'),
  );
  let ready = 0;
  let error = 0;

  blocks.forEach((block) => {
    if (block.dataset.mermaidReady === 'error') {
      error++;
      return;
    }

    const hasExpectedTheme = !expectedTheme || block.dataset.mermaidTheme === expectedTheme;
    const svg = Array.from(block.querySelectorAll<SVGElement>('svg')).find(isMermaidSvg);
    if (svg && hasExpectedTheme) {
      ready++;
    }
  });

  return {
    total: blocks.length,
    ready,
    error,
    pending: Math.max(0, blocks.length - ready - error),
  };
};

const getMermaidCompleteCount = (status: MermaidRenderStatus) => status.ready + status.error;

const waitForIframeReady = (iframe: HTMLIFrameElement, timeoutMs = 1500) =>
  new Promise<void>((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) return;
      settled = true;
      iframe.removeEventListener('load', finish);
      window.clearTimeout(timeoutId);
      resolve();
    };
    const isReady = () => {
      try {
        const doc = iframe.contentDocument;
        return Boolean(doc?.body && doc.readyState !== 'loading');
      } catch {
        return true;
      }
    };
    const timeoutId = window.setTimeout(finish, timeoutMs);

    if (isReady()) {
      finish();
      return;
    }

    iframe.addEventListener('load', finish, { once: true });
  });

const waitForHtmlPreviewFrames = async (sourceRoot: HTMLElement) => {
  const frames = Array.from(
    sourceRoot.querySelectorAll<HTMLIFrameElement>('[data-copy-role="html-preview"] iframe'),
  );
  await Promise.all(frames.map((frame) => waitForIframeReady(frame)));
};

const createHtmlBodyCopySection = (body: HTMLElement, margin: string) => {
  const bodyClone = body.cloneNode(true) as HTMLElement;
  appendInlineStyles(body, bodyClone);

  const section = document.createElement('section');
  const bodyStyle = bodyClone.getAttribute('style');
  section.setAttribute(PRESERVE_LAYOUT_ATTR, 'true');
  section.style.cssText = [
    bodyStyle ?? '',
    'width:100%',
    `max-width:${WECHAT_ARTICLE_WIDTH}px`,
    `margin:${margin}`,
    'box-sizing:border-box',
    'background:#ffffff',
  ]
    .filter(Boolean)
    .join(';');

  while (bodyClone.firstChild) {
    section.appendChild(bodyClone.firstChild);
  }

  return section;
};

const createHtmlSourceCopySection = (html: string, margin: string) => {
  const doc = new DOMParser().parseFromString(html, 'text/html');
  return createHtmlBodyCopySection(doc.body, margin);
};

const expandHtmlPreviews = async (sourceRoot: HTMLElement, cloneRoot: HTMLElement) => {
  const sourceFrames = Array.from(
    sourceRoot.querySelectorAll<HTMLIFrameElement>('[data-copy-role="html-preview"] iframe'),
  );
  const cloneFrames = Array.from(
    cloneRoot.querySelectorAll<HTMLIFrameElement>('[data-copy-role="html-preview"] iframe'),
  );

  await Promise.all(
    sourceFrames.map(async (sourceFrame, index) => {
      const cloneFrame = cloneFrames[index];
      if (!cloneFrame) return;

      const sourceHtml = getHtmlPreviewCaptureSource(sourceFrame);
      const replacement = createHtmlSourceCopySection(sourceHtml, '16px 0');
      const copyBlock = cloneFrame.closest('[data-copy-role="html-preview"]');
      const replaceTarget =
        copyBlock?.parentElement?.tagName.toLowerCase() === 'pre'
          ? copyBlock.parentElement
          : copyBlock;
      replaceTarget?.replaceWith(replacement);
    }),
  );
};

const wrapStandaloneHtml = (
  html: string,
  title: string = 'Mira Open',
  theme: PreviewTheme = 'light',
) => {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtmlAttribute(title)}</title>
<style>${buildStandaloneThemeCss(theme)}</style>
</head>
<body>
<main class="container">
${html}
</main>
</body>
</html>`;
};

const buildStandaloneRawHtml = (html: string, theme: PreviewTheme) => {
  const trimmed = html.trim();
  if (!trimmed) return wrapStandaloneHtml('', 'Mira Open', theme);

  const hasDocType = /^<!doctype\s+html[\s>]/i.test(trimmed);
  const hasHtmlTag = /^<html[\s>]/i.test(trimmed);
  if (hasDocType || hasHtmlTag) {
    return injectThemeBridgeIntoHtmlDocument(trimmed, theme);
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Mira Open</title>
<style>html,body{margin:0;padding:0;}</style>
${buildHtmlPreviewThemeBridge(theme)}
</head>
<body>
${html}
</body>
</html>`;
};

const finalizeStandaloneMermaidSvg = (staticSvg: SVGSVGElement, idPrefix: string) => {
  const rect = getSvgLogicalRect(staticSvg);
  if (!isUsableSvgRect(rect)) return null;

  const width = Math.max(1, Math.ceil(rect.width));
  const height = Math.max(1, Math.ceil(rect.height));
  stabilizeStandaloneSvgIds(staticSvg, idPrefix);
  staticSvg.setAttribute(PRESERVE_LAYOUT_ATTR, 'true');
  staticSvg.setAttribute('width', String(width));
  staticSvg.setAttribute('height', String(height));
  staticSvg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
  staticSvg.style.removeProperty('max-width');
  staticSvg.style.setProperty('display', 'block');
  staticSvg.style.setProperty('width', '100%');
  staticSvg.style.setProperty('max-width', `${width}px`);
  staticSvg.style.setProperty('height', 'auto');
  staticSvg.style.setProperty('aspect-ratio', `${width} / ${height}`);
  staticSvg.style.setProperty('margin', '0 auto');

  return { svg: staticSvg, width };
};

const parseStandaloneMermaidSvgMarkup = (svgMarkup: string) => {
  const template = document.createElement('template');
  template.innerHTML = svgMarkup.trim();
  return template.content.querySelector<SVGSVGElement>('svg');
};

const createStandaloneMermaidSvg = (
  svg: SVGSVGElement,
  theme: PreviewTheme,
  idPrefix: string,
) => {
  const normalized = normalizeMermaidSvg(svg.outerHTML, theme);
  const staticSvg = parseStandaloneMermaidSvgMarkup(normalized);
  return staticSvg ? finalizeStandaloneMermaidSvg(staticSvg, idPrefix) : null;
};

const createFallbackStandaloneMermaidSvg = (svg: SVGSVGElement, idPrefix: string) =>
  finalizeStandaloneMermaidSvg(svg.cloneNode(true) as SVGSVGElement, idPrefix);

const flattenStandaloneMermaidBlocks = (clone: HTMLElement, theme: PreviewTheme) => {
  const blocks = Array.from(
    clone.querySelectorAll<HTMLElement>('[data-copy-role="mermaid-block"]'),
  );
  const palette = getMermaidThemePalette(theme);
  const frameBackground = theme === 'dark' ? '#1e293b' : '#ffffff';
  const canvasBackground = theme === 'dark' ? palette.background : '#ffffff';

  blocks.forEach((block, index) => {
    const svg = Array.from(block.querySelectorAll<SVGElement>('svg')).find(isMermaidSvg);
    if (!svg) return;
    const idPrefix = `artifact-mermaid-${index + 1}-`;
    let standalone: ReturnType<typeof createStandaloneMermaidSvg> = null;
    try {
      standalone = createStandaloneMermaidSvg(svg, theme, idPrefix);
    } catch {
      standalone = null;
    }

    if (!standalone) {
      try {
        standalone = createFallbackStandaloneMermaidSvg(svg, idPrefix);
      } catch {
        standalone = null;
      }
    }

    if (!standalone) return;

    try {
      const frame = document.createElement('div');
      frame.setAttribute(PRESERVE_LAYOUT_ATTR, 'true');
      frame.style.cssText = [
        'margin:16px 0',
        'padding:16px',
        `background:${frameBackground}`,
        'border-radius:6px',
        'overflow:auto',
        'box-sizing:border-box',
      ].join(';');

      const canvas = document.createElement('div');
      canvas.setAttribute(PRESERVE_LAYOUT_ATTR, 'true');
      canvas.style.cssText = [
        'width:100%',
        'margin:0 auto',
        `background:${canvasBackground}`,
        'border-radius:4px',
        'box-sizing:border-box',
      ].join(';');

      canvas.appendChild(standalone.svg);
      frame.appendChild(canvas);

      const replaceTarget = svg.closest('.mermaid-container') ?? svg.parentElement;
      replaceTarget?.replaceWith(frame);
    } catch {
      // leave original svg if normalization fails
    }
    Array.from(block.attributes).forEach((attr) => {
      if (attr.name.startsWith('data-copy-')) {
        block.removeAttribute(attr.name);
      }
    });
  });
};

const preparePortablePreviewClone = async (
  sourceRoot: HTMLElement,
  theme: PreviewTheme,
) => {
  await waitForHtmlPreviewFrames(sourceRoot);
  const clone = sourceRoot.cloneNode(true) as HTMLElement;

  appendInlineStyles(sourceRoot, clone);
  await expandHtmlPreviews(sourceRoot, clone);
  flattenStandaloneMermaidBlocks(clone, theme);
  cleanupPortableHtml(clone);

  return clone;
};

const buildStandaloneHtml = async (
  sourceRoot: HTMLElement,
  theme: PreviewTheme,
): Promise<string> => {
  const clone = await preparePortablePreviewClone(sourceRoot, theme);
  return wrapStandaloneHtml(clone.innerHTML, 'Mira Open', theme);
};

// A component to render a single Mermaid diagram with independent zoom controls
const MermaidDiagram: React.FC<{
  code: string;
  theme: PreviewTheme;
  onSvgReady?: (svg: string) => void;
}> = ({ code, theme, onSvgReady }) => {
  const [svgContent, setSvgContent] = useState<string>('');
  const [svgTheme, setSvgTheme] = useState<PreviewTheme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scale, setScale] = useState(MERMAID_DEFAULT_SCALE);
  const onSvgReadyRef = useRef(onSvgReady);
  const blockRef = useRef<HTMLDivElement>(null);
  const renderCode = useMemo(() => normalizeMermaidSourceForRender(code), [code]);
  const latestRenderRef = useRef({ code: renderCode, theme });
  const isVisibleRef = useRef(false);
  const svgContentRef = useRef('');
  const canvasWidth = useMemo(
    () => getMermaidDisplayWidth(renderCode, svgContent),
    [renderCode, svgContent],
  );
  const clampScale = (v: number) => Math.max(0.5, Math.min(3, v));
  latestRenderRef.current = { code: renderCode, theme };

  useEffect(() => {
    onSvgReadyRef.current = onSvgReady;
  }, [onSvgReady]);

  useEffect(() => {
    svgContentRef.current = svgContent;
  }, [svgContent]);

  const applyRenderedSvg = useCallback((svg: string, renderedTheme: PreviewTheme) => {
    const cleanedSvg = normalizeMermaidSvg(svg, renderedTheme);
    setSvgContent(cleanedSvg);
    setSvgTheme(renderedTheme);
    setError(null);
    onSvgReadyRef.current?.(cleanedSvg);
  }, []);

  const requestRender = useCallback(
    async (priority: 'high' | 'normal' | 'low' = 'normal') => {
      const requestedCode = renderCode;
      const requestedTheme = theme;
      try {
        const svg = await renderMermaidSvg({
          code: requestedCode,
          theme: requestedTheme,
          priority,
        });
        const latest = latestRenderRef.current;
        if (latest.code !== requestedCode || latest.theme !== requestedTheme) return;
        applyRenderedSvg(svg, requestedTheme);
        void prewarmAlternateMermaidTheme({ code: requestedCode, theme: requestedTheme });
      } catch (e) {
        const latest = latestRenderRef.current;
        if (latest.code !== requestedCode || latest.theme !== requestedTheme) return;
        setError(e instanceof Error ? e.message : 'Syntax error');
      }
    },
    [applyRenderedSvg, renderCode, theme],
  );

  useEffect(() => {
    const cachedSvg = getCachedMermaidSvg({ code: renderCode, theme });
    if (cachedSvg) {
      applyRenderedSvg(cachedSvg, theme);
      void prewarmAlternateMermaidTheme({ code: renderCode, theme });
      return;
    }

    if (!svgContentRef.current) {
      setError(null);
      void requestRender(isVisibleRef.current ? 'high' : 'normal');
    } else {
      setError(null);
      void requestRender(isVisibleRef.current ? 'high' : 'low');
    }
  }, [applyRenderedSvg, renderCode, requestRender, theme]);

  useLayoutEffect(() => {
    svgContentRef.current = '';
    setSvgContent('');
    setSvgTheme(null);
    setError(null);
  }, [renderCode]);

  useEffect(() => {
    const block = blockRef.current;
    if (!block || typeof IntersectionObserver === 'undefined') {
      isVisibleRef.current = true;
      void requestRender('high');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        isVisibleRef.current = isVisible;
        if (isVisible) {
          void requestRender('high');
        }
      },
      { rootMargin: '360px 0px' },
    );
    observer.observe(block);
    return () => observer.disconnect();
  }, [requestRender]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void requestRender('low');
    }, MERMAID_BACKGROUND_RENDER_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [requestRender]);

  useEffect(() => {
    const handleRenderRequest = () => {
      void requestRender('high');
    };
    window.addEventListener(MERMAID_RENDER_REQUEST_EVENT, handleRenderRequest);
    return () => window.removeEventListener(MERMAID_RENDER_REQUEST_EVENT, handleRenderRequest);
  }, [requestRender]);

  useEffect(() => {
    const cachedAlternateSvg = getCachedMermaidSvg({
      code: renderCode,
      theme: theme === 'dark' ? 'light' : 'dark',
    });
    if (!cachedAlternateSvg) {
      void prewarmAlternateMermaidTheme({ code: renderCode, theme });
    }
  }, [renderCode, theme]);

  useEffect(() => {
    if (svgTheme === theme) {
      const cachedAlternateSvg = getCachedMermaidSvg({
        code: renderCode,
        theme: theme === 'dark' ? 'light' : 'dark',
      });
      if (!cachedAlternateSvg) {
        void prewarmAlternateMermaidTheme({ code: renderCode, theme });
      }
    }
  }, [renderCode, svgTheme, theme]);

  useEffect(() => {
    setScale(MERMAID_DEFAULT_SCALE);
  }, [renderCode]);

  const handleDownloadSVG = () => {
    if (!svgContent) return;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mermaid-diagram-${Date.now()}.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadPNG = async () => {
    if (!svgContent) return;

    try {
      const svg = Array.from(blockRef.current?.querySelectorAll<SVGElement>('svg') ?? []).find(isMermaidSvg);
      const capture = await svgToPngCapture(svg ?? svgContent);
      const pngUrl = URL.createObjectURL(capture.blob);
      const a = document.createElement('a');
      a.href = pngUrl;
      a.download = `mermaid-diagram-${Date.now()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(pngUrl);
    } catch (err) {
      console.error('Failed to download Mermaid PNG:', err);
    }
  };

  if (error) {
    return (
      <div
        className="p-4 bg-red-50 text-red-700 font-mono text-xs rounded border border-red-200 overflow-auto"
        data-copy-role="mermaid-block"
        data-mermaid-ready="error"
      >
        Error: {error}
      </div>
    );
  }

  return (
    <div
      ref={blockRef}
      className="my-4 border border-slate-200 bg-white"
      data-copy-role="mermaid-block"
      data-mermaid-ready={svgContent && svgTheme === theme ? 'ready' : 'pending'}
      data-mermaid-theme={svgTheme ?? ''}
    >
      <div
        className="bg-slate-50 px-3 py-2 border-b border-slate-200 flex items-center justify-between"
        data-copy-remove="true"
      >
        <div className="flex items-center gap-1">
          <button
            onClick={() => setScale((s) => clampScale(s + 0.1))}
            disabled={scale >= 3}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors text-slate-700"
            title="放大"
          >
            <ZoomIn size={14} />
          </button>
          <button
            onClick={() => setScale((s) => clampScale(s - 0.1))}
            disabled={scale <= 0.5}
            className="p-1 rounded hover:bg-slate-200 disabled:opacity-30 transition-colors text-slate-700"
            title="缩小"
          >
            <ZoomOut size={14} />
          </button>
          <button
            onClick={() => setScale(1)}
            className="p-1 rounded hover:bg-slate-200 transition-colors text-slate-700"
            title="重置"
          >
            <RotateCcw size={12} />
          </button>
          <span className="text-xs text-slate-600 font-mono min-w-[36px] text-center">
            {Math.round(scale * 100)}%
          </span>
        </div>
        <div className="flex items-center space-x-2">
          <button
            onClick={handleDownloadSVG}
            className="flex items-center space-x-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 rounded text-xs text-slate-600 transition-colors border border-slate-200"
            title="Download SVG"
          >
            <Download size={14} />
            <span>SVG</span>
          </button>
          <button
            onClick={handleDownloadPNG}
            className="flex items-center space-x-1 px-2 py-1 bg-indigo-50 hover:bg-indigo-100 rounded text-xs text-indigo-700 transition-colors border border-indigo-200"
            title="Download PNG"
          >
            <ImageIcon size={14} />
            <span>PNG</span>
          </button>
        </div>
      </div>
      <ZoomableWrapper
        scale={scale}
        fullWidth
        className="mermaid-container flex justify-start p-4 [&_svg]:h-auto"
      >
        {!svgContent ? (
          <div className="flex items-center justify-center w-full">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        ) : (
          <div
            className="mermaid-diagram-canvas"
            style={{ width: `${canvasWidth}px` }}
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        )}
      </ZoomableWrapper>
    </div>
  );
};

// A component to render JSON
const JsonViewer: React.FC<{ code: string; onFormatted?: (formatted: string) => void }> = ({
  code,
  onFormatted,
}) => {
  let parsed: any;
  let formatted = code;
  let error = null;
  try {
    parsed = JSON5.parse(code);
    formatted = JSON.stringify(parsed, null, 2);
  } catch (e) {
    error = e instanceof Error ? e.message : 'Invalid JSON';
  }

  useEffect(() => {
    if (!error) {
      onFormatted?.(formatted);
    }
  }, [formatted, error, onFormatted]);

  if (error) {
    return (
      <div className="my-4">
        <div className="p-2 bg-red-50 text-red-700 font-mono text-sm rounded-t border border-red-200 border-b-0">
          JSON Parse Error: {error}
        </div>
        <SyntaxHighlighter
          language="json"
          style={vscDarkPlus}
          className="!m-0 !rounded-t-none !rounded-b"
          customStyle={{ fontSize: '14px' }}
          wrapLongLines
        >
          {code}
        </SyntaxHighlighter>
      </div>
    );
  }

  return (
    <div className="my-4 rounded border border-slate-200 shadow-sm" data-copy-role="json-block">
      <div
        className="bg-slate-800 px-4 py-1 text-sm text-slate-400 font-mono flex items-center"
        data-copy-remove="true"
      >
        <span>JSON</span>
      </div>
      <SyntaxHighlighter
        language="json"
        style={vscDarkPlus}
        className="!m-0 !rounded-none"
        customStyle={{ fontSize: '14px' }}
        wrapLongLines
      >
        {formatted}
      </SyntaxHighlighter>
    </div>
  );
};

// Script injected into HtmlPreview iframe to report content dimensions via postMessage.
// Uses a unique ID (replaced at injection time) so multiple previews on one page don't collide.
const HEIGHT_REPORTER_SCRIPT = (id: string) => `
<script>
(function() {
  var resolveMeasuredHtmlPreviewExtent = ${resolveMeasuredHtmlPreviewExtent.toString()};
  var anchor = document.querySelector('[data-html-preview-anchor="${id}"]');
  var reportTimer = null;
  var rafPending = false;
  var lastReportedHeight = 0;
  var measureContentHeight = function() {
    var body = document.body;
    var html = document.documentElement;
    if (!body || !html) return 0;
    var bodyRect = body.getBoundingClientRect();
    var htmlRect = html.getBoundingClientRect();
    var originTop = Math.min(bodyRect.top, htmlRect.top, 0);
    var maxBottom = Math.max(bodyRect.top, htmlRect.top);
    var nodes = body.querySelectorAll('*');
    for (var i = 0; i < nodes.length; i += 1) {
      var node = nodes[i];
      if (node === anchor || node.tagName === 'SCRIPT') continue;
      var rect = node.getBoundingClientRect();
      if (!rect || (rect.width === 0 && rect.height === 0)) continue;
      maxBottom = Math.max(maxBottom, rect.bottom);
    }
    if (anchor) {
      var anchorRect = anchor.getBoundingClientRect();
      maxBottom = Math.max(maxBottom, anchorRect.top);
    }
    var bodyStyle = window.getComputedStyle(body);
    var paddingBottom = parseFloat(bodyStyle.paddingBottom) || 0;
    return Math.max(0, Math.ceil(maxBottom - originTop + paddingBottom));
  };
  var getSize = function() {
    var body = document.body;
    var html = document.documentElement;
    if (!body || !html) return null;
    var bodyRect = body.getBoundingClientRect();
    var htmlRect = html.getBoundingClientRect();
    var height = resolveMeasuredHtmlPreviewExtent({
      contentExtent: measureContentHeight(),
      scrollExtent: Math.max(body.scrollHeight, html.scrollHeight),
      rectExtent: Math.max(bodyRect.height, htmlRect.height),
      viewportExtent: window.innerHeight,
      minExtent: 200
    });
    return { height: height };
  };
  var reportSize = function() {
    var size = getSize();
    if (!size) return;
    if (lastReportedHeight > 0 && Math.abs(size.height - lastReportedHeight) <= 1) return;
    lastReportedHeight = size.height;
    parent.postMessage({
      type: 'html-preview-size',
      id: '${id}',
      height: size.height
    }, '*');
  };
  var scheduleReport = function() {
    if (rafPending) return;
    rafPending = true;
    var raf = window.requestAnimationFrame || function(callback) { return setTimeout(callback, 16); };
    raf(function() {
      rafPending = false;
      if (reportTimer) clearTimeout(reportTimer);
      reportTimer = setTimeout(function() {
        reportTimer = null;
        reportSize();
      }, 80);
    });
  };
  var bindImageLoadReports = function() {
    var images = document.querySelectorAll('img');
    for (var i = 0; i < images.length; i += 1) {
      var image = images[i];
      if (image.dataset.htmlPreviewSizeBound === 'true') continue;
      image.dataset.htmlPreviewSizeBound = 'true';
      if (image.complete) continue;
      image.addEventListener('load', scheduleReport, { once: true });
      image.addEventListener('error', scheduleReport, { once: true });
    }
  };
  var ro = new ResizeObserver(scheduleReport);
  ro.observe(document.body);
  ro.observe(document.documentElement);
  var mo = new MutationObserver(function() {
    bindImageLoadReports();
    scheduleReport();
  });
  mo.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['class', 'height', 'src', 'style', 'width']
  });
  bindImageLoadReports();
  reportSize();
  window.addEventListener('load', scheduleReport, { once: true });
  if (document.fonts && document.fonts.ready) {
    document.fonts.ready.then(scheduleReport).catch(function() {});
  }
})();
</script>`;

// Wrap user HTML with resource isolation
const wrapHtmlPreview = (rawCode: string, id: string, theme: PreviewTheme): string => {
  const trimmed = rawCode.trim();
  const hasDocType = /^<!doctype\s+html/i.test(trimmed);
  const hasHtmlTag = /^<html[\s>]/i.test(trimmed);
  const reporterAnchor = `<div data-html-preview-anchor="${id}" aria-hidden="true" style="display:block;height:0;overflow:hidden"></div>`;
  const reporter = `${reporterAnchor}${HEIGHT_REPORTER_SCRIPT(id)}`;
  const themeBridge = buildHtmlPreviewThemeBridge(theme);

  if (hasDocType || hasHtmlTag) {
    let result = trimmed;
    if (/<head[\s>]/i.test(result)) {
      result = result.replace(/(<head[^>]*>)/i, `$1<base href="about:blank">${themeBridge}`);
    } else {
      result = result.replace(
        /(<html[^>]*>)/i,
        `$1<head><base href="about:blank">${themeBridge}</head>`,
      );
    }
    // Inject height reporter before </body>
    if (/<\/body>/i.test(result)) {
      result = result.replace(/<\/body>/i, reporter + '</body>');
    } else {
      result += reporter;
    }
    return result;
  }

  return `<!DOCTYPE html><html><head><base href="about:blank"><meta charset="UTF-8">${themeBridge}</head><body>${rawCode}${reporter}</body></html>`;
};

// A component to render HTML in an isolated iframe.
// Height is reported by the iframe content via postMessage — no contentDocument access needed,
// so we can keep the sandbox restrictive (no allow-same-origin).
// Each instance gets a stable random ID so multiple previews on one page don't collide.
const HtmlPreview: React.FC<{ code: string; theme: PreviewTheme }> = ({ code, theme }) => {
  const id = useMemo(() => Math.random().toString(36).slice(2, 8), []);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const settleTimerRef = useRef<number | null>(null);
  const loadFallbackTimerRef = useRef<number | null>(null);
  const pendingHeightRef = useRef<number | null>(null);
  const committedHeightRef = useRef(HTML_PREVIEW_MIN_HEIGHT);
  const hasSettledHeightRef = useRef(false);
  const [previewHeight, setPreviewHeight] = useState(HTML_PREVIEW_MIN_HEIGHT);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [hasSettledHeight, setHasSettledHeight] = useState(false);
  const wrappedCode = useMemo(() => wrapHtmlPreview(code, id, theme), [code, id, theme]);
  const isIframeReady = iframeLoaded && hasSettledHeight;

  const clearSettleTimer = useCallback(() => {
    if (settleTimerRef.current) {
      window.clearTimeout(settleTimerRef.current);
      settleTimerRef.current = null;
    }
  }, []);

  const clearLoadFallbackTimer = useCallback(() => {
    if (loadFallbackTimerRef.current) {
      window.clearTimeout(loadFallbackTimerRef.current);
      loadFallbackTimerRef.current = null;
    }
  }, []);

  const normalizePreviewHeight = useCallback((height: number) => {
    if (!Number.isFinite(height)) return HTML_PREVIEW_MIN_HEIGHT;
    return Math.min(
      HTML_PREVIEW_MAX_HEIGHT,
      Math.max(HTML_PREVIEW_MIN_HEIGHT, Math.ceil(height)),
    );
  }, []);

  const queueSettledHeight = useCallback(
    (height: number) => {
      pendingHeightRef.current = normalizePreviewHeight(height);
      clearSettleTimer();
      settleTimerRef.current = window.setTimeout(() => {
        settleTimerRef.current = null;
        const nextHeight = pendingHeightRef.current ?? HTML_PREVIEW_MIN_HEIGHT;
        pendingHeightRef.current = null;
        const shouldCommit =
          !hasSettledHeightRef.current ||
          Math.abs(nextHeight - committedHeightRef.current) > HTML_PREVIEW_HEIGHT_EPSILON;

        if (shouldCommit) {
          committedHeightRef.current = nextHeight;
          setPreviewHeight(nextHeight);
        }

        if (!hasSettledHeightRef.current) {
          hasSettledHeightRef.current = true;
          setHasSettledHeight(true);
        }
      }, HTML_PREVIEW_SETTLE_MS);
    },
    [clearSettleTimer, normalizePreviewHeight],
  );

  useEffect(() => {
    clearSettleTimer();
    clearLoadFallbackTimer();
    pendingHeightRef.current = null;
    committedHeightRef.current = HTML_PREVIEW_MIN_HEIGHT;
    hasSettledHeightRef.current = false;
    setIframeLoaded(false);
    setHasSettledHeight(false);
    setPreviewHeight(HTML_PREVIEW_MIN_HEIGHT);
  }, [clearLoadFallbackTimer, clearSettleTimer, wrappedCode]);

  useEffect(() => {
    const handleMessage = (e: MessageEvent) => {
      if (e.source !== iframeRef.current?.contentWindow) return;
      if (e.origin !== 'null' && e.origin !== window.location.origin) return;
      if (
        e.data?.type === 'html-preview-size' &&
        e.data.id === id &&
        typeof e.data.height === 'number'
      ) {
        queueSettledHeight(e.data.height);
      }
      if (e.data?.type === 'html-preview-height' && e.data.id === id && typeof e.data.height === 'number') {
        queueSettledHeight(e.data.height);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [id, queueSettledHeight]);

  useEffect(
    () => () => {
      clearSettleTimer();
      clearLoadFallbackTimer();
    },
    [clearLoadFallbackTimer, clearSettleTimer],
  );

  useEffect(() => {
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'html-preview-theme', theme },
      '*',
    );
  }, [theme, iframeLoaded]);

  const handleIframeLoad = useCallback(() => {
    setIframeLoaded(true);
    clearLoadFallbackTimer();
    loadFallbackTimerRef.current = window.setTimeout(() => {
      loadFallbackTimerRef.current = null;
      if (!hasSettledHeightRef.current) {
        queueSettledHeight(HTML_PREVIEW_MIN_HEIGHT);
      }
    }, HTML_PREVIEW_SETTLE_MS * 3);
  }, [clearLoadFallbackTimer, queueSettledHeight]);

  return (
    <div
      className="my-4 border border-slate-200 bg-white flex flex-col"
      data-copy-role="html-preview"
    >
      <div
        className="bg-slate-50 px-3 py-1.5 text-xs text-slate-600 font-mono flex items-center shrink-0 border-b border-slate-200"
        data-copy-remove="true"
      >
        <span>HTML Preview</span>
      </div>
      <div
        className="relative w-full overflow-hidden bg-white"
        style={{ height: `${previewHeight}px` }}
      >
        {!isIframeReady && (
          <div className="absolute inset-0 flex items-center justify-center bg-white z-10">
            <Loader2 size={20} className="animate-spin text-indigo-400" />
          </div>
        )}
        <iframe
          ref={iframeRef}
          srcDoc={wrappedCode}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          className={`w-full h-full border-none bg-white transition-opacity duration-300 ${
            isIframeReady ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            width: '100%',
            height: '100%',
          }}
          onLoad={handleIframeLoad}
        />
      </div>
    </div>
  );
};

const MermaidPreviewBlock: React.FC<{
  code: string;
  onSvgReady?: (svg: string) => void;
}> = ({ code, onSvgReady }) => {
  const theme = React.useContext(PreviewThemeContext);
  return <MermaidDiagram code={code} theme={theme} onSvgReady={onSvgReady} />;
};

const HtmlPreviewBlock: React.FC<{ code: string }> = ({ code }) => {
  const theme = React.useContext(PreviewThemeContext);
  return <HtmlPreview code={code} theme={theme} />;
};

const ArtifactPreview: React.FC<ArtifactPreviewProps> = ({
  code,
  stateResetKey = code,
  onError,
  isCollapsed = false,
  isMobile,
  onToggleSidebar,
}) => {
  const currentTheme: PreviewTheme = 'light';
  const [exportAction, setExportAction] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [mermaidCount, setMermaidCount] = useState(0);
  const [mermaidDomTotal, setMermaidDomTotal] = useState(0);
  const [isRendering, setIsRendering] = useState(true);
  const previewRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const contentType = detectContentType(code);
  const jsonFormattedRef = useRef<string>('');
  const renderTimeoutRef = useRef<number | null>(null);
  const feedbackVersionRef = useRef(0);

  const refreshMermaidCount = useCallback(() => {
    window.requestAnimationFrame(() => {
      const summary = previewRef.current ? getMermaidRenderStatus(previewRef.current) : null;
      setMermaidCount(summary ? getMermaidCompleteCount(summary) : 0);
      setMermaidDomTotal(summary?.total ?? 0);
    });
  }, []);

  // Pre-process the code to auto-detect pure JSON or pure Mermaid if not wrapped
  const preprocessCode = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return '';

    // Check if pure JSON
    if (
      (trimmed.startsWith('{') && trimmed.endsWith('}')) ||
      (trimmed.startsWith('[') && trimmed.endsWith(']'))
    ) {
      try {
        JSON5.parse(trimmed);
        return `\`\`\`json\n${input}\n\`\`\``;
      } catch {
        // Not valid JSON
      }
    }

    if (hasMultipleFencedCodeBlocks(trimmed)) {
      return input;
    }

    // Check if pure HTML document or fragment
    if (looksLikeHtml(trimmed)) {
      return `\`\`\`html-preview\n${input}\n\`\`\``;
    }

    // Check if pure Mermaid
    const mermaidKeywords = [
      'graph',
      'flowchart',
      'sequenceDiagram',
      'classDiagram',
      'stateDiagram',
      'stateDiagram-v2',
      'erDiagram',
      'gantt',
      'pie',
      'journey',
      'mindmap',
      'timeline',
      'gitGraph',
      'architecture',
      'architecture-beta',
      'quadrantChart',
      'xychart-beta',
      'sankey-beta',
      'treemap',
      'venn-beta',
      'requirementDiagram',
      'kanban',
      'ishikawa-beta',
      'block-beta',
      'block',
      'packet-beta',
      'C4Context',
      'C4Container',
      'C4Component',
      'C4Dynamic',
      'C4Deployment',
    ];
    const firstWord = trimmed.split(/\s+/)[0];
    if (mermaidKeywords.includes(firstWord)) {
      return `\`\`\`mermaid\n${input}\n\`\`\``;
    }

    return input;
  };

  const processedCode = useMemo(() => preprocessCode(code), [code]);
  const isMermaidLoading = mermaidDomTotal > 0 && mermaidCount < mermaidDomTotal;
  const showLoadingOverlay = Boolean(processedCode && isRendering);

  const ensureMermaidRendered = useCallback(async () => {
    if (!previewRef.current) return;
    window.dispatchEvent(new Event(MERMAID_RENDER_REQUEST_EVENT));
    const start = Date.now();
    let lastLogged = 0;
    while (true) {
      const { pending, total, ready, error } = getMermaidRenderStatus(previewRef.current, currentTheme);
      if (pending === 0) return;
      const elapsed = Date.now() - start;
      if (elapsed > MERMAID_READY_TIMEOUT_MS) {
        console.warn(
          `Mermaid render timeout after ${elapsed}ms: ${pending}/${total} pending, ${ready} ready, ${error} error`,
        );
        throw new Error(
          `Mermaid render timeout: ${pending} diagram(s) still pending after ${Math.round(elapsed / 1000)}s`,
        );
      }
      if (elapsed - lastLogged > 2000) {
        console.info(`Mermaid render progress: ${ready + error}/${total} complete, ${pending} pending`);
        lastLogged = elapsed;
      }
      await waitForDelay(100);
    }
  }, [currentTheme]);

  // Show loading immediately when content changes, hide after render settles
  useEffect(() => {
    setIsRendering(true);
    const renderStartTime = Date.now();
    if (renderTimeoutRef.current) {
      clearTimeout(renderTimeoutRef.current);
    }
    // Allow browser to paint loading state before heavy rendering
    renderTimeoutRef.current = window.setTimeout(() => {
      // Double rAF to ensure React has painted content
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const elapsed = Date.now() - renderStartTime;
          const minDisplayMs = 250;
          if (elapsed >= minDisplayMs) {
            setIsRendering(false);
          } else {
            renderTimeoutRef.current = window.setTimeout(() => {
              setIsRendering(false);
            }, minDisplayMs - elapsed);
          }
        });
      });
    }, 200);
    return () => {
      if (renderTimeoutRef.current) {
        clearTimeout(renderTimeoutRef.current);
      }
    };
  }, [processedCode]);

  // We clear global error because individual blocks handle their own errors
  useEffect(() => {
    onError(null);
  }, [processedCode, onError]);

  useEffect(() => {
    feedbackVersionRef.current += 1;
  }, [stateResetKey]);

  useEffect(() => {
    feedbackVersionRef.current += 1;
    setMermaidCount(0);
    setMermaidDomTotal(0);
    setCopied(false);
    setExportAction(null);
    const timers = [
      window.setTimeout(refreshMermaidCount, 200),
      window.setTimeout(refreshMermaidCount, 800),
      window.setTimeout(refreshMermaidCount, 1600),
    ];
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, [processedCode, currentTheme, refreshMermaidCount]);

  useLayoutEffect(() => {
    if (!previewRef.current) return;
    adaptHtmlFragmentTextColors(previewRef.current, currentTheme);
  }, [currentTheme, processedCode]);

  const handleCopy = async () => {
    if (!code.trim() || contentType !== 'json') return;
    const feedbackVersion = feedbackVersionRef.current;
    try {
      if (jsonFormattedRef.current) {
        await copyPlainText(jsonFormattedRef.current);
      }
      if (feedbackVersionRef.current !== feedbackVersion) return;
      setCopied(true);
      setTimeout(() => {
        if (feedbackVersionRef.current === feedbackVersion) {
          setCopied(false);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const buildCurrentStandaloneHtml = useCallback(async () => {
    if (!previewRef.current) throw new Error('Preview is not ready');

    await ensureMermaidRendered();
    return contentType === 'html'
      ? buildStandaloneRawHtml(code, currentTheme)
      : buildStandaloneHtml(previewRef.current, currentTheme);
  }, [code, contentType, currentTheme, ensureMermaidRendered]);

  const handleExportHtmlFile = async () => {
    if (!previewRef.current) return;
    const feedbackVersion = feedbackVersionRef.current;
    try {
      const html = await buildCurrentStandaloneHtml();
      const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'mira-open.html';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.setTimeout(() => URL.revokeObjectURL(url), 5000);
      if (feedbackVersionRef.current !== feedbackVersion) return;
      setExportAction('download');
      setTimeout(() => {
        if (feedbackVersionRef.current === feedbackVersion) {
          setExportAction(null);
        }
      }, 2000);
    } catch (err) {
      console.error('Failed to export HTML file:', err);
    }
  };

  const isExporting = exportAction === 'download';

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-slate-50">
      <div
        className="shrink-0 border-b border-slate-200 bg-slate-100 z-10 shadow-sm"
      >
        <div className="flex min-h-12 items-center justify-between px-4">
          <div className="flex items-center space-x-3">
            {onToggleSidebar && (
              <button
                onClick={onToggleSidebar}
                className="flex items-center justify-center w-7 h-7 rounded text-xs font-medium transition-colors text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                title={isCollapsed ? '展开编辑器' : '收起编辑器'}
              >
                {isMobile
                  ? (isCollapsed ? <PanelTopOpen size={14} /> : <PanelTopClose size={14} />)
                  : (isCollapsed ? <Sidebar size={14} /> : <PanelLeftClose size={14} />)}
              </button>
            )}
            <span className="text-sm font-semibold text-slate-600 uppercase tracking-wider">
              Preview
            </span>
          </div>
          <div className="flex min-w-0 items-center justify-end gap-2 overflow-x-auto py-2">
            {contentType === 'json' && (
              <button
                onClick={handleCopy}
                disabled={!processedCode || copied}
                className={`flex shrink-0 items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                  copied
                    ? 'bg-green-50 text-green-700 border-green-200'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                } disabled:opacity-40`}
                title={copied ? '已复制' : '复制 JSON'}
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
                <span className="hidden md:inline">{copied ? '已复制' : '复制 JSON'}</span>
              </button>
            )}
            <button
              onClick={handleExportHtmlFile}
              disabled={!processedCode || isExporting}
              className={`flex shrink-0 items-center gap-1 px-3 py-1.5 rounded text-xs font-medium transition-colors border ${
                exportAction === 'download'
                  ? 'bg-green-50 text-green-700 border-green-200'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100 hover:text-slate-900'
              } disabled:opacity-40`}
              title={exportAction === 'download' ? '已导出' : '导出 HTML 文件'}
            >
              {exportAction === 'download' ? <Check size={14} /> : <FileDown size={14} />}
              <span className="hidden md:inline">{exportAction === 'download' ? '已导出' : '导出 HTML'}</span>
            </button>
          </div>
        </div>
      </div>
      <div
        ref={scrollContainerRef}
        className="relative min-h-0 flex-1 overflow-auto"
      >
        <div
          className={`absolute inset-0 z-20 flex flex-col items-center justify-center bg-slate-50 transition-opacity duration-300 ease-in-out ${
            showLoadingOverlay ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
        >
          <Loader2 size={28} className="animate-spin text-indigo-600 mb-3" />
          <span className="text-sm text-slate-500 font-medium">
            {isMermaidLoading ? `渲染 Mermaid ${mermaidCount}/${mermaidDomTotal}` : '渲染中...'}
          </span>
        </div>
        <div className="w-full p-8">
          <div
            ref={previewRef}
            className="prose prose-slate w-full max-w-none overflow-x-auto rounded-xl border border-slate-200 bg-white p-8 shadow-sm prose-strong:font-bold prose-strong:text-slate-900"
          >
            <PreviewThemeContext.Provider value={currentTheme}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={useMemo(
                  () => ({
                    p: (props: any) => {
                      const { node, ...rest } = props;
                      void node;
                      return <div className="mb-4 leading-relaxed" {...rest} />;
                    },
                    div: (props: any) => {
                      const { node, ...rest } = props;
                      void node;
                      return <div {...rest} />;
                    },
                    code({ className, children, ...props }: any) {
                      const match = /language-([a-zA-Z0-9_-]+)/.exec(className || '');
                      const language = match ? match[1].toLowerCase() : '';
                      const content = String(children).replace(/\n$/, '');

                      // If it has a language match, it's a code block. Otherwise, treat as inline code.
                      // (react-markdown v9+ removed the 'inline' prop)
                      const isBlock = Boolean(match);

                      if (isBlock && language === 'mermaid') {
                        return (
                          <MermaidPreviewBlock
                            code={content}
                            onSvgReady={() => {
                              window.requestAnimationFrame(refreshMermaidCount);
                            }}
                          />
                        );
                      }

                      if (isBlock && language === 'json') {
                        return (
                          <JsonViewer
                            code={content}
                            onFormatted={(formatted) => {
                              jsonFormattedRef.current = formatted;
                            }}
                          />
                        );
                      }

                      if (isBlock && HTML_PREVIEW_LANGUAGES.has(language)) {
                        return <HtmlPreviewBlock code={content} />;
                      }

                      return isBlock ? (
                        <pre {...props}>
                          <code>{content}</code>
                        </pre>
                      ) : (
                        <code
                          {...props}
                        >
                          {children}
                        </code>
                      );
                    },
                  }),
                  [refreshMermaidCount],
                )}
              >
                {processedCode}
              </ReactMarkdown>
            </PreviewThemeContext.Provider>
            {!processedCode && (
              <div className="text-slate-400 text-center mt-10">
                Enter Markdown, HTML, JSON, or Mermaid syntax...
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtifactPreview;
