import {
  formatCurrency,
  formatLedger,
  interpolateQuizText,
  optionMonthlyAverageInvestmentCny,
  optionMonthlyPrice,
  summarizeFinancials,
  type OptionVisualOverlay,
  type OptionVisualVariant,
  type QuizDefinition,
  type QuizQuestion,
  type QuizState,
} from '../../../packages/game-core/src/index.ts'
import { pixelChoiceThemeFor } from './pixel-choice-themes.ts'
import { assetUrl, resolvePixelVisual, type PixelVisualOutcome } from './pixel-scenes.ts'

export interface PixelTransition {
  optionId: string
  optionLabel: string
  outcome: PixelVisualOutcome
  visualOutcome?: string
  nextState: QuizState
}

type PixelSceneMode = 'intro' | 'question' | 'result' | 'victory'
type PixelSceneFrame = 'idle' | 'action' | 'resolved' | 'quit'

const SCORE_LABELS = {
  execution: '执行力',
  compliance: '合规判断',
  business: '商业闭环',
  costHealth: '成本健康度',
} as const

const COST_LABELS = {
  variable: '变动成本',
  pendingQuote: '待报价',
  capitalRequirement: '注册资本门槛',
} as const

export const PIXEL_OPTION_FEEDBACK_DURATION_MS = 720
export const PIXEL_PASS_DURATION_MS = 1440

const escapeHtml = (value: string): string =>
  value.replace(/[&<>'"]/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#039;',
    '"': '&quot;',
  })[character] ?? character)

function interpolateText(
  value: string,
  gameState: QuizState,
  monthlyPriceOverride?: number,
  optionMonthlyAverageInvestmentOverride?: number,
): string {
  return interpolateQuizText(
    value,
    pixelAccountingLedger(gameState),
    gameState.result?.metrics ?? gameState.metrics,
    monthlyPriceOverride,
    optionMonthlyAverageInvestmentOverride,
  )
}

export type PixelHudKind = 'monthly' | 'annual' | 'days'

export function compactCurrency(value: number, hasUnknownAmount: boolean): string {
  return `${formatCurrency(value)}${hasUnknownAmount ? '+待确认' : ''}`
}

/**
 * 移动端 HUD 格子宽度有限，完整金额必然被 ellipsis 截断成
 * “¥3,272.3+待…”这种坏掉的样子。紧凑位做轻量压缩：千位去小数、
 * 待确认后缀缩短为 +。单位统一为元（不混用万缩写，避免月均 ¥3,272
 * 与首年 ¥3.9万 并排时单位打架）。完整值仍保留在 --full 位与 aria/title 里。
 */
export function compactHudCurrency(value: number, hasUnknownAmount: boolean): string {
  const abs = Math.abs(value)
  const body = abs >= 1_000
    ? `¥${new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(abs)}`
    : `¥${(Math.round(abs * 10) / 10).toFixed(1)}`
  return `${value < 0 ? '-' : ''}${body}${hasUnknownAmount ? '+' : ''}`
}

export function pixelAccountingLedger(gameState: QuizState): QuizState['ledger'] {
  return gameState.result?.ledger ?? gameState.ledger
}

export function changedHudKinds(beforeState: QuizState, afterState: QuizState): Set<PixelHudKind> {
  const before = pixelAccountingLedger(beforeState)
  const after = pixelAccountingLedger(afterState)
  const changed = new Set<PixelHudKind>()
  if (
    before.costs.paidSunk.totalCny !== after.costs.paidSunk.totalCny
    || before.costs.paidSunk.hasUnknownAmount !== after.costs.paidSunk.hasUnknownAmount
    || before.costs.firstYearCommitted.totalCny !== after.costs.firstYearCommitted.totalCny
    || before.costs.firstYearCommitted.hasUnknownAmount !== after.costs.firstYearCommitted.hasUnknownAmount
  ) {
    changed.add('monthly')
    changed.add('annual')
  }
  if (before.time.elapsedDays !== after.time.elapsedDays) changed.add('days')
  return changed
}

