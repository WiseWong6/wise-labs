export type ScalarValue = string | number | boolean | null

export type ScoreDimension = 'execution' | 'compliance' | 'business' | 'costHealth'

export type ScoreVector = Record<ScoreDimension, number>

export type CostBucket =
  | 'paidSunk'
  | 'firstYearCommitted'
  | 'renewal'
  | 'variable'
  | 'pendingQuote'
  | 'capitalRequirement'

export type TimeTrack = 'company' | 'development' | 'filing' | 'compliance' | 'marketing'

export interface FactCondition {
  fact: string
  equals?: ScalarValue
  oneOf?: ScalarValue[]
  exists?: boolean
}

export interface MetricCondition {
  metric: string
  equals?: ScalarValue
  oneOf?: ScalarValue[]
  exists?: boolean
}

export interface AllCondition {
  all: Condition[]
}

export interface AnyCondition {
  any: Condition[]
}

export interface NotCondition {
  not: Condition
}

export type Condition = FactCondition | MetricCondition | AllCondition | AnyCondition | NotCondition

export interface SetFactEffect {
  type: 'set-fact'
  key: string
  value: ScalarValue
}

export interface MoneyEffect {
  type: 'money'
  id?: string
  bucket: CostBucket
  amount?: number | null
  currency?: string
  label: string
  sourceType?: string
  chargeTiming?: string
  refundable?: boolean
  priceDate?: string
}

export interface RemoveMoneyEffect {
  type: 'remove-money'
  bucket: CostBucket
  itemId?: string
  sourceQuestionId?: string
  sourceOptionId?: string
  labelContains?: string
}

export interface EffortEffect {
  type: 'effort'
  bucket: 'founderHours' | 'recurringMonthlyHours'
  hours: number
  track: TimeTrack
  label: string
}

export interface WaitEffect {
  type: 'wait'
  track: TimeTrack
  days: number
  blocking: boolean
  label: string
}

export interface TodoEffect {
  type: 'todo'
  id: string
  label: string
  timing?: 'before-launch' | 'post-launch' | 'recurring'
}

export interface MetricEffect {
  type: 'metric'
  key: string
  value: ScalarValue
  mode?: 'set' | 'add' | 'max'
}

export type Effect =
  | SetFactEffect
  | MoneyEffect
  | RemoveMoneyEffect
  | EffortEffect
  | WaitEffect
  | TodoEffect
  | MetricEffect

export type VisualState = 'idle' | 'action' | 'resolved' | 'quit'
export type VisualFrames = [VisualState, VisualState, VisualState, VisualState]

export type OptionVisualOverlayTone = 'neutral' | 'brand' | 'success' | 'warning'

export interface OptionVisualOverlay {
  eyebrow?: string
  title: string
  detail?: string
  tone?: OptionVisualOverlayTone
}

export interface ResponsiveVisualAsset {
  desktopAsset: string
  mobileAsset: string
}

/**
 * An option may override either half of its action/resolved sequence with a
 * responsive single-frame asset. Missing frames keep using the corresponding
 * quadrant of the question's standard four-state storyboard.
 */
export interface OptionVisualVariant {
  action?: ResponsiveVisualAsset
  resolved?: ResponsiveVisualAsset
  overlay?: OptionVisualOverlay
}

export interface QuestionVisual {
  sceneId: string
  desktopAsset: string
  mobileAsset: string
  frames: VisualFrames
  optionVariants?: Record<string, OptionVisualVariant>
}

export interface QuizOption {
  id: string
  label: string
  nextQuestionId?: string
  outcome?: 'exit' | 'result'
  exitTitle?: string
  visualOutcome?: string
  effects: Effect[]
}

export interface QuizQuestion {
  id: string
  number: number
  chapterId: string
  prompt: string
  promptVariants?: Record<string, string>
  appliesWhen?: Condition
  defaultNextQuestionId?: string
  factNotes: string[]
  visual: QuestionVisual
  scoreWeight: Partial<ScoreVector>
  options: QuizOption[]
}

export interface QuizChapter {
  id: string
  title: string
}

export interface QuizInterlude {
  id: string
  afterQuestionId: string
  title: string
  body?: string
}

export interface QuizMetadata {
  id: string
  version: string
  title: string
  startQuestionId: string
  effectiveHoursPerDay: number
  scoreCaps: ScoreVector
  chapters: QuizChapter[]
  interludes: QuizInterlude[]
}

export interface ResultTitleBand {
  min: number
  max: number
  title: string
  conclusion?: string
}

export interface ExitTitleRule {
  title: string
  when: Condition
}

export interface BadgeRule {
  id: string
  label: string
  when: Condition
  priority?: number
}

