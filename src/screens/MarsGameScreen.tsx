import { Component, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties, ErrorInfo, PointerEvent as ReactPointerEvent, ReactNode, WheelEvent as ReactWheelEvent } from 'react'
import { Canvas } from '@react-three/fiber'
import { ACESFilmicToneMapping } from 'three'
import type { LandingSiteId } from '../game/data/landingSites'
import type { BuildingId } from '../game/data/outpostBuildings'
import { OUTPOST_BUILDINGS } from '../game/data/outpostBuildings'
import { CREW, EMPTY_MISSION_PROGRESS, EXTERIOR_EQUIPMENT, INTERIOR_EQUIPMENT, SAMPLES } from '../game/data/gameplay'
import type { CrewId, InteractionTarget, InteriorBuildingId, MissionProgress, SampleId } from '../game/data/gameplay'
import { interactionKey } from '../game/data/gameplay'
import { CAMPAIGN_ENDINGS, FINAL_CAMPAIGN_LINE, TEN_SOL_CAMPAIGN } from '../game/data/tenSolCampaign'
import { advanceSurvival, applyCampaignDecision, chooseEnding, closeSol, equipmentName, INITIAL_SURVIVAL_STATE, readSurvivalState, repairEquipment, restCrew, stormIntensityAt, SURVIVAL_SAVE_KEY } from '../game/state/survivalState'
import type { CampaignDecision, EquipmentId, SurvivalState } from '../game/state/survivalState'
import type { OperationalControls } from '../game/state/survivalState'
import { MarsAudioManager } from '../game/state/MarsAudioManager'
import type { FootstepSurface } from '../game/state/MarsAudioManager'
import { advanceColony, assignCrew, plantCrop, harvestCrop, maintainSolar, readColonyState, resourceRates, resolveColonyEvent, setColonyPriority, startBuildingUpgrade, startExpansion, COLONY_SAVE_KEY, greenhouseStability, INITIAL_COLONY_STATE } from '../game/state/colonyState'
import type { ColonyPriority, ColonyState, CropId, ExpansionId } from '../game/state/colonyState'
import ColonyManagementPanel from '../components/outpost3d/ColonyManagementPanel'
import type { WorldControls } from '../game/world3d/types'
import type { RoverWorldPosition } from '../game/world3d/types'
import { WORLD_CONFIG } from '../game/world3d/worldConfig'
import { getCrewWorldPositions, getRoverPosition } from '../game/world3d/actorLayout'
import { getColonyLayout } from '../game/world3d/colonyLayout'
import { getTerrainHeight } from '../game/world3d/terrain'
import MarsWorld from '../components/outpost3d/MarsWorld'
import './MarsGameScreen.css'
import ScienceHub from '../game/science/ScienceHub'
import { setIntroMusicSettings } from '../game/state/introMusic'



const MISSION_PROGRESS_KEY = 'mars-outpost-alpha-gameplay-v1'
type CriticalResource = keyof SurvivalState['resources']
const CRITICAL_RESOURCE_FAILURES: Record<CriticalResource, { title: string; reason: string }> = {
  oxygen: { title: 'Oxygen depleted', reason: 'The habitat could no longer maintain a breathable life-support reserve.' },
  water: { title: 'Water depleted', reason: 'The crew ran out of water needed to sustain the outpost.' },
  food: { title: 'Food depleted', reason: 'The crew ran out of food needed to sustain the outpost.' },
  energy: { title: 'Power depleted', reason: 'The outpost lost the power needed to run essential systems.' },
}
const CRITICAL_RESOURCE_ORDER: CriticalResource[] = ['oxygen', 'water', 'food', 'energy']
const CRITICAL_RESOURCE_SOLUTIONS: Record<CriticalResource, string> = {
  oxygen: 'Inspect habitat life support and raise oxygen output; maintain or upgrade the habitat.',
  water: 'Inspect habitat life support, raise water recovery, and keep power available for the processor.',
  food: 'Plant and harvest greenhouse crops before reserves run low; keep greenhouse water and power supplied.',
  energy: 'Clean solar dust, maintain the solar array, and reduce nonessential greenhouse power use.',
}
function readAudioSettings() {
  try {
    const settings = JSON.parse(localStorage.getItem('mars-outpost-alpha-audio-v1') ?? 'null') as { masterVolume?: number; effectsVolume?: number; musicVolume?: number; musicMuted?: boolean; voiceVolume?: number; ambienceVolume?: number; realisticMarsAcoustics?: boolean; audioCaptions?: boolean; audioDebug?: boolean; mouseSensitivity?: number; graphicsQuality?: 'high' | 'balanced' } | null
    return {
      masterVolume: Math.max(0, Math.min(100, settings?.masterVolume ?? 34)),
      effectsVolume: Math.max(0, Math.min(100, settings?.effectsVolume ?? 55)),
      musicVolume: Math.max(0, Math.min(100, settings?.musicVolume ?? 30)),
      musicMuted: settings?.musicMuted === true,
      voiceVolume: Math.max(0, Math.min(100, settings?.voiceVolume ?? 50)),
      ambienceVolume: Math.max(0, Math.min(100, settings?.ambienceVolume ?? 20)),
      realisticMarsAcoustics: settings?.realisticMarsAcoustics !== false,
      audioCaptions: settings?.audioCaptions !== false,
      audioDebug: Boolean(settings?.audioDebug),
      mouseSensitivity: Math.max(40, Math.min(180, settings?.mouseSensitivity ?? 100)),
      graphicsQuality: settings?.graphicsQuality === 'balanced' ? 'balanced' as const : 'high' as const,
    }
  } catch { return { masterVolume: 34, effectsVolume: 55, musicVolume: 30, musicMuted: false, voiceVolume: 50, ambienceVolume: 20, realisticMarsAcoustics: true, audioCaptions: true, audioDebug: false, mouseSensitivity: 100, graphicsQuality: 'high' as const } }
}

function readMissionProgress(): MissionProgress {
  try {
    const value = localStorage.getItem(MISSION_PROGRESS_KEY)
    if (!value) return EMPTY_MISSION_PROGRESS
    const saved = JSON.parse(value) as Partial<MissionProgress>
    return {
      talkedTo: Array.isArray(saved.talkedTo) ? saved.talkedTo : [],
      acceptedTasks: Array.isArray(saved.acceptedTasks) ? saved.acceptedTasks : [],
      inspected: Array.isArray(saved.inspected) ? saved.inspected : [],
      scannedSamples: Array.isArray(saved.scannedSamples) ? saved.scannedSamples : [],
      collectedSamples: Array.isArray(saved.collectedSamples) ? saved.collectedSamples : [],
      roverTripComplete: Boolean(saved.roverTripComplete),
      journal: Array.isArray(saved.journal) ? saved.journal : [],
    }
  } catch {
    return EMPTY_MISSION_PROGRESS
  }
}

type MarsGameScreenProps = {
  siteId: LandingSiteId
  onExit: () => void
}

type BoundaryProps = { children: ReactNode; onExit: () => void }
type BoundaryState = { hasError: boolean }

class SceneErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { hasError: false }

  static getDerivedStateFromError(): BoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Mars 3D scene failed to render:', error, info.componentStack)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="mars-game-error" role="alert">
          <div>
            <p>3D SCENE ERROR</p>
            <h1>The Mars world could not be rendered.</h1>
            <span>Return to the outpost view and check the browser console for details.</span>
            <button type="button" onClick={this.props.onExit}>Return to Outpost</button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

