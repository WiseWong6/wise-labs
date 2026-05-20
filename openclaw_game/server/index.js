import express from 'express';
import fs from 'fs';
import path from 'path';

import { getDb } from './db.js';
import { authorizeRoomRequest } from './roomAuth.js';
import { subscribeRoom, listRoomEventsAfter } from './eventHub.js';
import { startSystemOpenclawListener } from './systemListener.js';
import {
  findSessionFileById,
  getSessionMetadataBySessionId,
  listActiveSessionFiles,
  matchesChannelFilter,
} from './sessionRegistry.js';
import { getConfiguredAgents, getFeishuAccounts, getFeishuAccountName } from './openclawConfig.js';
import { getRuntimeBootstrap, getResolvedDataMode } from './dataMode.js';
import { getDemoAgents, getDemoEvents, getDemoSessionMessages, getDemoSessions, getDemoSubagentRuns } from './demoData.js';
import { listLiveSubagentRuns } from './subagentRuns.js';

const app = express();
const PORT = process.env.PORT || 3101;

const runtime = getRuntimeBootstrap();
if (runtime.mode === 'live') {
  startSystemOpenclawListener({ roomId: runtime.roomId });
}

function normalizeFeishuChatType(chatType) {
  const value = String(chatType || '').toLowerCase();
  if (!value) return null;
  if (value === 'group' || value === 'private') return 'feishu-group';
  if (value === 'direct' || value === 'p2p') return 'feishu-direct';
  return null;
}

function inferFeishuChannelFromConversationInfo(info) {
  if (!info || typeof info !== 'object') return null;

  const byChatType = normalizeFeishuChatType(
    info.chat_type ||
    info.chatType ||
    info.message?.chat_type ||
    info.message?.chatType ||
    info.event?.message?.chat_type ||
    info.event?.message?.chatType
  );
  if (byChatType) return byChatType;

  if (info.is_group_chat === true) return 'feishu-group';
  if (info.is_group_chat === false) return 'feishu-direct';

  const conversationLabel = String(info.conversation_label || info.conversationLabel || '');
  const groupSubject = String(info.group_subject || info.groupSubject || '');
  const chatId = String(info.chat_id || info.chatId || info.message?.chat_id || info.event?.message?.chat_id || '');
  const senderId = String(info.sender_id || info.senderId || '');

  if (groupSubject) return 'feishu-group';
  if (conversationLabel.startsWith('oc_')) return 'feishu-group';
  if (chatId.startsWith('oc_') && info.was_mentioned === true) return 'feishu-group';
  if (senderId.startsWith('ou_')) return 'feishu-direct';

  return null;
}

function detectSessionChannelFallback(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').filter((line) => line.trim());
    for (const line of lines) {
      const parsed = JSON.parse(line);
      if (parsed.type !== 'message' || parsed.message?.role !== 'user') continue;

      const messageContent = parsed.message?.content;
      let text = '';
      if (Array.isArray(messageContent)) {
        const textItem = messageContent.find((item) => item.type === 'text');
        text = textItem?.text || '';
      } else if (typeof messageContent === 'string') {
        text = messageContent;
      }

      const conversationMatch = text.match(/Conversation info \(untrusted metadata\):\s*```(?:json)?\s*([\s\S]*?)```/i);
      if (conversationMatch) {
        try {
          const info = JSON.parse(conversationMatch[1]);
          const inferred = inferFeishuChannelFromConversationInfo(info);
          if (inferred) return inferred;
        } catch {
          // ignore malformed metadata blocks
        }
      }

      const senderMatch = text.match(/Sender \(untrusted metadata\):\s*```(?:json)?\s*([\s\S]*?)```/i);
      if (senderMatch) {
        try {
          const sender = JSON.parse(senderMatch[1]);
          const senderId = sender.id || '';
          if (sender.name === 'openclaw-tui' || sender.id === 'gateway-client') return 'tui';
          if (/^oc_/.test(senderId)) return 'feishu-group';
          if (sender.name === 'feishu' || /^(ou_|feishu)/.test(senderId)) return 'feishu-direct';
        } catch {
          // ignore malformed metadata blocks
        }
      }

      const trimmed = text.trimStart();
      if (/^\[cron:/i.test(trimmed)) return 'cron';
      return 'tui';
    }
  } catch {
    // ignore read errors
  }

  return 'unknown';
}

function resolveSessionChannel(sessionId, filePath) {
  const canonical = getSessionMetadataBySessionId(sessionId);
  if (canonical?.channel && canonical.channel !== 'unknown') {
    return canonical.channel;
  }
  return detectSessionChannelFallback(filePath);
}

function resolveSessionAgentDisplayName(sessionId) {
  const canonical = getSessionMetadataBySessionId(sessionId);
  return canonical?.agentDisplayName || null;
}

function readSessionStartTimestamp(filePath) {
  try {
    const fd = fs.openSync(filePath, 'r');
    const buffer = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buffer, 0, 512, 0);
    fs.closeSync(fd);
    const firstLine = buffer.slice(0, bytesRead).toString('utf8').split('\n')[0];
    const parsed = JSON.parse(firstLine);
    return parsed?.timestamp || null;
  } catch {
    return null;
  }
}

