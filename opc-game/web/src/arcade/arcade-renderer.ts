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
import {
  changedHudKinds,
  compactCurrency,
  compactHudCurrency,
  monthlyBusinessProjection,
  pixelAccountingLedger,
  type PixelHudKind,
  type PixelTransition,
} from '../pixel/pixel-renderer.ts'
import { assetUrl, resolvePixelVisual } from '../pixel/pixel-scenes.ts'

export const ARCADE_OPTION_FEEDBACK_DURATION_MS = 800
export const ARCADE_PASS_DURATION_MS = 1440

/** 街机版与像素版共用同一条过场数据流，类型保持完全一致。 */
export type ArcadeTransition = PixelTransition

type ArcadeSceneMode = 'intro' | 'question' | 'result' | 'victory'
type ArcadeSceneFrame = 'idle' | 'action' | 'resolved' | 'quit'

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

function hudMarkup(gameState: QuizState, changed: Set<PixelHudKind> = new Set()): string {
  const ledger = pixelAccountingLedger(gameState)
  const financials = summarizeFinancials(ledger, gameState.result?.metrics ?? gameState.metrics)
  const days = Math.round(ledger.time.elapsedDays * 10) / 10
  const cells = [
    {
      kind: 'monthly' as const,
      label: '月均投入',
      value: compactCurrency(financials.monthlyAverageInvestmentCny, financials.hasUnpricedFirstYearInvestment),
      compactValue: compactHudCurrency(financials.monthlyAverageInvestmentCny, financials.hasUnpricedFirstYearInvestment),
    },
    {
      kind: 'annual' as const,
      label: '首年投入',
      value: compactCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment),
      compactValue: compactHudCurrency(financials.firstYearInvestmentCny, financials.hasUnpricedFirstYearInvestment),
    },
    {
      kind: 'days' as const,
      label: '累计天数',
      value: `${days} 天`,
      compactValue: `${days}天`,
    },
  ]

  return `
    <dl class="arcade-hud" data-arcade-hud aria-label="当前经营账本">
      ${cells.map((cell) => `
        <div class="arcade-hud__cell arcade-hud__cell--${cell.kind}${changed.has(cell.kind) ? ' arcade-hud__cell--changed' : ''}" data-arcade-hud-cell="${cell.kind}" title="${escapeHtml(`${cell.label}：${cell.value}`)}" aria-label="${escapeHtml(`${cell.label}：${cell.value}`)}">
          <dt>${cell.label}</dt>
          <dd>${escapeHtml(cell.compactValue)}</dd>
        </div>
      `).join('')}
    </dl>
  `
}

function sceneMarkup(
  mode: ArcadeSceneMode,
  frame: ArcadeSceneFrame,
  sceneId: string,
  desktopAsset: string,
  mobileAsset: string,
  sequence = false,
  optionVisual?: { optionId: string; overlay?: OptionVisualOverlay; variant: OptionVisualVariant },
): string {
  const optionFrameMarkup = optionVisual
    ? (['action', 'resolved'] as const).map((optionFrame) => {
      const assets = optionVisual.variant[optionFrame]
      if (!assets) return ''
      return `
        <picture class="arcade-scene__option-frame arcade-scene__option-frame--${optionFrame}" data-option-visual-frame="${optionFrame}">
          <source media="(max-width: 600px)" srcset="${escapeHtml(assetUrl(assets.mobileAsset))}" />
          <img src="${escapeHtml(assetUrl(assets.desktopAsset))}" alt="" width="768" height="512" decoding="async" />
        </picture>
      `
    }).join('')
    : ''
  return `
    <div class="arcade-scene arcade-scene--${mode} arcade-scene--frame-${frame}${sequence ? ' arcade-scene--sequence' : ''}" data-arcade-scene="${mode}" data-scene-id="${escapeHtml(sceneId)}" data-storyboard-frame="${frame}" data-visual-source="${optionVisual ? 'option' : 'question'}"${optionVisual ? ` data-option-visual="${escapeHtml(optionVisual.optionId)}"` : ''} aria-hidden="true">
      <div class="arcade-scene__frame">
        <picture>
          <source media="(max-width: 600px)" srcset="${escapeHtml(assetUrl(mobileAsset))}" />
          <img src="${escapeHtml(assetUrl(desktopAsset))}" alt="" width="1536" height="1024" decoding="async" fetchpriority="high" />
        </picture>
        ${optionFrameMarkup ? `<div class="arcade-scene__option-frames">${optionFrameMarkup}</div>` : ''}
      </div>
      <div class="arcade-scene__shade"></div>
    </div>
  `
}