function MarsGameScreen({ siteId, onExit }: MarsGameScreenProps) {
  const controls = useRef<WorldControls>({
    keys: new Set(),
    yaw: 0,
    pitch: 0.16,
    cameraDistance: WORLD_CONFIG.cameraDistance,
    isDragging: false,
    jumpQueued: false,
  })
  const root = useRef<HTMLDivElement>(null)
  const transitionTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const audio = useRef<MarsAudioManager | null>(null)
  const [progress, setProgress] = useState<MissionProgress>(readMissionProgress)
  const [survival, setSurvival] = useState<SurvivalState>(readSurvivalState)
  const [roverWorldPosition, setRoverWorldPosition] = useState<RoverWorldPosition>(() => getRoverPosition(siteId))
  const [missionFailureReasons, setMissionFailureReasons] = useState<CriticalResource[]>(() => CRITICAL_RESOURCE_ORDER.filter((id) => survival.resources[id] <= 0))
  const [colony, setColony] = useState<ColonyState>(readColonyState)
  const [nearbyTarget, setNearbyTarget] = useState<InteractionTarget | null>(null)
  const [playerTelemetry, setPlayerTelemetry] = useState<{ x: number; z: number; speed: number }>({ x: WORLD_CONFIG.playerStart[0], z: WORLD_CONFIG.playerStart[2], speed: 0 })
  const [controlsVisible, setControlsVisible] = useState(true)
  const [largeHudText, setLargeHudText] = useState(false)
  const hudMotionUpdateAt = useRef(0)
  const [activeTarget, setActiveTarget] = useState<InteractionTarget | null>(null)
  const [dialogueIndex, setDialogueIndex] = useState(0)
  const [interiorBuildingId, setInteriorBuildingId] = useState<InteriorBuildingId | null>(null)
  const [doorOpenBuildingId, setDoorOpenBuildingId] = useState<BuildingId | null>(null)
  const [roverDriving, setRoverDriving] = useState(false)
  const [roverBattery, setRoverBattery] = useState(() => survival.roverBattery)
  const [roverDistance, setRoverDistance] = useState(0)
  const [journalOpen, setJournalOpen] = useState(false)
  const [scienceOpen, setScienceOpen] = useState(false)
  const [debriefOpen, setDebriefOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [colonyOpen, setColonyOpen] = useState(false)
  const [selectedBuilding, setSelectedBuilding] = useState<import('../game/data/outpostBuildings').BuildingId>('habitat')
  const [colonyNotice, setColonyNotice] = useState('')
  const [audioSettings] = useState(readAudioSettings)
  const [masterVolume, setMasterVolume] = useState(audioSettings.masterVolume)
  const [effectsVolume, setEffectsVolume] = useState(audioSettings.effectsVolume)
  const [musicVolume, setMusicVolume] = useState(audioSettings.musicVolume)
  const [musicMuted, setMusicMuted] = useState(audioSettings.musicMuted)
  const [voiceVolume, setVoiceVolume] = useState(audioSettings.voiceVolume)
  const [ambienceVolume, setAmbienceVolume] = useState(audioSettings.ambienceVolume)
  const [realisticMarsAcoustics, setRealisticMarsAcoustics] = useState(audioSettings.realisticMarsAcoustics)
  const [audioCaptions, setAudioCaptions] = useState(audioSettings.audioCaptions)
  const [audioDebug, setAudioDebug] = useState(audioSettings.audioDebug)
  const [audioCaption, setAudioCaption] = useState('')
  const [graphicsQuality, setGraphicsQuality] = useState<'high' | 'balanced'>(audioSettings.graphicsQuality)
  const [mouseSensitivity, setMouseSensitivity] = useState(audioSettings.mouseSensitivity)
  const [transitionSerial, setTransitionSerial] = useState(0)
  const siteName = siteId === 'rocky-basin' ? 'Rocky Basin' : 'Open Plain'
  const minimapBuildings = useMemo(() => getColonyLayout(siteId), [siteId])
  const minimapCrew = useMemo(() => getCrewWorldPositions(siteId), [siteId])
  const survivalRef = useRef(survival)
  const colonyRef = useRef(colony)
  const audioCaptionTimer = useRef<ReturnType<typeof window.setTimeout> | null>(null)
  const sol = TEN_SOL_CAMPAIGN[survival.sol - 1]
  const objective = survival.sol > 1 ? sol.objective : !progress.talkedTo.includes('ryan')
    ? 'Meet Ryan Cooper at the habitat'
    : !progress.inspected.includes('life-support')
      ? 'Inspect the habitat life-support console'
      : !progress.talkedTo.includes('emma')
        ? 'Meet Dr. Emma Ross at the laboratory'
        : progress.scannedSamples.length === 0
          ? 'Scan a geological point of interest'
          : progress.collectedSamples.length === 0
            ? 'Collect a scanned surface sample'
            : !progress.talkedTo.includes('alex')
              ? 'Check in with Alex Carter at the rover'
              : !progress.roverTripComplete
                ? 'Drive the rover to the cyan survey beacon'
                : 'Sol 01 surface survey recorded'

  const navigationTarget = useMemo(() => {
    const buildings = getColonyLayout(siteId)
    const crew = getCrewWorldPositions(siteId)
    const buildingPoint = (id: string) => {
      const b = buildings.find((item) => item.id === id)
      if (!b) return null
      // Route indoor missions to the actual +Z airlock threshold, not the building's radius.
      const gateZ: Record<string, number> = { habitat: 14.2, greenhouse: 12.5, laboratory: 10.6, 'rover-garage': 8.5 }
      const localZ = gateZ[id] ?? b.radius + 3
      const x = b.x + Math.sin(b.rotation) * localZ
      const z = b.z + Math.cos(b.rotation) * localZ
      return [x, getTerrainHeight(siteId, x, z), z] as [number, number, number]
    }
    const crewPoint = (id: 'ryan' | 'emma' | 'alex') => {
      const person = crew.find((item) => item.id === id)
      return person ? [person.x, person.y, person.z] as [number, number, number] : null
    }
    if (survival.sol === 1) {
      if (!progress.talkedTo.includes('ryan')) return crewPoint('ryan')
      if (!progress.inspected.includes('life-support')) return buildingPoint('habitat')
      if (!progress.talkedTo.includes('emma')) return crewPoint('emma')
      if (!progress.scannedSamples.length) {
        const sampleId = (Object.keys(SAMPLES) as SampleId[]).find((id) => !progress.scannedSamples.includes(id))
        const sample = sampleId ? SAMPLES[sampleId] : null
        if (sample) { const [x, z] = sample.position; return [x, getTerrainHeight(siteId, x, z), z] as [number, number, number] }
      }
      if (!progress.collectedSamples.length) {
        const sampleId = progress.scannedSamples[0]
        const sample = SAMPLES[sampleId]
        if (sample) { const [x, z] = sample.position; return [x, getTerrainHeight(siteId, x, z), z] as [number, number, number] }
      }
      if (!progress.talkedTo.includes('alex')) return crewPoint('alex')
      if (!progress.roverTripComplete) return [...WORLD_CONFIG.objectivePosition] as [number, number, number]
      return null
    }
    if (survival.sol === 2) return buildingPoint('habitat')
    if (survival.sol === 3) return buildingPoint(!progress.inspected.includes('solar-array') ? 'solar-array' : 'battery-storage')
    if (survival.sol === 4 || survival.sol === 8) return buildingPoint('habitat')
    if (survival.sol === 5) return buildingPoint('greenhouse')
    if (survival.sol === 6) {
      if (!progress.roverTripComplete) return [...WORLD_CONFIG.objectivePosition] as [number, number, number]
      const sampleId = (Object.keys(SAMPLES) as SampleId[]).find((id) => !progress.collectedSamples.includes(id))
      const sample = sampleId ? SAMPLES[sampleId] : null
      if (sample) { const [x, z] = sample.position; return [x, getTerrainHeight(siteId, x, z), z] as [number, number, number] }
    }
    if (survival.sol === 7) {
      const target = (['habitat', 'greenhouse', 'laboratory', 'solar-array', 'battery-storage', 'rover'] as const).find((id) => !survival.maintenanceLog.includes(id))
      return buildingPoint(target === 'rover' ? 'rover-garage' : target === 'laboratory' ? 'laboratory' : target ?? 'habitat')
    }
    return null
  }, [siteId, survival.sol, survival.maintenanceLog, progress.talkedTo, progress.inspected, progress.scannedSamples, progress.collectedSamples, progress.roverTripComplete])

  const interiorNavigationTarget = useMemo<[number, number, number] | null>(() => {
    if (!interiorBuildingId) return null
    const maintenanceTarget = (['habitat', 'greenhouse', 'laboratory', 'solar-array', 'battery-storage', 'rover'] as const).find((id) => !survival.maintenanceLog.includes(id))
    if (interiorBuildingId === 'habitat') {
      if (survival.sol === 4 || survival.sol === 8) return [0, 0, 0]
      if (survival.sol === 1 && !progress.inspected.includes('life-support') || survival.sol === 2 || survival.sol === 7 && maintenanceTarget === 'habitat') return [-3.95, 0, 1.42]
    }
    if (interiorBuildingId === 'greenhouse' && (survival.sol === 5 && !progress.inspected.includes('grow-lights') || survival.sol === 7 && maintenanceTarget === 'greenhouse')) return [0, 0, -2.6]
    if (interiorBuildingId === 'laboratory' && survival.sol === 7 && maintenanceTarget === 'laboratory') return [3.9, 0, -0.8]
    return null
  }, [interiorBuildingId, survival.sol, survival.maintenanceLog, progress.inspected])

  const averageWellness = Object.values(survival.crew).reduce((sum, person) => sum + person.wellness, 0) / 4
  const missionReady = (() => {
    switch (survival.sol) {
      case 1: return progress.roverTripComplete
      case 2: return progress.inspected.includes('life-support') && survival.equipment.habitat >= 60
      case 3: return progress.inspected.includes('solar-array') && progress.inspected.includes('battery-storage') && survival.resources.energy >= 15
      case 4: return survival.shelteredSols.includes(4)
      case 5: return progress.inspected.includes('grow-lights') && survival.equipment.greenhouse >= 60 && survival.resources.food >= 15
      case 6: return progress.collectedSamples.length >= 2 && progress.roverTripComplete
      case 7: return new Set(survival.maintenanceLog).size >= 3
      case 8: return Object.values(survival.resources).every((value) => value >= 20) && averageWellness >= 40
      case 9: return survival.decisions.length > 0
      default: return true
    }
  })()

  useEffect(() => {
    try { localStorage.setItem(MISSION_PROGRESS_KEY, JSON.stringify(progress)) } catch { /* Keep the current session playable if storage is unavailable. */ }
  }, [progress])

  useEffect(() => {
    try { localStorage.setItem('mars-outpost-alpha-survival-v1', JSON.stringify(survival)) } catch { /* Keep the current session playable if storage is unavailable. */ }
  }, [survival])
  useEffect(() => { survivalRef.current = survival }, [survival])
  useEffect(() => {
    if (missionFailureReasons.length) return
    const depleted = CRITICAL_RESOURCE_ORDER.filter((id) => survival.resources[id] <= 0)
    if (depleted.length) setMissionFailureReasons(depleted)
  }, [survival.resources, missionFailureReasons.length])
  useEffect(() => {
    if (missionFailureReasons.length) {
      controls.current.keys.clear()
      controls.current.isDragging = false
      audio.current?.setPaused(true)
    }
  }, [missionFailureReasons.length])
  useEffect(() => {
    colonyRef.current = colony
    try { localStorage.setItem(COLONY_SAVE_KEY, JSON.stringify(colony)) } catch { /* Keep the current session playable if storage is unavailable. */ }
  }, [colony])

  useEffect(() => {
    if (debriefOpen || missionFailureReasons.length) return
    const timer = window.setInterval(() => {
      const before = survivalRef.current
      const beforeColony = colonyRef.current
      const sheltered = Boolean(interiorBuildingId)
      const advanced = advanceSurvival(before, 3, sheltered)
      const elapsedMinutes = Math.max(0, advanced.totalMinutes - before.totalMinutes)
      const result = advanceColony(beforeColony, advanced, elapsedMinutes, stormIntensityAt(advanced.solMinute), sheltered, before.solMinute)
      survivalRef.current = result.survival
      colonyRef.current = result.colony
      setSurvival(result.survival)
      setColony(result.colony)
      if (beforeColony.construction && !result.colony.construction) setColonyNotice('Construction complete · the new system is online and saved.')
      if (advanced.sol === 6 && advanced.solMinute >= 180 && !beforeColony.event) setColony((current) => {
        const event = { id: 'greenhouse-slowdown-sol6', title: 'Greenhouse growth slowdown', body: 'Environmental-control drift is reducing crop condition. Repair now to spend components and power, or defer and accept lower harvest condition.', resolved: false }
        const next = { ...current, event }
        colonyRef.current = next
        return next
      })
    }, 5000)
    return () => window.clearInterval(timer)
  }, [interiorBuildingId, debriefOpen, missionFailureReasons.length])

  useEffect(() => () => {
    if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
    if (audioCaptionTimer.current) window.clearTimeout(audioCaptionTimer.current)
    audio.current?.dispose()
  }, [])

  useEffect(() => {
    try { localStorage.setItem('mars-outpost-alpha-audio-v1', JSON.stringify({ masterVolume, effectsVolume, musicVolume, musicMuted, voiceVolume, ambienceVolume, realisticMarsAcoustics, audioCaptions, audioDebug, mouseSensitivity, graphicsQuality })) } catch { /* Settings stay active for this session. */ }
    audio.current?.setSettings({ master: masterVolume / 100, music: musicVolume / 100, effects: effectsVolume / 100, voice: voiceVolume / 100, ambience: ambienceVolume / 100, realisticMarsAcoustics })
    setIntroMusicSettings({ musicVolume, musicMuted })
  }, [masterVolume, effectsVolume, musicVolume, musicMuted, voiceVolume, ambienceVolume, realisticMarsAcoustics, audioCaptions, audioDebug, mouseSensitivity, graphicsQuality])
  useEffect(() => {
    audio.current?.updateTelemetry({ storm: stormIntensityAt(survival.solMinute), oxygen: survival.resources.oxygen, speed: 0 })
  }, [survival.solMinute, survival.resources.oxygen])
  useEffect(() => {
    audio.current?.setEnvironment(interiorBuildingId === 'habitat' ? 'habitat' : interiorBuildingId === 'greenhouse' ? 'greenhouse' : interiorBuildingId === 'laboratory' ? 'laboratory' : roverDriving ? 'rover' : 'outside')
  }, [interiorBuildingId, roverDriving])
  const previousGarageDoor = useRef(false)
  useEffect(() => {
    const open = doorOpenBuildingId === 'rover-garage'
    if (open !== previousGarageDoor.current) audio.current?.playGarageDoor(open)
    previousGarageDoor.current = open
  }, [doorOpenBuildingId])
  useEffect(() => {
    const timer = window.setTimeout(() => setControlsVisible(false), 60_000)
    return () => window.clearTimeout(timer)
  }, [])
  useEffect(() => {
    const updateVisibility = () => audio.current?.setPaused(document.hidden)
    document.addEventListener('visibilitychange', updateVisibility)
    return () => document.removeEventListener('visibilitychange', updateVisibility)
  }, [])

  function addJournalEntry(entry: string) {
    setProgress((current) => ({ ...current, journal: [entry, ...current.journal].slice(0, 30) }))
  }

  function applyColonyAction(result: { colony: ColonyState; survival: SurvivalState; ok: boolean; message: string }) {
    colonyRef.current = result.colony
    survivalRef.current = result.survival
    setColony(result.colony)
    setSurvival(result.survival)
    setColonyNotice(result.message)
    if (result.ok) addJournalEntry(result.message)
  }

  function upgradeBuilding(id: import('../game/data/outpostBuildings').BuildingId) { applyColonyAction(startBuildingUpgrade(colonyRef.current, survivalRef.current, id)) }
  function constructExpansion(id: ExpansionId) { applyColonyAction(startExpansion(colonyRef.current, survivalRef.current, id)) }
  function plantGreenhouseCrop(id: CropId) { applyColonyAction(plantCrop(colonyRef.current, survivalRef.current, id)) }
  function collectHarvest(id: string) { applyColonyAction(harvestCrop(colonyRef.current, survivalRef.current, id)) }
  function clearSolarDust() { applyColonyAction(maintainSolar(colonyRef.current, survivalRef.current)) }
  function resolveEvent(action: 'repair' | 'defer') { applyColonyAction(resolveColonyEvent(colonyRef.current, survivalRef.current, action)) }
  function assignColonyCrew(id: 'ryan' | 'emma' | 'alex', task: 'maintenance' | 'greenhouse' | 'research' | 'logistics') {
    const result = assignCrew(colonyRef.current, id, task)
    colonyRef.current = result.colony
    setColony(result.colony)
    setColonyNotice(result.message)
  }
  function updatePriority(id: ColonyPriority, value: number) {
    const next = setColonyPriority(colonyRef.current, id, value)
    colonyRef.current = next
    setColony(next)
  }

  function updateOperationalControl(id: keyof OperationalControls, value: number) {
    const current = survivalRef.current
    const next = { ...current, operationalControls: { ...current.operationalControls, [id]: value } }
    survivalRef.current = next
    setSurvival(next)
  }

  function controlSlider(label: string, id: keyof OperationalControls, min = 0, max = 100, unit = '%') {
    const value = survival.operationalControls[id]
    return <label className="mars-control-slider" key={id}>
      <span>{label}<b>{value}{unit}</b></span>
      <input type="range" min={min} max={max} value={value} onChange={(event) => updateOperationalControl(id, Number(event.target.value))} />
    </label>
  }

  function startGameAudio() {
    audio.current ??= new MarsAudioManager()
    audio.current.setSettings({ master: masterVolume / 100, music: musicVolume / 100, effects: effectsVolume / 100, voice: voiceVolume / 100, ambience: ambienceVolume / 100, realisticMarsAcoustics })
    void audio.current.start().catch(() => undefined)
  }

  function announceAudioCaption(text: string) {
    if (!audioCaptions) return
    setAudioCaption(text)
    if (audioCaptionTimer.current) window.clearTimeout(audioCaptionTimer.current)
    audioCaptionTimer.current = window.setTimeout(() => setAudioCaption(''), 2400)
  }

  function onWorldInteract(target: InteractionTarget) {
    audio.current ??= new MarsAudioManager()
    audio.current.setSettings({ master: masterVolume / 100, music: musicVolume / 100, effects: effectsVolume / 100, voice: voiceVolume / 100, ambience: ambienceVolume / 100, realisticMarsAcoustics })
    void audio.current.start().then(() => {
      audio.current?.playInteraction()
      if (target.kind === 'crew') { audio.current?.playRadioCue(); announceAudioCaption(`Radio squelch · ${CREW[target.id].name} channel open`) }
      else if (target.kind === 'building' && ['habitat', 'greenhouse', 'laboratory'].includes(target.id)) { audio.current?.playAirlock(true); announceAudioCaption('Airlock seal and pressure cycle') }
      else if (target.kind === 'interior-exit') { audio.current?.playAirlock(false); announceAudioCaption('Airlock pressure release · suit systems active') }
      else if (target.kind === 'sample') announceAudioCaption('Suit HUD · geological scan acknowledged')
      else announceAudioCaption('Suit HUD · interaction acknowledged')
    }).catch(() => undefined)
    if (target.kind === 'interior-exit') {
      setActiveTarget(null)
      setNearbyTarget(null)
      setTransitionSerial((value) => value + 1)
      if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
      transitionTimer.current = window.setTimeout(() => {
        setInteriorBuildingId(null)
        transitionTimer.current = window.setTimeout(() => setDoorOpenBuildingId(null), 420)
      }, 250)
      return
    }
    if (target.kind === 'rover') {
      setRoverDriving(true)
      setActiveTarget(null)
      setTransitionSerial((value) => value + 1)
      addJournalEntry('Entered the six-wheel surface rover. Battery and distance are game-only values.')
      return
    }
    if (target.kind === 'rover-exit') {
      setRoverDriving(false)
      setTransitionSerial((value) => value + 1)
      return
    }
    if (target.kind === 'building') {
      if (target.id === 'habitat' || target.id === 'greenhouse' || target.id === 'laboratory') {
        setDoorOpenBuildingId(target.id)
        setActiveTarget(null)
        setNearbyTarget(null)
        setTransitionSerial((value) => value + 1)
        if (transitionTimer.current) window.clearTimeout(transitionTimer.current)
        transitionTimer.current = window.setTimeout(() => setInteriorBuildingId(target.id as InteriorBuildingId), 420)
        return
      }
      setActiveTarget((current) => current && interactionKey(current) === interactionKey(target) ? null : target)
      setProgress((current) => current.inspected.includes(target.id)
        ? current
        : { ...current, inspected: [...current.inspected, target.id], journal: [`Inspected ${OUTPOST_BUILDINGS.find((building) => building.id === target.id)?.name ?? 'outpost equipment'}.`, ...current.journal].slice(0, 30) })
      return
    }
    if (target.kind === 'crew') {
      const alreadyOpen = activeTarget?.kind === 'crew' && activeTarget.id === target.id
      if (alreadyOpen) {
        setDialogueIndex((index) => Math.min(index + 1, CREW[target.id].dialogue.length - 1))
        return
      }
      setDialogueIndex(0)
      setActiveTarget(target)
      setProgress((current) => current.talkedTo.includes(target.id)
        ? current
        : { ...current, talkedTo: [...current.talkedTo, target.id], journal: [`Talked with ${CREW[target.id].name}: ${CREW[target.id].task}.`, ...current.journal].slice(0, 30) })
      return
    }
    if (target.kind === 'sample') {
      setActiveTarget(target)
      setProgress((current) => current.scannedSamples.includes(target.id)
        ? current
        : { ...current, scannedSamples: [...current.scannedSamples, target.id], journal: [`Scanned ${SAMPLES[target.id].name}. The displayed finding is a fictional game reading.`, ...current.journal].slice(0, 30) })
      return
    }
    if (target.kind === 'interior-equipment') {
      setActiveTarget((current) => current && interactionKey(current) === interactionKey(target) ? null : target)
      setProgress((current) => current.inspected.includes(target.id)
        ? current
        : { ...current, inspected: [...current.inspected, target.id], journal: [`Inspected ${INTERIOR_EQUIPMENT[target.id].name}.`, ...current.journal].slice(0, 30) })
      return
    }
    if (target.kind === 'exterior-equipment') {
      setActiveTarget((current) => current && interactionKey(current) === interactionKey(target) ? null : target)
      setProgress((current) => current.inspected.includes(target.id)
        ? current
        : { ...current, inspected: [...current.inspected, target.id], journal: [`Inspected ${EXTERIOR_EQUIPMENT[target.id].name}.`, ...current.journal].slice(0, 30) })
    }
  }

  function acceptCrewTask(id: CrewId) {
    const task = CREW[id].task
    setProgress((current) => current.acceptedTasks.includes(id)
      ? current
      : { ...current, acceptedTasks: [...current.acceptedTasks, id], journal: [`Task assigned by ${CREW[id].name}: ${task}.`, ...current.journal].slice(0, 30) })
    setActiveTarget(null)
  }

  function collectSample(id: SampleId) {
    setProgress((current) => current.collectedSamples.includes(id)
      ? current
      : { ...current, collectedSamples: [...current.collectedSamples, id], journal: [`Collected ${SAMPLES[id].name} for the Sol 01 sample locker.`, ...current.journal].slice(0, 30) })
  }

  function completeMaintenance(id: EquipmentId) {
    if (colonyRef.current.materials.parts < 1) { setColonyNotice('Maintenance requires 1 component from stores. Assign Alex to logistics to resupply.'); return }
    let result = repairEquipment(survivalRef.current, id, Boolean(interiorBuildingId))
    if (!result.repaired) { survivalRef.current = result.state; setSurvival(result.state); setColonyNotice(result.state.notice); return }
    if (colonyRef.current.expansions.includes('maintenance-bay')) result = { ...result, state: { ...result.state, equipment: { ...result.state.equipment, [id]: Math.min(100, result.state.equipment[id] + 10) } } }
    const progressed = advanceColony(colonyRef.current, result.state, 30, stormIntensityAt(result.state.solMinute), Boolean(interiorBuildingId), survivalRef.current.solMinute)
    const nextColony = { ...progressed.colony, materials: { ...progressed.colony.materials, parts: colonyRef.current.materials.parts - 1 } }
    survivalRef.current = progressed.survival
    colonyRef.current = nextColony
    setSurvival(progressed.survival)
    setColony(nextColony)
    setColonyNotice(`Ryan completed maintenance on ${equipmentName(id)} · 1 component used.`)
    addJournalEntry(`Ryan completed maintenance on ${equipmentName(id)}.`)
  }

  function completeSol() {
    if (!missionReady) return
    if (survival.sol === 10) {
      const ending = chooseEnding(survival, progress, colony)
      setSurvival((current) => ({ ...current, ending, completedSols: current.completedSols.includes(10) ? current.completedSols : [...current.completedSols, 10], missionHistory: current.missionHistory.some((entry) => entry.startsWith('Sol 10')) ? current.missionHistory : [...current.missionHistory, `Sol 10 · ${sol.debrief}`].slice(-10) }))
      setDebriefOpen(true)
      return
    }
    const before = survivalRef.current
    const closed = closeSol(before)
    const elapsedMinutes = Math.max(0, closed.totalMinutes - before.totalMinutes)
    const next = advanceColony(colonyRef.current, closed, elapsedMinutes, 0.03, true, before.solMinute)
    survivalRef.current = next.survival
    colonyRef.current = next.colony
    setSurvival(next.survival)
    setColony(next.colony)
    setDebriefOpen(true)
  }

  function recordDecision(decision: CampaignDecision) {
    setSurvival((current) => applyCampaignDecision(current, decision))
    addJournalEntry(`Sol 9 campaign priority recorded: ${decision}.`)
  }

  function restAtHabitat() {
    const before = survivalRef.current
    const rested = restCrew(before)
    const elapsed = Math.max(0, rested.totalMinutes - before.totalMinutes)
    const result = advanceColony(colonyRef.current, rested, elapsed, stormIntensityAt(rested.solMinute), true, before.solMinute)
    survivalRef.current = result.survival
    colonyRef.current = result.colony
    setSurvival(result.survival)
    setColony(result.colony)
  }

  const stormIntensity = stormIntensityAt(survival.solMinute)
  const warning = stormIntensity > 0.35
    ? 'DUST FRONT · SHELTER ADVISED'
    : Object.entries(survival.resources).find(([, value]) => value < 25)?.[0]
      ? `${Object.entries(survival.resources).find(([, value]) => value < 25)?.[0].toUpperCase()} RESERVE LOW`
      : survival.noticeMinutes > 0 ? survival.notice : ''
  const hudTarget = interiorNavigationTarget ?? navigationTarget
  const hudDistance = hudTarget ? Math.hypot(hudTarget[0] - playerTelemetry.x, hudTarget[2] - playerTelemetry.z) : null
  const hudBearing = hudTarget ? (Math.round((Math.atan2(hudTarget[0] - playerTelemetry.x, -(hudTarget[2] - playerTelemetry.z)) * 180 / Math.PI + 360) % 360)).toString().padStart(3, '0') : '---'
  const marsTime = `${String(Math.floor(survival.solMinute / 60)).padStart(2, '0')}:${String(survival.solMinute % 60).padStart(2, '0')}`
  const marsTemp = Math.round(-63 + Math.sin(survival.solMinute / 1440 * Math.PI * 2) * 11 + stormIntensity * 4)
  const windDirection = ['NNE', 'ENE', 'ESE', 'SSE', 'SSW', 'WSW', 'WNW', 'NNW'][Math.floor(survival.solMinute / 180) % 8]
  const windSpeed = Math.round(3 + stormIntensity * 48)
  const objectiveProgress = (() => {
    const ratio = (done: number, total: number) => Math.round(Math.max(0, Math.min(1, done / total)) * 100)
    switch (survival.sol) {
      case 1: return ratio([progress.talkedTo.includes('ryan'), progress.inspected.includes('life-support'), progress.talkedTo.includes('emma'), progress.scannedSamples.length > 0, progress.collectedSamples.length > 0, progress.talkedTo.includes('alex'), progress.roverTripComplete].filter(Boolean).length, 7)
      case 2: return ratio(Number(progress.inspected.includes('life-support')) + Number(survival.equipment.habitat >= 60), 2)
      case 3: return ratio(Number(progress.inspected.includes('solar-array')) + Number(progress.inspected.includes('battery-storage')) + Number(survival.resources.energy >= 15), 3)
      case 4: return survival.shelteredSols.includes(4) ? 100 : 0
      case 5: return ratio(Number(progress.inspected.includes('grow-lights')) + Number(survival.equipment.greenhouse >= 60) + Number(survival.resources.food >= 15), 3)
      case 6: return Math.round(Math.min(2, progress.collectedSamples.length) / 2 * 50 + (progress.roverTripComplete ? 50 : 0))
      case 7: return ratio(new Set(survival.maintenanceLog).size, 3)
      case 8: return Math.round(Object.values(survival.resources).filter((value) => value >= 20).length / Object.keys(survival.resources).length * 50 + (averageWellness >= 40 ? 50 : Math.min(50, averageWellness / 40 * 50)))
      case 9: return survival.decisions.length > 0 ? 100 : 0
      default: return 100
    }
  })()
  const minimapPoint = (x: number, z: number): [number, number] => {
    const dx = (x - playerTelemetry.x) * (62 / 85)
    const dy = (z - playerTelemetry.z) * (62 / 85)
    const distance = Math.hypot(dx, dy)
    const scale = distance > 61 ? 61 / distance : 1
    return [80 + dx * scale, 80 + dy * scale]
  }
  const interactionDistance = (() => {
    if (!nearbyTarget) return null
    if (nearbyTarget.kind === 'building') { const building = minimapBuildings.find((item) => item.id === nearbyTarget.id); if (building) return Math.max(0, Math.hypot(playerTelemetry.x - building.x, playerTelemetry.z - building.z) - building.radius) }
    if (nearbyTarget.kind === 'crew') { const person = minimapCrew.find((item) => item.id === nearbyTarget.id); if (person) return Math.hypot(playerTelemetry.x - person.x, playerTelemetry.z - person.z) }
    if (nearbyTarget.kind === 'sample') { const [x, z] = SAMPLES[nearbyTarget.id].position; return Math.hypot(playerTelemetry.x - x, playerTelemetry.z - z) }
    if (nearbyTarget.kind === 'rover') return Math.hypot(playerTelemetry.x - roverWorldPosition.x, playerTelemetry.z - roverWorldPosition.z)
    if (nearbyTarget.kind === 'interior-equipment') return nearbyTarget.id === 'life-support' ? Math.hypot(playerTelemetry.x + 3.95, playerTelemetry.z - 1.42) : nearbyTarget.id === 'grow-lights' ? Math.hypot(playerTelemetry.x, playerTelemetry.z + 2.6) : Math.hypot(playerTelemetry.x - 3.9, playerTelemetry.z + 0.8)
    if (nearbyTarget.kind === 'interior-exit') return Math.hypot(playerTelemetry.x, playerTelemetry.z - (interiorBuildingId === 'habitat' ? 7.45 : interiorBuildingId === 'greenhouse' ? 8 : 2.65))
    return 0
  })()

  useEffect(() => {
    const handledKeys = new Set([
      'KeyW', 'KeyA', 'KeyS', 'KeyD', 'KeyE', 'ShiftLeft', 'ShiftRight', 'Space',
    ])

    function isGameFocused() {
      return Boolean(root.current && root.current.contains(document.activeElement))
    }

    function onKeyDown(event: KeyboardEvent) {
      if (missionFailureReasons.length) return
      if (!isGameFocused()) return
      if (event.code === 'Escape') {
        if (colonyOpen) setColonyOpen(false)
        else if (settingsOpen) setSettingsOpen(false)
        else if (journalOpen) setJournalOpen(false)
        else if (activeTarget) setActiveTarget(null)
        else if (interiorBuildingId) onWorldInteract({ kind: 'interior-exit' })
        else if (roverDriving) onWorldInteract({ kind: 'rover-exit' })
        else onExit()
        return
      }
      if (event.code === 'KeyH') {
        event.preventDefault()
        setControlsVisible((visible) => !visible)
        return
      }
      if (event.code === 'KeyJ') {
        event.preventDefault()
        setJournalOpen((open) => !open)
        return
      }
      if (event.code === 'KeyC') {
        event.preventDefault()
        setColonyOpen((open) => !open)
        return
      }
      if (colonyOpen || settingsOpen || journalOpen || debriefOpen) return
      if (!handledKeys.has(event.code)) return
      event.preventDefault()
      if (event.code === 'Space' && !controls.current.keys.has('Space')) {
        controls.current.jumpQueued = true
      }
      controls.current.keys.add(event.code)
    }

    function onKeyUp(event: KeyboardEvent) {
      controls.current.keys.delete(event.code)
    }

    function onWindowBlur() {
      controls.current.keys.clear()
      controls.current.isDragging = false
    }

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('blur', onWindowBlur)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('blur', onWindowBlur)
      controls.current.keys.clear()
    }
  }, [onExit, journalOpen, activeTarget, interiorBuildingId, roverDriving, colonyOpen, settingsOpen, missionFailureReasons.length])

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (missionFailureReasons.length) return
    if ((event.target as HTMLElement).closest('button, input, label')) return
    startGameAudio()
    root.current?.focus()
    controls.current.isDragging = true
    root.current?.setPointerCapture(event.pointerId)
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!controls.current.isDragging) return
    controls.current.yaw -= event.movementX * WORLD_CONFIG.cameraSensitivity * (mouseSensitivity / 100)
    controls.current.pitch = Math.max(
      -0.2,
      Math.min(0.72, controls.current.pitch + event.movementY * WORLD_CONFIG.cameraSensitivity * (mouseSensitivity / 100)),
    )
  }

  function onPointerUp(event: ReactPointerEvent<HTMLDivElement>) {
    controls.current.isDragging = false
    if (root.current?.hasPointerCapture(event.pointerId)) {
      root.current.releasePointerCapture(event.pointerId)
    }
  }

  function onWheel(event: ReactWheelEvent<HTMLDivElement>) {
    controls.current.cameraDistance = Math.max(
      WORLD_CONFIG.minCameraDistance,
      Math.min(WORLD_CONFIG.maxCameraDistance, controls.current.cameraDistance + event.deltaY * 0.004),
    )
  }

  const nearbyPrompt = (() => {
    if (!nearbyTarget) return null
    if (nearbyTarget.kind === 'building') {
      const building = OUTPOST_BUILDINGS.find((item) => item.id === nearbyTarget.id)
      return { title: building?.name ?? 'Outpost Facility', action: ['habitat', 'greenhouse', 'laboratory'].includes(nearbyTarget.id) ? 'E · ENTER AIRLOCK' : 'E · INSPECT FACILITY' }
    }
    if (nearbyTarget.kind === 'crew') return { title: CREW[nearbyTarget.id].name, action: 'E · TALK' }
    if (nearbyTarget.kind === 'sample') return { title: SAMPLES[nearbyTarget.id].name, action: 'E · SCAN GEOLOGY' }
    if (nearbyTarget.kind === 'interior-equipment') return { title: INTERIOR_EQUIPMENT[nearbyTarget.id].name, action: 'E · INSPECT EQUIPMENT' }
    if (nearbyTarget.kind === 'exterior-equipment') return { title: EXTERIOR_EQUIPMENT[nearbyTarget.id].name, action: 'E · CHECK COMMS' }
    if (nearbyTarget.kind === 'interior-exit') return { title: 'Airlock', action: 'E · RETURN TO SURFACE' }
    if (nearbyTarget.kind === 'rover') return { title: 'Six-wheel surface rover', action: 'E · DRIVE ROVER' }
    return { title: 'Surface rover', action: 'E · EXIT ROVER' }
  })()

  const buildingPanel = activeTarget?.kind === 'building'
    ? OUTPOST_BUILDINGS.find((item) => item.id === activeTarget.id)
    : null
  const samplePanel = activeTarget?.kind === 'sample' ? SAMPLES[activeTarget.id] : null
  const crewPanel = activeTarget?.kind === 'crew' ? CREW[activeTarget.id] : null
  const equipmentPanel = activeTarget?.kind === 'interior-equipment' ? INTERIOR_EQUIPMENT[activeTarget.id] : null
  const exteriorEquipmentPanel = activeTarget?.kind === 'exterior-equipment' ? EXTERIOR_EQUIPMENT[activeTarget.id] : null
  const maintenanceTarget: EquipmentId | null = activeTarget?.kind === 'interior-equipment'
    ? activeTarget.id === 'life-support' ? 'habitat' : activeTarget.id === 'grow-lights' ? 'greenhouse' : 'laboratory'
    : activeTarget?.kind === 'exterior-equipment' ? 'communications'
      : activeTarget?.kind === 'building' && ['solar-array', 'battery-storage', 'rover-garage', 'research-laboratory', 'greenhouse', 'habitat'].includes(activeTarget.id)
        ? ({ 'solar-array': 'solar-array', 'battery-storage': 'battery-storage', 'rover-garage': 'rover', 'research-laboratory': 'laboratory', greenhouse: 'greenhouse', habitat: 'habitat' } as Record<string, EquipmentId>)[activeTarget.id]
        : null

  return (
    <main
      ref={root}
      className={`mars-game-screen${largeHudText ? ' is-large-hud-text' : ''}`}
      tabIndex={0}
      aria-label="Playable Mars world"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onWheel={onWheel}
    >
      <SceneErrorBoundary onExit={onExit}>
        <Canvas
          className="mars-game-canvas"
          shadows={graphicsQuality === 'high'}
          dpr={graphicsQuality === 'high' ? [1, 1.5] : [0.75, 1]}
          camera={{ position: [0, 5.5, 20], fov: 52, near: 0.1, far: 800 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          onCreated={({ gl }) => {
            gl.toneMapping = ACESFilmicToneMapping
            gl.toneMappingExposure = 1.05
          }}
          fallback={
            <div className="mars-game-error" role="alert">
              <div>
                <p>WEBGL 2 REQUIRED</p>
                <h1>This browser could not start the 3D world.</h1>
                <span>Try a modern browser with WebGL 2 enabled.</span>
                <button type="button" onClick={onExit}>Return to Outpost</button>
              </div>
            </div>
          }
        >
          <Suspense fallback={null}>
            <MarsWorld
              siteId={siteId}
              controls={controls.current}
              interiorBuildingId={interiorBuildingId}
              doorOpenBuildingId={doorOpenBuildingId}
              roverDriving={roverDriving}
              initialRoverBattery={survival.roverBattery}
              roverPosition={roverWorldPosition}
              roverEfficiency={1 - (colony.upgrades['rover-garage'] - 1) * 0.12}
              navigationTarget={navigationTarget}
              interiorNavigationTarget={interiorNavigationTarget}
              onFootstep={(surface: FootstepSurface, running, inside) => audio.current?.playFootstep(surface, running, inside)}
              onMotion={(x, z, speed) => {
                const now = performance.now()
                if (now - hudMotionUpdateAt.current >= 100) {
                  hudMotionUpdateAt.current = now
                  setPlayerTelemetry({ x, z, speed })
                }
                audio.current?.updateMotion(speed)
                audio.current?.updateTelemetry({ storm: stormIntensity, oxygen: survivalRef.current.resources.oxygen, speed })
              }}
              scannedSamples={progress.scannedSamples}
              collectedSamples={progress.collectedSamples}
              stormIntensity={stormIntensity}
              solMinute={survival.solMinute}
              powerPercent={survival.resources.energy}
              solarDust={colony.solarDust}
              builtExpansions={colony.expansions}
              crops={colony.crops}
              onNearbyChange={(target) => {
                setNearbyTarget(target)
                setDoorOpenBuildingId((current) => {
                  if (roverDriving || target?.kind === 'rover' || target?.kind === 'rover-exit') return 'rover-garage'
                  if (target?.kind === 'building' && target.id === 'rover-garage') return 'rover-garage'
                  return current === 'rover-garage' ? null : current
                })
              }}
              onInteract={onWorldInteract}
              onRoverStatus={(battery, distance, position) => {
                const roundedBattery = Math.floor(battery)
                setRoverBattery(roundedBattery)
                setRoverDistance(Math.floor(distance))
                setRoverWorldPosition(position)
                if (survivalRef.current.roverBattery !== roundedBattery) {
                  const next = { ...survivalRef.current, roverBattery: roundedBattery }
                  survivalRef.current = next
                  setSurvival(next)
                }
              }}
              onRoverSurvey={() => {
                setProgress((current) => current.roverTripComplete
                  ? current
                  : { ...current, roverTripComplete: true, journal: ['Reached the survey beacon by rover. Sol 01 route was recorded.', ...current.journal].slice(0, 30) })
              }}
            />
          </Suspense>
        </Canvas>
      </SceneErrorBoundary>

      <>
        <header className="mars-game-hud">
          <section className="mars-game-hud__identity hud-glass" aria-label="Outpost location and surface telemetry">
            <div className="mars-hud-brand"><span className="mars-hud-logo" aria-hidden="true">M</span><div><strong>OUTPOST ALPHA</strong><span>{siteName.toUpperCase()} · SOL {String(survival.sol).padStart(2, '0')}</span></div></div>
            <div className="mars-location-readings"><span><b>LST</b><strong>{marsTime}</strong></span><span><b>TEMP</b><strong>{marsTemp}°C</strong></span><span><b>PRESS</b><strong>610 Pa</strong></span><span><b>WIND</b><strong>{windSpeed} m/s {windDirection}</strong></span><span><b>RAD INDEX</b><strong>{Math.max(0, 100 - Math.round(colony.radiationProtection))}</strong></span></div>
            <small className="mars-hud-sim-tag">SIMULATED SUIT TELEMETRY</small>
          </section>
          <div className="mars-game-objective hud-glass" aria-live="polite">
            <small>MISSION OBJECTIVE · SOL {String(survival.sol).padStart(2, '0')}</small>
            <strong>{survival.sol === 1 && progress.roverTripComplete ? 'Survey marker reached' : objective}</strong>
            <div className="mars-objective-progress" role="progressbar" aria-label="Campaign objective progress" aria-valuemin={0} aria-valuemax={100} aria-valuenow={objectiveProgress}><i><b style={{ width: `${objectiveProgress}%` }} /></i><span>{objectiveProgress}%</span></div>
            <div className="mars-objective-meta"><span>{hudDistance !== null ? `DIST ${hudDistance.toFixed(0)} M · BRG ${hudBearing}°` : roverDriving ? `BATTERY ${roverBattery}% · TRIP ${roverDistance} M` : 'OBJECTIVE RECORDED'}</span><span className="mars-sample-pill">{progress.collectedSamples.length} SAMPLES LOGGED</span></div>
            {missionReady && <button className="mars-objective-complete" type="button" onClick={completeSol}>{survival.sol === 10 ? 'Complete campaign' : 'End Sol · Open debrief'}</button>}
          </div>
          <div className="mars-game-hud__actions" aria-label="Game menus">
            {roverDriving && <span className="mars-rover-status">ROVER · {roverBattery}% POWER</span>}
            <button className="mars-game-journal-button" type="button" aria-pressed={journalOpen} onClick={() => setJournalOpen((open) => !open)}><kbd>J</kbd> JOURNAL</button>
            <button className="mars-game-journal-button" type="button" aria-pressed={scienceOpen} onClick={() => setScienceOpen(true)}>LEARN</button>
            <button className="mars-game-journal-button" type="button" aria-pressed={colonyOpen} onClick={() => setColonyOpen((open) => !open)}><kbd>C</kbd> COLONY</button>
            <button className="mars-game-journal-button" type="button" aria-pressed={settingsOpen} onClick={() => { startGameAudio(); setSettingsOpen((open) => !open) }}>SETTINGS</button>
            <button className="mars-game-exit" type="button" onClick={onExit}>Return to Outpost</button>
          </div>
        </header>

        <section className="mars-survival-resources hud-glass" aria-label="Suit vitals">
          <div className="mars-vitals-heading"><span>SUIT VITALS</span><small>LIVE</small></div>
          <div className="mars-vitals-grid">
            {([['oxygen', 'O₂', '#5eead4'], ['water', 'H₂O', '#60a5fa'], ['food', 'FOOD', '#fbbf24'], ['energy', 'PWR', '#fde047']] as const).map(([id, label, color]) => { const value = Math.round(survival.resources[id]); const state = value < 20 ? 'danger' : value < 40 ? 'warning' : 'normal'; return <div className="mars-vital-gauge" key={id} data-state={state} style={{ '--gauge-value': `${value}%`, '--gauge-color': color } as CSSProperties} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span className="mars-vital-ring"><b>{value}</b><small>%</small></span><strong>{label}</strong></div> })}
            {(() => { const value = Math.round(averageWellness); const state = value < 20 ? 'danger' : value < 40 ? 'warning' : 'normal'; return <div className="mars-vital-gauge" data-state={state} style={{ '--gauge-value': `${value}%`, '--gauge-color': '#86efac' } as CSSProperties} role="progressbar" aria-label="Crew wellness" aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span className="mars-vital-ring"><b>{value}</b><small>%</small></span><strong>CREW</strong></div> })()}
          </div>
        </section>

        {warning && <div className={`mars-survival-warning hud-glass ${stormIntensity > 0.35 ? 'is-storm' : ''}`} role="status">{warning}</div>}
        {survival.resources.oxygen < 20 && <div className="mars-low-o2-vignette" aria-hidden="true" />}
        {nearbyPrompt && !activeTarget && !journalOpen && <div className="mars-building-prompt mars-world-prompt hud-glass" role="status" aria-live="polite"><kbd>E</kbd><span>{nearbyPrompt.action.replace(/^E · /, '')}</span><strong>{nearbyPrompt.title}</strong><small>{interactionDistance !== null ? `~${interactionDistance.toFixed(1)} M · INTERACTION RANGE` : 'INTERACTION AVAILABLE'}</small></div>}

        {controlsVisible ? <section className="mars-game-controls-hint hud-glass" aria-label="Controls">
          <div className="mars-controls-heading"><span>SUIT CONTROLS</span><button type="button" onClick={() => setControlsVisible(false)} aria-label="Hide controls">−</button></div>
          <div className="mars-controls-grid"><span><b>W A S D</b> Move</span><span><b>SHIFT</b> Run</span>{!roverDriving && !interiorBuildingId && <span><b>SPACE</b> Jump</span>}{roverDriving && <span><b>SPACE</b> Brake</span>}<span><b>E</b> Interact</span><span><b>J</b> Journal</span><span><b>C</b> Colony</span><span><b>Drag</b> Look</span><span><b>Scroll</b> Camera</span><span><b>ESC</b> Return</span></div>
        </section> : <button className="mars-controls-reopen hud-glass" type="button" onClick={() => setControlsVisible(true)}><kbd>H</kbd> CONTROLS</button>}

        <p className="mars-game-focus-hint">Click the world to focus keyboard</p>
        <section className="mars-minimap hud-glass" aria-label="Local area map">
          <div className="mars-minimap-heading"><span>LOCAL MAP</span><small>RANGE 85 M</small></div>
          <svg viewBox="0 0 160 160" role="img" aria-label="Map showing nearby facilities, crew, and objective">
            <circle cx="80" cy="80" r="61" className="mars-map-range" /><circle cx="80" cy="80" r="40" className="mars-map-range" /><circle cx="80" cy="80" r="20" className="mars-map-range" />
            <path d="M80 8 L75 19 L80 16 L85 19 Z" className="mars-map-north" /><text x="80" y="29" textAnchor="middle" className="mars-map-n-label">N</text>
            {!interiorBuildingId && minimapBuildings.map((item) => { const [x,y] = minimapPoint(item.x,item.z); return Math.hypot(x-80,y-80) < 62 ? <circle key={item.id} cx={x} cy={y} r="2.5" className="mars-map-building" /> : null })}
            {!interiorBuildingId && minimapCrew.map((person) => { const [x,y] = minimapPoint(person.x,person.z); return Math.hypot(x-80,y-80) < 62 ? <circle key={person.id} cx={x} cy={y} r="2.4" className="mars-map-crew" /> : null })}
            {!interiorBuildingId && Object.entries(SAMPLES).filter(([id]) => !progress.collectedSamples.includes(id as SampleId)).map(([id,sample]) => { const [x,y] = minimapPoint(sample.position[0],sample.position[1]); return Math.hypot(x-80,y-80) < 62 ? <circle key={id} cx={x} cy={y} r="2" className="mars-map-sample" /> : null })}
            {hudTarget && (() => { const [x,y] = minimapPoint(hudTarget[0],hudTarget[2]); return <g className="mars-map-objective"><circle cx={x} cy={y} r="5" /><path d={`M ${x} ${y-3} L ${x+3} ${y} L ${x} ${y+3} L ${x-3} ${y} Z`} /></g> })()}
            <path d="M80 70 L74 90 L80 86 L86 90 Z" className="mars-map-player" transform={`rotate(${-controls.current.yaw * 180 / Math.PI} 80 80)`} />
            <circle cx="80" cy="80" r="2" className="mars-map-player-center" />
          </svg>
          <div className="mars-minimap-legend"><span><i className="is-amber" />OBJECTIVE</span><span><i className="is-blue" />SITE</span><span><i className="is-green" />CREW</span></div>
        </section>

        {settingsOpen && <aside className="mars-game-card mars-settings-card" aria-label="Game settings">
          <div className="mars-building-panel__topline"><span>GAME SETTINGS</span><span>AUDIO · DISPLAY · CAMERA</span></div>
          <button className="mars-building-panel__close" type="button" aria-label="Close settings" onClick={() => setSettingsOpen(false)}>×</button>
          <h2>Outpost Preferences</h2>
          <h3 className="mars-settings-section-title">Display</h3>
          <button className="mars-large-text-toggle" type="button" aria-pressed={largeHudText} onClick={() => setLargeHudText((enabled) => !enabled)}>HUD text size · {largeHudText ? 'LARGE' : 'STANDARD'}</button>
          <h3 className="mars-settings-section-title">Audio mixer</h3>
          <label>Master volume · {masterVolume}%<input type="range" min="0" max="100" value={masterVolume} onChange={(event) => setMasterVolume(Number(event.target.value))} /></label>
          <label>Music volume · {musicVolume}%<input type="range" min="0" max="100" value={musicVolume} onChange={(event) => setMusicVolume(Number(event.target.value))} /></label>
          <label><span>Mute music</span><input type="checkbox" checked={musicMuted} onChange={(event) => setMusicMuted(event.target.checked)} /></label>
          <label>Effects · {effectsVolume}%<input type="range" min="0" max="100" value={effectsVolume} onChange={(event) => setEffectsVolume(Number(event.target.value))} /></label>
          <label>Voice / radio · {voiceVolume}%<input type="range" min="0" max="100" value={voiceVolume} onChange={(event) => setVoiceVolume(Number(event.target.value))} /></label>
          <label>Ambience · {ambienceVolume}%<input type="range" min="0" max="100" value={ambienceVolume} onChange={(event) => setAmbienceVolume(Number(event.target.value))} /></label>
          <div className="mars-settings-toggles">
            <button type="button" aria-pressed={realisticMarsAcoustics} onClick={() => setRealisticMarsAcoustics((value) => !value)}>Mars acoustics · {realisticMarsAcoustics ? 'REALISTIC' : 'CINEMATIC'}</button>
            <button type="button" aria-pressed={audioCaptions} onClick={() => setAudioCaptions((value) => !value)}>Audio captions · {audioCaptions ? 'ON' : 'OFF'}</button>
            <button type="button" aria-pressed={audioDebug} onClick={() => setAudioDebug((value) => !value)}>Audio debug · {audioDebug ? 'ON' : 'OFF'}</button>
          </div>
          {audioDebug && <pre className="mars-audio-debug">{JSON.stringify(audio.current?.getDebugState() ?? { environment: 'waiting for audio unlock', activeVoices: 0 }, null, 2)}</pre>}
          <label>Mouse / camera sensitivity · {mouseSensitivity}%<input type="range" min="40" max="180" value={mouseSensitivity} onChange={(event) => setMouseSensitivity(Number(event.target.value))} /></label>
          <div className="mars-game-card__actions"><button type="button" aria-pressed={graphicsQuality === 'high'} onClick={() => setGraphicsQuality('high')}>High · shadows</button><button type="button" aria-pressed={graphicsQuality === 'balanced'} onClick={() => setGraphicsQuality('balanced')}>Balanced · reduced load</button></div>
          <p className="mars-game-card__footnote">Suit, wind, footsteps, airlock, radio, and UI cues are synthesized by the browser. External recordings can be added through the audio manifest.</p>
        </aside>}

        {crewPanel && activeTarget?.kind === 'crew' && (
          <aside className="mars-game-card mars-dialogue-card" aria-live="polite" aria-label={`Dialogue with ${crewPanel.name}`}>
            <div className="mars-building-panel__topline"><span>CREW CHANNEL · SOL 01</span><span>{crewPanel.role}</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close dialogue" onClick={() => setActiveTarget(null)}>×</button>
            <h2>{crewPanel.name}</h2>
            <p className="mars-game-card__quote">“{crewPanel.dialogue[dialogueIndex]}”</p>
            <div className="mars-building-panel__status"><span>ASSIGNMENT</span><strong>{crewPanel.task}</strong></div>
            <div className="mars-game-card__actions">
              {dialogueIndex < crewPanel.dialogue.length - 1
                ? <button type="button" onClick={() => setDialogueIndex((index) => index + 1)}>Continue dialogue →</button>
                : <button type="button" onClick={() => acceptCrewTask(activeTarget.id)}>{progress.acceptedTasks.includes(activeTarget.id) ? 'Return to crew' : 'Accept assignment'}</button>}
              <button type="button" className="mars-game-card__secondary" onClick={() => setActiveTarget(null)}>Close</button>
            </div>
          </aside>
        )}

        {samplePanel && activeTarget?.kind === 'sample' && (
          <aside className="mars-game-card" aria-live="polite" aria-label={`${samplePanel.name} scan results`}>
            <div className="mars-building-panel__topline"><span>FIELD SCAN COMPLETE</span><span>{samplePanel.type}</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close sample report" onClick={() => setActiveTarget(null)}>×</button>
            <h2>{samplePanel.name}</h2>
            <p>{samplePanel.description}</p>
            <div className="mars-building-panel__status"><span>MISSION RELEVANCE</span><strong>{samplePanel.relevance}</strong></div>
            <span className="mars-building-panel__hint">SIMULATED SCANNER · FICTIONAL SITE READING</span>
            {progress.collectedSamples.includes(activeTarget.id)
              ? <p className="mars-game-card__success">SAMPLE SECURED IN THE FIELD LOCKER</p>
              : <div className="mars-game-card__actions"><button type="button" onClick={() => collectSample(activeTarget.id)}>Collect sample</button><button type="button" className="mars-game-card__secondary" onClick={() => setActiveTarget(null)}>Close report</button></div>}
          </aside>
        )}

        {buildingPanel && activeTarget?.kind === 'building' && (
          <aside className="mars-game-card" aria-live="polite" aria-label={`${buildingPanel.name} inspection`}>
            <div className="mars-building-panel__topline"><span>FACILITY INSPECTION</span><span>{buildingPanel.status.toUpperCase()}</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close facility report" onClick={() => setActiveTarget(null)}>×</button>
            <h2>{buildingPanel.name}</h2>
            <p className="mars-building-panel__purpose">{buildingPanel.purpose}</p>
            <p>{buildingPanel.description}</p>
            <div className="mars-building-panel__status"><span>CONDITION</span><strong>{buildingPanel.condition}</strong></div>
            <p className="mars-game-card__footnote">SIMULATION SYSTEM CONDITION · {maintenanceTarget ? Math.round(survival.equipment[maintenanceTarget]) : '—'}%</p>
            {maintenanceTarget && <button type="button" onClick={() => completeMaintenance(maintenanceTarget)}>Ryan · Maintain system (−5% energy)</button>}
            <button type="button" onClick={() => { setSelectedBuilding(activeTarget.id); setColonyOpen(true) }}>Open upgrade and operations panel</button>
            <button type="button" className="mars-game-card__secondary" onClick={() => setActiveTarget(null)}>Close inspection</button>
            {activeTarget.id === 'solar-array' && <div className="mars-operational-controls">
              <h3>Power generation</h3>
              {controlSlider('Array output', 'solarOutput')}
              <p>Output affects energy production alongside array condition, dust, storms, and battery storage.</p>
              <h3>Power distribution · priority</h3>
              {(['life-support', 'greenhouse', 'research', 'battery'] as const).map((id) => <label className="mars-control-slider" key={id}><span>{id.replace('-', ' ')}<b>{colony.priorities[id]}/5</b></span><input type="range" min="1" max="5" step="1" value={colony.priorities[id]} onChange={(event) => updatePriority(id, Number(event.target.value))} /></label>)}
            </div>}
          </aside>
        )}

        {equipmentPanel && activeTarget?.kind === 'interior-equipment' && (
          <aside className="mars-game-card" aria-live="polite" aria-label={`${equipmentPanel.name} inspection`}>
            <div className="mars-building-panel__topline"><span>LOCAL EQUIPMENT CHECK</span><span>SOL 01</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close equipment report" onClick={() => setActiveTarget(null)}>×</button>
            <h2>{equipmentPanel.name}</h2>
            <p>{equipmentPanel.purpose}</p>
            <div className="mars-building-panel__status"><span>SIMULATED CONDITION</span><strong>{Math.round(survival.equipment[maintenanceTarget ?? 'habitat'])}% · {equipmentPanel.status}</strong></div>
            {activeTarget.id === 'life-support' && <div className="mars-operational-controls">
              <h3>Habitat life support</h3>
              <div className="mars-building-panel__status"><span>ESTIMATED AIR QUALITY · SIMULATED</span><strong>{Math.round((0.45 + survival.operationalControls.airScrubbing * 0.55 / 100) * survival.equipment.habitat)}%</strong></div>
              {controlSlider('Oxygen output', 'oxygenOutput')}
              {controlSlider('Air scrubbing', 'airScrubbing')}
              {controlSlider('Water recovery', 'waterRecovery')}
              <p>Higher output and recovery conserve crew reserves; active scrubbers use a small amount of power.</p>
            </div>}
            {activeTarget.id === 'grow-lights' && <div className="mars-operational-controls">
              <h3>Greenhouse environment</h3>
              <div className="mars-building-panel__status"><span>GROWING STABILITY</span><strong>{greenhouseStability(colony, survival)}%</strong></div>
              {controlSlider('Temperature', 'greenhouseTemperature', 14, 30, '°C')}
              {controlSlider('Humidity', 'greenhouseHumidity', 25, 85, '%')}
              {controlSlider('Grow lighting', 'growLighting')}
              {controlSlider('Water feed', 'greenhouseWater')}
              {controlSlider('Power allocation', 'greenhousePower')}
              <p>Stable setpoints and adequate light, water, and power improve planted crop growth. Settings outside the preferred environment lower stability.</p>
              <button type="button" onClick={() => { setSelectedBuilding('greenhouse'); setColonyOpen(true) }}>Open crop planting and harvest</button>
            </div>}
            {maintenanceTarget && <button type="button" onClick={() => completeMaintenance(maintenanceTarget)}>Ryan · Maintain system (−5% energy)</button>}
            <button type="button" className="mars-game-card__secondary" onClick={() => setActiveTarget(null)}>Close inspection</button>
          </aside>
        )}

        {exteriorEquipmentPanel && activeTarget?.kind === 'exterior-equipment' && (
          <aside className="mars-game-card" aria-live="polite" aria-label="Communications equipment inspection">
            <div className="mars-building-panel__topline"><span>COMMUNICATIONS CHECK</span><span>SOL 01</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close communications report" onClick={() => setActiveTarget(null)}>×</button>
            <h2>{exteriorEquipmentPanel.name}</h2>
            <p>{exteriorEquipmentPanel.purpose}</p>
            <div className="mars-building-panel__status"><span>SIMULATED CONDITION</span><strong>{Math.round(survival.equipment.communications)}% · {exteriorEquipmentPanel.status}</strong></div>
            <button type="button" onClick={() => completeMaintenance('communications')}>Ryan · Maintain system (−5% energy)</button>
            <p className="mars-game-card__footnote">Fictional condition values support gameplay only.</p>
            <button type="button" className="mars-game-card__secondary" onClick={() => setActiveTarget(null)}>Close inspection</button>
          </aside>
        )}

        {journalOpen && (
          <aside className="mars-game-card mars-journal-card" aria-label="Mission journal">
            <div className="mars-building-panel__topline"><span>MISSION LOG</span><span>SOL {String(survival.sol).padStart(2, '0')} · {siteName.toUpperCase()}</span></div>
            <button className="mars-building-panel__close" type="button" aria-label="Close journal" onClick={() => setJournalOpen(false)}>×</button>
            <h2>Field Journal</h2>
            <div className="mars-journal-card__objective"><span>{sol.title.toUpperCase()} · OBJECTIVE</span><strong>{objective}</strong><span>{sol.briefing}</span></div>
            <div className="mars-journal-card__objective"><span>RESOURCES · FICTIONAL GAME VALUES</span><strong>O₂ {Math.round(survival.resources.oxygen)}% · H₂O {Math.round(survival.resources.water)}% · Food {Math.round(survival.resources.food)}% · Energy {Math.round(survival.resources.energy)}%</strong><span>Crew wellness {Math.round(averageWellness)}% · fatigue {Math.round(Object.values(survival.crew).reduce((sum, person) => sum + person.fatigue, 0) / 4)}%</span></div>
            <div className="mars-journal-card__objective"><span>CREW CONDITION · MISSION READINESS</span><strong>{(['jack', 'ryan', 'emma', 'alex'] as const).map((id) => {
              const person = survival.crew[id]
              const name = id === 'jack' ? 'Jack Miller' : CREW[id].name
              const readiness = Math.round(person.wellness * 0.55 + person.morale * 0.25 + (100 - person.fatigue) * 0.2)
              return `${name} ${readiness}%`
            }).join(' · ')}</strong><span>Wellness, morale, and fatigue combine into this fictional readiness indicator.</span></div>
            <div className="mars-journal-card__objective"><span>SOL SUPPORT TASKS</span><strong>{sol.supportingObjectives.join(' · ')}</strong><span>{sol.crewReport}</span></div>
            {survival.sol === 9 && !survival.decisions.length && <div className="mars-game-card__actions"><button type="button" onClick={() => recordDecision('resilience')}>Protect crew reserves</button><button type="button" onClick={() => recordDecision('research')}>Prioritize research</button><button type="button" onClick={() => recordDecision('infrastructure')}>Reinforce infrastructure</button></div>}
            {interiorBuildingId === 'habitat' && <button type="button" onClick={restAtHabitat}>Rest crew · 4 hour recovery</button>}
            <div className="mars-journal-card__objective"><span>CAMPAIGN RECORD</span><strong>{survival.completedSols.length} SOLS COMPLETE · {progress.collectedSamples.length} GEOLOGY SAMPLES · {new Set(survival.maintenanceLog).size} SYSTEMS MAINTAINED · {survival.researchPoints.toFixed(1)} RESEARCH</strong><span>{survival.decisions.map((decision) => decision.replace('-', ' ')).join(', ') || 'No campaign decision recorded yet'}</span></div>
            {survival.missionHistory.length > 0 && <><div className="mars-building-panel__topline"><span>MISSION HISTORY</span><span>{survival.missionHistory.length} DEBRIEFS</span></div><ul>{survival.missionHistory.slice().reverse().map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul></>}
            {progress.journal.length ? <ul>{progress.journal.map((entry, index) => <li key={`${entry}-${index}`}>{entry}</li>)}</ul> : <p>No entries yet. Talk with the crew and inspect the surface to begin the Sol 01 log.</p>}
            <p className="mars-game-card__footnote">Geology notes distinguish established Mars science from fictional outpost readings.</p>
          </aside>
        )}

        {debriefOpen && <div className="mars-debrief-backdrop"><aside className="mars-game-card mars-debrief-card" role="dialog" aria-modal="true" aria-label="Sol debrief">
          <div className="mars-building-panel__topline"><span>{survival.ending ? 'CAMPAIGN ASSESSMENT' : 'SOL DEBRIEF'}</span><span>{survival.ending ? 'SOL 10 COMPLETE' : `SOL ${String(survival.sol - 1).padStart(2, '0')} COMPLETE`}</span></div>
          <h2>{survival.ending ? CAMPAIGN_ENDINGS[survival.ending].title : TEN_SOL_CAMPAIGN[Math.max(0, survival.sol - 2)].title}</h2>
          <p>{survival.ending ? CAMPAIGN_ENDINGS[survival.ending].text : TEN_SOL_CAMPAIGN[Math.max(0, survival.sol - 2)].debrief}</p>
          <div className="mars-building-panel__status"><span>OUTPOST STATUS</span><strong>O₂ {Math.round(survival.resources.oxygen)}% · H₂O {Math.round(survival.resources.water)}% · food {Math.round(survival.resources.food)}% · energy {Math.round(survival.resources.energy)}% · crew wellness {Math.round(averageWellness)}%</strong></div>
          <p>{survival.ending ? FINAL_CAMPAIGN_LINE : `NEXT SOL ${String(survival.sol).padStart(2, '0')}: ${TEN_SOL_CAMPAIGN[survival.sol - 1].nextRequirement}`}</p>
          {survival.ending ? <button type="button" onClick={() => setDebriefOpen(false)}>Return to Mars</button> : <button type="button" onClick={() => setDebriefOpen(false)}>Begin Sol {String(survival.sol).padStart(2, '0')}</button>}
        </aside></div>}

        {missionFailureReasons.length > 0 && <div className="mars-failure-backdrop" onPointerDown={(event) => event.stopPropagation()}>
          <section className="mars-failure-card" role="alertdialog" aria-modal="true" aria-labelledby="mars-failure-title">
            <small>OUTPOST ALPHA · CRITICAL RESERVE FAILURE</small>
            <h2 id="mars-failure-title">MISSION FAILED</h2>
            <p>Mission operations have stopped because a critical survival reserve reached zero.</p>
            <ul>{missionFailureReasons.map((id) => <li key={id}><strong>{CRITICAL_RESOURCE_FAILURES[id].title}</strong><span>{CRITICAL_RESOURCE_FAILURES[id].reason}</span><em>Solution: {CRITICAL_RESOURCE_SOLUTIONS[id]}</em></li>)}</ul>
            <div className="mars-failure-actions">
              <button type="button" onClick={() => {
                localStorage.setItem(SURVIVAL_SAVE_KEY, JSON.stringify(INITIAL_SURVIVAL_STATE))
                localStorage.setItem(COLONY_SAVE_KEY, JSON.stringify(INITIAL_COLONY_STATE))
                localStorage.setItem(MISSION_PROGRESS_KEY, JSON.stringify(EMPTY_MISSION_PROGRESS))
                window.location.reload()
              }}>Replay Mission</button>
              <button type="button" className="mars-failure-exit" onClick={onExit}>Return to Outpost</button>
            </div>
          </section>
        </div>}

        <div key={transitionSerial} className="mars-mode-transition" aria-hidden="true" />

        {audioCaption && audioCaptions && <div className="mars-audio-caption" role="status">♪ {audioCaption}</div>}
        {colonyOpen && <ColonyManagementPanel
          colony={colony}
          survival={survival}
          selected={selectedBuilding}
          rates={resourceRates(colony, survival, stormIntensity)}
          notice={colonyNotice}
          onSelect={setSelectedBuilding}
          onUpgrade={upgradeBuilding}
          onExpand={constructExpansion}
          onPlant={plantGreenhouseCrop}
          onHarvest={collectHarvest}
          onPriority={updatePriority}
          onAssign={assignColonyCrew}
          onSolarMaintenance={clearSolarDust}
          onEvent={resolveEvent}
          onClose={() => setColonyOpen(false)}
        />}
        <ScienceHub
          open={scienceOpen}
          onClose={() => setScienceOpen(false)}
          sol={survival.sol}
          gameMinute={survival.totalMinutes}
          atResearchLab={interiorBuildingId === 'laboratory'}
          collectedSampleIds={progress.collectedSamples}
          scannedSampleIds={progress.scannedSamples}
          flags={{
            'storm-observed': survival.shelteredSols.length > 0,
            'greenhouse-observed':
              colony.crops.length > 0 ||
              colony.expansions.includes('advanced-greenhouse'),
            'solar-inspected': progress.inspected.includes('solar-array'),
            'rover-survey-complete': progress.roverTripComplete,
            'radiation-shielding-built':
              colony.expansions.includes('regolith-shield'),
            'crop-harvested': progress.journal.some((item) =>
              item.toLowerCase().includes('harvested'),
            ),
          }}
          energyPercent={survival.resources.energy}
          onConsumeEnergy={(amount) => {
            const current = survivalRef.current
            if (current.resources.energy < amount) return false

            const next = {
              ...current,
              resources: {
                ...current.resources,
                energy: Math.max(0, current.resources.energy - amount),
              },
            }

            survivalRef.current = next
            setSurvival(next)
            return true
          }}
          onJournalRecord={(entry) => {
            setProgress((current) => ({
              ...current,
              journal: [entry, ...current.journal].slice(0, 30),
            }))
          }}
        />
      </>
    </main>
  )
}

export default MarsGameScreen
