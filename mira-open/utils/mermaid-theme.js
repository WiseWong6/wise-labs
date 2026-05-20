/* global DOMParser, Element, XMLSerializer, document */

const FONT_FAMILY = 'Inter, "PingFang SC", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';
const DARK_TEXT = '#0F172A';
const LIGHT_TEXT = '#F8FAFC';
const LIGHT_BACKGROUND = '#F8FAFC';
const DARK_BACKGROUND = '#0F172A';

export const MERMAID_MIN_CONTRAST_RATIO = 4.5;

const TRANSPARENT_VALUES = new Set(['', 'none', 'transparent']);
const SHAPE_SELECTOR = 'rect,circle,ellipse,polygon,path';
const LINEWORK_SELECTOR = 'line,path,polyline,polygon,rect,circle,ellipse';
const TEXT_SELECTOR = 'text,tspan';
const NAMED_COLORS = {
  black: '#000000',
  white: '#FFFFFF',
};

const MERMAID_DIAGRAM_SCALES = {
  'architecture-beta': 0.8,
  C4Component: 1.1,
  C4Container: 1.1,
  C4Context: 1.1,
  C4Deployment: 1.1,
  C4Dynamic: 1.1,
  classDiagram: 0.72,
  erDiagram: 0.2824,
  gitGraph: 0.8,
  pie: 0.72,
  quadrantChart: 0.64,
  'sankey-beta': 0.8,
  sequenceDiagram: 0.9,
  stateDiagram: 0.738,
  'stateDiagram-v2': 0.738,
  treemap: 0.8,
  'venn-beta': 0.8,
  'xychart-beta': 0.8,
};

const normalizeTheme = (theme) => (theme === 'dark' ? 'dark' : 'light');

export const getMermaidThemePalette = (theme) => {
  if (normalizeTheme(theme) === 'dark') {
    return {
      theme: 'dark',
      background: DARK_BACKGROUND,
      foreground: LIGHT_TEXT,
      foregroundInverse: DARK_TEXT,
      mutedForeground: '#E2E8F0',
      surface: '#172033',
      surfaceMuted: '#1E293B',
      nodeFill: '#1E293B',
      secondaryFill: '#334155',
      tertiaryFill: '#0B1120',
      edgeLabelBackground: '#0F172A',
      noteFill: '#422006',
      noteText: LIGHT_TEXT,
    };
  }

  return {
    theme: 'light',
    background: LIGHT_BACKGROUND,
    foreground: DARK_TEXT,
    foregroundInverse: LIGHT_TEXT,
    mutedForeground: '#334155',
    surface: '#FFFFFF',
    surfaceMuted: '#E2E8F0',
    nodeFill: '#EEF2FF',
    secondaryFill: '#F1F5F9',
    tertiaryFill: '#FFFFFF',
    edgeLabelBackground: '#FFFFFF',
    noteFill: '#FFFBEB',
    noteText: DARK_TEXT,
  };
};

const LIGHT_CHART_COLORS = [
  '#BFDBFE',
  '#CCFBF1',
  '#FEF3C7',
  '#FCE7F3',
  '#EDE9FE',
  '#D1FAE5',
  '#FEE2E2',
  '#E2E8F0',
  '#DBEAFE',
  '#CFFAFE',
  '#FDE68A',
  '#FBCFE8',
];

const DARK_CHART_COLORS = [
  '#1E3A8A',
  '#134E4A',
  '#9A3412',
  '#9D174D',
  '#5B21B6',
  '#166534',
  '#991B1B',
  '#334155',
  '#1D4ED8',
  '#155E75',
  '#92400E',
  '#831843',
];

const getChartColors = (theme) => (normalizeTheme(theme) === 'dark' ? DARK_CHART_COLORS : LIGHT_CHART_COLORS);

const TREEMAP_LIGHT_FILLS = [
  '#DBEAFE',
  '#CCFBF1',
  '#FEF3C7',
  '#FCE7F3',
  '#EDE9FE',
  '#D1FAE5',
  '#FEE2E2',
  '#E2E8F0',
];