export interface ResultRules {
  titleBands?: ResultTitleBand[]
  exitTitles?: ExitTitleRule[]
  badges?: BadgeRule[]
}

export interface QuizDefinition {
  definition: QuizMetadata
  questions: QuizQuestion[]
  resultRules?: ResultRules
}

export interface AnswerRecord {
  questionId: string
  optionId: string
}

export interface CostLineItem {
  id?: string
  questionId: string
  optionId: string
  label: string
  amount: number | null
  currency: string
  sourceType?: string
  chargeTiming?: string
  refundable?: boolean
  priceDate?: string
}

export interface CostBucketLedger {
  totalCny: number
  items: CostLineItem[]
  hasUnknownAmount: boolean
}

export type CostLedger = Record<CostBucket, CostBucketLedger>

export interface TimeTrackLedger {
  founderHours: number
  recurringMonthlyHours: number
  blockingWaitDays: number
  nonBlockingWaitDays: number
}

export type TimeTracks = Record<TimeTrack, TimeTrackLedger>

export interface TimeLedger {
  founderHours: number
  recurringMonthlyHours: number
  tracks: TimeTracks
  elapsedDays: number
  criticalPathDays: number
}

export interface TodoItem {
  id: string
  label: string
  timing: 'before-launch' | 'post-launch' | 'recurring'
  questionId: string
  optionId: string
}

export interface QuizLedger {
  costs: CostLedger
  time: TimeLedger
  todos: TodoItem[]
}

export interface FinancialSummary {
  firstYearInvestmentCny: number
  monthlyAverageInvestmentCny: number
  users: number | null
  monthlyPriceCny: number | null
  monthlyRevenueCny: number | null
  annualRevenueCny: number | null
  monthlyGrossProfitEstimateCny: number | null
  hasUnpricedFirstYearInvestment: boolean
}

export interface ScoreDimensionResult {
  earnedWeight: number
  availableWeight: number
  cap: number
  score: number
}

export interface ScoreResult {
  dimensions: Record<ScoreDimension, ScoreDimensionResult>
  total: number
}

export interface QuizResult {
  outcome: 'completed' | 'exited'
  answeredCount: number
  stoppedAtQuestionId: string | null
  title: string
  titleKind: 'score' | 'exit'
  conclusion: string
  badges: Array<{ id: string; label: string }>
  score: ScoreResult
  ledger: QuizLedger
  facts: Record<string, ScalarValue>
  metrics: Record<string, ScalarValue>
  topTodos: TodoItem[]
}

export type QuizPhase = 'playing' | 'completed' | 'exited'

export interface QuizState {
  phase: QuizPhase
  currentQuestionId: string | null
  history: AnswerRecord[]
  facts: Record<string, ScalarValue>
  metrics: Record<string, ScalarValue>
  awardedScore: ScoreVector
  ledger: QuizLedger
  result: QuizResult | null
}

type TruthValue = true | false | 'unknown'

const SCORE_DIMENSIONS: ScoreDimension[] = ['execution', 'compliance', 'business', 'costHealth']
const COST_BUCKETS: CostBucket[] = [
  'paidSunk',
  'firstYearCommitted',
  'renewal',
  'variable',
  'pendingQuote',
  'capitalRequirement',
]
const TIME_TRACKS: TimeTrack[] = ['company', 'development', 'filing', 'compliance', 'marketing']

const DEFAULT_TITLE_BANDS: ResultTitleBand[] = [
  { min: 0, max: 19, title: '还在脑内公测' },
  { min: 20, max: 39, title: 'Vibe Coding 练习生' },
  { min: 40, max: 59, title: '上线求生者' },
  { min: 60, max: 69, title: 'MVP 小老板' },
  { min: 70, max: 79, title: '最小可行总裁' },
  { min: 80, max: 89, title: '一人公司耐力王' },
  { min: 90, max: 100, title: '真·一人公司经营者' },
]

function zeroScore(): ScoreVector {
  return { execution: 0, compliance: 0, business: 0, costHealth: 0 }
}

function emptyCostBucket(): CostBucketLedger {
  return { totalCny: 0, items: [], hasUnknownAmount: false }
}

function emptyTrack(): TimeTrackLedger {
  return { founderHours: 0, recurringMonthlyHours: 0, blockingWaitDays: 0, nonBlockingWaitDays: 0 }
}

export function createEmptyLedger(): QuizLedger {
  return {
    costs: {
      paidSunk: emptyCostBucket(),
      firstYearCommitted: emptyCostBucket(),
      renewal: emptyCostBucket(),
      variable: emptyCostBucket(),
      pendingQuote: emptyCostBucket(),
      capitalRequirement: emptyCostBucket(),
    },
    time: {
      founderHours: 0,
      recurringMonthlyHours: 0,
      tracks: {
        company: emptyTrack(),
        development: emptyTrack(),
        filing: emptyTrack(),
        compliance: emptyTrack(),
        marketing: emptyTrack(),
      },
      elapsedDays: 0,
      criticalPathDays: 0,
    },
    todos: [],
  }
}

