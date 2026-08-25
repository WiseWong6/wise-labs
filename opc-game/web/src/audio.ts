export type GameSoundEffect = 'start' | 'confirm' | 'exit' | 'back' | 'checkpoint' | 'survived'

// 完整路径字面量：小红书小工具打包脚本会把这些 assets/audio/*.mp3
// 引用原位替换为 base64 data URI，请勿改回拼接式路径。
const BGM_SOURCE = 'assets/audio/opc-office-loop.mp3'
const EFFECT_SOURCES: Record<GameSoundEffect, string> = {
  start: 'assets/audio/start.mp3',
  confirm: 'assets/audio/confirm.mp3',
  exit: 'assets/audio/exit.mp3',
  back: 'assets/audio/back.mp3',
  checkpoint: 'assets/audio/checkpoint.mp3',
  survived: 'assets/audio/survived.mp3',
}
const EFFECT_VOLUMES: Record<GameSoundEffect, number> = {
  start: 0.42,
  confirm: 0.34,
  exit: 0.42,
  back: 0.3,
  checkpoint: 0.4,
  survived: 0.48,
}

function swallowPlaybackBlock(promise: Promise<void> | undefined): void {
  promise?.catch(() => {
    // Browsers may reject playback until the next user gesture. The visible
    // sound toggle remains the recovery path, so this should not break play.
  })
}

export class GameAudio {
  private bgm: HTMLAudioElement | null = null
  private readonly effects = new Map<GameSoundEffect, HTMLAudioElement>()
  private enabled = true
  private bgmRequested = false
  private pageVisible = true

  isEnabled(): boolean {
    return this.enabled
  }

  private ensureBgm(): HTMLAudioElement {
    if (this.bgm) return this.bgm
    const audio = new Audio(BGM_SOURCE)
    audio.loop = true
    audio.preload = 'auto'
    audio.volume = 0.18
    this.bgm = audio
    return audio
  }

  private ensureEffect(effect: GameSoundEffect): HTMLAudioElement {
    const existing = this.effects.get(effect)
    if (existing) return existing
    const audio = new Audio(EFFECT_SOURCES[effect])
    audio.preload = 'auto'
    audio.volume = EFFECT_VOLUMES[effect]
    this.effects.set(effect, audio)
    return audio
  }

  private resumeBgm(): void {
    if (!this.enabled || !this.bgmRequested || !this.pageVisible) return
    swallowPlaybackBlock(this.ensureBgm().play())
  }

  startBgm(): void {
    this.bgmRequested = true
    this.resumeBgm()
  }

  stopBgm(): void {
    this.bgmRequested = false
    if (!this.bgm) return
    this.bgm.pause()
    this.bgm.currentTime = 0
  }

  playEffect(effect: GameSoundEffect): void {
    if (!this.enabled || !this.pageVisible) return
    const audio = this.ensureEffect(effect)
    audio.currentTime = 0
    swallowPlaybackBlock(audio.play())
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      this.resumeBgm()
      return
    }
    this.bgm?.pause()
    for (const effect of this.effects.values()) effect.pause()
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  setPageVisible(visible: boolean): void {
    this.pageVisible = visible
    if (visible) {
      this.resumeBgm()
      return
    }
    this.bgm?.pause()
    for (const effect of this.effects.values()) effect.pause()
  }
}

export const gameAudio = new GameAudio()
