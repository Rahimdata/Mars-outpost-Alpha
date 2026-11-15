import { duckIntroMusic } from './introMusic'

export const MARS_AUDIO_CONFIG = {
  speedOfSound: 240,
  maxVoices: 32,
  mechanicalFullPresenceMeters: 5,
  mechanicalFadeMeters: 28,
  outdoorLowPassHz: 260,
  outdoorWindCutoffHz: 420,
  indoorLowPassHz: 18000,
  roomFadeSeconds: 2.6,
  airlockFadeSeconds: 3.2,
  suitFanHz: 128,
  suitWhineHz: 186,
  airQualityAlarmPercent: 25,
} as const

export type AudioEnvironment = 'outside' | 'airlock' | 'habitat' | 'greenhouse' | 'laboratory' | 'rover'
export type MarsAudioSettings = {
  master: number
  music: number
  effects: number
  voice: number
  ambience: number
  realisticMarsAcoustics: boolean
}
export type MarsAudioBus = 'suit' | 'footsteps' | 'voice' | 'ui' | 'ambience' | 'music'
export type FootstepSurface = 'regolith' | 'rock' | 'metal' | 'grating'

export const MARS_AUDIO_MANIFEST = {
  suitFan: { source: 'procedural:filtered-oscillator', volume: 0.04, loop: true, bus: 'suit' },
  suitBreath: { source: 'procedural:filtered-noise', volume: 0.018, loop: true, bus: 'suit' },
  outdoorWind: { source: 'procedural:slow-gust-filtered-noise', volume: 0.036, loop: true, bus: 'ambience' },
  greenhouseFans: { source: 'procedural:filtered-oscillator', volume: 0.018, loop: true, bus: 'ambience' },
  footsteps: { source: 'procedural:material-variations', volume: 0.11, loop: false, bus: 'footsteps', variations: 8 },
  airlock: { source: 'procedural:noise-envelope', volume: 0.14, loop: false, bus: 'ui' },
  interaction: { source: 'procedural:two-tone', volume: 0.045, loop: false, bus: 'ui' },
} as const

type BusGraph = Record<MarsAudioBus, GainNode>
type AudioDebugState = { environment: AudioEnvironment; activeVoices: number; busLevels: Record<MarsAudioBus | 'master', number> }

/** Procedural suit, habitat and UI soundscape. Real recordings can replace manifest sources later. */
export class MarsAudioManager {
  private context: AudioContext | null = null
  private master: GainNode | null = null
  private buses: BusGraph | null = null
  private sources: AudioScheduledSourceNode[] = []
  private voices = new Set<AudioScheduledSourceNode>()
  private random = 1
  private environment: AudioEnvironment = 'outside'
  private storm = 0
  private oxygen = 100
  private speed = 0
  private realistic = true
  private paused = false
  private nextOxygenAlarmAt = 0
  private lastStormAlert = false
  private settings: MarsAudioSettings = { master: 0.34, music: 0.14, effects: 0.55, voice: 0.5, ambience: 0.2, realisticMarsAcoustics: true }
  private loopLevels: Partial<Record<'outdoor' | 'storm' | 'indoor' | 'suit' | 'breath' | 'rover' | 'music', GainNode>> = {}
  private loopNoiseLevels: Partial<Record<'storm' | 'indoor', GainNode>> = {}
  private roomSend: GainNode | null = null
  private ambienceDuck: GainNode | null = null
  private musicDuck: GainNode | null = null
  private debugLevels: Record<MarsAudioBus | 'master', number> = { master: 0.34, suit: 1, footsteps: 1, voice: 0.5, ui: 1, ambience: 0.2, music: 0.14 }

  async start() {
    if (!this.context) this.createGraph()
    if (this.context?.state === 'suspended') await this.context.resume()
    this.applySettings()
    this.setEnvironment(this.environment)
  }

