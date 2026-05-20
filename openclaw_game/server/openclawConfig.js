import fs from 'fs';
import path from 'path';
import { getOpenclawHome, getResolvedDataMode } from './dataMode.js';

const cache = {
  mode: '',
  fingerprint: '',
  feishuAccounts: [],
  agents: [],
  agentById: new Map(),
  accountNameById: new Map(),
};

function readJsonIfExists(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

function getFileFingerprintPart(filePath) {
  try {
    const stat = fs.statSync(filePath);
    return `${filePath}:${stat.mtimeMs}:${stat.size}`;
  } catch {
    return `${filePath}:missing`;
  }
}

function resolveAgentWorkspace(agentEntry) {
  const openclawHome = getOpenclawHome();
  return agentEntry?.workspace || path.join(openclawHome, 'agents', agentEntry?.id || 'unknown');
}

function refreshCacheIfNeeded() {
  const mode = getResolvedDataMode();
  if (mode !== 'live') {
    cache.mode = mode;
    cache.fingerprint = '';
    cache.feishuAccounts = [];
    cache.agents = [];
    cache.agentById = new Map();
    cache.accountNameById = new Map();
    return;
  }

  const openclawHome = getOpenclawHome();
  const configPath = path.join(openclawHome, 'openclaw.json');
  const rootConfig = readJsonIfExists(configPath);
  if (!rootConfig) {
    cache.mode = mode;
    cache.fingerprint = '';
    cache.feishuAccounts = [];
    cache.agents = [];
    cache.agentById = new Map();
    cache.accountNameById = new Map();
    return;
  }

  const agentEntries = Array.isArray(rootConfig?.agents?.list) ? rootConfig.agents.list : [];
  const fingerprintParts = [getFileFingerprintPart(configPath)];
  agentEntries.forEach((agentEntry) => {
    const workspace = resolveAgentWorkspace(agentEntry);
    fingerprintParts.push(getFileFingerprintPart(path.join(workspace, 'config.json')));
  });

  const fingerprint = fingerprintParts.join('|');
  if (cache.fingerprint === fingerprint && cache.mode === mode) {
    return;
  }

  const feishuAccounts = rootConfig?.channels?.feishu?.accounts || {};
  const bindings = Array.isArray(rootConfig?.bindings) ? rootConfig.bindings : [];

  const agents = agentEntries.map((agentEntry, index) => {
    const workspace = resolveAgentWorkspace(agentEntry);
    const configFilePath = path.join(workspace, 'config.json');
    const agentConfig = readJsonIfExists(configFilePath) || {};
    const binding = bindings.find((entry) => entry?.agentId === agentEntry.id && entry?.match?.channel === 'feishu');
    const feishuAccountId = agentConfig?.feishu?.account || binding?.match?.accountId || null;
    const accountName = feishuAccountId ? String(feishuAccounts?.[feishuAccountId]?.name || feishuAccountId) : null;
    const displayName = String(agentConfig?.displayName || accountName || agentEntry.id || `agent-${index + 1}`);

    return {
      id: String(agentEntry.id || `agent-${index + 1}`),
      displayName,
      workspace,
      configPath: configFilePath,
      sessionDir: path.join(workspace, 'sessions'),
      sessionsJsonPath: path.join(workspace, 'sessions', 'sessions.json'),
      feishuAccountId,
      accountName,
      index,
    };
  });

  const agentById = new Map(agents.map((agent) => [agent.id, agent]));
  const accountNameById = new Map(
    Object.entries(feishuAccounts)
      .filter(([accountId, value]) => accountId !== 'default' && value?.enabled !== false)
      .map(([accountId, value]) => [accountId, String(value?.name || accountId)])
  );

  cache.mode = mode;
  cache.fingerprint = fingerprint;
  cache.agents = agents;
  cache.agentById = agentById;
  cache.accountNameById = accountNameById;
  cache.feishuAccounts = Object.entries(feishuAccounts)
    .filter(([accountId, value]) => accountId !== 'default' && value?.enabled !== false)
    .map(([accountId, value]) => {
      const agent = agents.find((entry) => entry.feishuAccountId === accountId) || null;
      return {
        id: accountId,
        name: String(value?.name || accountId),
        agentId: agent?.id || null,
        agentDisplayName: agent?.displayName || String(value?.name || accountId),
      };
    });
}

export function getConfiguredAgents() {
  refreshCacheIfNeeded();
  return cache.agents.map((agent) => ({ ...agent }));
}

export function getAgentById(agentId) {
  if (!agentId) return null;
  refreshCacheIfNeeded();
  const agent = cache.agentById.get(String(agentId));
  return agent ? { ...agent } : null;
}

export function getAgentDisplayName(agentId) {
  return getAgentById(agentId)?.displayName || null;
}

export function getFeishuAccounts() {
  refreshCacheIfNeeded();
  return cache.feishuAccounts.map((account) => ({ ...account }));
}

export function getFeishuAccountName(accountId) {
  if (!accountId) return null;
  refreshCacheIfNeeded();
  return cache.accountNameById.get(String(accountId)) || null;
}
