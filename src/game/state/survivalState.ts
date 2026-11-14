import type { CrewId, MissionProgress } from '../data/gameplay'
import { CAMPAIGN_ENDINGS, TEN_SOL_CAMPAIGN } from '../data/tenSolCampaign'

export const SURVIVAL_SAVE_KEY = 'mars-outpost-alpha-survival-v1'

// Tuned so a healthy, clean outpost can cover its essential load across a Sol.
// Storms and optional colony work still consume stored energy.
export const BASE_SOLAR_GENERATION_RATE = 0.04
export const BASE_POWER_USE_RATE = 0.024

export type ResourceId = 'oxygen' | 'water' | 'food' | 'energy'
export type EquipmentId = 'habitat' | 'greenhouse' | 'laboratory' | 'solar-array' | 'battery-storage' | 'communications' | 'rover'
export type CrewCondition = { wellness: number; fatigue: number; morale: number }
export type CrewRoster = Record<CrewId | 'jack', CrewCondition>
export type EquipmentCondition = Record<EquipmentId, number>
export type CampaignDecision = 'resilience' | 'research' | 'infrastructure'
export type EndingId = keyof typeof CAMPAIGN_ENDINGS
export type OperationalControls = {
  oxygenOutput: number
  airScrubbing: number
  waterRecovery: number
  greenhouseTemperature: number
  greenhouseHumidity: number
  growLighting: number
  greenhouseWater: number
  greenhousePower: number
  solarOutput: number
}

export type SurvivalState = {
  version: 1
  sol: number
  solMinute: number
  totalMinutes: number
  resources: Record<ResourceId, number>
  crew: CrewRoster
  equipment: EquipmentCondition
  operationalControls: OperationalControls
  roverBattery: number
  shelteredSols: number[]
  maintenanceLog: EquipmentId[]
  decisions: CampaignDecision[]
  completedSols: number[]
  missionHistory: string[]
  researchPoints: number
  notice: string
  noticeMinutes: number
  stormDamageApplied: boolean
  ending: EndingId | null
}

export const INITIAL_SURVIVAL_STATE: SurvivalState = {
  version: 1,
  sol: 1,
  solMinute: 0,
  totalMinutes: 0,
  resources: { oxygen: 92, water: 88, food: 78, energy: 82 },
  crew: {
    jack: { wellness: 91, fatigue: 14, morale: 77 },
    ryan: { wellness: 90, fatigue: 18, morale: 74 },
    emma: { wellness: 93, fatigue: 12, morale: 80 },
    alex: { wellness: 89, fatigue: 16, morale: 76 },
  },
  equipment: {
    habitat: 88,
    greenhouse: 78,
    laboratory: 91,
    'solar-array': 84,
    'battery-storage': 89,
    communications: 92,
    rover: 94,
  },
  operationalControls: { oxygenOutput: 85, airScrubbing: 90, waterRecovery: 80, greenhouseTemperature: 22, greenhouseHumidity: 60, growLighting: 75, greenhouseWater: 80, greenhousePower: 75, solarOutput: 100 },
  roverBattery: 100,
  shelteredSols: [],
  maintenanceLog: [],
  decisions: [],
  completedSols: [],
  missionHistory: [],
  researchPoints: 0,
  notice: '',
  noticeMinutes: 0,
  stormDamageApplied: false,
  ending: null,
}

function bounded(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : fallback
}