function pixelLedgerMarkup(gameState: QuizState, changed = new Set<PixelHudKind>()): string {
  const rawLedger = pixelAccountingLedger(gameState)
  const financials = summarizeFinancials(rawLedger, gameState.result?.metrics ?? gameState.metrics)
  const days = Math.round(rawLedger.time.elapsedDays * 10) / 10
  const cells = [
    {
      kind: 'monthly' as const,
      icon: '月',
      label: '月均投入',
      value: compactCurrency(financials.monthlyAverageInvestmentCny, financials.hasUnpricedFirstYearInvestment),
      compactValue: compactHudCurrency(financials.monthlyAverageInvestmentCny, financials.hasUnpricedFirstYearInvestment),
    },
    {
      kind: 'annual' as const,
      icon: '年',
      label: '首年投入',
      value: compactCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment),
      compactValue: compactHudCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment),
    },
    {
      kind: 'days' as const,
      icon: '天',
      label: '累计天数',
      value: `${days} 天`,
      compactValue: `${days}天`,
    },
  ]

  return `
    <dl class="pixel-hud" data-pixel-hud aria-label="当前经营账本">
      ${cells.map((cell) => `
        <div class="pixel-hud__cell pixel-hud__cell--${cell.kind}${changed.has(cell.kind) ? ' pixel-hud__cell--changed' : ''}" data-pixel-hud-cell="${cell.kind}">
          <dt><span class="pixel-hud__icon" aria-hidden="true">${cell.icon}</span>${cell.label}</dt>
          <dd title="${escapeHtml(cell.value)}" aria-label="${escapeHtml(`${cell.label}：${cell.value}`)}">
            <span class="pixel-hud__value pixel-hud__value--full" aria-hidden="true">${escapeHtml(cell.value)}</span>
            <span class="pixel-hud__value pixel-hud__value--compact" aria-hidden="true">${escapeHtml(cell.compactValue)}</span>
          </dd>
        </div>
      `).join('')}
    </dl>
  `
}

function sceneMarkup(
  mode: PixelSceneMode,
  frame: PixelSceneFrame,
  sceneId: string,
  desktopAsset: string,
  mobileAsset: string,
  sequence = false,
  optionVisual?: { optionId: string; overlay?: OptionVisualOverlay; variant: OptionVisualVariant },
): string {
  const optionFrameMarkup = optionVisual
    ? (['action', 'resolved'] as const).map((frame) => {
      const assets = optionVisual.variant[frame]
      if (!assets) return ''
      return `
        <picture class="pixel-world__option-frame pixel-world__option-frame--${frame}" data-option-visual-frame="${frame}">
          <source media="(max-width: 600px)" srcset="${escapeHtml(assetUrl(assets.mobileAsset))}" />
          <img src="${escapeHtml(assetUrl(assets.desktopAsset))}" alt="" width="768" height="512" decoding="async" />
        </picture>
      `
    }).join('')
    : ''
  return `
    <div class="pixel-world pixel-world--illustrated pixel-world--${mode} pixel-world--frame-${frame} ${sequence ? 'pixel-world--sequence-accept' : ''}" data-pixel-scene="${mode}" data-scene-id="${escapeHtml(sceneId)}" data-storyboard-frame="${frame}" data-visual-source="${optionVisual ? 'option' : 'question'}"${optionVisual ? ` data-option-visual="${escapeHtml(optionVisual.optionId)}"` : ''} aria-hidden="true">
      <div class="pixel-world__art">
        <picture>
          <source media="(max-width: 600px)" srcset="${escapeHtml(assetUrl(mobileAsset))}" />
          <img src="${escapeHtml(assetUrl(desktopAsset))}" alt="" width="1536" height="1024" decoding="async" fetchpriority="high" />
        </picture>
      </div>
      ${optionFrameMarkup ? `<div class="pixel-world__option-art">${optionFrameMarkup}</div>` : ''}
      <div class="pixel-world__grade"></div>
    </div>
  `
}

function stageMarkup(scene: string, overlay = '', modifier = ''): string {
  return `
    <div class="pixel-stage ${modifier}" data-pixel-stage>
      ${scene}
      ${overlay}
    </div>
  `
}

function introSceneMarkup(): string {
  const introAsset = 'assets/pixel/storyboards/stage-00.webp'
  return sceneMarkup('intro', 'idle', 'LOBBY', introAsset, introAsset)
}

