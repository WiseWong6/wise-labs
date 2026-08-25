import assert from 'node:assert/strict'
import test from 'node:test'
import {
  buildResult,
  chooseOption,
  formatLedger,
  goBack,
  interpolateQuizText,
  optionMonthlyAverageInvestmentCny,
  restartGame,
  validateQuizDefinition,
  type Effect,
  type QuizDefinition,
  type QuizOption,
  type QuizQuestion,
  type QuizState,
  type ScoreVector,
  type VisualFrames,
} from '../packages/game-core/src/index.ts'

const frames: VisualFrames = ['idle', 'action', 'resolved', 'quit']

function option(id: string, overrides: Partial<QuizOption> = {}): QuizOption {
  return { id, label: id, effects: [], ...overrides }
}

function question(number: number, options: QuizOption[], overrides: Partial<QuizQuestion> = {}): QuizQuestion {
  return {
    id: `q${String(number).padStart(2, '0')}`,
    number,
    chapterId: 'test',
    prompt: `Question ${number}`,
    factNotes: [],
    visual: {
      sceneId: `scene-${number}`,
      desktopAsset: `/desktop-${number}.webp`,
      mobileAsset: `/mobile-${number}.webp`,
      frames,
    },
    scoreWeight: {},
    options,
    ...overrides,
  }
}

function definition(questions: QuizQuestion[], overrides: Partial<QuizDefinition> = {}): QuizDefinition {
  return {
    definition: {
      id: 'test-quiz',
      version: '2.0.0',
      title: 'Test quiz',
      startQuestionId: questions[0]?.id ?? 'q01',
      effectiveHoursPerDay: 6,
      scoreCaps: { execution: 30, compliance: 25, business: 30, costHealth: 15 },
      chapters: [{ id: 'test', title: 'Test' }],
      interludes: [],
    },
    questions,
    ...overrides,
  }
}

const sixCostEffects: Effect[] = [
  { type: 'money', bucket: 'paidSunk', amount: 100, label: 'already paid' },
  { type: 'money', bucket: 'firstYearCommitted', amount: 200, label: 'year one' },
  { type: 'money', bucket: 'renewal', amount: 300, label: 'renewal' },
  { type: 'money', bucket: 'variable', amount: null, label: 'token usage' },
  { type: 'money', bucket: 'pendingQuote', amount: 12000, label: 'security quote' },
  { type: 'money', bucket: 'capitalRequirement', amount: 1_000_000, label: 'capital threshold' },
]

test('六类费用、工时、等待和待办各自记账，不把报价或资本门槛算进已支付', () => {
  const quiz = definition([
    question(1, [
      option('continue', {
        effects: [
          ...sixCostEffects,
          { type: 'effort', bucket: 'founderHours', hours: 12, track: 'development', label: 'build' },
          { type: 'effort', bucket: 'recurringMonthlyHours', hours: 8, track: 'marketing', label: 'content' },
          { type: 'wait', track: 'company', days: 3, blocking: true, label: 'review' },
          { type: 'wait', track: 'development', days: 5, blocking: false, label: 'parallel review' },
          { type: 'todo', id: 'contract', label: 'Check contract', timing: 'before-launch' },
        ],
      }),
    ]),
    question(2, [option('finish', { outcome: 'result' })]),
  ])
  const state = chooseOption(quiz, restartGame(quiz), 'continue')

  assert.equal(state.ledger.costs.paidSunk.totalCny, 100)
  assert.equal(state.ledger.costs.firstYearCommitted.totalCny, 200)
  assert.equal(state.ledger.costs.renewal.totalCny, 300)
  assert.equal(state.ledger.costs.variable.totalCny, 0)
  assert.equal(state.ledger.costs.variable.hasUnknownAmount, true)
  assert.equal(state.ledger.costs.pendingQuote.totalCny, 12000)
  assert.equal(state.ledger.costs.capitalRequirement.totalCny, 1_000_000)
  assert.equal(state.ledger.time.founderHours, 12)
  assert.equal(state.ledger.time.recurringMonthlyHours, 8)
  assert.equal(state.ledger.time.elapsedDays, 10)
  assert.equal(state.ledger.time.criticalPathDays, 5)
  assert.equal(formatLedger(state.ledger).elapsedTime, '10 天')
  assert.equal(state.ledger.todos[0]?.id, 'contract')
})

