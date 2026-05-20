import fs from 'fs';
import path from 'path';

import { getAgentById, getAgentDisplayName, getConfiguredAgents, getFeishuAccountName } from './openclawConfig.js';

const cache = {
  fingerprint: '',
  bySessionId: new Map(),
  byFilePath: new Map(),
};

function rankEntry(key, value) {
  let score = 0;
  if (value?.label) score += 4;
  if (value?.origin) score += 2;
  if (value?.deliveryContext) score += 2;
  if (!String(key || '').includes(':run:')) score += 1;
  return score;
}

function statFingerprint(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return `${filePath}:${stat.mtimeMs}:${stat.size}`;
  } catch {
    return `${filePath}:missing`;
  }
}

function normalizeFeishuChatType(chatType) {
  const value = String(chatType || '').toLowerCase();
  if (!value) return null;
  if (value === 'group' || value === 'private') return 'feishu-group';
  if (value === 'direct' || value === 'p2p') return 'feishu-direct';
  return null;
}

function inferChannelFromMetadata(value) {
  const byChatType = normalizeFeishuChatType(
    value?.origin?.chatType ||
    value?.chatType ||
    value?.deliveryContext?.chatType
  );
  if (byChatType) return byChatType;

  const to = String(value?.origin?.to || value?.deliveryContext?.to || value?.lastTo || '');
  if (to.startsWith('chat:oc_')) return 'feishu-group';
  if (to.startsWith('user:ou_')) return 'feishu-direct';

  const provider = String(
    value?.deliveryContext?.channel ||
    value?.origin?.provider ||
    value?.origin?.surface ||
    value?.lastChannel || ''
  ).toLowerCase();
  if (provider === 'webchat' || provider === 'ws') return 'tui';
  if (provider === 'feishu') {
    const from = String(value?.origin?.from || '');
    if (from.startsWith('feishu:ou_')) return 'feishu-direct';
  }

  const label = String(value?.origin?.label || value?.label || '').toLowerCase();
  if (label === 'openclaw-tui') return 'tui';

  return null;
}

function firstString(...values) {
  for (const value of values) {
    if (typeof value === 'string' && value.trim()) return value.trim();
  }
  return null;
}

function firstNumber(...values) {
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) return value;
  }
  return null;
}

export function parseSessionKey(sessionKey) {
  const value = String(sessionKey || '');
  const match = value.match(/^agent:([^:]+):(.*)$/);
  if (!match) {
    return {
      agentId: null,
      route: value,
      kind: 'other',
      subagentId: null,
    };
  }

  const route = match[2] || '';
  const subagentMatch = route.match(/^subagent:([^:]+)$/);

  return {
    agentId: match[1] || null,
    route,
    kind: subagentMatch ? 'subagent' : 'agent',
    subagentId: subagentMatch?.[1] || null,
  };
}

export function sessionKindFromSessionKey(sessionKey) {
  const { agentId, route, kind } = parseSessionKey(sessionKey);
  if (!route) return 'other';
  if (kind === 'subagent') return 'subagent';
  if (route === 'main') return agentId === 'main' ? 'heartbeat' : 'main';
  if (route.startsWith('cron:') || route.startsWith('run:')) return 'cron';
  if (/^tui-/.test(route) || route.startsWith('webchat:')) return 'direct';
  if (route.startsWith('direct:') || route.startsWith('feishu:direct:')) return 'direct';
  if (route.startsWith('feishu:group:')) return 'group';
  return 'other';
}

export function channelFromSessionKey(sessionKey) {
  const { agentId, route } = parseSessionKey(sessionKey);
  if (!route) return 'unknown';
  if (route.startsWith('subagent:')) return 'internal';
  if (route === 'main') return agentId === 'main' ? 'heartbeat' : 'unknown';
  if (route.startsWith('cron:')) return 'cron';
  if (/^tui-/.test(route)) return 'tui';
  if (route.startsWith('webchat:')) return 'tui';
  if (route.startsWith('direct:')) return 'feishu-direct';
  if (route.startsWith('feishu:direct:')) return 'feishu-direct';
  if (route.startsWith('feishu:group:')) return 'feishu-group';
  return 'unknown';
}

export function matchesChannelFilter(sessionChannel, filterChannel) {
  if (!filterChannel) return true;
  if (filterChannel === 'feishu') {
    return ['feishu', 'feishu-direct', 'feishu-group'].includes(sessionChannel);
  }
  return sessionChannel === filterChannel;
}

function buildMetadata(sessionKey, value, agent) {
  const parsedKey = parseSessionKey(sessionKey);
  const sessionKeyChannel = channelFromSessionKey(sessionKey);
  const sessionKind = sessionKindFromSessionKey(sessionKey);
  const inferredChannel = inferChannelFromMetadata(value);
  const agentId = parsedKey.agentId || agent?.id || null;
  const linkedAgent = getAgentById(agentId) || agent || null;
  const accountId = value?.origin?.accountId || value?.deliveryContext?.accountId || value?.lastAccountId || linkedAgent?.feishuAccountId || null;
  const accountName = getFeishuAccountName(accountId) || linkedAgent?.accountName || null;
  const filePath = value?.sessionFile || (linkedAgent?.sessionDir && value?.sessionId
    ? path.join(linkedAgent.sessionDir, `${value.sessionId}.jsonl`)
    : null);

  const parentSessionKey = firstString(
    value?.parentSessionKey,
    value?.parent?.sessionKey,
    value?.spawnedFrom?.sessionKey,
    value?.origin?.sessionKey,
    value?.request?.parentSessionKey
  );
  const parentSessionId = firstString(
    value?.parentSessionId,
    value?.parent?.sessionId,
    value?.spawnedFrom?.sessionId,
    value?.request?.parentSessionId
  );
  const depth = firstNumber(
    value?.depth,
    value?.spawnDepth,
    value?.parentDepth
  );

  return {
    sessionKey,
    sessionId: value?.sessionId || null,
    agentId,
    agentDisplayName: getAgentDisplayName(agentId) || linkedAgent?.displayName || accountName || agentId || 'Unknown',
    accountId,
    accountName,
    label: value?.label || value?.origin?.label || null,
    origin: value?.origin || null,
    deliveryContext: value?.deliveryContext || null,
    lastChannel: value?.lastChannel || null,
    lastAccountId: value?.lastAccountId || null,
    sessionKind,
    isSubagent: sessionKind === 'subagent',
    channel: sessionKeyChannel === 'unknown' ? (inferredChannel || 'unknown') : sessionKeyChannel,
    filePath: filePath ? path.resolve(filePath) : null,
    updatedAt: value?.updatedAt || null,
    parentSessionKey,
    parentSessionId,
    depth,
  };
}

