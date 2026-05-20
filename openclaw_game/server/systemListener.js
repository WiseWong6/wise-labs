import crypto from 'crypto';
import fs from 'fs';
import os from 'os';
import path from 'path';

import { insertRoomEvent } from './eventHub.js';
import { channelFromSessionKey, getSessionMetadataByFilePath, listActiveSessionFiles, parseSessionKey } from './sessionRegistry.js';

const GLOBAL_KEY = '__openclawd_system_listener__';
const DEFAULT_MAX_BYTES_PER_TICK = 256 * 1024;
const DEFAULT_POLL_INTERVAL_MS = 1200;
const MAX_RECENT_EVENT_IDS = 1500;

function parsePositiveInteger(value, fallback) {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return parsed;
}

function clip(text, limit = 180) {
    if (!text) return '';
    const raw = String(text).replace(/\s+/g, ' ').trim();
    if (raw.length <= limit) return raw;
    return `${raw.slice(0, limit - 1)}…`;
}

function parseTimestamp(value) {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return new Date().toISOString();
    }
    return date.toISOString();
}

function firstText(content) {
    if (!Array.isArray(content)) return '';
    const textNode = content.find((entry) => entry?.type === 'text' && typeof entry.text === 'string');
    return textNode?.text || '';
}

function detectSessionChannelFallback(parsed) {
    const text = firstText(parsed?.message?.content);
    const metadata = parsed?.message?.metadata;
    const source = parsed?.message?.source;
    const combined = `${text} ${parsed?.message?.errorMessage || ''} ${JSON.stringify(metadata || {})} ${JSON.stringify(source || {})}`.toLowerCase();

    if (combined.includes('conversation info (untrusted metadata)')
        || combined.includes('[message_id:')
        || combined.includes('sender_id')
        || combined.includes('feishu[')) {
        return 'feishu';
    }

    if (text.trimStart().startsWith('[cron:')) return 'cron';
    return 'tui';
}

function makeEventId(seed) {
    const hash = crypto.createHash('sha1').update(seed).digest('hex').slice(0, 16);
    return `ocls-${hash}`;
}

function state() {
    if (!globalThis[GLOBAL_KEY]) {
        const pollIntervalMs = parsePositiveInteger(process.env.OPENCLAWD_LISTENER_POLL_MS, DEFAULT_POLL_INTERVAL_MS);
        const maxBytesPerTick = parsePositiveInteger(process.env.OPENCLAWD_LISTENER_TAIL_BYTES, DEFAULT_MAX_BYTES_PER_TICK);
        globalThis[GLOBAL_KEY] = {
            started: false,
            roomId: 'room-42',
            trackers: new Map(),
            timer: null,
            openclawHome: path.join(os.homedir(), '.openclaw'),
            pollIntervalMs,
            maxBytesPerTick,
            lastTickAt: null,
            lastError: null,
            lastEventAt: null,
            ingestedEvents: 0,
            channelsSeen: {
                tui: 0,
                feishu: 0,
                'feishu-direct': 0,
                'feishu-group': 0,
                cron: 0,
                heartbeat: 0,
                ws: 0,
                unknown: 0,
            },
            recentEventIdSet: new Set(),
            recentEventIds: [],
        };
    }

    return globalThis[GLOBAL_KEY];
}

function createTracker(filePath, parser) {
    let offset = 0;
    try {
        offset = fs.statSync(filePath).size;
    } catch {
        offset = 0;
    }

    return {
        filePath,
        parser,
        offset,
        remainder: '',
    };
}

function ensureTracker(filePath, parser) {
    const s = state();
    if (!s.trackers.has(filePath)) {
        s.trackers.set(filePath, createTracker(filePath, parser));
    }
}

function removeOldSessionTrackers(activeSessionFiles) {
    const s = state();
    const activeSet = new Set(activeSessionFiles);

    for (const [filePath, tracker] of s.trackers.entries()) {
        if (tracker.parser !== parseSessionLine) continue;
        if (!activeSet.has(filePath)) {
            s.trackers.delete(filePath);
        }
    }
}