const buildThemeVariables = (theme) => {
  const palette = getMermaidThemePalette(theme);
  const chart = getChartColors(theme);

  return {
    darkMode: palette.theme === 'dark',
    background: palette.background,
    mainBkg: palette.background,
    primaryColor: palette.nodeFill,
    primaryTextColor: palette.foreground,
    primaryBorderColor: palette.foreground,
    lineColor: palette.foreground,
    textColor: palette.foreground,
    secondaryColor: palette.secondaryFill,
    tertiaryColor: palette.tertiaryFill,
    edgeLabelBackground: palette.edgeLabelBackground,
    labelBackgroundColor: palette.edgeLabelBackground,
    labelTextColor: palette.foreground,
    labelBoxBkgColor: palette.edgeLabelBackground,
    labelBoxBorderColor: palette.foreground,
    actorBkg: palette.nodeFill,
    actorBorder: palette.foreground,
    actorTextColor: palette.foreground,
    actorLineColor: palette.foreground,
    signalColor: palette.foreground,
    signalTextColor: palette.foreground,
    loopTextColor: palette.foreground,
    noteBkgColor: palette.noteFill,
    noteBorderColor: palette.foreground,
    noteTextColor: palette.noteText,
    relationColor: palette.foreground,
    relationLabelBackground: palette.edgeLabelBackground,
    relationLabelColor: palette.foreground,
    requirementBackground: palette.nodeFill,
    requirementBorderColor: palette.foreground,
    requirementTextColor: palette.foreground,
    pie1: chart[0],
    pie2: chart[1],
    pie3: chart[2],
    pie4: chart[3],
    pie5: chart[4],
    pie6: chart[5],
    pie7: chart[6],
    pie8: chart[7],
    pie9: chart[8],
    pie10: chart[9],
    pie11: chart[10],
    pie12: chart[11],
    pieTitleTextColor: palette.foreground,
    pieSectionTextColor: palette.foreground,
    pieLegendTextColor: palette.foreground,
    pieStrokeColor: palette.foreground,
    pieStrokeWidth: '2px',
    pieOuterStrokeWidth: '2px',
    pieOuterStrokeColor: palette.foreground,
    pieOpacity: 0.95,
    vennTitleTextColor: palette.foreground,
    vennSetTextColor: palette.foreground,
    quadrant1Fill: chart[0],
    quadrant2Fill: chart[2],
    quadrant3Fill: palette.secondaryFill,
    quadrant4Fill: chart[5],
    quadrant1TextFill: palette.foreground,
    quadrant2TextFill: palette.foreground,
    quadrant3TextFill: palette.foreground,
    quadrant4TextFill: palette.foreground,
    quadrantPointFill: chart[8],
    quadrantPointTextFill: palette.foreground,
    quadrantXAxisTextFill: palette.foreground,
    quadrantYAxisTextFill: palette.foreground,
    quadrantInternalBorderStrokeFill: palette.foreground,
    quadrantExternalBorderStrokeFill: palette.foreground,
    quadrantTitleFill: palette.foreground,
    git0: chart[0],
    git1: chart[1],
    git2: chart[2],
    git3: chart[3],
    git4: chart[4],
    git5: chart[5],
    git6: chart[6],
    git7: chart[7],
    gitInv0: chart[0],
    gitInv1: chart[1],
    gitInv2: chart[2],
    gitInv3: chart[3],
    gitInv4: chart[4],
    gitInv5: chart[5],
    gitInv6: chart[6],
    gitInv7: chart[7],
    branchLabelColor: palette.foreground,
    gitBranchLabel0: palette.foreground,
    gitBranchLabel1: palette.foreground,
    gitBranchLabel2: palette.foreground,
    gitBranchLabel3: palette.foreground,
    gitBranchLabel4: palette.foreground,
    gitBranchLabel5: palette.foreground,
    gitBranchLabel6: palette.foreground,
    gitBranchLabel7: palette.foreground,
    tagLabelColor: palette.foreground,
    tagLabelBackground: palette.edgeLabelBackground,
    tagLabelBorder: palette.foreground,
    commitLabelColor: palette.foreground,
    commitLabelBackground: palette.edgeLabelBackground,
    commitLineColor: palette.foreground,
    cScale0: chart[0],
    cScale1: chart[1],
    cScale2: chart[2],
    cScale3: chart[3],
    cScale4: chart[4],
    cScale5: chart[5],
    cScale6: chart[6],
    cScale7: chart[7],
    cScaleLabel0: palette.foreground,
    cScaleLabel1: palette.foreground,
    cScaleLabel2: palette.foreground,
    cScaleLabel3: palette.foreground,
    cScaleLabel4: palette.foreground,
    cScaleLabel5: palette.foreground,
    cScaleLabel6: palette.foreground,
    cScaleLabel7: palette.foreground,
    xyChart: {
      backgroundColor: palette.background,
      titleColor: palette.foreground,
      dataLabelColor: palette.foreground,
      xAxisLabelColor: palette.foreground,
      xAxisTitleColor: palette.foreground,
      xAxisTickColor: palette.foreground,
      xAxisLineColor: palette.foreground,
      yAxisLabelColor: palette.foreground,
      yAxisTitleColor: palette.foreground,
      yAxisTickColor: palette.foreground,
      yAxisLineColor: palette.foreground,
      plotColorPalette: chart.slice(0, 4).join(', '),
    },
  };
};

const expandHex = (value) => {
  const hex = value.replace('#', '').trim();
  if (hex.length === 3 || hex.length === 4) {
    return hex
      .split('')
      .slice(0, 3)
      .map((char) => char + char)
      .join('');
  }
  return hex.slice(0, 6);
};

