import test, { beforeEach } from 'node:test';
import assert from 'node:assert/strict';

import {
  __resetMermaidRendererForTests,
  __setMermaidLoaderForTests,
  getCachedMermaidSvg,
  prewarmAlternateMermaidTheme,
  renderMermaidSvg,
} from './mermaid-renderer.js';

let activeTheme = 'light';
let initializeCalls = [];
let renderCalls = [];

beforeEach(() => {
  activeTheme = 'light';
  initializeCalls = [];
  renderCalls = [];
  __resetMermaidRendererForTests();
  __setMermaidLoaderForTests(async () => ({
    initialize(config) {
      activeTheme = config.themeVariables?.darkMode ? 'dark' : 'light';
      initializeCalls.push(activeTheme);
    },
    async render(id, code) {
      renderCalls.push({ id, code, theme: activeTheme });
      if (code === 'broken') {
        throw new Error('bad diagram');
      }
      return {
        svg: `<svg id="${id}" data-theme="${activeTheme}"><text>${code}</text></svg>`,
      };
    },
  }));
});

test('renderMermaidSvg caches by code and theme', async () => {
  const first = await renderMermaidSvg({ code: 'graph TD\nA --> B', theme: 'light' });
  const second = await renderMermaidSvg({ code: 'graph TD\nA --> B', theme: 'light' });

  assert.equal(first, second);
  assert.equal(renderCalls.length, 1);
  assert.equal(getCachedMermaidSvg({ code: 'graph TD\nA --> B', theme: 'light' }), first);
});

test('renderMermaidSvg keeps separate cached SVGs per theme', async () => {
  const light = await renderMermaidSvg({ code: 'graph TD\nA --> B', theme: 'light' });
  const dark = await renderMermaidSvg({ code: 'graph TD\nA --> B', theme: 'dark' });

  assert.notEqual(light, dark);
  assert.match(light, /data-theme="light"/);
  assert.match(dark, /data-theme="dark"/);
  assert.deepEqual(initializeCalls, ['light', 'dark']);
});

test('prewarmAlternateMermaidTheme renders the opposite theme at low priority', async () => {
  await renderMermaidSvg({ code: 'sequenceDiagram\nA->>B: hi', theme: 'light' });
  await prewarmAlternateMermaidTheme({ code: 'sequenceDiagram\nA->>B: hi', theme: 'light' });

  assert.equal(renderCalls.length, 2);
  assert.match(
    getCachedMermaidSvg({ code: 'sequenceDiagram\nA->>B: hi', theme: 'dark' }) ?? '',
    /data-theme="dark"/,
  );
});

test('queued high priority renders before low priority work that has not started', async () => {
  const low = renderMermaidSvg({ code: 'low', theme: 'light', priority: 'low' });
  const high = renderMermaidSvg({ code: 'high', theme: 'light', priority: 'high' });

  await Promise.all([low, high]);

  assert.deepEqual(renderCalls.map((call) => call.code), ['high', 'low']);
});

test('failed renders are not cached', async () => {
  await assert.rejects(
    renderMermaidSvg({ code: 'broken', theme: 'light' }),
    /bad diagram/,
  );

  assert.equal(getCachedMermaidSvg({ code: 'broken', theme: 'light' }), null);
});
