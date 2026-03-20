// OpenClaw Core - Frontend Implementation
// V4: Premium Theme with Stardew Valley Character & Lobster

const CONFIG = {
    STREAM_URL: '/api/rooms/room-42/stream?token=admin-demo-token&replay=0',
    IDLE_TIMEOUT_MS: 30000
};

const CHANNEL_FILTER_LABELS = {
    '': '全部 (近7天)',
    tui: 'TUI / Web',
    'feishu-group': '飞书群聊',
    'feishu-direct': '飞书私聊',
    cron: 'Cron',
    heartbeat: 'Heartbeat',
};

// --- Initialization ---

document.addEventListener('DOMContentLoaded', () => {
    initApp();
    setupLobster();
    setupStateToggles();
    window.addEventListener('resize', layoutAgentSpeechBubble);
});

async function initApp() {
    // 0. Load session list
    await loadSessionList();

    // 1. 用 resetLog 统一初始化，与手动切换频道行为一致
    await resetLog();

    // 2. Continue polling
    setInterval(pollSessionHistory, 2000);

    // 3. Setup Stream
    setupEventStream();

    // 4. Filters
    document.getElementById('filter-all').addEventListener('click', () => setFilter('all'));
    document.getElementById('filter-chat').addEventListener('click', () => setFilter('chat'));

    // 5. Channel + Session 联动选择器
    document.getElementById('channel-selector').addEventListener('change', async (e) => {
        const channel = e.target.value;
        currentChannelFilter = channel;
        const filtered = getSessionsForChannel(channel);
        populateSessionSelector(filtered, channel);
        applyDefaultSelection(channel);
        await resetLog();
    });

    document.getElementById('session-selector').addEventListener('change', async (e) => {
        const value = e.target.value || '';
        if (value.startsWith('agent:')) {
            currentSessionId = null;
            currentAgentFilter = value.slice('agent:'.length);
        } else {
            currentSessionId = value || null;
            currentAgentFilter = '';
        }
        await resetLog();
    });

    // 5. Scroll to Bottom button
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

    // 6. Initial State
    updateAgentState('idle');
}

// --- Agent State Management ---

let currentAgentState = 'idle';
let agentSpeechTimers = {};
let idleTimers = {};
let isInitialLoad = true;
let currentSessionId = null;
let currentAgentFilter = '';
let currentChannelFilter = 'feishu-direct';
let allSessions = [];
let configuredAgents = [];
let agentStationMap = new Map([['main', 'main']]);
let stationAgentMap = new Map([['main', 'main']]);

const PREFERRED_STATION_BY_AGENT = {
    main: 'main',
    research: 'searcher',
    content: 'writer',
    product: 'reviewer',
    finance: 'data',
};

const FALLBACK_STATION_ORDER = ['searcher', 'writer', 'reviewer', 'data', 'coder'];

function getConfiguredAgent(agentId) {
    return configuredAgents.find((agent) => agent.id === agentId) || null;
}

function getAgentDisplayName(agentId, fallback = '') {
    return getConfiguredAgent(agentId)?.displayName || fallback || agentId || 'Unknown';
}

function rebuildAgentStationMaps() {
    const nextAgentStationMap = new Map([['main', 'main']]);
    const nextStationAgentMap = new Map([['main', 'main']]);
    const usedStations = new Set(['main']);

    configuredAgents.forEach((agent) => {
        if (agent.id === 'main') return;
        const preferredStation = PREFERRED_STATION_BY_AGENT[agent.id];
        if (preferredStation && !usedStations.has(preferredStation)) {
            nextAgentStationMap.set(agent.id, preferredStation);
            nextStationAgentMap.set(preferredStation, agent.id);
            usedStations.add(preferredStation);
        }
    });

    configuredAgents.forEach((agent) => {
        if (agent.id === 'main' || nextAgentStationMap.has(agent.id)) return;
        const fallbackStation = FALLBACK_STATION_ORDER.find((stationId) => !usedStations.has(stationId));
        if (!fallbackStation) return;
        nextAgentStationMap.set(agent.id, fallbackStation);
        nextStationAgentMap.set(fallbackStation, agent.id);
        usedStations.add(fallbackStation);
    });

    agentStationMap = nextAgentStationMap;
    stationAgentMap = nextStationAgentMap;
}

