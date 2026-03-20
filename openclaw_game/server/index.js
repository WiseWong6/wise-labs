import express from 'express';
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
import fs from 'fs';
import path from 'path';

const app = express();
const PORT = process.env.PORT || 3101;

function getRecentSessionFiles(days = 7) {
  return listActiveSessionFiles({ days }).sort((a, b) => a.time - b.time);
}

// 启动 OpenClaw 监听器
startSystemOpenclawListener({ roomId: 'room-42' });

// SSE 流（前端必需）
app.get('/api/rooms/:roomId/stream', (req, res) => {
  const { roomId } = req.params;
  const auth = authorizeRoomRequest(req, roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });
  const shouldReplay = req.query.replay !== '0';

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
  res.flushHeaders?.();
  res.write(': connected\n\n');

  // 重放历史事件
  if (shouldReplay) {
    const replayEvents = listRoomEventsAfter(roomId, null);
    replayEvents.forEach(event => {
      res.write(`data: ${JSON.stringify(event)}\n\n`);
    });
  }

  // 订阅实时事件
  const unsubscribe = subscribeRoom(roomId, (event) => {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  });

  // 心跳（每 15 秒）
  const heartbeat = setInterval(() => {
    res.write(': heartbeat\n\n');
  }, 15000);

  // 清理
  req.on('close', () => {
    clearInterval(heartbeat);
    unsubscribe();
  });
});

