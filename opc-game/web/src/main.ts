import quizData from '../../content/quiz-v2.json'
import {
  assertValidQuizDefinition,
  chooseOption,
  goBack,
  interpolateQuizText,
  optionMonthlyAverageInvestmentCny,
  optionMonthlyPrice,
  restartGame,
  type QuizDefinition,
  type QuizOption,
  type QuizQuestion,
  type QuizState,
} from '../../packages/game-core/src/index.ts'
import { type PixelTransition } from './pixel/pixel-renderer.ts'
import { assetUrl } from './pixel/pixel-scenes.ts'
import {
  ARCADE_OPTION_FEEDBACK_DURATION_MS,
  ARCADE_PASS_DURATION_MS,
  renderArcadeCostCheckpoint,
  renderArcadeIntro,
  renderArcadeQuestion,
  renderArcadeResult,
} from './arcade/arcade-renderer.ts'
import { gameAudio } from './audio.ts'
import './styles/base.css'
import './styles/arcade.css'

const theme = {
  index: 'OPC / ARCADE 05',
  identityLines: ['ONE PERSON', 'COMPANY', 'ARCADE'],
  identityMeta: '答案只在当前页面内存中存在',
  statePrefix: 'ARCADE / SURVIVAL',
}

// JSON imports widen tuple and string-literal fields. Runtime validation below
// remains the source of truth for the complete external definition.
const quiz = quizData as unknown as QuizDefinition
assertValidQuizDefinition(quiz)

const appElement = document.querySelector<HTMLDivElement>('#app')
if (!appElement) throw new Error('App root is missing.')
const app: HTMLDivElement = appElement

document.documentElement.dataset.theme = 'arcade'

let started = false
let state: QuizState = restartGame(quiz)
let transition: PixelTransition | null = null
let transitionTimer: number | null = null
let showingCostCheckpoint = false
const preloadedAssets = new Set<string>()
type ImagePriority = 'high' | 'low'

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] ?? character)

function currentQuestion(gameState = state): QuizQuestion | null {
  return quiz.questions.find((question) => question.id === gameState.currentQuestionId) ?? null
}

