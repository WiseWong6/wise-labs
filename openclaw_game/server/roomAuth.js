import { getDb } from './db.js';
import { getAdminToken, getReadonlyToken } from './dataMode.js';

const DEFAULT_ADMIN_TOKEN = getAdminToken();
const DEFAULT_READONLY_TOKEN = getReadonlyToken();

function getTokenFromAuthHeader(request) {
    const header = request.headers.get?.('authorization') || request.headers.get?.('Authorization') ||
                   request.headers.authorization || request.headers.Authorization;
    if (!header || !header.toLowerCase().startsWith('bearer ')) {
        return null;
    }
    return header.slice(7).trim();
}

export function extractRoomToken(request) {
    let url;
    try {
        url = new URL(request.url);
    } catch {
        // Express sometimes uses relative paths
        url = new URL(request.url, 'http://localhost');
    }
    const searchToken = url.searchParams.get('token');
    return searchToken || getTokenFromAuthHeader(request);
}

export function resolveRoomRole(roomId, token) {
    if (!token) return null;

    // Fallback constants mainly for simple demo/dev tests
    if (token === DEFAULT_ADMIN_TOKEN) return 'admin';
    if (token === DEFAULT_READONLY_TOKEN) return 'readonly';

    // Check in database
    try {
        const db = getDb();
        const row = db.prepare('SELECT role, enabled FROM room_tokens WHERE room_id = ? AND token_hash = ?').get(roomId, token);
        if (row && row.enabled) {
            return row.role;
        }
    } catch (e) {
        console.error('Error resolving room role:', e);
    }

    return null;
}

export function authorizeRoomRequest(request, roomId, options = {}) {
    const { requireAdmin = false } = options;
    const token = extractRoomToken(request);
    const role = resolveRoomRole(roomId, token);

    if (!role) {
        return {
            ok: false,
            status: 401,
            error: 'Unauthorized token.',
        };
    }

    if (requireAdmin && role !== 'admin') {
        return {
            ok: false,
            status: 403,
            error: 'Admin role required.',
        };
    }

    return {
        ok: true,
        role,
        token,
    };
}
