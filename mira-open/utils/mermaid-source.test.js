import test from 'node:test';
import assert from 'node:assert/strict';

import { normalizeMermaidSourceForRender } from './mermaid-source.js';

test('normalizeMermaidSourceForRender joins gantt duration soft wraps', () => {
  const source = `gantt
    title AI Artifact Desk 演进路线
    dateFormat YYYY-MM

    section 已完成 v1
    Markdown 渲染           :done, v1a, 2026-01-01,
30d`;

  assert.match(
    normalizeMermaidSourceForRender(source),
    /Markdown 渲染\s+:done, v1a, 2026-01-01, 30d/,
  );
});

test('normalizeMermaidSourceForRender joins gantt date soft wraps', () => {
  const source = `gantt
    section 规划中
    文件管理/多 Tab          :planned, v3a,
2026-06-01, 30d`;

  assert.match(
    normalizeMermaidSourceForRender(source),
    /文件管理\/多 Tab\s+:v3a, 2026-06-01, 30d/,
  );
});

test('normalizeMermaidSourceForRender removes unsupported planned gantt status', () => {
  const source = `gantt
    section 规划中
    Agent API 接口           :planned, v3d, 2026-07-15, 30d`;

  assert.match(
    normalizeMermaidSourceForRender(source),
    /Agent API 接口\s+:v3d, 2026-07-15, 30d/,
  );
});

test('normalizeMermaidSourceForRender leaves non-gantt diagrams unchanged', () => {
  const source = `sequenceDiagram
    participant U as 用户
    U->>T: 点击,
下一行`;

  assert.equal(normalizeMermaidSourceForRender(source), source);
});