test('外币订阅保留原币展示，未定价项目仍单独标记待确认', () => {
  const quiz = definition([
    question(1, [
      option('subscribe', {
        effects: [
          { type: 'money', bucket: 'firstYearCommitted', amount: 2400, currency: 'USD', label: 'foreign plan' },
          { type: 'money', bucket: 'firstYearCommitted', amount: 300, currency: 'CNY', label: 'local plan' },
          { type: 'money', bucket: 'variable', amount: null, currency: 'CNY', label: 'usage' },
        ],
      }),
    ]),
    question(2, [option('finish', { outcome: 'result' })]),
  ])
  const state = chooseOption(quiz, restartGame(quiz), 'subscribe')
  const formatted = formatLedger(state.ledger)

  assert.match(formatted.firstYearCommitted, /¥300\.0/)
  assert.match(formatted.firstYearCommitted, /US\$2,400\.0/)
  assert.doesNotMatch(formatted.firstYearCommitted, /待确认/)
  assert.match(formatted.variable, /待确认/)
})

test('goBack 从空白状态重放剩余历史，撤销费用、事实和待办', () => {
  const quiz = definition([
    question(1, [
      option('pay', {
        effects: [
          { type: 'set-fact', key: 'commercial', value: true },
          { type: 'money', bucket: 'paidSunk', amount: 500, label: 'registration' },
          { type: 'todo', id: 'tax', label: 'File tax' },
        ],
      }),
    ]),
    question(2, [option('finish', { outcome: 'result' })]),
  ])
  const afterPayment = chooseOption(quiz, restartGame(quiz), 'pay')
  const rewound = goBack(quiz, afterPayment)

  assert.equal(rewound.currentQuestionId, 'q01')
  assert.deepEqual(rewound.history, [])
  assert.deepEqual(rewound.facts, {})
  assert.equal(rewound.ledger.costs.paidSunk.totalCny, 0)
  assert.deepEqual(rewound.ledger.todos, [])
  assert.equal(afterPayment.ledger.costs.paidSunk.totalCny, 500, '输入状态没有被修改')
})

test('remove-money 精确撤销此前微信认证费，回退后又能从历史恢复', () => {
  const quiz = definition([
    question(1, [
      option('payments', {
        effects: [
          {
            type: 'money',
            id: 'wechat-certification',
            bucket: 'firstYearCommitted',
            amount: 300,
            label: '微信支付认证预算',
          },
          {
            type: 'money',
            id: 'alipay-certification',
            bucket: 'firstYearCommitted',
            amount: 0,
            label: '支付宝认证费',
          },
        ],
      }),
    ]),
    question(2, [
      option('drop-commercial-login', {
        effects: [
          {
            type: 'remove-money',
            bucket: 'firstYearCommitted',
            sourceQuestionId: 'q01',
            labelContains: '微信',
          },
        ],
      }),
    ]),
    question(3, [option('finish', { outcome: 'result' })]),
  ])
  let state = chooseOption(quiz, restartGame(quiz), 'payments')
  assert.equal(state.ledger.costs.firstYearCommitted.totalCny, 300)
  state = chooseOption(quiz, state, 'drop-commercial-login')
  assert.equal(state.ledger.costs.firstYearCommitted.totalCny, 0)
  assert.deepEqual(state.ledger.costs.firstYearCommitted.items.map((item) => item.id), ['alipay-certification'])

  state = goBack(quiz, state)
  assert.equal(state.ledger.costs.firstYearCommitted.totalCny, 300)
  assert.deepEqual(
    state.ledger.costs.firstYearCommitted.items.map((item) => item.id),
    ['wechat-certification', 'alipay-certification'],
  )
})

