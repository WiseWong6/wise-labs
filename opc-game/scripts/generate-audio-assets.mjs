import { execFile } from 'node:child_process'
import { mkdtemp, mkdir, rm, writeFile, copyFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const projectRoot = resolve(import.meta.dirname, '..')
const sampleRate = 44_100
const webOutputDir = join(projectRoot, 'web/public/assets/audio')
const miniOutputDir = join(projectRoot, 'miniprogram/assets/audio')

const NOTE_OFFSETS = {
  C: 0,
  'C#': 1,
  D: 2,
  'D#': 3,
  E: 4,
  F: 5,
  'F#': 6,
  G: 7,
  'G#': 8,
  A: 9,
  'A#': 10,
  B: 11,
}

function note(name) {
  const match = /^([A-G]#?)(-?\d)$/.exec(name)
  if (!match) throw new Error(`Invalid note: ${name}`)
  const midi = (Number(match[2]) + 1) * 12 + NOTE_OFFSETS[match[1]]
  return 440 * (2 ** ((midi - 69) / 12))
}

function createBuffer(durationSeconds) {
  return new Float64Array(Math.ceil(durationSeconds * sampleRate))
}

function waveSample(kind, phase) {
  const cycle = phase / (Math.PI * 2)
  if (kind === 'sine') return Math.sin(phase)
  if (kind === 'triangle') return (2 / Math.PI) * Math.asin(Math.sin(phase))
  if (kind === 'pulse') return (cycle - Math.floor(cycle)) < 0.25 ? 1 : -1
  return Math.sin(phase) >= 0 ? 1 : -1
}

function envelope(position, duration, attack = 0.01, release = 0.08) {
  const attackGain = attack > 0 ? Math.min(1, position / attack) : 1
  const releaseGain = release > 0 ? Math.min(1, (duration - position) / release) : 1
  return Math.max(0, Math.min(attackGain, releaseGain))
}

function addTone(buffer, {
  start,
  duration,
  frequency,
  endFrequency = frequency,
  amplitude,
  kind = 'square',
  attack = 0.008,
  release = 0.05,
  vibratoDepth = 0,
  vibratoRate = 5,
}) {
  const startSample = Math.max(0, Math.floor(start * sampleRate))
  const endSample = Math.min(buffer.length, Math.ceil((start + duration) * sampleRate))
  let phase = 0
  for (let index = startSample; index < endSample; index += 1) {
    const position = (index - startSample) / sampleRate
    const progress = position / duration
    const sweepFrequency = frequency * ((endFrequency / frequency) ** progress)
    const vibrato = 1 + (Math.sin(position * Math.PI * 2 * vibratoRate) * vibratoDepth)
    phase += (Math.PI * 2 * sweepFrequency * vibrato) / sampleRate
    buffer[index] += waveSample(kind, phase) * amplitude * envelope(position, duration, attack, release)
  }
}

function createNoise(seed = 0x0fc2026) {
  let value = seed >>> 0
  return () => {
    value ^= value << 13
    value ^= value >>> 17
    value ^= value << 5
    return ((value >>> 0) / 0xffffffff) * 2 - 1
  }
}

function addNoise(buffer, {
  start,
  duration,
  amplitude,
  attack = 0.001,
  release = duration,
  seed,
  color = 0,
}) {
  const random = createNoise(seed)
  const startSample = Math.max(0, Math.floor(start * sampleRate))
  const endSample = Math.min(buffer.length, Math.ceil((start + duration) * sampleRate))
  let previous = 0
  for (let index = startSample; index < endSample; index += 1) {
    const position = (index - startSample) / sampleRate
    const white = random()
    previous = (previous * color) + (white * (1 - color))
    buffer[index] += previous * amplitude * envelope(position, duration, attack, release)
  }
}

function addKick(buffer, start, amplitude = 0.22) {
  addTone(buffer, {
    start,
    duration: 0.18,
    frequency: 128,
    endFrequency: 48,
    amplitude,
    kind: 'sine',
    attack: 0.001,
    release: 0.16,
  })
}

function applyCircularDelay(buffer, delaySeconds, gain) {
  const dry = buffer.slice()
  const delaySamples = Math.round(delaySeconds * sampleRate)
  for (let index = 0; index < buffer.length; index += 1) {
    const delayedIndex = (index - delaySamples + buffer.length) % buffer.length
    buffer[index] += dry[delayedIndex] * gain
  }
}

function normalize(buffer, targetPeak = 0.9) {
  let peak = 0
  for (const sample of buffer) peak = Math.max(peak, Math.abs(sample))
  const scale = peak > 0 ? targetPeak / peak : 1
  for (let index = 0; index < buffer.length; index += 1) {
    buffer[index] = Math.tanh(buffer[index] * scale * 1.12) / Math.tanh(1.12)
  }
  return buffer
}

// 16 小节和弦:B 小调,A 段主歌(bm-G-D-A)、B 段副歌(em-G-D-F#),
// 末小节 F# 属和弦自然回到循环起点的 Bm。
const MUSIC_BARS = [
  { root: 'B2', fifth: 'F#2', tones: ['B3', 'D4', 'F#4'] },
  { root: 'B2', fifth: 'F#2', tones: ['B3', 'D4', 'F#4'] },
  { root: 'G2', fifth: 'D3', tones: ['G3', 'B3', 'D4'] },
  { root: 'G2', fifth: 'D3', tones: ['G3', 'B3', 'D4'] },
  { root: 'D3', fifth: 'A2', tones: ['D4', 'F#4', 'A4'] },
  { root: 'D3', fifth: 'A2', tones: ['D4', 'F#4', 'A4'] },
  { root: 'A2', fifth: 'E3', tones: ['A3', 'C#4', 'E4'] },
  { root: 'A2', fifth: 'E3', tones: ['A3', 'C#4', 'E4'] },
  { root: 'E2', fifth: 'B2', tones: ['E3', 'G3', 'B3'] },
  { root: 'E2', fifth: 'B2', tones: ['E3', 'G3', 'B3'] },
  { root: 'G2', fifth: 'D3', tones: ['G3', 'B3', 'D4'] },
  { root: 'G2', fifth: 'D3', tones: ['G3', 'B3', 'D4'] },
  { root: 'D3', fifth: 'A2', tones: ['D4', 'F#4', 'A4'] },
  { root: 'D3', fifth: 'A2', tones: ['D4', 'F#4', 'A4'] },
  { root: 'F#2', fifth: 'C#3', tones: ['F#3', 'A#3', 'C#4'] },
  { root: 'F#2', fifth: 'C#3', tones: ['F#3', 'A#3', 'C#4'] },
]

// 手写主旋律:[拍内起点, 音名, 时值(拍)]。A 段叙述、B 段高八度推进,
// 末尾 F#5 悬在属和弦上,由循环起点的 B4 解决。
const MUSIC_LEAD = [
  [[0, 'B4', 1], [1.5, 'D5', 0.5], [2, 'F#5', 1], [3, 'D5', 1]],
  [[0, 'B4', 1.5], [2, 'A4', 0.5], [3, 'B4', 1]],
  [[0, 'G4', 1], [1.5, 'B4', 0.5], [2, 'D5', 1.5]],
  [[0, 'B4', 1], [2, 'A4', 1], [3, 'G4', 1]],
  [[0, 'A4', 1], [1.5, 'D5', 0.5], [2, 'F#5', 1.5]],
  [[0, 'E5', 1], [2, 'D5', 1], [3, 'C#5', 1]],
  [[0, 'D5', 1.5], [2, 'E5', 0.5], [3, 'F#5', 1]],
  [[0, 'A5', 1.5], [2, 'F#5', 1], [3, 'E5', 1]],
  [[0, 'E5', 1], [1.5, 'G5', 0.5], [2, 'B5', 1.5]],
  [[0, 'A5', 1], [2, 'G5', 1], [3, 'E5', 1]],
  [[0, 'G5', 1], [1.5, 'B5', 0.5], [2, 'D6', 1.5]],
  [[0, 'B5', 1], [2, 'A5', 1], [3, 'G5', 1]],
  [[0, 'A5', 1], [1.5, 'D6', 0.5], [2, 'C#6', 1.5]],
  [[0, 'B5', 1], [2, 'A5', 1], [3, 'F#5', 1]],
  [[0, 'G5', 1.5], [2, 'A5', 0.5], [3, 'B5', 1]],
  [[0, 'A5', 1], [2, 'F#5', 1.5]],
]

function renderMusicLoop() {
  const bpm = 104
  const beat = 60 / bpm
  const swing = beat * 0.055
  const buffer = createBuffer(beat * MUSIC_BARS.length * 4)

  for (let bar = 0; bar < MUSIC_BARS.length; bar += 1) {
    const barStart = bar * 4 * beat
    const harmony = MUSIC_BARS[bar]
    const sectionB = bar >= 8

    for (let beatInBar = 0; beatInBar < 4; beatInBar += 1) {
      const start = barStart + (beatInBar * beat)

      // 鼓:1、3 拍底鼓,2、4 拍军鼓(噪声+皮膜音),八分踩镲带摇摆
      addKick(buffer, start, beatInBar === 0 ? 0.2 : 0.14)
      if (beatInBar === 3 && bar % 2 === 1) addKick(buffer, start + (beat * 0.5) + swing, 0.09)
      if (beatInBar === 1 || beatInBar === 3) {
        addNoise(buffer, { start, duration: 0.13, amplitude: 0.085, release: 0.11, color: 0.16, seed: 0x51f000 + (bar * 4) + beatInBar })
        addTone(buffer, { start, duration: 0.09, frequency: 190, endFrequency: 150, amplitude: 0.045, kind: 'triangle', release: 0.07 })
      }
      for (let eighth = 0; eighth < 2; eighth += 1) {
        const hatStart = start + (eighth * beat / 2) + (eighth === 1 ? swing : 0)
        addNoise(buffer, {
          start: hatStart,
          duration: 0.035,
          amplitude: (eighth === 0 ? 0.022 : 0.036) + (sectionB ? 0.005 : 0),
          release: 0.03,
          seed: 0xa11ce + (bar * 8) + (beatInBar * 2) + eighth,
        })
      }
    }

    // 每四小节末尾加一记十六分军鼓过门
    if (bar % 4 === 3) {
      for (let roll = 0; roll < 4; roll += 1) {
        addNoise(buffer, {
          start: barStart + (3 * beat) + (roll * beat / 4),
          duration: 0.06,
          amplitude: 0.04 + (roll * 0.012),
          release: 0.05,
          color: 0.2,
          seed: 0x7011 + (bar * 4) + roll,
        })
      }
    }

    // 贝斯:根-根-八度-五-根-五的行走型
    const bassLine = [
      [0, harmony.root, 0.85, 0.13],
      [1, harmony.root, 0.4, 0.1],
      [1.5, harmony.root, 0.35, 0.085, 2],
      [2, harmony.fifth, 0.85, 0.115],
      [3, harmony.root, 0.4, 0.1],
      [3.5, harmony.fifth, 0.35, 0.085],
    ]
    for (const [offset, name, length, amplitude, octave = 1] of bassLine) {
      addTone(buffer, {
        start: barStart + (offset * beat),
        duration: length * beat,
        frequency: note(name) * octave,
        amplitude,
        kind: 'triangle',
        attack: 0.008,
        release: 0.1,
      })
    }

    // 分解和弦:脉冲波八分,带摇摆,B 段更亮
    for (let step = 0; step < 8; step += 1) {
      const arpStart = barStart + (step * beat / 2) + (step % 2 === 1 ? swing : 0)
      const arpNote = harmony.tones[(step + bar) % harmony.tones.length]
      addTone(buffer, {
        start: arpStart,
        duration: beat * 0.3,
        frequency: note(arpNote) * (sectionB ? 4 : 2),
        amplitude: sectionB ? 0.055 : 0.042,
        kind: 'pulse',
        attack: 0.004,
        release: 0.05,
      })
    }

    // 主旋律:方波加三角波叠底,带颤音
    for (const [offset, name, length] of MUSIC_LEAD[bar]) {
      const leadStart = barStart + (offset * beat)
      const leadDuration = length * beat
      addTone(buffer, {
        start: leadStart,
        duration: leadDuration,
        frequency: note(name),
        amplitude: sectionB ? 0.056 : 0.048,
        kind: 'square',
        attack: 0.018,
        release: 0.14,
        vibratoDepth: 0.004,
        vibratoRate: 6,
      })
      addTone(buffer, {
        start: leadStart,
        duration: leadDuration,
        frequency: note(name),
        amplitude: 0.018,
        kind: 'triangle',
        attack: 0.02,
        release: 0.14,
      })
    }
  }

  applyCircularDelay(buffer, beat * 0.75, 0.11)
  return normalize(buffer, 0.82)
}

function renderStart() {
  const buffer = createBuffer(0.78)
  ;['B4', 'D5', 'F#5', 'B5'].forEach((name, index) => {
    addTone(buffer, {
      start: index * 0.105,
      duration: 0.34,
      frequency: note(name),
      amplitude: 0.22,
      kind: index === 3 ? 'triangle' : 'square',
      release: 0.22,
    })
  })
  return normalize(buffer)
}

function renderConfirm() {
  const buffer = createBuffer(0.26)
  addTone(buffer, { start: 0, duration: 0.11, frequency: note('B5'), amplitude: 0.3, kind: 'pulse', release: 0.08 })
  addTone(buffer, { start: 0.08, duration: 0.16, frequency: note('F#6'), amplitude: 0.23, kind: 'square', release: 0.12 })
  return normalize(buffer)
}

function renderExit() {
  const buffer = createBuffer(0.72)
  ;['F#5', 'D5', 'A4', 'B3'].forEach((name, index) => {
    addTone(buffer, {
      start: index * 0.12,
      duration: 0.26,
      frequency: note(name),
      amplitude: 0.19,
      kind: index === 3 ? 'triangle' : 'square',
      release: 0.18,
    })
  })
  addNoise(buffer, { start: 0.38, duration: 0.22, amplitude: 0.045, release: 0.2, color: 0.42, seed: 0xe017 })
  return normalize(buffer, 0.84)
}

function renderBack() {
  const buffer = createBuffer(0.28)
  addTone(buffer, {
    start: 0,
    duration: 0.23,
    frequency: note('E5'),
    endFrequency: note('B4'),
    amplitude: 0.27,
    kind: 'triangle',
    release: 0.11,
  })
  return normalize(buffer, 0.82)
}

function renderCheckpoint() {
  const buffer = createBuffer(0.86)
  addNoise(buffer, { start: 0, duration: 0.08, amplitude: 0.14, release: 0.07, color: 0.62, seed: 0xc45 })
  ;['D6', 'A6', 'D7'].forEach((name, index) => {
    addTone(buffer, {
      start: 0.12 + (index * 0.095),
      duration: 0.42,
      frequency: note(name),
      amplitude: 0.18 - (index * 0.025),
      kind: 'triangle',
      release: 0.3,
    })
  })
  return normalize(buffer, 0.84)
}

function renderSurvived() {
  const buffer = createBuffer(1.7)
  const notes = [
    ['D5', 0, 0.3],
    ['F#5', 0.18, 0.32],
    ['A5', 0.36, 0.36],
    ['D6', 0.58, 0.86],
  ]
  for (const [name, start, duration] of notes) {
    addTone(buffer, { start, duration, frequency: note(name), amplitude: 0.19, kind: 'square', release: Math.min(0.32, duration * 0.7) })
    addTone(buffer, { start, duration, frequency: note(name) / 2, amplitude: 0.08, kind: 'triangle', release: Math.min(0.3, duration * 0.65) })
  }
  addNoise(buffer, { start: 0.58, duration: 0.42, amplitude: 0.055, release: 0.4, seed: 0x20260717 })
  return normalize(buffer, 0.86)
}

function encodeWav(buffer) {
  const bytesPerSample = 2
  const dataSize = buffer.length * bytesPerSample
  const wav = Buffer.alloc(44 + dataSize)
  wav.write('RIFF', 0)
  wav.writeUInt32LE(36 + dataSize, 4)
  wav.write('WAVE', 8)
  wav.write('fmt ', 12)
  wav.writeUInt32LE(16, 16)
  wav.writeUInt16LE(1, 20)
  wav.writeUInt16LE(1, 22)
  wav.writeUInt32LE(sampleRate, 24)
  wav.writeUInt32LE(sampleRate * bytesPerSample, 28)
  wav.writeUInt16LE(bytesPerSample, 32)
  wav.writeUInt16LE(16, 34)
  wav.write('data', 36)
  wav.writeUInt32LE(dataSize, 40)
  for (let index = 0; index < buffer.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, buffer[index]))
    wav.writeInt16LE(Math.round(sample * 0x7fff), 44 + (index * bytesPerSample))
  }
  return wav
}

