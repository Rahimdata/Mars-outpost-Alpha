import type { BuildingId } from '../data/outpostBuildings'
import { BASE_POWER_USE_RATE, BASE_SOLAR_GENERATION_RATE, type SurvivalState } from './survivalState'

export const COLONY_SAVE_KEY = 'mars-outpost-alpha-colony-v1'
export const EXPANSION_IDS = ['habitat-extension', 'advanced-greenhouse', 'water-processor', 'regolith-shield', 'maintenance-bay', 'research-wing'] as const
export type ExpansionId = typeof EXPANSION_IDS[number]
export type MaterialId = 'alloy' | 'parts' | 'regolith' | 'bio-supplies'
export type ColonyPriority = 'life-support' | 'greenhouse' | 'research' | 'battery' | 'maintenance'
export type CrewAssignment = { crew: 'ryan' | 'emma' | 'alex'; task: 'maintenance' | 'greenhouse' | 'research' | 'logistics'; minutesLeft: number } | null
export type CropId = 'leafy-greens' | 'radish' | 'potato'
export type CropPlot = { id: string; crop: CropId; progress: number; condition: number }
export type BuildJob = { kind: 'upgrade' | 'expansion'; target: BuildingId | ExpansionId; minutesLeft: number } | null
export type ColonyState = {
  version: 1
  materials: Record<MaterialId, number>
  upgrades: Record<BuildingId, number>
  expansions: ExpansionId[]
  construction: BuildJob
  crops: CropPlot[]
  nextCropId: number
  radiationProtection: number
  solarDust: number
  priorities: Record<ColonyPriority, number>
  assignment: CrewAssignment
  event: { id: string; title: string; body: string; resolved: boolean } | null
  completedActions: number
}

export const INITIAL_COLONY_STATE: ColonyState = {
  version: 1,
  materials: { alloy: 30, parts: 22, regolith: 55, 'bio-supplies': 18 },
  upgrades: { habitat: 1, greenhouse: 1, laboratory: 1, 'solar-array': 1, 'battery-storage': 1, 'rover-garage': 1 },
  expansions: [], construction: null, crops: [], nextCropId: 1, radiationProtection: 12, solarDust: 0,
  priorities: { 'life-support': 5, greenhouse: 3, research: 2, battery: 4, maintenance: 3 },
  assignment: null, event: null, completedActions: 0,
}

export const BUILDING_INFO: Record<BuildingId, { label: string; benefit: string }> = {
  habitat: { label: 'Habitat Module', benefit: 'Improves oxygen and water recovery, crew wellness, and radiation shelter.' },
  greenhouse: { label: 'Greenhouse', benefit: 'Adds crop plots and improves crop growth and water use.' },
  laboratory: { label: 'Research Laboratory', benefit: 'Improves research progress and scientific sample yield.' },
  'solar-array': { label: 'Solar Array', benefit: 'Improves energy generation; dust lowers the output until maintained.' },
  'battery-storage': { label: 'Battery Storage', benefit: 'Reduces energy loss and improves usable reserve capacity.' },
  'rover-garage': { label: 'Rover Garage', benefit: 'Improves rover upkeep and reduces the energy cost of logistics.' },
}

export const EXPANSION_INFO: Record<ExpansionId, { title: string; purpose: string; cost: Record<MaterialId, number>; duration: number }> = {
  'habitat-extension': { title: 'Habitat Extension', purpose: 'Adds crew recovery capacity and radiation protection.', cost: { alloy: 10, parts: 5, regolith: 10, 'bio-supplies': 0 }, duration: 360 },
  'advanced-greenhouse': { title: 'Advanced Greenhouse', purpose: 'Adds two crop plots and improves controlled growing.', cost: { alloy: 8, parts: 6, regolith: 5, 'bio-supplies': 4 }, duration: 420 },
  'water-processor': { title: 'Water Processing Unit', purpose: 'Improves habitat water recovery while power is available.', cost: { alloy: 8, parts: 7, regolith: 5, 'bio-supplies': 0 }, duration: 300 },
  'regolith-shield': { title: 'Regolith Shield Berm', purpose: 'Adds passive habitat protection using local game materials.', cost: { alloy: 4, parts: 3, regolith: 18, 'bio-supplies': 0 }, duration: 300 },
  'maintenance-bay': { title: 'Maintenance and Storage Bay', purpose: 'Improves repairs and expands material storage.', cost: { alloy: 9, parts: 8, regolith: 8, 'bio-supplies': 0 }, duration: 360 },
  'research-wing': { title: 'Research Wing', purpose: 'Adds research capacity and faster fictional sample analysis.', cost: { alloy: 11, parts: 9, regolith: 6, 'bio-supplies': 2 }, duration: 480 },
}

