import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile, stat } from 'node:fs/promises'
import path from 'node:path'
import test from 'node:test'
import manifest from '../design/audio-asset-manifest.json'

const projectRoot = path.resolve(import.meta.dirname, '..')
const mirrors = [
  path.join(projectRoot, 'web/public/assets/audio'),
  path.join(projectRoot, 'miniprogram/assets/audio'),
]

test('音频资产完全由本地确定性脚本生成且没有第三方样本或模型权重', async () => {
  assert.equal(manifest.method, 'deterministic procedural waveform synthesis')
  assert.deepEqual(manifest.thirdPartySamples, [])
  assert.deepEqual(manifest.modelWeights, [])

  const generator = await readFile(path.join(projectRoot, manifest.generator), 'utf8')
  assert.doesNotMatch(generator, /https?:\/\//)
  assert.doesNotMatch(generator, /fetch\s*\(|MusicGen|Stable Audio|AudioCraft/i)
})

test('Web 与小程序携带相同的本地 MP3，字节数和哈希与清单一致', async () => {
  let totalBytes = 0
  for (const asset of manifest.assets) {
    let expectedBytes: Buffer | null = null
    for (const mirror of mirrors) {
      const file = path.join(mirror, asset.file)
      const bytes = await readFile(file)
      const metadata = await stat(file)
      assert.equal(bytes.subarray(0, 3).toString('ascii'), 'ID3', `${asset.file} 应为 MP3`)
      assert.equal(metadata.size, asset.bytes, `${asset.file} 字节数应与清单一致`)
      assert.equal(createHash('sha256').update(bytes).digest('hex'), asset.sha256, `${asset.file} 哈希应与清单一致`)
      if (expectedBytes) assert.deepEqual(bytes, expectedBytes, `${asset.file} 两端副本必须完全相同`)
      expectedBytes = bytes
    }
    totalBytes += asset.bytes
  }

  assert.ok(totalBytes < 250_000, `单端音频总量应小于 250 KB，实际为 ${totalBytes} bytes`)
})

test('音频运行时只引用本地资产，并暴露可访问的静音控制', async () => {
  const webRuntime = await readFile(path.join(projectRoot, 'web/src/audio.ts'), 'utf8')
  const webShell = await readFile(path.join(projectRoot, 'web/src/main.ts'), 'utf8')
  const miniRuntime = await readFile(path.join(projectRoot, 'miniprogram/audio/game-audio.ts'), 'utf8')
  const miniPage = await readFile(path.join(projectRoot, 'miniprogram/pages/index/index.ts'), 'utf8')
  const miniTemplate = await readFile(path.join(projectRoot, 'miniprogram/pages/index/index.wxml'), 'utf8')

  assert.doesNotMatch(webRuntime, /https?:\/\//)
  assert.doesNotMatch(miniRuntime, /https?:\/\//)
  assert.match(webRuntime, /'assets\/audio\//)
  assert.match(miniRuntime, /\/assets\/audio/)
  assert.match(webShell, /aria-pressed=/)
  assert.match(webShell, /data-action="toggle-sound"/)
  assert.match(miniPage, /audioEnabled:\s*gameAudio\.isEnabled\(\)/)
  assert.match(miniTemplate, /aria-label=/)
  assert.match(miniTemplate, /bindtap="toggleSound"/)
})
