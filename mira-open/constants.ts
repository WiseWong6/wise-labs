export const DEFAULT_MERMAID_CODE = `graph TD
  A[Start] --> B{Is it working?}
  B -- Yes --> C[Great!]
  B -- No --> D[Debug]
  D --> B
  C --> E[Deploy]
  E --> F[Relax]

  style A fill:#f9f,stroke:#333,stroke-width:2px
  style F fill:#bbf,stroke:#333,stroke-width:2px`;

export const SAMPLE_MIXED = `# 混合内容示例

这个编辑器可以在一个窗口里同时处理 **Markdown**、<span style="color: red;">HTML</span>、\`JSON\` 和 \`Mermaid\` 图表。

## 1. HTML
<div style="padding: 10px; background: #e0f2fe; border-left: 4px solid #0284c7; border-radius: 4px;">
  <strong>提示：</strong>这里可以直接嵌入原始 HTML。
</div>

## 2. JSON
JSON 代码块会自动解析并格式化：
\`\`\`json
{
  "project": "AI文档渲染",
  "features": ["Markdown", "HTML", "JSON", "Mermaid"],
  "version": 2.0
}
\`\`\`

## 3. Mermaid — 流程图
\`\`\`mermaid
graph LR
  A[输入] --> B{识别类型}
  B -->|Markdown| C[渲染文档]
  B -->|HTML| D[Iframe]
  B -->|JSON| E[格式化高亮]
  B -->|Mermaid| F[生成图表]
\`\`\`

## 4. Mermaid — 时序图
\`\`\`mermaid
sequenceDiagram
    participant 用户
    participant 编辑器
    participant 预览区
    用户->>编辑器: 输入混合内容
    编辑器->>预览区: 发送内容
    预览区-->>用户: 返回可视化结果
\`\`\`
`;

export const SAMPLE_JSON = `{
  "name": "John Doe",
  "age": 30,
  "hobbies": ["reading", "hiking", "coding"],
  "address": {
    "street": "123 Main St",
    "city": "Anytown"
  }
}`;

export const SAMPLE_MARKDOWN = `# Markdown Example

## Text Formatting
This is **bold**, *italic*, ~~strikethrough~~, and \`inline code\`.

## Lists
- Item one
- Item two
  - Nested item
  - Another nested

1. First
2. Second
3. Third

## Table

| Feature | Status |
|---------|--------|
| Markdown | ✅ |
| HTML | ✅ |
| JSON | ✅ |
| Mermaid | ✅ |

## Blockquote

> The best way to predict the future is to invent it.
> — Alan Kay

## Code Block
\`\`\`typescript
function greet(name: string): string {
  return \`Hello, \${name}!\`;
}
\`\`\`
`;