function progressMarkup(question: QuizQuestion, count: number): string {
  const percent = Math.round((question.number / count) * 100)
  return `
    <div class="pixel-progress" data-pixel-status-rail aria-label="闯关进度 ${question.number} / ${count}">
      <span>第 ${question.number} / ${count} 题</span>
      <div class="pixel-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function costCheckpointProgressMarkup(questionCount: number): string {
  const completedQuestions = Math.max(questionCount - 1, 0)
  const percent = questionCount > 0 ? Math.round((completedQuestions / questionCount) * 100) : 0
  return `
    <div class="pixel-progress" data-pixel-status-rail aria-label="成本确认，已完成 ${completedQuestions} / ${questionCount} 题">
      <span>成本确认 · ${completedQuestions} / ${questionCount}</span>
      <div class="pixel-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function optionFeedbackMarkup(
  transition: PixelTransition,
  overlay?: OptionVisualOverlay,
): string {
  const tone = overlay?.tone && ['brand', 'success', 'warning'].includes(overlay.tone)
    ? overlay.tone
    : 'neutral'
  const eyebrow = overlay?.eyebrow ?? '选择确认'
  const title = overlay?.title ?? transition.optionLabel
  return `
    <div class="pixel-option-feedback pixel-option-visual pixel-option-visual--${tone}" data-pixel-option-feedback data-pixel-transition data-option-visual-overlay data-selected-option="${escapeHtml(transition.optionId)}"${transition.visualOutcome ? ` data-visual-outcome="${escapeHtml(transition.visualOutcome)}"` : ''} role="status" aria-live="polite" aria-label="已选择 ${escapeHtml(transition.optionLabel)}" style="--pixel-transition-duration:${PIXEL_OPTION_FEEDBACK_DURATION_MS}ms">
      <img class="pixel-option-feedback__motion" src="assets/pixel/motion/choice-confirm.webp" alt="" width="160" height="80" aria-hidden="true" />
      <span class="pixel-option-feedback__copy">
        <small>${escapeHtml(eyebrow)}</small>
        <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
        ${overlay?.detail ? `<span>${escapeHtml(overlay.detail)}</span>` : ''}
      </span>
    </div>
  `
}

function optionsMarkup(question: QuizQuestion, gameState: QuizState, selectedOptionId?: string): string {
  const theme = pixelChoiceThemeFor(question.id)
  const themeStyle = [
    `--ticket-accent:${theme.accent}`,
    `--ticket-accent-dark:${theme.accentDark}`,
    `--ticket-paper:${theme.paper}`,
  ].join(';')
  return `
    <div class="pixel-choice-list" data-option-count="${question.options.length}" data-ticket-theme="${escapeHtml(question.id)}" data-ticket-pattern="${escapeHtml(theme.pattern)}" style="${themeStyle}" role="group" aria-label="${escapeHtml(theme.label)}，可选答案">
      ${question.options.map((option, index) => {
        const selected = selectedOptionId === option.id
        const optionMark = theme.optionMarks[option.id] ?? String(index + 1)
        return `
          <button class="pixel-choice-card${selected ? ' pixel-choice-card--selected' : ''}" type="button" data-option-id="${escapeHtml(option.id)}" data-ticket-mark="${escapeHtml(optionMark)}" data-choice-state="${selected ? 'selected' : 'idle'}" aria-pressed="${selected ? 'true' : 'false'}">
            <span class="pixel-choice-card__key" aria-hidden="true"><small>CHOICE</small><b>${String(index + 1).padStart(2, '0')}</b></span>
            <span class="pixel-choice-card__body">
              <span class="pixel-choice-card__meta" aria-hidden="true"><i>${escapeHtml(theme.ornament)}</i><span>${escapeHtml(theme.label)}</span></span>
              <strong>${escapeHtml(interpolateText(
                option.label,
                gameState,
                optionMonthlyPrice(option) ?? undefined,
                optionMonthlyAverageInvestmentCny(option) ?? undefined,
              ))}</strong>
            </span>
            <span class="pixel-choice-card__mark" aria-hidden="true">${escapeHtml(optionMark)}</span>
            <span class="pixel-choice-card__tear" aria-hidden="true"><i></i><i></i><i></i></span>
          </button>
        `
      }).join('')}
    </div>
    <div class="secondary-row">
      <button class="text-button" data-action="back" ${gameState.history.length === 0 ? 'disabled' : ''}>返回上一题重选</button>
      <span>键盘：1～${question.options.length} 选择</span>
    </div>
  `
}