function interpolateText(
  value: string,
  gameState = state,
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

function shell(content: string, stateLabel: string): string {
  const soundEnabled = gameAudio.isEnabled()
  return `
    <main class="shell" data-view="${started ? escapeHtml(state.phase) : 'intro'}">
      <button
        class="sound-toggle"
        type="button"
        data-action="toggle-sound"
        aria-pressed="${soundEnabled}"
        aria-label="${soundEnabled ? '关闭配乐和音效' : '开启配乐和音效'}"
        title="${soundEnabled ? '关闭配乐和音效' : '开启配乐和音效'}"
      >
        <span aria-hidden="true">${soundEnabled ? '♪' : '×'}</span>
        <span>${soundEnabled ? '声音 开' : '声音 关'}</span>
      </button>
      <aside class="identity" aria-label="产品名称">
        <span class="identity__index">${escapeHtml(theme.index)}</span>
        <div class="identity__title">
          ${theme.identityLines.map((line) => `<p>${escapeHtml(line)}</p>`).join('')}
        </div>
        <div class="identity__footer">
          <small>${escapeHtml(theme.identityMeta)}</small>
        </div>
      </aside>
      <section class="game-card">
        <header class="mobile-brand">
          <span>${escapeHtml(theme.statePrefix)}</span>
          <span>${escapeHtml(stateLabel)}</span>
        </header>
        ${content}
      </section>
    </main>
  `
}

function renderIntro(): string {
  return shell(renderArcadeIntro(state), '准备开始')
}

function renderQuestion(): string {
  const question = currentQuestion()
  if (!question) return renderResult()
  if (showingCostCheckpoint) return shell(renderArcadeCostCheckpoint(state, quiz), '成本确认')
  return shell(renderArcadeQuestion(state, quiz, transition), '正在闯关')
}

function renderResult(): string {
  const result = state.result
  if (!result) return renderIntro()
  return shell(renderArcadeResult(state, quiz), '结果已结算')
}

function preloadAsset(asset: string, priority: ImagePriority): void {
  if (preloadedAssets.has(asset)) return
  preloadedAssets.add(asset)
  const image = new Image()
  image.decoding = 'async'
  image.fetchPriority = priority
  image.src = assetUrl(asset)
}

function preloadQuestionScene(questionId: string | null, priority: ImagePriority = 'high'): void {
  if (!questionId) return
  const question = quiz.questions.find((candidate) => candidate.id === questionId)
  if (!question) return
  const mobile = window.matchMedia('(max-width: 600px)').matches
  preloadAsset(mobile ? question.visual.mobileAsset : question.visual.desktopAsset, priority)
}

function preloadOptionFrames(question: QuizQuestion, optionId?: string, priority: ImagePriority = 'low'): void {
  const mobile = window.matchMedia('(max-width: 600px)').matches
  const variants = optionId
    ? [question.visual.optionVariants?.[optionId]].filter((variant) => variant !== undefined)
    : Object.values(question.visual.optionVariants ?? {})

  for (const variant of variants) {
    for (const frame of [variant.action, variant.resolved]) {
      if (!frame) continue
      preloadAsset(mobile ? frame.mobileAsset : frame.desktopAsset, priority)
    }
  }
}

function scheduleOptionFramePreload(question: QuizQuestion): void {
  const preload = () => preloadOptionFrames(question)
  if (typeof window.requestIdleCallback === 'function') {
    window.requestIdleCallback(preload, { timeout: 1_200 })
    return
  }
  globalThis.setTimeout(preload, 350)
}

function placePlatformSoundToggle(): void {
  if (document.body.dataset.platform !== 'xhs-tool') return
  const toggle = app.querySelector<HTMLButtonElement>('.sound-toggle')
  const panel = app.querySelector<HTMLElement>('.arcade-sheet, .arcade-result')
  if (!toggle || !panel) return
  const row = document.createElement('div')
  row.className = 'xhs-sound-row'
  row.setAttribute('aria-label', '音乐控制')
  row.append(toggle)
  panel.prepend(row)
}

function render(): void {
  app.dataset.phase = started ? state.phase : 'intro'
  if (!started) app.innerHTML = renderIntro()
  else if (state.phase === 'playing') app.innerHTML = renderQuestion()
  else app.innerHTML = renderResult()
  placePlatformSoundToggle()

  if (!started) preloadQuestionScene(quiz.definition.startQuestionId)
  else if (state.phase === 'playing' && !transition) {
    const question = currentQuestion()
    preloadQuestionScene(state.currentQuestionId)
    if (question) scheduleOptionFramePreload(question)
  }
  if (!transition) {
    window.requestAnimationFrame(() => {
      const heading = app.querySelector<HTMLHeadingElement>('h1')
      if (!heading) return
      heading.tabIndex = -1
      heading.focus({ preventScroll: true })
    })
  }
}

function clearTransitionTimer(): void {
  if (transitionTimer !== null) window.clearTimeout(transitionTimer)
  transitionTimer = null
}

function finishTransition(): void {
  if (!transition) return
  const answeredQuestionId = state.currentQuestionId
  const nextState = transition.nextState
  clearTransitionTimer()
  transition = null
  state = nextState
  showingCostCheckpoint = answeredQuestionId === 'Q24'
    && state.phase === 'playing'
    && state.currentQuestionId === 'Q25'
  render()
  if (showingCostCheckpoint) gameAudio.playEffect('checkpoint')
  else if (state.phase === 'completed') gameAudio.playEffect('survived')
}

function scheduleTransition(): void {
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isOptionFeedback = Boolean(app.querySelector('[data-arcade-option-feedback]'))
  const isPass = Boolean(app.querySelector('.arcade-pass'))
  const visibleDuration = reduceMotion
    ? 80
    : isOptionFeedback
      ? ARCADE_OPTION_FEEDBACK_DURATION_MS
      : isPass
        ? ARCADE_PASS_DURATION_MS
        : 720
  transitionTimer = window.setTimeout(finishTransition, visibleDuration + (reduceMotion ? 0 : 120))
}

function selectOption(optionId: string): void {
  if (!started || state.phase !== 'playing' || transition) return
  const question = currentQuestion()
  const option: QuizOption | undefined = question?.options.find((candidate) => candidate.id === optionId)
  if (!question || !option) return
  const nextState = chooseOption(quiz, state, option.id)
  gameAudio.playEffect(nextState.phase === 'exited' ? 'exit' : 'confirm')
  preloadOptionFrames(question, option.id, 'high')
  preloadQuestionScene(nextState.currentQuestionId)
  transition = {
    optionId: option.id,
    optionLabel: interpolateText(
      option.label,
      state,
      optionMonthlyPrice(option) ?? undefined,
      optionMonthlyAverageInvestmentCny(option) ?? undefined,
    ),
    outcome: nextState.phase === 'exited' ? 'quit' : 'resolved',
    visualOutcome: option.visualOutcome,
    nextState,
  }
  render()
  scheduleTransition()
}

function handleAction(action: string): void {
  if (action === 'toggle-sound') {
    gameAudio.toggle()
    render()
    return
  }
  if (transition) return
  if (action === 'confirm-cost-check') {
    gameAudio.playEffect('confirm')
    showingCostCheckpoint = false
    render()
    return
  }
  if (action === 'recalculate-cost-check') {
    gameAudio.playEffect('back')
    showingCostCheckpoint = false
    state = goBack(quiz, state)
    render()
    return
  }
  if (action === 'open-result-details') {
    app.querySelector<HTMLDialogElement>('[data-result-dialog]')?.showModal()
    return
  }
  if (action === 'close-result-details') {
    app.querySelector<HTMLDialogElement>('[data-result-dialog]')?.close()
    return
  }
  if (action === 'start') {
    started = true
    showingCostCheckpoint = false
    state = restartGame(quiz)
    gameAudio.startBgm()
    gameAudio.playEffect('start')
  }
  if (action === 'back') {
    gameAudio.playEffect('back')
    showingCostCheckpoint = false
    state = goBack(quiz, state)
  }
  if (action === 'restart') {
    gameAudio.playEffect('back')
    gameAudio.stopBgm()
    clearTransitionTimer()
    started = false
    showingCostCheckpoint = false
    state = restartGame(quiz)
  }
  render()
}

function dispatchInteraction(target: EventTarget | null): void {
  if (!(target instanceof Element)) return
  const optionButton = target.closest<HTMLButtonElement>('[data-option-id]')
  if (optionButton && !optionButton.disabled) return selectOption(optionButton.dataset.optionId ?? '')
  const actionButton = target.closest<HTMLButtonElement>('[data-action]')
  if (actionButton && !actionButton.disabled) handleAction(actionButton.dataset.action ?? '')
}

app.addEventListener('pointerup', (event) => {
  dispatchInteraction(event.target)
})

app.addEventListener('keydown', (event) => {
  if (event.key !== 'Enter' && event.key !== ' ') return
  const button = event.target instanceof Element ? event.target.closest<HTMLButtonElement>('button') : null
  if (!button || button.disabled) return
  event.preventDefault()
  dispatchInteraction(button)
})

window.addEventListener('keydown', (event) => {
  if (!started || state.phase !== 'playing' || transition || event.metaKey || event.ctrlKey || event.altKey) return
  if (showingCostCheckpoint) {
    if (event.key === '1') handleAction('confirm-cost-check')
    if (event.key === '2') handleAction('recalculate-cost-check')
    return
  }
  if (!/^[1-4]$/.test(event.key)) return
  const option = currentQuestion()?.options[Number(event.key) - 1]
  if (option) selectOption(option.id)
})

document.addEventListener('visibilitychange', () => {
  gameAudio.setPageVisible(!document.hidden)
})

render()