function emitEvent(partial) {
    const s = state();
    const eventId = partial?.eventId ? String(partial.eventId) : '';
    if (eventId && s.recentEventIdSet.has(eventId)) {
        return;
    }

    try {
        insertRoomEvent(s.roomId, partial);
        s.ingestedEvents += 1;
        s.lastEventAt = new Date().toISOString();

        const channel = partial?.payload?.channel;
        const channelKey = channel && Object.hasOwn(s.channelsSeen, channel) ? channel : 'unknown';
        s.channelsSeen[channelKey] += 1;

        if (eventId) {
            s.recentEventIdSet.add(eventId);
            s.recentEventIds.push(eventId);
            if (s.recentEventIds.length > MAX_RECENT_EVENT_IDS) {
                const removed = s.recentEventIds.shift();
                if (removed) {
                    s.recentEventIdSet.delete(removed);
                }
            }
        }
    } catch (error) {
        const message = error?.message || '';
        if (!message.includes('UNIQUE constraint failed')) {
            console.error('[openclaw-listener] failed to insert event:', error);
            s.lastError = message || 'insert event failed';
        }
    }
}

function buildSessionEvent(line, filePath) {
    let parsed;
    try {
        parsed = JSON.parse(line);
    } catch {
        return null;
    }

    if (parsed?.type !== 'message' || !parsed.message) return null;

    const sessionId = path.basename(filePath, '.jsonl');
    const role = parsed.message.role;
    const canonical = getSessionMetadataByFilePath(filePath);
    const resolvedAgentId = canonical?.agentId || 'main';
    const resolvedAgentDisplayName = canonical?.agentDisplayName || resolvedAgentId;
    const channel = canonical?.channel || detectSessionChannelFallback(parsed);
    const sessionKind = canonical?.sessionKind || 'other';
    const accountId = canonical?.accountId || null;
    const timestamp = parseTimestamp(parsed.timestamp || parsed.message.timestamp);

    if (role === 'user') {
        const message = clip(firstText(parsed.message.content));
        const fullContent = parsed.message.content; // 保留完整 content
        if (!message) return null;

        return {
            eventId: makeEventId(`session:${sessionId}:user:${parsed.id || ''}:${message}`),
            taskId: sessionId,
            agentId: resolvedAgentId,
            type: 'task.progress',
            summary: `[${channel}] ${message}`,
            severity: 'info',
            timestamp,
            source: 'openclaw-system',
            payload: {
                agentId: resolvedAgentId,
                agentDisplayName: resolvedAgentDisplayName,
                channel,
                role: 'user',
                sessionId,
                sessionKey: canonical?.sessionKey || null,
                sessionKind,
                accountId,
                content: fullContent, // 添加完整 content
            },
        };
    }

    if (role === 'assistant') {
        const textFromContent = clip(firstText(parsed.message.content));
        const fallback = parsed.message.errorMessage ? `error: ${parsed.message.errorMessage}` : '';
        const message = textFromContent || clip(fallback);
        const fullContent = parsed.message.content; // 保留完整 content
        if (!message) return null;

        return {
            eventId: makeEventId(`session:${sessionId}:assistant:${parsed.id || ''}:${message}`),
            taskId: sessionId,
            agentId: resolvedAgentId,
            type: parsed.message.errorMessage ? 'task.error' : 'task.progress',
            summary: `[${channel}] ${message}`,
            severity: parsed.message.errorMessage ? 'error' : 'info',
            timestamp,
            source: 'openclaw-system',
            payload: {
                agentId: resolvedAgentId,
                agentDisplayName: resolvedAgentDisplayName,
                channel,
                role: 'assistant',
                sessionId,
                sessionKey: canonical?.sessionKey || null,
                sessionKind,
                accountId,
                content: fullContent, // 添加完整 content
            },
        };
    }

    if (role === 'toolResult') {
        const toolName = parsed.message.toolName || 'tool';
        const text = clip(firstText(parsed.message.content) || parsed.message.details?.aggregated || '');
        const fullContent = parsed.message.content; // 保留完整 content
        if (!text) return null;

        return {
            eventId: makeEventId(`session:${sessionId}:tool:${parsed.id || ''}:${toolName}:${text}`),
            taskId: sessionId,
            agentId: resolvedAgentId,
            type: parsed.message.isError ? 'task.error' : 'tool.result',
            summary: `[${channel}:${toolName}] ${text}`,
            severity: parsed.message.isError ? 'error' : 'info',
            timestamp,
            source: 'openclaw-system',
            payload: {
                agentId: resolvedAgentId,
                agentDisplayName: resolvedAgentDisplayName,
                channel,
                role: 'toolResult',
                toolName,
                skill: toolName,
                sessionId,
                sessionKey: canonical?.sessionKey || null,
                sessionKind,
                accountId,
                content: fullContent, // 添加完整 content
            },
        };
    }

    return null;
}

