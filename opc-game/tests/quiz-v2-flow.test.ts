import assert from 'node:assert/strict'
import test from 'node:test'
import quizData from '../content/quiz-v2.json'
import {
  chooseOption,
  formatCurrency,
  goBack,
  interpolateQuizText,
  optionMonthlyAverageInvestmentCny,
  optionMonthlyPrice,
  restartGame,
  summarizeFinancials,
  validateQuizDefinition,
  type QuizDefinition,
  type QuizOption,
  type QuizState,
} from '../packages/game-core/src/index.ts'

const quiz = quizData as unknown as QuizDefinition

const canonicalOptions: Record<string, string> = {
  Q01: 'launch',
  Q02: 'login',
  Q03: 'profit',
  Q04: 'found-company',
  Q05: 'register',
  Q06: 'hosted',
  Q07: 'open-bank-account',
  Q08: 'wechat-pay',
  Q09: 'agency-bookkeeping',
  Q10: 'glm-pro',
  Q11: 'no-runtime-ai',
  Q12: 'buy-domain-stack',
  Q13: 'sms-login',
  Q14: 'two-core-four-gb',
  Q15: 'system-disk-only',
  Q16: 'three-megabit',
  Q17: 'submit-miit-filing',
  Q18: 'submit-police-filing',
  Q19: 'self-operated',
  Q20: 'no-public-expression',
  Q21: 'level-two',
  Q22: 'clear-enough',
  Q23: 'users-100',
  Q24: 'price-9-9',
  Q25: 'organic',
}

function answer(state: QuizState, optionId: string): QuizState {
  return chooseOption(quiz, state, optionId)
}

function reach(questionId: string, overrides: Partial<Record<string, string>> = {}): QuizState {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing' && state.currentQuestionId !== questionId) {
    const optionId = overrides[state.currentQuestionId ?? ''] ?? canonicalOptions[state.currentQuestionId ?? '']
    assert.ok(optionId, `缺少 ${state.currentQuestionId} 的到达路线`)
    state = answer(state, optionId)
    guard += 1
    assert.ok(guard <= 25, '路线不应循环')
  }
  assert.equal(state.currentQuestionId, questionId)
  return state
}

function scoreEffects(option: QuizOption): Array<[string, number]> {
  return option.effects
    .flatMap((effect) =>
      effect.type === 'metric' && effect.key.startsWith('score.') && typeof effect.value === 'number'
        ? [[effect.key, effect.value] as [string, number]]
        : [],
    )
}

type OptionDuration = {
  hours: number
  blockingWaitDays: number
  nonBlockingWaitDays: number
}

function optionDuration(questionId: string, optionId: string): OptionDuration {
  const question = quiz.questions.find((candidate) => candidate.id === questionId)
  const option = question?.options.find((candidate) => candidate.id === optionId)
  assert.ok(option, `缺少 ${questionId}/${optionId}`)
  return option.effects.reduce<OptionDuration>((duration, effect) => {
    if (effect.type === 'effort' && effect.bucket === 'founderHours') {
      duration.hours += effect.hours
    }
    if (effect.type === 'wait') {
      if (effect.blocking) duration.blockingWaitDays += effect.days
      else duration.nonBlockingWaitDays += effect.days
    }
    return duration
  }, { hours: 0, blockingWaitDays: 0, nonBlockingWaitDays: 0 })
}