function buildLiveSessionRecord(file) {
  const canonical = getSessionMetadataBySessionId(file.id);
  const channel = canonical?.channel || resolveSessionChannel(file.id, file.path);
  const accountId = canonical?.accountId || file.accountId || null;
  const accountName = canonical?.accountName || getFeishuAccountName(accountId) || file.accountName || null;
  const agentId = canonical?.agentId || file.agentId || null;
  const agentDisplayName = canonical?.agentDisplayName || file.agentDisplayName || resolveSessionAgentDisplayName(file.id) || agentId || 'Unknown';
  const timestamp = readSessionStartTimestamp(file.path) || new Date(file.time).toISOString();

  return {
    id: file.id,
    filename: file.name,
    filePath: file.path,
    channel,
    sessionKey: canonical?.sessionKey || file.sessionKey || null,
    sessionKind: canonical?.sessionKind || file.sessionKind || 'other',
    isSubagent: canonical?.isSubagent || file.isSubagent || false,
    label: canonical?.label || file.label || null,
    agentId,
    agentDisplayName,
    accountId,
    accountName,
    parentSessionKey: canonical?.parentSessionKey || file.parentSessionKey || null,
    parentSessionId: canonical?.parentSessionId || file.parentSessionId || null,
    depth: canonical?.depth || file.depth || null,
    timestamp,
    lastModified: new Date(file.time).toISOString(),
  };
}

function augmentSessionLine(record, session, lineIndex) {
  return {
    ...record,
    sessionId: session.id,
    agentId: session.agentId,
    agentDisplayName: session.agentDisplayName,
    accountId: session.accountId,
    accountName: session.accountName,
    channel: session.channel,
    sessionKey: session.sessionKey,
    sessionKind: session.sessionKind,
    isSubagent: session.isSubagent,
    parentSessionKey: session.parentSessionKey,
    parentSessionId: session.parentSessionId,
    depth: session.depth,
    dedupeKey: `session:${session.id}:${lineIndex}:${record.type || 'entry'}:${record.id || 'no-id'}`,
  };
}

function readLiveSessionMessages(session) {
  try {
    const content = fs.readFileSync(session.filePath, 'utf8');
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line, index) => {
        try {
          return augmentSessionLine(JSON.parse(line), session, index);
        } catch {
          return null;
        }
      })
      .filter((record) => record !== null)
      .sort((a, b) => {
        const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return timeA - timeB;
      });
  } catch (error) {
    console.error(`Error reading session file ${session.filename}:`, error);
    return [];
  }
}

function getLiveRecentSessionFiles(days = 7) {
  return listActiveSessionFiles({ days }).sort((a, b) => a.time - b.time);
}

function matchesScope(sessionLike, scope = 'all') {
  if (!scope || scope === 'all') return true;
  if (scope === 'subagent') return sessionLike.sessionKind === 'subagent' || sessionLike.isSubagent === true;
  if (scope === 'user') return sessionLike.sessionKind !== 'subagent' && sessionLike.isSubagent !== true;
  return true;
}

function filterSessions(sessions, { channelFilter, agentIdFilter, accountIdFilter, scope }) {
  return sessions.filter((session) => {
    if (agentIdFilter && session.agentId !== agentIdFilter) return false;
    if (accountIdFilter && session.accountId !== accountIdFilter) return false;
    if (!matchesScope(session, scope)) return false;
    if (!channelFilter) return true;
    return matchesChannelFilter(session.channel, channelFilter);
  });
}

function getLiveSessions() {
  return listActiveSessionFiles()
    .map(buildLiveSessionRecord)
    .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());
}

function getSessionsForMode() {
  return getResolvedDataMode() === 'demo' ? getDemoSessions() : getLiveSessions();
}

function getAgentsForMode() {
  if (getResolvedDataMode() === 'demo') {
    return getDemoAgents().map((agent) => ({
      id: agent.id,
      displayName: agent.displayName,
      accountId: null,
      accountName: null,
    }));
  }

  return getConfiguredAgents().map((agent) => ({
    id: agent.id,
    displayName: agent.displayName,
    accountId: agent.feishuAccountId,
    accountName: agent.accountName,
  }));
}

function getSubagentRunsForMode() {
  return getResolvedDataMode() === 'demo' ? getDemoSubagentRuns() : listLiveSubagentRuns();
}