const parseColor = (value) => {
  if (!value) return null;
  const trimmed = String(value).trim();
  const normalized = trimmed.toLowerCase();
  if (TRANSPARENT_VALUES.has(normalized) || normalized === 'currentcolor') return null;

  const namedColor = NAMED_COLORS[normalized];
  if (namedColor) return parseColor(namedColor);

  if (trimmed.startsWith('#')) {
    const hex = expandHex(trimmed);
    if (hex.length !== 6) return null;
    return {
      r: Number.parseInt(hex.slice(0, 2), 16),
      g: Number.parseInt(hex.slice(2, 4), 16),
      b: Number.parseInt(hex.slice(4, 6), 16),
      a: 1,
    };
  }

  const rgbMatch = trimmed.match(/^rgba?\(([^)]+)\)$/i);
  if (!rgbMatch) return null;
  const parts = rgbMatch[1].split(/[,\s/]+/).filter(Boolean);
  const [r, g, b] = parts.slice(0, 3).map((part) => {
    if (part.endsWith('%')) return (Number.parseFloat(part) / 100) * 255;
    return Number.parseFloat(part);
  });
  const alpha = parts[3] === undefined ? 1 : Number.parseFloat(parts[3]);
  if ([r, g, b, alpha].some((channel) => Number.isNaN(channel))) return null;
  if (alpha <= 0) return null;
  return { r, g, b, a: Math.min(1, alpha) };
};

const blendColor = (color, background) => {
  if (!color) return null;
  if (color.a === undefined || color.a >= 1 || !background) return color;

  return {
    r: color.r * color.a + background.r * (1 - color.a),
    g: color.g * color.a + background.g * (1 - color.a),
    b: color.b * color.a + background.b * (1 - color.a),
    a: 1,
  };
};

const resolveColor = (value, backgroundValue) => {
  const color = parseColor(value);
  if (!color) return null;
  const background = parseColor(backgroundValue);
  return blendColor(color, background);
};

const getRelativeLuminance = ({ r, g, b }) => {
  const normalize = (value) => {
    const channel = Math.max(0, Math.min(255, value)) / 255;
    return channel <= 0.03928 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4;
  };

  return 0.2126 * normalize(r) + 0.7152 * normalize(g) + 0.0722 * normalize(b);
};

