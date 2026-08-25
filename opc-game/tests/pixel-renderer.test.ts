import assert from 'node:assert/strict'
import test from 'node:test'
import quizData from '../content/quiz-v2.json'
import {
  chooseOption,
  formatCurrency,
  restartGame,
  type QuizDefinition,
} from '../packages/game-core/src/index.ts'
import {
  changedHudKinds,
  renderPixelCostCheckpoint,
  renderPixelIntro,
  renderPixelQuestion,
  renderPixelResult,
} from '../web/src/pixel/pixel-renderer.ts'
import { pixelChoiceThemes } from '../web/src/pixel/pixel-choice-themes.ts'

const quiz = quizData as unknown as QuizDefinition

test('备案等待即使未改变并行关键路径，也会刷新 HUD 累计天数', () => {
  let state = restartGame(quiz)
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q17') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
  }

  const beforeMiit = state
  const afterMiit = chooseOption(quiz, beforeMiit, 'submit-miit-filing')
  assert.equal(afterMiit.ledger.time.criticalPathDays, beforeMiit.ledger.time.criticalPathDays)
  assert.deepEqual([...changedHudKinds(beforeMiit, afterMiit)], ['days'])

  const question = quiz.questions.find((candidate) => candidate.id === 'Q17')
  const option = question?.options.find((candidate) => candidate.id === 'submit-miit-filing')
  assert.ok(question)
  assert.ok(option)
  const markup = renderPixelQuestion(beforeMiit, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: afterMiit,
  })
  assert.match(markup, /pixel-hud__cell--days pixel-hud__cell--changed/)
  assert.match(markup, new RegExp(`${afterMiit.ledger.time.elapsedDays}\\s*天`))
})

test('像素版首页顶部只保留月均投入、首年投入、天数三格与开始入口', () => {
  const state = restartGame(quiz)
  const markup = renderPixelIntro(state)
  assert.match(markup, /data-pixel-hud/)
  assert.equal((markup.match(/data-pixel-hud-cell=/g) ?? []).length, 3)
  assert.match(markup, /月均投入/)
  assert.match(markup, /首年投入/)
  assert.match(markup, /累计天数/)
  assert.doesNotMatch(markup, />已付</)
  assert.doesNotMatch(markup, />首年</)
  assert.doesNotMatch(markup, />工时</)
  assert.match(markup, /data-pixel-scene="intro"/)
  assert.match(markup, /stage-00\.webp/)
  assert.doesNotMatch(markup, /零数据模式/)
  assert.doesNotMatch(markup, /25 个场景/)
  assert.match(markup, /data-action="start"/)
})