function transitionMarkup(
  question: QuizQuestion,
  transition: PixelTransition,
  quiz: QuizDefinition,
): string {
  const quitting = transition.outcome === 'quit'
  const completing = transition.nextState.phase === 'completed'
  const interlude = quitting
    ? undefined
    : quiz.definition.interludes.find((item) => item.afterQuestionId === question.id)
  const confetti = completing
    ? Array.from({ length: 14 }, (_, index) => `<i style="--confetti-index:${index}"></i>`).join('')
    : ''

  return `
    <div class="pixel-pass pixel-pass--${quitting ? 'quit' : 'accept'}" data-pixel-transition="${quitting ? 'quit' : 'accept'}" role="status" aria-label="第 ${question.number} 题已选择" style="--pixel-transition-duration:${PIXEL_PASS_DURATION_MS}ms">
      <div class="pixel-pass__shade"></div>
      <div class="pixel-pass__seal" aria-hidden="true"><i></i></div>
      ${completing ? '<div class="pixel-pass__burst" aria-hidden="true"></div>' : ''}
      <div class="pixel-pass__confetti" aria-hidden="true">${confetti}</div>
      <div class="pixel-pass__copy">
        <span>第 ${question.number} / ${quiz.questions.length} 题</span>
        <strong>${escapeHtml(interlude?.title ?? (quitting ? '撤退已受理' : '正式上线'))}</strong>
        <p>${escapeHtml(transition.optionLabel)}</p>
        <small>${escapeHtml(interlude?.body ?? (quitting ? '已发生费用保留，不再新增承诺。' : '产品已完成最后一步，正在生成结算。'))}</small>
      </div>
    </div>
  `
}

function moneyRainMarkup(transition: PixelTransition | null): string {
  if (transition?.visualOutcome !== 'rich-confetti') return ''
  return `<div class="pixel-money-rain" aria-hidden="true">${Array.from({ length: 16 }, (_, index) => {
    const left = 2 + ((index * 17) % 94)
    const delay = (index % 5) * 35
    const drift = ((index % 3) - 1) * 24
    return `<i style="--money-left:${left}%;--money-delay:${delay}ms;--money-drift:${drift}px"></i>`
  }).join('')}</div>`
}

export function renderPixelIntro(gameState: QuizState): string {
  return `
    <div class="pixel-layout pixel-layout--intro">
      ${pixelLedgerMarkup(gameState)}
      ${introSceneMarkup()}
      <section class="pixel-dossier pixel-dossier--intro">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">A001 · 一人公司生存申请</p>
        <h1>一人公司<br /><em>生存模拟器</em></h1>
        <button class="button button--primary button--wide" data-action="start">进入办事大厅</button>
        <div class="pixel-dossier__footer">
          <small>娱乐化个人经验，不构成法律、财税或安全建议。</small>
        </div>
      </section>
    </div>
  `
}

