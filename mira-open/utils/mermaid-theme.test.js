import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import assert from 'node:assert/strict';

import {
  MERMAID_MIN_CONTRAST_RATIO,
  applyMermaidNodeTextContrast,
  getMermaidConfig,
  getMermaidContrastRatio,
  getMermaidDiagramScale,
  getMermaidThemePalette,
} from './mermaid-theme.js';

const TRANSPARENT_VALUES = new Set(['', 'none', 'transparent']);
const SHAPE_SELECTOR = 'rect,circle,ellipse,polygon,path';
const LINEWORK_SELECTOR = 'line,path,polyline,polygon,rect,circle,ellipse';

const getInlineStyleValue = (element, property) => {
  const styleAttr = element.getAttribute('style') || '';
  const match = styleAttr.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;]+)`, 'i'));
  const value = match?.[1]?.trim() ?? '';
  return value && !TRANSPARENT_VALUES.has(value.toLowerCase()) ? value : null;
};

const getColorValue = (element, attribute) => {
  if (!element) return null;
  const attrValue = element.getAttribute(attribute);
  if (attrValue && !TRANSPARENT_VALUES.has(attrValue.trim().toLowerCase())) return attrValue;

  if (attribute === 'fill' || attribute === 'stroke') {
    return getInlineStyleValue(element, attribute);
  }

  if (attribute === 'color') {
    return getInlineStyleValue(element, 'color');
  }

  if (attribute === 'background-color') {
    return getInlineStyleValue(element, 'background-color');
  }

  return null;
};

const findNearestShapeFill = (element) => {
  let probe = element;
  while (probe) {
    let current = probe.previousElementSibling;
    while (current) {
      const shape = current.matches?.(SHAPE_SELECTOR)
        ? current
        : current.querySelector?.(SHAPE_SELECTOR);
      const fill = shape ? getColorValue(shape, 'fill') : null;
      if (fill) return fill;
      current = current.previousElementSibling;
    }

    probe = probe.parentElement;
  }
  return null;
};

const findNearestBackground = (element, palette) => {
  let probe = element;
  while (probe) {
    const background = getColorValue(probe, 'background-color');
    if (background) return background;
    probe = probe.parentElement;
  }

  return findNearestShapeFill(element) || palette.background;
};

const parseSvg = (svg) => {
  const doc = new globalThis.DOMParser().parseFromString(svg, 'image/svg+xml');
  assert.equal(doc.documentElement.tagName.toLowerCase(), 'svg');
  return doc.documentElement;
};

const assertReadable = (color, background, label) => {
  const contrast = getMermaidContrastRatio(color, background);
  assert.ok(
    contrast >= MERMAID_MIN_CONTRAST_RATIO,
    `${label} expected contrast >= ${MERMAID_MIN_CONTRAST_RATIO}, got ${contrast.toFixed(2)} for ${color} on ${background}`,
  );
};

const getMarkupAttrValue = (attrs, attribute) => {
  const match = attrs.match(new RegExp(`\\s${attribute}="([^"]*)"`, 'i'));
  const value = match?.[1]?.trim() ?? '';
  return value && !TRANSPARENT_VALUES.has(value.toLowerCase()) ? value : null;
};

const getMarkupStyleValue = (attrs, property) => {
  const style = getMarkupAttrValue(attrs, 'style') || '';
  const match = style.match(new RegExp(`(?:^|;)\\s*${property}\\s*:\\s*([^;"]+)`, 'i'));
  const value = match?.[1]?.trim() ?? '';
  return value && !TRANSPARENT_VALUES.has(value.toLowerCase()) ? value : null;
};

const getMarkupColorValue = (attrs, attribute) =>
  getMarkupAttrValue(attrs, attribute) || getMarkupStyleValue(attrs, attribute);

const findMarkupShapeFill = (markup) => {
  const match = markup.match(
    /<(?:rect|circle|ellipse|polygon|path)\b([^>]*)(?:\/>|>)/i,
  );
  if (!match) return null;
  return getMarkupColorValue(match[1], 'fill');
};