const assets = [
  { file: 'opc-office-loop.mp3', render: renderMusicLoop, bitrate: '40k' },
  { file: 'start.mp3', render: renderStart, bitrate: '64k' },
  { file: 'confirm.mp3', render: renderConfirm, bitrate: '64k' },
  { file: 'exit.mp3', render: renderExit, bitrate: '64k' },
  { file: 'back.mp3', render: renderBack, bitrate: '64k' },
  { file: 'checkpoint.mp3', render: renderCheckpoint, bitrate: '64k' },
  { file: 'survived.mp3', render: renderSurvived, bitrate: '64k' },
]

async function renderAsset(asset, temporaryDir) {
  const wavPath = join(temporaryDir, asset.file.replace(/\.mp3$/, '.wav'))
  const outputPath = join(webOutputDir, asset.file)
  await writeFile(wavPath, encodeWav(asset.render()))
  await execFileAsync('ffmpeg', [
    '-hide_banner',
    '-loglevel', 'error',
    '-y',
    '-i', wavPath,
    '-filter:a', 'volume=-2dB',
    '-codec:a', 'libmp3lame',
    '-b:a', asset.bitrate,
    '-ar', String(sampleRate),
    '-ac', '1',
    outputPath,
  ])
  await copyFile(outputPath, join(miniOutputDir, asset.file))
  return outputPath
}

const temporaryDir = await mkdtemp(join(tmpdir(), 'opc-audio-'))
try {
  await Promise.all([webOutputDir, miniOutputDir].map((path) => mkdir(path, { recursive: true })))
  for (const asset of assets) {
    const output = await renderAsset(asset, temporaryDir)
    console.log(`generated ${output}`)
  }
} finally {
  await rm(temporaryDir, { recursive: true, force: true })
}