export function renderPixelQuestion(
  gameState: QuizState,
  quiz: QuizDefinition,
  transition: PixelTransition | null,
): string {
  const question = quiz.questions.find((candidate) => candidate.id === gameState.currentQuestionId)
  if (!question) return ''
  const selectedVisualOptionId = transition?.outcome === 'resolved' ? transition.optionId : undefined
  const visual = resolvePixelVisual(question, selectedVisualOptionId)
  const frame: PixelSceneFrame = transition
    ? transition.outcome === 'quit' ? 'quit' : 'resolved'
    : 'idle'
  const quitting = transition?.outcome === 'quit'
  const completing = transition?.nextState.phase === 'completed'
  const interlude = transition
    ? quiz.definition.interludes.find((item) => item.afterQuestionId === question.id)
    : undefined
  const showFullTransition = Boolean(transition && (quitting || completing || interlude))
  const ledgerState = transition?.nextState ?? gameState

  return `
    <div class="pixel-layout pixel-layout--challenge ${transition ? 'pixel-layout--frozen' : ''}" data-selected-option="${escapeHtml(transition?.optionId ?? '')}" aria-busy="${transition ? 'true' : 'false'}">
      ${pixelLedgerMarkup(ledgerState, transition ? changedHudKinds(gameState, transition.nextState) : undefined)}
      ${progressMarkup(question, quiz.questions.length)}
      ${stageMarkup(
        sceneMarkup(
          'question',
          frame,
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          Boolean(transition && transition.outcome !== 'quit'),
          visual.source === 'option' && visual.optionId
            ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
            : undefined,
        ),
        `${moneyRainMarkup(transition)}${transition && showFullTransition
          ? transitionMarkup(question, transition, quiz)
          : transition
            ? optionFeedbackMarkup(transition, visual.overlay)
            : ''}`,
        'pixel-stage--question',
      )}
      <section class="pixel-dossier pixel-dossier--question" data-option-count="${question.options.length}" ${transition ? 'inert' : ''}>
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">${escapeHtml(visual.chapterLabel)} / ${escapeHtml(visual.sceneId)}</p>
        <h1>${escapeHtml(interpolateText(question.prompt, gameState))}</h1>
        <div class="pixel-dossier__controls">${optionsMarkup(question, gameState, transition?.optionId)}</div>
      </section>
    </div>
  `
}

export interface MonthlyBusinessProjection {
  users: number
  monthlyPrice: number
  theoreticalMonthlyRevenue: number
  monthlyAverageInvestment: number
  monthlyGrossProfitEstimate: number
  breakEvenUsers: number
  hasUnpricedFirstYearInvestment: boolean
}

export function monthlyBusinessProjection(gameState: QuizState): MonthlyBusinessProjection | null {
  const metrics = gameState.result?.metrics ?? gameState.metrics
  const ledger = pixelAccountingLedger(gameState)
  const financials = summarizeFinancials(ledger, metrics)
  if (
    financials.users === null
    || financials.monthlyPriceCny === null
    || financials.monthlyPriceCny <= 0
    || financials.monthlyRevenueCny === null
    || financials.monthlyGrossProfitEstimateCny === null
  ) return null

  return {
    users: financials.users,
    monthlyPrice: financials.monthlyPriceCny,
    theoreticalMonthlyRevenue: financials.monthlyRevenueCny,
    monthlyAverageInvestment: financials.monthlyAverageInvestmentCny,
    monthlyGrossProfitEstimate: financials.monthlyGrossProfitEstimateCny,
    breakEvenUsers: Math.ceil(financials.monthlyAverageInvestmentCny / financials.monthlyPriceCny),
    hasUnpricedFirstYearInvestment: financials.hasUnpricedFirstYearInvestment,
  }
}