function cloneLedger(ledger: QuizLedger): QuizLedger {
  return {
    costs: Object.fromEntries(
      COST_BUCKETS.map((bucket) => [
        bucket,
        { ...ledger.costs[bucket], items: ledger.costs[bucket].items.map((item) => ({ ...item })) },
      ]),
    ) as CostLedger,
    time: {
      founderHours: ledger.time.founderHours,
      recurringMonthlyHours: ledger.time.recurringMonthlyHours,
      elapsedDays: ledger.time.elapsedDays,
      criticalPathDays: ledger.time.criticalPathDays,
      tracks: Object.fromEntries(
        TIME_TRACKS.map((track) => [track, { ...ledger.time.tracks[track] }]),
      ) as TimeTracks,
    },
    todos: ledger.todos.map((todo) => ({ ...todo })),
  }
}

function recalculateTimeTotals(ledger: QuizLedger, effectiveHoursPerDay: number): void {
  const dailyHours = effectiveHoursPerDay > 0 ? effectiveHoursPerDay : 6
  ledger.time.elapsedDays = ledger.time.founderHours / dailyHours
    + TIME_TRACKS.reduce((total, track) => {
      const item = ledger.time.tracks[track]
      return total + item.blockingWaitDays + item.nonBlockingWaitDays
    }, 0)
  ledger.time.criticalPathDays = Math.max(
    0,
    ...TIME_TRACKS.map((track) => {
      const item = ledger.time.tracks[track]
      const workDays = item.founderHours / dailyHours
      return item.blockingWaitDays + Math.max(workDays, item.nonBlockingWaitDays)
    }),
  )
}

function readConditionValue(
  condition: FactCondition | MetricCondition,
  facts: Record<string, ScalarValue>,
  metrics: Record<string, ScalarValue>,
): { exists: boolean; value: ScalarValue | undefined } {
  if ('fact' in condition) {
    return { exists: Object.prototype.hasOwnProperty.call(facts, condition.fact), value: facts[condition.fact] }
  }
  return { exists: Object.prototype.hasOwnProperty.call(metrics, condition.metric), value: metrics[condition.metric] }
}

function evaluateAtom(
  condition: FactCondition | MetricCondition,
  facts: Record<string, ScalarValue>,
  metrics: Record<string, ScalarValue>,
): TruthValue {
  const resolved = readConditionValue(condition, facts, metrics)
  if (condition.exists !== undefined) return resolved.exists === condition.exists
  if (!resolved.exists) return 'unknown'
  if (condition.oneOf) return condition.oneOf.some((value) => Object.is(value, resolved.value))
  if ('equals' in condition) return Object.is(condition.equals, resolved.value)
  return Boolean(resolved.value)
}

export function evaluateCondition(
  condition: Condition | undefined,
  facts: Record<string, ScalarValue>,
  metrics: Record<string, ScalarValue> = {},
): TruthValue {
  if (!condition) return true
  if ('all' in condition) {
    const values = condition.all.map((entry) => evaluateCondition(entry, facts, metrics))
    if (values.includes(false)) return false
    return values.includes('unknown') ? 'unknown' : true
  }
  if ('any' in condition) {
    const values = condition.any.map((entry) => evaluateCondition(entry, facts, metrics))
    if (values.includes(true)) return true
    return values.includes('unknown') ? 'unknown' : false
  }
  if ('not' in condition) {
    const value = evaluateCondition(condition.not, facts, metrics)
    return value === 'unknown' ? value : !value
  }
  return evaluateAtom(condition, facts, metrics)
}

function questionById(quiz: QuizDefinition, questionId: string): QuizQuestion {
  const question = quiz.questions.find((candidate) => candidate.id === questionId)
  if (!question) throw new Error(`Unknown question: ${questionId}`)
  return question
}

function sortedQuestions(quiz: QuizDefinition): QuizQuestion[] {
  return [...quiz.questions].sort((left, right) => left.number - right.number)
}

function nextApplicableQuestion(
  quiz: QuizDefinition,
  startQuestionId: string | undefined,
  afterNumber: number | undefined,
  facts: Record<string, ScalarValue>,
  metrics: Record<string, ScalarValue>,
): QuizQuestion | null {
  const ordered = sortedQuestions(quiz)
  const startIndex = startQuestionId
    ? ordered.findIndex((question) => question.id === startQuestionId)
    : ordered.findIndex((question) => question.number > (afterNumber ?? Number.NEGATIVE_INFINITY))
  if (startIndex < 0) {
    if (startQuestionId) throw new Error(`Unknown next question: ${startQuestionId}`)
    return null
  }
  for (let index = startIndex; index < ordered.length; index += 1) {
    const question = ordered[index]
    if (evaluateCondition(question.appliesWhen, facts, metrics) === true) return question
  }
  return null
}

