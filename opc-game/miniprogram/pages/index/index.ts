import {
  assertValidQuizDefinition,
  chooseOption,
  formatCurrency,
  formatLedger,
  goBack,
  interpolateQuizText,
  optionMonthlyAverageInvestmentCny,
  optionMonthlyPrice,
  restartGame,
  summarizeFinancials,
  type QuizState,
} from '../../generated/game-core'
import { quizDefinition } from '../../generated/quiz-v2'
import { gameAudio } from '../../audio/game-audio'

type Screen = 'intro' | 'challenge' | 'result'

interface OptionTapEvent {
  currentTarget: {
    dataset: { optionId?: string }
  }
}

const SCORE_LABELS = {
  execution: '执行力',
  compliance: '合规判断',
  business: '商业闭环',
  costHealth: '成本健康度',
} as const

assertValidQuizDefinition(quizDefinition)

function findQuestion(gameState: QuizState) {
  return quizDefinition.questions.find((question) => question.id === gameState.currentQuestionId)
    ?? quizDefinition.questions[0]
}

function interpolateText(
  value: string,
  gameState: QuizState,
  monthlyPriceOverride?: number,
  optionMonthlyAverageInvestmentOverride?: number,
): string {
  return interpolateQuizText(
    value,
    gameState.result?.ledger ?? gameState.ledger,
    gameState.result?.metrics ?? gameState.metrics,
    monthlyPriceOverride,
    optionMonthlyAverageInvestmentOverride,
  )
}

function formattedInvestment(value: number, hasUnpricedAmount: boolean): string {
  return `${formatCurrency(value)}${hasUnpricedAmount ? ' + 待确认' : ''}`
}

function deriveView(gameState: QuizState, started: boolean) {
  const question = findQuestion(gameState)
  const displayQuestion = {
    ...question,
    prompt: interpolateText(question.prompt, gameState),
    options: question.options.map((option) => ({
      ...option,
      label: interpolateText(
        option.label,
        gameState,
        optionMonthlyPrice(option) ?? undefined,
        optionMonthlyAverageInvestmentCny(option) ?? undefined,
      ),
    })),
  }
  const rawLedger = gameState.result?.ledger ?? gameState.ledger
  const metrics = gameState.result?.metrics ?? gameState.metrics
  const ledger = formatLedger(rawLedger)
  const financials = summarizeFinancials(rawLedger, metrics)
  const result = gameState.result
  const screen: Screen = !started ? 'intro' : gameState.phase === 'playing' ? 'challenge' : 'result'
  const scoreItems = result
    ? Object.entries(result.score.dimensions).map(([key, dimension]) => ({
      key,
      label: SCORE_LABELS[key as keyof typeof SCORE_LABELS],
      value: `${dimension.score} / ${dimension.cap}`,
    }))
    : []
  const ledgerRows = result ? [
    { label: '已支付沉没成本', value: ledger.paidSunk },
    { label: '首年固定成本', value: ledger.firstYearCommitted },
    { label: '次年续费', value: ledger.renewal },
    { label: '变动成本', value: ledger.variable },
    { label: '待报价', value: ledger.pendingQuote },
    { label: '注册资本门槛', value: ledger.capitalRequirement },
  ] : []
  const projectionRows = result
    && financials.users !== null
    && financials.monthlyPriceCny !== null
    && financials.monthlyRevenueCny !== null
    && financials.monthlyGrossProfitEstimateCny !== null ? [
    { label: '目标用户', value: new Intl.NumberFormat('zh-CN').format(financials.users) },
    { label: '每用户月费', value: formatCurrency(financials.monthlyPriceCny) },
    { label: '理论月收入', value: formatCurrency(financials.monthlyRevenueCny) },
    { label: '月均投入', value: formatCurrency(financials.monthlyAverageInvestmentCny) },
    { label: '预计每月毛利（粗算）', value: formatCurrency(financials.monthlyGrossProfitEstimateCny) },
  ] : []
  const financialSummaryRows = result ? [
    {
      label: '首年总投入',
      value: formattedInvestment(
        financials.firstYearInvestmentCny,
        financials.hasUnpricedFirstYearInvestment,
      ),
    },
    {
      label: '预计首年收入',
      value: financials.annualRevenueCny === null ? '—' : formatCurrency(financials.annualRevenueCny),
    },
  ] : []

  return {
    gameState,
    started,
    screen,
    question: displayQuestion,
    progressText: `${displayQuestion.number} / ${quizDefinition.questions.length}`,
    progressPercent: Math.round((displayQuestion.number / quizDefinition.questions.length) * 100),
    canGoBack: gameState.history.length > 0,
    ledgerFirstYearInvestment: formattedInvestment(
      financials.firstYearInvestmentCny,
      financials.hasUnpricedFirstYearInvestment,
    ),
    ledgerMonthlyAverage: formattedInvestment(
      financials.monthlyAverageInvestmentCny,
      financials.hasUnpricedFirstYearInvestment,
    ),
    ledgerTime: ledger.founderTime,
    ledgerPath: ledger.criticalPath,
    resultStamp: result?.outcome === 'completed' ? 'SURVIVED' : 'RESULT LOCKED',
    resultMeta: result ? `答完 ${result.answeredCount} 题 · 总分 ${result.score.total} / 100` : '',
    resultTitle: result?.title ?? '',
    resultConclusion: result?.conclusion ?? '',
    badges: result?.badges ?? [],
    scoreItems,
    financialSummaryRows,
    ledgerRows,
    projectionRows,
    todos: result?.topTodos ?? [],
  }
}

