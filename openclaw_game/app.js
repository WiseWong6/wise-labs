const CONFIG = {
  IDLE_TIMEOUT_MS: 30000,
  POLL_INTERVAL_MS: 2000,
  RUN_DISMISS_MS: 8000,
};

const CHANNEL_FILTER_LABELS = {
  '': '全部 (近7天)',
  tui: 'TUI / Web',
  'feishu-group': '飞书群聊',
  'feishu-direct': '飞书私聊',
  cron: 'Cron',
  heartbeat: 'Heartbeat',
  internal: '内部 Sub-agent',
};

const CORE_TYPES = ['user-input', 'model-thinking', 'model-output', 'tool-call', 'tool-result'];
const THEME_SEQUENCE = ['main', 'coder', 'searcher', 'writer', 'reviewer', 'data'];
const TASK_CLASS_THEME = {
  research: 'searcher',
  researching: 'searcher',
  code: 'coder',
  coding: 'coder',
  content: 'writer',
  writing: 'writer',
  review: 'reviewer',
  reviewer: 'reviewer',
  data: 'data',
  analytics: 'data',
};
const STATE_CLASSES = ['sdv-idle', 'sdv-receiving', 'sdv-thinking', 'sdv-speaking', 'sdv-tool_calling', 'sdv-tool_waiting', 'sdv-processing', 'sdv-error', 'sdv-task_start', 'sdv-task_complete', 'sdv-heartbeat', 'sdv-done', 'sdv-offline'];

const state = {
  runtime: null,
  streamUrl: '',
  roomId: 'room-42',
  token: 'admin-demo-token',
  currentFilter: 'chat',
  currentSessionId: null,
  currentAgentFilter: '',
  currentChannelFilter: '',
  currentKindFilter: 'all',
  configuredAgents: [],
  allSessions: [],
  subagentRuns: new Map(),
  renderRegistry: new Map(),
  renderRegistryByVisualId: new Map(),
  stationStateByKey: new Map(),
  agentKeyById: new Map(),
  runKeyById: new Map(),
  processedMsgIds: new Set(),
  idleTimers: new Map(),
  speechTimers: new Map(),
  userInputTimer: null,
  officeLineFrame: 0,
  bubbleLayoutFrame: 0,
  stageRenderFrame: 0,
  activeBubbleVisualId: null,
  isInitialLoad: true,
  pollLock: false,
  lastResetTime: 0,
  eventSource: null,
};

document.addEventListener('DOMContentLoaded', () => {
  initApp();
  setupLobster();
  window.addEventListener('resize', scheduleBubbleLayout);
  window.addEventListener('resize', scheduleOfficeLineUpdate);
});

async function initApp() {
  bindControls();

  try {
    await loadBootstrap();
    await resetLog();
    await settleInitialStageLayout();
    state.eventSource = setupEventStream();
    setInterval(pollLatestState, CONFIG.POLL_INTERVAL_MS);
  } finally {
    document.body.classList.remove('app-loading');
    document.body.classList.add('app-ready');
    scheduleOfficeLineUpdate();
    scheduleBubbleLayout();
  }
}

function bindControls() {
  document.getElementById('filter-all').addEventListener('click', () => setLogFilter('all'));
  document.getElementById('filter-chat').addEventListener('click', () => setLogFilter('chat'));

  document.getElementById('kind-selector').addEventListener('change', async (event) => {
    state.currentKindFilter = event.target.value || 'all';
    state.currentSessionId = null;
    document.getElementById('session-selector').value = '';
    populateAgentSelector(state.currentChannelFilter);
    populateSessionSelector(getFilteredSessions(), state.currentChannelFilter);
    applyLogFilters();
    await resetLog();
  });

  document.getElementById('channel-selector').addEventListener('change', async (event) => {
    state.currentChannelFilter = event.target.value || '';
    state.currentSessionId = null;
    state.currentAgentFilter = '';
    document.getElementById('agent-selector').value = '';
    document.getElementById('session-selector').value = '';
    populateAgentSelector(state.currentChannelFilter);
    populateSessionSelector(getFilteredSessions(), state.currentChannelFilter);
    await resetLog();
  });

  document.getElementById('agent-selector').addEventListener('change', async (event) => {
    state.currentAgentFilter = event.target.value || '';
    state.currentSessionId = null;
    document.getElementById('session-selector').value = '';
    populateSessionSelector(getFilteredSessions(), state.currentChannelFilter);
    await resetLog();
  });

  document.getElementById('session-selector').addEventListener('change', async (event) => {
    state.currentSessionId = event.target.value || null;
    await resetLog();
  });

  const logContainer = document.getElementById('log-waterfall');
  const scrollBtn = document.getElementById('scroll-bottom-btn');

  logContainer.addEventListener('scroll', () => {
    const isAtBottom = logContainer.scrollHeight - logContainer.scrollTop - logContainer.clientHeight < 100;
    scrollBtn.style.opacity = isAtBottom ? '0' : '1';
    scrollBtn.style.pointerEvents = isAtBottom ? 'none' : 'auto';
  });

  scrollBtn.addEventListener('click', () => {
    logContainer.scrollTo({ top: logContainer.scrollHeight, behavior: 'smooth' });
  });
}