test('题目页按数组渲染 1～4 选项并绑定当前题唯一双端资产', () => {
  const state = restartGame(quiz)
  const question = quiz.questions[0]
  const markup = renderPixelQuestion(state, quiz, null)
  assert.match(markup, new RegExp(question.prompt.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, new RegExp(question.visual.desktopAsset.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, new RegExp(question.visual.mobileAsset.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(markup, /<picture>/)
  assert.equal((markup.match(/data-option-id=/g) ?? []).length, question.options.length)
  assert.match(markup, /键盘：1～/)
})

test('25 题只保留题干、完整选项和原图，不再输出场景说明或事实说明', () => {
  for (const question of quiz.questions) {
    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderPixelQuestion(state, quiz, null)
    assert.match(markup, /data-pixel-stage/, `${question.id} 应在统一舞台内渲染`)
    assert.doesNotMatch(markup, /data-pixel-scene-guide/)
    assert.doesNotMatch(markup, /事实说明/)
    assert.equal((markup.match(/data-option-id=/g) ?? []).length, question.options.length)
    assert.match(markup, new RegExp(`data-option-count="${question.options.length}"`))
    for (const option of question.options) {
      assert.match(markup, new RegExp(`data-option-id="${option.id}"`))
    }
  }

})

test('25 题拥有独立票券主题，且每个选项都有题意对应的独立标识', () => {
  assert.equal(Object.keys(pixelChoiceThemes).length, 25)
  assert.equal(new Set(Object.values(pixelChoiceThemes).map((theme) => theme.label)).size, 25)
  assert.equal(new Set(Object.values(pixelChoiceThemes).map((theme) => theme.accent)).size, 25)

  for (const question of quiz.questions) {
    const theme = pixelChoiceThemes[question.id]
    assert.ok(theme, `${question.id} 缺少票券主题`)
    assert.deepEqual(
      Object.keys(theme.optionMarks).sort(),
      question.options.map((option) => option.id).sort(),
      `${question.id} 的票券标识必须逐项覆盖真实选项`,
    )
    assert.equal(
      new Set(Object.values(theme.optionMarks)).size,
      question.options.length,
      `${question.id} 的每个选项标识必须可区分`,
    )

    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderPixelQuestion(state, quiz, null)
    assert.match(markup, new RegExp(`data-ticket-theme="${question.id}"`))
    assert.match(markup, new RegExp(`data-ticket-pattern="${theme.pattern}"`))
    assert.equal((markup.match(/data-ticket-mark=/g) ?? []).length, question.options.length)
    assert.equal((markup.match(/data-choice-state="idle"/g) ?? []).length, question.options.length)
    assert.equal((markup.match(/aria-pressed="false"/g) ?? []).length, question.options.length)
  }
})

test('选择后仅当前票券进入橙色确认态，其余票券保持未选状态', () => {
  const question = quiz.questions.find((candidate) => candidate.id === 'Q19')
  assert.ok(question)
  const option = question.options.find((candidate) => candidate.id === 'all-in-capital')
  assert.ok(option)
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing' && state.currentQuestionId !== question.id) {
    const current = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const continuing = current?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(continuing)
    state = chooseOption(quiz, state, continuing.id)
    guard += 1
    assert.ok(guard <= quiz.questions.length)
  }
  assert.equal(state.currentQuestionId, question.id)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  assert.match(
    markup,
    /class="pixel-choice-card pixel-choice-card--selected"[^>]*data-option-id="all-in-capital"[^>]*data-choice-state="selected"[^>]*aria-pressed="true"/,
  )
  assert.equal((markup.match(/data-choice-state="selected"/g) ?? []).length, 1)
  assert.equal((markup.match(/aria-pressed="false"/g) ?? []).length, question.options.length - 1)
})

test('Q24 不再把预计用户公式叠加到图片左上角', () => {
  const state = {
    ...restartGame(quiz),
    currentQuestionId: 'Q24',
    metrics: { users: 10_000 },
  }
  const markup = renderPixelQuestion(state, quiz, null)

  assert.doesNotMatch(markup, /10,000 位预计用户 × 月费/)
  assert.doesNotMatch(markup, /用户数来自上一题 · 理论月流水 ≠ 利润/)
  assert.doesNotMatch(markup, /data-pixel-scene-guide/)
  assert.match(markup, /上一关选择的 10,000 个用户/)
  assert.equal((markup.match(/预计每月毛利/g) ?? []).length, 3)
})

test('像素版 Q24 选择后显示动态成本确认关，再进入原 Q25', () => {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q23') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
    guard += 1
    assert.ok(guard <= 25)
  }
  state = chooseOption(quiz, state, 'users-1000')
  assert.equal(state.currentQuestionId, 'Q24')
  state = chooseOption(quiz, state, 'price-19-9')
  assert.equal(state.currentQuestionId, 'Q25')

  const monthlyFixedCost = (
    state.ledger.costs.paidSunk.totalCny
    + state.ledger.costs.firstYearCommitted.totalCny
  ) / 12
  const markup = renderPixelCostCheckpoint(state, quiz)
  assert.match(markup, /data-pixel-cost-checkpoint/)
  assert.match(markup, /data-pixel-cost-board/)
  assert.ok(markup.includes('成本确认 · 24 / 25'))
  assert.ok(markup.includes('预计 1,000 个用户，每位每月 ¥19.9'))
  assert.ok(markup.includes(`首年总投入月均 ${formatCurrency(monthlyFixedCost)}`))
  assert.match(markup, /理论月收入/)
  assert.match(markup, /¥19,900\.0/)
  assert.match(markup, /预计每月毛利（粗算）/)
  assert.match(markup, /data-action="confirm-cost-check"/)
  assert.match(markup, /data-action="recalculate-cost-check"/)
  assert.match(markup, /继续，去找第一百个用户/)
  assert.match(markup, /返回重选价格/)
  assert.match(markup, /data-scene-id="Q24"/)
  assert.match(markup, /data-storyboard-frame="resolved"/)
  assert.doesNotMatch(markup, /data-option-id=/)
})

test('25 题分别绑定 25 个 sceneId 和 50 个路径，不存在旧 1..12 clamp', () => {
  assert.equal(new Set(quiz.questions.map((question) => question.visual.sceneId)).size, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.visual.desktopAsset)).size, 25)
  assert.equal(new Set(quiz.questions.map((question) => question.visual.mobileAsset)).size, 25)

  for (const question of quiz.questions) {
    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderPixelQuestion(state, quiz, null)
    assert.match(markup, new RegExp(`data-scene-id="${question.visual.sceneId}"`))
  }
})