function scoreDimensionFromMetric(key: string): ScoreDimension | null {
  const normalized = key.replace(/^score[.:]/, '')
  return SCORE_DIMENSIONS.includes(normalized as ScoreDimension) ? (normalized as ScoreDimension) : null
}

function applyEffect(
  quiz: QuizDefinition,
  state: QuizState,
  question: QuizQuestion,
  option: QuizOption,
  effect: Effect,
): void {
  if (effect.type === 'set-fact') {
    state.facts[effect.key] = effect.value
    return
  }
  if (effect.type === 'money') {
    const bucket = state.ledger.costs[effect.bucket]
    const isCny = !effect.currency || effect.currency === 'CNY'
    const knownAmount = typeof effect.amount === 'number' && Number.isFinite(effect.amount)
    bucket.items.push({
      id: effect.id,
      questionId: question.id,
      optionId: option.id,
      label: effect.label,
      amount: knownAmount ? (effect.amount as number) : null,
      currency: effect.currency ?? 'CNY',
      sourceType: effect.sourceType,
      chargeTiming: effect.chargeTiming,
      refundable: effect.refundable,
      priceDate: effect.priceDate,
    })
    if (knownAmount && isCny) bucket.totalCny += effect.amount as number
    if (!knownAmount || !isCny) bucket.hasUnknownAmount = true
    return
  }
  if (effect.type === 'remove-money') {
    const bucket = state.ledger.costs[effect.bucket]
    const hasSelector = Boolean(
      effect.itemId || effect.sourceQuestionId || effect.sourceOptionId || effect.labelContains,
    )
    if (!hasSelector) throw new Error('remove-money requires at least one line-item selector.')
    bucket.items = bucket.items.filter((item) => {
      const matches =
        (!effect.itemId || item.id === effect.itemId) &&
        (!effect.sourceQuestionId || item.questionId === effect.sourceQuestionId) &&
        (!effect.sourceOptionId || item.optionId === effect.sourceOptionId) &&
        (!effect.labelContains || item.label.includes(effect.labelContains))
      return !matches
    })
    bucket.totalCny = bucket.items.reduce(
      (sum, item) => sum + (item.currency === 'CNY' && item.amount !== null ? item.amount : 0),
      0,
    )
    bucket.hasUnknownAmount = bucket.items.some((item) => item.amount === null || item.currency !== 'CNY')
    return
  }
  if (effect.type === 'effort') {
    const track = state.ledger.time.tracks[effect.track]
    if (effect.bucket === 'founderHours') {
      state.ledger.time.founderHours += effect.hours
      track.founderHours += effect.hours
    } else {
      state.ledger.time.recurringMonthlyHours += effect.hours
      track.recurringMonthlyHours += effect.hours
    }
    recalculateTimeTotals(state.ledger, quiz.definition.effectiveHoursPerDay)
    return
  }
  if (effect.type === 'wait') {
    const track = state.ledger.time.tracks[effect.track]
    if (effect.blocking) track.blockingWaitDays += effect.days
    else track.nonBlockingWaitDays += effect.days
    recalculateTimeTotals(state.ledger, quiz.definition.effectiveHoursPerDay)
    return
  }
  if (effect.type === 'todo') {
    if (!state.ledger.todos.some((todo) => todo.id === effect.id)) {
      state.ledger.todos.push({
        id: effect.id,
        label: effect.label,
        timing: effect.timing ?? 'before-launch',
        questionId: question.id,
        optionId: option.id,
      })
    }
    return
  }
  const scoreDimension = scoreDimensionFromMetric(effect.key)
  if (scoreDimension && typeof effect.value === 'number') {
    state.awardedScore[scoreDimension] += effect.value
    state.metrics[`score.${scoreDimension}`] = state.awardedScore[scoreDimension]
    return
  }
  const previous = state.metrics[effect.key]
  if (effect.mode === 'add' && typeof previous === 'number' && typeof effect.value === 'number') {
    state.metrics[effect.key] = previous + effect.value
  } else if (effect.mode === 'max' && typeof previous === 'number' && typeof effect.value === 'number') {
    state.metrics[effect.key] = Math.max(previous, effect.value)
  } else {
    state.metrics[effect.key] = effect.value
  }
}

function blankState(currentQuestionId: string | null): QuizState {
  return {
    phase: currentQuestionId ? 'playing' : 'completed',
    currentQuestionId,
    history: [],
    facts: {},
    metrics: {},
    awardedScore: zeroScore(),
    ledger: createEmptyLedger(),
    result: null,
  }
}