const getContrastRatioFromColors = (first, second) => {
  const firstLuminance = getRelativeLuminance(first);
  const secondLuminance = getRelativeLuminance(second);
  const lighter = Math.max(firstLuminance, secondLuminance);
  const darker = Math.min(firstLuminance, secondLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

export const getMermaidContrastRatio = (first, second) => {
  const firstColor = resolveColor(first, second);
  const secondColor = resolveColor(second, first);
  if (!firstColor || !secondColor) return 0;
  return getContrastRatioFromColors(firstColor, secondColor);
};

const getReadableTextColor = (background, palette) => {
  const resolvedBackground = resolveColor(background, palette.background) || parseColor(palette.background);
  const foreground = parseColor(palette.foreground);
  const inverse = parseColor(palette.foregroundInverse);

  if (!resolvedBackground || !foreground || !inverse) return palette.foreground;

  const foregroundContrast = getContrastRatioFromColors(foreground, resolvedBackground);
  const inverseContrast = getContrastRatioFromColors(inverse, resolvedBackground);

  if (foregroundContrast >= MERMAID_MIN_CONTRAST_RATIO && foregroundContrast >= inverseContrast) {
    return palette.foreground;
  }

  if (inverseContrast >= MERMAID_MIN_CONTRAST_RATIO) {
    return palette.foregroundInverse;
  }

  return foregroundContrast >= inverseContrast ? palette.foreground : palette.foregroundInverse;
};

const getInlineStyleAttributeValue = (element, property) => {
  if (!(element instanceof Element)) return null;
  const styleAttr = element.getAttribute('style');
  if (!styleAttr) return null;
  const escapedProperty = property.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = styleAttr.match(
    new RegExp(`(?:^|;)\\s*${escapedProperty}\\s*:\\s*([^;]+)`, 'i'),
  );
  if (!match) return null;
  const value = match[1]?.trim();
  if (!value || TRANSPARENT_VALUES.has(value.toLowerCase())) return null;
  return value;
};

const getElementColorValue = (element, attribute) => {
  if (!(element instanceof Element)) return null;
  const attrValue = element.getAttribute(attribute);
  if (attrValue && !TRANSPARENT_VALUES.has(attrValue.trim().toLowerCase())) return attrValue;

  if (attribute === 'fill' || attribute === 'stroke') {
    const styleValue = element.style?.[attribute];
    if (styleValue && !TRANSPARENT_VALUES.has(styleValue.trim().toLowerCase())) return styleValue;
    return getInlineStyleAttributeValue(element, attribute);
  }

  if (attribute === 'color') {
    const styleValue = element.style?.color;
    if (styleValue && !TRANSPARENT_VALUES.has(styleValue.trim().toLowerCase())) return styleValue;
    return getInlineStyleAttributeValue(element, 'color');
  }

  if (attribute === 'background-color') {
    const styleValue = element.style?.backgroundColor;
    if (styleValue && !TRANSPARENT_VALUES.has(styleValue.trim().toLowerCase())) return styleValue;
    return getInlineStyleAttributeValue(element, 'background-color');
  }

  return null;
};

const getShapeFill = (element) => {
  const fill = getElementColorValue(element, 'fill');
  if (fill) return fill;
  return null;
};

const setInlineStyleValue = (element, property, value) => {
  const existing = element.getAttribute('style') || '';
  const lowerProperty = property.toLowerCase();
  const withoutProperty = existing
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
    .filter((part) => !part.toLowerCase().startsWith(`${lowerProperty}:`));
  withoutProperty.push(`${property}:${value}`);
  element.setAttribute('style', `${withoutProperty.join(';')};`);
};

const setElementTextColor = (element, color) => {
  if (!(element instanceof Element)) return;

  const tagName = element.tagName.toLowerCase();
  if (tagName === 'text' || tagName === 'tspan') {
    element.setAttribute('fill', color);
    element.style.fill = color;
    element.style.color = color;
    return;
  }

  element.style.color = color;
  element.style.fill = color;
  setInlineStyleValue(element, 'color', color);
  setInlineStyleValue(element, 'fill', color);
};

const setElementStrokeColor = (element, color) => {
  if (!(element instanceof Element)) return;
  element.setAttribute('stroke', color);
  element.style.stroke = color;
};

const setElementFillColor = (element, color) => {
  if (!(element instanceof Element)) return;
  element.setAttribute('fill', color);
  element.style.fill = color;
};

const getReadableTextColorForElement = (element, palette) =>
  getReadableTextColor(findNearestBackgroundColor(element, palette), palette);

const setElementStrokeWidth = (element, width) => {
  if (!(element instanceof Element)) return;
  element.setAttribute('stroke-width', width);
  element.style.strokeWidth = width;
};

const findNearestShapeFill = (element) => {
  let probe = element instanceof Element ? element : null;
  while (probe) {
    if (probe.matches?.('svg')) break;

    const isDirectSvgText =
      probe.matches?.(TEXT_SELECTOR) &&
      probe.parentElement?.tagName.toLowerCase() === 'svg';

    if (!isDirectSvgText) {
      const ancestorShape = probe.matches?.(SHAPE_SELECTOR)
        ? probe
        : probe.querySelector?.(`:scope > ${SHAPE_SELECTOR}`);
      const ancestorFill = ancestorShape ? getShapeFill(ancestorShape) : null;
      if (ancestorFill) return ancestorFill;

      let current = probe.previousElementSibling;
      while (current) {
        const shape = current.matches?.(SHAPE_SELECTOR)
          ? current
          : current.querySelector?.(SHAPE_SELECTOR);
        const fill = shape ? getShapeFill(shape) : null;
        if (fill) return fill;
        current = current.previousElementSibling;
      }
    }

    if (
      hasClassName(probe, 'node') ||
      hasClassName(probe, 'actor') ||
      hasClassName(probe, 'note') ||
      hasClassName(probe, 'journey-section') ||
      hasClassName(probe, 'task') ||
      hasClassName(probe, 'packet') ||
      hasClassName(probe, 'architecture-service') ||
      hasClassName(probe, 'architecture-groups')
    ) {
      break;
    }

    probe = probe.parentElement;
  }
  return null;
};

const findNearestBackgroundColor = (element, palette) => {
  let probe = element instanceof Element ? element : null;
  while (probe) {
    const background = getElementColorValue(probe, 'background-color');
    if (background) return background;
    probe = probe.parentElement;
  }

  return findNearestShapeFill(element) || palette.background;
};

const shouldUseThemeForegroundForLightText = (element, palette) => {
  if (palette.theme !== 'light' || !(element instanceof Element)) return false;
  if (element.closest?.('.journey-section,.architecture-groups')) return true;
  if (element.matches?.('foreignObject') && element.querySelector?.('.journey-section')) return true;
  return false;
};

const hasClassName = (element, className) => {
  if (!(element instanceof Element)) return false;
  return new RegExp(`(^|\\s)${className}(\\s|$)`).test(element.getAttribute('class') || '');
};

const hasAncestorClassName = (element, className) => {
  let probe = element instanceof Element ? element : null;
  while (probe) {
    if (hasClassName(probe, className)) return true;
    probe = probe.parentElement;
  }
  return false;
};

const isVisibleStroke = (element) => {
  const stroke = getElementColorValue(element, 'stroke');
  if (!stroke) return false;
  return Boolean(resolveColor(stroke, LIGHT_BACKGROUND));
};

const shouldForceStroke = (element) => {
  const tagName = element.tagName.toLowerCase();
  if (tagName === 'line' || tagName === 'polyline') return true;
  if (element.closest('marker,defs')) return true;
  if (isVisibleStroke(element)) return true;
  if (Number.parseFloat(element.getAttribute('stroke-width') || '') > 0) return true;
  if (Number.parseFloat(getInlineStyleAttributeValue(element, 'stroke-width') || '') > 0) return true;

  const fill = getElementColorValue(element, 'fill');
  if (fill && fill.toLowerCase() === 'none') return true;

  const className = element.getAttribute('class') || '';
  return /\b(edge|relation|arrow|line|link|divider|border|axis|tick|grid)\b/i.test(className);
};

const normalizeLineAndBorderColors = (svgElement, palette) => {
  for (const element of svgElement.querySelectorAll(LINEWORK_SELECTOR)) {
    if (shouldForceStroke(element)) {
      setElementStrokeColor(element, palette.foreground);
    }

    if (element.closest('marker,defs')) {
      const fill = getElementColorValue(element, 'fill');
      if (fill && fill.toLowerCase() !== 'none') {
        setElementFillColor(element, palette.foreground);
      }
    }
  }
};

const normalizeTextColors = (svgElement, palette) => {
  svgElement.style.color = palette.foreground;

  for (const element of svgElement.querySelectorAll(TEXT_SELECTOR)) {
    if (element.closest('defs,marker')) continue;
    if (shouldUseThemeForegroundForLightText(element, palette)) {
      setElementTextColor(element, palette.foreground);
      continue;
    }
    const background = findNearestBackgroundColor(element, palette);
    setElementTextColor(element, getReadableTextColor(background, palette));
  }

  for (const element of svgElement.querySelectorAll('foreignObject, foreignObject *')) {
    if (!(element instanceof Element)) continue;
    if (shouldUseThemeForegroundForLightText(element, palette)) {
      setElementTextColor(element, palette.foreground);
      continue;
    }
    const background = findNearestBackgroundColor(element, palette);
    setElementTextColor(element, getReadableTextColor(background, palette));
  }
};

const normalizeDarkFlowchartColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  for (const node of svgElement.querySelectorAll('g.node')) {
    const shape = node.querySelector(':scope > rect.label-container,:scope > polygon.label-container');
    if (!shape) continue;

    const existingFill = getElementColorValue(shape, 'fill');
    if (!existingFill) {
      setElementFillColor(shape, palette.nodeFill);
    }
    setElementStrokeColor(shape, palette.foreground);

    const textColor = getReadableTextColor(getElementColorValue(shape, 'fill') || palette.nodeFill, palette);
    for (const label of node.querySelectorAll('text,tspan,foreignObject,foreignObject *')) {
      if (label.textContent?.trim()) {
        setElementTextColor(label, textColor);
      }
    }
  }
};

const normalizeDarkSequenceColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  for (const actorBox of svgElement.querySelectorAll('rect.actor')) {
    setElementFillColor(actorBox, palette.nodeFill);
    setElementStrokeColor(actorBox, palette.foreground);
  }

  for (const note of svgElement.querySelectorAll('rect.note')) {
    setElementFillColor(note, palette.noteFill);
    setElementStrokeColor(note, palette.foreground);
  }

  for (const text of svgElement.querySelectorAll(
    'text.actor-box,text.noteText,text.messageText,text.sequenceNumber',
  )) {
    setElementTextColor(text, getReadableTextColorForElement(text, palette));
  }
};

const normalizeDarkJourneyColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  for (const group of svgElement.querySelectorAll('.journey-section,.task')) {
    const shape = group.querySelector(':scope > rect,:scope rect');
    if (!shape) continue;

    const fill = hasClassName(group, 'journey-section') ? palette.secondaryFill : palette.nodeFill;
    setElementFillColor(shape, fill);
    setElementStrokeColor(shape, palette.foreground);

    const textColor = getReadableTextColor(fill, palette);
    for (const text of group.querySelectorAll('text,tspan,foreignObject,foreignObject *')) {
      if (text.textContent?.trim()) {
        setElementTextColor(text, textColor);
      }
    }
  }
};

const normalizeDarkArchitectureColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  for (const background of svgElement.querySelectorAll('.architecture-groups .node-bkg,.architecture-services .node-bkg')) {
    setElementStrokeColor(background, palette.foreground);
    setElementStrokeWidth(background, background.getAttribute('stroke-width') || '1');
  }
};

const normalizeDarkPacketColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  for (const block of svgElement.querySelectorAll('.packetBlock')) {
    setElementFillColor(block, palette.nodeFill);
    setElementStrokeColor(block, palette.foreground);
    setElementStrokeWidth(block, block.getAttribute('stroke-width') || '1');
  }

  for (const text of svgElement.querySelectorAll('.packetLabel,.packetByte,.packetTitle')) {
    setElementTextColor(text, palette.foreground);
  }
};

const normalizeDarkSpecialDiagramColors = (svgElement, palette) => {
  if (palette.theme !== 'dark') return;

  normalizeDarkFlowchartColors(svgElement, palette);
  normalizeDarkSequenceColors(svgElement, palette);
  normalizeDarkJourneyColors(svgElement, palette);
  normalizeDarkArchitectureColors(svgElement, palette);
  normalizeDarkPacketColors(svgElement, palette);
};