export const CROP_INFO: Record<CropId, { name: string; duration: number; water: number; energy: number; food: number }> = {
  'leafy-greens': { name: 'Leafy Greens', duration: 180, water: 2.4, energy: 2, food: 12 },
  radish: { name: 'Radish', duration: 120, water: 2, energy: 1.7, food: 10 },
  potato: { name: 'Potato', duration: 360, water: 3.5, energy: 2.8, food: 22 },
}

export const BUILDING_UPGRADE_BASE_MINUTES = 90
export const BUILDING_UPGRADE_PER_LEVEL_MINUTES = 30
export function buildingUpgradeDuration(level: number) {
  return BUILDING_UPGRADE_BASE_MINUTES + BUILDING_UPGRADE_PER_LEVEL_MINUTES * level
}

const unpoweredCropGrowthRate = 0.3

export function greenhouseStability(colony: ColonyState, survival: SurvivalState): number {
  const c = survival.operationalControls
  const environment = Math.max(0, 100 - Math.abs(c.greenhouseTemperature - 22) * 4 - Math.abs(c.greenhouseHumidity - 60) * 0.65)
  return Math.round(Math.max(0, Math.min(100, survival.equipment.greenhouse * 0.34 + survival.resources.energy * 0.2 + survival.resources.water * 0.14 + environment * 0.2 + c.growLighting * 0.06 + c.greenhouseWater * 0.06 + c.greenhousePower * 0.06 + (colony.upgrades.greenhouse - 1) * 3 + (colony.expansions.includes('advanced-greenhouse') ? 5 : 0))))
}

export function readColonyState(): ColonyState {
  try {
    const saved = JSON.parse(localStorage.getItem(COLONY_SAVE_KEY) ?? 'null') as Partial<ColonyState> | null
    if (!saved || saved.version !== 1) return INITIAL_COLONY_STATE
    const initial = INITIAL_COLONY_STATE
    const materials = { ...initial.materials }
    const savedExpansions = Array.isArray(saved.expansions) ? saved.expansions.filter((id): id is ExpansionId => EXPANSION_IDS.includes(id as ExpansionId)) : []
    const materialLimit = savedExpansions.includes('maintenance-bay') ? 420 : 300
    for (const key of Object.keys(materials) as MaterialId[]) {
      const value = saved.materials?.[key]
      materials[key] = Number.isFinite(value) ? Math.max(0, Math.min(materialLimit, value!)) : materials[key]
    }
    const upgrades = { ...initial.upgrades }
    for (const key of Object.keys(upgrades) as BuildingId[]) {
      const value = saved.upgrades?.[key]
      upgrades[key] = Number.isInteger(value) ? Math.max(1, Math.min(3, value!)) : upgrades[key]
    }
    const priorities = { ...initial.priorities }
    for (const key of Object.keys(priorities) as ColonyPriority[]) {
      const value = saved.priorities?.[key]
      priorities[key] = Number.isFinite(value) ? Math.max(1, Math.min(5, value!)) : priorities[key]
    }
    return {
      ...initial, ...saved, materials, upgrades, priorities,
      expansions: savedExpansions,
      crops: Array.isArray(saved.crops) ? saved.crops.filter((crop) => crop && typeof crop.id === 'string' && crop.crop in CROP_INFO).map((crop) => ({ ...crop, progress: Math.max(0, Math.min(100, crop.progress || 0)), condition: Math.max(0, Math.min(100, crop.condition || 0)) })) : [],
      construction: saved.construction && (saved.construction.kind === 'upgrade' || saved.construction.kind === 'expansion') && Number.isFinite(saved.construction.minutesLeft) ? saved.construction : null,
      radiationProtection: Number.isFinite(saved.radiationProtection) ? Math.max(0, Math.min(100, saved.radiationProtection!)) : 12,
      solarDust: Number.isFinite(saved.solarDust) ? Math.max(0, Math.min(100, saved.solarDust!)) : 0,
      nextCropId: Number.isInteger(saved.nextCropId) ? Math.max(1, saved.nextCropId!) : 1,
      completedActions: Number.isInteger(saved.completedActions) ? Math.max(0, saved.completedActions!) : 0,
      assignment: saved.assignment && ['ryan', 'emma', 'alex'].includes(saved.assignment.crew) && ['maintenance', 'greenhouse', 'research', 'logistics'].includes(saved.assignment.task) && Number.isFinite(saved.assignment.minutesLeft) ? saved.assignment : null,
    }
  } catch { return INITIAL_COLONY_STATE }
}