function setStationIdle(stationId, isVisible) {
    const station = document.getElementById(`station-${stationId}`);
    const sprite = document.getElementById(`agent-${stationId}`);
    const bubble = document.getElementById(`bubble-${stationId}`);
    if (!station || !sprite) return;

    if (isVisible) {
        station.classList.remove('offline');
        sprite.classList.remove('sdv-offline');
        if (!sprite.classList.contains('sdv-idle')) {
            sprite.classList.add('sdv-idle');
        }
    } else {
        station.classList.add('offline');
        sprite.classList.remove('sdv-idle');
        sprite.classList.add('sdv-offline');
        bubble?.classList.add('hidden');
    }
}

function syncAgentStations() {
    rebuildAgentStationMaps();

    ['main', 'coder', 'searcher', 'writer', 'reviewer', 'data'].forEach((stationId) => {
        const label = document.querySelector(`#station-${stationId} .station-label`);
        const mappedAgentId = stationAgentMap.get(stationId) || (stationId === 'main' ? 'main' : null);
        if (mappedAgentId) {
            if (label) label.textContent = getAgentDisplayName(mappedAgentId, label.textContent);
            setStationIdle(stationId, true);
        } else {
            if (label) label.textContent = stationId === 'coder' ? 'Standby Agent' : label.textContent;
            setStationIdle(stationId, false);
        }
    });

    updateOfficeLines();
}

function isFeishuChannel(channel) {
    return channel === 'feishu-direct' || channel === 'feishu-group';
}

function matchesSessionChannel(session, channel) {
    if (!channel) return true;
    if (session.channel === channel) return true;
    if (isFeishuChannel(channel)) {
        return session.channel === 'feishu';
    }
    return false;
}

function formatShortDateTime(value) {
    if (!value) return '暂无会话';
    const dt = new Date(value);
    if (Number.isNaN(dt.getTime())) return '暂无会话';
    return `${dt.getMonth() + 1}/${dt.getDate()} ${dt.getHours()}:${String(dt.getMinutes()).padStart(2, '0')}`;
}

function applyDefaultSelection(channel) {
    const selector = document.getElementById('session-selector');
    currentSessionId = null;
    currentAgentFilter = '';
    selector.value = '';
}

function getGroupedSessions(sessions) {
    const groups = new Map();
    sessions.forEach((session) => {
        const agentId = session.agentId || 'unknown';
        if (!groups.has(agentId)) {
            groups.set(agentId, {
                agentId,
                agentDisplayName: session.agentDisplayName || getAgentDisplayName(agentId, session.accountName || agentId),
                sessions: [],
            });
        }
        groups.get(agentId).sessions.push(session);
    });

    const order = configuredAgents.map((agent) => agent.id);
    return [...groups.values()]
        .map((group) => ({
            ...group,
            sessions: group.sessions.sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime()),
        }))
        .sort((a, b) => {
            const indexA = order.indexOf(a.agentId);
            const indexB = order.indexOf(b.agentId);
            if (indexA === -1 && indexB === -1) {
                return a.agentDisplayName.localeCompare(b.agentDisplayName, 'zh-CN');
            }
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });
}

function updateOfficeLines() {
    const svg = document.getElementById('office-svg-lines');
    if (!svg) return;

    const mainStation = document.getElementById('station-main');
    const floor = document.querySelector('.office-floor');
    if (!mainStation || !floor) return;

    const floorRect = floor.getBoundingClientRect();
    const mainRect = mainStation.getBoundingClientRect();
    
    // Calculate start point (center of main station desk)
    const startX = mainRect.left - floorRect.left + mainRect.width / 2;
    const startY = mainRect.top - floorRect.top + mainRect.height / 2 + 20;

    // Clear existing lines
    svg.innerHTML = '';

    // Find all visible sub-agents
    const subAgents = document.querySelectorAll('.agents-cluster .agent-station:not(#station-main)');
    
    subAgents.forEach(station => {
        // Skip if station is hidden
        if (window.getComputedStyle(station).display === 'none') return;
        if (station.classList.contains('offline')) return;

        const agentId = station.id.replace('station-', '');
        const rect = station.getBoundingClientRect();
        
        // Calculate end point (center of sub station desk)
        const endX = rect.left - floorRect.left + rect.width / 2;
        const endY = rect.top - floorRect.top + rect.height / 2 + 20;

        // Create SVG path
        const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        path.id = `link-${agentId}`;
        path.classList.add('office-link-path');
        
        // Draw a straight line for network feel
        const d = `M ${startX} ${startY} L ${endX} ${endY}`;
        
        path.setAttribute('d', d);
        svg.appendChild(path);
        
        // Restore active state if needed
        const sprite = document.getElementById(`agent-${agentId}`);
        if (sprite && !sprite.classList.contains('sdv-idle')) {
            path.classList.add('active');
        }
    });
}