test('appliesWhen 跳过不适用题，并从该路线分母移除', () => {
  const quiz = definition([
    question(
      1,
      [
        option('free', {
          effects: [
            { type: 'set-fact', key: 'commercial', value: false },
            { type: 'metric', key: 'score.execution', value: 1 },
          ],
        }),
      ],
      { scoreWeight: { execution: 1 } },
    ),
    question(2, [option('commercial-only')], {
      appliesWhen: { fact: 'commercial', equals: true },
      scoreWeight: { execution: 50 },
    }),
    question(3, [
      option('finish', {
        outcome: 'result',
        effects: [
          { type: 'metric', key: 'score.compliance', value: 1 },
          { type: 'metric', key: 'score.business', value: 1 },
          { type: 'metric', key: 'score.costHealth', value: 1 },
        ],
      }),
    ], {
      scoreWeight: { compliance: 1, business: 1, costHealth: 1 },
    }),
  ])
  let state = chooseOption(quiz, restartGame(quiz), 'free')
  assert.equal(state.currentQuestionId, 'q03')
  state = chooseOption(quiz, state, 'finish')
  assert.equal(state.result?.score.total, 100)
  assert.equal(state.result?.score.dimensions.execution.availableWeight, 1)
})

test('显式跳转绕过的题即使没有 appliesWhen，也从完成路线分母移除', () => {
  const quiz = definition([
    question(1, [
      option('jump', {
        nextQuestionId: 'q03',
        effects: [{ type: 'metric', key: 'score.execution', value: 1 }],
      }),
    ], {
      scoreWeight: { execution: 1 },
    }),
    question(2, [option('expensive-detour')], { scoreWeight: { execution: 100 } }),
    question(3, [
      option('finish', {
        outcome: 'result',
        effects: [
          { type: 'metric', key: 'score.compliance', value: 1 },
          { type: 'metric', key: 'score.business', value: 1 },
          { type: 'metric', key: 'score.costHealth', value: 1 },
        ],
      }),
    ], {
      scoreWeight: { compliance: 1, business: 1, costHealth: 1 },
    }),
  ])
  let state = chooseOption(quiz, restartGame(quiz), 'jump')
  state = chooseOption(quiz, state, 'finish')
  assert.equal(state.result?.score.total, 100)
  assert.equal(state.result?.score.dimensions.execution.availableWeight, 1)
})

test('提前退出时未知条件仍留在分母，不能利用条件归一化刷高分', () => {
  const quiz = definition([
    question(1, [option('continue'), option('quit', { outcome: 'exit' })]),
    question(2, [option('finish', { outcome: 'result' })], {
      appliesWhen: { fact: 'commercial', equals: true },
      scoreWeight: { business: 10 },
    }),
  ])
  const state = chooseOption(quiz, restartGame(quiz), 'quit')
  assert.equal(state.result?.score.dimensions.business.availableWeight, 10)
  assert.equal(state.result?.score.total, 0)
})

test('中途退出优先退出称号，完成路线按七段总分称号', () => {
  const exitQuiz = definition([
    question(1, [
      option('cheap-exit', {
        outcome: 'exit',
        effects: [{ type: 'money', bucket: 'paidSunk', amount: 500, label: 'deposit' }],
      }),
    ]),
  ])
  const exitResult = chooseOption(exitQuiz, restartGame(exitQuiz), 'cheap-exit').result
  assert.equal(exitResult?.title, '及时刹车工程师')
  assert.equal(exitResult?.conclusion, '')

  const scoringQuiz = definition([
    question(1, [option('finish', { outcome: 'result' })], {
      scoreWeight: { execution: 30, compliance: 25, business: 30, costHealth: 15 },
    }),
  ])
  const cases: Array<[number, string]> = [
    [0, '还在脑内公测'],
    [20, 'Vibe Coding 练习生'],
    [40, '上线求生者'],
    [60, 'MVP 小老板'],
    [70, '最小可行总裁'],
    [80, '一人公司耐力王'],
    [90, '真·一人公司经营者'],
  ]
  for (const [total, expectedTitle] of cases) {
    const state = restartGame(scoringQuiz)
    const awarded: ScoreVector = {
      execution: Math.min(total, 30),
      compliance: Math.min(Math.max(total - 30, 0), 25),
      business: Math.min(Math.max(total - 55, 0), 30),
      costHealth: Math.min(Math.max(total - 85, 0), 15),
    }
    const completed: QuizState = {
      ...state,
      phase: 'completed',
      currentQuestionId: null,
      history: [{ questionId: 'q01', optionId: 'finish' }],
      awardedScore: awarded,
    }
    assert.equal(buildResult(scoringQuiz, completed).title, expectedTitle, `score ${total}`)
  }
})