  private createGraph() {
    const context = new AudioContext()
    const master = context.createGain()
    const buses = Object.fromEntries((['suit', 'footsteps', 'voice', 'ui', 'ambience', 'music'] as MarsAudioBus[]).map((id) => [id, context.createGain()])) as BusGraph
    master.connect(context.destination)
    const ambienceDuck = context.createGain()
    const musicDuck = context.createGain()
    ambienceDuck.gain.value = 1
    musicDuck.gain.value = 1
    for (const id of Object.keys(buses) as MarsAudioBus[]) {
      if (id === 'ambience') buses[id].connect(ambienceDuck).connect(master)
      else if (id === 'music') buses[id].connect(musicDuck).connect(master)
      else buses[id].connect(master)
    }
    const roomSend = context.createGain()
    const convolver = context.createConvolver()
    const impulse = context.createBuffer(2, Math.floor(context.sampleRate * 0.72), context.sampleRate)
    for (let channel = 0; channel < 2; channel += 1) {
      const samples = impulse.getChannelData(channel)
      for (let index = 0; index < samples.length; index += 1) samples[index] = (Math.random() * 2 - 1) * Math.pow(1 - index / samples.length, channel === 0 ? 5 : 6) * 0.22
    }
    convolver.buffer = impulse
    roomSend.connect(convolver).connect(buses.ambience)
    this.context = context
    this.master = master
    this.buses = buses
    this.roomSend = roomSend
    this.ambienceDuck = ambienceDuck
    this.musicDuck = musicDuck
    this.startOutdoorAmbience(buses.ambience)
    this.startLoop('storm', buses.ambience, 0, 58, 'lowpass', 165)
    this.startLoop('indoor', buses.ambience, 0, 126, 'lowpass', 760)
    this.startLoop('suit', buses.suit, 0, MARS_AUDIO_CONFIG.suitFanHz, 'lowpass', 520)
    this.startBreathLoop(buses.suit)
    this.startLoop('rover', buses.ambience, 0, 72, 'lowpass', 420)
    this.startWhine(buses.suit, MARS_AUDIO_CONFIG.suitWhineHz, 0.0035)
  }