// 房间历史（原有 API）
app.get('/api/rooms/:roomId/history', (req, res) => {
  const { roomId } = req.params;
  const auth = authorizeRoomRequest(req, roomId);
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const db = getDb();
  const events = db.prepare(`
    SELECT * FROM events WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all(roomId);

  res.json({ events });
});

// 会话历史（前端实际需要的 API）
app.get('/api/sessions/history', (req, res) => {
  const auth = authorizeRoomRequest(req, 'room-42');
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  const db = getDb();
  const events = db.prepare(`
    SELECT * FROM events WHERE room_id = ?
    ORDER BY created_at DESC LIMIT 50
  `).all('room-42');

  // 转换为前端期望的格式
  const messages = events.map(ev => {
    const payload = JSON.parse(ev.payload_json || '{}');
    return {
      id: ev.id,
      timestamp: ev.created_at,
      message: {
        role: payload.role || (ev.type.includes('user') ? 'user' : 'assistant'),
        content: payload.content || payload.text || ev.summary // 优先使用完整 content
      }
    };
  });

  res.json({ messages: messages.reverse() });
});

// 旧 session 的兜底规则：从 session 文件内容里猜测 channel
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
    const lines = content.split('\n').filter(l => l.trim());
    for (const line of lines) {
      const d = JSON.parse(line);
      if (d.type !== 'message' || d.message?.role !== 'user') continue;

      const content = d.message?.content;
      let text = '';
      if (Array.isArray(content)) {
        const textItem = content.find(c => c.type === 'text');
        text = textItem?.text || '';
      } else if (typeof content === 'string') {
        text = content;
      }

      // 优先使用飞书保留下来的 Conversation metadata，它比 sender/chat_id 更稳定。
      const conversationMatch = text.match(/Conversation info \(untrusted metadata\):\s*```(?:json)?\s*([\s\S]*?)```/i);
      if (conversationMatch) {
        try {
          const info = JSON.parse(conversationMatch[1]);
          const inferred = inferFeishuChannelFromConversationInfo(info);
          if (inferred) return inferred;
        } catch (e) { /* ignore */ }
      }

      // 解析 Sender (untrusted metadata) JSON 块
      const senderMatch = text.match(/Sender \(untrusted metadata\):\s*```(?:json)?\s*([\s\S]*?)```/i);
      if (senderMatch) {
        try {
          const sender = JSON.parse(senderMatch[1]);
          const senderId = sender.id || '';
          if (sender.name === 'openclaw-tui' || sender.id === 'gateway-client') return 'tui';
          if (/^oc_/.test(senderId)) return 'feishu-group';
          if (sender.name === 'feishu' || /^(ou_|feishu)/.test(senderId)) return 'feishu-direct';
        } catch (e) { /* ignore */ }
      }

      // 无 Sender 块：按内容判断
      const trimmed = text.trimStart();
      if (/^\[cron:/i.test(trimmed)) return 'cron';
      // /new 或 /reset 发起的 session，也归 tui
      return 'tui';
    }
  } catch (e) { /* ignore */ }
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
    const buf = Buffer.alloc(512);
    const bytesRead = fs.readSync(fd, buf, 0, 512, 0);
    fs.closeSync(fd);
    const firstLine = buf.slice(0, bytesRead).toString('utf8').split('\n')[0];
    const parsed = JSON.parse(firstLine);
    return parsed?.timestamp || null;
  } catch {
    return null;
  }
}

function buildSessionRecord(file) {
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
    label: canonical?.label || file.label || null,
    agentId,
    agentDisplayName,
    accountId,
    accountName,
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
    dedupeKey: `session:${session.id}:${lineIndex}:${record.type || 'entry'}:${record.id || 'no-id'}`,
  };
}

function readSessionMessages(session) {
  try {
    const content = fs.readFileSync(session.filePath, 'utf8');
    return content.split('\n')
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

// 新增：session 列表 API
app.get('/api/sessions/list', (req, res) => {
  const auth = authorizeRoomRequest(req, 'room-42');
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const files = listActiveSessionFiles()
      .map(buildSessionRecord)
      .sort((a, b) => new Date(b.lastModified).getTime() - new Date(a.lastModified).getTime());

    const agents = getConfiguredAgents().map((agent) => ({
      id: agent.id,
      displayName: agent.displayName,
      accountId: agent.feishuAccountId,
      accountName: agent.accountName,
    }));

    if (files.length === 0) {
      return res.json({ sessions: [], agents, feishuAccounts: getFeishuAccounts() });
    }

    res.json({ sessions: files, agents, feishuAccounts: getFeishuAccounts() });
  } catch (e) {
    console.error('Error listing sessions:', e);
    res.status(500).json({ error: e.message });
  }
});

// 新增：直接读取 OpenClaw session 文件（实时数据）
// 获取最近 7 天的会话数据，或指定 session
app.get('/api/sessions/latest', (req, res) => {
  const auth = authorizeRoomRequest(req, 'room-42');
  if (!auth.ok) return res.status(auth.status).json({ error: auth.error });

  try {
    const sessionId = req.query.session;
    const channelFilter = req.query.channel;
    const agentIdFilter = req.query.agentId;
    const accountIdFilter = req.query.accountId;

    // 指定 session 模式：只读该文件
    if (sessionId) {
      const file = findSessionFileById(sessionId);
      if (!file?.path || !fs.existsSync(file.path)) {
        return res.status(404).json({ error: 'Session not found', messages: [] });
      }
      const session = buildSessionRecord(file);
      return res.json({
        sessionFile: file.name,
        agentId: session.agentId,
        agentDisplayName: session.agentDisplayName,
        messages: readSessionMessages(session),
      });
    }

    // 全部模式：最近 7 天合并
    let recentFiles = getRecentSessionFiles(7);
    if (channelFilter || agentIdFilter || accountIdFilter) {
      recentFiles = recentFiles.filter(file => {
        const session = buildSessionRecord(file);
        if (agentIdFilter && session.agentId !== agentIdFilter) {
          return false;
        }
        if (accountIdFilter && session.accountId !== accountIdFilter) {
          return false;
        }
        if (!channelFilter) return true;
        return matchesChannelFilter(session.channel, channelFilter);
      });
    }
    if (recentFiles.length === 0) {
      return res.json({ messages: [], sessionFile: null });
    }

    // 合并所有会话文件的消息
    let allMessages = [];
    for (const file of recentFiles) {
      const session = buildSessionRecord(file);
      allMessages = allMessages.concat(readSessionMessages(session));
    }

    // 按时间戳排序
    allMessages.sort((a, b) => {
      const timeA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const timeB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return timeA - timeB;
    });

    res.json({
      sessionFile: recentFiles.map(f => f.name).join(', '),
      messages: allMessages.slice(-500) // 只返回最近 500 条
    });
  } catch (e) {
    console.error('Error reading session file:', e);
    res.status(500).json({ error: e.message });
  }
});

// 静态文件服务（前端）
app.use(express.static('.'));

app.listen(PORT, () => {
  console.log(`🚀 OpenClaw Game running at http://127.0.0.1:${PORT}`);
});