const normalizeLightArchitectureGroupLabels = (svgElement, palette) => {
  if (palette.theme !== 'light') return;

  for (const labelBackground of svgElement.querySelectorAll('rect')) {
    if (!hasAncestorClassName(labelBackground, 'architecture-groups')) continue;
    if (!hasClassName(labelBackground, 'background')) continue;

    const labelGroup = labelBackground.parentElement;
    const labelText = labelGroup?.querySelector('text');
    const label = labelText?.textContent?.trim() || '';
    if (!label) continue;

    const estimatedWidth = Math.max(44, label.length * 8 + 14);
    labelBackground.setAttribute('x', '-7');
    labelBackground.setAttribute('y', '-20');
    labelBackground.setAttribute('width', String(estimatedWidth));
    labelBackground.setAttribute('height', '24');
    labelBackground.setAttribute('rx', '5');
    labelBackground.setAttribute('ry', '5');
    labelBackground.setAttribute('fill', palette.secondaryFill);
    labelBackground.setAttribute('stroke', palette.foreground);
    labelBackground.setAttribute('stroke-width', '1');
    labelBackground.style.fill = palette.secondaryFill;
    labelBackground.style.stroke = palette.foreground;
  }
};

const normalizeLightTreemapColors = (svgElement, palette) => {
  if (palette.theme !== 'light') return;

  const leaves = Array.from(svgElement.querySelectorAll('rect')).filter((element) =>
    hasClassName(element, 'treemapLeaf'),
  );

  leaves.forEach((leaf, index) => {
    const fill = TREEMAP_LIGHT_FILLS[index % TREEMAP_LIGHT_FILLS.length];
    leaf.setAttribute('fill', fill);
    leaf.setAttribute('stroke', palette.foreground);
    leaf.setAttribute('stroke-width', '2');
    leaf.style.fill = fill;
    leaf.style.stroke = palette.foreground;
    leaf.style.fillOpacity = '0.78';
    leaf.style.strokeOpacity = '0.9';
  });

  for (const section of svgElement.querySelectorAll('rect')) {
    if (!hasClassName(section, 'treemapSection') && !hasClassName(section, 'treemapSectionHeader')) continue;
    section.setAttribute('stroke', palette.foreground);
    section.style.stroke = palette.foreground;
    section.style.strokeOpacity = '0.9';
  }
};

const normalizeSvgContrast = (svgElement, theme) => {
  const palette = getMermaidThemePalette(theme);
  normalizeDarkSpecialDiagramColors(svgElement, palette);
  normalizeLineAndBorderColors(svgElement, palette);
  normalizeTextColors(svgElement, palette);
  normalizeDarkSpecialDiagramColors(svgElement, palette);
  normalizeLightArchitectureGroupLabels(svgElement, palette);
  normalizeLightTreemapColors(svgElement, palette);
};

const removeStyleProperty = (styleValue, property) =>
  styleValue
    .replace(new RegExp(`(?:^|;)\\s*${property}\\s*:[^;"]*`, 'gi'), '')
    .replace(/^;+|;+$/g, '')
    .trim();

const upsertMarkupStyle = (attrs, declarations) => {
  if (/style="/i.test(attrs)) {
    return attrs.replace(/style="([^"]*)"/i, (_match, styleValue) => {
      const cleanedStyle = Object.keys(declarations).reduce(
        (nextStyle, property) => removeStyleProperty(nextStyle, property),
        styleValue,
      );
      const mergedStyle = [
        cleanedStyle,
        ...Object.entries(declarations).map(([property, value]) => `${property}:${value}`),
      ]
        .filter(Boolean)
        .join(';');
      return `style="${mergedStyle}"`;
    });
  }

  return `${attrs} style="${Object.entries(declarations)
    .map(([property, value]) => `${property}:${value}`)
    .join(';')}"`;
};

const forceMarkupSvgTextColor = (markup, color) =>
  markup.replace(/<(text|tspan)\b([^>]*)>/gi, (_match, tagName, attrs) => {
    let nextAttrs = attrs.replace(/\sfill="[^"]*"/gi, '');
    nextAttrs = upsertMarkupStyle(nextAttrs, { fill: color, color });
    return `<${tagName}${nextAttrs} fill="${color}">`;
  });

const forceMarkupHtmlTextColor = (markup, color) =>
  markup.replace(/<(div|span|p|strong|em|b|i)\b([^>]*)>/gi, (_match, tagName, attrs) => {
    const nextAttrs = upsertMarkupStyle(attrs, { color, fill: color });
    return `<${tagName}${nextAttrs}>`;
  });

const forceMarkupTextColor = (markup, color) =>
  forceMarkupHtmlTextColor(forceMarkupSvgTextColor(markup, color), color);