export const SAMPLE_HTML = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: system-ui, sans-serif; padding: 2rem; background: #f8fafc; }
    .card { background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 1px 3px rgba(0,0,0,0.1); max-width: 400px; margin: 0 auto; }
    .card h2 { margin: 0 0 0.5rem; color: #1e293b; }
    .card p { color: #64748b; margin: 0 0 1rem; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 9999px; font-size: 12px; font-weight: 500; }
    .green { background: #dcfce7; color: #166534; }
    .blue { background: #dbeafe; color: #1e40af; }
  </style>
</head>
<body>
  <div class="card">
    <h2>AI文档渲染</h2>
    <p>实时混合内容编辑器，右侧即时预览。</p>
    <span class="badge green">Active</span>
    <span class="badge blue">v1.0</span>
  </div>
</body>
</html>`;

export const SAMPLE_MERMAID = `# Mermaid 图表大全

> 以下展示 Mermaid 支持的全部图表类型，涵盖流程与交互、结构与模型、数据与统计、工程与项目管理、网络与系统五大类别。

---

## 一、流程与交互

### 1. 流程图 (Flowchart)

\`\`\`mermaid
graph TD
  A[开始] --> B{是否正常?}
  B -- 是 --> C[部署上线]
  B -- 否 --> D[排查问题]
  D --> B
  C --> E[庆祝]
  style A fill:#dbeafe,stroke:#1e40af,stroke-width:2px
  style E fill:#dcfce7,stroke:#166534,stroke-width:2px
\`\`\`

### 2. 时序图 (Sequence Diagram)

\`\`\`mermaid
sequenceDiagram
    autonumber
    participant C as 客户端
    participant S as 服务端
    participant D as 数据库
    C->>S: 请求数据
    S->>D: 查询
    D-->>S: 返回结果
    S-->>C: 响应数据
    Note over C,S: 完成一次请求
\`\`\`

### 3. 状态图 (State Diagram)

\`\`\`mermaid
stateDiagram-v2
    [*] --> 待处理
    待处理 --> 处理中 : 开始
    处理中 --> 已完成 : 成功
    处理中 --> 失败 : 出错
    已完成 --> [*]
\`\`\`

### 4. 用户旅程 (Journey)

\`\`\`mermaid
journey
    title 会员首单旅程
    section 发现
      看到活动: 5: 用户
      点击详情: 4: 用户
    section 评估
      查看评价: 4: 用户
      对比价格: 3: 用户
    section 下单
      填写地址: 3: 用户
      选择支付: 4: 用户
    section 交付
      收到短信: 5: 系统
      完成签收: 5: 用户
\`\`\`

---

## 二、结构与模型

### 5. 类图 (Class Diagram)

\`\`\`mermaid
classDiagram
    class Animal {
        +int age
        +String gender
        +isMammal()
        +mate()
    }
    class Duck {
        +String beakColor
        +swim()
        +quack()
    }
    class Fish {
        -int sizeInFeet
        -canEat()
    }
    class Zebra {
        +bool is_wild
        +run()
    }
    Animal <|-- Duck
    Animal <|-- Fish
    Animal <|-- Zebra
\`\`\`

### 6. 实体关系图 (ER Diagram)

\`\`\`mermaid
erDiagram
    CUSTOMER ||--o{ ORDER : places
    CUSTOMER {
        string name
        string email
    }
    ORDER {
        int id
        string address
    }
\`\`\`

### 7. C4 上下文图 (C4Context)

\`\`\`mermaid
C4Context
    title AI 内容工作台上下文
    Person(editor, "内容编辑", "撰写、协作与发布文章")
    Person(ops, "运营同学", "查看转化与增长数据")
    System(platform, "内容工作台", "选题、生成、审核、分发")
    System_Ext(llm, "LLM 服务", "负责摘要、润色与扩写")
    System_Ext(wechat, "公众号后台", "接收最终稿件")
    SystemDb_Ext(warehouse, "数据仓库", "沉淀内容与行为指标")
    Rel(editor, platform, "日常使用")
    Rel(ops, platform, "审核与复盘")
    Rel(platform, llm, "生成内容")
    Rel(platform, wechat, "发布文章")
    Rel(platform, warehouse, "同步数据")
\`\`\`

### 8. 架构图 (Architecture)

\`\`\`mermaid
architecture-beta
    group entry_group(cloud)[Entry]
    group app_group(cloud)[App]
    group data_group(cloud)[Data]
    service gateway(internet)[Gateway] in entry_group
    service web(server)[Web] in entry_group
    service api(server)[API] in app_group
    service worker(server)[Worker] in app_group
    service cache(database)[Redis] in data_group
    service db(database)[Postgres] in data_group
    service storage(disk)[Storage] in data_group
    gateway:B -- T:web
    web:R -- L:api
    api:B -- T:db
    api:R -- L:cache
    worker:B -- T:storage
\`\`\`

---

## 三、数据与统计

### 9. 饼图 (Pie)

\`\`\`mermaid
pie title 团队时间投入分布
    "需求讨论" : 24
    "设计评审" : 16
    "功能开发" : 38
    "测试修复" : 14
    "复盘总结" : 8
\`\`\`

### 10. 象限图 (Quadrant Chart)

\`\`\`mermaid
quadrantChart
    title AI 功能路线评估
    x-axis 业务价值低 --> 业务价值高
    y-axis 实施成本低 --> 实施成本高
    quadrant-1 值得押注
    quadrant-2 谨慎推进
    quadrant-3 先不投入
    quadrant-4 快速试点
    智能搜索: [0.86, 0.42]
    自动摘要: [0.74, 0.28]
    对话问数: [0.79, 0.76]
    AI 助教: [0.58, 0.64]
    语音克隆: [0.33, 0.83]
\`\`\`

### 11. XY 图表 (XY Chart)

\`\`\`mermaid
xychart-beta
    title "版本上线后的转化变化"
    x-axis [W1, W2, W3, W4, W5, W6]
    y-axis "人数" 0 --> 140
    bar [52, 66, 79, 94, 108, 118]
    line [45, 58, 72, 88, 101, 112]
\`\`\`

### 12. 桑基图 (Sankey)

\`\`\`mermaid
sankey-beta
    %% source,target,value
    A, X, 10
    A, Y, 5
    B, X, 7
    B, Y, 8
    X, Z, 12
    Y, Z, 13
\`\`\`

### 13. 树形图 (Treemap)

\`\`\`mermaid
treemap
    title 内容平台流量来源
    "总流量" : 1580
      "自然流量" : 720
        "SEO" : 320
        "社区内容" : 220
        "老客分享" : 180
      "活动流量" : 520
        "直播合作" : 240
        "社群裂变" : 160
        "线下沙龙" : 120
      "付费投放" : 340
        "搜索广告" : 190
        "信息流" : 150
\`\`\`

### 14. 韦恩图 (Venn)

\`\`\`mermaid
venn-beta
    title 跨职能协作能力
    set Product:10
    set Engineering:12
    union Product,Engineering["高效交付"]:5
\`\`\`

---

## 四、工程与项目管理

### 15. 甘特图 (Gantt)

\`\`\`mermaid
gantt
    title 新功能上线排期
    dateFormat  YYYY-MM-DD
    axisFormat  %m/%d
    section 发现
    用户访谈     :done, a1, 2026-05-01, 3d
    方案评审     :done, a2, after a1, 2d
    section 构建
    视觉设计     :active, a3, after a2, 4d
    前端开发     :crit, a4, after a3, 6d
    后端联调     :crit, a5, after a3, 5d
    section 发布
    回归测试     :a6, after a4, 3d
    Beta 发布    :milestone, a7, after a6, 0d
\`\`\`

### 16. Git 分支图 (Git Graph)

\`\`\`mermaid
gitGraph
    commit id: "init"
    branch develop
    checkout develop
    commit id: "layout"
    branch feature-auth
    checkout feature-auth
    commit id: "login-ui"
    commit id: "oauth"
    checkout develop
    merge feature-auth
    branch feature-billing
    checkout feature-billing
    commit id: "pricing"
    commit id: "checkout"
    checkout develop
    merge feature-billing
    checkout main
    merge develop
    branch hotfix-copy
    checkout hotfix-copy
    commit id: "hero-fix"
    checkout main
    merge hotfix-copy
\`\`\`

### 17. 需求图 (Requirement Diagram)

\`\`\`mermaid
requirementDiagram
    requirement secure_login {
        id: 1
        text: "用户必须能安全登录后台"
        risk: high
        verifymethod: test
    }
    requirement mfa_support {
        id: 2
        text: "高风险操作需要二次验证"
        risk: medium
        verifymethod: demonstration
    }
    requirement audit_trace {
        id: 3
        text: "关键操作必须保留审计日志"
        risk: medium
        verifymethod: inspection
    }
    element auth_service {
        type: simulation
    }
    element security_center {
        type: simulation
    }
    secure_login - satisfies -> auth_service
    mfa_support - satisfies -> auth_service
    audit_trace - satisfies -> security_center
\`\`\`

### 18. 看板 (Kanban)

\`\`\`mermaid
kanban
    id1[Todo]
        id2[设计数据库表结构]
        id3[编写 API 文档]
    id4[In Progress]
        id5[实现用户认证模块]
    id6[Done]
        id7[项目初始化]
        id8[搭建开发环境]
\`\`\`

### 19. 鱼骨图 (Ishikawa)

\`\`\`mermaid
ishikawa-beta
    网站加载慢 — 根因分析
    服务器
        CPU 占用高
        内存不足
    网络
        带宽不足
        CDN 配置不当
    前端
        图片未压缩
        JS 文件过大
    数据库
        查询慢
        缺少索引
\`\`\`

---

## 五、网络与系统

### 20. 思维导图 (Mindmap)

\`\`\`mermaid
mindmap
  root((技术选型))
    前端
      React
        Next.js
        Remix
      Vue
        Nuxt
      Svelte
    后端
      Node.js
        Express
        NestJS
      Python
        Django
        FastAPI
      Go
    数据库
      关系型
        PostgreSQL
        MySQL
      NoSQL
        MongoDB
        Redis
\`\`\`

### 21. 时间线 (Timeline)

\`\`\`mermaid
timeline
    title 产品关键里程碑
    2023 Q2 : 启动项目
            : 完成首版 MVP
    2023 Q4 : 首批种子用户
            : 建立内容工作流
    2024 Q2 : 推出团队版
            : 接入 AI 生成功能
    2024 Q4 : 开放 API
            : 月活突破 10 万
\`\`\`

### 22. 块图 (Block Diagram)

\`\`\`mermaid
flowchart LR
    a["输入"] --> b["处理"] --> c["输出"]
\`\`\`

### 23. 数据包图 (Packet Diagram)

\`\`\`mermaid
packet-beta
    title TCP 报文头
    0-15: "Source Port"
    16-31: "Destination Port"
    32-63: "Sequence Number"
    64-95: "Acknowledgment Number"
    96-99: "Data Offset"
    100-105: "Reserved"
    106: "URG"
    107: "ACK"
    108: "PSH"
    109: "RST"
    110: "SYN"
    111: "FIN"
    112-127: "Window Size"
    128-143: "Checksum"
    144-159: "Urgent Pointer"
    160-319: "Options (optional)"
\`\`\`
`;