async function loadBootstrap() {
  const response = await fetch('/api/bootstrap');
  if (!response.ok) throw new Error(`bootstrap failed: ${response.status}`);

  const bootstrap = await response.json();
  state.runtime = bootstrap;
  state.streamUrl = bootstrap.streamUrl;
  state.roomId = bootstrap.roomId || 'room-42';
  state.token = bootstrap.tokens?.admin || 'admin-demo-token';
  state.currentChannelFilter = bootstrap.defaults?.channel || '';
  state.currentKindFilter = bootstrap.defaults?.scope || 'all';
  state.configuredAgents = normalizeAgents(bootstrap.agents || []);
  state.allSessions = normalizeSessions(bootstrap.sessions || []);
  setRuntimeMode(bootstrap.mode, bootstrap.liveDetected);
  syncSubagentRuns(bootstrap.subagentRuns || []);
  renderStage();

  document.getElementById('kind-selector').value = state.currentKindFilter;
  document.getElementById('channel-selector').value = state.currentChannelFilter;
  populateAgentSelector(state.currentChannelFilter);
  populateSessionSelector(getFilteredSessions(), state.currentChannelFilter);
}

function setRuntimeMode(mode, liveDetected) {
  const pill = document.getElementById('runtime-mode');
  if (!pill) return;

  const normalized = mode === 'live' ? 'LIVE' : 'DEMO';
  pill.textContent = liveDetected === false && mode === 'demo' ? 'DEMO (fallback)' : normalized;
  pill.dataset.mode = mode;
}

function normalizeAgents(agents) {
  const normalized = [...agents];
  if (!normalized.some((agent) => agent.id === 'main')) {
    normalized.unshift({ id: 'main', displayName: 'Main Coordinator' });
  }
  return normalized;
}

function normalizeSessions(sessions) {
  return sessions.map((session) => ({
    ...session,
    sessionKind: session.sessionKind || 'other',
    isSubagent: session.isSubagent === true || session.sessionKind === 'subagent',
  }));
}

function normalizeRun(run) {
  const existing = state.subagentRuns.get(run.runId);
  const status = normalizeRunStatus(run.status);
  const now = Date.now();
  const expiresAt = ['completed', 'failed', 'stopped', 'archived'].includes(status)
    ? (existing?.expiresAt || now + CONFIG.RUN_DISMISS_MS)
    : null;

  return {
    ...existing,
    ...run,
    status,
    sessionKind: 'subagent',
    source: run.source || existing?.source || 'dispatch',
    label: run.label || existing?.label || run.worldLabel || run.runId,
    summary: run.summary || existing?.summary || run.worldLabel || run.label || '',
    taskClass: run.taskClass || existing?.taskClass || run.taskType || 'subagent',
    taskType: run.taskType || existing?.taskType || run.taskClass || 'subagent',
    startedAt: run.startedAt || existing?.startedAt || new Date().toISOString(),
    updatedAt: run.updatedAt || existing?.updatedAt || new Date().toISOString(),
    expiresAt,
  };
}

function normalizeRunStatus(value) {
  const status = String(value || '').toLowerCase();
  if (['spawned', 'running', 'completed', 'failed', 'stopped', 'archived'].includes(status)) return status;
  if (status === 'accepted') return 'running';
  if (status === 'result') return 'completed';
  return 'running';
}

function syncSubagentRuns(runs) {
  const next = new Map();
  runs.forEach((run) => {
    if (!run?.runId) return;
    next.set(run.runId, normalizeRun(run));
  });

  const now = Date.now();
  state.subagentRuns.forEach((run, runId) => {
    if (next.has(runId)) return;
    if (run.expiresAt && run.expiresAt > now) {
      next.set(runId, run);
    }
  });

  state.subagentRuns = next;
  cleanupExpiredRuns();
  scheduleStageRender();
}

function cleanupExpiredRuns() {
  const now = Date.now();
  let changed = false;
  state.subagentRuns.forEach((run, runId) => {
    if (run.expiresAt && run.expiresAt <= now) {
      state.subagentRuns.delete(runId);
      changed = true;
    }
  });
  if (changed) {
    scheduleStageRender();
  }
}

function scheduleStageRender() {
  if (state.stageRenderFrame) return;
  state.stageRenderFrame = requestAnimationFrame(() => {
    state.stageRenderFrame = 0;
    renderStage();
  });
}

function renderStage() {
  cleanupExpiredRuns();

  const cluster = document.getElementById('agents-cluster');
  if (!cluster) return;

  const renderItems = buildRenderItems();
  cluster.innerHTML = renderItems.map(renderStation).join('');

  state.renderRegistry = new Map();
  state.renderRegistryByVisualId = new Map();
  state.agentKeyById = new Map();
  state.runKeyById = new Map();

  renderItems.forEach((item) => {
    state.renderRegistry.set(item.key, item);
    state.renderRegistryByVisualId.set(item.visualId, item);
    if (item.kind === 'resident') state.agentKeyById.set(item.agentId, item.key);
    if (item.kind === 'subagent') state.runKeyById.set(item.runId, item.key);
  });

  applySavedStates();
  scheduleOfficeLineUpdate();
  scheduleBubbleLayout();
}