export function readSurvivalState(): SurvivalState {
  try {
    const parsed = JSON.parse(localStorage.getItem(SURVIVAL_SAVE_KEY) ?? 'null') as Partial<SurvivalState> | null
    if (!parsed || parsed.version !== 1) return INITIAL_SURVIVAL_STATE
    const crewSaved = parsed.crew as Partial<CrewRoster> | undefined
    const equipmentSaved = parsed.equipment as Partial<EquipmentCondition> | undefined
    const resourcesSaved = parsed.resources as Partial<Record<ResourceId, number>> | undefined
    const controlsSaved = parsed.operationalControls as Partial<OperationalControls> | undefined
    const validEquipment = Object.keys(INITIAL_SURVIVAL_STATE.equipment) as EquipmentId[]
    const crew: CrewRoster = { ...INITIAL_SURVIVAL_STATE.crew }
    for (const id of ['jack', 'ryan', 'emma', 'alex'] as const) {
      const entry = crewSaved?.[id]
      if (entry) crew[id] = {
        wellness: bounded(entry.wellness, crew[id].wellness),
        fatigue: bounded(entry.fatigue, crew[id].fatigue),
        morale: bounded(entry.morale, crew[id].morale),
      }
    }
    const equipment: EquipmentCondition = { ...INITIAL_SURVIVAL_STATE.equipment }
    for (const id of Object.keys(equipment) as EquipmentId[]) equipment[id] = bounded(equipmentSaved?.[id], equipment[id])
    return {
      ...INITIAL_SURVIVAL_STATE,
      ...parsed,
      sol: Number.isFinite(parsed.sol) ? Math.max(1, Math.min(10, Math.floor(parsed.sol!))) : 1,
      solMinute: Number.isFinite(parsed.solMinute) ? Math.max(0, Math.min(1439, parsed.solMinute!)) : 0,
      totalMinutes: Number.isFinite(parsed.totalMinutes) ? Math.max(0, parsed.totalMinutes!) : 0,
      resources: {
        oxygen: bounded(resourcesSaved?.oxygen, INITIAL_SURVIVAL_STATE.resources.oxygen),
        water: bounded(resourcesSaved?.water, INITIAL_SURVIVAL_STATE.resources.water),
        food: bounded(resourcesSaved?.food, INITIAL_SURVIVAL_STATE.resources.food),
        energy: bounded(resourcesSaved?.energy, INITIAL_SURVIVAL_STATE.resources.energy),
      },
      crew,
      equipment,
      operationalControls: {
        oxygenOutput: Math.max(0, Math.min(100, controlsSaved?.oxygenOutput ?? INITIAL_SURVIVAL_STATE.operationalControls.oxygenOutput)),
        airScrubbing: Math.max(0, Math.min(100, controlsSaved?.airScrubbing ?? INITIAL_SURVIVAL_STATE.operationalControls.airScrubbing)),
        waterRecovery: Math.max(0, Math.min(100, controlsSaved?.waterRecovery ?? INITIAL_SURVIVAL_STATE.operationalControls.waterRecovery)),
        greenhouseTemperature: Math.max(14, Math.min(30, controlsSaved?.greenhouseTemperature ?? INITIAL_SURVIVAL_STATE.operationalControls.greenhouseTemperature)),
        greenhouseHumidity: Math.max(25, Math.min(85, controlsSaved?.greenhouseHumidity ?? INITIAL_SURVIVAL_STATE.operationalControls.greenhouseHumidity)),
        growLighting: Math.max(0, Math.min(100, controlsSaved?.growLighting ?? INITIAL_SURVIVAL_STATE.operationalControls.growLighting)),
        greenhouseWater: Math.max(0, Math.min(100, controlsSaved?.greenhouseWater ?? INITIAL_SURVIVAL_STATE.operationalControls.greenhouseWater)),
        greenhousePower: Math.max(0, Math.min(100, controlsSaved?.greenhousePower ?? INITIAL_SURVIVAL_STATE.operationalControls.greenhousePower)),
        solarOutput: Math.max(0, Math.min(100, controlsSaved?.solarOutput ?? INITIAL_SURVIVAL_STATE.operationalControls.solarOutput)),
      },
      roverBattery: bounded(parsed.roverBattery, 100),
      shelteredSols: Array.isArray(parsed.shelteredSols) ? parsed.shelteredSols.filter((value): value is number => Number.isInteger(value) && value >= 1 && value <= 10) : [],
      maintenanceLog: Array.isArray(parsed.maintenanceLog) ? parsed.maintenanceLog.filter((value): value is EquipmentId => validEquipment.includes(value as EquipmentId)) : [],
      decisions: Array.isArray(parsed.decisions) ? parsed.decisions.filter((value): value is CampaignDecision => value === 'resilience' || value === 'research' || value === 'infrastructure').slice(0, 1) : [],
      completedSols: Array.isArray(parsed.completedSols) ? parsed.completedSols.filter((value): value is number => Number.isInteger(value) && value >= 1 && value <= 10) : [],
      missionHistory: Array.isArray(parsed.missionHistory) ? parsed.missionHistory.filter((value): value is string => typeof value === 'string').slice(-10) : [],
      researchPoints: Number.isFinite(parsed.researchPoints) ? Math.max(0, parsed.researchPoints!) : 0,
      notice: typeof parsed.notice === 'string' ? parsed.notice : '',
      noticeMinutes: Number.isFinite(parsed.noticeMinutes) ? Math.max(0, parsed.noticeMinutes!) : 0,
      stormDamageApplied: Boolean(parsed.stormDamageApplied),
      ending: parsed.ending === 'home' || parsed.ending === 'foundation' || parsed.ending === 'lesson' ? parsed.ending : null,
    }
  } catch {
    return INITIAL_SURVIVAL_STATE
  }
}

