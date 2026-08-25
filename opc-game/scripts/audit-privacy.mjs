import { readFile, readdir } from 'node:fs/promises'
import { extname, resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const scanRoots = [
  'web/src',
  'web/index.html',
  'web/dist',
  'miniprogram',
].map((path) => resolve(root, path))
const allowedExtensions = new Set(['.ts', '.js', '.css', '.html', '.json', '.wxml', '.wxss', '.less'])
const banned = [
  ['network request', /\bfetch\s*\(|XMLHttpRequest|sendBeacon|WebSocket|EventSource|wx\.(?:request|connectSocket|sendSocketMessage|createTCPSocket|createUDPSocket)\s*\(/],
  ['upload or download', /wx\.(?:uploadFile|downloadFile)\s*\(/],
  ['persistent browser data', /localStorage|sessionStorage|indexedDB|document\.cookie/],
  ['persistent mini-program data', /wx\.[A-Za-z]*Storage[A-Za-z]*\s*\(/],
  ['identity data', /wx\.(?:login|getUserProfile|getUserInfo)\s*\(/],
  ['sharing surface', /onShareAppMessage|onShareTimeline|wx\.showShareMenu\s*\(|wx\.shareAppMessage\s*\(|open-type=["']share["']/],
  ['external asset', /(?:src|href)=["']https?:\/\/|url\(\s*["']?https?:\/\//],
]

async function collect(path) {
  const stat = await import('node:fs/promises').then(({ stat }) => stat(path).catch(() => null))
  if (!stat) return []
  if (stat.isFile()) return allowedExtensions.has(extname(path)) ? [path] : []
  const entries = await readdir(path, { withFileTypes: true })
  const nested = await Promise.all(entries.map((entry) => collect(resolve(path, entry.name))))
  return nested.flat()
}

const files = (await Promise.all(scanRoots.map(collect))).flat()
const failures = []
for (const file of files) {
  const source = await readFile(file, 'utf8')
  for (const [label, pattern] of banned) {
    if (pattern.test(source)) failures.push(`${label}: ${file.replace(`${root}/`, '')}`)
  }
}

if (failures.length > 0) {
  console.error(`Privacy audit failed:\n${failures.join('\n')}`)
  process.exitCode = 1
} else {
  console.log(`Privacy audit passed across ${files.length} source and build files.`)
}
