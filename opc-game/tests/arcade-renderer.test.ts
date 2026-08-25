import assert from 'node:assert/strict'
import test from 'node:test'
import quizData from '../content/quiz-v2.json'
import {
  chooseOption,
  restartGame,
  type QuizDefinition,
} from '../packages/game-core/src/index.ts'
import {
  renderArcadeCostCheckpoint,
  renderArcadeIntro,
  renderArcadeQuestion,
  renderArcadeResult,
} from '../web/src/arcade/arcade-renderer.ts'

const quiz = quizData as unknown as QuizDefinition

test('街机版首页输出三格 HUD 与开始入口', () => {
  const state = restartGame(quiz)
  const markup = renderArcadeIntro(state)
  assert.match(markup, /data-arcade-hud/)
  assert.equal((markup.match(/data-arcade-hud-cell=/g) ?? []).length, 3)
  assert.match(markup, /月均投入/)
  assert.match(markup, /首年投入/)
  assert.match(markup, /累计天数/)
  assert.match(markup, /data-arcade-scene="intro"/)
  assert.match(markup, /stage-00\.webp/)
  assert.match(markup, /data-action="start"/)
})

test('25 题各自绑定正确 sceneId，选项数量与题库一致', () => {
  for (const question of quiz.questions) {
    const state = { ...restartGame(quiz), currentQuestionId: question.id }
    const markup = renderArcadeQuestion(state, quiz, null)
    assert.match(markup, new RegExp(`data-scene-id="${question.visual.sceneId}"`), `${question.id} sceneId 不匹配`)
    assert.equal((markup.match(/data-option-id=/g) ?? []).length, question.options.length)
    for (const option of question.options) {
      assert.match(markup, new RegExp(`data-option-id="${option.id}"`))
    }
    assert.equal((markup.match(/data-choice-state="idle"/g) ?? []).length, question.options.length)
  }
})

test('Q10 选择 glm-pro 后唯一选中项进入确认态，toast 含 overlay 文案且 HUD 闪烁', () => {
  let state = restartGame(quiz)
  for (const optionId of ['launch', 'guest', 'love']) state = chooseOption(quiz, state, optionId)
  assert.equal(state.currentQuestionId, 'Q10')
  const question = quiz.questions.find((candidate) => candidate.id === 'Q10')
  const option = question?.options.find((candidate) => candidate.id === 'glm-pro')
  assert.ok(question)
  assert.ok(option)
  const markup = renderArcadeQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  assert.equal((markup.match(/data-choice-state="selected"/g) ?? []).length, 1)
  assert.match(
    markup,
    /class="arcade-choice arcade-choice--selected"[^>]*data-option-id="glm-pro"[^>]*data-choice-state="selected"[^>]*aria-pressed="true"/,
  )
  assert.match(markup, /data-arcade-option-feedback/)
  assert.match(markup, /GLM 5\.2(?! Pro)/)
  assert.match(markup, /--arcade-transition-duration:800ms/)
  assert.match(markup, /arcade-hud__cell--monthly arcade-hud__cell--changed/)
  assert.match(markup, /arcade-hud__cell--annual arcade-hud__cell--changed/)
  assert.match(markup, /arcade-sheet arcade-sheet--question" inert/)
  assert.match(markup, /data-storyboard-frame="resolved"/)
  assert.match(markup, /arcade-scene--sequence/)
})

test('退出选择进入全屏撤退过场', () => {
  const state = restartGame(quiz)
  const question = quiz.questions[0]
  const exiting = question.options.find((option) => option.outcome === 'exit')
  assert.ok(exiting)
  const markup = renderArcadeQuestion(state, quiz, {
    optionId: exiting.id,
    optionLabel: exiting.label,
    outcome: 'quit',
    nextState: chooseOption(quiz, state, exiting.id),
  })

  assert.match(markup, /arcade-pass arcade-pass--quit/)
  assert.match(markup, /撤退已受理/)
  assert.match(markup, /已发生费用保留，不再新增承诺。/)
  assert.match(markup, /--arcade-transition-duration:1440ms/)
  assert.match(markup, /data-storyboard-frame="quit"/)
  assert.doesNotMatch(markup, /arcade-scene--sequence/)
})

test('Q09 继续选项过场显示资质关卡 interlude 标题', () => {
  let state = restartGame(quiz)
  while (state.phase === 'playing' && state.currentQuestionId !== 'Q09') {
    const question = quiz.questions.find((candidate) => candidate.id === state.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option)
    state = chooseOption(quiz, state, option.id)
  }
  const question = quiz.questions.find((candidate) => candidate.id === 'Q09')
  const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
  assert.ok(question)
  assert.ok(option)
  const markup = renderArcadeQuestion(state, quiz, {
    optionId: option.id,
    optionLabel: option.label,
    outcome: 'resolved',
    visualOutcome: option.visualOutcome,
    nextState: chooseOption(quiz, state, option.id),
  })

  assert.match(markup, /arcade-pass arcade-pass--accept/)
  assert.match(markup, /恭喜你，走完了大部分的资质关卡，可以开始做自己的产品了/)
})

test('Q24 选择价格后街机版显示动态成本确认关', () => {
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

  const markup = renderArcadeCostCheckpoint(state, quiz)
  assert.match(markup, /data-arcade-cost-checkpoint/)
  assert.match(markup, /data-arcade-cost-board/)
  assert.ok(markup.includes('成本确认 · 24 / 25'))
  assert.ok(markup.includes('预计 1,000 个用户，每位每月 ¥19.9'))
  assert.match(markup, /理论月收入/)
  assert.match(markup, /预计每月毛利（粗算）/)
  assert.match(markup, /data-action="confirm-cost-check"/)
  assert.match(markup, /data-action="recalculate-cost-check"/)
  assert.match(markup, /键盘：1 继续 · 2 重算/)
  assert.match(markup, /data-scene-id="Q24"/)
  assert.match(markup, /data-storyboard-frame="resolved"/)
})

test('通关结果页输出分数、查看完整结算按钮与 dialog 弹层', () => {
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
  const markup = renderArcadeResult(state, quiz)
  const result = state.result
  assert.ok(result)

  assert.match(markup, /data-arcade-scene="victory"/)
  assert.match(markup, /data-scene-id="Q25"/)
  assert.match(markup, /data-arcade-achievement/)
  assert.doesNotMatch(markup, /data-arcade-score|arcade-score-ring/)
  assert.match(markup, /class="arcade-financial-summary"/)
  assert.equal((markup.match(/arcade-score-grid__item/g) ?? []).length, 4)
  assert.match(markup, /data-action="open-result-details"/)
  assert.match(markup, /<dialog class="arcade-result-dialog" data-result-dialog/)
  assert.match(markup, /完整经营账本/)
  assert.match(markup, /接下来优先做/)
  assert.match(markup, /data-action="close-result-details"/)
  assert.match(markup, /data-action="restart"/)
})