function replayHistory(quiz: QuizDefinition, history: AnswerRecord[]): QuizState {
  const first = nextApplicableQuestion(quiz, quiz.definition.startQuestionId, undefined, {}, {})
  const state = blankState(first?.id ?? null)

  for (const answer of history) {
    if (state.phase !== 'playing' || !state.currentQuestionId) {
      throw new Error(`Answer history continues after the run ended at ${answer.questionId}.`)
    }
    if (answer.questionId !== state.currentQuestionId) {
      throw new Error(`Invalid answer path: expected ${state.currentQuestionId}, received ${answer.questionId}.`)
    }
    const question = questionById(quiz, answer.questionId)
    const option = question.options.find((candidate) => candidate.id === answer.optionId)
    if (!option) throw new Error(`Unknown option ${answer.optionId} for question ${question.id}.`)

    state.history.push({ ...answer })
    for (const effect of option.effects) applyEffect(quiz, state, question, option, effect)

    if (option.outcome === 'exit') {
      state.phase = 'exited'
      state.currentQuestionId = null
      continue
    }
    if (option.outcome === 'result') {
      state.phase = 'completed'
      state.currentQuestionId = null
      continue
    }

    const next = nextApplicableQuestion(
      quiz,
      option.nextQuestionId ?? question.defaultNextQuestionId,
      question.number,
      state.facts,
      state.metrics,
    )
    state.currentQuestionId = next?.id ?? null
    state.phase = next ? 'playing' : 'completed'
  }

  if (state.phase !== 'playing') state.result = buildResult(quiz, state)
  return state
}

/** Starts a fresh playable run. */
export function restartGame(quiz: QuizDefinition): QuizState {
  return replayHistory(quiz, [])
}

export function chooseOption(quiz: QuizDefinition, state: QuizState, optionId: string): QuizState {
  if (state.phase !== 'playing' || !state.currentQuestionId) {
    throw new Error('Only a playing run can accept an option.')
  }
  const question = questionById(quiz, state.currentQuestionId)
  if (!question.options.some((option) => option.id === optionId)) {
    throw new Error(`Unknown option ${optionId} for question ${question.id}.`)
  }
  return replayHistory(quiz, [...state.history, { questionId: question.id, optionId }])
}

/** Removes the latest answer and replays every remaining answer from an empty state. */
export function goBack(quiz: QuizDefinition, state: QuizState): QuizState {
  if (state.history.length === 0) return state
  return replayHistory(quiz, state.history.slice(0, -1))
}

function configuredNextQuestionId(quiz: QuizDefinition, question: QuizQuestion, option: QuizOption): string | null {
  if (option.outcome) return null
  if (option.nextQuestionId) return option.nextQuestionId
  if (question.defaultNextQuestionId) return question.defaultNextQuestionId
  return sortedQuestions(quiz).find((candidate) => candidate.number > question.number)?.id ?? null
}

function collectReachableQuestionIds(
  quiz: QuizDefinition,
  starts: string[],
  state: QuizState,
): Set<string> {
  const reached = new Set<string>()
  const traversed = new Set<string>()
  const queue = [...starts]
  while (queue.length > 0) {
    const questionId = queue.shift()
    if (!questionId || traversed.has(questionId)) continue
    traversed.add(questionId)
    const question = questionById(quiz, questionId)
    if (evaluateCondition(question.appliesWhen, state.facts, state.metrics) !== false) reached.add(question.id)
    for (const option of question.options) {
      const nextId = configuredNextQuestionId(quiz, question, option)
      if (nextId && !traversed.has(nextId)) queue.push(nextId)
    }
  }
  return reached
}

function eligibleQuestionIds(quiz: QuizDefinition, state: QuizState): Set<string> {
  const eligible = new Set(state.history.map((answer) => answer.questionId))
  if (state.phase === 'completed') return eligible

  if (state.phase === 'playing' && state.currentQuestionId) {
    for (const id of collectReachableQuestionIds(quiz, [state.currentQuestionId], state)) eligible.add(id)
    return eligible
  }

  const exitAnswer = state.history[state.history.length - 1]
  if (!exitAnswer) return eligible
  const exitQuestion = questionById(quiz, exitAnswer.questionId)
  const futureStarts = exitQuestion.options
    .filter((option) => option.outcome !== 'exit')
    .map((option) => configuredNextQuestionId(quiz, exitQuestion, option))
    .filter((questionId): questionId is string => questionId !== null)
  for (const id of collectReachableQuestionIds(quiz, futureStarts, state)) eligible.add(id)
  return eligible
}

