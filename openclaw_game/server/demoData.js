const DEMO_AGENTS = [
  { id: 'main', displayName: 'Main Coordinator', index: 0 },
  { id: 'research', displayName: 'Research Agent', index: 1 },
  { id: 'content', displayName: 'Content Agent', index: 2 },
  { id: 'review', displayName: 'Review Agent', index: 3 },
];

const DEMO_SESSIONS = [
  {
    id: 'demo-feishu-direct-001',
    filename: 'demo-feishu-direct-001.jsonl',
    filePath: null,
    channel: 'feishu-direct',
    sessionKind: 'direct',
    sessionKey: 'agent:main:direct:ou_demo_product',
    label: 'Wise Wong',
    agentId: 'main',
    agentDisplayName: 'Main Coordinator',
    accountId: 'main',
    accountName: 'main',
    timestamp: '2026-03-20T08:00:00.000Z',
    lastModified: '2026-03-20T08:07:00.000Z',
  },
  {
    id: 'demo-tui-001',
    filename: 'demo-tui-001.jsonl',
    filePath: null,
    channel: 'tui',
    sessionKind: 'direct',
    sessionKey: 'agent:main:tui-demo-main',
    label: 'openclaw-tui',
    agentId: 'main',
    agentDisplayName: 'Main Coordinator',
    accountId: null,
    accountName: null,
    timestamp: '2026-03-20T08:10:00.000Z',
    lastModified: '2026-03-20T08:14:00.000Z',
  },
  {
    id: 'demo-subagent-research-001',
    filename: 'demo-subagent-research-001.jsonl',
    filePath: null,
    channel: 'internal',
    sessionKind: 'subagent',
    sessionKey: 'agent:main:subagent:demo-research-001',
    label: 'Research burst',
    agentId: 'main',
    agentDisplayName: 'Main Coordinator',
    accountId: null,
    accountName: null,
    parentSessionId: 'demo-feishu-direct-001',
    parentSessionKey: 'agent:main:direct:ou_demo_product',
    depth: 1,
    timestamp: '2026-03-20T08:01:10.000Z',
    lastModified: '2026-03-20T08:03:30.000Z',
  },
];

const DEMO_MESSAGES_BY_SESSION = {
  'demo-feishu-direct-001': [
    {
      type: 'message',
      id: 'demo-msg-user-1',
      timestamp: '2026-03-20T08:00:00.000Z',
      message: {
        role: 'user',
        content: '帮我整理一份今天要发给老板的 AI 行业 briefing，并且顺便调研两家竞品。',
      },
    },
    {
      type: 'message',
      id: 'demo-msg-assistant-1',
      timestamp: '2026-03-20T08:00:04.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '任务包含总结与调研两个并发子任务，先启动一个临时研究子代理。' },
          { type: 'text', text: '我先拆成两部分：主线整理 briefing，同时启动一个临时研究子代理去跑竞品信息。' },
        ],
      },
    },
    {
      type: 'message',
      id: 'demo-msg-assistant-2',
      timestamp: '2026-03-20T08:03:45.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: '研究子代理已经返回结果。我已汇总竞品差异，并把 briefing 草稿整理成三段式摘要。' },
        ],
      },
    },
  ],
  'demo-tui-001': [
    {
      type: 'message',
      id: 'demo-msg-user-2',
      timestamp: '2026-03-20T08:10:00.000Z',
      message: {
        role: 'user',
        content: 'show me how subagents are visualized in demo mode',
      },
    },
    {
      type: 'message',
      id: 'demo-msg-assistant-3',
      timestamp: '2026-03-20T08:10:03.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: 'Demo mode 会把 dispatch/subagent 运行显示为临时工位，完成后自动退出舞台。' },
        ],
      },
    },
  ],
  'demo-subagent-research-001': [
    {
      type: 'message',
      id: 'demo-msg-subagent-1',
      timestamp: '2026-03-20T08:01:12.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'thinking', thinking: '收集竞品最近 24 小时更新、官网定位与新增能力。' },
        ],
      },
    },
    {
      type: 'message',
      id: 'demo-msg-subagent-2',
      timestamp: '2026-03-20T08:03:20.000Z',
      message: {
        role: 'assistant',
        content: [
          { type: 'text', text: '竞品 A 强调自动化工作流，竞品 B 强调内部知识库检索；两者都缺少高可见性的执行可视化。' },
        ],
      },
    },
  ],
};

const DEMO_SUBAGENT_RUNS = [];

