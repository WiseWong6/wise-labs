import { getDb } from './db.js';
import { getAgentDisplayName } from './openclawConfig.js';
import { getSessionMetadataBySessionId, listActiveSessionFiles } from './sessionRegistry.js';

function toIso(value) {
  if (!value) return new Date().toISOString();
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return new Date().toISOString();
  return date.toISOString();
}

function normalizeStatus(value, updatedAt) {
  if (value) return value;
  const updated = new Date(updatedAt).getTime();
  if (Number.isNaN(updated)) return 'running';
  const ageMs = Date.now() - updated;
  if (ageMs < 10 * 60 * 1000) return 'running';
  if (ageMs < 2 * 60 * 60 * 1000) return 'completed';
  return 'archived';
}

function buildRunFromSession(file) {
  const metadata = getSessionMetadataBySessionId(file.id);
  if (!metadata || metadata.sessionKind !== 'subagent') return null;

  return {
    runId: metadata.sessionKey || file.id,
    source: 'session',
    sessionKind: 'subagent',
    agentId: metadata.agentId || file.agentId || 'main',
    agentDisplayName: metadata.agentDisplayName || getAgentDisplayName(metadata.agentId) || metadata.agentId || 'Unknown',
    status: normalizeStatus(null, metadata.updatedAt || file.time),
    label: metadata.label || `Sub-agent ${file.id.slice(0, 8)}`,
    summary: metadata.label || metadata.sessionKey || file.name,
    taskClass: 'subagent',
    taskType: 'subagent',
    sessionId: file.id,
    sessionKey: metadata.sessionKey || null,
    parentSessionId: metadata.parentSessionId || null,
    parentSessionKey: metadata.parentSessionKey || null,
    depth: metadata.depth || null,
    startedAt: toIso(file.time),
    updatedAt: toIso(metadata.updatedAt || file.time),
    worldLabel: metadata.label || metadata.sessionKey || file.name,
  };
}

function buildRunFromDispatchRow(row) {
  let payload = null;
  try {
    payload = JSON.parse(row.payload_json || '{}');
  } catch {
    payload = {};
  }

  const runId = payload?.dispatchId || row.id;
  const success = payload?.success;
  let status = 'spawned';
  if (row.type === 'dispatch.accepted') status = 'running';
  if (row.type === 'dispatch.result') status = success === false ? 'failed' : 'completed';

  const taskClass = String(payload?.taskClass || payload?.taskType || 'subagent');
  const label = String(payload?.label || payload?.worldLabel || payload?.prompt || `${taskClass} run`);
  const rawAgentId = String(payload?.agentId || row.agent_id || 'main');
  const agentId = rawAgentId.startsWith('channel-') || rawAgentId === 'agent-orchestrator' ? 'main' : rawAgentId;

  return {
    runId,
    source: 'dispatch',
    sessionKind: 'subagent',
    agentId,
    agentDisplayName: getAgentDisplayName(agentId) || agentId || 'Main Coordinator',
    status,
    label,
    summary: String(payload?.summary || payload?.worldLabel || label),
    taskClass,
    taskType: String(payload?.taskType || taskClass),
    sessionId: payload?.sessionId || null,
    sessionKey: payload?.sessionKey || null,
    parentSessionId: payload?.parentSessionId || null,
    parentSessionKey: payload?.parentSessionKey || null,
    depth: payload?.depth || null,
    startedAt: toIso(row.created_at),
    updatedAt: toIso(row.created_at),
    worldLabel: String(payload?.worldLabel || label),
  };
}

export function listLiveSubagentRuns() {
  const runs = new Map();

  listActiveSessionFiles({ days: 7 }).forEach((file) => {
    const run = buildRunFromSession(file);
    if (run) runs.set(run.runId, run);
  });

  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, type, agent_id, payload_json, created_at
      FROM events
      WHERE type IN ('dispatch.created', 'dispatch.accepted', 'dispatch.result')
      ORDER BY created_at DESC
      LIMIT 200
    `).all();

    rows.reverse().forEach((row) => {
      const run = buildRunFromDispatchRow(row);
      const previous = runs.get(run.runId);
      runs.set(run.runId, {
        ...previous,
        ...run,
        startedAt: previous?.startedAt || run.startedAt,
        updatedAt: run.updatedAt,
      });
    });
  } catch (error) {
    console.error('Error reading dispatch events for subagent runs:', error);
  }

  return [...runs.values()].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}