function computeScore(quiz: QuizDefinition, state: QuizState): ScoreResult {
  const available = zeroScore()
  const eligible = eligibleQuestionIds(quiz, state)
  for (const question of quiz.questions) {
    if (!eligible.has(question.id)) continue
    for (const dimension of SCORE_DIMENSIONS) available[dimension] += question.scoreWeight[dimension] ?? 0
  }

  const dimensions = Object.fromEntries(
    SCORE_DIMENSIONS.map((dimension) => {
      const cap = quiz.definition.scoreCaps[dimension]
      const maximum = available[dimension]
      const earned = Math.min(Math.max(state.awardedScore[dimension], 0), maximum)
      const score = maximum > 0 ? Math.round(((cap * earned) / maximum) * 10) / 10 : 0
      return [dimension, { earnedWeight: earned, availableWeight: maximum, cap, score }]
    }),
  ) as Record<ScoreDimension, ScoreDimensionResult>
  const total = Math.min(100, Math.max(0, Math.round(SCORE_DIMENSIONS.reduce((sum, key) => sum + dimensions[key].score, 0))))
  return { dimensions, total }
}

function resolveExitTitle(quiz: QuizDefinition, state: QuizState): string {
  const lastAnswer = state.history[state.history.length - 1]
  if (lastAnswer) {
    const option = questionById(quiz, lastAnswer.questionId).options.find((candidate) => candidate.id === lastAnswer.optionId)
    if (option?.exitTitle) return option.exitTitle
  }
  const configured = quiz.resultRules?.exitTitles?.find(
    (rule) => evaluateCondition(rule.when, state.facts, state.metrics) === true,
  )
  if (configured) return configured.title
  const paid = state.ledger.costs.paidSunk.totalCny
  if (paid === 0) return '清醒止损大师'
  if (paid <= 1000) return '及时刹车工程师'
  return '沉没成本收藏家'
}

function resolveScoreTitle(quiz: QuizDefinition, total: number): ResultTitleBand {
  const bands = quiz.resultRules?.titleBands?.length ? quiz.resultRules.titleBands : DEFAULT_TITLE_BANDS
  return bands.find((band) => total >= band.min && total <= band.max) ?? bands[bands.length - 1] ?? DEFAULT_TITLE_BANDS[0]
}

export function buildResult(quiz: QuizDefinition, state: QuizState): QuizResult {
  const score = computeScore(quiz, state)
  const exited = state.phase === 'exited'
  const scoreTitle = resolveScoreTitle(quiz, score.total)
  const badgeRules = [...(quiz.resultRules?.badges ?? [])].sort(
    (left, right) => (right.priority ?? 0) - (left.priority ?? 0),
  )
  const badges = badgeRules
    .filter((rule) => evaluateCondition(rule.when, state.facts, state.metrics) === true)
    .slice(0, 3)
    .map(({ id, label }) => ({ id, label }))
  const lastAnswer = state.history[state.history.length - 1]
  return {
    outcome: exited ? 'exited' : 'completed',
    answeredCount: state.history.length,
    stoppedAtQuestionId: exited ? lastAnswer?.questionId ?? null : null,
    title: exited ? resolveExitTitle(quiz, state) : scoreTitle.title,
    titleKind: exited ? 'exit' : 'score',
    conclusion: exited ? '' : scoreTitle.conclusion ?? '',
    badges,
    score,
    ledger: cloneLedger(state.ledger),
    facts: { ...state.facts },
    metrics: { ...state.metrics },
    topTodos: state.ledger.todos.slice(0, 3).map((todo) => ({ ...todo })),
  }
}