function progressMarkup(question: QuizQuestion, count: number): string {
  const percent = Math.round((question.number / count) * 100)
  return `
    <div class="arcade-progress" aria-label="闯关进度 ${question.number} / ${count}">
      <span>第 ${question.number} / ${count} 题</span>
      <div class="arcade-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function costCheckpointProgressMarkup(questionCount: number): string {
  const completedQuestions = Math.max(questionCount - 1, 0)
  const percent = questionCount > 0 ? Math.round((completedQuestions / questionCount) * 100) : 0
  return `
    <div class="arcade-progress" aria-label="成本确认，已完成 ${completedQuestions} / ${questionCount} 题">
      <span>成本确认 · ${completedQuestions} / ${questionCount}</span>
      <div class="arcade-progress__track"><i style="width:${percent}%"></i></div>
    </div>
  `
}

function toastMarkup(transition: ArcadeTransition, overlay?: OptionVisualOverlay): string {
  const tone = overlay?.tone && ['brand', 'success', 'warning'].includes(overlay.tone)
    ? overlay.tone
    : 'neutral'
  const eyebrow = overlay?.eyebrow ?? '选择确认'
  const title = overlay?.title ?? transition.optionLabel
  return `
    <div class="arcade-toast arcade-toast--${tone}" data-arcade-option-feedback role="status" aria-live="polite" aria-label="已选择 ${escapeHtml(transition.optionLabel)}" style="--arcade-transition-duration:${ARCADE_OPTION_FEEDBACK_DURATION_MS}ms">
      <img class="arcade-toast__motion" src="assets/pixel/motion/choice-confirm.webp" alt="" width="160" height="80" aria-hidden="true" />
      <span class="arcade-toast__copy">
        <small>${escapeHtml(eyebrow)}</small>
        <strong title="${escapeHtml(title)}">${escapeHtml(title)}</strong>
        ${overlay?.detail ? `<span>${escapeHtml(overlay.detail)}</span>` : ''}
      </span>
    </div>
  `
}

function optionsMarkup(question: QuizQuestion, gameState: QuizState, selectedOptionId?: string): string {
  return `
    <div class="arcade-sheet__options" role="group" aria-label="可选答案" data-option-count="${question.options.length}">
      ${question.options.map((option, index) => {
        const selected = selectedOptionId === option.id
        return `
          <button class="arcade-choice${selected ? ' arcade-choice--selected' : ''}" type="button" data-option-id="${escapeHtml(option.id)}" data-choice-state="${selected ? 'selected' : 'idle'}" aria-pressed="${selected ? 'true' : 'false'}">
            <span class="arcade-choice__index" aria-hidden="true">${index + 1}</span>
            <strong>${escapeHtml(interpolateText(
              option.label,
              gameState,
              optionMonthlyPrice(option) ?? undefined,
              optionMonthlyAverageInvestmentCny(option) ?? undefined,
            ))}</strong>
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

function passMarkup(
  question: QuizQuestion,
  transition: ArcadeTransition,
  quiz: QuizDefinition,
): string {
  const quitting = transition.outcome === 'quit'
  const interlude = quitting
    ? undefined
    : quiz.definition.interludes.find((item) => item.afterQuestionId === question.id)

  return `
    <div class="arcade-pass arcade-pass--${quitting ? 'quit' : 'accept'}" role="status" aria-label="第 ${question.number} 题已选择" style="--arcade-transition-duration:${ARCADE_PASS_DURATION_MS}ms">
      <div class="arcade-pass__copy">
        <span>第 ${question.number} / ${quiz.questions.length} 题</span>
        <strong>${escapeHtml(interlude?.title ?? (quitting ? '撤退已受理' : '正式上线'))}</strong>
        <p>${escapeHtml(transition.optionLabel)}</p>
        <small>${escapeHtml(interlude?.body ?? (quitting ? '已发生费用保留，不再新增承诺。' : '产品已完成最后一步，正在生成结算。'))}</small>
      </div>
    </div>
  `
}

export function renderArcadeIntro(gameState: QuizState): string {
  const introAsset = 'assets/pixel/storyboards/stage-00.webp'
  return `
    <div class="arcade-layout arcade-layout--intro">
      ${sceneMarkup('intro', 'idle', 'LOBBY', introAsset, introAsset)}
      <div class="arcade-top">
        ${hudMarkup(gameState)}
      </div>
      <section class="arcade-sheet arcade-sheet--intro">
        <p class="arcade-sheet__eyebrow">OPC / ARCADE 05</p>
        <h1>一人公司<br />生存模拟器</h1>
        <p class="arcade-sheet__lead">25 个问题，25 个场景。每次选择都会改变现金、时间、合规待办与最终称号。</p>
        <button class="button button--primary button--wide" data-action="start">开始承担</button>
        <div class="arcade-sheet__footer">
          <small>娱乐化个人经验，不构成法律、财税或安全建议。</small>
        </div>
      </section>
    </div>
  `
}

export function renderArcadeQuestion(
  gameState: QuizState,
  quiz: QuizDefinition,
  transition: ArcadeTransition | null,
): string {
  const question = quiz.questions.find((candidate) => candidate.id === gameState.currentQuestionId)
  if (!question) return ''
  const selectedVisualOptionId = transition?.outcome === 'resolved' ? transition.optionId : undefined
  const visual = resolvePixelVisual(question, selectedVisualOptionId)
  const frame: ArcadeSceneFrame = transition
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
    <div class="arcade-layout arcade-layout--question ${transition ? 'arcade-layout--frozen' : ''}" data-selected-option="${escapeHtml(transition?.optionId ?? '')}" aria-busy="${transition ? 'true' : 'false'}">
      ${sceneMarkup(
        'question',
        frame,
        visual.sceneId,
        visual.desktopAsset,
        visual.mobileAsset,
        Boolean(transition && transition.outcome !== 'quit'),
        visual.source === 'option' && visual.optionId
          ? { optionId: visual.optionId, overlay: visual.overlay, variant: visual.optionVariant ?? {} }
          : undefined,
      )}
      <div class="arcade-top">
        ${hudMarkup(ledgerState, transition ? changedHudKinds(gameState, transition.nextState) : undefined)}
        ${progressMarkup(question, quiz.questions.length)}
      </div>
      <section class="arcade-sheet arcade-sheet--question" ${transition ? 'inert' : ''}>
        <p class="arcade-sheet__eyebrow">${escapeHtml(visual.chapterLabel)} / ${escapeHtml(visual.sceneId)}</p>
        <h1>${escapeHtml(interpolateText(question.prompt, gameState))}</h1>
        ${optionsMarkup(question, gameState, transition?.optionId)}
      </section>
      ${transition && showFullTransition
        ? passMarkup(question, transition, quiz)
        : transition
          ? toastMarkup(transition, visual.overlay)
          : ''}
    </div>
  `
}

export function renderArcadeCostCheckpoint(gameState: QuizState, quiz: QuizDefinition): string {
  const pricingQuestion = quiz.questions.find((question) => question.id === 'Q24')
  if (!pricingQuestion) return renderArcadeQuestion(gameState, quiz, null)

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
    <div class="arcade-cost-board" data-arcade-cost-board role="status" aria-label="毛利粗算：${formattedUsers} 个用户，每位每月 ${formattedPrice}，理论月收入 ${formattedRevenue}，首年总投入月均 ${formattedMonthlyCost}">
      <header><span>MONTHLY MARGIN CHECK</span><strong>每月毛利粗算</strong></header>
      <div class="arcade-cost-board__grid">
        <div><span>预计用户</span><strong>${escapeHtml(formattedUsers)}</strong></div>
        <div><span>用户月费</span><strong>${escapeHtml(formattedPrice)}</strong></div>
        <div><span>理论月收入</span><strong>${escapeHtml(formattedRevenue)}</strong></div>
        <div><span>首年总投入月均</span><strong>${escapeHtml(formattedMonthlyCost)}${projection.hasUnpricedFirstYearInvestment ? '<small> + 待确认</small>' : ''}</strong></div>
      </div>
      <p class="arcade-cost-board__difference arcade-cost-board__difference--${differenceTone}">
        <span>预计每月毛利（粗算）</span><strong>${escapeHtml(formattedDifference)}</strong>
      </p>
    </div>
  `

  return `
    <div class="arcade-layout arcade-layout--question arcade-layout--cost-checkpoint" data-arcade-cost-checkpoint>
      ${sceneMarkup(
        'question',
        'resolved',
        visual.sceneId,
        visual.desktopAsset,
        visual.mobileAsset,
        false,
        optionVisual,
      )}
      <div class="arcade-top">
        ${hudMarkup(gameState)}
        ${costCheckpointProgressMarkup(quiz.questions.length)}
      </div>
      <section class="arcade-sheet arcade-sheet--question arcade-sheet--cost-check" aria-labelledby="arcade-cost-check-title">
        <p class="arcade-sheet__eyebrow">business / COST-CHECK</p>
        <h1 id="arcade-cost-check-title">预计 ${escapeHtml(formattedUsers)} 个用户，每位每月 ${escapeHtml(formattedPrice)}。首年总投入月均 ${escapeHtml(formattedMonthlyCost)}，确定继续吗？</h1>
        ${costBoard}
        <p class="arcade-cost-check__note">预计每月毛利（粗算）＝理论月收入 − 首年总投入 ÷ 12；未扣模型用量、支付手续费、税费、获客和流失。</p>
        <div class="arcade-sheet__options" role="group" aria-label="成本确认选项">
          <button class="arcade-choice" type="button" data-action="confirm-cost-check">
            <span class="arcade-choice__index" aria-hidden="true">1</span>
            <strong>继续，去找第一百个用户</strong>
          </button>
          <button class="arcade-choice" type="button" data-action="recalculate-cost-check">
            <span class="arcade-choice__index" aria-hidden="true">2</span>
            <strong>返回重选价格</strong>
          </button>
        </div>
        <div class="secondary-row">
          <span>键盘：1 继续 · 2 重算</span>
        </div>
      </section>
    </div>
  `
}

function scoreMarkup(gameState: QuizState): string {
  const result = gameState.result
  if (!result) return ''
  return `
    <div class="arcade-score-grid" aria-label="四项评分">
      ${Object.entries(result.score.dimensions).map(([key, dimension]) => `
        <div class="arcade-score-grid__item">
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
    <dl class="arcade-result-ledger">
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
    <div class="arcade-business-projection" data-arcade-business-projection aria-label="商业化粗算：首年总投入月均 ${escapeHtml(formatCurrency(projection.monthlyAverageInvestment))}，盈亏平衡至少需要 ${escapeHtml(formattedBreakEvenUsers)} 个付费用户，预计每月毛利 ${escapeHtml(formattedDifference)}">
      <div class="arcade-business-projection__metric"><span>目标用户</span><strong>${escapeHtml(formattedUsers)}</strong></div>
      <div class="arcade-business-projection__metric"><span>每用户月费</span><strong>${escapeHtml(formatCurrency(projection.monthlyPrice))}</strong></div>
      <div class="arcade-business-projection__metric"><span>理论月收入</span><strong>${escapeHtml(formatCurrency(projection.theoreticalMonthlyRevenue))}</strong></div>
      <div class="arcade-business-projection__metric"><span>首年总投入月均</span><strong>${escapeHtml(formatCurrency(projection.monthlyAverageInvestment))}${unpricedNote}</strong></div>
      <div class="arcade-business-projection__metric"><span>盈亏平衡用户</span><strong>${breakEvenPrefix}${escapeHtml(formattedBreakEvenUsers)} 人</strong></div>
      <div class="arcade-business-projection__metric arcade-business-projection__metric--${differenceTone}"><span>预计每月毛利（粗算）</span><strong>${escapeHtml(formattedDifference)}</strong></div>
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
    <dl class="arcade-financial-summary" aria-label="核心经营结算">
      <div><dt>首年总投入</dt><dd>${escapeHtml(formatCurrency(financials.firstYearInvestmentCny))}${financials.hasUnpricedFirstYearInvestment ? '<small class="arcade-financial-summary__note">+待确认</small>' : ''}</dd></div>
      <div><dt>预计首年收入</dt><dd>${escapeHtml(annualRevenue)}</dd></div>
    </dl>
  `
}

export function renderArcadeResult(gameState: QuizState, quiz: QuizDefinition): string {
  const result = gameState.result
  if (!result) return renderArcadeIntro(gameState)
  const resultQuestionId = result.outcome === 'completed' ? 'Q25' : result.stoppedAtQuestionId
  const question = quiz.questions.find((candidate) => candidate.id === resultQuestionId) ?? quiz.questions.at(-1)
  if (!question) return ''
  const completed = result.outcome === 'completed'
  const completedOptionId = completed
    ? [...gameState.history].reverse().find((answer) => answer.questionId === question.id)?.optionId
    : undefined
  const visual = resolvePixelVisual(question, completedOptionId)
  const resultPanel = `
    <section class="arcade-result" data-arcade-achievement aria-labelledby="arcade-result-title">
      <header class="arcade-result__hero">
        <div class="arcade-result__identity">
          <p class="arcade-sheet__eyebrow">${completed ? '正式上线' : '到此为止'} · 闯过 ${result.answeredCount} 关</p>
          <h1 id="arcade-result-title">${escapeHtml(result.title)}</h1>
        </div>
      </header>
      ${result.conclusion ? `<p class="arcade-result__conclusion">${escapeHtml(result.conclusion)}</p>` : ''}
      ${financialSummaryMarkup(gameState)}
      ${result.badges.length ? `<div class="arcade-badges" aria-label="成就徽章">${result.badges.map((badge) => `<span>${escapeHtml(badge.label)}</span>`).join('')}</div>` : ''}
      ${scoreMarkup(gameState)}
      <div class="arcade-result__actions">
        <button class="button button--primary" data-action="open-result-details">查看完整结算</button>
        <button class="button button--ghost" data-action="back">返回上一题</button>
        <button class="text-button" data-action="restart">重新开始并清零</button>
      </div>
    </section>
    <dialog class="arcade-result-dialog" data-result-dialog aria-labelledby="arcade-result-details-title">
      <form method="dialog" class="arcade-result-dialog__frame">
        <header>
          <div>
            <p class="arcade-sheet__eyebrow">经营档案 · 完整结算</p>
            <h2 id="arcade-result-details-title">${escapeHtml(result.title)}</h2>
          </div>
          <button class="arcade-result-dialog__close" type="button" data-action="close-result-details" aria-label="关闭完整结算">×</button>
        </header>
        <div class="arcade-result-dialog__body">
          <section>
            <h3>完整经营账本</h3>
            ${costSummaryMarkup(gameState)}
          </section>
          ${businessProjectionMarkup(gameState)}
          ${result.topTodos.length ? `<section class="arcade-result-todos"><h3>接下来优先做</h3><ul>${result.topTodos.map((todo) => `<li>${escapeHtml(todo.label)}</li>`).join('')}</ul></section>` : ''}
          <p class="arcade-result-dialog__note">首年总投入包含已支付、首年承诺与已确认的注册资本门槛；待报价和变动成本另列。</p>
        </div>
      </form>
    </dialog>
  `

  return `
    <div class="arcade-layout arcade-layout--result">
      ${sceneMarkup(
        completed ? 'victory' : 'result',
        completed ? 'resolved' : 'quit',
        visual.sceneId,
        visual.desktopAsset,
        visual.mobileAsset,
        false,
        completed && visual.source === 'option' && visual.optionId
          ? { optionId: visual.optionId, variant: visual.optionVariant ?? {} }
          : undefined,
      )}
      <div class="arcade-top">
        ${hudMarkup(gameState)}
      </div>
      ${resultPanel}
    </div>
  `
}
