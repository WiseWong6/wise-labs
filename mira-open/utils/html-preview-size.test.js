import test from 'node:test';
import assert from 'node:assert/strict';

import { resolveMeasuredHtmlPreviewExtent } from './html-preview-size.js';

test('resolveMeasuredHtmlPreviewExtent ignores viewport-sized measurements when content is shorter', () => {
  const height = resolveMeasuredHtmlPreviewExtent({
    contentExtent: 248,
    scrollExtent: 400,
    rectExtent: 400,
    viewportExtent: 400,
  });

  assert.equal(height, 248);
});

test('resolveMeasuredHtmlPreviewExtent keeps scroll-driven height for tall documents', () => {
  const height = resolveMeasuredHtmlPreviewExtent({
    contentExtent: 960,
    scrollExtent: 1200,
    rectExtent: 1200,
    viewportExtent: 400,
  });

  assert.equal(height, 1200);
});

test('resolveMeasuredHtmlPreviewExtent falls back to non-viewport rect measurements when needed', () => {
  const height = resolveMeasuredHtmlPreviewExtent({
    contentExtent: 0,
    scrollExtent: 0,
    rectExtent: 312,
    viewportExtent: 400,
  });

  assert.equal(height, 312);
});