  private makeNoise(seconds = 2) {
    const context = this.context!
    const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * seconds)), context.sampleRate)
    const data = buffer.getChannelData(0)
    for (let i = 0; i < data.length; i += 1) data[i] = (Math.random() * 2 - 1) * 0.32
    return buffer
  }

  private startOutdoorAmbience(bus: GainNode) {
    const context = this.context!
    const noise = context.createBufferSource()
    const highPass = context.createBiquadFilter()
    const lowPass = context.createBiquadFilter()
    const gust = context.createGain()
    const swell = context.createOscillator()
    const swellDepth = context.createGain()
    const environmentGain = context.createGain()

    noise.buffer = this.makeNoise(12)
    noise.loop = true
    highPass.type = 'highpass'
    highPass.frequency.value = 42
    highPass.Q.value = 0.45
    lowPass.type = 'lowpass'
    lowPass.frequency.value = MARS_AUDIO_CONFIG.outdoorWindCutoffHz
    lowPass.Q.value = 0.35
    gust.gain.value = 0.78
    swell.type = 'sine'
    swell.frequency.value = 0.055
    swellDepth.gain.value = 0.16
    environmentGain.gain.value = 0

    swell.connect(swellDepth).connect(gust.gain)
    noise.connect(highPass).connect(lowPass).connect(gust).connect(environmentGain).connect(bus)
    noise.start()
    swell.start()
    this.sources.push(noise, swell)
    this.loopLevels.outdoor = environmentGain
  }

  private startLoop(id: 'storm' | 'indoor' | 'suit' | 'rover', bus: GainNode, level: number, frequency: number, filterType: BiquadFilterType, cutoff: number) {
    const context = this.context!
    const oscillator = context.createOscillator()
    const filter = context.createBiquadFilter()
    const gain = context.createGain()
    oscillator.type = id === 'storm' ? 'sine' : 'triangle'
    oscillator.frequency.value = frequency
    filter.type = filterType
    filter.frequency.value = cutoff
    gain.gain.value = level
    oscillator.connect(filter).connect(gain).connect(bus)
    oscillator.start()
    this.sources.push(oscillator)
    this.loopLevels[id] = gain
    if (id === 'storm' || id === 'indoor') {
      const noise = context.createBufferSource()
      const noiseFilter = context.createBiquadFilter()
      const noiseGain = context.createGain()
      noise.buffer = this.makeNoise(8)
      noise.loop = true
      noiseFilter.type = filterType
      noiseFilter.frequency.value = id === 'storm' ? 180 : 500
      noiseGain.gain.value = 0
      noise.connect(noiseFilter).connect(noiseGain).connect(bus)
      noise.start()
      this.sources.push(noise)
      this.loopNoiseLevels[id] = noiseGain
    }
  }

  private startBreathLoop(bus: GainNode) {
    const context = this.context!
    const noise = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    const lfo = context.createOscillator()
    const lfoGain = context.createGain()
    noise.buffer = this.makeNoise(1.4)
    noise.loop = true
    filter.type = 'bandpass'
    filter.frequency.value = 470
    filter.Q.value = 0.55
    envelope.gain.value = 0.0001
    lfo.type = 'sine'
    lfo.frequency.value = 0.19
    lfoGain.gain.value = 0.006
    lfo.connect(lfoGain).connect(envelope.gain)
    noise.connect(filter).connect(envelope).connect(bus)
    noise.start()
    lfo.start()
    this.sources.push(noise, lfo)
    this.loopLevels.breath = envelope
  }

  private startWhine(bus: GainNode, frequency: number, level: number) {
    const oscillator = this.context!.createOscillator()
    const gain = this.context!.createGain()
    oscillator.type = 'sine'
    oscillator.frequency.value = frequency
    gain.gain.value = level
    oscillator.connect(gain).connect(bus)
    oscillator.start()
    this.sources.push(oscillator)
  }

  setSettings(settings: MarsAudioSettings) {
    this.settings = { ...settings }
    this.realistic = settings.realisticMarsAcoustics
    this.applySettings()
  }

  private applySettings() {
    const context = this.context
    if (!context || !this.master || !this.buses) return
    const values: Record<MarsAudioBus | 'master', number> = {
      master: this.settings.master,
      suit: this.settings.realisticMarsAcoustics ? 0.88 : 0.58,
      footsteps: this.settings.effects,
      voice: this.settings.voice,
      ui: this.settings.effects,
      ambience: this.settings.ambience,
      music: this.settings.music,
    }
    this.debugLevels = values
    this.master.gain.setTargetAtTime(this.paused ? 0 : this.settings.master, context.currentTime, 0.18)
    this.loopLevels.music?.gain.setTargetAtTime(this.settings.music > 0 ? 0.0007 : 0.0001, context.currentTime, 2.4)
    for (const id of Object.keys(this.buses) as MarsAudioBus[]) {
      const scaled = id === 'suit' ? values.suit : values[id]
      this.buses[id].gain.setTargetAtTime(scaled, context.currentTime, 0.2)
    }
  }

  setVolumes(master: number, effects: number) {
    this.setSettings({ ...this.settings, master, effects })
  }

  setPaused(paused: boolean) {
    this.paused = paused
    this.applySettings()
    if (paused) void this.context?.suspend()
  }

  setEnvironment(environment: AudioEnvironment) {
    this.environment = environment
    const context = this.context
    if (!context) return
    const now = context.currentTime
    const fade = environment === 'airlock' ? MARS_AUDIO_CONFIG.airlockFadeSeconds : MARS_AUDIO_CONFIG.roomFadeSeconds
    const inside = environment === 'habitat' || environment === 'greenhouse' || environment === 'laboratory'
    const level = (id: keyof MarsAudioManager['loopLevels'], value: number) => this.loopLevels[id]?.gain.setTargetAtTime(value, now, fade / 4)
    const noiseLevel = (id: keyof MarsAudioManager['loopNoiseLevels'], value: number) => this.loopNoiseLevels[id]?.gain.setTargetAtTime(value, now, fade / 4)
    level('outdoor', environment === 'outside' ? this.realistic ? 0.038 : 0.075 : environment === 'airlock' ? 0.018 : 0)
    level('storm', this.storm * (inside ? 0.012 : 0.022))
    noiseLevel('storm', this.storm * (inside ? 0.003 : 0.006))
    level('indoor', inside ? environment === 'greenhouse' ? 0.031 : 0.021 : environment === 'airlock' ? 0.012 : 0)
    noiseLevel('indoor', inside ? environment === 'greenhouse' ? 0.004 : 0.0025 : environment === 'airlock' ? 0.001 : 0)
    level('suit', environment === 'outside' ? 0.048 : environment === 'airlock' ? 0.04 : environment === 'rover' ? 0.022 : 0.006)
    level('breath', environment === 'outside' || environment === 'airlock' ? this.breathingLevel() : environment === 'rover' ? 0.004 : 0.0008)
    level('rover', environment === 'rover' ? 0.025 : 0)
    this.roomSend?.gain.setTargetAtTime(inside ? environment === 'laboratory' ? 0.1 : 0.055 : 0, now, fade / 4)
  }

  updateTelemetry({ storm, oxygen, speed }: { storm: number; oxygen: number; speed: number }) {
    this.storm = Math.max(0, Math.min(1, storm))
    this.oxygen = Math.max(0, Math.min(100, oxygen))
    this.speed = Math.max(0, speed)
    this.setEnvironment(this.environment)
    const context = this.context
    if (!context) return
    if (this.oxygen < MARS_AUDIO_CONFIG.airQualityAlarmPercent && context.currentTime >= this.nextOxygenAlarmAt) {
      this.playWarning('oxygen')
      this.nextOxygenAlarmAt = context.currentTime + Math.max(0.75, this.oxygen / 15)
    }
    const stormActive = this.storm > 0.55
    if (stormActive && !this.lastStormAlert) this.playWarning('dust')
    this.lastStormAlert = stormActive
  }

  private breathingLevel() {
    return 0.002 + Math.min(1, this.speed / 7) * 0.006 + Math.max(0, 38 - this.oxygen) / 38 * 0.009
  }

  updateMotion(speed: number) {
    this.speed = speed
    const context = this.context
    if (!context) return
    this.loopLevels.breath?.gain.setTargetAtTime(this.environment === 'outside' || this.environment === 'airlock' ? this.breathingLevel() : 0.0008, context.currentTime, 0.35)
    const fan = this.loopLevels.suit
    if (fan) fan.gain.setTargetAtTime((this.environment === 'outside' ? 0.038 : 0.006) + Math.min(0.018, speed * 0.0015), context.currentTime, 0.45)
  }

  playInteraction() {
    const context = this.context
    const output = this.buses?.ui
    if (!context || !output || context.state !== 'running') return
    this.tone(output, 540, 260, 0.045, 0.11, 'sine')
  }

  playGarageDoor(opening: boolean) {
    const context = this.context
    const output = this.buses?.ui
    if (!context || !output || context.state !== 'running') return
    const from = opening ? 72 : 118
    const to = opening ? 210 : 58
    this.tone(output, from, to, 0.065, 0.72, 'sawtooth')
    this.noiseBurst(output, 0.035, 0.58, this.environment !== 'outside', 620)
    this.tone(output, opening ? 196 : 92, opening ? 138 : 64, 0.055, 0.2, 'triangle', false, 0.66)
  }

  playRadioCue() {
    const context = this.context
    const output = this.buses?.voice
    if (!context || !output || context.state !== 'running') return
    this.duckEnvironment(0.48)
    this.duckMusic(0.58)
    duckIntroMusic(1400)
    this.noiseBurst(output, 0.045, 0.055, this.environment !== 'outside')
    this.tone(output, 820, 540, 0.022, 0.08, 'square', true)
  }

  playCampaignCompleteCue() {
    const context = this.context
    const output = this.buses?.ui
    if (!context || !output || context.state !== 'running') return
    this.tone(output, 440, 440, 0.024, 0.34, 'sine')
    this.tone(output, 554.37, 554.37, 0.021, 0.38, 'sine', false, 0.16)
    this.tone(output, 659.25, 659.25, 0.019, 0.52, 'sine', false, 0.32)
  }

  playAirlock(entering: boolean) {
    const context = this.context
    const output = this.buses?.ui
    if (!context || !output || context.state !== 'running') return
    this.environment = 'airlock'
    this.setEnvironment('airlock')
    this.noiseBurst(output, 0.105, MARS_AUDIO_CONFIG.airlockFadeSeconds, true, entering ? 420 : 220)
    this.tone(output, entering ? 135 : 105, entering ? 86 : 63, 0.075, 0.52, 'triangle')
  }

  playFootstep(surface: FootstepSurface, running: boolean, inside: boolean) {
    const context = this.context
    const output = this.buses?.footsteps
    if (!context || !output || context.state !== 'running' || this.voices.size >= MARS_AUDIO_CONFIG.maxVoices) return
    const variation = this.nextRandom()
    const now = context.currentTime
    const duration = running ? 0.17 : 0.21
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const lowpass = context.createBiquadFilter()
    const baseFrequency = surface === 'metal' ? 132 : surface === 'grating' ? 105 : surface === 'rock' ? 84 : 62
    oscillator.type = surface === 'metal' ? 'triangle' : 'sine'
    oscillator.frequency.setValueAtTime(baseFrequency * (0.95 + variation * 0.1), now)
    oscillator.frequency.exponentialRampToValueAtTime(baseFrequency * 0.55, now + duration)
    lowpass.type = 'lowpass'
    lowpass.frequency.value = inside ? surface === 'metal' ? 1400 : 950 : this.realistic ? surface === 'regolith' ? 210 : 340 : 900
    envelope.gain.setValueAtTime((inside ? 0.055 : 0.09) * (running ? 1.2 : 0.8), now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(lowpass).connect(envelope).connect(output)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
    this.trackVoice(oscillator)
    this.noiseBurst(output, surface === 'metal' ? 0.018 : 0.026, surface === 'regolith' ? 0.11 : 0.07, inside, inside ? 1700 : this.realistic ? 430 : 1700)
  }

  playWorldEvent({ distance, pan = 0, frequency = 75, volume = 0.12 }: { distance: number; pan?: number; frequency?: number; volume?: number }) {
    const context = this.context
    const output = this.buses?.ambience
    if (!context || !output || context.state !== 'running') return
    const delay = Math.max(0, distance) / MARS_AUDIO_CONFIG.speedOfSound
    const startAt = context.currentTime + delay
    const source = context.createOscillator()
    const filter = context.createBiquadFilter()
    const panner = context.createPanner()
    const envelope = context.createGain()
    panner.panningModel = 'HRTF'
    panner.distanceModel = 'linear'
    panner.refDistance = MARS_AUDIO_CONFIG.mechanicalFullPresenceMeters
    panner.maxDistance = MARS_AUDIO_CONFIG.mechanicalFadeMeters
    panner.rolloffFactor = this.realistic ? 1.35 : 0.55
    panner.positionX.value = pan * Math.min(distance, 18)
    panner.positionZ.value = -Math.sqrt(Math.max(0, distance * distance - panner.positionX.value ** 2))
    filter.type = 'lowpass'
    filter.frequency.value = this.realistic ? Math.max(MARS_AUDIO_CONFIG.outdoorLowPassHz, 5200 - distance * 182) : 9000
    source.type = 'sine'
    source.frequency.value = frequency
    envelope.gain.setValueAtTime(volume * Math.exp(-Math.max(0, distance) / (this.realistic ? 7.5 : 20)), startAt)
    envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + 0.75)
    source.connect(filter).connect(envelope).connect(panner).connect(output)
    source.start(startAt)
    source.stop(startAt + 0.8)
    this.trackVoice(source)
  }

  private playWarning(type: 'oxygen' | 'dust') {
    const context = this.context
    const output = this.buses?.ui
    if (!context || !output || context.state !== 'running') return
    this.duckMusic(0.3)
    duckIntroMusic(type === 'oxygen' ? 1400 : 1200)
    if (type === 'oxygen') {
      const urgency = 1 - this.oxygen / 100
      this.tone(output, 660, 660, 0.045, 0.085, 'sine')
      if (urgency > 0.65) this.tone(output, 660, 660, 0.04, 0.085, 'sine', false, 0.12)
    } else {
      this.tone(output, 92, 69, 0.12, 0.36, 'triangle')
      this.tone(output, 64, 51, 0.1, 0.48, 'sine', false, 0.18)
    }
  }

  private duckEnvironment(level: number) {
    const context = this.context
    if (!context || !this.ambienceDuck) return
    const now = context.currentTime
    this.ambienceDuck.gain.cancelScheduledValues(now)
    this.ambienceDuck.gain.setTargetAtTime(level, now, 0.12)
    this.ambienceDuck.gain.setTargetAtTime(1, now + 0.95, 0.48)
  }

  private duckMusic(level: number) {
    const context = this.context
    if (!context || !this.musicDuck) return
    const now = context.currentTime
    this.musicDuck.gain.cancelScheduledValues(now)
    this.musicDuck.gain.setTargetAtTime(level, now, 0.08)
    this.musicDuck.gain.setTargetAtTime(1, now + 1.3, 0.55)
  }

  private tone(output: AudioNode, from: number, to: number, volume: number, duration: number, type: OscillatorType, radio = false, offset = 0) {
    const context = this.context!
    if (this.voices.size >= MARS_AUDIO_CONFIG.maxVoices) return
    const now = context.currentTime + offset
    const oscillator = context.createOscillator()
    const envelope = context.createGain()
    const filter = context.createBiquadFilter()
    oscillator.type = type
    oscillator.frequency.setValueAtTime(from, now)
    if (to !== from) oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, to), now + duration)
    filter.type = radio ? 'bandpass' : 'lowpass'
    filter.frequency.value = radio ? 2800 : 8000
    envelope.gain.setValueAtTime(Math.max(0.001, volume), now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    oscillator.connect(filter).connect(envelope).connect(output)
    if (this.environment !== 'outside' && this.roomSend) envelope.connect(this.roomSend)
    oscillator.start(now)
    oscillator.stop(now + duration + 0.01)
    this.trackVoice(oscillator)
  }

  private noiseBurst(output: AudioNode, volume: number, duration: number, inside: boolean, cutoff = 1200) {
    const context = this.context!
    if (this.voices.size >= MARS_AUDIO_CONFIG.maxVoices) return
    const source = context.createBufferSource()
    const filter = context.createBiquadFilter()
    const envelope = context.createGain()
    source.buffer = this.makeNoise(Math.max(0.1, duration))
    filter.type = 'lowpass'
    filter.frequency.value = cutoff
    const now = context.currentTime
    envelope.gain.setValueAtTime(volume, now)
    envelope.gain.exponentialRampToValueAtTime(0.0001, now + duration)
    source.connect(filter).connect(envelope).connect(output)
    if (inside && this.roomSend) envelope.connect(this.roomSend)
    source.start(now)
    source.stop(now + duration + 0.01)
    this.trackVoice(source)
  }

  private trackVoice(source: AudioScheduledSourceNode) {
    this.voices.add(source)
    source.onended = () => this.voices.delete(source)
  }

  private nextRandom() {
    this.random = (this.random * 16807) % 2147483647
    return (this.random - 1) / 2147483646
  }

  getDebugState(): AudioDebugState {
    return { environment: this.environment, activeVoices: this.voices.size, busLevels: { ...this.debugLevels } }
  }

  dispose() {
    this.sources.forEach((source) => { try { source.stop() } catch { /* Already stopped during teardown. */ } })
    this.sources = []
    this.voices.clear()
    void this.context?.close()
    this.context = null
    this.master = null
    this.buses = null
    this.roomSend = null
    this.ambienceDuck = null
    this.musicDuck = null
    this.loopLevels = {}
  }
}