const DEMO_EVENTS = [
  {
    eventId: 'demo-event-1',
    roomId: 'room-42',
    taskId: 'demo-feishu-direct-001',
    agentId: 'main',
    type: 'task.progress',
    status: null,
    summary: '[feishu-direct] 帮我整理一份今天要发给老板的 AI 行业 briefing，并且顺便调研两家竞品。',
    severity: 'info',
    timestamp: '2026-03-20T08:00:00.000Z',
    source: 'demo',
    payload: {
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      channel: 'feishu-direct',
      role: 'user',
      sessionId: 'demo-feishu-direct-001',
      sessionKey: 'agent:main:direct:ou_demo_product',
      sessionKind: 'direct',
      content: '帮我整理一份今天要发给老板的 AI 行业 briefing，并且顺便调研两家竞品。',
    },
  },
  {
    eventId: 'demo-event-2',
    roomId: 'room-42',
    taskId: 'dispatch-demo-research',
    agentId: 'main',
    type: 'dispatch.created',
    status: null,
    summary: 'Research burst dispatched',
    severity: 'info',
    timestamp: '2026-03-20T08:00:03.000Z',
    source: 'demo',
    payload: {
      dispatchId: 'dispatch-demo-research',
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      sessionKind: 'subagent',
      taskClass: 'research',
      taskType: 'researching',
      worldLabel: '调研任务 · Research burst',
      label: 'Research burst',
      summary: '正在调研两家竞品的最新定位和差异点',
      parentSessionId: 'demo-feishu-direct-001',
      parentSessionKey: 'agent:main:direct:ou_demo_product',
      sessionId: 'demo-subagent-research-001',
      sessionKey: 'agent:main:subagent:demo-research-001',
      depth: 1,
    },
  },
  {
    eventId: 'demo-event-3',
    roomId: 'room-42',
    taskId: 'dispatch-demo-research',
    agentId: 'main',
    type: 'dispatch.accepted',
    status: null,
    summary: 'Research burst running',
    severity: 'info',
    timestamp: '2026-03-20T08:00:04.000Z',
    source: 'demo',
    payload: {
      dispatchId: 'dispatch-demo-research',
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      sessionKind: 'subagent',
      taskClass: 'research',
      taskType: 'researching',
      worldLabel: '调研任务 · Research burst',
      label: 'Research burst',
      summary: '正在调研两家竞品的最新定位和差异点',
      sessionId: 'demo-subagent-research-001',
      sessionKey: 'agent:main:subagent:demo-research-001',
      depth: 1,
    },
  },
  {
    eventId: 'demo-event-4',
    roomId: 'room-42',
    taskId: 'demo-subagent-research-001',
    agentId: 'main',
    type: 'task.progress',
    status: null,
    summary: '[internal] 竞品 A 强调自动化工作流，竞品 B 强调内部知识库检索。',
    severity: 'info',
    timestamp: '2026-03-20T08:00:07.000Z',
    source: 'demo',
    payload: {
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      channel: 'internal',
      role: 'assistant',
      sessionId: 'demo-subagent-research-001',
      sessionKey: 'agent:main:subagent:demo-research-001',
      sessionKind: 'subagent',
      dispatchId: 'dispatch-demo-research',
      content: [
        { type: 'thinking', thinking: '收集竞品最近 24 小时更新、官网定位与新增能力。' },
        { type: 'text', text: '竞品 A 强调自动化工作流，竞品 B 强调内部知识库检索；两者都缺少高可见性的执行可视化。' },
      ],
    },
  },
  {
    eventId: 'demo-event-5',
    roomId: 'room-42',
    taskId: 'dispatch-demo-research',
    agentId: 'main',
    type: 'dispatch.result',
    status: null,
    summary: 'Research burst completed',
    severity: 'info',
    timestamp: '2026-03-20T08:00:11.000Z',
    source: 'demo',
    payload: {
      dispatchId: 'dispatch-demo-research',
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      sessionKind: 'subagent',
      taskClass: 'research',
      taskType: 'researching',
      worldLabel: '调研任务 已完成',
      label: 'Research burst',
      summary: '竞品研究已返回主会话',
      success: true,
      sessionId: 'demo-subagent-research-001',
      sessionKey: 'agent:main:subagent:demo-research-001',
      depth: 1,
    },
  },
  {
    eventId: 'demo-event-6',
    roomId: 'room-42',
    taskId: 'demo-feishu-direct-001',
    agentId: 'main',
    type: 'task.progress',
    status: null,
    summary: '[feishu-direct] 研究子代理已经返回结果。',
    severity: 'info',
    timestamp: '2026-03-20T08:00:13.000Z',
    source: 'demo',
    payload: {
      agentId: 'main',
      agentDisplayName: 'Main Coordinator',
      channel: 'feishu-direct',
      role: 'assistant',
      sessionId: 'demo-feishu-direct-001',
      sessionKey: 'agent:main:direct:ou_demo_product',
      sessionKind: 'direct',
      content: [
        { type: 'text', text: '研究子代理已经返回结果。我已汇总竞品差异，并把 briefing 草稿整理成三段式摘要。' },
      ],
    },
  },
];

function cloneArray(items) {
  return items.map((item) => JSON.parse(JSON.stringify(item)));
}

export function getDemoAgents() {
  return cloneArray(DEMO_AGENTS);
}

export function getDemoSessions() {
  return cloneArray(DEMO_SESSIONS);
}

export function getDemoSessionMessages(sessionId = null) {
  const sessionIds = sessionId ? [sessionId] : Object.keys(DEMO_MESSAGES_BY_SESSION);
  const records = [];

  sessionIds.forEach((id) => {
    const session = DEMO_SESSIONS.find((entry) => entry.id === id);
    const messages = DEMO_MESSAGES_BY_SESSION[id] || [];
    messages.forEach((record, index) => {
      records.push({
        ...JSON.parse(JSON.stringify(record)),
        sessionId: session?.id || id,
        agentId: session?.agentId || 'main',
        agentDisplayName: session?.agentDisplayName || 'Main Coordinator',
        channel: session?.channel || 'unknown',
        sessionKey: session?.sessionKey || null,
        sessionKind: session?.sessionKind || 'direct',
        dedupeKey: `demo:${id}:${index}:${record.id}`,
      });
    });
  });

  return records.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
}

export function getDemoSubagentRuns() {
  return cloneArray(DEMO_SUBAGENT_RUNS);
}

export function getDemoEvents() {
  return cloneArray(DEMO_EVENTS);
}