export function validateQuizDefinition(quiz: QuizDefinition): string[] {
  const errors: string[] = []
  const questionIds = new Set<string>()
  const numbers = new Set<number>()
  const sceneIds = new Set<string>()
  const desktopAssets = new Set<string>()
  const mobileAssets = new Set<string>()
  const knownIds = new Set(quiz.questions.map((question) => question.id))

  if (!knownIds.has(quiz.definition.startQuestionId)) errors.push('definition.startQuestionId does not exist.')
  if (quiz.definition.effectiveHoursPerDay <= 0) errors.push('effectiveHoursPerDay must be greater than zero.')
  const capTotal = SCORE_DIMENSIONS.reduce((sum, dimension) => sum + quiz.definition.scoreCaps[dimension], 0)
  if (capTotal !== 100) errors.push(`scoreCaps must total 100, received ${capTotal}.`)

  for (const question of quiz.questions) {
    if (questionIds.has(question.id)) errors.push(`Duplicate question id: ${question.id}.`)
    if (numbers.has(question.number)) errors.push(`Duplicate question number: ${question.number}.`)
    if (sceneIds.has(question.visual.sceneId)) errors.push(`Duplicate scene id: ${question.visual.sceneId}.`)
    if (desktopAssets.has(question.visual.desktopAsset)) {
      errors.push(`Duplicate desktop asset: ${question.visual.desktopAsset}.`)
    }
    if (mobileAssets.has(question.visual.mobileAsset)) {
      errors.push(`Duplicate mobile asset: ${question.visual.mobileAsset}.`)
    }
    questionIds.add(question.id)
    numbers.add(question.number)
    sceneIds.add(question.visual.sceneId)
    desktopAssets.add(question.visual.desktopAsset)
    mobileAssets.add(question.visual.mobileAsset)
    if (question.visual.frames.join(',') !== 'idle,action,resolved,quit') {
      errors.push(`Question ${question.id} must declare idle/action/resolved/quit frames in order.`)
    }
    if (question.options.length === 0) errors.push(`Question ${question.id} has no options.`)
    const optionIds = new Set<string>()
    for (const option of question.options) {
      if (optionIds.has(option.id)) errors.push(`Duplicate option id ${option.id} in ${question.id}.`)
      optionIds.add(option.id)
      if (option.nextQuestionId && !knownIds.has(option.nextQuestionId)) {
        errors.push(`Unknown nextQuestionId ${option.nextQuestionId} in ${question.id}/${option.id}.`)
      }
      if (option.outcome && option.nextQuestionId) {
        errors.push(`Option ${question.id}/${option.id} cannot define both outcome and nextQuestionId.`)
      }
      for (const effect of option.effects) {
        if (effect.type === 'money' && typeof effect.amount === 'number' && effect.amount < 0) {
          errors.push(`Negative money effect in ${question.id}/${option.id}.`)
        }
        if (
          effect.type === 'remove-money' &&
          !effect.itemId &&
          !effect.sourceQuestionId &&
          !effect.sourceOptionId &&
          !effect.labelContains
        ) {
          errors.push(`remove-money in ${question.id}/${option.id} requires a selector.`)
        }
        if (effect.type === 'effort' && effect.hours < 0) errors.push(`Negative effort in ${question.id}/${option.id}.`)
        if (effect.type === 'wait' && effect.days < 0) errors.push(`Negative wait in ${question.id}/${option.id}.`)
      }
    }
    for (const [optionId, variant] of Object.entries(question.visual.optionVariants ?? {})) {
      if (!optionIds.has(optionId)) {
        errors.push(`Unknown option visual variant ${optionId} in ${question.id}.`)
      }
      for (const frame of ['action', 'resolved'] as const) {
        const frameAssets = variant[frame]
        if (frameAssets && (!frameAssets.desktopAsset || !frameAssets.mobileAsset)) {
          errors.push(`Option visual variant ${question.id}/${optionId}/${frame} must declare both desktop and mobile assets.`)
        }
      }
      if (!variant.action && !variant.resolved && !variant.overlay) {
        errors.push(`Option visual variant ${question.id}/${optionId} must declare assets or an overlay.`)
      }
      if (variant.overlay && !variant.overlay.title.trim()) {
        errors.push(`Option visual overlay ${question.id}/${optionId} must have a title.`)
      }
      if (
        variant.overlay?.tone &&
        !['neutral', 'brand', 'success', 'warning'].includes(variant.overlay.tone)
      ) {
        errors.push(`Unknown option visual overlay tone in ${question.id}/${optionId}.`)
      }
    }
    if (question.defaultNextQuestionId && !knownIds.has(question.defaultNextQuestionId)) {
      errors.push(`Unknown defaultNextQuestionId ${question.defaultNextQuestionId} in ${question.id}.`)
    }
  }
  return errors
}

export function assertValidQuizDefinition(quiz: QuizDefinition): void {
  const errors = validateQuizDefinition(quiz)
  if (errors.length) throw new Error(`Invalid quiz definition:\n- ${errors.join('\n- ')}`)
}

export function formatCurrency(amount: number, currency = 'CNY'): string {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(amount)
}