const forceLightMarkupSpecialTextColor = (markup, palette) => {
  if (palette.theme !== 'light') return markup;

  let adjusted = markup.replace(
    /<text\b([^>]*class="[^"]*\bjourney-section\b[^"]*"[^>]*)>([\s\S]*?)<\/text>/gi,
    (_match, attrs, content) =>
      `<text${upsertMarkupStyle(attrs.replace(/\sfill="[^"]*"/gi, ''), {
        fill: palette.foreground,
        color: palette.foreground,
      })} fill="${palette.foreground}">${forceMarkupSvgTextColor(content, palette.foreground)}</text>`,
  );

  adjusted = adjusted.replace(
    /<(div|span)\b([^>]*class="[^"]*\bjourney-section\b[^"]*"[^>]*)>/gi,
    (_match, tagName, attrs) => `<${tagName}${upsertMarkupStyle(attrs, {
      color: palette.foreground,
      fill: palette.foreground,
    })}>`,
  );

  adjusted = adjusted.replace(
    /<g\b([^>]*class="[^"]*\barchitecture-groups\b[^"]*"[^>]*)>([\s\S]*?)<\/g>/gi,
    (_match, attrs, content) => `<g${attrs}>${forceMarkupTextColor(content, palette.foreground)}</g>`,
  );

  adjusted = adjusted.replace(
    /<rect\b([^>]*class="[^"]*\bbackground\b[^"]*"[^>]*)(\/?)>/gi,
    (_match, attrs, selfClose) =>
      `<rect${upsertMarkupStyle(attrs.replace(/\s(?:fill|stroke|stroke-width|rx|ry|x|y|width|height)="[^"]*"/gi, ''), {
        fill: palette.secondaryFill,
        stroke: palette.foreground,
      })} x="-7" y="-20" width="48" height="24" rx="5" ry="5" fill="${palette.secondaryFill}" stroke="${palette.foreground}" stroke-width="1"${selfClose ? ' /' : ''}>`,
  );

  let treemapLeafIndex = 0;
  adjusted = adjusted.replace(
    /<rect\b([^>]*class="[^"]*\btreemapLeaf\b[^"]*"[^>]*)(\/?)>/gi,
    (_match, attrs, selfClose) => {
      const fill = TREEMAP_LIGHT_FILLS[treemapLeafIndex % TREEMAP_LIGHT_FILLS.length];
      treemapLeafIndex += 1;
      return `<rect${upsertMarkupStyle(attrs.replace(/\s(?:fill|stroke|stroke-width)="[^"]*"/gi, ''), {
        fill,
        stroke: palette.foreground,
        'fill-opacity': '0.78',
        'stroke-opacity': '0.9',
      })} fill="${fill}" stroke="${palette.foreground}" stroke-width="2"${selfClose ? ' /' : ''}>`;
    },
  );

  return adjusted;
};

const forceDarkMarkupSpecialColors = (markup, palette) => {
  if (palette.theme !== 'dark') return markup;

  let adjusted = markup.replace(
    /<(rect|polygon)\b([^>]*class="[^"]*\blabel-container\b[^"]*"[^>]*)(\/?)>/gi,
    (match, tagName, attrs, selfClose) => {
      if (/\sfill="[^"]*"/i.test(attrs) || /style="[^"]*fill\s*:/i.test(attrs)) return match;
      return `<${tagName}${upsertMarkupStyle(attrs, {
        fill: palette.nodeFill,
        stroke: palette.foreground,
      })} fill="${palette.nodeFill}" stroke="${palette.foreground}"${selfClose ? ' /' : ''}>`;
    },
  );

  adjusted = adjusted.replace(
    /<rect\b([^>]*class="[^"]*\bpacketBlock\b[^"]*"[^>]*)(\/?)>/gi,
    (_match, attrs, selfClose) =>
      `<rect${upsertMarkupStyle(attrs.replace(/\s(?:fill|stroke|stroke-width)="[^"]*"/gi, ''), {
        fill: palette.nodeFill,
        stroke: palette.foreground,
      })} fill="${palette.nodeFill}" stroke="${palette.foreground}" stroke-width="1"${selfClose ? ' /' : ''}>`,
  );

  adjusted = adjusted.replace(
    /<(text|tspan)\b([^>]*class="[^"]*\b(?:packetLabel|packetByte|packetTitle)\b[^"]*"[^>]*)>/gi,
    (_match, tagName, attrs) =>
      `<${tagName}${upsertMarkupStyle(attrs.replace(/\sfill="[^"]*"/gi, ''), {
        fill: palette.foreground,
        color: palette.foreground,
      })} fill="${palette.foreground}">`,
  );

  adjusted = adjusted.replace(
    /<rect\b([^>]*class="[^"]*\bnode-bkg\b[^"]*"[^>]*)(\/?)>/gi,
    (_match, attrs, selfClose) =>
      `<rect${upsertMarkupStyle(attrs.replace(/\sstroke="[^"]*"/gi, ''), {
        stroke: palette.foreground,
      })} stroke="${palette.foreground}"${selfClose ? ' /' : ''}>`,
  );

  return adjusted;
};

const findMarkupShapeFill = (markup) => {
  const shapeMatch = markup.match(
    /<(?:rect|circle|ellipse|polygon|path)\b[^>]*(?:\sfill="([^"]+)"|style="[^"]*fill\s*:\s*([^;"\s]+)[^"]*")[^>]*>/i,
  );
  const fill = shapeMatch?.[1] || shapeMatch?.[2] || null;
  if (!fill || TRANSPARENT_VALUES.has(fill.toLowerCase())) return null;
  return fill;
};