function parseSessionLine(line, filePath) {
    return buildSessionEvent(line, filePath);
}

function parseGatewayLine(line) {
    const match = line.match(/^(\S+)\s+\[([^\]]+)\]\s+(.*)$/);
    if (!match) return null;

    const [, rawTimestamp, channel, message] = match;
    const tracked = new Set(['feishu', 'ws']);
    if (!tracked.has(channel)) return null;

    let summary = null;
    if (channel === 'feishu' && message.includes('DM from')) {
        const idx = message.lastIndexOf(': ');
        const text = idx >= 0 ? message.slice(idx + 2) : message;
        summary = `[feishu] ${clip(text)}`;
    } else if (message.includes('received message from')) {
        summary = `[${channel}] incoming message`;
    } else if (message.includes('dispatching to agent')) {
        summary = `[${channel}] dispatching to agent`;
    } else if (message.includes('dispatch complete')) {
        summary = `[${channel}] dispatch complete`;
    } else if (message.includes('webchat connected')) {
        summary = '[ws] webchat connected';
    } else if (message.includes('webchat disconnected')) {
        summary = '[ws] webchat disconnected';
    }

    if (!summary) return null;

    const timestamp = parseTimestamp(rawTimestamp);
    const dayTask = `openclaw-log-${timestamp.slice(0, 10)}`;

    return {
        eventId: makeEventId(`gateway:${rawTimestamp}:${channel}:${summary}`),
        taskId: dayTask,
        agentId: `channel-${channel}`,
        type: 'task.progress',
        summary,
        severity: 'info',
        timestamp,
        source: 'openclaw-system',
        payload: {
            channel,
            role: 'channel-log',
        },
    };
}

function parseCommandsLine(line) {
    let parsed;
    try {
        parsed = JSON.parse(line);
    } catch {
        return null;
    }

    if (!parsed?.timestamp || !parsed?.action) return null;

    const source = parsed.source || '';
    const parsedSessionKey = parseSessionKey(parsed.sessionKey);
    const canonicalChannel = channelFromSessionKey(parsed.sessionKey);
    let channel = canonicalChannel;
    if (channel === 'unknown') {
        if (source.includes('feishu')) channel = 'feishu';
        else if (source.includes('webchat')) channel = 'tui';
    }

    return {
        eventId: makeEventId(`commands:${parsed.timestamp}:${parsed.action}:${parsed.sessionKey || ''}`),
        taskId: parsed.sessionKey || `commands-${channel}`,
        agentId: parsedSessionKey.agentId || `channel-${channel}`,
        type: 'task.progress',
        summary: `[${channel}] session ${parsed.action}`,
        severity: 'info',
        timestamp: parseTimestamp(parsed.timestamp),
        source: 'openclaw-system',
        payload: {
            agentId: parsedSessionKey.agentId || null,
            channel,
            role: 'session-control',
            sessionKey: parsed.sessionKey,
            senderId: parsed.senderId,
        },
    };
}

function processTracker(tracker) {
    const { filePath } = tracker;
    const s = state();

    let size;
    try {
        size = fs.statSync(filePath).size;
    } catch {
        return;
    }

    if (size < tracker.offset) {
        tracker.offset = 0;
    }

    if (size === tracker.offset) return;

    let start = tracker.offset;
    if (size - start > s.maxBytesPerTick) {
        start = size - s.maxBytesPerTick;
    }

    const length = size - start;
    if (length <= 0) {
        tracker.offset = size;
        return;
    }

    const fd = fs.openSync(filePath, 'r');
    try {
        const buffer = Buffer.alloc(length);
        fs.readSync(fd, buffer, 0, length, start);

        tracker.offset = size;
        const chunk = `${tracker.remainder}${buffer.toString('utf8')}`;
        const lines = chunk.split(/\r?\n/);
        tracker.remainder = lines.pop() || '';

        for (const rawLine of lines) {
            const line = rawLine.trim();
            if (!line) continue;
            const event = tracker.parser(line, filePath);
            if (event) {
                emitEvent(event);
            }
        }
    } finally {
        fs.closeSync(fd);
    }
}