// Call on load and resize
window.addEventListener('load', updateOfficeLines);
window.addEventListener('resize', updateOfficeLines);

// Also call when DOM changes might affect layout
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver(updateOfficeLines);
    const agentsCluster = document.querySelector('.agents-cluster');
    if (agentsCluster) {
        observer.observe(agentsCluster, { childList: true, attributes: true, subtree: true });
    }
});

function updateAgentState(state, message = '', agentId = 'main') {
    const sprite = document.getElementById(`agent-${agentId}`);
    const node = document.getElementById('node-agent');

    if (!sprite) return;

    // Remove old state classes
    const states = ['sdv-idle', 'sdv-receiving', 'sdv-thinking', 'sdv-speaking', 'sdv-tool_calling', 'sdv-tool_waiting', 'sdv-processing', 'sdv-error', 'sdv-task_start', 'sdv-task_complete', 'sdv-heartbeat', 'sdv-done', 'sdv-offline'];
    states.forEach(s => sprite.classList.remove(s));

    // Add new state
    sprite.classList.add(`sdv-${state}`);
    
    // Handle offline state for the whole station
    const station = document.getElementById(`station-${agentId}`);
    if (station) {
        if (state === 'offline') {
            station.classList.add('offline');
        } else {
            station.classList.remove('offline');
        }
        // Update lines when station visibility changes
        updateOfficeLines();
    }
    
    if (agentId === 'main') {
        currentAgentState = state;
        // Node pulse effect for main agent
        if (state !== 'idle') {
            node.classList.add('active');
        } else {
            node.classList.remove('active');
        }
    }

    // Handle link animations for sub-agents
    const link = document.getElementById(`link-${agentId}`);
    if (link) {
        if (state !== 'idle' && state !== 'offline') link.classList.add('active');
        else link.classList.remove('active');
    }

    // Allow explicit messages to drive the speech bubble regardless of state.
    if (message && message.trim().length > 0 && state !== 'offline') {
        showAgentSpeech(message, agentId);
    } else if (state === 'idle' || state === 'done' || state === 'offline') {
        hideAgentSpeech(agentId);
    }

    // Reset Idle Timer
    if (idleTimers[agentId]) clearTimeout(idleTimers[agentId]);
    if (state !== 'idle' && state !== 'done' && state !== 'offline') {
        idleTimers[agentId] = setTimeout(() => {
            updateAgentState('idle', '', agentId);
        }, CONFIG.IDLE_TIMEOUT_MS);
    }
}

function showAgentSpeech(text, agentId = 'main') {
    const bubble = document.getElementById(`bubble-${agentId}`);
    const bubbleText = document.getElementById(`bubble-text-${agentId}`);
    if (!bubble || !bubbleText) return;
    
    const bubbleInner = bubble.querySelector('.bubble-inner');

    bubbleText.innerHTML = renderMarkdownContent(text);
    bubbleInner.style.maxHeight = '';
    bubbleInner.scrollTop = 0;
    layoutAgentSpeechBubble(agentId);
    bubble.classList.remove('hidden');

    if (agentSpeechTimers[agentId]) clearTimeout(agentSpeechTimers[agentId]);
    agentSpeechTimers[agentId] = setTimeout(() => {
        bubble.classList.add('hidden');
    }, 5000);
}

function hideAgentSpeech(agentId = 'main') {
    const bubble = document.getElementById(`bubble-${agentId}`);
    if (bubble) bubble.classList.add('hidden');
}

