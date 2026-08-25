#!/usr/bin/env node
/**
 * 把 Web 街机版打包成小红书小工具离线 ZIP，输出到 output/xhs-tool.zip。
 *
 * 小工具约束来自 .codex/SKILL.md 及其 references：
 * - 纯离线自包含：不允许任何网络请求，所有资源必须在包内
 * - ZIP 根目录必须有且只有一个 index.html
 * - 脚本必须是外置 .js，禁止内联 <script> 与行内事件
 * - 音频以 base64 data URI 内联进 JS
 * - 仅允许静态资源扩展名，ZIP 不超过 10MB
 *
 * 原始 WebP 不会被修改；仅在临时构建目录内做小工具专用的有损压缩。
 */
import { execFileSync } from 'node:child_process'
import {
  existsSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  unlinkSync,
  writeFileSync,
} from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const webRoot = path.join(root, 'web')
const outDir = path.join(root, 'output', 'xhs-tool')
const zipPath = path.join(root, 'output', 'xhs-tool.zip')
const ZIP_SIZE_LIMIT = 10 * 1000 * 1000
const FILE_COUNT_LIMIT = 200
const IMAGE_MAX_DIMENSION = 720
const IMAGE_QUALITY = 45
const ALLOWED_EXTENSIONS = new Set([
  '.html', '.css', '.js',
  '.png', '.jpg', '.jpeg', '.gif', '.webp', '.svg',
  '.woff', '.woff2', '.json',
])

function walk(dir) {
  const files = []
  if (!existsSync(dir)) return files
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...walk(full))
    else files.push(full)
  }
  return files
}

function fail(message) {
  console.error(`xhs-tool build failed: ${message}`)
  process.exit(1)
}

function optimizeStaticPixelImages() {
  const pixelDir = path.join(outDir, 'assets', 'pixel')
  const candidates = walk(pixelDir)
    .filter((file) => file.endsWith('.webp'))
    // choice-confirm / achievement-reveal are animated WebP; cwebp cannot
    // decode animation and preserving them is required for the transition UI.
    .filter((file) => !file.includes(`${path.sep}motion${path.sep}`))
  if (candidates.length === 0) return 0

  try {
    execFileSync('cwebp', ['-version'], { stdio: 'ignore' })
  } catch {
    fail('资源压缩需要 cwebp（macOS 可执行 brew install webp），未修改原始资源')
  }

  for (const source of candidates) {
    const optimized = `${source}.optimized.webp`
    try {
      execFileSync(
        'cwebp',
        [
          '-quiet',
          '-resize', String(IMAGE_MAX_DIMENSION), '0',
          '-q', String(IMAGE_QUALITY),
          source,
          '-o', optimized,
        ],
        { stdio: 'ignore' },
      )
      rmSync(source, { force: true })
      renameSync(optimized, source)
    } catch (error) {
      rmSync(optimized, { force: true })
      fail(`WebP 压缩失败：${path.relative(outDir, source)}；${error instanceof Error ? error.message : String(error)}`)
    }
  }
  return candidates.length
}

function markXhsRuntime() {
  const htmlPath = path.join(outDir, 'index.html')
  let html = readFileSync(htmlPath, 'utf8')
  const bodyMarker = '<body data-theme="arcade">'
  if (!html.includes(bodyMarker)) fail('无法标记小红书运行时：入口 body 结构已变化')
  html = html.replace(bodyMarker, '<body data-theme="arcade" data-platform="xhs-tool">')
  writeFileSync(htmlPath, html)
}

function inlineAudioAssets() {
  const audioDir = path.join(outDir, 'assets', 'audio')
  if (!existsSync(audioDir)) fail('构建产物缺少 assets/audio，无法完成离线音频内联')
  const jsFiles = walk(path.join(outDir, 'assets')).filter((file) => file.endsWith('.js'))
  if (jsFiles.length === 0) fail('构建产物中没有 JS 文件')

  let audioInlined = 0
  for (const jsFile of jsFiles) {
    let source = readFileSync(jsFile, 'utf8')
    for (const audioFile of readdirSync(audioDir)) {
      if (!audioFile.endsWith('.mp3')) continue
      const marker = `assets/audio/${audioFile}`
      if (!source.includes(marker)) continue
      const base64 = readFileSync(path.join(audioDir, audioFile)).toString('base64')
      source = source.split(marker).join(`data:audio/mpeg;base64,${base64}`)
      audioInlined += 1
    }
    writeFileSync(jsFile, source)
  }
  for (const jsFile of jsFiles) {
    if (readFileSync(jsFile, 'utf8').includes('assets/audio/')) {
      fail(`JS 中仍残留音频文件引用：${path.relative(outDir, jsFile)}`)
    }
  }
  rmSync(audioDir, { recursive: true, force: true })
  return audioInlined
}