const applyStringBasedContrast = (svg, theme = 'light') => {
  const palette = getMermaidThemePalette(theme);
  let adjusted = svg;

  adjusted = adjusted.replace(/\sstroke="(?!none|transparent)[^"]*"/gi, ` stroke="${palette.foreground}"`);
  adjusted = adjusted.replace(/stroke\s*:\s*(?!none|transparent)[^;"]+/gi, `stroke:${palette.foreground}`);
  adjusted = adjusted.replace(/(<marker\b[^>]*>)([\s\S]*?)(<\/marker>)/gi, (_match, open, content, close) => {
    const markerContent = content
      .replace(/\sfill="(?!none|transparent)[^"]*"/gi, ` fill="${palette.foreground}"`)
      .replace(/fill\s*:\s*(?!none|transparent)[^;"]+/gi, `fill:${palette.foreground}`)
      .replace(/\sstroke="(?!none|transparent)[^"]*"/gi, ` stroke="${palette.foreground}"`)
      .replace(/stroke\s*:\s*(?!none|transparent)[^;"]+/gi, `stroke:${palette.foreground}`);
    return `${open}${markerContent}${close}`;
  });

  adjusted = forceMarkupTextColor(adjusted, palette.foreground);

  adjusted = adjusted.replace(/<g\b([^>]*)>([\s\S]*?)<\/g>/gi, (groupMarkup, groupAttrs, groupContent) => {
    const fill = findMarkupShapeFill(groupContent);
    if (!fill) return groupMarkup;
    const color = getReadableTextColor(fill, palette);
    return `<g${groupAttrs}>${forceMarkupTextColor(groupContent, color)}</g>`;
  });

  adjusted = adjusted.replace(
    /(<g\b[^>]*>(?:(?!<\/g>)[\s\S])*?<(?:rect|circle|ellipse|polygon|path)\b[^>]*(?:\sfill="([^"]+)"|style="[^"]*fill\s*:\s*([^;"\s]+)[^"]*")[^>]*>(?:(?!<\/g>)[\s\S])*?<\/g>\s*<foreignObject\b[^>]*>)([\s\S]*?)(<\/foreignObject>)/gi,
    (_match, prefix, fillAttr, fillStyle, content, suffix) => {
      const fill = fillAttr || fillStyle || palette.background;
      return `${prefix}${forceMarkupHtmlTextColor(content, getReadableTextColor(fill, palette))}${suffix}`;
    },
  );

  return forceDarkMarkupSpecialColors(forceLightMarkupSpecialTextColor(adjusted, palette), palette);
};

const parseSvgElement = (svg) => {
  if (typeof DOMParser !== 'undefined') {
    const parser = new DOMParser();
    const doc = parser.parseFromString(svg, 'image/svg+xml');
    const svgElement = doc.documentElement;
    if (svgElement.tagName.toLowerCase() === 'svg') {
      return svgElement;
    }
  }

  if (typeof document === 'undefined') return null;

  const template = document.createElement('template');
  template.innerHTML = svg.trim();
  const htmlSvg = template.content.querySelector('svg');
  return htmlSvg?.namespaceURI === 'http://www.w3.org/2000/svg' ? htmlSvg : null;
};

export const getMermaidDiagramScale = (code) => {
  const firstLine = code.trim().split('\n')[0]?.trim() ?? '';
  const firstWord = firstLine.split(/\s+/)[0];

  if (firstWord === 'gantt' || firstWord === 'packet-beta') return 1.1;
  if (
    firstWord === 'graph' ||
    firstWord === 'flowchart' ||
    firstWord === 'ishikawa-beta'
  ) {
    return firstWord === 'ishikawa-beta' ? 0.72 : 0.576;
  }
  if (firstWord === 'requirementDiagram') return 0.8;
  return MERMAID_DIAGRAM_SCALES[firstWord] ?? 1;
};

export const getMermaidConfig = (theme) => ({
  startOnLoad: false,
  theme: 'base',
  securityLevel: 'loose',
  fontFamily: FONT_FAMILY,
  themeVariables: buildThemeVariables(theme),
});

export const applyMermaidNodeTextContrast = (svg, theme = 'light') => {
  if (typeof DOMParser === 'undefined' || typeof XMLSerializer === 'undefined') {
    return applyStringBasedContrast(svg, theme);
  }

  const svgElement = parseSvgElement(svg);
  if (!svgElement) {
    return applyStringBasedContrast(svg, theme);
  }

  normalizeSvgContrast(svgElement, theme);
  return new XMLSerializer().serializeToString(svgElement);
};