export type ColonyActionResult = { colony: ColonyState; survival: SurvivalState; ok: boolean; message: string }
function fail(colony: ColonyState, survival: SurvivalState, message: string): ColonyActionResult { return { colony, survival, ok: false, message } }
function canPay(materials: ColonyState['materials'], cost: Partial<Record<MaterialId, number>>) { return (Object.entries(cost) as [MaterialId, number][]).every(([id, amount]) => materials[id] >= amount) }
function pay(materials: ColonyState['materials'], cost: Partial<Record<MaterialId, number>>) { const next = { ...materials }; for (const [id, amount] of Object.entries(cost) as [MaterialId, number][]) next[id] -= amount; return next }

export function startBuildingUpgrade(colony: ColonyState, survival: SurvivalState, id: BuildingId): ColonyActionResult {
  const level = colony.upgrades[id]
  if (colony.construction) return fail(colony, survival, 'Another construction job is already in progress.')
  if (level >= 3) return fail(colony, survival, 'This system has reached its maximum upgrade level.')
  const scale = level
  const cost = { alloy: 5 * scale, parts: 4 * scale, regolith: 3 * scale, 'bio-supplies': id === 'greenhouse' ? 2 * scale : 0 }
  if (!canPay(colony.materials, cost)) return fail(colony, survival, 'Not enough construction materials for this upgrade.')
  if (survival.resources.energy < 8) return fail(colony, survival, 'At least 8% energy is needed to begin construction.')
  return { colony: { ...colony, materials: pay(colony.materials, cost), construction: { kind: 'upgrade', target: id, minutesLeft: buildingUpgradeDuration(scale) } }, survival: { ...survival, resources: { ...survival.resources, energy: survival.resources.energy - 8 } }, ok: true, message: `${BUILDING_INFO[id].label} upgrade started. Materials and 8% energy committed.` }
}

export function startExpansion(colony: ColonyState, survival: SurvivalState, id: ExpansionId): ColonyActionResult {
  if (colony.construction) return fail(colony, survival, 'Another construction job is already in progress.')
  if (colony.expansions.includes(id)) return fail(colony, survival, 'This expansion is already complete.')
  const spec = EXPANSION_INFO[id]
  if (!canPay(colony.materials, spec.cost)) return fail(colony, survival, 'Not enough construction materials for this module.')
  if (survival.resources.energy < 10) return fail(colony, survival, 'At least 10% energy is needed to begin construction.')
  return { colony: { ...colony, materials: pay(colony.materials, spec.cost), construction: { kind: 'expansion', target: id, minutesLeft: spec.duration } }, survival: { ...survival, resources: { ...survival.resources, energy: survival.resources.energy - 10 } }, ok: true, message: `${spec.title} construction started.` }
}

export function plantCrop(colony: ColonyState, survival: SurvivalState, crop: CropId): ColonyActionResult {
  const capacity = 2 + (colony.upgrades.greenhouse - 1) + (colony.expansions.includes('advanced-greenhouse') ? 2 : 0)
  if (colony.crops.length >= capacity) return fail(colony, survival, 'All available growing plots are occupied.')
  if (!canPay(colony.materials, { 'bio-supplies': 1 })) return fail(colony, survival, 'A bio-supply pack is required to plant this crop.')
  if (survival.resources.water < 2 || survival.resources.energy < 2) return fail(colony, survival, 'The greenhouse needs at least 2% water and energy to establish a crop.')
  return { colony: { ...colony, materials: pay(colony.materials, { 'bio-supplies': 1 }), crops: [...colony.crops, { id: `crop-${colony.nextCropId}`, crop, progress: 0, condition: 100 }], nextCropId: colony.nextCropId + 1 }, survival, ok: true, message: `${CROP_INFO[crop].name} planted. Growth uses the colony's existing water and energy reserves.` }
}

export function harvestCrop(colony: ColonyState, survival: SurvivalState, id: string): ColonyActionResult {
  const plot = colony.crops.find((item) => item.id === id)
  if (!plot || plot.progress < 100) return fail(colony, survival, 'This crop is not ready to harvest yet.')
  const amount = Math.round(CROP_INFO[plot.crop].food * (0.45 + plot.condition / 180) * (1 + (colony.upgrades.greenhouse - 1) * 0.14))
  return { colony: { ...colony, crops: colony.crops.filter((item) => item.id !== id), completedActions: colony.completedActions + 1 }, survival: { ...survival, resources: { ...survival.resources, food: Math.min(100, survival.resources.food + amount) } }, ok: true, message: `${CROP_INFO[plot.crop].name} harvested · +${amount}% to the shared food reserve.` }
}