function getLatestMessagesForMode({ sessionId, channelFilter, agentIdFilter, accountIdFilter, scope }) {
  if (getResolvedDataMode() === 'demo') {
    if (sessionId) {
      return getDemoSessionMessages(sessionId);
    }

    const sessions = filterSessions(getDemoSessions(), { channelFilter, agentIdFilter, accountIdFilter, scope });
    const messages = sessions.flatMap((session) => getDemoSessionMessages(session.id));
    return messages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  if (sessionId) {
    const file = findSessionFileById(sessionId);
    if (!file?.path || !fs.existsSync(file.path)) {
      return null;
    }
    const session = buildLiveSessionRecord(file);
    return readLiveSessionMessages(session);
  }

  let recentFiles = getLiveRecentSessionFiles(7).map(buildLiveSessionRecord);
  recentFiles = filterSessions(recentFiles, { channelFilter, agentIdFilter, accountIdFilter, scope });
  const allMessages = recentFiles.flatMap((session) => readLiveSessionMessages(session));
  return allMessages.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

function sendSseHeaders(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();
  res.write(': connected\n\n');
}

function handleDemoStream(req, res) {
  sendSseHeaders(res);

  const timers = [];
  const demoEvents = getDemoEvents();
  demoEvents.forEach((event, index) => {
    timers.push(setTimeout(() => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }, 1200 * (index + 1)));
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    timers.forEach((timer) => clearTimeout(timer));
  });
}

function handleLiveStream(req, res, roomId) {
  sendSseHeaders(res);

  const shouldReplay = req.query.replay !== '0';
  if (shouldReplay) {
    listRoomEventsAfter(roomId, null).forEach((event) => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  }

  const unsubscribe = subscribeRoom(roomId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
}

app.get('/api/bootstrap', (_req, res) => {
  const currentRuntime = getRuntimeBootstrap();
  const roomId = currentRuntime.roomId;
  const token = currentRuntime.tokens.admin;

  res.json({
    ...currentRuntime,
    streamUrl: `/api/rooms/${roomId}/stream?token=${encodeURIComponent(token)}&replay=0`,
    sessions: getSessionsForMode(),
    agents: getAgentsForMode(),
    feishuAccounts: currentRuntime.mode === 'live' ? getFeishuAccounts() : [],
    subagentRuns: getSubagentRunsForMode(),
    defaults: {
      channel: '',
      scope: 'all',
    },
  });
});

app.get('/api/rooms/:roomId/stream', (req, res) => {
  const { roomId } = req.params;
  const auth = authorizeRoomRequest(req, roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (getResolvedDataMode() === 'demo') {
    handleDemoStream(req, res);
    return;
  }

  handleLiveStream(req, res, roomId);
});

app.get('/api/rooms/:roomId/history', (req, res) => {
  const { roomId } = req.params;
  const auth = authorizeRoomRequest(req, roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  if (getResolvedDataMode() === 'demo') {
    return res.json({ events: getDemoEvents().slice(-50) });
  }

  const db = getDb();
  const events = db.prepare(`
    SELECT * FROM events WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(roomId);

  return res.json({ events });
});

app.get('/api/sessions/history', (req, res) => {
  const auth = authorizeRoomRequest(req, runtime.roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const messages = getLatestMessagesForMode({
    sessionId: req.query.session || null,
    channelFilter: req.query.channel || null,
    agentIdFilter: req.query.agentId || null,
    accountIdFilter: req.query.accountId || null,
    scope: req.query.scope || 'all',
  });

  if (messages === null) {
    return res.status(404).json({ error: 'Session not found', messages: [] });
  }

  const normalized = messages.map((message) => ({
    id: message.id,
    timestamp: message.timestamp,
    message: {
      role: message.message?.role || 'assistant',
      content: message.message?.content || '',
    },
  }));

  return res.json({ messages: normalized });
});

app.get('/api/sessions/list', (req, res) => {
  const auth = authorizeRoomRequest(req, runtime.roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const sessions = getSessionsForMode();
    res.json({
      mode: getResolvedDataMode(),
      sessions,
      agents: getAgentsForMode(),
      feishuAccounts: getResolvedDataMode() === 'live' ? getFeishuAccounts() : [],
      subagentRuns: getSubagentRunsForMode(),
    });
  } catch (error) {
    console.error('Error listing sessions:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/subagents/runs', (req, res) => {
  const auth = authorizeRoomRequest(req, runtime.roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const scope = req.query.scope || 'all';
  const runs = getSubagentRunsForMode().filter((run) => matchesScope(run, scope));
  res.json({ mode: getResolvedDataMode(), runs });
});

app.get('/api/sessions/latest', (req, res) => {
  const auth = authorizeRoomRequest(req, runtime.roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const sessionId = req.query.session || null;
    const channelFilter = req.query.channel || null;
    const agentIdFilter = req.query.agentId || null;
    const accountIdFilter = req.query.accountId || null;
    const scope = req.query.scope || 'all';

    const messages = getLatestMessagesForMode({
      sessionId,
      channelFilter,
      agentIdFilter,
      accountIdFilter,
      scope,
    });

    if (messages === null) {
      return res.status(404).json({ error: 'Session not found', messages: [] });
    }

    const subagentRuns = getSubagentRunsForMode();
    return res.json({
      mode: getResolvedDataMode(),
      sessionFile: sessionId || null,
      messages: messages.slice(-500),
      subagentRuns,
    });
  } catch (error) {
    console.error('Error reading session data:', error);
    return res.status(500).json({ error: error.message });
  }
});

app.get('/', (_req, res) => {
  res.sendFile(path.resolve(process.cwd(), 'index.dynamic.html'));
});

app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`OpenClaw Game running at http://127.0.0.1:${PORT} (${getResolvedDataMode()} mode)`);
});