test('选择反馈播放 resolved/quit 四态帧并冻结控件', () => {
  const state = restartGame(quiz)
  const question = quiz.questions[0]
  const continuing = question.options.find((option) => option.outcome !== 'exit')
  const exiting = question.options.find((option) => option.outcome === 'exit')
  assert.ok(continuing)
  assert.ok(exiting)

  const resolved = renderPixelQuestion(state, quiz, {
    optionId: continuing.id,
    optionLabel: continuing.label,
    outcome: 'resolved',
    nextState: chooseOption(quiz, state, continuing.id),
  })
  assert.match(resolved, /data-storyboard-frame="resolved"/)
  assert.match(resolved, /pixel-world--sequence-accept/)
  assert.match(resolved, /pixel-dossier pixel-dossier--question"[^>]* inert/)
  assert.match(resolved, /data-pixel-status-rail/)
  assert.match(resolved, />第 1 \/ 25 题</)
  assert.match(resolved, /data-pixel-option-feedback/)
  assert.doesNotMatch(resolved, /data-pixel-impact/)
  assert.doesNotMatch(resolved, /路线已重算/)
  assert.doesNotMatch(resolved, /pixel-pass__copy/)

  const quit = renderPixelQuestion(state, quiz, {
    optionId: exiting.id,
    optionLabel: exiting.label,
    outcome: 'quit',
    nextState: chooseOption(quiz, state, exiting.id),
  })
  assert.match(quit, /data-storyboard-frame="quit"/)
  assert.match(quit, />撤退已受理</)
  assert.doesNotMatch(quit, /pixel-world--sequence-accept/)
  assert.match(quit, /pixel-pass__copy/)
  assert.match(quit, /data-pixel-stage[\s\S]*pixel-pass__copy/)
})

test('正常选择按 optionId 使用专属双端 action/resolved 单帧与安全 DOM 文字，退出仍回落到题目母板', () => {
  const optionQuiz = structuredClone(quiz)
  const question = optionQuiz.questions[0]
  const continuing = question.options.find((option) => option.outcome !== 'exit')
  const exiting = question.options.find((option) => option.outcome === 'exit')
  assert.ok(continuing)
  assert.ok(exiting)
  question.visual.optionVariants = {
    [continuing.id]: {
      action: {
        desktopAsset: '/assets/pixel/options/Q01-launch-action-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-launch-action-mobile.webp',
      },
      resolved: {
        desktopAsset: '/assets/pixel/options/Q01-launch-resolved-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-launch-resolved-mobile.webp',
      },
      overlay: {
        eyebrow: 'CODING PLAN',
        title: 'Codex Pro <GPT>',
        detail: 'US$200 / 月',
        tone: 'brand',
      },
    },
    [exiting.id]: {
      action: {
        desktopAsset: '/assets/pixel/options/Q01-exit-action-desktop.webp',
        mobileAsset: '/assets/pixel/options/Q01-exit-action-mobile.webp',
      },
      overlay: { title: '不应显示' },
    },
  }
  const state = restartGame(optionQuiz)

  const resolved = renderPixelQuestion(state, optionQuiz, {
    optionId: continuing.id,
    optionLabel: continuing.label,
    outcome: 'resolved',
    nextState: chooseOption(optionQuiz, state, continuing.id),
  })
  assert.match(resolved, /Q01-launch-action-desktop\.webp/)
  assert.match(resolved, /Q01-launch-action-mobile\.webp/)
  assert.match(resolved, /Q01-launch-resolved-desktop\.webp/)
  assert.match(resolved, /Q01-launch-resolved-mobile\.webp/)
  assert.match(resolved, /data-option-visual-frame="action"/)
  assert.match(resolved, /data-option-visual-frame="resolved"/)
  assert.match(resolved, /data-visual-source="option"/)
  assert.match(resolved, /data-option-visual="launch"/)
  assert.match(resolved, /data-option-visual-overlay/)
  assert.match(resolved, /data-pixel-option-feedback/)
  assert.match(resolved, /Codex Pro &lt;GPT&gt;/)
  assert.match(resolved, /US\$200 \/ 月/)
  assert.match(resolved, /pixel-world--sequence-accept/)

  const quit = renderPixelQuestion(state, optionQuiz, {
    optionId: exiting.id,
    optionLabel: exiting.label,
    outcome: 'quit',
    nextState: chooseOption(optionQuiz, state, exiting.id),
  })
  assert.match(quit, new RegExp(question.visual.desktopAsset.replace(/^\//, '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
  assert.match(quit, /data-visual-source="question"/)
  assert.doesNotMatch(quit, /Q01-exit-action-desktop\.webp/)
  assert.doesNotMatch(quit, /data-option-visual-overlay/)
})

test('Q5 普通选择保持题目进度栏，并在账本格闪烁与舞台安全层确认选择', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'login', 'profit', 'found-company']) {
    state = chooseOption(quiz, state, optionId)
  }
  assert.equal(state.currentQuestionId, 'Q05')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q05')
  const option = question?.options.find((candidate) => candidate.id === 'register')
  assert.ok(option)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  const hudIndex = markup.indexOf('data-pixel-hud')
  const progressIndex = markup.indexOf('data-pixel-status-rail')
  const sceneIndex = markup.indexOf('data-pixel-scene')
  const feedbackIndex = markup.indexOf('data-pixel-option-feedback')
  assert.ok(hudIndex >= 0 && progressIndex > hudIndex && sceneIndex > progressIndex && feedbackIndex > sceneIndex)
  assert.match(markup, /pixel-hud__cell--monthly pixel-hud__cell--changed" data-pixel-hud-cell="monthly"/)
  assert.match(markup, /pixel-hud__cell--annual pixel-hud__cell--changed" data-pixel-hud-cell="annual"/)
  assert.match(markup, /pixel-hud__cell--days pixel-hud__cell--changed" data-pixel-hud-cell="days"/)
  assert.match(markup, /pixel-hud__value--full"[^>]*>¥41\.7</)
  assert.match(markup, /pixel-hud__value--compact"[^>]*>¥500\.0</)
  assert.doesNotMatch(markup, /折合人民币/)
  assert.doesNotMatch(markup, /data-pixel-hud-cell="time"/)
  assert.match(markup, /data-visual-outcome="gpt-sacrifice"/)
  assert.match(markup, /assets\/pixel\/motion\/choice-confirm\.webp/)
  assert.doesNotMatch(markup, /data-pixel-impact/)
  assert.doesNotMatch(markup, /路线已重算/)
})

test('Q3 的 GPT 文案不计金额，Q10 选择 GPT 后才计入且不重复', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'login']) state = chooseOption(quiz, state, optionId)
  assert.equal(state.currentQuestionId, 'Q03')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q03')
  const option = question?.options.find((candidate) => candidate.id === 'profit')
  assert.ok(option)

  const afterProfit = chooseOption(quiz, state, option.id)
  assert.equal(afterProfit.ledger.costs.firstYearCommitted.totalCny, 0, '共享题库账本不得被像素版临时成本污染')
  const transitionMarkup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    nextState: afterProfit,
  })
  assert.doesNotMatch(transitionMarkup, /¥1,358\.2/)
  assert.doesNotMatch(transitionMarkup, /¥16,298\.2/)
  assert.doesNotMatch(transitionMarkup, /pixel-hud__cell--monthly pixel-hud__cell--changed/)
  assert.doesNotMatch(transitionMarkup, /pixel-hud__cell--annual pixel-hud__cell--changed/)

  state = afterProfit
  for (const optionId of [
    'found-company',
    'register',
    'desk',
    'open-bank-account',
    'wechat-pay',
    'agency-bookkeeping',
  ]) state = chooseOption(quiz, state, optionId)
  assert.equal(state.currentQuestionId, 'Q10')
  const beforeQ10 = state.ledger.costs.firstYearCommitted.totalCny
  state = chooseOption(quiz, state, 'gpt-ultra')
  assert.ok(Math.abs((state.ledger.costs.firstYearCommitted.totalCny - beforeQ10) - 16_298.16) < 0.001)
  const afterQ10Markup = renderPixelQuestion(state, quiz, null)
  assert.doesNotMatch(afterQ10Markup, /¥3\.26万/, 'Q10 真实方案不得叠加 Q3 的虚拟金额')
})

test('Q07 退出金额与像素 HUD 同源，Q08 年费选择后立即按月均增加 25 元', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'login', 'profit', 'found-company', 'register', 'hosted']) {
    state = chooseOption(quiz, state, optionId)
  }
  assert.equal(state.currentQuestionId, 'Q07')

  const q07Markup = renderPixelQuestion(state, quiz, null)
  assert.match(q07Markup, /首年总投入已经到 ¥2,500\.0/)
  assert.ok((q07Markup.match(/¥2,500\.0/g) ?? []).length >= 2)

  state = chooseOption(quiz, state, 'open-bank-account')
  assert.equal(state.currentQuestionId, 'Q08')
  const q08Question = quiz.questions.find((candidate) => candidate.id === 'Q08')
  const wechat = q08Question?.options.find((candidate) => candidate.id === 'wechat-pay')
  assert.ok(wechat)

  const q08Markup = renderPixelQuestion(state, quiz, null)
  assert.ok((q08Markup.match(/折合¥25\.0\/月/g) ?? []).length >= 2)
  assert.match(q08Markup, /¥250\.0/)
  assert.match(q08Markup, /¥3,000\.0/)

  const transitionMarkup = renderPixelQuestion(state, quiz, {
    optionId: wechat.id,
    optionLabel: wechat.label,
    outcome: 'resolved',
    nextState: chooseOption(quiz, state, wechat.id),
  })
  assert.match(transitionMarkup, /¥275\.0\+待确认/)
  assert.match(transitionMarkup, /¥3,300\.0\+待确认/)
  assert.match(transitionMarkup, /pixel-hud__cell--monthly pixel-hud__cell--changed/)
  assert.match(transitionMarkup, /pixel-hud__cell--annual pixel-hud__cell--changed/)
})