export function stormIntensityAt(solMinute: number): number {
  if (solMinute < 42 || solMinute > 102) return 0
  if (solMinute < 54) return (solMinute - 42) / 12
  if (solMinute <= 84) return 1
  return 1 - (solMinute - 84) / 18
}

function withNotice(state: SurvivalState, notice: string): SurvivalState {
  return { ...state, notice, noticeMinutes: 12 }
}

export function advanceSurvival(state: SurvivalState, minutes: number, sheltered: boolean): SurvivalState {
  let next = state
  let remaining = Math.max(0, minutes)
  while (remaining > 0.0001) {
    if (next.solMinute >= 1439) break
    const step = Math.min(1, remaining, 1439 - next.solMinute)
    remaining -= step
    const minute = Math.min(1439, next.solMinute + step)
    const intensity = stormIntensityAt(minute)
    const eq = next.equipment
    const oxygenUse = 0.01 * step
    const powerFactor = next.resources.energy >= 12 ? 1 : 0.25
    const ctl = next.operationalControls
    const oxygenRecovery = 0.008 * (eq.habitat / 100) * powerFactor * (0.35 + ctl.oxygenOutput * 0.0065) * step
    const waterUse = 0.011 * step
    const waterRecovery = 0.0085 * (eq.habitat / 100) * powerFactor * (0.3 + ctl.waterRecovery * 0.007) * step
    const foodUse = 0.011 * step
    const foodGrowth = 0 // Food production comes from planted greenhouse plots in colonyState.
    const solarGeneration = BASE_SOLAR_GENERATION_RATE * (eq['solar-array'] / 100) * (0.55 + 0.45 * eq['battery-storage'] / 100) * (1 - 0.88 * intensity) * (ctl.solarOutput / 100) * step
    const powerUse = (BASE_POWER_USE_RATE + ctl.airScrubbing * 0.000018) * step
    const resources = {
      oxygen: bounded(next.resources.oxygen - oxygenUse + oxygenRecovery, 0),
      water: bounded(next.resources.water - waterUse + waterRecovery, 0),
      food: bounded(next.resources.food - foodUse + foodGrowth, 0),
      energy: bounded(next.resources.energy - powerUse + solarGeneration, 0),
    }
    const crew = { ...next.crew }
    for (const id of ['jack', 'ryan', 'emma', 'alex'] as const) {
      const person = crew[id]
      const shortage = Math.min(resources.oxygen, resources.water, resources.food)
      crew[id] = {
        ...person,
        fatigue: bounded(person.fatigue + 0.006 * step, 0),
        wellness: bounded(person.wellness + (shortage < 15 ? -0.022 : shortage > 65 && sheltered ? 0.0015 : 0) * step - (ctl.airScrubbing < 35 ? (35 - ctl.airScrubbing) * 0.000035 * step : 0) - (!sheltered && intensity > 0.55 ? 0.002 * step : 0), person.wellness),
        morale: bounded(person.morale + (shortage < 15 ? -0.008 : 0) * step, person.morale),
      }
    }

    next = { ...next, solMinute: minute, totalMinutes: next.totalMinutes + step, resources, crew, noticeMinutes: Math.max(0, next.noticeMinutes - step) }
    if (sheltered && intensity > 0.55 && !next.shelteredSols.includes(next.sol)) {
      next = withNotice({ ...next, shelteredSols: [...next.shelteredSols, next.sol] }, 'Shelter protocol recorded. Crew exposure reduced.')
    }
    if (minute >= 42 && minute - step < 42) next = withNotice(next, 'DUST FRONT APPROACHING · Move inside before visibility drops.')
    if (minute >= 54 && minute - step < 54) next = withNotice(next, 'DUST STORM ACTIVE · Solar output reduced. Shelter is available in colony buildings.')
    if (minute >= 66 && minute - step < 66 && !next.stormDamageApplied) {
      const affected: EquipmentId = next.sol % 2 === 0 ? 'solar-array' : 'communications'
      const equipment = { ...next.equipment, [affected]: bounded(next.equipment[affected] - 5, 0) }
      next = withNotice({ ...next, equipment, stormDamageApplied: true }, `${affected === 'solar-array' ? 'Solar array' : 'Communications mast'} condition reduced by dust exposure. Inspect and repair when safe.`)
    }
    if (minute >= 102 && minute - step < 102) next = withNotice(next, 'Dust front has passed. Surface visibility is recovering.')
    if (minute >= 66 && minute - step < 66) {
      const researchGain = next.equipment.laboratory > 40 ? 0.25 : 0.08
      next = { ...next, researchPoints: next.researchPoints + researchGain }
    }
  }
  return next
}