export function renderPixelCostCheckpoint(gameState: QuizState, quiz: QuizDefinition): string {
  const pricingQuestion = quiz.questions.find((question) => question.id === 'Q24')
  if (!pricingQuestion) return renderPixelQuestion(gameState, quiz, null)

  const selectedPriceOptionId = [...gameState.history]
    .reverse()
    .find((answer) => answer.questionId === pricingQuestion.id)?.optionId
  const visual = resolvePixelVisual(pricingQuestion, selectedPriceOptionId)
  const fallbackFinancials = summarizeFinancials(
    pixelAccountingLedger(gameState),
    gameState.result?.metrics ?? gameState.metrics,
  )
  const projection = monthlyBusinessProjection(gameState) ?? {
    users: 0,
    monthlyPrice: 0,
    theoreticalMonthlyRevenue: 0,
    monthlyAverageInvestment: fallbackFinancials.monthlyAverageInvestmentCny,
    monthlyGrossProfitEstimate: -fallbackFinancials.monthlyAverageInvestmentCny,
    breakEvenUsers: 0,
    hasUnpricedFirstYearInvestment: fallbackFinancials.hasUnpricedFirstYearInvestment,
  }
  const formattedUsers = new Intl.NumberFormat('zh-CN').format(projection.users)
  const formattedPrice = formatCurrency(projection.monthlyPrice)
  const formattedRevenue = formatCurrency(projection.theoreticalMonthlyRevenue)
  const formattedMonthlyCost = formatCurrency(projection.monthlyAverageInvestment)
  const formattedDifference = `${projection.monthlyGrossProfitEstimate >= 0 ? '+' : '−'}${formatCurrency(Math.abs(projection.monthlyGrossProfitEstimate))}`
  const differenceTone = projection.monthlyGrossProfitEstimate >= 0 ? 'positive' : 'negative'
  const optionVisual = visual.source === 'option' && visual.optionId
    ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
    : undefined
  const costBoard = `
    <div class="pixel-cost-board" data-pixel-cost-board role="status" aria-label="毛利粗算：${formattedUsers} 个用户，每位每月 ${formattedPrice}，理论月收入 ${formattedRevenue}，首年总投入月均 ${formattedMonthlyCost}">
      <header><span>MONTHLY MARGIN CHECK</span><strong>每月毛利粗算</strong></header>
      <div class="pixel-cost-board__grid">
        <div><span>预计用户</span><strong>${escapeHtml(formattedUsers)}</strong></div>
        <div><span>用户月费</span><strong>${escapeHtml(formattedPrice)}</strong></div>
        <div><span>理论月收入</span><strong>${escapeHtml(formattedRevenue)}</strong></div>
        <div><span>首年总投入月均</span><strong>${escapeHtml(formattedMonthlyCost)}${projection.hasUnpricedFirstYearInvestment ? '<small> + 待确认</small>' : ''}</strong></div>
      </div>
      <p class="pixel-cost-board__difference pixel-cost-board__difference--${differenceTone}">
        <span>预计每月毛利（粗算）</span><strong>${escapeHtml(formattedDifference)}</strong>
      </p>
    </div>
  `

  return `
    <div class="pixel-layout pixel-layout--challenge pixel-layout--cost-checkpoint" data-pixel-cost-checkpoint>
      ${pixelLedgerMarkup(gameState)}
      ${costCheckpointProgressMarkup(quiz.questions.length)}
      ${stageMarkup(
        sceneMarkup(
          'question',
          'resolved',
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          false,
          optionVisual,
        ),
        costBoard,
        'pixel-stage--question pixel-stage--cost-check',
      )}
      <section class="pixel-dossier pixel-dossier--question pixel-cost-check" aria-labelledby="pixel-cost-check-title">
        <i class="pixel-dossier__clip" aria-hidden="true"></i>
        <p class="pixel-dossier__eyebrow">business / COST-CHECK</p>
        <h1 id="pixel-cost-check-title">预计 ${escapeHtml(formattedUsers)} 个用户，每位每月 ${escapeHtml(formattedPrice)}。首年总投入月均 ${escapeHtml(formattedMonthlyCost)}，确定继续吗？</h1>
        <p class="pixel-cost-check__note">预计每月毛利（粗算）＝理论月收入 − 首年总投入 ÷ 12；未扣模型用量、支付手续费、税费、获客和流失。</p>
        <div class="pixel-dossier__controls">
          <div class="pixel-choice-list" role="group" aria-label="成本确认选项">
            <button class="pixel-choice-card" type="button" data-action="confirm-cost-check">
              <span class="pixel-choice-card__key" aria-hidden="true">1</span>
              <strong>继续，去找第一百个用户</strong>
            </button>
            <button class="pixel-choice-card" type="button" data-action="recalculate-cost-check">
              <span class="pixel-choice-card__key" aria-hidden="true">2</span>
              <strong>返回重选价格</strong>
            </button>
          </div>
          <div class="secondary-row">
            <span>键盘：1 继续 · 2 重算</span>
          </div>
        </div>
      </section>
    </div>
  `
}

function scoreMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  return `
    <div class="pixel-score-grid" aria-label="四项评分">
      ${Object.entries(result.score.dimensions).map(([key, dimension]) => `
        <div class="pixel-score-grid__item">
          <span>${SCORE_LABELS[key as keyof typeof SCORE_LABELS]}</span>
          <strong>${dimension.score} / ${dimension.cap}</strong>
          <i aria-hidden="true"><b style="width:${Math.round((dimension.score / dimension.cap) * 100)}%"></b></i>
        </div>
      `).join('')}
    </div>
  `
}

function costSummaryMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  const ledger = pixelAccountingLedger(gameState)
  const formatted = formatLedger(ledger)
  const financials = summarizeFinancials(ledger, result.metrics)
  return `
    <dl class="pixel-result-ledger">
      <div><dt>月均投入</dt><dd>${escapeHtml(compactCurrency(financials.monthlyAverageInvestmentCny, financials.hasUnpricedFirstYearInvestment))}</dd></div>
      <div><dt>首年总投入</dt><dd>${escapeHtml(compactCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment))}</dd></div>
      ${Object.entries(COST_LABELS).map(([key, label]) => `<div><dt>${label}</dt><dd>${escapeHtml(formatted[key as keyof typeof COST_LABELS])}</dd></div>`).join('')}
      <div><dt>累计天数</dt><dd>${escapeHtml(formatted.elapsedTime)}</dd></div>
    </dl>
  `
}

function businessProjectionMarkup(gameState: QuizState): string {
  const projection = monthlyBusinessProjection(gameState)
  if (!projection) return ''
  const formattedUsers = new Intl.NumberFormat('zh-CN').format(projection.users)
  const formattedBreakEvenUsers = new Intl.NumberFormat('zh-CN').format(projection.breakEvenUsers)
  const differenceTone = projection.monthlyGrossProfitEstimate >= 0 ? 'positive' : 'negative'
  const formattedDifference = `${projection.monthlyGrossProfitEstimate >= 0 ? '+' : '−'}${formatCurrency(Math.abs(projection.monthlyGrossProfitEstimate))}`
  const unpricedNote = projection.hasUnpricedFirstYearInvestment ? '<i>+待确认</i>' : ''
  const breakEvenPrefix = projection.hasUnpricedFirstYearInvestment ? '≥' : ''
  return `
    <div class="pixel-business-projection" data-pixel-business-projection aria-label="商业化粗算：首年总投入月均 ${escapeHtml(formatCurrency(projection.monthlyAverageInvestment))}，盈亏平衡至少需要 ${escapeHtml(formattedBreakEvenUsers)} 个付费用户，预计每月毛利 ${escapeHtml(formattedDifference)}">
      <div class="pixel-business-projection__metric"><span>目标用户</span><strong>${escapeHtml(formattedUsers)}</strong></div>
      <div class="pixel-business-projection__metric"><span>每用户月费</span><strong>${escapeHtml(formatCurrency(projection.monthlyPrice))}</strong></div>
      <div class="pixel-business-projection__metric"><span>理论月收入</span><strong>${escapeHtml(formatCurrency(projection.theoreticalMonthlyRevenue))}</strong></div>
      <div class="pixel-business-projection__metric"><span>首年总投入月均</span><strong>${escapeHtml(formatCurrency(projection.monthlyAverageInvestment))}${unpricedNote}</strong></div>
      <div class="pixel-business-projection__metric"><span>盈亏平衡用户</span><strong>${breakEvenPrefix}${escapeHtml(formattedBreakEvenUsers)} 人</strong></div>
      <div class="pixel-business-projection__metric pixel-business-projection__metric--${differenceTone}"><span>预计每月毛利（粗算）</span><strong>${escapeHtml(formattedDifference)}</strong></div>
      <small>预计每月毛利（粗算）＝理论月收入 − 首年总投入 ÷ 12；未扣模型用量、支付手续费、税费、获客和流失。</small>
    </div>
  `
}

function financialSummaryMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  const financials = summarizeFinancials(pixelAccountingLedger(gameState), result.metrics)
  const annualRevenue = financials.annualRevenueCny === null
    ? '—'
    : formatCurrency(financials.annualRevenueCny)
  return `
    <dl class="pixel-financial-summary" aria-label="核心经营结算">
      <div><dt>首年总投入</dt><dd>${escapeHtml(compactCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment))}</dd></div>
      <div><dt>预计首年收入</dt><dd>${escapeHtml(annualRevenue)}</dd></div>
    </dl>
  `
}

