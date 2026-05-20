# 实时数据源验证报告

## 2026-03-07

### ✅ 实时数据读取实现

**Commit**: 准备提交

#### 实现方案

选择**直接读取 JSONL 文件**方案（而非数据库轮询）

**原因**：
1. 数据源真实性：直接从 OpenClaw 的 session 文件读取
2. 零延迟：无中间层转换
3. 数据完整性：保留所有字段（thinking、toolCalls、toolResults）
4. 简单性：无需额外的数据同步逻辑

#### 技术实现

**后端新增** (`server/index.js`):

```javascript
// 1. 获取最新 session 文件
function getLatestSessionFile() {
  const sessionDir = path.join(process.env.HOME, '.openclaw', 'agents', 'main', 'sessions');
  const files = fs.readdirSync(sessionDir)
    .filter(f => f.endsWith('.jsonl'))
    .map(f => ({
      name: f,
      time: fs.statSync(path.join(sessionDir, f)).mtime.getTime()
    }))
    .sort((a, b) => b.time - a.time);
  return files[0]?.name;
}

// 2. 新 API 端点
app.get('/api/sessions/latest', (req, res) => {
  const latestFile = getLatestSessionFile();
  const filepath = path.join(sessionDir, latestFile);
  const content = fs.readFileSync(filepath, 'utf8');
  const lines = content.split('\n').filter(l => l.trim());
  const messages = lines.map(line => JSON.parse(line));
  
  res.json({
    sessionFile: latestFile,
    messages: messages.slice(-50) // 最近 50 条
  });
});
```

**前端修改** (`app.js`):

```javascript
async function pollSessionHistory() {
  // 从数据库 API 改为直接读取 JSONL
  const url = `http://127.0.0.1:3101/api/sessions/latest?token=admin-demo-token`;
  const res = await fetch(url);
  const data = await res.json();
  const messages = data.messages || [];
  
  // 处理消息...
  for (const msg of messages) {
    if (!processedMsgIds.has(msg.id)) {
      processedMsgIds.add(msg.id);
      handleHistoryMessage(msg);
    }
  }
}
```

#### 数据结构示例

**成功返回的 JSON 格式**：

```json
{
  "sessionFile": "23540954-89f3-477d-a4ea-7b653832cf04.jsonl",
  "messages": [
    {
      "type": "message",
      "id": "6b56e9c1",
      "timestamp": "2026-03-06T10:35:17.585Z",
      "message": {
        "role": "user",
        "content": [
          {
            "type": "text",
            "text": "用户消息内容..."
          }
        ]
      }
    },
    {
      "type": "message",
      "id": "1cffc8d8",
      "timestamp": "2026-03-06T10:35:21.126Z",
      "message": {
        "role": "assistant",
        "content": [
          {
            "type": "thinking",
            "thinking": "思考过程..."
          },
          {
            "type": "text",
            "text": "输出内容..."
          }
        ]
      }
    }
  ]
}
```

#### 验证结果

✅ 服务器启动成功 (http://127.0.0.1:3101)
✅ API 端点正常响应 (`/api/sessions/latest`)
✅ JSONL 文件读取成功
✅ 消息解析正确（包含 thinking、text、toolCall、toolResult）
✅ 数据实时性：直接从文件系统读取，无延迟

#### 与旧方案对比

| 方案 | 数据源 | 延迟 | 完整性 | 复杂度 |
|------|--------|------|--------|--------|
| **旧方案** | SQLite 数据库 | 中等 | 截断的 summary | 高（需同步） |
| **新方案** | JSONL 文件 | 零 | 完整 content | 低（直接读取） |

#### 文件路径

- Session 文件位置：`~/.openclaw/agents/main/sessions/*.jsonl`
- 文件命名格式：`<session-uuid>.jsonl`
- 选择策略：按修改时间排序，选择最新的文件

---

## 后续优化建议

1. **文件监听**：使用 `fs.watch()` 替代轮询，进一步降低延迟
2. **缓存机制**：避免重复读取已处理的消息
3. **错误处理**：增强对损坏 JSONL 文件的容错性
4. **多 Session 支持**：支持读取多个 session 文件

---

## 2026-03-09

### ✅ Channel 归类与 Session Key 对齐验证

本次验证目标：确认页面展示使用的 `channel` 与 OpenClaw 原生 `sessions.json` 一致，而不是继续依赖消息内容猜测。

#### Canonical 数据源

- 文件：`~/.openclaw/agents/main/sessions/sessions.json`
- 核心映射：`sessionKey -> sessionId`
- 当前接入方式：
  - `server/sessionRegistry.js` 负责读取并缓存
  - `server/index.js` 和 `server/systemListener.js` 共享同一套解析逻辑

#### 核心映射规则

| Session Key 模式 | 归类 channel |
|------------------|-------------|
| `agent:main:tui-*` | `tui` |
| `agent:main:direct:*` | `feishu` |
| `agent:main:feishu:direct:*` | `feishu` |
| `agent:main:cron:*` / `:run:*` | `cron` |
| `agent:main:main` | `heartbeat` |

#### 真实数据验证

```bash
node --input-type=module - <<'NODE'
import { getSessionMetadataBySessionId } from './server/sessionRegistry.js';
for (const id of [
  'c40b7f28-8fb3-44b6-83c6-aefd291b741a',
  '13357f0c-3b9c-446a-8d6e-28fde89b773a',
  '35550974-8f3b-45d0-9367-352cdaf06c64',
  '58643d8f-ae45-4372-b328-c593a0c974b4'
]) {
  const meta = getSessionMetadataBySessionId(id);
  console.log(id, meta?.channel, meta?.sessionKey);
}
NODE
```

输出结果：

```text
c40b7f28-8fb3-44b6-83c6-aefd291b741a feishu agent:main:direct:ou_3abefdc5460dadc04be34ee10566cd3e
13357f0c-3b9c-446a-8d6e-28fde89b773a tui agent:main:tui-0b374b7b-fd3e-4e88-bf6a-0381827ef192
35550974-8f3b-45d0-9367-352cdaf06c64 cron agent:main:cron:2418b0b1-d169-42be-8a37-473367bbfee7
58643d8f-ae45-4372-b328-c593a0c974b4 heartbeat agent:main:main
```

✅ 说明 canonical 归类正确。

#### API 验证

```bash
curl -s 'http://127.0.0.1:3101/api/sessions/list?token=admin-demo-token' | jq '.sessions[:5] | map({id,channel,sessionKey})'
```

验证结果：
- `c40...` 已返回 `feishu`
- `5864...` 已返回 `heartbeat`
- `13357...` 已返回 `tui`

```bash
curl -s 'http://127.0.0.1:3101/api/sessions/latest?token=admin-demo-token&channel=heartbeat'
```

✅ 返回仅包含 heartbeat channel 下的 session 合并历史。

#### 实时事件验证

```bash
sqlite3 openclawd.db ".mode tabs" \
"select summary, json_extract(payload_json, '$.channel'), json_extract(payload_json, '$.sessionId')
 from events
 where json_extract(payload_json, '$.sessionId') = 'c40b7f28-8fb3-44b6-83c6-aefd291b741a'
 order by created_at desc
 limit 5;"
```

✅ 新写入的 `c40...` assistant / toolResult 事件已全部归类为 `feishu`，不再错误落到 `tui`。
