import test from 'node:test';
import assert from 'node:assert/strict';

import {
  getHtmlPreviewCaptureSource,
  sanitizeHtmlForStaticCapture,
} from './html-preview-capture-source.js';

test('sanitizeHtmlForStaticCapture removes inline handlers but retains all scripts', () => {
  const source = '<div onclick="alert(1)">Hello</div><script>alert(1)</script>';
  const sanitized = sanitizeHtmlForStaticCapture(source);

  assert.match(sanitized, /<script>/i);
  assert.doesNotMatch(sanitized, /onclick=/i);
  assert.match(sanitized, /Hello/);
});

test('sanitizeHtmlForStaticCapture retains external script src references', () => {
  const source =
    '<script src="https://cdn.tailwindcss.com"></script><div class="p-4">Hello</div>';
  const sanitized = sanitizeHtmlForStaticCapture(source);

  assert.match(sanitized, /<script[^>]*src="https:\/\/cdn\.tailwindcss\.com"[^>]*>/i);
  assert.match(sanitized, /Hello/);
});

test('getHtmlPreviewCaptureSource reads srcdoc without touching contentDocument', () => {
  let contentDocumentRead = false;
  const iframe = {
    srcdoc: '<!doctype html><html><body><p>capture me</p><script>bad()</script></body></html>',
    get contentDocument() {
      contentDocumentRead = true;
      throw new Error('sandboxed frame should not be read');
    },
    getAttribute(name) {
      return name === 'srcdoc' ? this.srcdoc : null;
    },
  };

  const source = getHtmlPreviewCaptureSource(iframe);

  assert.equal(contentDocumentRead, false);
  assert.match(source, /capture me/);
  assert.match(source, /<script>/i);
});