export function repairEquipment(state: SurvivalState, id: EquipmentId, sheltered: boolean): { state: SurvivalState; repaired: boolean } {
  if (state.resources.energy < 5) return { state: withNotice(state, 'Maintenance paused · at least 5% energy is required.'), repaired: false }
  let next = advanceSurvival(state, 30, sheltered)
  const equipment = { ...next.equipment, [id]: bounded(next.equipment[id] + 27, 100) }
  const crew = { ...next.crew, ryan: { ...next.crew.ryan, fatigue: bounded(next.crew.ryan.fatigue + 4, 0), morale: bounded(next.crew.ryan.morale + 2, 100) } }
  next = withNotice({
    ...next,
    equipment,
    crew,
    resources: { ...next.resources, energy: bounded(next.resources.energy - 5, 0) },
    maintenanceLog: [...next.maintenanceLog, id],
  }, `${equipmentName(id)} maintenance complete. Condition +27 · energy −5.`)
  return { state: next, repaired: true }
}

export function restCrew(state: SurvivalState): SurvivalState {
  let next = advanceSurvival(state, 240, true)
  const crew = { ...next.crew }
  for (const id of ['jack', 'ryan', 'emma', 'alex'] as const) {
    const person = crew[id]
    crew[id] = { wellness: bounded(person.wellness + 4, 100), fatigue: bounded(person.fatigue - 28, 0), morale: bounded(person.morale + 5, 100) }
  }
  return withNotice({ ...next, crew }, 'Crew recovery period complete · fatigue reduced and morale improved.')
}

