export type GameSoundEffect = 'start' | 'confirm' | 'exit' | 'back' | 'checkpoint' | 'survived'

const AUDIO_ROOT = '/assets/audio'
const EFFECT_VOLUMES: Record<GameSoundEffect, number> = {
  start: 0.42,
  confirm: 0.34,
  exit: 0.42,
  back: 0.3,
  checkpoint: 0.4,
  survived: 0.48,
}

export class MiniProgramGameAudio {
  private bgm: WechatMiniprogram.InnerAudioContext | null = null
  private effect: WechatMiniprogram.InnerAudioContext | null = null
  private enabled = true
  private bgmRequested = false
  private pageVisible = true

  initialize(): void {
    if (this.bgm && this.effect) return
    wx.setInnerAudioOption({
      mixWithOther: true,
      obeyMuteSwitch: true,
    })

    this.bgm = wx.createInnerAudioContext({ useWebAudioImplement: false })
    this.bgm.autoplay = false
    this.bgm.loop = true
    this.bgm.volume = 0.18
    this.bgm.src = `${AUDIO_ROOT}/opc-office-loop.mp3`

    this.effect = wx.createInnerAudioContext({ useWebAudioImplement: true })
    this.effect.autoplay = false
  }

  isEnabled(): boolean {
    return this.enabled
  }

  private resumeBgm(): void {
    if (!this.enabled || !this.bgmRequested || !this.pageVisible) return
    this.initialize()
    this.bgm?.play()
  }

  startBgm(): void {
    this.bgmRequested = true
    this.resumeBgm()
  }

  stopBgm(): void {
    this.bgmRequested = false
    this.bgm?.stop()
  }

  playEffect(name: GameSoundEffect): void {
    if (!this.enabled || !this.pageVisible) return
    this.initialize()
    if (!this.effect) return
    this.effect.stop()
    this.effect.src = `${AUDIO_ROOT}/${name}.mp3`
    this.effect.volume = EFFECT_VOLUMES[name]
    this.effect.play()
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled
    if (enabled) {
      this.resumeBgm()
      return
    }
    this.bgm?.pause()
    this.effect?.stop()
  }

  toggle(): boolean {
    this.setEnabled(!this.enabled)
    return this.enabled
  }

  onHide(): void {
    this.pageVisible = false
    this.bgm?.pause()
    this.effect?.stop()
  }

  onShow(): void {
    this.pageVisible = true
    this.resumeBgm()
  }

  destroy(): void {
    this.bgmRequested = false
    this.bgm?.destroy()
    this.effect?.destroy()
    this.bgm = null
    this.effect = null
  }
}

export const gameAudio = new MiniProgramGameAudio()