function layoutAgentSpeechBubble(agentId = 'main') {
    const bubble = document.getElementById(`bubble-${agentId}`);
    const bubbleInner = bubble?.querySelector('.bubble-inner');
    const wrapper = bubble?.closest('.agent-station');
    const stage = document.querySelector('.center-stage');
    if (!bubble || !bubbleInner || !wrapper || !stage) return;

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

function showAgentEmoji(emoji) {
    // This is handled via CSS classes (sdv-idle, etc. have ::before content)
}

// --- Channel Visuals ---

function activateChannel(channel) {
    if (!channel || channel === 'main') return;

    const node = document.getElementById(`node-${channel}`);
    const line = document.getElementById(`line-${channel}`);
    const pulse = document.getElementById(`pulse-${channel}`);

    if (!node || !line) return;

    node.classList.add('active');
    line.classList.add('active');
    if (pulse) pulse.classList.add('active');

    setTimeout(() => {
        node.classList.remove('active');
        line.classList.remove('active');
        if (pulse) pulse.classList.remove('active');
    }, 3000);
}

// --- User Input Bubble ---

let userInputTimer = null;
function displayUserInput(text, options = {}) {
    const container = document.getElementById('user-bubble-container');
    const content = document.getElementById('user-bubble-content');
    const { persist = false, timeoutMs = 10000 } = options;

    const cleanedText = cleanUserInput(text);
    content.innerHTML = renderMarkdownContent(cleanedText);
    container.classList.add('visible');

    if (userInputTimer) clearTimeout(userInputTimer);
    if (!persist) {
        userInputTimer = setTimeout(() => {
            hideUserInput();
        }, timeoutMs);
    }
}

function hideUserInput() {
    const container = document.getElementById('user-bubble-container');
    if (userInputTimer) clearTimeout(userInputTimer);
    userInputTimer = null;
    container.classList.remove('visible');
}

function cleanUserInput(text) {
    if (!text) return '';
    let cleaned = String(text);

    // 飞书新格式：移除 "Conversation info (untrusted metadata):" + ```json...``` 代码块
    cleaned = cleaned.replace(/Conversation info \(untrusted metadata\):\s*```[\s\S]*?```/gi, '');

    // 飞书新格式：移除 "Sender (untrusted metadata):" + ```json...``` 代码块
    cleaned = cleaned.replace(/Sender \(untrusted metadata\):\s*```[\s\S]*?```/gi, '');

    // 飞书旧格式：移除 "Sender (untrusted metadata): {...} [Day YYYY-MM-DD ...]"
    cleaned = cleaned.replace(/Sender \(untrusted metadata\):[\s\S]*?\]\s*/gi, '');

    // 移除 [message_id: ...] 行
    cleaned = cleaned.replace(/\[message_id:[^\]]+\]\n?/gi, '');

    // 保留飞书群聊来源标识，其他普通 sender 前缀仍然移除
    if (!/^agent:[^:]+:feishu:group:\S+:\s+/m.test(cleaned)) {
        cleaned = cleaned.replace(/^\S+:\s+/m, '');
    }

    // 移除 [System: ...] 行（飞书系统提示）
    cleaned = cleaned.replace(/^\[System:.*\]$/gm, '');

    // 将 <at user_id="...">name</at> 转为 @name
    cleaned = cleaned.replace(/<at\s+user_id="[^"]*">([^<]*)<\/at>/gi, '@$1');

    // 移除 [feishu] [tui] [web] 前缀
    cleaned = cleaned.replace(/^\[(feishu|tui|web)\]\s*/i, '');

    // 旧格式兜底：找最后一个时间戳 [Mon 2026-03-09 13:59 GMT+8]，取其后内容
    const timestampRegex = /\[\w{3}\s\d{4}-\d{2}-\d{2}\s\d{2}:\d{2}\sGMT[+-]\d+\]/gi;
    let match;
    let lastIndex = -1;
    while ((match = timestampRegex.exec(cleaned)) !== null) {
        lastIndex = match.index + match[0].length;
    }
    if (lastIndex !== -1) {
        cleaned = cleaned.substring(lastIndex);
    }

    return cleaned.trim();
}

// --- Log Waterfall (Chat Sidebar) ---

let currentFilter = 'chat';
const processedMsgIds = new Set();
const coreTypes = ['user-input', 'model-thinking', 'model-output', 'tool-call', 'tool-result'];

function renderMarkdownContent(content) {
    return marked.parse(String(content ?? '').replace(/\n{2,}/g, '\n'));
}

function extractTextSegments(content, allowedTypes = ['text']) {
    if (Array.isArray(content)) {
        return content
            .filter(item => allowedTypes.includes(item.type))
            .map(item => item.text || item.thinking || '')
            .join('\n')
            .trim();
    }
    return typeof content === 'string' ? content.trim() : '';
}

function resolveLogDisplayContent(payload, contentOverride) {
    let content = contentOverride ?? payload?.summary ?? payload?.text ?? '';
    if (!content && payload?.data) content = JSON.stringify(payload.data, null, 2);
    if (Array.isArray(content)) content = extractTextSegments(content);
    if (content && typeof content === 'object') content = JSON.stringify(content, null, 2);
    return String(content ?? '').trim();
}

