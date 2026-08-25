import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFileSync, statSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'
import quizData from '../content/quiz-v2.json'
import sceneManifest from '../design/storyboards/scene-manifest-v2.json'

interface SceneAsset {
  file: string
  width: number
  height: number
  bytes: number
  sha256: string
}

interface SceneEntry {
  sceneId: string
  brief: string
  desktop: SceneAsset
  mobile: SceneAsset
  optionVariants?: Record<string, {
    action?: { desktop: SceneAsset; mobile: SceneAsset }
    resolved?: { desktop: SceneAsset; mobile: SceneAsset }
  }>
}

const projectRoot = path.resolve(import.meta.dirname, '..')
const questions = sceneManifest.assets as Record<string, SceneEntry>
const expectedQuestionIds = Array.from({ length: 25 }, (_, index) => `Q${String(index + 1).padStart(2, '0')}`)

function assertWebpAsset(questionId: string, variant: 'desktop' | 'mobile', asset: SceneAsset): void {
  const absolutePath = path.join(projectRoot, asset.file)
  const bytes = readFileSync(absolutePath)
  const header = bytes.subarray(0, 12)
  const expectedSize = variant === 'desktop'
    ? { width: 1536, height: 1024 }
    : { width: 1024, height: 1536 }

  assert.equal(header.subarray(0, 4).toString('ascii'), 'RIFF', `${questionId} ${variant} 应为 RIFF 容器`)
  assert.equal(header.subarray(8, 12).toString('ascii'), 'WEBP', `${questionId} ${variant} 应为 WebP 图像`)
  assert.deepEqual(
    { width: asset.width, height: asset.height },
    expectedSize,
    `${questionId} ${variant} 母板尺寸错误`,
  )
  assert.ok(statSync(absolutePath).size > 80_000, `${questionId} ${variant} 不应是占位图`)
  assert.ok(statSync(absolutePath).size < 1_500_000, `${questionId} ${variant} 应控制在 1.5 MB 内`)
  assert.equal(bytes.byteLength, asset.bytes, `${questionId} ${variant} 字节数应与清单一致`)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    asset.sha256,
    `${questionId} ${variant} 哈希应与清单一致`,
  )
}

function assertOptionWebpAsset(
  questionId: string,
  optionId: string,
  frame: 'action' | 'resolved',
  variant: 'desktop' | 'mobile',
  asset: SceneAsset,
): void {
  const absolutePath = path.join(projectRoot, asset.file)
  const bytes = readFileSync(absolutePath)
  const expectedSize = variant === 'desktop'
    ? { width: 768, height: 512 }
    : { width: 512, height: 768 }

  assert.deepEqual(
    { width: asset.width, height: asset.height },
    expectedSize,
    `${questionId}/${optionId}/${frame}/${variant} 选项帧尺寸错误`,
  )
  assert.ok(bytes.byteLength > 30_000, `${questionId}/${optionId}/${frame}/${variant} 不应是占位图`)
  assert.ok(bytes.byteLength < 1_500_000, `${questionId}/${optionId}/${frame}/${variant} 应控制在 1.5 MB 内`)
  assert.equal(bytes.byteLength, asset.bytes, `${questionId}/${optionId}/${frame}/${variant} 字节数应与清单一致`)
  assert.equal(
    createHash('sha256').update(bytes).digest('hex'),
    asset.sha256,
    `${questionId}/${optionId}/${frame}/${variant} 哈希应与清单一致`,
  )
}

test('v2 清单恰好登记 25 题、25 个唯一场景和 50 个唯一双端资产', () => {
  assert.deepEqual(sceneManifest.optionVariantContract, {
    key: 'question.visual.optionVariants[optionId]',
    format: 'action-resolved-single-frame-pairs',
    fallback: 'question.visual',
    overlay: 'escaped-dom-text',
  })
  assert.deepEqual(Object.keys(questions).sort(), expectedQuestionIds)
  assert.deepEqual(sceneManifest.states, ['idle', 'action', 'resolved', 'quit'])
  assert.deepEqual(sceneManifest.frameRects.desktop, {
    idle: [0, 0, 768, 512],
    action: [768, 0, 768, 512],
    resolved: [0, 512, 768, 512],
    quit: [768, 512, 768, 512],
  })
  assert.deepEqual(sceneManifest.frameRects.mobile, {
    idle: [0, 0, 512, 768],
    action: [512, 0, 512, 768],
    resolved: [0, 768, 512, 768],
    quit: [512, 768, 512, 768],
  })

  const sceneIds = new Set(Object.values(questions).map((entry) => entry.sceneId))
  const desktopFiles = new Set(Object.values(questions).map((entry) => entry.desktop.file))
  const mobileFiles = new Set(Object.values(questions).map((entry) => entry.mobile.file))
  const hashes = new Set(Object.values(questions).flatMap((entry) => [entry.desktop.sha256, entry.mobile.sha256]))
  assert.equal(sceneIds.size, 25)
  assert.equal(desktopFiles.size, 25)
  assert.equal(mobileFiles.size, 25)
  assert.equal(new Set([...desktopFiles, ...mobileFiles]).size, 50)
  assert.equal(hashes.size, 50, '50 张双端母板必须拥有不同内容哈希，不能复制整张背景')

  for (const questionId of expectedQuestionIds) {
    const entry = questions[questionId]
    assert.ok(entry.brief.trim().length >= 12, `${questionId} 需要可辨识的场景 brief`)
    assertWebpAsset(questionId, 'desktop', entry.desktop)
    assertWebpAsset(questionId, 'mobile', entry.mobile)
  }
})