function scanSessionFiles() {
    return listActiveSessionFiles().map((entry) => entry.path);
}

function tick() {
    const s = state();
    s.lastTickAt = new Date().toISOString();

    try {
        const gatewayLog = path.join(s.openclawHome, 'logs', 'gateway.log');
        const commandsLog = path.join(s.openclawHome, 'logs', 'commands.log');

        ensureTracker(gatewayLog, parseGatewayLine);
        ensureTracker(commandsLog, parseCommandsLine);

        const sessionFiles = scanSessionFiles();
        sessionFiles.forEach((filePath) => {
            ensureTracker(filePath, parseSessionLine);
        });
        removeOldSessionTrackers(sessionFiles);

        for (const tracker of s.trackers.values()) {
            processTracker(tracker);
        }
        s.lastError = null;
    } catch (error) {
        s.lastError = error?.message || 'listener tick failed';
        console.error('[openclaw-listener] tick failed:', error);
    }
}

function getTrackerState() {
    const s = state();
    const trackers = [...s.trackers.values()];
    const sessionTrackers = trackers.filter((tracker) => tracker.parser === parseSessionLine).length;
    const gatewayTrackers = trackers.filter((tracker) => tracker.parser === parseGatewayLine).length;
    const commandTrackers = trackers.filter((tracker) => tracker.parser === parseCommandsLine).length;

    return {
        total: trackers.length,
        sessions: sessionTrackers,
        gateway: gatewayTrackers,
        commands: commandTrackers,
    };
}

export function startSystemOpenclawListener(options = {}) {
    const s = state();
    if (process.env.OPENCLAWD_SYSTEM_LISTENER === '0') {
        return;
    }

    if (s.started) return;

    s.roomId = options.roomId || process.env.OPENCLAWD_SYSTEM_ROOM || 'room-42';
    s.openclawHome = process.env.OPENCLAWD_OPENCLAW_HOME || path.join(os.homedir(), '.openclaw');
    s.pollIntervalMs = parsePositiveInteger(process.env.OPENCLAWD_LISTENER_POLL_MS, s.pollIntervalMs || DEFAULT_POLL_INTERVAL_MS);
    s.maxBytesPerTick = parsePositiveInteger(process.env.OPENCLAWD_LISTENER_TAIL_BYTES, s.maxBytesPerTick || DEFAULT_MAX_BYTES_PER_TICK);

    if (!fs.existsSync(s.openclawHome)) {
        s.lastError = `openclaw home not found: ${s.openclawHome}`;
        console.warn('[openclaw-listener] openclaw home not found:', s.openclawHome);
        return;
    }

    s.started = true;
    tick();
    s.timer = setInterval(tick, s.pollIntervalMs);

    console.log(`[openclaw-listener] listening from ${s.openclawHome} -> room ${s.roomId}, interval=${s.pollIntervalMs}ms`);
}

export function getSystemOpenclawListenerStatus() {
    const s = state();
    const openclawHomeExists = fs.existsSync(s.openclawHome);

    return {
        enabled: process.env.OPENCLAWD_SYSTEM_LISTENER !== '0',
        started: s.started,
        roomId: s.roomId,
        openclawHome: s.openclawHome,
        openclawHomeExists,
        pollIntervalMs: s.pollIntervalMs,
        maxBytesPerTick: s.maxBytesPerTick,
        lastTickAt: s.lastTickAt,
        lastEventAt: s.lastEventAt,
        lastError: s.lastError,
        ingestedEvents: s.ingestedEvents,
        channelsSeen: s.channelsSeen,
        trackers: getTrackerState(),
    };
}

export function stopSystemOpenclawListener() {
    const s = state();
    if (s.timer) {
        clearInterval(s.timer);
        s.timer = null;
    }
    s.started = false;
}
