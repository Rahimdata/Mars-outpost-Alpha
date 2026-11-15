const SETTINGS_KEY = 'mars-outpost-alpha-audio-v1'
const TRACK_URL = '/audio/intro_ambient.mp3'
const TRACK_TARGET = 1
const START_FADE_MS = 4000
const CROSSFADE_MS = 3000

type MusicSettings = { musicVolume: number; musicMuted: boolean }
let settings: MusicSettings = { musicVolume: 30, musicMuted: false }
let tracks: HTMLAudioElement[] = []
let envelopes = [0, 0]
let activeIndex = 0
let crossfading = false
let started = false
let focusPaused = false
let ducked = false
let duckTimer: number | undefined

function readSettings(): MusicSettings {
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? 'null') as Partial<MusicSettings> | null
    return { musicVolume: Math.max(0, Math.min(100, saved?.musicVolume ?? 30)), musicMuted: saved?.musicMuted === true }
  } catch { return { musicVolume: 30, musicMuted: false } }
}

settings = readSettings()

function applyVolumes() {
  const level = settings.musicMuted ? 0 : TRACK_TARGET * settings.musicVolume / 100 * (ducked ? 0.5 : 1)
  tracks.forEach((track, index) => { track.volume = Math.max(0, Math.min(1, level * envelopes[index])) })
}

function ramp(index: number, target: number, duration: number, done?: () => void) {
  const from = envelopes[index]
  const start = performance.now()
  const step = (now: number) => {
    if (!tracks[index]) return
    const t = Math.min(1, (now - start) / duration)
    envelopes[index] = from + (target - from) * t
    applyVolumes()
    if (t < 1) requestAnimationFrame(step)
    else done?.()
  }
  requestAnimationFrame(step)
}

function finishCrossfade() {
  if (!crossfading) return
  const previous = activeIndex
  activeIndex = 1 - activeIndex
  crossfading = false
  tracks[previous].pause()
  try { tracks[previous].currentTime = 0 } catch { /* Media metadata may not be ready yet. */ }
  envelopes[previous] = 0
  applyVolumes()
}

function beginCrossfade() {
  if (!started || focusPaused || crossfading || !tracks.length || !Number.isFinite(tracks[activeIndex].duration)) return
  const remaining = tracks[activeIndex].duration - tracks[activeIndex].currentTime
  if (remaining > CROSSFADE_MS / 1000) return
  const nextIndex = 1 - activeIndex
  crossfading = true
  tracks[nextIndex].currentTime = 0
  envelopes[nextIndex] = 0
  applyVolumes()
  void tracks[nextIndex].play().then(() => {
    ramp(activeIndex, 0, CROSSFADE_MS)
    ramp(nextIndex, 1, CROSSFADE_MS, finishCrossfade)
  }).catch(() => { crossfading = false })
}

export function setIntroMusicSettings(next: MusicSettings) {
  settings = { musicVolume: Math.max(0, Math.min(100, next.musicVolume)), musicMuted: next.musicMuted }
  applyVolumes()
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_KEY) ?? '{}') as Record<string, unknown>
    localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...saved, ...settings }))
  } catch { /* Music controls remain available for this session. */ }
  window.dispatchEvent(new CustomEvent('mars-intro-music-settings', { detail: settings }))
}

export function getIntroMusicSettings() { return { ...settings } }

export function startIntroMusic() {
  if (started) {
    if (!focusPaused && tracks[activeIndex]?.paused) void tracks[activeIndex].play().catch(() => undefined)
    return
  }
  started = true
  tracks = [new Audio(TRACK_URL), new Audio(TRACK_URL)]
  tracks.forEach((track) => {
    track.preload = 'auto'
    track.loop = false
    track.addEventListener('timeupdate', beginCrossfade)
    track.addEventListener('ended', finishCrossfade)
    track.addEventListener('error', () => console.warn(`Ambient music asset could not be loaded: ${TRACK_URL}`), { once: true })
  })
  activeIndex = 0
  envelopes = [0, 0]
  void tracks[0].play().then(() => ramp(0, 1, START_FADE_MS)).catch(() => { started = false })
}

export function setIntroMusicPaused(paused: boolean) {
  focusPaused = paused
  if (!started) return
  if (paused) tracks.forEach((track) => track.pause())
  else {
    const toResume = crossfading ? [activeIndex, 1 - activeIndex] : [activeIndex]
    toResume.forEach((index) => { if (envelopes[index] > 0 || (crossfading && index !== activeIndex)) void tracks[index].play().catch(() => undefined) })
  }
}

export function duckIntroMusic(durationMs = 1800) {
  ducked = true
  applyVolumes()
  if (duckTimer) window.clearTimeout(duckTimer)
  duckTimer = window.setTimeout(() => { ducked = false; applyVolumes() }, durationMs)
}