export function maintainSolar(colony: ColonyState, survival: SurvivalState): ColonyActionResult {
  if (!canPay(colony.materials, { parts: 1 }) || survival.resources.energy < 5) return fail(colony, survival, 'Maintenance needs 1 component and 5% energy.')
  return { colony: { ...colony, solarDust: Math.max(0, colony.solarDust - 38), materials: pay(colony.materials, { parts: 1 }), completedActions: colony.completedActions + 1 }, survival: { ...survival, resources: { ...survival.resources, energy: survival.resources.energy - 5 }, maintenanceLog: [...survival.maintenanceLog, 'solar-array'] }, ok: true, message: 'Ryan used 1 component and 5% energy to clear simulated array dust.' }
}

export function resolveColonyEvent(colony: ColonyState, survival: SurvivalState, action: 'repair' | 'defer'): ColonyActionResult {
  if (!colony.event || colony.event.resolved) return fail(colony, survival, 'There is no active colony event.')
  if (action === 'repair') {
    if (!canPay(colony.materials, { parts: 2 }) || survival.resources.energy < 5) return fail(colony, survival, 'Resolve this event requires 2 parts and 5% energy.')
    return { colony: { ...colony, materials: pay(colony.materials, { parts: 2 }), event: { ...colony.event, resolved: true }, completedActions: colony.completedActions + 1 }, survival: { ...survival, resources: { ...survival.resources, energy: survival.resources.energy - 5 }, equipment: { ...survival.equipment, greenhouse: Math.min(100, survival.equipment.greenhouse + 8) } }, ok: true, message: 'Greenhouse environmental controls were stabilized.' }
  }
  return { colony: { ...colony, crops: colony.crops.map((crop) => ({ ...crop, condition: Math.max(0, crop.condition - 18) })), event: { ...colony.event, resolved: true } }, survival: { ...survival, resources: { ...survival.resources, food: Math.max(0, survival.resources.food - 3) } }, ok: true, message: 'Repair deferred. Crop condition and the shared food reserve were reduced.' }
}

export function setColonyPriority(colony: ColonyState, priority: ColonyPriority, value: number): ColonyState {
  return { ...colony, priorities: { ...colony.priorities, [priority]: Math.max(1, Math.min(5, Math.round(value))) } }
}

export function assignCrew(colony: ColonyState, crew: 'ryan' | 'emma' | 'alex', task: 'maintenance' | 'greenhouse' | 'research' | 'logistics'): { colony: ColonyState; ok: boolean; message: string } {
  if (colony.assignment && colony.assignment.minutesLeft > 0) return { colony, ok: false, message: 'The assigned crew member is already committed to a task.' }
  return { colony: { ...colony, assignment: { crew, task, minutesLeft: task === 'research' ? 300 : 180 } }, ok: true, message: `${crew === 'ryan' ? 'Ryan Cooper' : crew === 'emma' ? 'Dr. Emma Ross' : 'Alex Carter'} assigned to ${task}.` }
}