function buildRenderItems() {
  const residentAgents = state.configuredAgents.map((agent, index) => ({
    key: `agent:${agent.id}`,
    visualId: sanitizeId(`agent-${agent.id}`),
    kind: 'resident',
    role: agent.id === 'main' ? 'main' : 'worker',
    agentId: agent.id,
    label: agent.displayName || agent.id,
    meta: agent.id === 'main' ? 'Orchestrator' : 'Persistent Agent',
    theme: themeForResidentAgent(agent, index),
  }));

  const subagentRuns = [...state.subagentRuns.values()]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .map((run, index) => ({
      key: `run:${run.runId}`,
      visualId: sanitizeId(`run-${run.runId}`),
      kind: 'subagent',
      role: 'subagent',
      runId: run.runId,
      agentId: run.agentId || 'main',
      label: run.label || `Sub-agent ${index + 1}`,
      meta: `${formatRunStatus(run.status)} · ${run.summary || run.taskType || '临时执行'}`,
      theme: themeForRun(run, index),
      status: run.status,
    }));

  return [
    ...residentAgents.filter((item) => item.agentId === 'main'),
    ...residentAgents.filter((item) => item.agentId !== 'main'),
    ...subagentRuns,
  ];
}

function renderStation(item) {
  return `
    <div class="agent-station station-${item.role}" id="station-${item.visualId}" data-visual-id="${item.visualId}" data-primary="${item.agentId === 'main' ? 'true' : 'false'}" data-kind="${item.kind}">
      <div id="bubble-${item.visualId}" class="agent-bubble hidden">
        <div class="bubble-inner">
          <div id="bubble-text-${item.visualId}" class="bubble-text">...</div>
          <div class="bubble-tail"></div>
        </div>
      </div>
      <div id="agent-${item.visualId}" class="sdv-character theme-${item.theme} sdv-idle">
        <div class="sdv-head">
          <div class="sdv-hair"></div>
          <div class="sdv-eyes"></div>
          <div class="sdv-mouth"></div>
          <div class="sdv-accessory"></div>
        </div>
        <div class="sdv-body"><div class="sdv-shirt"></div></div>
        <div class="sdv-arm sdv-arm-l"></div>
        <div class="sdv-arm sdv-arm-r"></div>
        <div class="sdv-leg sdv-leg-l"></div>
        <div class="sdv-leg sdv-leg-r"></div>
        ${deskMarkup(item.theme)}
      </div>
      <div class="station-label">${escapeHtml(item.label)}</div>
      <div class="station-meta">${escapeHtml(item.meta || '')}</div>
    </div>
  `;
}

function deskMarkup(theme) {
  const deskKind = deskKindForTheme(theme);
  if (deskKind === 'dual') {
    return `<div class="desk desk-data"><div class="monitor-dual"></div><div class="monitor-dual"></div></div>`;
  }
  if (deskKind === 'books') {
    return `<div class="desk desk-searcher"><div class="books"></div></div>`;
  }
  if (deskKind === 'main') {
    return `<div class="desk desk-main"><div class="monitor-main"></div></div>`;
  }
  return `<div class="desk desk-reviewer"><div class="monitor-main"></div></div>`;
}

function deskKindForTheme(theme) {
  if (theme === 'coder' || theme === 'data') return 'dual';
  if (theme === 'searcher' || theme === 'writer') return 'books';
  if (theme === 'main') return 'main';
  return 'single';
}

function themeForResidentAgent(agent, index) {
  if (agent.id === 'main') return 'main';
  return TASK_CLASS_THEME[agent.id] || THEME_SEQUENCE[(index % (THEME_SEQUENCE.length - 1)) + 1];
}

function themeForRun(run, index) {
  return TASK_CLASS_THEME[run.taskClass] || TASK_CLASS_THEME[run.taskType] || THEME_SEQUENCE[(index % (THEME_SEQUENCE.length - 1)) + 1];
}