test('Q10 选择不同开发 AI 时舞台反馈保留具体选项且不占用进度栏', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'guest', 'love']) state = chooseOption(quiz, state, optionId)
  assert.equal(state.currentQuestionId, 'Q10')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q10')
  const option = question?.options.find((candidate) => candidate.id === 'glm-pro')
  assert.ok(option)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  assert.match(markup, /data-selected-option="glm-pro"/)
  assert.match(markup, /data-visual-outcome="ai-glm"/)
  assert.match(markup, /GLM 5\.2(?! Pro)/)
  assert.match(markup, /data-pixel-option-feedback/)
  assert.doesNotMatch(markup, /折合人民币/)
  assert.match(markup, /--pixel-transition-duration:720ms/)
  assert.match(markup, />第 10 \/ 25 题</)
  assert.doesNotMatch(markup, /data-pixel-impact/)
})

test('Q19 资本门槛只显示为门槛差量并触发像素钱雨，不混入已支付', () => {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q19') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
    guard += 1
    assert.ok(guard <= 25)
  }
  const question = quiz.questions.find((candidate) => candidate.id === 'Q19')
  const option = question?.options.find((candidate) => candidate.id === 'all-in-capital')
  assert.ok(question)
  assert.ok(option)
  const nextState = chooseOption(quiz, state, option.id)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState,
  })
  assert.match(markup, /pixel-money-rain/)
  assert.match(markup, /data-pixel-status-rail/)
  assert.doesNotMatch(markup, /data-pixel-impact/)
  assert.equal(nextState.ledger.costs.paidSunk.totalCny, state.ledger.costs.paidSunk.totalCny)
})

