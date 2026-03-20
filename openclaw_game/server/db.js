import path from 'path';
import { createRequire } from 'module';
import { DatabaseSync } from 'node:sqlite';

const require = createRequire(import.meta.url);
const GLOBAL_DB_KEY = '__openclawd_db_instance__';

let db;
let dbDriver = null;

function openBetterSqlite3(dbPath) {
    const BetterSqlite3 = require('better-sqlite3');
    return {
        db: new BetterSqlite3(dbPath),
        driver: 'better-sqlite3',
    };
}

function openNodeSqlite(dbPath) {
    return {
        db: new DatabaseSync(dbPath),
        driver: 'node:sqlite',
    };
}

function openDatabase(dbPath) {
    try {
        return openBetterSqlite3(dbPath);
    } catch (betterSqliteError) {
        try {
            return openNodeSqlite(dbPath);
        } catch (nodeSqliteError) {
            const err = new Error('Failed to open sqlite database');
            err.cause = { betterSqliteError, nodeSqliteError };
            throw err;
        }
    }
}

function readGlobalDbCache() {
    const cached = globalThis[GLOBAL_DB_KEY];
    if (!cached?.db) return null;
    return cached;
}

function writeGlobalDbCache(opened) {
    globalThis[GLOBAL_DB_KEY] = opened;
}

export function getDb() {
    if (!db) {
        const cached = readGlobalDbCache();
        if (cached) {
            db = cached.db;
            dbDriver = cached.driver;
            return db;
        }

        const dbPath = path.join(process.cwd(), 'openclawd.db');
        const opened = openDatabase(dbPath);
        db = opened.db;
        dbDriver = opened.driver;
        writeGlobalDbCache(opened);
        console.log(`[storage] sqlite driver=${dbDriver}, path=${dbPath}`);

        db.exec(`
            CREATE TABLE IF NOT EXISTS events (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                agent_id TEXT NOT NULL,
                type TEXT NOT NULL,
                status TEXT,
                summary TEXT NOT NULL,
                severity TEXT NOT NULL,
                payload_json TEXT,
                created_at TEXT NOT NULL
            );

            CREATE INDEX IF NOT EXISTS idx_room_created_at ON events(room_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_room_task_created_at ON events(room_id, task_id, created_at);
            CREATE INDEX IF NOT EXISTS idx_type_created_at ON events(type, created_at);

            CREATE TABLE IF NOT EXISTS feedback_jobs (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                target_agent_id TEXT NOT NULL,
                context_task_id TEXT,
                message TEXT NOT NULL,
                state TEXT NOT NULL,
                result_summary TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS dispatch_jobs (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                target_agent_id TEXT NOT NULL,
                task_id TEXT NOT NULL,
                task_type TEXT NOT NULL,
                prompt TEXT NOT NULL,
                meta_json TEXT,
                state TEXT NOT NULL,
                result_summary TEXT,
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );

            CREATE TABLE IF NOT EXISTS room_tokens (
                id TEXT PRIMARY KEY,
                room_id TEXT NOT NULL,
                token_hash TEXT NOT NULL,
                role TEXT NOT NULL,
                enabled INTEGER NOT NULL DEFAULT 1,
                created_at TEXT NOT NULL
            );
        `);
    }
    return db;
}

export function getDbDriver() {
    return dbDriver;
}