function sanitizeId(value) {
  return String(value || 'id').replace(/[^a-zA-Z0-9_-]+/g, '-');
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function applySavedStates() {
  state.stationStateByKey.forEach((stationState, key) => {
    const item = state.renderRegistry.get(key);
    if (!item) return;
    applyVisualState(item.visualId, stationState.state, stationState.message || '', false);
  });
}

function nextFrame() {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}

async function settleInitialStageLayout() {
  scheduleOfficeLineUpdate();
  scheduleBubbleLayout();
  await nextFrame();
  await nextFrame();
}

function scheduleOfficeLineUpdate() {
  if (state.officeLineFrame) return;
  state.officeLineFrame = requestAnimationFrame(() => {
    state.officeLineFrame = 0;
    updateOfficeLines();
  });
}

function updateOfficeLines() {
  const svg = document.getElementById('office-svg-lines');
  const floor = document.querySelector('.office-floor');
  const mainStation = document.querySelector('.agent-station[data-primary="true"]');
  if (!svg || !floor || !mainStation) return;

  const floorRect = floor.getBoundingClientRect();
  const mainRect = mainStation.getBoundingClientRect();
  const startX = mainRect.left - floorRect.left + mainRect.width / 2;
  const startY = mainRect.top - floorRect.top + mainRect.height / 2 + 20;
  svg.innerHTML = '';

  [...document.querySelectorAll('.agent-station:not([data-primary="true"])')].forEach((station) => {
    if (station.classList.contains('offline')) return;
    const visualId = station.dataset.visualId;
    const rect = station.getBoundingClientRect();
    const endX = rect.left - floorRect.left + rect.width / 2;
    const endY = rect.top - floorRect.top + rect.height / 2 + 20;
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.id = `link-${visualId}`;
    path.classList.add('office-link-path');
    path.setAttribute('d', `M ${startX} ${startY} L ${endX} ${endY}`);
    svg.appendChild(path);

    const sprite = document.getElementById(`agent-${visualId}`);
    if (sprite && !sprite.classList.contains('sdv-idle') && !sprite.classList.contains('sdv-offline')) {
      path.classList.add('active');
    }
  });
}

function scheduleBubbleLayout() {
  if (state.bubbleLayoutFrame) return;
  state.bubbleLayoutFrame = requestAnimationFrame(() => {
    state.bubbleLayoutFrame = 0;
    [...document.querySelectorAll('.agent-bubble:not(.hidden)')].forEach((bubble) => {
      const visualId = bubble.id.replace('bubble-', '');
      layoutAgentSpeechBubble(visualId);
    });
  });
}

function layoutAgentSpeechBubble(visualId) {
  const bubble = document.getElementById(`bubble-${visualId}`);
  const bubbleInner = bubble?.querySelector('.bubble-inner');
  const wrapper = bubble?.closest('.agent-station');
  const stage = document.querySelector('.center-stage');
  if (!bubble || bubble.classList.contains('hidden') || !bubbleInner || !wrapper || !stage) return;

  const wrapperRect = wrapper.getBoundingClientRect();
  const stageRect = stage.getBoundingClientRect();
  const bubbleStyles = window.getComputedStyle(bubble);
  const stageStyles = window.getComputedStyle(stage);
  const stageTopPadding = parseFloat(stageStyles.paddingTop) || 0;
  const bubbleGap = parseFloat(bubbleStyles.marginBottom) || 0;
  const safeTop = stageRect.top + stageTopPadding + 8;
  const availableHeight = Math.max(80, Math.floor(wrapperRect.top - safeTop - bubbleGap));
  bubbleInner.style.maxHeight = `${availableHeight}px`;
}

function setLogFilter(mode) {
  state.currentFilter = mode;
  document.getElementById('filter-chat').classList.toggle('active', mode === 'chat');
  document.getElementById('filter-all').classList.toggle('active', mode === 'all');
  applyLogFilters();
}

function applyLogFilters() {
  document.querySelectorAll('.log-entry').forEach((entry) => {
    const logType = entry.dataset.logType;
    const scope = entry.dataset.scope || 'user';
    const visibleByType = state.currentFilter === 'all' || CORE_TYPES.includes(logType);
    const visibleByScope = state.currentKindFilter === 'all' || scope === state.currentKindFilter;
    entry.style.display = visibleByType && visibleByScope ? 'flex' : 'none';
  });
}

function sortSessionsByLastModified(sessions) {
  return [...sessions].sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

function getSessionsForChannel(channel) {
  if (!channel) return state.allSessions;
  return state.allSessions.filter((session) => matchesSessionChannel(session, channel));
}

function matchesSessionChannel(session, channel) {
  if (!channel) return true;
  return session.channel === channel;
}

function getFilteredSessions(channel = state.currentChannelFilter) {
  const sessions = sortSessionsByLastModified(getSessionsForChannel(channel))
    .filter((session) => matchesScope(session, state.currentKindFilter));

  if (!state.currentAgentFilter) return sessions;
  return sessions.filter((session) => session.agentId === state.currentAgentFilter);
}

function matchesScope(record, scope) {
  if (!scope || scope === 'all') return true;
  if (scope === 'subagent') return record.sessionKind === 'subagent' || record.isSubagent === true;
  if (scope === 'user') return record.sessionKind !== 'subagent' && record.isSubagent !== true;
  return true;
}

function getAvailableAgentsForCurrentScope(channel) {
  const sessions = getSessionsForChannel(channel).filter((session) => matchesScope(session, state.currentKindFilter));
  const sessionAgentIds = new Set(sessions.map((session) => session.agentId).filter(Boolean));
  return state.configuredAgents.filter((agent) => sessionAgentIds.has(agent.id));
}

function populateAgentSelector(channel = '') {
  const selector = document.getElementById('agent-selector');
  selector.innerHTML = '';
  selector.appendChild(new Option('🤖 全部 Agent', ''));

  getAvailableAgentsForCurrentScope(channel).forEach((agent) => {
    selector.appendChild(new Option(`🤖 ${agent.displayName || agent.id}`, agent.id));
  });

  const hasCurrent = [...selector.options].some((option) => option.value === state.currentAgentFilter);
  if (!hasCurrent) state.currentAgentFilter = '';
  selector.value = state.currentAgentFilter;
}

function populateSessionSelector(sessions, channel = '') {
  const selector = document.getElementById('session-selector');
  const firstLabel = channel ? `全部 (${CHANNEL_FILTER_LABELS[channel] || channel})` : CHANNEL_FILTER_LABELS[''];
  selector.options[0].textContent = firstLabel;
  selector.options[0].value = '';

  while (selector.options.length > 1) selector.remove(1);

  sortSessionsByLastModified(sessions).forEach((session) => {
    selector.appendChild(new Option(`${extractSessionTarget(session)} · ${formatShortDateTime(session.lastModified)}`, session.id));
  });
}

function extractSessionTarget(session) {
  if (session.sessionKind === 'subagent') {
    return `Sub-agent · ${session.label || session.agentDisplayName || session.id}`;
  }

  if (session.channel === 'feishu-group') {
    return `群 ${session.label || session.id}`;
  }
  if (session.channel === 'feishu-direct') {
    return session.label || session.id;
  }
  if (session.channel === 'tui') {
    return session.label || 'TUI / Web';
  }
  if (session.channel === 'cron') return session.label || 'Cron';
  if (session.channel === 'heartbeat') return 'Heartbeat';
  return session.label || session.channel || session.id;
}

function formatShortDateTime(value) {
  if (!value) return '暂无会话';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '暂无会话';
  return `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
}

function setupEventStream() {
  if (!state.streamUrl) return null;

  const eventSource = new EventSource(state.streamUrl);
  eventSource.onopen = () => setConnectionStatus(true);
  eventSource.onmessage = (event) => {
    if (!event.data || event.data === 'ping') return;
    try {
      handleIncomingEvent(JSON.parse(event.data));
    } catch (error) {
      console.error('SSE parse error', error);
    }
  };
  eventSource.onerror = () => setConnectionStatus(false);
  return eventSource;
}

function setConnectionStatus(isConnected) {
  const badge = document.getElementById('connection-status');
  const label = badge?.querySelector('span');
  if (label) label.textContent = isConnected ? 'Connected' : 'Disconnected';
  badge?.classList.toggle('disconnected', !isConnected);
  badge?.classList.toggle('connected', isConnected);
}

async function resetLog() {
  state.pollLock = true;
  state.lastResetTime = Date.now();
  state.processedMsgIds.clear();
  const logContainer = document.getElementById('log-waterfall');
  logContainer.style.opacity = '0';
  logContainer.innerHTML = '';
  state.isInitialLoad = true;
  await doFetchAndProcessLatest();
  logContainer.scrollTop = logContainer.scrollHeight;
  logContainer.style.opacity = '';
  state.isInitialLoad = false;
  state.pollLock = false;
}

async function pollLatestState() {
  if (state.pollLock) return;
  await doFetchAndProcessLatest();
}

async function doFetchAndProcessLatest() {
  const params = new URLSearchParams();
  params.set('token', state.token);
  params.set('scope', state.currentKindFilter);

  if (state.currentSessionId) {
    params.set('session', state.currentSessionId);
  } else {
    if (state.currentChannelFilter) params.set('channel', state.currentChannelFilter);
    if (state.currentAgentFilter) params.set('agentId', state.currentAgentFilter);
  }

  try {
    const response = await fetch(`/api/sessions/latest?${params.toString()}`);
    if (!response.ok) return;
    const payload = await response.json();
    syncSubagentRuns(payload.subagentRuns || []);

    const messages = (payload.messages || []).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    messages.forEach((message) => {
      const messageKey = getMessageKey(message);
      if (state.processedMsgIds.has(messageKey)) return;
      state.processedMsgIds.add(messageKey);
      processHistoricalMessage(message);
    });
  } catch (error) {
    console.error('latest polling failed', error);
  }
}

function processHistoricalMessage(message) {
  const role = message.message?.role || 'system';
  const content = message.message?.content || '';
  const targetVisualId = resolveVisualTarget(message);

  if (role === 'user') {
    const text = extractTextSegments(content);
    addLogEntry(message, true, cleanUserInput(text), 'user-input');
    if (!isSubagentPayload(message)) {
      displayUserInput(text, { persist: true });
      updateVisualStateById(targetVisualId, 'receiving');
    }
    return;
  }

  if (role === 'assistant') {
    const parsed = parseAssistantContent(content);
    if (parsed.thinking) addLogEntry(message, false, parsed.thinking, 'model-thinking');
    if (parsed.text) {
      addLogEntry(message, false, parsed.text, 'model-output');
      hideUserInput();
      updateVisualStateById(targetVisualId, 'speaking', parsed.text);
    } else if (parsed.thinking) {
      updateVisualStateById(targetVisualId, 'thinking');
    }
    return;
  }

  if (role === 'toolResult') {
    const text = extractTextSegments(content);
    if (text) addLogEntry(message, false, text, 'tool-result');
    updateVisualStateById(targetVisualId, 'processing');
  }
}

function handleIncomingEvent(event) {
  const eventKey = getMessageKey({ ...event, id: event.id || event.eventId });
  if (state.processedMsgIds.has(eventKey)) return;

  const payload = event.payload || {};
  const eventChannel = payload.channel || '';
  const eventSessionId = payload.sessionId || '';
  const eventAgentId = payload.agentId || event.agentId || '';

  if (state.currentSessionId) {
    if (eventSessionId && eventSessionId !== state.currentSessionId) return;
  } else {
    if (state.currentChannelFilter && eventChannel && eventChannel !== state.currentChannelFilter) return;
    if (state.currentAgentFilter && eventAgentId && eventAgentId !== state.currentAgentFilter) return;
    if (!matchesScope(payload, state.currentKindFilter) && !isDispatchEvent(event)) return;
  }

  state.processedMsgIds.add(eventKey);

  const visualId = resolveVisualTarget(event);
  const logType = isDispatchEvent(event) ? 'system-event' : deriveLogType(event);
  const content = resolveEventContent(event);

  if (payload.role === 'user') {
    displayUserInput(content, { persist: true });
    addLogEntry(event, true, cleanUserInput(content), 'user-input');
    updateVisualStateById(visualId, 'receiving');
    return;
  }

  if (event.type === 'dispatch.created') {
    addLogEntry(event, false, payload.worldLabel || event.summary, logType);
    updateVisualStateById(visualId, 'thinking', payload.summary || payload.worldLabel || 'Sub-agent spawning');
    return;
  }

  if (event.type === 'dispatch.accepted') {
    addLogEntry(event, false, payload.worldLabel || event.summary, logType);
    updateVisualStateById(visualId, 'processing', payload.summary || payload.worldLabel || 'Sub-agent running');
    return;
  }

  if (event.type === 'dispatch.result') {
    addLogEntry(event, false, payload.summary || event.summary, logType);
    updateVisualStateById(visualId, payload.success === false ? 'error' : 'task_complete', payload.summary || event.summary);
    return;
  }

  if (payload.role === 'assistant') {
    const parsed = parseAssistantContent(payload.content || content);
    if (parsed.thinking) {
      addLogEntry(event, false, parsed.thinking, 'model-thinking');
      updateVisualStateById(visualId, 'thinking', parsed.thinking);
    }
    if (parsed.text) {
      addLogEntry(event, false, parsed.text, 'model-output');
      hideUserInput();
      updateVisualStateById(visualId, 'speaking', parsed.text);
    }
    return;
  }

  if (payload.role === 'toolResult' || event.type === 'tool.result') {
    addLogEntry(event, false, content, 'tool-result');
    updateVisualStateById(visualId, 'processing', content);
    return;
  }

  addLogEntry(event, false, content || event.summary || event.type, logType);
  updateVisualStateById(visualId, event.type.includes('heartbeat') ? 'heartbeat' : 'processing', content || event.summary);
}

function resolveVisualTarget(record) {
  const payload = record.payload || record;

  if (isDispatchEvent(record) || isSubagentPayload(payload)) {
    const run = ensureRunFromPayload(payload, record.type);
    if (run) {
      const runKey = state.runKeyById.get(run.runId) || `run:${run.runId}`;
      const runItem = state.renderRegistry.get(runKey);
      if (runItem) return runItem.visualId;
    }
  }

  const agentId = payload.agentId || payload.agent_id || 'main';
  const key = state.agentKeyById.get(agentId) || 'agent:main';
  return state.renderRegistry.get(key)?.visualId || sanitizeId('agent-main');
}

function ensureRunFromPayload(payload, eventType = '') {
  const runId = payload.dispatchId || payload.runId || payload.sessionKey || payload.sessionId;
  if (!runId) return null;

  const status = deriveRunStatus(payload, eventType);
  const run = normalizeRun({
    runId,
    source: payload.dispatchId ? 'dispatch' : 'session',
    agentId: payload.agentId || 'main',
    agentDisplayName: payload.agentDisplayName || 'Main Coordinator',
    sessionId: payload.sessionId || null,
    sessionKey: payload.sessionKey || null,
    parentSessionId: payload.parentSessionId || null,
    parentSessionKey: payload.parentSessionKey || null,
    depth: payload.depth || null,
    status,
    label: payload.label || payload.worldLabel || payload.sessionKey || 'Sub-agent',
    summary: payload.summary || payload.worldLabel || payload.sessionKey || '',
    taskClass: payload.taskClass || payload.taskType || 'subagent',
    taskType: payload.taskType || payload.taskClass || 'subagent',
    startedAt: payload.startedAt || payload.timestamp || new Date().toISOString(),
    updatedAt: payload.updatedAt || payload.timestamp || new Date().toISOString(),
    worldLabel: payload.worldLabel || payload.label || '',
  });

  const previous = state.subagentRuns.get(run.runId);
  state.subagentRuns.set(run.runId, run);

  if (!previous || JSON.stringify(previous) !== JSON.stringify(run)) {
    renderStage();
  }

  return run;
}

function deriveRunStatus(payload, eventType) {
  if (payload.status) return payload.status;
  if (eventType === 'dispatch.created') return 'spawned';
  if (eventType === 'dispatch.accepted') return 'running';
  if (eventType === 'dispatch.result') return payload.success === false ? 'failed' : 'completed';
  return 'running';
}

function updateVisualStateById(visualId, nextState, message = '') {
  const item = state.renderRegistryByVisualId.get(visualId);
  if (!item) return;
  state.stationStateByKey.set(item.key, { state: nextState, message });
  applyVisualState(visualId, nextState, message, true);
}

function applyVisualState(visualId, nextState, message = '', shouldScheduleIdle = true) {
  const sprite = document.getElementById(`agent-${visualId}`);
  if (!sprite) return;

  STATE_CLASSES.forEach((className) => sprite.classList.remove(className));
  sprite.classList.add(`sdv-${nextState}`);

  const station = document.getElementById(`station-${visualId}`);
  station?.classList.toggle('offline', nextState === 'offline');

  const link = document.getElementById(`link-${visualId}`);
  if (link) {
    link.classList.toggle('active', !['idle', 'offline', 'done'].includes(nextState));
  }

  if (message && nextState !== 'offline') {
    showAgentSpeech(message, visualId);
  } else if (['idle', 'done', 'offline', 'task_complete'].includes(nextState)) {
    hideAgentSpeech(visualId);
  }

  if (!shouldScheduleIdle) {
    scheduleOfficeLineUpdate();
    return;
  }

  const item = state.renderRegistryByVisualId.get(visualId);
  const stationKey = item?.key;
  if (!stationKey) return;

  const previousTimer = state.idleTimers.get(stationKey);
  if (previousTimer) clearTimeout(previousTimer);

  if (!['idle', 'done', 'offline', 'task_complete', 'error'].includes(nextState)) {
    state.idleTimers.set(stationKey, setTimeout(() => {
      updateVisualStateById(visualId, 'idle');
    }, CONFIG.IDLE_TIMEOUT_MS));
  }

  scheduleOfficeLineUpdate();
}

function showAgentSpeech(text, visualId) {
  const bubble = document.getElementById(`bubble-${visualId}`);
  const bubbleText = document.getElementById(`bubble-text-${visualId}`);
  if (!bubble || !bubbleText) return;

  const summarized = summarizeSpeechText(text);
  if (!summarized) return;

  hideOtherBubbles(visualId);
  state.activeBubbleVisualId = visualId;
  bubbleText.innerHTML = renderMarkdownContent(summarized);
  bubble.classList.remove('hidden');
  scheduleBubbleLayout();

  const item = state.renderRegistryByVisualId.get(visualId);
  const key = item?.key;
  if (!key) return;

  const previousTimer = state.speechTimers.get(key);
  if (previousTimer) clearTimeout(previousTimer);
  state.speechTimers.set(key, setTimeout(() => hideAgentSpeech(visualId), 5000));
}

function hideAgentSpeech(visualId) {
  const bubble = document.getElementById(`bubble-${visualId}`);
  if (bubble) bubble.classList.add('hidden');

  const item = state.renderRegistryByVisualId.get(visualId);
  const key = item?.key;
  if (key && state.speechTimers.get(key)) {
    clearTimeout(state.speechTimers.get(key));
    state.speechTimers.delete(key);
  }

  if (state.activeBubbleVisualId === visualId) {
    state.activeBubbleVisualId = null;
  }
}

function hideOtherBubbles(activeVisualId) {
  [...document.querySelectorAll('.agent-bubble')].forEach((bubble) => {
    const visualId = bubble.id.replace('bubble-', '');
    if (visualId !== activeVisualId) hideAgentSpeech(visualId);
  });
}

function summarizeSpeechText(text) {
  const normalized = String(text ?? '')
    .replace(/```[\s\S]*?```/g, '[code]')
    .replace(/\s+/g, ' ')
    .trim();
  if (!normalized) return '';
  return normalized.length <= 180 ? normalized : `${normalized.slice(0, 179).trimEnd()}…`;
}

function displayUserInput(text, options = {}) {
  const container = document.getElementById('user-bubble-container');
  const content = document.getElementById('user-bubble-content');
  const { persist = false, timeoutMs = 10000 } = options;
  content.innerHTML = renderMarkdownContent(cleanUserInput(text));
  container.classList.add('visible');

  if (state.userInputTimer) clearTimeout(state.userInputTimer);
  if (!persist) {
    state.userInputTimer = setTimeout(() => hideUserInput(), timeoutMs);
  }
}

function hideUserInput() {
  if (state.userInputTimer) clearTimeout(state.userInputTimer);
  state.userInputTimer = null;
  document.getElementById('user-bubble-container').classList.remove('visible');
}

function addLogEntry(payload, isUser, contentOverride, logType = 'system-event') {
  const container = document.getElementById('log-waterfall');
  const scrollBtn = document.getElementById('scroll-bottom-btn');
  const entry = document.createElement('div');
  const content = resolveLogDisplayContent(payload, contentOverride);
  const scope = logScopeForPayload(payload, logType);
  const channel = resolveLogChannel(payload);
  const time = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const typeLabel = logType.toUpperCase();
  const jsonStr = JSON.stringify(payload, null, 2);

  entry.className = `log-entry ${isUser ? 'user-log' : 'system-log'}`;
  entry.dataset.logType = logType;
  entry.dataset.scope = scope;
  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-type ${isUser ? 'user' : (logType === 'error' ? 'error' : 'system')}">${channel} · ${typeLabel}</span>
      <span class="log-time">${time}</span>
    </div>
    <div class="log-bubble">
      <div class="log-content">${renderMarkdownContent(content)}</div>
      <div class="log-body collapsed">${escapeHtml(jsonStr)}</div>
      <div class="log-actions">
        <button class="expand-btn">
          <i class="fa-solid fa-code"></i>
          <span>查看 JSON</span>
        </button>
        <button class="copy-json-btn" style="display:none">
          <i class="fa-solid fa-copy"></i>
          <span>复制</span>
        </button>
      </div>
    </div>
  `;

  const expandBtn = entry.querySelector('.expand-btn');
  const copyBtn = entry.querySelector('.copy-json-btn');
  const logBody = entry.querySelector('.log-body');

  expandBtn.onclick = () => {
    const isCollapsed = logBody.classList.contains('collapsed');
    logBody.classList.toggle('collapsed');
    expandBtn.querySelector('span').textContent = isCollapsed ? '收起' : '查看 JSON';
    copyBtn.style.display = isCollapsed ? 'flex' : 'none';
  };

  copyBtn.onclick = () => {
    navigator.clipboard.writeText(jsonStr).then(() => {
      copyBtn.querySelector('span').textContent = '已复制!';
      setTimeout(() => { copyBtn.querySelector('span').textContent = '复制'; }, 2000);
    });
  };

  const wasAtBottom = !state.isInitialLoad && (container.scrollHeight - container.scrollTop - container.clientHeight < 100);
  if (!state.isInitialLoad) entry.classList.add('animate-in');
  container.appendChild(entry);
  applyLogFilters();

  if (!state.isInitialLoad) {
    if (wasAtBottom) {
      const behavior = Date.now() - state.lastResetTime < 3000 ? 'instant' : 'smooth';
      container.scrollTo({ top: container.scrollHeight, behavior });
    } else {
      scrollBtn.style.opacity = '1';
      scrollBtn.style.pointerEvents = 'auto';
    }
  }

  while (container.children.length > 200) container.removeChild(container.firstChild);
}

function resolveLogDisplayContent(payload, contentOverride) {
  let content = contentOverride ?? payload?.summary ?? payload?.text ?? '';
  if (!content && payload?.data) content = JSON.stringify(payload.data, null, 2);
  if (Array.isArray(content)) content = extractTextSegments(content, ['text', 'thinking']);
  if (content && typeof content === 'object') content = JSON.stringify(content, null, 2);
  return String(content ?? '').trim();
}

function resolveLogChannel(payload) {
  const body = payload.payload || payload;
  const channel = body.channel || 'System';
  const sessionKind = body.sessionKind === 'subagent' || payload.type?.startsWith('dispatch.') ? 'Sub-agent' : null;
  const agentLabel = body.agentDisplayName || '';
  if (sessionKind) return agentLabel ? `${agentLabel} · ${sessionKind}` : sessionKind;
  return agentLabel && ['tui', 'feishu-direct', 'feishu-group'].includes(channel) ? `${agentLabel} · ${channel}` : channel;
}

function logScopeForPayload(payload, logType) {
  if (logType === 'subagent-event') return 'subagent';
  if (isDispatchEvent(payload)) return 'subagent';
  if (isSubagentPayload(payload.payload || payload)) return 'subagent';
  return 'user';
}

function deriveLogType(event) {
  if (event.type === 'tool.result' || event.payload?.role === 'toolResult') return 'tool-result';
  if (event.payload?.role === 'assistant') return 'model-output';
  if (event.payload?.role === 'user') return 'user-input';
  if (event.type?.startsWith('dispatch.')) return 'subagent-event';
  return 'system-event';
}

function resolveEventContent(event) {
  const payload = event.payload || {};
  if (payload.content) {
    if (Array.isArray(payload.content)) return extractTextSegments(payload.content, ['text', 'thinking']);
    return String(payload.content);
  }
  return event.summary || payload.summary || '';
}

function getMessageKey(message) {
  return message.dedupeKey
    || message.eventId
    || (message.sessionId && message.id ? `${message.sessionId}:${message.id}` : '')
    || message.id
    || `${message.type || 'entry'}:${message.timestamp || ''}:${message.agentId || ''}`;
}

function renderMarkdownContent(content) {
  return marked.parse(String(content ?? '').replace(/\n{2,}/g, '\n'));
}

function extractTextSegments(content, allowedTypes = ['text']) {
  if (Array.isArray(content)) {
    return content
      .filter((item) => allowedTypes.includes(item.type))
      .map((item) => item.text || item.thinking || '')
      .join('\n')
      .trim();
  }
  return typeof content === 'string' ? content.trim() : '';
}

function parseAssistantContent(content) {
  const result = { text: '', thinking: '', tools: [] };
  if (!Array.isArray(content)) {
    result.text = cleanAssistantText(content);
    return result;
  }

  content.forEach((item) => {
    if (item.type === 'text') result.text += cleanAssistantText(item.text);
    if (item.type === 'thinking') result.thinking += item.thinking;
    if (item.type === 'toolCall') result.tools.push(item);
  });

  return result;
}

function cleanAssistantText(text) {
  return String(text || '').replace(/^\[\[[^\]]*\]\]\s*/g, '');
}

function cleanUserInput(text) {
  if (!text) return '';
  let cleaned = String(text);
  cleaned = cleaned.replace(/Conversation info \(untrusted metadata\):\s*```[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/Sender \(untrusted metadata\):\s*```[\s\S]*?```/gi, '');
  cleaned = cleaned.replace(/Sender \(untrusted metadata\):[\s\S]*?\]\s*/gi, '');
  cleaned = cleaned.replace(/\[message_id:[^\]]+\]\n?/gi, '');
  cleaned = cleaned.replace(/^\[System:.*\]$/gm, '');
  cleaned = cleaned.replace(/<at\s+user_id="[^"]*">([^<]*)<\/at>/gi, '@$1');
  cleaned = cleaned.replace(/^\[(feishu|tui|web)\]\s*/i, '');
  return cleaned.trim();
}

function isSubagentPayload(payload) {
  return payload?.sessionKind === 'subagent'
    || payload?.isSubagent === true
    || payload?.channel === 'internal'
    || String(payload?.sessionKey || '').includes(':subagent:')
    || Boolean(payload?.dispatchId);
}

function isDispatchEvent(record) {
  return String(record?.type || '').startsWith('dispatch.');
}

function formatRunStatus(status) {
  switch (status) {
    case 'spawned': return 'Spawned';
    case 'running': return 'Running';
    case 'completed': return 'Completed';
    case 'failed': return 'Failed';
    case 'archived': return 'Archived';
    default: return status || 'Running';
  }
}

function setupLobster() {
  const container = document.getElementById('lobster-container');
  if (!container) return;

  let x = Math.random() * (window.innerWidth / 4) + 50;
  let y = window.innerHeight * 0.6;
  let heading = Math.random() * 360;

  function move() {
    x = Math.random() * (window.innerWidth / 3) + 50;
    y = window.innerHeight * (Math.random() * 0.4 + 0.5);
    heading = Math.random() * 360;
    container.style.transform = `translate(${x}px, ${y}px) rotate(${heading}deg)`;
  }

  move();
  setInterval(move, 4000);
}