test('Q9 过场只在继续路线出现，退出买球鞋不会误报资质关卡完成', () => {
  let state = restartGame(quiz)
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q09') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
  }
  const question = quiz.questions.find((candidate) => candidate.id === 'Q09')
  const exitOption = question?.options.find((candidate) => candidate.outcome === 'exit')
  assert.ok(question)
  assert.ok(exitOption)
  const nextState = chooseOption(quiz, state, exitOption.id)
  const markup = renderPixelQuestion(state, quiz, {
    optionId: exitOption.id,
    optionLabel: exitOption.label,
    outcome: 'quit',
    nextState,
  })
  assert.match(markup, /撤退已受理/)
  assert.doesNotMatch(markup, /走完了大部分的资质关卡/)
  assert.doesNotMatch(renderPixelResult(nextState, quiz), /pixel-result-conclusion/)
})

test('完成路线结果页把核心结算叠在 Q25 resolved 图上，并提供完整结算弹层', () => {
  let state = restartGame(quiz)
  let guard = 0
  while (state.phase === 'playing') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
    guard += 1
    assert.ok(guard <= 25)
  }
  const markup = renderPixelResult(state, quiz)
  const result = state.result
  assert.ok(result)
  assert.match(markup, /data-pixel-scene="victory"/)
  assert.match(markup, /data-scene-id="Q25"/)
  assert.match(markup, /data-storyboard-frame="resolved"/)
  assert.match(markup, /data-visual-source="option"/)
  assert.match(markup, /data-option-visual="organic"/)
  assert.match(markup, /data-option-visual-frame="resolved"/)
  assert.match(markup, /aria-label="总分 \d+ 分"/)
  assert.equal((markup.match(/<strong>[^<]+ \/ (?:30|25|15)<\/strong>/g) ?? []).length, 4)
  assert.match(markup, /class="pixel-financial-summary"/)
  assert.match(markup, /首年总投入/)
  assert.match(markup, /预计首年收入/)
  assert.ok(markup.indexOf('pixel-financial-summary') < markup.indexOf('pixel-score-grid'))
  assert.match(markup, /理论月收入/)
  assert.match(markup, /¥990\.0/)
  const monthlyFixedCost = (
    result.ledger.costs.paidSunk.totalCny
    + result.ledger.costs.firstYearCommitted.totalCny
  ) / 12
  const breakEvenUsers = Math.ceil(monthlyFixedCost / Number(result.metrics.monthlyPriceCny))
  const monthlyDifference = (Number(result.metrics.users) * Number(result.metrics.monthlyPriceCny)) - monthlyFixedCost
  assert.match(markup, /data-pixel-business-projection/)
  assert.equal((markup.match(/pixel-business-projection__metric(?:\s|")/g) ?? []).length, 6)
  assert.match(markup, /首年总投入月均/)
  assert.ok(markup.includes(formatCurrency(monthlyFixedCost)))
  assert.match(markup, /盈亏平衡用户/)
  assert.ok(markup.includes(`${new Intl.NumberFormat('zh-CN').format(breakEvenUsers)} 人`))
  assert.match(markup, /预计每月毛利（粗算）/)
  assert.ok(markup.includes(formatCurrency(Math.abs(monthlyDifference))))
  assert.match(markup, /pixel-stage--result/)
  assert.match(markup, /pixel-result-panel" data-pixel-achievement/)
  assert.match(markup, /class="pixel-result-status"/)
  assert.match(markup, /闯过 \d+ 关/)
  assert.doesNotMatch(markup, /一人四岗董事长/)
  assert.doesNotMatch(markup, /通关不是结束，而是终于可以开始经营产品/)
  assert.doesNotMatch(markup, /像素荣誉证书|答完 \d+ 题/)
  assert.match(markup, /pixel-score-medallion/)
  assert.match(markup, /pixel-score-medallion--digits-[123]/)
  assert.match(markup, /class="pixel-score-medallion__motion"/)
  assert.match(markup, /class="pixel-score-medallion__disc" aria-hidden="true"/)
  assert.match(markup, /<strong data-pixel-score>\d+<\/strong>/)
  assert.match(markup, /<small>\/ 100<\/small>/)
  assert.match(markup, /assets\/pixel\/motion\/achievement-reveal\.webp/)
  assert.equal((markup.match(/pixel-score-grid__item/g) ?? []).length, 4)
  assert.match(markup, /data-action="open-result-details"/)
  assert.match(markup, /<dialog class="pixel-result-dialog" data-result-dialog/)
  assert.match(markup, /完整经营账本/)
  assert.match(markup, /接下来优先做/)
  assert.match(markup, /data-action="back"/)
  assert.doesNotMatch(markup, />← 返回上一题</)
  assert.doesNotMatch(markup, /data-option-visual-overlay/)
})

test('紧凑账本只有月均投入、首年投入、天数三格，两个返回按钮均不含箭头', () => {
  let state = restartGame(quiz)
  const questionMarkup = renderPixelQuestion(state, quiz, null)
  assert.equal((questionMarkup.match(/pixel-hud__value--compact/g) ?? []).length, 3)
  assert.equal((questionMarkup.match(/pixel-hud__value--full/g) ?? []).length, 3)
  assert.equal((questionMarkup.match(/data-pixel-hud-cell=/g) ?? []).length, 3)
  assert.match(questionMarkup, />返回上一题重选</)
  assert.doesNotMatch(questionMarkup, /← 返回上一题/)

  while (state.phase === 'playing') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
  }
  const resultMarkup = renderPixelResult(state, quiz)
  assert.match(resultMarkup, />返回上一题</)
  assert.doesNotMatch(resultMarkup, /← 返回上一题/)
})