export function closeSol(state: SurvivalState): SurvivalState {
  if (state.sol >= 10) return state
  const endOfDay = advanceSurvival(state, Math.max(0, 1440 - state.solMinute), true)
  const crew = { ...endOfDay.crew }
  for (const id of ['jack', 'ryan', 'emma', 'alex'] as const) {
    const person = crew[id]
    crew[id] = { ...person, morale: bounded(person.morale + 2, 100) }
  }
  return withNotice({
    ...endOfDay,
    sol: state.sol + 1,
    solMinute: 0,
    crew,
    completedSols: [...state.completedSols, state.sol],
    missionHistory: [...state.missionHistory, `Sol ${state.sol} · ${TEN_SOL_CAMPAIGN[state.sol - 1].debrief}`].slice(-10),
    stormDamageApplied: false,
  }, `Sol ${state.sol} closed. Sol ${state.sol + 1} operations are ready.`)
}

export function applyCampaignDecision(state: SurvivalState, decision: CampaignDecision): SurvivalState {
  if (state.decisions.length) return state
  let next: SurvivalState = { ...state, decisions: [decision] }
  if (decision === 'resilience') {
    next = { ...next, resources: { oxygen: bounded(next.resources.oxygen + 2, 100), water: bounded(next.resources.water + 10, 100), food: bounded(next.resources.food + 8, 100), energy: bounded(next.resources.energy + 8, 100) } }
  } else if (decision === 'research') {
    next = { ...next, researchPoints: next.researchPoints + 8, resources: { ...next.resources, energy: bounded(next.resources.energy - 10, 0) } }
    next = { ...next, crew: { ...next.crew, emma: { ...next.crew.emma, morale: bounded(next.crew.emma.morale + 7, 100) } } }
  } else {
    const equipment = Object.fromEntries(Object.entries(next.equipment).map(([id, value]) => [id, bounded(value + 8, 100)])) as EquipmentCondition
    next = { ...next, equipment, resources: { ...next.resources, energy: bounded(next.resources.energy - 12, 0) }, maintenanceLog: [...next.maintenanceLog, 'habitat', 'solar-array', 'rover'] }
  }
  return withNotice(next, `Campaign priority recorded: ${decisionLabel(decision)}.`)
}

export function chooseEnding(state: SurvivalState, progress: MissionProgress, colony?: { upgrades: Record<string, number>; expansions: string[] }): EndingId {
  const resources = Object.values(state.resources).reduce((sum, value) => sum + value, 0) / 4
  const crew = Object.values(state.crew).reduce((sum, person) => sum + person.wellness * 0.6 + person.morale * 0.4, 0) / 4
  const equipment = Object.values(state.equipment).reduce((sum, value) => sum + value, 0) / 7
  const colonyUpgradeAverage = colony ? Object.values(colony.upgrades).reduce((sum, value) => sum + value, 0) / 6 : 1
  const sustainableInfrastructure = !colony || colony.expansions.includes('water-processor') || colony.expansions.includes('advanced-greenhouse') || colonyUpgradeAverage >= 1.5
  if (resources >= 48 && crew >= 65 && state.researchPoints >= 2 && progress.collectedSamples.length >= 2 && sustainableInfrastructure) return 'home'
  if (resources >= 25 && equipment >= 58 && state.maintenanceLog.length >= 3 && (!colony || colonyUpgradeAverage > 1 || colony.expansions.length > 0)) return 'foundation'
  return 'lesson'
}

export function equipmentName(id: EquipmentId): string {
  return {
    habitat: 'Habitat life support', greenhouse: 'Greenhouse', laboratory: 'Research laboratory',
    'solar-array': 'Solar array', 'battery-storage': 'Battery storage', communications: 'Communications mast', rover: 'Rover',
  }[id]
}

export function campaignDecisionLabel(decision: CampaignDecision): string { return decisionLabel(decision) }

function decisionLabel(decision: CampaignDecision): string {
  return { resilience: 'Protect the crew reserves', research: 'Prioritize scientific return', infrastructure: 'Reinforce critical systems' }[decision]
}