const assertStringSvgContrast = (svg, theme) => {
  const palette = getMermaidThemePalette(theme);

  for (const match of svg.matchAll(/<g\b[^>]*>([\s\S]*?)<\/g>/gi)) {
    const groupContent = match[1];
    const background = findMarkupShapeFill(groupContent) || palette.background;

    for (const textMatch of groupContent.matchAll(/<(text|tspan)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) {
      const color = getMarkupColorValue(textMatch[2], 'fill') || getMarkupStyleValue(textMatch[2], 'color');
      assert.ok(color, `expected text color for ${textMatch[3]}`);
      assertReadable(color, background, `text "${textMatch[3]}"`);
    }
  }

  for (const match of svg.matchAll(/<foreignObject\b[^>]*>([\s\S]*?)<\/foreignObject>/gi)) {
    const content = match[1];
    const tagMatch = content.match(/<(div|span|p|strong|em|b|i)\b([^>]*)>/i);
    if (!tagMatch) continue;
    const color = getMarkupStyleValue(tagMatch[2], 'color') || getMarkupColorValue(tagMatch[2], 'fill');
    assert.ok(color, 'expected foreignObject text color');
    assertReadable(color, palette.background, 'foreignObject text');
  }

  for (const match of svg.matchAll(/<(line|path|polyline|polygon|rect|circle|ellipse)\b([^>]*)(?:\/>|>)/gi)) {
    const stroke = getMarkupColorValue(match[2], 'stroke');
    if (!stroke) continue;
    assert.equal(stroke.toUpperCase(), palette.foreground.toUpperCase());
    assertReadable(stroke, palette.background, `${match[1]} stroke`);
  }

  for (const match of svg.matchAll(/<marker\b[^>]*>([\s\S]*?)<\/marker>/gi)) {
    for (const fillMatch of match[1].matchAll(/<(path|polygon)\b([^>]*)(?:\/>|>)/gi)) {
      const fill = getMarkupColorValue(fillMatch[2], 'fill');
      if (!fill) continue;
      assert.equal(fill.toUpperCase(), palette.foreground.toUpperCase());
      assertReadable(fill, palette.background, `${fillMatch[1]} marker fill`);
    }
  }
};

const assertSvgContrast = (svg, theme) => {
  if (!globalThis.DOMParser) {
    assertStringSvgContrast(svg, theme);
    return;
  }

  const palette = getMermaidThemePalette(theme);
  const svgElement = parseSvg(svg);

  for (const element of svgElement.querySelectorAll('text,tspan')) {
    if (element.closest('defs,marker')) continue;
    const color = getColorValue(element, 'fill') || getColorValue(element, 'color');
    assert.ok(color, `expected text color for ${element.textContent}`);
    assertReadable(color, findNearestBackground(element, palette), `text "${element.textContent}"`);
  }

  for (const element of svgElement.querySelectorAll('foreignObject, foreignObject *')) {
    if (!element.textContent?.trim()) continue;
    const color = getColorValue(element, 'color') || getColorValue(element, 'fill');
    assert.ok(color, `expected HTML label color for ${element.textContent.trim()}`);
    assertReadable(color, findNearestBackground(element, palette), `foreignObject "${element.textContent.trim()}"`);
  }

  for (const element of svgElement.querySelectorAll(LINEWORK_SELECTOR)) {
    const stroke = getColorValue(element, 'stroke');
    if (!stroke) continue;
    assert.equal(stroke.toUpperCase(), palette.foreground.toUpperCase());
    assertReadable(stroke, palette.background, `${element.tagName} stroke`);
  }

  for (const element of svgElement.querySelectorAll('marker path, marker polygon, defs path, defs polygon')) {
    const fill = getColorValue(element, 'fill');
    if (!fill) continue;
    assert.equal(fill.toUpperCase(), palette.foreground.toUpperCase());
    assertReadable(fill, palette.background, `${element.tagName} marker fill`);
  }
};

test('getMermaidConfig binds core text, line, and border variables to the light foreground', () => {
  const palette = getMermaidThemePalette('light');
  const config = getMermaidConfig('light');

  assert.equal(config.theme, 'base');
  assert.equal(config.themeVariables.mainBkg, palette.background);
  assert.equal(config.themeVariables.primaryTextColor, palette.foreground);
  assert.equal(config.themeVariables.textColor, palette.foreground);
  assert.equal(config.themeVariables.lineColor, palette.foreground);
  assert.equal(config.themeVariables.primaryBorderColor, palette.foreground);
  assert.equal(config.themeVariables.actorBorder, palette.foreground);
  assert.equal(config.themeVariables.relationColor, palette.foreground);
  assert.equal(config.themeVariables.pieSectionTextColor, palette.foreground);
  assert.equal(config.themeVariables.xyChart.xAxisLineColor, palette.foreground);
});

test('getMermaidConfig binds core text, line, and border variables to the dark foreground', () => {
  const palette = getMermaidThemePalette('dark');
  const config = getMermaidConfig('dark');

  assert.equal(config.theme, 'base');
  assert.equal(config.themeVariables.darkMode, true);
  assert.equal(config.themeVariables.mainBkg, palette.background);
  assert.equal(config.themeVariables.primaryTextColor, palette.foreground);
  assert.equal(config.themeVariables.textColor, palette.foreground);
  assert.equal(config.themeVariables.lineColor, palette.foreground);
  assert.equal(config.themeVariables.primaryBorderColor, palette.foreground);
  assert.equal(config.themeVariables.actorBorder, palette.foreground);
  assert.equal(config.themeVariables.relationColor, palette.foreground);
  assert.equal(config.themeVariables.pieSectionTextColor, palette.foreground);
  assert.equal(config.themeVariables.xyChart.yAxisLineColor, palette.foreground);
});

test('getMermaidDiagramScale returns the updated default scale map', () => {
  assert.equal(getMermaidDiagramScale('graph TD\nA --> B'), 0.576);
  assert.equal(getMermaidDiagramScale('sequenceDiagram\nA->>B: hi'), 0.9);
  assert.equal(getMermaidDiagramScale('stateDiagram-v2\n[*] --> 待处理'), 0.738);
  assert.equal(getMermaidDiagramScale('classDiagram\nclass Animal'), 0.72);
  assert.equal(getMermaidDiagramScale('erDiagram\nA ||--o{ B : owns'), 0.2824);
  assert.equal(getMermaidDiagramScale('architecture-beta\nservice api(server)[API]'), 0.8);
  assert.equal(getMermaidDiagramScale('pie title 分布\n"需求" : 24'), 0.72);
  assert.equal(getMermaidDiagramScale('quadrantChart\ntitle 路线图'), 0.64);
  assert.equal(getMermaidDiagramScale('xychart-beta\ntitle "走势"'), 0.8);
  assert.equal(getMermaidDiagramScale('sankey-beta\nA, B, 10'), 0.8);
  assert.equal(getMermaidDiagramScale('venn-beta\nset A:10'), 0.8);
  assert.equal(getMermaidDiagramScale('gitGraph\ncommit'), 0.8);
  assert.equal(getMermaidDiagramScale('C4Context\nPerson(user, "用户")'), 1.1);
  assert.equal(getMermaidDiagramScale('treemap\ntitle 流量来源'), 0.8);
  assert.equal(getMermaidDiagramScale('kanban\nid1[Todo]'), 1);
});

test('applyMermaidNodeTextContrast normalizes text, lines, borders, and markers in light mode', () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow"><path d="M0,0 L10,5 L0,10 z" fill="#64748b" /></marker>
      </defs>
      <text fill="#ffffff">独立标题</text>
      <g class="node node-light">
        <rect fill="#dbeafe" stroke="#94a3b8" />
        <text fill="#ffffff">浅色节点</text>
      </g>
      <g class="node node-dark">
        <rect fill="#1e293b" stroke="#94a3b8" />
        <text fill="#0f172a">深色节点</text>
      </g>
      <g class="flow-node-green">
        <rect style="fill:#dcfce7;stroke:#166534;stroke-width:2px" />
      </g>
      <foreignObject>
        <div xmlns="http://www.w3.org/1999/xhtml" class="nodeLabel" style="color:#f8fafc">
          <span>detached label</span>
        </div>
      </foreignObject>
      <g class="edgePath">
        <path fill="none" stroke="#64748b" marker-end="url(#arrow)" />
      </g>
      <g class="edgeLabel">
        <rect fill="#ffffff" stroke="#94a3b8" />
        <text fill="#94a3b8">边标签</text>
      </g>
      <g class="c4Boundary">
        <rect fill="none" stroke="#94a3b8" />
      </g>
      <g class="c4-rel">
        <path fill="none" stroke="#64748b" />
        <text fill="#64748b">同步数据</text>
      </g>
      <g class="architecture-service">
        <rect class="node-bkg" fill="#1f2a44" stroke="#94a3b8" />
      </g>
      <g class="architecture-service-label">
        <text fill="#0f172a">API</text>
      </g>
      <g class="architecture-groups">
        <g dy="1em" text-anchor="start">
          <g>
            <rect class="background" style="stroke:none" />
            <text fill="#f8fafc">Entry</text>
          </g>
        </g>
      </g>
      <g class="pie">
        <path fill="#1d4ed8" stroke="#94a3b8" />
        <text class="slice" fill="#0f172a">38%</text>
      </g>
      <g class="venn-area venn-circle">
        <path fill="#dbeafe" stroke="#94a3b8" />
        <text class="label" fill="#94a3b8">Product</text>
      </g>
      <g class="data-point">
        <circle fill="#2563eb" stroke="#94a3b8" />
        <text fill="#0f172a">AI 助教</text>
      </g>
      <g class="journey-section">
        <rect fill="#e8edf7" stroke="#94a3b8" />
        <text class="label" fill="#0f172a">发现</text>
      </g>
      <g class="task">
        <rect fill="#fef3c7" stroke="#94a3b8" />
        <text class="label" fill="#ffffff">看到活动</text>
      </g>
      <g class="items">
        <rect fill="#334155" stroke="#94a3b8" />
        <text class="label" fill="#0f172a">看板卡片</text>
      </g>
      <g class="packet">
        <rect fill="#bfdbfe" stroke="#94a3b8" />
        <text fill="#ffffff">Source Port</text>
      </g>
      <g class="treemap">
        <rect class="treemapLeaf" fill="transparent" stroke="#94a3b8" />
        <text class="treemapLabel" fill="#94a3b8">自然流量</text>
      </g>
      <circle class="face" cx="10" cy="10" r="4" stroke-width="2" />
      <g class="axis">
        <text fill="#94a3b8">坐标轴标签</text>
      </g>
    </svg>
  `;

  const adjusted = applyMermaidNodeTextContrast(svg, 'light');

  assert.match(adjusted, /<text[^>]+fill="#0F172A"[^>]*>独立标题<\/text>/);
  assert.match(adjusted, /<text[^>]+fill="#0F172A"[^>]*>浅色节点<\/text>/);
  assert.match(adjusted, /<text[^>]+fill="#F8FAFC"[^>]*>深色节点<\/text>/);
  assert.match(adjusted, /<text[^>]+fill="#0F172A"[^>]*>Entry<\/text>/);
  assert.match(adjusted, /<rect[^>]+class="background"[^>]+fill="#F1F5F9"/);
  assert.match(adjusted, /<rect[^>]+class="background"[^>]+stroke="#0F172A"/);
  assert.match(adjusted, /<text[^>]+fill="#0F172A"[^>]*>发现<\/text>/);
  assert.match(adjusted, /<rect[^>]+class="treemapLeaf"[^>]+fill="#DBEAFE"/);
  assert.match(adjusted, /<rect[^>]+class="treemapLeaf"[^>]+stroke="#0F172A"/);
  assert.match(adjusted, /<path[^>]+fill="#0F172A"/);
  assertSvgContrast(adjusted, 'light');
});

test('applyMermaidNodeTextContrast normalizes text, lines, borders, and markers in dark mode', () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <defs>
        <marker id="arrow"><path d="M0,0 L10,5 L0,10 z" fill="#444444" /></marker>
      </defs>
      <text fill="#0f172a">独立标题</text>
      <g class="node node-light">
        <rect fill="#dbeafe" stroke="#334155" />
        <text fill="#ffffff">浅色节点</text>
      </g>
      <g class="node node-dark">
        <rect fill="#1e293b" stroke="#334155" />
        <text fill="#0f172a">深色节点</text>
      </g>
      <g class="node default" id="flowchart-C">
        <rect class="basic label-container" />
        <g class="label">
          <rect />
          <foreignObject>
            <div xmlns="http://www.w3.org/1999/xhtml" style="color:#0f172a">
              <span class="nodeLabel"><p>默认深色流程节点</p></span>
            </div>
          </foreignObject>
        </g>
      </g>
      <g class="node default" id="flowchart-B">
        <polygon class="label-container" />
        <g class="label">
          <foreignObject>
            <div xmlns="http://www.w3.org/1999/xhtml" style="color:#0f172a">
              <span class="nodeLabel"><p>是否正常?</p></span>
            </div>
          </foreignObject>
        </g>
      </g>
      <g class="flow-node-dark">
        <rect style="fill:#1f2a44;stroke:#334155;stroke-width:2px" />
      </g>
      <foreignObject>
        <div xmlns="http://www.w3.org/1999/xhtml" class="nodeLabel" style="color:#0f172a">
          <span>detached label</span>
        </div>
      </foreignObject>
      <g class="edgePath">
        <path fill="none" stroke="#334155" marker-end="url(#arrow)" />
      </g>
      <g class="edgeLabel">
        <rect fill="#172033" stroke="#334155" />
        <text fill="#334155">边标签</text>
      </g>
      <g class="c4Boundary">
        <rect fill="none" stroke="#334155" />
      </g>
      <g class="c4-rel">
        <path fill="none" stroke="#334155" />
        <text fill="#334155">同步数据</text>
      </g>
      <g class="architecture-service">
        <rect class="node-bkg" fill="#1f2a44" stroke="#334155" />
      </g>
      <g class="architecture-groups">
        <rect class="node-bkg" fill="none" stroke="#000000" />
        <g>
          <rect class="background" style="stroke:none" />
          <text fill="#334155">Entry</text>
        </g>
      </g>
      <g class="architecture-service-label">
        <text fill="#334155">API</text>
      </g>
      <g class="pie">
        <path fill="#9a3412" stroke="#334155" />
        <text class="slice" fill="#334155">38%</text>
      </g>
      <g class="venn-area venn-circle">
        <path fill="#1e3a8a" stroke="#334155" />
        <text class="label" fill="#334155">Product</text>
      </g>
      <g class="data-point">
        <circle fill="#1d4ed8" stroke="#334155" />
        <text fill="#334155">AI 助教</text>
      </g>
      <g class="journey-section">
        <rect fill="#1d4ed8" stroke="#334155" />
        <text class="label" fill="#334155">发现</text>
      </g>
      <g class="task">
        <rect fill="#fef3c7" stroke="#334155" />
        <text class="label" fill="#ffffff">看到活动</text>
      </g>
      <g class="items">
        <rect fill="#334155" stroke="#334155" />
        <text class="label" fill="#334155">看板卡片</text>
      </g>
      <g class="packet">
        <rect fill="#1e3a8a" stroke="#334155" />
        <text fill="#334155">Source Port</text>
      </g>
      <g class="packet">
        <rect class="packetBlock" />
        <text class="packetLabel" fill="#ffffff">Destination Port</text>
        <text class="packetByte start" fill="#ffffff">16</text>
        <text class="packetTitle" fill="#334155">TCP 报文头</text>
      </g>
      <circle class="face" cx="10" cy="10" r="4" stroke-width="2" />
      <g class="axis">
        <text fill="#334155">坐标轴标签</text>
      </g>
    </svg>
  `;

  const adjusted = applyMermaidNodeTextContrast(svg, 'dark');

  assert.match(adjusted, /<text[^>]+fill="#F8FAFC"[^>]*>独立标题<\/text>/);
  assert.match(adjusted, /<text[^>]+fill="#0F172A"[^>]*>浅色节点<\/text>/);
  assert.match(adjusted, /<text[^>]+fill="#F8FAFC"[^>]*>深色节点<\/text>/);
  assert.match(adjusted, /<path[^>]+fill="#F8FAFC"/);
  assertSvgContrast(adjusted, 'dark');

  const palette = getMermaidThemePalette('dark');
  assert.match(adjusted, /<rect[^>]+class="basic label-container"[^>]+fill="#1E293B"/);
  assert.match(adjusted, /<polygon[^>]+class="label-container"[^>]+fill="#1E293B"/);
  assert.match(adjusted, /<p[^>]+style="[^"]*color:#F8FAFC[^"]*"[^>]*>默认深色流程节点<\/p>/);
  assert.match(adjusted, /<p[^>]+style="[^"]*color:#F8FAFC[^"]*"[^>]*>是否正常\?<\/p>/);
  assertReadable(palette.foreground, palette.nodeFill, 'dark flowchart default node label');

  assert.match(adjusted, /<rect[^>]+class="node-bkg"[^>]+stroke="#F8FAFC"/);
  assert.doesNotMatch(adjusted, /<rect[^>]+class="node-bkg"[^>]+stroke="#000000"/);

  assert.match(adjusted, /<rect[^>]+class="packetBlock"[^>]+fill="#1E293B"/);
  assert.match(adjusted, /<rect[^>]+class="packetBlock"[^>]+stroke="#F8FAFC"/);
  assert.match(adjusted, /<text[^>]+class="packetLabel"[^>]+fill="#F8FAFC"[^>]*>Destination Port<\/text>/);
  assertReadable(palette.foreground, palette.nodeFill, 'dark packet label');
  assert.doesNotMatch(adjusted, /<rect[^>]+class="packetBlock"[^>]+fill="#EFEFEF"/);
});