test('用户确认的各题工时、等待天数和粗算文案落到共享题库', () => {
  const expected: Record<string, Record<string, OptionDuration>> = {
    Q01: { launch: { hours: 3, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q02: { login: { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q04: { 'found-company': { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q05: { register: { hours: 0, blockingWaitDays: 2, nonBlockingWaitDays: 0 } },
    Q06: {
      desk: { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      hosted: { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q07: { 'open-bank-account': { hours: 6, blockingWaitDays: 7, nonBlockingWaitDays: 0 } },
    Q08: {
      'wechat-pay': { hours: 36, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      alipay: { hours: 24, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      both: { hours: 36, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q09: {
      'agency-bookkeeping': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'self-bookkeeping': { hours: 180, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q10: { 'gpt-ultra': { hours: 18, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q11: { 'runtime-ai': { hours: 18, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q12: { 'buy-domain-stack': { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q13: {
      'sms-login': { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'remove-login-and-commerce': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q14: {
      'one-core-two-gb': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'two-core-four-gb': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q15: {
      'system-and-data-disk': { hours: 6, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'system-disk-only': { hours: 3, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q16: { 'three-megabit': { hours: 3, blockingWaitDays: 0, nonBlockingWaitDays: 0 } },
    Q17: { 'submit-miit-filing': { hours: 0, blockingWaitDays: 7, nonBlockingWaitDays: 0 } },
    Q18: { 'submit-police-filing': { hours: 0, blockingWaitDays: 7, nonBlockingWaitDays: 0 } },
    Q19: {
      'self-operated': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'self-published': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'all-in-capital': { hours: 12, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q20: {
      'self-assessment': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'third-party-assessment': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q21: {
      'level-two': { hours: 84, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'level-three': { hours: 126, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q22: {
      'clear-enough': { hours: 18, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'big-company-risk': { hours: 18, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'not-thought-through': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
    Q24: {
      'price-9-9': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'price-19-9': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
      'price-29-9': { hours: 42, blockingWaitDays: 0, nonBlockingWaitDays: 0 },
    },
  }

  for (const [questionId, options] of Object.entries(expected)) {
    for (const [optionId, duration] of Object.entries(options)) {
      assert.deepEqual(optionDuration(questionId, optionId), duration, `${questionId}/${optionId}`)
    }
  }

  assert.equal(optionDuration('Q09', 'agency-bookkeeping').hours, 12)
  assert.equal(
    quiz.questions.find((question) => question.id === 'Q09')?.options
      .find((option) => option.id === 'agency-bookkeeping')?.effects
      .filter((effect) => effect.type === 'effort' && effect.bucket === 'recurringMonthlyHours')
      .reduce((sum, effect) => sum + (effect.type === 'effort' ? effect.hours : 0), 0),
    1,
  )
  assert.equal(quiz.questions.find((question) => question.id === 'Q03')?.options
    .find((option) => option.id === 'profit')?.effects.some((effect) => effect.type === 'money'), false)
  assert.equal(quiz.questions.find((question) => question.id === 'Q24')?.options
    .every((option) => !option.label.includes('（粗算）')), true)
})

test('v2 定义恰好 25 题、25 场景，所有非退出边只前进且无悬空目标', () => {
  assert.deepEqual(validateQuizDefinition(quiz), [])
  assert.equal(quiz.questions.length, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.id)).size, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.visual.sceneId)).size, 25)

  const numbers = new Map(quiz.questions.map((question) => [question.id, question.number]))
  for (const question of quiz.questions) {
    const continuing = question.options.filter((option) => option.outcome !== 'exit')
    assert.ok(continuing.length > 0, `${question.id} 至少需要一个非退出选项`)
    for (const option of continuing) {
      if (option.outcome === 'result') {
        assert.equal(question.id, 'Q25')
        continue
      }
      const targetId = option.nextQuestionId ?? question.defaultNextQuestionId
      if (targetId) assert.ok((numbers.get(targetId) ?? 0) > question.number, `${question.id}/${option.id} 必须向前跳转`)
      else assert.equal(question.id, 'Q25')
    }
  }
})

test('Q3 为爱发电跳过 Q4～Q9，Q13 只在登录路线出现', () => {
  let love = restartGame(quiz)
  love = answer(love, 'launch')
  love = answer(love, 'guest')
  love = answer(love, 'love')
  assert.equal(love.currentQuestionId, 'Q10')
  assert.deepEqual(love.history.map((entry) => entry.questionId), ['Q01', 'Q02', 'Q03'])

  let login = restartGame(quiz)
  for (const optionId of ['launch', 'login', 'profit', 'found-company', 'register', 'hosted', 'open-bank-account', 'alipay', 'agency-bookkeeping', 'glm-pro', 'no-runtime-ai', 'buy-domain-stack']) {
    login = answer(login, optionId)
  }
  assert.equal(login.currentQuestionId, 'Q13')

  let guest = restartGame(quiz)
  for (const optionId of ['launch', 'guest', 'profit', 'found-company', 'register', 'hosted', 'open-bank-account', 'alipay', 'agency-bookkeeping', 'glm-pro', 'no-runtime-ai', 'buy-domain-stack']) {
    guest = answer(guest, optionId)
  }
  assert.equal(guest.currentQuestionId, 'Q14')
})

test('Q19、Q20、Q21 对所有非退出选择都严格顺承', () => {
  const q19 = quiz.questions.find((question) => question.id === 'Q19')
  const q20 = quiz.questions.find((question) => question.id === 'Q20')
  const q21 = quiz.questions.find((question) => question.id === 'Q21')
  assert.ok(q19 && q20 && q21)

  for (const option of q19.options.filter((candidate) => candidate.outcome !== 'exit')) {
    assert.equal(answer(reach('Q19'), option.id).currentQuestionId, 'Q20')
  }
  for (const option of q20.options.filter((candidate) => candidate.outcome !== 'exit')) {
    assert.equal(answer(reach('Q20'), option.id).currentQuestionId, 'Q21')
  }
  for (const option of q21.options.filter((candidate) => candidate.outcome !== 'exit')) {
    assert.equal(answer(reach('Q21'), option.id).currentQuestionId, 'Q22')
  }
})

test('100 万门槛独立记账并纳入首年总投入，第三方评估与等保仍计入首年固定成本', () => {
  const before = reach('Q19')
  const paidBefore = before.ledger.costs.paidSunk.totalCny
  const committedBefore = before.ledger.costs.firstYearCommitted.totalCny
  const capital = answer(before, 'all-in-capital')
  assert.equal(capital.ledger.costs.capitalRequirement.totalCny, 1_000_000)
  assert.equal(capital.ledger.costs.paidSunk.totalCny, paidBefore)
  assert.equal(capital.ledger.costs.firstYearCommitted.totalCny, committedBefore)
  assert.equal(summarizeFinancials(capital.ledger).firstYearInvestmentCny, 1_000_000 + paidBefore + committedBefore)

  const quoted = answer(capital, 'third-party-assessment')
  assert.equal(quoted.ledger.costs.firstYearCommitted.totalCny, committedBefore + 12_000)
  assert.equal(quoted.ledger.costs.paidSunk.totalCny, paidBefore)

  const mlps = answer(quoted, 'level-three')
  assert.equal(mlps.ledger.costs.firstYearCommitted.totalCny, committedBefore + 112_000)
  assert.equal(mlps.ledger.costs.paidSunk.totalCny, paidBefore)
})

test('Q13 放弃登录商业化会撤销微信首年与续费，返回重选可完整恢复', () => {
  const atQ13 = reach('Q13', { Q08: 'wechat-pay' })
  assert.equal(atQ13.ledger.costs.firstYearCommitted.items.some((item) => item.id === 'q08-wechat-cert'), true)
  assert.equal(atQ13.ledger.costs.renewal.items.some((item) => item.id === 'q08-wechat-cert-renewal'), true)

  const removed = answer(atQ13, 'remove-login-and-commerce')
  assert.equal(removed.ledger.costs.firstYearCommitted.items.some((item) => item.id === 'q08-wechat-cert'), false)
  assert.equal(removed.ledger.costs.renewal.items.some((item) => item.id === 'q08-wechat-cert-renewal'), false)
  assert.equal(removed.ledger.costs.variable.items.some((item) => item.id === 'q08-payment-fee'), false)
  assert.equal(removed.facts.requiresLogin, false)
  assert.equal(removed.facts.commercial, false)
  assert.equal(removed.facts.hasInteractiveFeatures, false)
  assert.equal(removed.facts.paymentChannels, 'none')

  const restored = goBack(quiz, removed)
  assert.equal(restored.currentQuestionId, 'Q13')
  assert.equal(restored.ledger.costs.firstYearCommitted.items.some((item) => item.id === 'q08-wechat-cert'), true)
  assert.equal(restored.ledger.costs.renewal.items.some((item) => item.id === 'q08-wechat-cert-renewal'), true)
  assert.equal(restored.ledger.costs.variable.items.some((item) => item.id === 'q08-payment-fee'), true)
})

test('工信与公安备案各让 HUD 累计天数增加 7 天，并保留并行关键路径', () => {
  const beforeMiitFiling = reach('Q17')
  const afterMiitFiling = answer(beforeMiitFiling, 'submit-miit-filing')
  const afterPoliceFiling = answer(afterMiitFiling, 'submit-police-filing')

  assert.equal(afterMiitFiling.ledger.time.elapsedDays, beforeMiitFiling.ledger.time.elapsedDays + 7)
  assert.equal(afterPoliceFiling.ledger.time.elapsedDays, afterMiitFiling.ledger.time.elapsedDays + 7)
  assert.equal(afterPoliceFiling.ledger.time.tracks.filing.blockingWaitDays, 14)
  assert.equal(afterPoliceFiling.ledger.time.tracks.filing.nonBlockingWaitDays, 0)
  assert.ok(afterPoliceFiling.ledger.time.criticalPathDays >= 14)
})

test('GPT 200 美元/月按冻结日官方中间价直接折算成人民币年费', () => {
  const before = reach('Q10')
  const firstYearBefore = before.ledger.costs.firstYearCommitted.totalCny
  const converted = answer(before, 'gpt-ultra')
  const firstYear = converted.ledger.costs.firstYearCommitted.items.find((item) => item.id === 'q10-gpt-first-year')
  const renewal = converted.ledger.costs.renewal.items.find((item) => item.id === 'q10-gpt-renewal')

  assert.equal(firstYear?.currency, 'CNY')
  assert.equal(firstYear?.amount, 16_298.16)
  assert.equal(renewal?.currency, 'CNY')
  assert.equal(renewal?.amount, 16_298.16)
  assert.equal(converted.ledger.costs.firstYearCommitted.totalCny, firstYearBefore + 16_298.16)
  assert.ok(quiz.questions.find((question) => question.id === 'Q10')?.factNotes.some((note) => note.includes('1 美元 = ¥6.7909')))
})

test('更贵、更大不额外加分：模型、地址、服务器、用户规模同题分值一致', () => {
  for (const questionId of ['Q06', 'Q10', 'Q14', 'Q23']) {
    const question = quiz.questions.find((candidate) => candidate.id === questionId)
    assert.ok(question)
    const vectors = question.options
      .filter((option) => option.outcome !== 'exit')
      .map(scoreEffects)
    for (const vector of vectors.slice(1)) assert.deepEqual(vector, vectors[0], `${questionId} 不应按价格或规模加分`)
  }
})

test('Q24 使用上一关用户数和首年总投入，并逐项展示预计每月毛利', () => {
  let state = reach('Q23')
  state = answer(state, 'users-1000')
  assert.equal(state.currentQuestionId, 'Q24')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q24')
  assert.ok(question)

  const prompt = interpolateQuizText(question.prompt, state.ledger, state.metrics)
  assert.match(prompt, /上一关选择的 1,000 个用户/)
  assert.match(prompt, /首年总投入是 ¥[\d,.]+/)

  const monthlyInvestment = (
    state.ledger.costs.paidSunk.totalCny
    + state.ledger.costs.firstYearCommitted.totalCny
  ) / 12
  for (const option of question.options.filter((candidate) => candidate.outcome !== 'exit')) {
    const monthlyPrice = optionMonthlyPrice(option)
    assert.notEqual(monthlyPrice, null)
    const label = interpolateQuizText(option.label, state.ledger, state.metrics, monthlyPrice ?? undefined)
    assert.match(label, /预计每月毛利/)
    assert.ok(label.includes(formatCurrency((1_000 * (monthlyPrice ?? 0)) - monthlyInvestment)))
  }
})

test('Q08 的 300 元年费按 12 个月进入月均投入，并在选项中动态说明', () => {
  const state = reach('Q08')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q08')
  assert.ok(question)
  const before = summarizeFinancials(state.ledger, state.metrics)

  for (const optionId of ['wechat-pay', 'both']) {
    const selectedOption: QuizOption | undefined = question.options.find(
      (candidate) => candidate.id === optionId,
    )
    assert.ok(selectedOption)
    const optionMonthlyAverage = optionMonthlyAverageInvestmentCny(selectedOption)
    assert.equal(optionMonthlyAverage, 25)
    assert.match(
      interpolateQuizText(
        selectedOption.label,
        state.ledger,
        state.metrics,
        undefined,
        optionMonthlyAverage ?? undefined,
      ),
      /折合¥25\.0\/月/,
    )

    const after = answer(state, selectedOption.id)
    const afterFinancials = summarizeFinancials(after.ledger, after.metrics)
    assert.equal(afterFinancials.firstYearInvestmentCny - before.firstYearInvestmentCny, 300)
    assert.equal(afterFinancials.monthlyAverageInvestmentCny - before.monthlyAverageInvestmentCny, 25)
  }

  const alipay = question.options.find((candidate) => candidate.id === 'alipay')
  assert.ok(alipay)
  const afterAlipay = summarizeFinancials(answer(state, alipay.id).ledger, state.metrics)
  assert.equal(afterAlipay.firstYearInvestmentCny, before.firstYearInvestmentCny)
  assert.equal(afterAlipay.monthlyAverageInvestmentCny, before.monthlyAverageInvestmentCny)
})

test('运行时题库不再保留旧式动态金额占位符', () => {
  const serialized = JSON.stringify(quiz)
  for (const legacyToken of ['x（前面累加金额）', 'x元（前面计算）', 'xx元']) {
    assert.doesNotMatch(serialized, new RegExp(legacyToken))
  }
})

test('完整可行路线到达 Q25 结果页并得到 100 分上限内结果', () => {
  let state = restartGame(quiz)
  while (state.phase === 'playing') {
    const optionId = canonicalOptions[state.currentQuestionId ?? '']
    assert.ok(optionId)
    state = answer(state, optionId)
  }
  assert.equal(state.phase, 'completed')
  assert.equal(state.result?.answeredCount, 25)
  assert.equal(state.result?.score.total, 100)
  assert.ok((state.result?.badges.length ?? 0) <= 3)
  assert.equal(state.result?.badges.some((badge) => badge.id === 'one-person-company'), false)
  assert.equal(state.result?.conclusion, '')
})