function freshData() {
  return {
    ...deriveView(restartGame(quizDefinition), false),
    busy: false,
    transitionVisible: false,
    transitionLabel: '',
    transitionDetail: '',
    transitionExit: false,
    audioEnabled: gameAudio.isEnabled(),
  }
}

let transitionTimer: number | null = null

Page({
  data: freshData(),

  onLoad() {
    wx.hideShareMenu({ menus: ['shareAppMessage', 'shareTimeline'] })
    gameAudio.initialize()
    this.applyState(restartGame(quizDefinition), false)
  },

  onShow() {
    gameAudio.onShow()
  },

  onHide() {
    gameAudio.onHide()
  },

  onUnload() {
    if (transitionTimer !== null) clearTimeout(transitionTimer)
    transitionTimer = null
    gameAudio.destroy()
  },

  applyState(gameState: QuizState, started = true) {
    this.setData({
      ...deriveView(gameState, started),
      busy: false,
      transitionVisible: false,
      transitionLabel: '',
      transitionDetail: '',
      transitionExit: false,
    })
  },

  start() {
    this.applyState(restartGame(quizDefinition))
    gameAudio.startBgm()
    gameAudio.playEffect('start')
  },

  toggleSound() {
    this.setData({ audioEnabled: gameAudio.toggle() })
  },

  choose(event: OptionTapEvent) {
    if (this.data.busy || this.data.gameState.phase !== 'playing') return
    const optionId = event.currentTarget.dataset.optionId
    const option = this.data.question.options.find((candidate) => candidate.id === optionId)
    if (!option) return
    const nextState = chooseOption(quizDefinition, this.data.gameState, option.id)
    gameAudio.playEffect(nextState.phase === 'exited' ? 'exit' : 'confirm')
    const interlude = nextState.phase === 'exited'
      ? undefined
      : quizDefinition.definition.interludes.find((item) => item.afterQuestionId === this.data.question.id)
    this.setData({
      busy: true,
      transitionVisible: true,
      transitionLabel: interlude?.title ?? option.label,
      transitionDetail: interlude?.body ?? '费用、时间、分数与待办已按当前路线重放。',
      transitionExit: nextState.phase === 'exited',
    })
    transitionTimer = setTimeout(() => {
      transitionTimer = null
      this.applyState(nextState)
      if (nextState.phase === 'completed') gameAudio.playEffect('survived')
    }, 520)
  },

  back() {
    if (this.data.busy || !this.data.canGoBack) return
    gameAudio.playEffect('back')
    this.applyState(goBack(quizDefinition, this.data.gameState))
  },

  restart() {
    if (transitionTimer !== null) clearTimeout(transitionTimer)
    transitionTimer = null
    gameAudio.playEffect('back')
    gameAudio.stopBgm()
    this.applyState(restartGame(quizDefinition), false)
  },
})