test('applyMermaidNodeTextContrast string fallback still applies dark special diagram colors', () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg">
      <g class="edgePath"><path fill="none" stroke="#64748b" /></g>
      <text fill="#64748b">Fallback label</text>
      <rect class="packetBlock" />
      <text class="packetLabel" fill="#ffffff">Source Port</text>
      <rect class="node-bkg" stroke="#000000" />
    </svg>
  `;

  const originalDOMParser = globalThis.DOMParser;
  const originalXMLSerializer = globalThis.XMLSerializer;

  globalThis.DOMParser = undefined;
  globalThis.XMLSerializer = undefined;

  try {
    const adjusted = applyMermaidNodeTextContrast(svg, 'dark');

    assert.match(adjusted, /stroke="#F8FAFC"/);
    assert.match(adjusted, /<text[^>]+fill="#F8FAFC"[^>]*>Fallback label<\/text>/);
    assert.match(adjusted, /<rect[^>]+class="packetBlock"[^>]+fill="#1E293B"/);
    assert.match(adjusted, /<rect[^>]+class="packetBlock"[^>]+stroke="#F8FAFC"/);
    assert.match(adjusted, /<text[^>]+class="packetLabel"[^>]+fill="#F8FAFC"[^>]*>Source Port<\/text>/);
    assert.match(adjusted, /<rect[^>]+class="node-bkg"[^>]+stroke="#F8FAFC"/);
  } finally {
    globalThis.DOMParser = originalDOMParser;
    globalThis.XMLSerializer = originalXMLSerializer;
  }
});

test('Mermaid CSS no longer contains theme-scoped color overrides', () => {
  const cssPath = path.resolve(import.meta.dirname, '../index.css');
  const css = fs.readFileSync(cssPath, 'utf8');

  assert.doesNotMatch(css, /\[data-theme="dark"\]\s+\.mermaid-container\s+svg/i);
  assert.doesNotMatch(css, /html:not\(\[data-theme="dark"\]\)\s+\.mermaid-container\s+svg/i);
  assert.doesNotMatch(css, /(?:^|[{;\s])(?:fill|stroke|color)\s*:\s*#[0-9a-f]{3,8}\s*!important/i);
});