function finiteNumber(value: ScalarValue | undefined): number | null {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export function optionMonthlyPrice(option: QuizOption): number | null {
  const effect = option.effects.find(
    (candidate): candidate is MetricEffect =>
      candidate.type === 'metric'
      && candidate.key === 'monthlyPriceCny',
  )
  return effect ? finiteNumber(effect.value) : null
}

export function optionMonthlyAverageInvestmentCny(option: QuizOption): number | null {
  let firstYearInvestmentCny = 0
  let hasFixedFirstYearInvestment = false
  for (const effect of option.effects) {
    if (
      effect.type !== 'money'
      || (effect.bucket !== 'paidSunk' && effect.bucket !== 'firstYearCommitted')
    ) continue
    if (
      effect.amount === null
      || effect.amount === undefined
      || (effect.currency ?? 'CNY') !== 'CNY'
    ) return null
    firstYearInvestmentCny += effect.amount
    hasFixedFirstYearInvestment = true
  }
  return hasFixedFirstYearInvestment ? firstYearInvestmentCny / 12 : null
}

export function summarizeFinancials(
  ledger: QuizLedger,
  metrics: Record<string, ScalarValue> = {},
  monthlyPriceOverride?: number,
): FinancialSummary {
  const firstYearInvestmentCny =
    ledger.costs.paidSunk.totalCny
    + ledger.costs.firstYearCommitted.totalCny
    + ledger.costs.capitalRequirement.totalCny
  const users = finiteNumber(metrics.users)
  const monthlyPriceCny = Number.isFinite(monthlyPriceOverride)
    ? monthlyPriceOverride ?? null
    : finiteNumber(metrics.monthlyPriceCny)
  const monthlyRevenueCny = users !== null && monthlyPriceCny !== null
    ? users * monthlyPriceCny
    : null

  return {
    firstYearInvestmentCny,
    monthlyAverageInvestmentCny: firstYearInvestmentCny / 12,
    users,
    monthlyPriceCny,
    monthlyRevenueCny,
    annualRevenueCny: monthlyRevenueCny === null ? null : monthlyRevenueCny * 12,
    monthlyGrossProfitEstimateCny:
      monthlyRevenueCny === null
        ? null
        : monthlyRevenueCny - (firstYearInvestmentCny / 12),
    hasUnpricedFirstYearInvestment:
      ledger.costs.paidSunk.hasUnknownAmount
      || ledger.costs.firstYearCommitted.hasUnknownAmount
      || ledger.costs.capitalRequirement.hasUnknownAmount
      || ledger.costs.pendingQuote.items.length > 0
      || ledger.costs.variable.hasUnknownAmount,
  }
}

function formatCostBucket(bucket: CostBucketLedger): string {
  const foreignTotals = new Map<string, number>()
  let hasUnpricedItem = false
  for (const item of bucket.items) {
    if (item.amount === null) {
      hasUnpricedItem = true
      continue
    }
    if (item.currency !== 'CNY') {
      foreignTotals.set(item.currency, (foreignTotals.get(item.currency) ?? 0) + item.amount)
    }
  }

  const parts = [formatCurrency(bucket.totalCny)]
  for (const [currency, amount] of foreignTotals) {
    try {
      parts.push(formatCurrency(amount, currency))
    } catch {
      parts.push(`${currency} ${amount}`)
    }
  }
  if (hasUnpricedItem) parts.push('待确认')
  return parts.join(' + ')
}

export function interpolateQuizText(
  value: string,
  ledger: QuizLedger,
  metrics: Record<string, ScalarValue> = {},
  monthlyPriceOverride?: number,
  optionMonthlyAverageInvestmentOverride?: number,
): string {
  const summary = summarizeFinancials(ledger, metrics, monthlyPriceOverride)
  const amount = formatCurrency(summary.firstYearInvestmentCny)
  const users = summary.users === null
    ? '—'
    : new Intl.NumberFormat('zh-CN').format(summary.users)
  const monthlyGrossProfit = summary.monthlyGrossProfitEstimateCny === null
    ? '—'
    : formatCurrency(summary.monthlyGrossProfitEstimateCny)
  const optionMonthlyAverageInvestment = Number.isFinite(optionMonthlyAverageInvestmentOverride)
    ? formatCurrency(optionMonthlyAverageInvestmentOverride ?? 0)
    : '—'

  return [
    ['{{spent}}', amount],
    ['{{users}}', users],
    ['{{monthlyGrossProfit}}', monthlyGrossProfit],
    ['{{optionMonthlyAverageInvestment}}', optionMonthlyAverageInvestment],
    ['x（前面累加金额）', amount],
    ['x元（前面计算）', amount],
    ['xx元', amount],
  ].reduce((text, [token, replacement]) => text.split(token).join(replacement), value)
}

export function formatLedger(ledger: QuizLedger): Record<CostBucket, string> & { founderTime: string; elapsedTime: string; criticalPath: string } {
  const formatted = Object.fromEntries(
    COST_BUCKETS.map((bucket) => {
      const data = ledger.costs[bucket]
      return [bucket, formatCostBucket(data)]
    }),
  ) as Record<CostBucket, string>
  return {
    ...formatted,
    founderTime: `${ledger.time.founderHours} 小时 + ${ledger.time.recurringMonthlyHours} 小时/月`,
    elapsedTime: `${Math.round(ledger.time.elapsedDays * 10) / 10} 天`,
    criticalPath: `${Math.round(ledger.time.criticalPathDays * 10) / 10} 天`,
  }
}