export function renderPixelResult(gameState: QuizState, quiz: QuizDefinition): string {
  const result = gameState.result
  if (!result) return renderPixelIntro(gameState)
  const resultQuestionId = result.outcome === 'completed' ? 'Q25' : result.stoppedAtQuestionId
  const question = quiz.questions.find((candidate) => candidate.id === resultQuestionId) ?? quiz.questions.at(-1)
  if (!question) return ''
  const completed = result.outcome === 'completed'
  const completedOptionId = completed
    ? [...gameState.history].reverse().find((answer) => answer.questionId === question.id)?.optionId
    : undefined
  const visual = resolvePixelVisual(question, completedOptionId)
  const scoreDigits = Math.min(String(Math.abs(result.score.total)).length, 3)
  const resultPanel = `
    <section class="pixel-result-panel" data-pixel-achievement aria-labelledby="pixel-result-title">
      <div class="pixel-result-status">
        <div class="pixel-result-stamp">${completed ? '正式上线' : '到此为止'}</div>
        <p class="pixel-dossier__eyebrow">闯过 ${result.answeredCount} 关</p>
      </div>
      <header class="pixel-certificate__hero">
        <div class="pixel-score-medallion pixel-score-medallion--digits-${scoreDigits}" aria-label="总分 ${result.score.total} 分">
          <img class="pixel-score-medallion__motion" src="assets/pixel/motion/achievement-reveal.webp" alt="" width="256" height="256" aria-hidden="true" />
          <span class="pixel-score-medallion__disc" aria-hidden="true">
            <strong data-pixel-score>${result.score.total}</strong>
            <small>/ 100</small>
          </span>
        </div>
        <div class="pixel-certificate__identity">
          <h1 id="pixel-result-title">${escapeHtml(result.title)}</h1>
        </div>
      </header>
      ${result.conclusion ? `<p class="pixel-result-conclusion">${escapeHtml(result.conclusion)}</p>` : ''}
      ${financialSummaryMarkup(gameState)}
      ${result.badges.length ? `<div class="pixel-badges" aria-label="成就章">${result.badges.map((badge) => `<span>${escapeHtml(badge.label)}</span>`).join('')}</div>` : ''}
      ${scoreMarkup(gameState)}
      <div class="result__actions">
        <button class="button button--primary" data-action="open-result-details">查看完整结算</button>
        <button class="button button--ghost" data-action="back">返回上一题</button>
        <button class="text-button" data-action="restart">重新开始并清零</button>
      </div>
    </section>
    <dialog class="pixel-result-dialog" data-result-dialog aria-labelledby="pixel-result-details-title">
      <form method="dialog" class="pixel-result-dialog__frame">
        <header>
          <div>
            <p class="pixel-dossier__eyebrow">经营档案 · 完整结算</p>
            <h2 id="pixel-result-details-title">${escapeHtml(result.title)}</h2>
          </div>
          <button class="pixel-result-dialog__close" type="button" data-action="close-result-details" aria-label="关闭完整结算">×</button>
        </header>
        <div class="pixel-result-dialog__body">
          <section>
            <h3>完整经营账本</h3>
            ${costSummaryMarkup(gameState)}
          </section>
          ${businessProjectionMarkup(gameState)}
          ${result.topTodos.length ? `<section class="pixel-result-todos"><h3>接下来优先做</h3><ul>${result.topTodos.map((todo) => `<li>${escapeHtml(todo.label)}</li>`).join('')}</ul></section>` : ''}
          <p class="pixel-result-dialog__note">首年总投入包含已支付、首年承诺与已确认的注册资本门槛；待报价和变动成本另列。</p>
        </div>
      </form>
    </dialog>
  `

  return `
    <div class="pixel-layout pixel-layout--result">
      ${pixelLedgerMarkup(gameState)}
      ${stageMarkup(
        sceneMarkup(
          completed ? 'victory' : 'result',
          completed ? 'resolved' : 'quit',
          visual.sceneId,
          visual.desktopAsset,
          visual.mobileAsset,
          false,
          completed && visual.source === 'option' && visual.optionId
            ? { optionId: visual.optionId, variant: visual.optionVariant ?? {} }
            : undefined,
        ),
        resultPanel,
        'pixel-stage--result',
      )}
    </div>
  `
}
