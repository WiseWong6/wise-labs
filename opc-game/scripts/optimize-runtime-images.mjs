#!/usr/bin/env node
import { execFileSync } from 'node:child_process'
import {
  copyFileSync,
  existsSync,
  readdirSync,
  renameSync,
  statSync,
  unlinkSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const pixelRoot = path.join(root, 'web', 'public', 'assets', 'pixel')
const MAX_BYTES = 350_000
const QUALITY = 78

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const full = path.join(dir, entry.name)
    return entry.isDirectory() ? walk(full) : [full]
  })
}

try {
  execFileSync('cwebp', ['-version'], { stdio: 'ignore' })
} catch {
  console.error('runtime image optimization requires cwebp (brew install webp)')
  process.exit(1)
}

let optimized = 0
let beforeBytes = 0
let afterBytes = 0
const candidates = walk(pixelRoot)
  .filter((file) => file.endsWith('.webp'))
  .filter((file) => !file.includes(`${path.sep}motion${path.sep}`))
  .filter((file) => statSync(file).size > MAX_BYTES)

for (const source of candidates) {
  const temporary = `${source}.optimized.webp`
  const backup = `${source}.before-optimization`
  const sourceBytes = statSync(source).size
  try {
    execFileSync(
      'cwebp',
      ['-quiet', '-m', '6', '-q', String(QUALITY), '-sharp_yuv', source, '-o', temporary],
      { stdio: 'ignore' },
    )
    const optimizedBytes = statSync(temporary).size
    if (optimizedBytes >= sourceBytes || optimizedBytes > MAX_BYTES) {
      unlinkSync(temporary)
      continue
    }
    copyFileSync(source, backup)
    renameSync(temporary, source)
    unlinkSync(backup)
    optimized += 1
    beforeBytes += sourceBytes
    afterBytes += optimizedBytes
  } catch (error) {
    if (existsSync(temporary)) unlinkSync(temporary)
    if (existsSync(backup)) {
      copyFileSync(backup, source)
      unlinkSync(backup)
    }
    throw error
  }
}

console.log(
  `runtime images OK: ${optimized}/${candidates.length} optimized, `
  + `${(beforeBytes / 1_000_000).toFixed(2)}MB -> ${(afterBytes / 1_000_000).toFixed(2)}MB`,
)
