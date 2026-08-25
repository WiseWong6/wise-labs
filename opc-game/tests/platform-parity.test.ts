import assert from 'node:assert/strict'
import test from 'node:test'
import sourceQuiz from '../content/quiz-v2.json'
import * as webCore from '../packages/game-core/src/index.ts'
import * as miniCore from '../miniprogram/generated/game-core.ts'
import { quizDefinition as miniQuiz } from '../miniprogram/generated/quiz-v2.ts'

const webQuiz = sourceQuiz as unknown as webCore.QuizDefinition

test('Web 与小程序加载完全相同的 v2 题库', () => {
  assert.deepEqual(miniQuiz, sourceQuiz)
  assert.equal(sourceQuiz.questions.length, 25)
})

test('Web 与小程序核心对同一路线产生完全相同结果', () => {
  let webState = webCore.restartGame(webQuiz)
  let miniState = miniCore.restartGame(miniQuiz)
  let guard = 0

  while (webState.phase === 'playing' && miniState.phase === 'playing') {
    const question = webQuiz.questions.find((candidate) => candidate.id === webState.currentQuestionId)
    const option = question?.options.find((candidate) => candidate.outcome !== 'exit')
    assert.ok(option, `${webState.currentQuestionId} 应存在非退出路线`)
    webState = webCore.chooseOption(webQuiz, webState, option.id)
    miniState = miniCore.chooseOption(miniQuiz, miniState, option.id)
    guard += 1
    assert.ok(guard <= 25, '路线不应出现循环')
  }

  assert.deepEqual(miniState, webState)
  assert.equal(webState.phase, 'completed')
})