function pruneUnusedAssets() {
  let prunedScenes = 0
  const storyboardsDir = path.join(outDir, 'assets', 'pixel', 'storyboards')
  if (existsSync(storyboardsDir)) {
    for (const file of readdirSync(storyboardsDir)) {
      if (file !== 'stage-00.webp') unlinkSync(path.join(storyboardsDir, file))
    }
  }
  for (const empty of ['scenes', 'characters']) {
    rmSync(path.join(outDir, 'assets', 'pixel', empty), { recursive: true, force: true })
  }

  const quizRaw = readFileSync(path.join(root, 'content', 'quiz-v2.json'), 'utf8')
  const referenced = new Set(
    [...quizRaw.matchAll(/\/assets\/pixel\/scenes-v2\/[^"']+\.webp/g)].map((match) => match[0].slice(1)),
  )
  const scenesDir = path.join(outDir, 'assets', 'pixel', 'scenes-v2')
  for (const file of walk(scenesDir)) {
    const relative = path.relative(outDir, file).split(path.sep).join('/')
    if (!referenced.has(relative)) {
      unlinkSync(file)
      prunedScenes += 1
    }
  }
  return prunedScenes
}

function compactActionFrames() {
  const optionDir = path.join(outDir, 'assets', 'pixel', 'scenes-v2', 'options')
  const actionFiles = walk(optionDir).filter((file) => /-action-(?:desktop|mobile)\.webp$/.test(file))
  if (actionFiles.length === 0) return 0

  // The source app keeps independent action/resolved frames. The platform's
  // 200-file cap makes the short-lived action frame the safe package-level
  // fallback: both states point to the resolved frame, while desktop/mobile
  // aspect ratios and every question/option remain available offline.
  const textFiles = walk(path.join(outDir, 'assets')).filter((file) => /\.(?:css|html|js)$/.test(file))
  const replacements = new Map()
  for (const actionFile of actionFiles) {
    const resolvedFile = actionFile.replace('-action-', '-resolved-')
    if (!existsSync(resolvedFile)) fail(`动作帧缺少 resolved 备用资源：${path.relative(outDir, actionFile)}`)
    const actionRelative = `/${path.relative(outDir, actionFile).split(path.sep).join('/')}`
    const resolvedRelative = `/${path.relative(outDir, resolvedFile).split(path.sep).join('/')}`
    replacements.set(actionRelative, resolvedRelative)
  }

  for (const file of textFiles) {
    let source = readFileSync(file, 'utf8')
    for (const [actionRelative, resolvedRelative] of replacements) {
      source = source.split(actionRelative).join(resolvedRelative)
    }
    writeFileSync(file, source)
  }

  for (const actionFile of actionFiles) unlinkSync(actionFile)
  return actionFiles.length
}

const FORBIDDEN_PATTERNS = [
  ['网络请求 API', /\b(?:fetch|sendBeacon)\s*\(|\b(?:XMLHttpRequest|WebSocket|EventSource|RTCPeerConnection)\b/i],
  ['后台运行 / Worker / WASM', /\b(?:new\s+(?:Shared)?Worker\s*\(|navigator\.serviceWorker\.register\s*\(|WebAssembly\b)/i],
  ['定位 / 设备能力', /navigator\.(?:geolocation|bluetooth|usb|hid|serial|getBattery|connection|credentials|locks|storage\.(?:persist|estimate)|mediaDevices\.enumerateDevices|mediaDevices\.getDisplayMedia)\b/i],
  ['传感器', /\b(?:new\s+(?:Accelerometer|Gyroscope|Magnetometer)\s*\(|DeviceMotionEvent|DeviceOrientationEvent|devicemotion|deviceorientation)\b/i],
  ['剪贴板', /(?:navigator\.clipboard|document\.execCommand\s*\(\s*['"](?:copy|cut|paste))/i],
  ['动态执行代码', /\b(?:eval\s*\(|new\s+Function\s*\()/i],
  ['窗口 / 全屏', /\b(?:window\.(?:open|prompt)\s*\(|(?:Element\.)?requestFullscreen\s*\(|webkitRequestFullscreen\s*\()/i],
  ['外链跳转', /\b(?:location\.(?:assign|replace)\s*\(|location\.href\s*=)/i],
]

function assertNoForbiddenCapabilities(file, source) {
  for (const [label, pattern] of FORBIDDEN_PATTERNS) {
    if (pattern.test(source)) fail(`命中${label}：${path.relative(outDir, file)}`)
  }
}

function assertLocalReferences(file, source) {
  const resourcePattern = /\b(?:src|href|srcset)\s*=\s*["']([^"']+)["']/gi
  for (const match of source.matchAll(resourcePattern)) {
    const values = match[1].split(',').map((item) => item.trim().split(/\s+/)[0])
    for (const value of values) {
      if (!value || value.startsWith('#') || value.startsWith('data:') || value.startsWith('blob:')) continue
      if (/^[a-z][a-z\d+.-]*:/i.test(value)) fail(`发现外部资源引用：${path.relative(outDir, file)}`)
      if (value.startsWith('/')) fail(`发现绝对资源路径：${path.relative(outDir, file)} -> ${value}`)
      const clean = value.split(/[?#]/)[0]
      if (!clean) continue
      const target = path.resolve(path.dirname(file), clean)
      const outputRoot = path.resolve(outDir)
      if (!target.startsWith(`${outputRoot}${path.sep}`) || !existsSync(target)) {
        fail(`引用的包内资源不存在：${path.relative(outDir, file)} -> ${value}`)
      }
    }
  }

  for (const match of source.matchAll(/url\(\s*["']?([^"')\s]+)["']?\s*\)/gi)) {
    const value = match[1]
    if (value.startsWith('data:') || value.startsWith('blob:')) continue
    if (/^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('/')) {
      fail(`CSS 中存在外部或绝对资源：${path.relative(outDir, file)} -> ${value}`)
    }
    const target = path.resolve(path.dirname(file), value.split(/[?#]/)[0])
    if (!existsSync(target)) fail(`CSS 引用的包内资源不存在：${path.relative(outDir, file)} -> ${value}`)
  }
}

function assertHtmlContract(file, source) {
  if (/<script\b(?![^>]*\bsrc\s*=)[^>]*>[\s\S]*?<\/script>/i.test(source)) {
    fail(`存在内联 script：${path.relative(outDir, file)}`)
  }
  if (/\bon[a-z]+\s*=\s*["']/i.test(source)) fail(`存在行内事件属性：${path.relative(outDir, file)}`)
  if (/<(?:base|iframe|object|form)\b|\btarget\s*=\s*["']_blank["']|\bdownload\s*=/i.test(source)) {
    fail(`命中小工具禁止的 HTML 行为：${path.relative(outDir, file)}`)
  }
  if (/javascript\s*:/i.test(source)) fail(`存在 javascript: URI：${path.relative(outDir, file)}`)
}

function assertQuizAssetsExist() {
  const quizRaw = readFileSync(path.join(root, 'content', 'quiz-v2.json'), 'utf8')
  const references = new Set(
    [...quizRaw.matchAll(/\/assets\/[^"']+\.(?:png|jpg|jpeg|gif|webp|svg|woff2?)/g)].map((match) => match[0].slice(1)),
  )
  for (const relative of references) {
    const direct = path.join(outDir, relative)
    const actionFallback = relative.replace('-action-', '-resolved-')
    if (!existsSync(direct) && !existsSync(path.join(outDir, actionFallback))) {
      fail(`题库引用资源未打入 ZIP：${relative}`)
    }
  }
}

function validateBuildOutput() {
  const files = walk(outDir)
  for (const file of files) {
    const extension = path.extname(file).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(extension)) fail(`不支持的文件类型：${path.relative(outDir, file)}`)
  }

  const htmlFiles = files.filter((file) => file.endsWith('.html'))
  if (htmlFiles.length !== 1 || path.basename(htmlFiles[0]) !== 'index.html' || path.dirname(htmlFiles[0]) !== outDir) {
    fail(`小工具包必须有且只有一个根目录 index.html，当前：${htmlFiles.map((file) => path.relative(outDir, file)).join(', ')}`)
  }

  for (const file of files.filter((name) => /\.(html|css|js)$/.test(name))) {
    const source = readFileSync(file, 'utf8')
    if (/(?:src|href)\s*=\s*["']\s*https?:\/\/|url\(\s*["']?\s*https?:\/\//i.test(source)) {
      fail(`发现外部资源引用：${path.relative(outDir, file)}`)
    }
    assertNoForbiddenCapabilities(file, source)
    if (file.endsWith('.html') || file.endsWith('.css')) assertLocalReferences(file, source)
    if (file.endsWith('.html')) assertHtmlContract(file, source)
  }
  assertQuizAssetsExist()

  const totalBytes = files.reduce((sum, file) => sum + statSync(file).size, 0)
  if (files.length > FILE_COUNT_LIMIT) {
    fail(`文件数量 ${files.length} 超过平台上限 ${FILE_COUNT_LIMIT}`)
  }
  return { files, totalBytes }
}

function createAndValidateZip() {
  rmSync(zipPath, { force: true })
  try {
    // 进入构建目录压缩“内容”，避免解压后多一层 xhs-tool/。
    execFileSync('zip', ['-qr', zipPath, '.', '-x', '*.DS_Store'], {
      cwd: outDir,
      stdio: 'ignore',
    })
  } catch (error) {
    fail(`ZIP 创建失败：${error instanceof Error ? error.message : String(error)}`)
  }

  let entries
  try {
    entries = execFileSync('unzip', ['-Z1', zipPath], { encoding: 'utf8' })
      .split('\n')
      .map((entry) => entry.trim())
      .filter(Boolean)
  } catch (error) {
    fail(`ZIP 结构无法复核：${error instanceof Error ? error.message : String(error)}`)
  }
  const fileEntries = entries.filter((entry) => !entry.endsWith('/'))
  const htmlEntries = fileEntries.filter((entry) => entry.endsWith('.html'))
  if (htmlEntries.length !== 1 || htmlEntries[0] !== 'index.html') {
    fail(`ZIP 根目录入口不合规：${htmlEntries.join(', ') || '无 index.html'}`)
  }
  for (const entry of fileEntries) {
    if (entry.includes('.DS_Store') || entry.endsWith('.map')) fail(`ZIP 含开发垃圾文件：${entry}`)
    const extension = path.extname(entry).toLowerCase()
    if (!ALLOWED_EXTENSIONS.has(extension)) fail(`ZIP 含不支持的文件类型：${entry}`)
  }

  const zipBytes = statSync(zipPath).size
  if (zipBytes > ZIP_SIZE_LIMIT) {
    fail(`ZIP 体积 ${(zipBytes / 1000 / 1000).toFixed(2)}MB 超过 10MB 上限`)
  }
  return { entries: fileEntries, zipBytes }
}

// 1. Vite 构建：相对 base，独立输出目录
rmSync(outDir, { recursive: true, force: true })
execFileSync('npx', ['vite', 'build', '--base', './', '--outDir', outDir, '--emptyOutDir'], {
  cwd: webRoot,
  stdio: 'inherit',
})

// 2. 清理 macOS 元数据、裁剪不参与运行时的素材
for (const file of walk(outDir)) {
  if (path.basename(file) === '.DS_Store') unlinkSync(file)
}
markXhsRuntime()
const prunedScenes = pruneUnusedAssets()

// 3. 仅优化临时包中的静态 WebP，保留动画 WebP 和源文件质量
const optimizedImages = optimizeStaticPixelImages()

// 4. 平台最多允许 200 个文件；动作帧是短暂反馈，复用 resolved 帧即可。
const compactedActionFrames = compactActionFrames()

// 5. mp3 以 base64 data URI 内联进 JS，包内不保留独立音频文件
const audioInlined = inlineAudioAssets()

// 6. 运行离线能力、资源引用、文件类型与题库资源闭环校验
const { files, totalBytes } = validateBuildOutput()

// 7. 从 outDir 内容创建根目录入口 ZIP，并复核解压结构与 10MB 门禁
const { entries, zipBytes } = createAndValidateZip()

console.log(
  `xhs-tool OK：${files.length} 个文件，`
  + `目录 ${(totalBytes / 1000 / 1000).toFixed(2)}MB，`
  + `ZIP ${(zipBytes / 1000 / 1000).toFixed(2)}MB / 上限 10MB，`
  + `内联音频 ${audioInlined} 处，`
  + `优化静态 WebP ${optimizedImages} 张，`
  + `裁剪未引用场景图 ${prunedScenes} 张，`
  + `复用 resolved 帧 ${compactedActionFrames} 张，`
  + `ZIP 文件 ${entries.length} 个`,
)
console.log(`输出目录：${outDir}`)
console.log(`输出 ZIP：${zipPath}`)