function refreshCacheIfNeeded() {
  const agents = getConfiguredAgents();
  const fingerprint = agents
    .map((agent) => `${agent.id}:${statFingerprint(agent.sessionsJsonPath)}`)
    .join('|');

  if (cache.fingerprint === fingerprint && cache.bySessionId.size > 0) {
    return;
  }

  const nextBySessionId = new Map();
  const nextByFilePath = new Map();

  for (const agent of agents) {
    let parsed;
    try {
      if (!fs.existsSync(agent.sessionsJsonPath)) continue;
      parsed = JSON.parse(fs.readFileSync(agent.sessionsJsonPath, 'utf8'));
    } catch {
      continue;
    }

    for (const [sessionKey, value] of Object.entries(parsed || {})) {
      if (!value?.sessionId) continue;
      const candidate = buildMetadata(sessionKey, value, agent);
      const existing = nextBySessionId.get(value.sessionId);
      if (!existing || rankEntry(sessionKey, value) > rankEntry(existing.sessionKey, existing)) {
        nextBySessionId.set(value.sessionId, candidate);
      }
      if (candidate.filePath) {
        nextByFilePath.set(candidate.filePath, candidate);
      }
    }
  }

  cache.fingerprint = fingerprint;
  cache.bySessionId = nextBySessionId;
  cache.byFilePath = nextByFilePath;
}

export function getSessionMetadataBySessionId(sessionId) {
  if (!sessionId) return null;
  refreshCacheIfNeeded();
  const value = cache.bySessionId.get(String(sessionId));
  return value ? { ...value } : null;
}

export function getSessionMetadataByFilePath(filePath) {
  if (!filePath) return null;
  refreshCacheIfNeeded();
  const resolved = path.resolve(filePath);
  const fromFilePath = cache.byFilePath.get(resolved);
  if (fromFilePath) return { ...fromFilePath };
  const sessionId = path.basename(resolved, '.jsonl');
  return getSessionMetadataBySessionId(sessionId);
}

function isActiveSessionFile(name) {
  return name.endsWith('.jsonl') && !name.includes('.deleted.') && !name.includes('.reset.') && !name.endsWith('.lock');
}

export function listActiveSessionFiles(options = {}) {
  const { days = null } = options;
  const cutoffTime = typeof days === 'number'
    ? Date.now() - (days * 24 * 60 * 60 * 1000)
    : null;

  const files = [];
  for (const agent of getConfiguredAgents()) {
    if (!fs.existsSync(agent.sessionDir)) continue;
    for (const name of fs.readdirSync(agent.sessionDir)) {
      if (!isActiveSessionFile(name)) continue;
      const fullPath = path.join(agent.sessionDir, name);
      let stat;
      try {
        stat = fs.statSync(fullPath);
      } catch {
        continue;
      }
      if (cutoffTime && stat.mtimeMs < cutoffTime) continue;

      const sessionId = path.basename(name, '.jsonl');
      const metadata = getSessionMetadataBySessionId(sessionId);
      files.push({
        id: sessionId,
        name,
        path: fullPath,
        time: stat.mtimeMs,
        agentId: metadata?.agentId || agent.id,
        agentDisplayName: metadata?.agentDisplayName || agent.displayName,
        accountId: metadata?.accountId || agent.feishuAccountId || null,
        accountName: metadata?.accountName || agent.accountName || null,
        channel: metadata?.channel || 'unknown',
        sessionKind: metadata?.sessionKind || 'other',
        isSubagent: metadata?.isSubagent || false,
        sessionKey: metadata?.sessionKey || null,
        label: metadata?.label || null,
        parentSessionKey: metadata?.parentSessionKey || null,
        parentSessionId: metadata?.parentSessionId || null,
        depth: metadata?.depth || null,
      });
    }
  }

  return files.sort((a, b) => b.time - a.time);
}

export function findSessionFileById(sessionId) {
  if (!sessionId) return null;

  const metadata = getSessionMetadataBySessionId(sessionId);
  if (metadata?.filePath && fs.existsSync(metadata.filePath)) {
    return {
      id: String(sessionId),
      name: path.basename(metadata.filePath),
      path: metadata.filePath,
      time: fs.statSync(metadata.filePath).mtimeMs,
      agentId: metadata.agentId,
      agentDisplayName: metadata.agentDisplayName,
      accountId: metadata.accountId,
      accountName: metadata.accountName,
      channel: metadata.channel,
      sessionKind: metadata.sessionKind,
      isSubagent: metadata.isSubagent,
      sessionKey: metadata.sessionKey,
      label: metadata.label,
      parentSessionKey: metadata.parentSessionKey,
      parentSessionId: metadata.parentSessionId,
      depth: metadata.depth,
    };
  }

  return listActiveSessionFiles().find((file) => file.id === String(sessionId)) || null;
}
