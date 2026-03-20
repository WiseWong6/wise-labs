import { getDb } from './db.js';

const GLOBAL_ROOMS_KEY = '__openclaw_game_rooms__';
const DEFAULT_REPLAY_LIMIT = 200;

function getRoomsStore() {
    if (!globalThis[GLOBAL_ROOMS_KEY]) {
        globalThis[GLOBAL_ROOMS_KEY] = new Map();
    }
    return globalThis[GLOBAL_ROOMS_KEY];
}

function getRoomSubscribers(roomId) {
    const rooms = getRoomsStore();
    if (!rooms.has(roomId)) {
        rooms.set(roomId, new Set());
    }
    return rooms.get(roomId);
}

function toIsoTimestamp(value) {
    if (!value) return new Date().toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return new Date().toISOString();
    return date.toISOString();
}

function safeParsePayload(payloadJson) {
    if (!payloadJson) return null;
    try {
        return JSON.parse(payloadJson);
    } catch {
        return null;
    }
}

function mapDbRowToEvent(row) {
    return {
        eventId: row.id,
        roomId: row.room_id,
        taskId: row.task_id,
        agentId: row.agent_id,
        type: row.type,
        status: row.status,
        summary: row.summary,
        severity: row.severity,
        payload: safeParsePayload(row.payload_json),
        timestamp: row.created_at,
        source: 'openclaw',
    };
}

function normalizeRoomEvent(roomId, partialEvent) {
    return {
        eventId: String(partialEvent.eventId || partialEvent.id || crypto.randomUUID()),
        roomId,
        taskId: String(partialEvent.taskId || partialEvent.task_id || `task-${Date.now()}`),
        agentId: String(partialEvent.agentId || partialEvent.agent_id || 'agent-orchestrator'),
        type: String(partialEvent.type || 'task.progress'),
        status: partialEvent.status || null,
        summary: String(partialEvent.summary || 'OpenClaw event'),
        severity: String(partialEvent.severity || 'info'),
        payload: partialEvent.payload || null,
        timestamp: toIsoTimestamp(partialEvent.timestamp || partialEvent.created_at),
        source: partialEvent.source || 'openclaw',
    };
}

function broadcastRoomEvent(event) {
    const subscribers = getRoomSubscribers(event.roomId);
    subscribers.forEach((subscriber) => {
        subscriber(event);
    });
}

function loadRecentRoomEvents(roomId, limit = DEFAULT_REPLAY_LIMIT) {
    const db = getDb();
    const rows = db.prepare(`
        SELECT *
        FROM events
        WHERE room_id = ?
        ORDER BY created_at DESC
        LIMIT ?
    `).all(roomId, limit);

    return rows.reverse().map(mapDbRowToEvent);
}

export function listRoomEventsAfter(roomId, lastEventId) {
    if (!lastEventId) {
        return loadRecentRoomEvents(roomId);
    }

    const db = getDb();
    const anchor = db.prepare(`
        SELECT rowid
        FROM events
        WHERE room_id = ? AND id = ?
    `).get(roomId, lastEventId);

    if (!anchor?.rowid) {
        return loadRecentRoomEvents(roomId);
    }

    const rows = db.prepare(`
        SELECT *
        FROM events
        WHERE room_id = ? AND rowid > ?
        ORDER BY created_at ASC
        LIMIT ?
    `).all(roomId, anchor.rowid, DEFAULT_REPLAY_LIMIT);

    return rows.map(mapDbRowToEvent);
}

export function insertRoomEvent(roomId, partialEvent) {
    const event = normalizeRoomEvent(roomId, partialEvent);
    const db = getDb();

    db.prepare(`
        INSERT INTO events (id, room_id, task_id, agent_id, type, status, summary, severity, payload_json, created_at)
        VALUES (@id, @room_id, @task_id, @agent_id, @type, @status, @summary, @severity, @payload_json, @created_at)
    `).run({
        id: event.eventId,
        room_id: event.roomId,
        task_id: event.taskId,
        agent_id: event.agentId,
        type: event.type,
        status: event.status,
        summary: event.summary,
        severity: event.severity,
        payload_json: event.payload ? JSON.stringify(event.payload) : null,
        created_at: event.timestamp,
    });

    broadcastRoomEvent(event);
    return event;
}

export function subscribeRoom(roomId, subscriber) {
    const subscribers = getRoomSubscribers(roomId);
    subscribers.add(subscriber);

    return () => {
        subscribers.delete(subscriber);
    };
}