function shouldMirrorLogToSpeechBubble(logType) {
    return coreTypes.includes(logType);
}

function maybeShowSpeechBubbleForLog(logType, content, payload) {
    if (!shouldMirrorLogToSpeechBubble(logType)) return;
    if (!content || !content.trim()) return;
    showAgentSpeech(content, resolveVisualAgentId(payload || {}));
}

function resolveLogChannel(payload) {
    const agentLabel = payload.agentDisplayName || payload.payload?.agentDisplayName || '';
    const channel = payload.channel || payload.payload?.channel || (payload.data && payload.data.channel) || 'System';
    return agentLabel ? `${agentLabel} · ${channel}` : channel;
}

function getMessageKey(message) {
    return message.dedupeKey
        || message.eventId
        || (message.sessionId && message.id ? `${message.sessionId}:${message.id}` : '')
        || message.id
        || `${message.type || 'entry'}:${message.timestamp || ''}:${message.agentId || ''}`;
}

function resolveVisualAgentId(payload) {
    const rawAgentId = payload.agentId || payload.payload?.agentId || '';
    if (!rawAgentId) return 'main';
    if (rawAgentId.startsWith('channel-') || rawAgentId === 'agent-openclaw' || rawAgentId === 'agent-orchestrator') {
        return 'main';
    }
    return agentStationMap.get(rawAgentId) || 'main';
}

function setFilter(mode) {
    currentFilter = mode;
    document.getElementById('filter-chat').classList.toggle('active', mode === 'chat');
    document.getElementById('filter-all').classList.toggle('active', mode === 'all');

    const entries = document.querySelectorAll('.log-entry');
    entries.forEach(entry => {
        const type = entry.dataset.logType;
        if (mode === 'chat') {
            entry.style.display = coreTypes.includes(type) ? 'flex' : 'none';
        } else {
            entry.style.display = 'flex';
        }
    });

    // Auto-scroll to latest message when filter changes
    const container = document.getElementById('log-waterfall');
    setTimeout(() => {
        container.scrollTo({ top: container.scrollHeight, behavior: 'instant' });
    }, 50);
}