test('结果页徽章按优先级最多展示三个', () => {
  const quiz = definition(
    [
      question(1, [
        option('finish', {
          outcome: 'result',
          effects: [{ type: 'set-fact', key: 'allBadges', value: true }],
        }),
      ]),
    ],
    {
      resultRules: {
        badges: [1, 2, 3, 4].map((priority) => ({
          id: `badge-${priority}`,
          label: `Badge ${priority}`,
          priority,
          when: { fact: 'allBadges', equals: true },
        })),
      },
    },
  )
  const result = chooseOption(quiz, restartGame(quiz), 'finish').result
  assert.deepEqual(result?.badges.map((badge) => badge.id), ['badge-4', 'badge-3', 'badge-2'])
})

test('动态累计金额的四种原文占位写法在 Web 与小程序共享核心中统一替换', () => {
  const quiz = definition([
    question(1, [option('finish', {
      outcome: 'result',
      effects: [
        { type: 'money', bucket: 'paidSunk', amount: 300, label: '已付' },
        { type: 'money', bucket: 'firstYearCommitted', amount: 500, label: '首年' },
      ],
    })]),
  ])
  const completed = chooseOption(quiz, restartGame(quiz), 'finish')
  const text = interpolateQuizText(
    '{{spent}} / x（前面累加金额） / x元（前面计算） / xx元',
    completed.result?.ledger ?? completed.ledger,
  )
  assert.equal((text.match(/¥800\.0/g) ?? []).length, 4)
})

test('选项首年固定投入可动态折算为月均投入并插入题面', () => {
  const paymentOption = option('wechat-pay', {
    effects: [
      {
        type: 'money',
        bucket: 'firstYearCommitted',
        amount: 300,
        currency: 'CNY',
        label: '微信支付相关认证预算',
      },
      {
        type: 'money',
        bucket: 'renewal',
        amount: 300,
        currency: 'CNY',
        label: '微信支付相关认证续费预算',
      },
      {
        type: 'money',
        bucket: 'variable',
        amount: null,
        currency: 'CNY',
        label: '支付手续费',
      },
    ],
  })
  const monthlyAverage = optionMonthlyAverageInvestmentCny(paymentOption)
  assert.equal(monthlyAverage, 25)
  assert.equal(
    interpolateQuizText(
      '折合{{optionMonthlyAverageInvestment}}/月',
      restartGame(definition([question(1, [paymentOption])])).ledger,
      {},
      undefined,
      monthlyAverage ?? undefined,
    ),
    '折合¥25.0/月',
  )
})

test('题库校验会拒绝重复题号、重复场景和悬空跳转', () => {
  const quiz = definition([
    question(1, [option('broken', { nextQuestionId: 'missing' })]),
    question(1, [option('finish', { outcome: 'result' })], {
      id: 'q02',
      visual: {
        sceneId: 'scene-1',
        desktopAsset: '/desktop-2.webp',
        mobileAsset: '/mobile-2.webp',
        frames,
      },
    }),
  ])
  const errors = validateQuizDefinition(quiz)
  assert.ok(errors.some((error) => error.includes('Duplicate question number')))
  assert.ok(errors.some((error) => error.includes('Duplicate scene id')))
  assert.ok(errors.some((error) => error.includes('Unknown nextQuestionId')))
})

test('题库校验约束 optionId 视觉映射、双端单帧成对与可见文字', () => {
  const quiz = definition([
    question(1, [option('continue')], {
      visual: {
        sceneId: 'scene-1',
        desktopAsset: '/desktop-1.webp',
        mobileAsset: '/mobile-1.webp',
        frames,
        optionVariants: {
          missing: { overlay: { title: '不存在的选项' } },
          continue: {
            action: {
              desktopAsset: '/continue-desktop.webp',
              mobileAsset: '',
            },
          },
          empty: { overlay: { title: '   ' } },
        },
      },
    }),
  ])
  const errors = validateQuizDefinition(quiz)
  assert.ok(errors.some((error) => error.includes('Unknown option visual variant missing')))
  assert.ok(errors.some((error) => error.includes('must declare both desktop and mobile assets')))
  assert.ok(errors.some((error) => error.includes('Unknown option visual variant empty')))
  assert.ok(errors.some((error) => error.includes('must have a title')))
})