export function advanceColony(colony: ColonyState, survival: SurvivalState, minutes: number, stormIntensity: number, sheltered: boolean, previousSolMinute = survival.solMinute - minutes): { colony: ColonyState; survival: SurvivalState } {
  const state = { ...colony, solarDust: Math.min(100, colony.solarDust + stormIntensity * minutes * 0.14), crops: colony.crops.map((crop) => ({ ...crop })) }
  let resources = { ...survival.resources }
  const crops = state.crops.map((plot) => {
    const spec = CROP_INFO[plot.crop]
    const powered = resources.energy > 8 && survival.operationalControls.greenhousePower > 15 && (state.priorities.greenhouse >= state.priorities.research || resources.energy > 30)
    const watered = resources.water > 8 && survival.operationalControls.greenhouseWater > 10
    const greenhouseCondition = survival.equipment.greenhouse
    const stability = greenhouseStability(state, { ...survival, resources })
    if (powered) resources.energy = Math.max(0, resources.energy - spec.energy * minutes / spec.duration / 100 * (0.45 + survival.operationalControls.growLighting / 100 * 0.55) * (0.5 + survival.operationalControls.greenhousePower / 200))
    if (watered) resources.water = Math.max(0, resources.water - spec.water * minutes / spec.duration / 100 * survival.operationalControls.greenhouseWater / 80 * Math.max(0.65, 1 - (state.upgrades.greenhouse - 1) * 0.12))
    const condition = Math.max(0, Math.min(100, plot.condition + (powered && watered ? 0.025 : -0.06) * minutes - stormIntensity * 0.018 * minutes + (greenhouseCondition - 70) * 0.0006 * minutes))
    const speed = powered && watered ? Math.max(0.18, greenhouseCondition / 100) * (0.5 + stability / 200) * (0.55 + survival.operationalControls.growLighting / 220) * (1 + (state.upgrades.greenhouse - 1) * 0.12) * (state.assignment?.task === 'greenhouse' ? 1.18 : 1) : unpoweredCropGrowthRate
    return { ...plot, condition, progress: Math.min(100, plot.progress + minutes / spec.duration * 100 * speed) }
  })
  let construction = state.construction
  let expansions = state.expansions
  let upgrades = state.upgrades
  if (construction) {
    const workBonus = state.priorities.maintenance >= 4 ? 1 + (state.priorities.maintenance - 3) * 0.06 : 1
    const minutesLeft = Math.max(0, construction.minutesLeft - minutes * (state.assignment?.task === 'maintenance' ? 1.2 : workBonus))
    if (minutesLeft === 0) {
      if (construction.kind === 'upgrade') upgrades = { ...upgrades, [construction.target]: Math.min(3, upgrades[construction.target as BuildingId] + 1) }
      else expansions = expansions.includes(construction.target as ExpansionId) ? expansions : [...expansions, construction.target as ExpansionId]
      construction = null
      state.completedActions += 1
    } else construction = { ...construction, minutesLeft }
  }
  const assignment = state.assignment ? { ...state.assignment, minutesLeft: Math.max(0, state.assignment.minutesLeft - minutes) } : null
  const assignmentCompleted = Boolean(state.assignment && assignment?.minutesLeft === 0)
  const radiationProtection = Math.min(100, 12 + (upgrades.habitat - 1) * 8 + (expansions.includes('regolith-shield') ? 34 : 0) + (expansions.includes('habitat-extension') ? 10 : 0))
  const radiationLoss = sheltered ? 0 : Math.max(0, (48 - radiationProtection) / 48) * minutes * 0.001
  const shelteredRecovery = sheltered && expansions.includes('habitat-extension') ? minutes * 0.0015 : 0
  const crew = radiationLoss > 0 || shelteredRecovery > 0 ? Object.fromEntries(Object.entries(survival.crew).map(([id, member]) => [id, { ...member, wellness: Math.max(0, Math.min(100, member.wellness - radiationLoss + shelteredRecovery)) }])) as SurvivalState['crew'] : survival.crew
  const laboratoryBonus = previousSolMinute < 66 && previousSolMinute + minutes >= 66 ? (upgrades.laboratory - 1 + (expansions.includes('research-wing') ? 1 : 0)) * 0.25 : 0
  const researchPaused = previousSolMinute < 66 && previousSolMinute + minutes >= 66 && resources.energy < 20 && state.priorities.research < state.priorities['life-support']
    const researchPenalty = researchPaused ? (survival.equipment.laboratory > 40 ? 0.25 : 0.08) : 0
  const baselineSolar = BASE_SOLAR_GENERATION_RATE * survival.equipment['solar-array'] / 100 * (0.55 + 0.45 * survival.equipment['battery-storage'] / 100) * (1 - 0.88 * stormIntensity) * (survival.operationalControls.solarOutput / 100)
  const upgradedSolar = baselineSolar * (1 - state.solarDust / 130) * (1 + (upgrades['solar-array'] - 1) * 0.2)
  const solarAdjustment = (upgradedSolar - baselineSolar) * minutes
  const batterySaving = minutes * ((upgrades['battery-storage'] - 1) * 0.0012 + (state.priorities.battery >= 4 ? 0.0004 : 0))
  const habitatBonus = minutes * (upgrades.habitat - 1) * 0.0008
  const lifeSupportPriority = resources.energy < 25 ? 0.75 + state.priorities['life-support'] * 0.05 : 1
  const lifeSupportPowerFactor = survival.resources.energy >= 12 ? 1 : 0.25
  const oxygenRecovery = 0.008 * survival.equipment.habitat / 100 * lifeSupportPowerFactor * (0.35 + survival.operationalControls.oxygenOutput * 0.0065)
  const waterRecovery = 0.0085 * survival.equipment.habitat / 100 * lifeSupportPowerFactor * (0.3 + survival.operationalControls.waterRecovery * 0.007)
  if (state.expansions.includes('water-processor')) resources.water = Math.min(100, resources.water + minutes * 0.0012)
  resources.energy = Math.max(0, Math.min(100, resources.energy + solarAdjustment + batterySaving))
  resources.oxygen = Math.max(0, Math.min(100, resources.oxygen + habitatBonus + (lifeSupportPriority - 1) * oxygenRecovery * minutes))
  resources.water = Math.max(0, Math.min(100, resources.water + habitatBonus + (lifeSupportPriority - 1) * waterRecovery * minutes))
  return {
    colony: {
      ...state, crops, construction, expansions, upgrades,
      assignment: assignment?.minutesLeft ? assignment : null,
      materials: assignmentCompleted && state.assignment?.task === 'logistics'
        ? { ...state.materials, alloy: Math.min(state.expansions.includes('maintenance-bay') ? 420 : 300, state.materials.alloy + 4), parts: Math.min(state.expansions.includes('maintenance-bay') ? 420 : 300, state.materials.parts + 4), regolith: Math.min(state.expansions.includes('maintenance-bay') ? 420 : 300, state.materials.regolith + 8) }
        : state.materials,
      radiationProtection,
    },
    survival: {
      ...survival, resources, crew,
      researchPoints: Math.max(0, survival.researchPoints - researchPenalty + laboratoryBonus + (assignmentCompleted && state.assignment?.task === 'research' ? 2 : 0)),
      equipment: assignmentCompleted && state.assignment?.task === 'maintenance'
        ? { ...survival.equipment, habitat: Math.min(100, survival.equipment.habitat + (state.expansions.includes('maintenance-bay') ? 9 : 5)) }
        : survival.equipment,
    },
  }
}