test('人物母版、表情与两组动作姿势均为实质 PNG 资产', () => {
  const files = [
    'canonical-turnaround-v1.png',
    'expression-sheet-v1.png',
    'action-sheet-core-v1.png',
    'action-sheet-outcomes-v1.png',
  ]

  for (const file of files) {
    const absolutePath = path.join(projectRoot, 'design/characters/founder', file)
    const signature = readFileSync(absolutePath).subarray(0, 8)
    assert.deepEqual([...signature], [137, 80, 78, 71, 13, 10, 26, 10], `${file} 应为 PNG`)
    assert.ok(statSync(absolutePath).size > 500_000, `${file} 不应是占位图`)
  }
})

test('25 题每个非退出选项都有独立双端 action/resolved 视觉结果', () => {
  for (const question of quizData.questions) {
    const scene = questions[question.id]
    const perQuestionHashes = {
      actionDesktop: new Set<string>(),
      actionMobile: new Set<string>(),
      resolvedDesktop: new Set<string>(),
      resolvedMobile: new Set<string>(),
    }
    let continuingOptionCount = 0
    for (const option of question.options.filter((candidate) => !('outcome' in candidate) || candidate.outcome !== 'exit')) {
      continuingOptionCount += 1
      const variant = scene.optionVariants?.[option.id]
      assert.ok(variant, `${question.id}/${option.id} 缺少 option-specific 视觉结果`)
      assert.ok(variant.action, `${question.id}/${option.id} 缺少 action 帧`)
      assert.ok(variant.resolved, `${question.id}/${option.id} 缺少 resolved 帧`)
      for (const frame of ['action', 'resolved'] as const) {
        const frameAssets: { desktop: SceneAsset; mobile: SceneAsset } | undefined = variant[frame]
        assert.ok(frameAssets)
        assertOptionWebpAsset(question.id, option.id, frame, 'desktop', frameAssets.desktop)
        assertOptionWebpAsset(question.id, option.id, frame, 'mobile', frameAssets.mobile)
      }
      assert.notEqual(
        variant.action.desktop.sha256,
        variant.resolved.desktop.sha256,
        `${question.id}/${option.id} 桌面 action/resolved 不得复用同一画面`,
      )
      assert.notEqual(
        variant.action.mobile.sha256,
        variant.resolved.mobile.sha256,
        `${question.id}/${option.id} 手机 action/resolved 不得复用同一画面`,
      )
      perQuestionHashes.actionDesktop.add(variant.action.desktop.sha256)
      perQuestionHashes.actionMobile.add(variant.action.mobile.sha256)
      perQuestionHashes.resolvedDesktop.add(variant.resolved.desktop.sha256)
      perQuestionHashes.resolvedMobile.add(variant.resolved.mobile.sha256)
    }
    assert.equal(
      perQuestionHashes.actionDesktop.size,
      continuingOptionCount,
      `${question.id} 每条继续路线都应有不同的桌面 action 画面`,
    )
    assert.equal(
      perQuestionHashes.actionMobile.size,
      continuingOptionCount,
      `${question.id} 每条继续路线都应有不同的手机 action 画面`,
    )
    assert.equal(
      perQuestionHashes.resolvedDesktop.size,
      continuingOptionCount,
      `${question.id} 每条继续路线都应有不同的桌面 resolved 画面`,
    )
    assert.equal(
      perQuestionHashes.resolvedMobile.size,
      continuingOptionCount,
      `${question.id} 每条继续路线都应有不同的手机 resolved 画面`,
    )
  }
})
