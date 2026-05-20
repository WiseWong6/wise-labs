import test from 'node:test';
import assert from 'node:assert/strict';

import {
  buildStandaloneThemeCss,
  buildHtmlPreviewThemeBridge,
  getThemeFallbackPalette,
  injectThemeBridgeIntoHtmlDocument,
  pickAdaptiveTextColor,
} from './html-theme.js';

test('pickAdaptiveTextColor returns a dark fallback for inherited light text on a light custom background in dark mode', () => {
  const color = pickAdaptiveTextColor({
    theme: 'dark',
    inheritedColor: 'rgb(209, 209, 214)',
    computedColor: 'rgb(209, 209, 214)',
    backgroundColor: 'rgb(224, 242, 254)',
  });

  assert.equal(color, '#111113');
});

test('pickAdaptiveTextColor preserves explicitly different child colors', () => {
  const color = pickAdaptiveTextColor({
    theme: 'dark',
    inheritedColor: 'rgb(209, 209, 214)',
    computedColor: 'rgb(22, 101, 52)',
    backgroundColor: 'rgb(220, 252, 231)',
  });

  assert.equal(color, null);
});

test('pickAdaptiveTextColor does nothing for transparent backgrounds', () => {
  const color = pickAdaptiveTextColor({
    theme: 'dark',
    inheritedColor: 'rgb(209, 209, 214)',
    computedColor: 'rgb(209, 209, 214)',
    backgroundColor: 'rgba(0, 0, 0, 0)',
  });

  assert.equal(color, null);
});

test('pickAdaptiveTextColor leaves already-readable content unchanged', () => {
  const color = pickAdaptiveTextColor({
    theme: 'dark',
    inheritedColor: 'rgb(17, 17, 19)',
    computedColor: 'rgb(17, 17, 19)',
    backgroundColor: 'rgb(224, 242, 254)',
  });

  assert.equal(color, null);
});

test('getThemeFallbackPalette returns stable dark and light fallback tokens', () => {
  assert.deepEqual(getThemeFallbackPalette('dark'), {
    colorScheme: 'dark',
    background: '#111113',
    foreground: '#d1d1d6',
  });
  assert.deepEqual(getThemeFallbackPalette('light'), {
    colorScheme: 'light',
    background: '#ffffff',
    foreground: '#0f172a',
  });
});

test('buildHtmlPreviewThemeBridge injects minimal fallback script with the current theme palette', () => {
  const bridge = buildHtmlPreviewThemeBridge('dark');

  assert.match(bridge, /color-scheme:\s*dark/);
  assert.match(bridge, /#111113/);
  assert.match(bridge, /#d1d1d6/);
  assert.match(bridge, /backgroundColor/);
  assert.match(bridge, /html-preview-theme/);
  assert.match(bridge, /__setArtifactPreviewTheme/);
});

test('buildStandaloneThemeCss returns an explicit dark standalone theme instead of relying on prefers-color-scheme', () => {
  const css = buildStandaloneThemeCss('dark');

  assert.match(css, /body\{margin:0;padding:0;font-family:/);
  assert.match(css, /background:#111113/);
  assert.match(css, /color:#d1d1d6/);
  assert.doesNotMatch(css, /prefers-color-scheme/);
});

test('injectThemeBridgeIntoHtmlDocument adds the standalone bridge into full html documents', () => {
  const themed = injectThemeBridgeIntoHtmlDocument(
    '<!DOCTYPE html><html><head><title>X</title></head><body><div>hello</div></body></html>',
    'dark',
  );

  assert.match(themed, /<style>:root \{ color-scheme: dark; \}<\/style>/);
  assert.match(themed, /fallbackTheme/);
  assert.match(themed, /<head>\s*<meta charset="UTF-8">\s*<style>:root \{ color-scheme: dark; \}<\/style>/);
});

test('injectThemeBridgeIntoHtmlDocument preserves existing charset meta', () => {
  const themed = injectThemeBridgeIntoHtmlDocument(
    '<!DOCTYPE html><html><head><meta charset="UTF-8"><title>X</title></head><body>中文</body></html>',
    'light',
  );

  assert.equal((themed.match(/<meta charset="UTF-8">/g) ?? []).length, 1);
  assert.match(themed, /<meta charset="UTF-8">\s*<style>:root \{ color-scheme: light; \}<\/style>/);
  assert.match(
    themed,
    /<head><meta charset="UTF-8">\s*<style>:root \{ color-scheme: light; \}<\/style>[\s\S]*<title>X<\/title>/,
  );
});

test('injectThemeBridgeIntoHtmlDocument creates a charset head when html documents omit head', () => {
  const themed = injectThemeBridgeIntoHtmlDocument(
    '<!DOCTYPE html><html><body><div>AI文档渲染</div></body></html>',
    'light',
  );

  assert.match(themed, /<html><head><meta charset="UTF-8">\s*<style>:root \{ color-scheme: light; \}<\/style>/);
  assert.match(themed, /<body><div>AI文档渲染<\/div><\/body>/);
});

test('injectThemeBridgeIntoHtmlDocument keeps legacy content-type charset before bridge scripts', () => {
  const themed = injectThemeBridgeIntoHtmlDocument(
    '<!DOCTYPE html><html><head><meta http-equiv="Content-Type" content="text/html; charset=utf-8"><title>中文</title></head><body>AI文档渲染</body></html>',
    'dark',
  );

  assert.match(
    themed,
    /<meta http-equiv="Content-Type" content="text\/html; charset=utf-8">\s*<style>:root \{ color-scheme: dark; \}<\/style>/,
  );
  assert.match(themed, /<title>中文<\/title>/);
});
