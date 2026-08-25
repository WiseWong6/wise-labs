import type {
  OptionVisualOverlay,
  OptionVisualVariant,
  QuizQuestion,
} from '../../../packages/game-core/src/index.ts'

export type PixelVisualOutcome =
  | 'idle'
  | 'action'
  | 'resolved'
  | 'quit'

export interface PixelVisualConfig {
  sceneId: string
  chapterLabel: string
  desktopAsset: string
  mobileAsset: string
  source: 'question' | 'option'
  optionId?: string
  overlay?: OptionVisualOverlay
  optionVariant?: OptionVisualVariant
}

/**
 * 题库中的资产以 '/assets/...' 站点根路径声明。运行时统一转成相对路径，
 * 这样同一份产物既能挂在任意子路径下，也能打进小红书小工具这类无站点
 * 根路径的离线包。
 */
export function assetUrl(path: string): string {
  return path.startsWith('/') ? path.slice(1) : path
}

/**
 * v2 的场景完全由题目本身声明。这里故意没有按题号推导、clamp 或旧版
 * fallback，避免缺图时悄悄复用另一题的背景。
 */
export function resolvePixelVisual(question: QuizQuestion, optionId?: string): PixelVisualConfig {
  const { sceneId, desktopAsset, mobileAsset } = question.visual
  if (!sceneId || !desktopAsset || !mobileAsset) {
    throw new Error(`${question.id} 缺少独立双端视觉资产`)
  }
  const variant = optionId ? question.visual.optionVariants?.[optionId] : undefined

  return {
    sceneId,
    chapterLabel: question.chapterId,
    desktopAsset,
    mobileAsset,
    source: variant ? 'option' : 'question',
    optionId: variant ? optionId : undefined,
    overlay: variant?.overlay,
    optionVariant: variant,
  }
}