export function resourceRates(colony: ColonyState, survival: SurvivalState, stormIntensity = 0) {
  const solarOutput = BASE_SOLAR_GENERATION_RATE * survival.equipment['solar-array'] / 100 * (0.55 + 0.45 * survival.equipment['battery-storage'] / 100) * (1 - 0.88 * stormIntensity) * (survival.operationalControls.solarOutput / 100) * (1 - colony.solarDust / 130) * (1 + (colony.upgrades['solar-array'] - 1) * 0.2)
  const powered = survival.resources.energy > 8 && survival.operationalControls.greenhousePower > 15 && (colony.priorities.greenhouse >= colony.priorities.research || survival.resources.energy > 30)
  const watered = survival.resources.water > 8 && survival.operationalControls.greenhouseWater > 10
  const cropEnergy = powered ? colony.crops.reduce((total, plot) => total + CROP_INFO[plot.crop].energy / CROP_INFO[plot.crop].duration / 100 * (0.45 + survival.operationalControls.growLighting / 100 * 0.55) * (0.5 + survival.operationalControls.greenhousePower / 200), 0) : 0
  const cropWater = watered ? colony.crops.reduce((total, plot) => total + CROP_INFO[plot.crop].water / CROP_INFO[plot.crop].duration / 100 * survival.operationalControls.greenhouseWater / 80 * Math.max(0.65, 1 - (colony.upgrades.greenhouse - 1) * 0.12), 0) : 0
  const lifeSupportPower = (survival.resources.energy >= 12 ? 1 : 0.25) * (survival.resources.energy < 25 ? 0.75 + colony.priorities['life-support'] * 0.05 : 1)
  const powerNeed = BASE_POWER_USE_RATE + survival.operationalControls.airScrubbing * 0.000018 + cropEnergy
  const waterNet = 0.0085 * survival.equipment.habitat / 100 * lifeSupportPower * (0.3 + survival.operationalControls.waterRecovery * 0.007) - 0.011 - cropWater + (colony.expansions.includes('water-processor') ? 0.0012 : 0) + (colony.upgrades.habitat - 1) * 0.0008
  const batterySaving = (colony.upgrades['battery-storage'] - 1) * 0.0012 + (colony.priorities.battery >= 4 ? 0.0004 : 0)
  return { energy: solarOutput - powerNeed + batterySaving, water: waterNet, food: -0.011, oxygen: 0.008 * survival.equipment.habitat / 100 * lifeSupportPower * (0.35 + survival.operationalControls.oxygenOutput * 0.0065) - 0.01 + (colony.upgrades.habitat - 1) * 0.0008 }
}