function addLogEntry(payload, isUser, contentOverride, logType = 'system-event') {
    const container = document.getElementById('log-waterfall');
    const scrollBtn = document.getElementById('scroll-bottom-btn');

    const entry = document.createElement('div');
    entry.className = `log-entry ${isUser ? 'user-log' : 'system-log'}`;
    entry.dataset.logType = logType;

    if (currentFilter === 'chat' && !coreTypes.includes(logType)) {
        entry.style.display = 'none';
    }

    const time = new Date(payload.timestamp || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const channel = resolveLogChannel(payload);
    const typeLabel = (logType || 'EVENT').toUpperCase();

    const content = resolveLogDisplayContent(payload, contentOverride);

    const jsonStr = JSON.stringify(payload, null, 2);

    entry.innerHTML = `
        <div class="log-meta">
            <span class="log-type ${isUser ? 'user' : (logType === 'error' ? 'error' : 'system')}">${channel} · ${typeLabel}</span>
            <span class="log-time">${time}</span>
        </div>
        <div class="log-bubble">
            <div class="log-content">${renderMarkdownContent(content)}</div>
            <div class="log-body collapsed">${jsonStr}</div>
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

    // Toggle logic
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

    // Check scroll position BEFORE appending (scrollHeight grows after append)
    const wasAtBottom = !isInitialLoad &&
        (container.scrollHeight - container.scrollTop - container.clientHeight < 100);

    if (!isInitialLoad) {
        entry.classList.add('animate-in');
    }
    container.appendChild(entry);
    maybeShowSpeechBubbleForLog(logType, content, payload);

    // Smart scroll: auto-follow only if user was already at bottom
    if (!isInitialLoad) {
        if (wasAtBottom) {
            const timeSinceReset = Date.now() - lastResetTime;
            const scrollBehavior = timeSinceReset < 3000 ? 'instant' : 'smooth';
            container.scrollTo({ top: container.scrollHeight, behavior: scrollBehavior });
        } else {
            scrollBtn.style.opacity = '1';
            scrollBtn.style.pointerEvents = 'auto';
        }
    }

    // Limit log size
    while (container.children.length > 200) container.removeChild(container.firstChild);
}

// --- Networking (SSE & History) ---

let pollLock = false;
let lastResetTime = 0;

async function resetLog() {
    pollLock = true;
    lastResetTime = Date.now();
    processedMsgIds.clear();
    const logContainer = document.getElementById('log-waterfall');
    // 隐藏容器 — 防止 fetch 期间浏览器 paint 出 scrollTop=0 的内容
    logContainer.style.opacity = '0';
    logContainer.innerHTML = '';
    isInitialLoad = true;
    await doFetchAndProcessHistory();
    // 先定位到底部，再恢复可见 — 用户永远看不到"闪顶"
    logContainer.scrollTop = logContainer.scrollHeight;
    logContainer.style.opacity = '';
    isInitialLoad = false;
    pollLock = false;
}

async function loadSessionList() {
    try {
        const res = await fetch('/api/sessions/list?token=admin-demo-token');
        if (!res.ok) return;
        const { sessions, agents = [] } = await res.json();
        // 保存到全局供 channel 切换用
        allSessions = sessions;
        configuredAgents = agents;
        syncAgentStations();
        populateSessionSelector(getSessionsForChannel(currentChannelFilter), currentChannelFilter);
        applyDefaultSelection(currentChannelFilter);
    } catch (e) { console.error('loadSessionList error:', e); }
}

function getSessionsForChannel(channel) {
    if (!channel) return allSessions;
    return allSessions.filter((session) => matchesSessionChannel(session, channel));
}

function extractSessionTarget(session) {
    const sessionKey = session.sessionKey || '';
    const label = String(session.label || '').replace(/^feishu:/, '').trim();

    if (session.channel === 'feishu-group') {
        const groupMatch = sessionKey.match(/^agent:[^:]+:feishu:group:(.+)$/);
        const groupId = groupMatch?.[1] || label || session.id;
        return `群 ${groupId}`;
    }

    if (session.channel === 'feishu-direct') {
        return label || session.id;
    }

    if (session.channel === 'tui') return session.agentDisplayName || 'TUI / Web';
    if (session.channel === 'cron') return label || 'Cron';
    if (session.channel === 'heartbeat') return 'Heartbeat';
    return label || session.channel || session.id;
}

function populateSessionSelector(sessions, channel = '') {
    const sel = document.getElementById('session-selector');
    const firstOptionLabel = channel ? `全部 (${CHANNEL_FILTER_LABELS[channel] || channel})` : CHANNEL_FILTER_LABELS[''];
    sel.options[0].textContent = firstOptionLabel;
    sel.options[0].value = '';

    while (sel.options.length > 1) sel.remove(1);

    getGroupedSessions(sessions).forEach((group) => {
        const latest = group.sessions[0] || null;
        const groupOption = document.createElement('option');
        groupOption.value = `agent:${group.agentId}`;
        groupOption.textContent = `${group.agentDisplayName} · 全部会话 · ${formatShortDateTime(latest?.lastModified)}`;
        sel.appendChild(groupOption);

        const optgroup = document.createElement('optgroup');
        optgroup.label = `${group.agentDisplayName} 会话`;

        group.sessions.forEach((session) => {
            const option = document.createElement('option');
            option.value = session.id;
            option.textContent = `${extractSessionTarget(session)} · ${formatShortDateTime(session.lastModified)}`;
            optgroup.appendChild(option);
        });

        sel.appendChild(optgroup);
    });
}

function setConnectionStatus(isConnected) {
    const statusBadge = document.getElementById('connection-status');
    const label = statusBadge?.querySelector('span');
    if (label) {
        label.textContent = isConnected ? 'Connected' : 'Disconnected';
    } else if (statusBadge) {
        statusBadge.textContent = isConnected ? 'Connected' : 'Disconnected';
    }
    statusBadge?.classList.toggle('disconnected', !isConnected);
}

function setupEventStream() {
    const eventSource = new EventSource(CONFIG.STREAM_URL);

    eventSource.onopen = () => {
        setConnectionStatus(true);
    };

    eventSource.onmessage = (event) => {
        if (event.data === 'ping') return;
        try {
            const data = JSON.parse(event.data);
            handleIncomingEvent(data);
        } catch (e) {
            console.error('SSE Error', e);
        }
    };

    eventSource.onerror = () => {
        setConnectionStatus(false);
    };
}

async function pollSessionHistory() {
    if (pollLock) return;
    await doFetchAndProcessHistory();
}

async function doFetchAndProcessHistory() {
    try {
        const sessionParam = currentSessionId ? `&session=${currentSessionId}` : '';
        const channelParam = (!currentSessionId && currentChannelFilter) ? `&channel=${encodeURIComponent(currentChannelFilter)}` : '';
        const agentParam = (!currentSessionId && currentAgentFilter) ? `&agentId=${encodeURIComponent(currentAgentFilter)}` : '';
        const res = await fetch(`/api/sessions/latest?token=admin-demo-token${sessionParam}${channelParam}${agentParam}`);
        if (!res.ok) return;
        const data = await res.json();
        const messages = data.messages || [];
        messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

        messages.forEach(msg => {
            const messageKey = getMessageKey(msg);
            if (!processedMsgIds.has(messageKey)) {
                processedMsgIds.add(messageKey);
                processOldMessage(msg);
            }
        });
    } catch (e) { }
}

function processOldMessage(msg) {
    const role = msg.message?.role || 'system';
    const content = msg.message?.content || '';
    const visualAgentId = resolveVisualAgentId(msg);

    if (role === 'user') {
        const text = extractTextSegments(content);
        addLogEntry(msg, true, cleanUserInput(text), 'user-input');
        displayUserInput(text, { persist: true });
        updateAgentState('receiving', '', visualAgentId);
    } else if (role === 'assistant') {
        const parsed = parseAssistantContent(content);
        if (parsed.thinking) addLogEntry(msg, false, parsed.thinking, 'model-thinking');
        if (parsed.text) {
            addLogEntry(msg, false, parsed.text, 'model-output');
            hideUserInput();
            updateAgentState('speaking', '', visualAgentId);
        }
    } else if (role === 'toolResult') {
        const text = extractTextSegments(content);
        if (text) addLogEntry(msg, false, text, 'tool-result');
        updateAgentState('processing', '', visualAgentId);
    }
}

function sseChannelMatchesFilter(eventChannel, filter) {
    if (!filter) return true;
    if (filter === eventChannel) return true;
    // feishu-direct/feishu-group 也匹配 generic 'feishu'（fallback 检测可能只返回 'feishu'）
    if (filter === 'feishu-direct' || filter === 'feishu-group') {
        return eventChannel === filter || eventChannel === 'feishu';
    }
    if (filter === 'feishu') {
        return ['feishu', 'feishu-direct', 'feishu-group'].includes(eventChannel);
    }
    return false;
}

function handleIncomingEvent(event) {
    const type = event.type || '';
    const payload = event.payload || {};
    const role = event.role || payload.role || '';
    const eventKey = getMessageKey({ ...event, id: event.id || event.eventId });

    if (processedMsgIds.has(eventKey)) return;

    // Channel/Session 过滤：只处理匹配当前筛选条件的 SSE 事件
    const eventChannel = payload.channel || '';
    const eventSessionId = payload.sessionId || '';
    const eventAgentId = payload.agentId || event.agentId || '';
    if (currentSessionId) {
        if (eventSessionId && eventSessionId !== currentSessionId) return;
    } else if (currentChannelFilter && eventChannel) {
        if (!sseChannelMatchesFilter(eventChannel, currentChannelFilter)) return;
        if (currentAgentFilter) {
            if (!eventAgentId || eventAgentId !== currentAgentFilter) return;
        }
    }

    processedMsgIds.add(eventKey);

    const rawChannel = event.channel || payload.channel || (event.data && event.data.channel) || 'main';
    const targetChannel = rawChannel.includes('feishu') ? 'feishu' : (rawChannel.includes('tui') ? 'tui' : 'main');
    activateChannel(targetChannel);
    const visualAgentId = resolveVisualAgentId(event);

    if (type === 'dispatch.created' || event.source === 'user' || role === 'user') {
        const rawText = event.prompt || event.text || payload.text || payload.message?.content || payload.content || '';
        const text = typeof rawText === 'string' ? rawText : (extractTextSegments(rawText) || 'User input');
        displayUserInput(text, { persist: true });
        addLogEntry(event, true, cleanUserInput(text), 'user-input');
        updateAgentState('receiving', '', visualAgentId);
    } else if (type.includes('task.started')) {
        addLogEntry(event, false, event.summary, 'system-event');
        updateAgentState('thinking', '', visualAgentId);
    } else if (type.includes('task.completed')) {
        addLogEntry(event, false, event.summary, 'system-event');
        hideUserInput();
        updateAgentState('task_complete', '', visualAgentId);
    } else if (role === 'assistant' || type.includes('speak')) {
        const content = payload.message?.content || payload.content || event.content || '';
        const parsed = parseAssistantContent(content);

        if (parsed.thinking) {
            addLogEntry(event, false, parsed.thinking, 'model-thinking');
            updateAgentState('thinking', '', visualAgentId);
        }
        if (parsed.text) {
            addLogEntry(event, false, parsed.text, 'model-output');
            hideUserInput();
            updateAgentState('speaking', '', visualAgentId);
        }
        if (parsed.tools.length > 0) {
            parsed.tools.forEach(t => addLogEntry(event, false, `🔧 Calling tool: ${t.name}`, 'tool-call'));
            updateAgentState('tool_calling', '', visualAgentId);
        }
    } else if (role === 'toolResult' || type === 'tool.result') {
        const text = extractTextSegments(payload.content || event.content);
        if (text) addLogEntry(event, false, text, 'tool-result');
        updateAgentState('processing', '', visualAgentId);
    } else if (type.includes('heartbeat')) {
        updateAgentState('heartbeat', '', visualAgentId);
    } else {
        addLogEntry(event, false, event.summary || type, 'system-event');
        updateAgentState('processing', '', visualAgentId);
    }
}

function cleanAssistantText(text) {
    if (!text) return '';
    return text.replace(/^\[\[[^\]]*\]\]\s*/g, '');
}

function parseAssistantContent(content) {
    const res = { text: '', thinking: '', tools: [] };
    if (!Array.isArray(content)) { res.text = cleanAssistantText(content); return res; }

    content.forEach(item => {
        if (item.type === 'text') res.text += cleanAssistantText(item.text);
        if (item.type === 'thinking') res.thinking += item.thinking;
        if (item.type === 'toolCall') res.tools.push(item);
    });
    return res;
}

// --- Extras: Lobster & Toggles ---

function setupLobster() {
    const container = document.getElementById('lobster-container');

    // 初始状态
    let x = Math.random() * (window.innerWidth / 4) + 50;
    let y = window.innerHeight * 0.6;
    let heading = Math.random() * 360;  // 当前朝向（度）

    const MARGIN = 60;
    const MIN_X = MARGIN;
    const MAX_X = () => window.innerWidth / 3 + 50;
    const MIN_Y = () => window.innerHeight * 0.5;
    const MAX_Y = () => window.innerHeight * 0.9;

    const move = () => {
        // 15% 概率停顿
        if (Math.random() < 0.15) {
            scheduleNext();
            return;
        }

        // 扰动朝向（±35°以内）
        heading += (Math.random() - 0.5) * 70;

        // 边界斥力：靠近边界时强制转向内侧
        if (x < MIN_X + 30) heading = heading * 0.3 + 45;
        if (x > MAX_X() - 30) heading = heading * 0.3 + 225;
        if (y < MIN_Y() + 30) heading = heading * 0.3 + 135;
        if (y > MAX_Y() - 30) heading = heading * 0.3 + 315;

        heading = ((heading % 360) + 360) % 360;  // 归一化 0-360

        // 步长随机（50-120px）
        const step = Math.random() * 70 + 50;
        const rad = heading * Math.PI / 180;

        let newX = x + Math.sin(rad) * step;
        let newY = y - Math.cos(rad) * step;

        // 硬边界钳制
        newX = Math.max(MIN_X, Math.min(MAX_X(), newX));
        newY = Math.max(MIN_Y(), Math.min(MAX_Y(), newY));

        x = newX;
        y = newY;

        container.style.transform = `translate(${x}px, ${y}px) rotate(${heading}deg)`;
        scheduleNext();
    };

    const scheduleNext = () => {
        // 随机间隔 2-6s
        const interval = Math.random() * 4000 + 2000;
        setTimeout(move, interval);
    };

    // 初始放置
    container.style.transform = `translate(${x}px, ${y}px) rotate(${heading}deg)`;
    scheduleNext();
}

function setupStateToggles() {
    document.querySelectorAll('.state-toggle-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const state = btn.dataset.state;
            const agentId = btn.dataset.agent || 'main';
            updateAgentState(state, `Switched to ${state} mode manually.`, agentId);

            // Update active class for this specific agent's buttons
            const container = btn.closest('.state-controls');
            container.querySelectorAll('.state-toggle-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
        });
    });
}

// Support for marked
marked.setOptions({ gfm: true, breaks: true });
