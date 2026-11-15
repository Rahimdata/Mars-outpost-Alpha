import type { MissionProgress } from '../data/gameplay'
import type { SurvivalState } from '../state/survivalState'

export const MISSION_REPORT_STORAGE_KEY = 'mars-outpost-alpha-mission-report-v1'

export type ReportVital = 'o2' | 'h2o' | 'food' | 'pwr'
export type ReportEvent = { sol: number; text: string; outcome: string; at: string }
export type VitalLow = { value: number; sol: number; minute: number }
export type SolReportSnapshot = {
  sol: number
  o2: number
  h2o: number
  food: number
  pwr: number
  crew: number
  distanceWalked: number
  distanceRover: number
  samplesCollected: number
  samplesAnalysed: number
  recordsUnlocked: number
  challengesDone: number
  evaSeconds: number
  events: Array<{ sol: number; text: string; outcome: string }>
  dustFront: boolean
}

export type MissionReportData = {
  version: 1
  startedAt: string
  activePlaySeconds: number
  evaSeconds: number
  distanceWalked: number
  distanceRover: number
  nearMisses: number
  missionFailures: number
  suitFailures: number | null
  deathsAvoided: number | null
  failureReasons: string[]
  lowest: Record<ReportVital, VitalLow | null>
  initialResources: Record<ReportVital, number>
  snapshots: SolReportSnapshot[]
  events: ReportEvent[]
  achievements: string[]
}

export const MISSION_SCORE_WEIGHTS = {
  science: 25,
  survival: 30,
  exploration: 15,
  engineering: 15,
  teamwork: 15,
} as const

export const MISSION_RANK_THRESHOLDS = [
  { minimum: 9500, label: 'Legend' },
  { minimum: 8000, label: 'Commander' },
  { minimum: 6000, label: 'Pioneer' },
  { minimum: 4000, label: 'Specialist' },
  { minimum: 0, label: 'Rookie' },
] as const

const vitalValues = (survival: SurvivalState): Record<ReportVital, number> => ({
  o2: survival.resources.oxygen,
  h2o: survival.resources.water,
  food: survival.resources.food,
  pwr: survival.resources.energy,
})

export function createMissionReport(survival: SurvivalState): MissionReportData {
  const values = vitalValues(survival)
  const low = (value: number): VitalLow => ({ value, sol: survival.sol, minute: survival.solMinute })
  return {
    version: 1,
    startedAt: new Date().toISOString(),
    activePlaySeconds: 0,
    evaSeconds: 0,
    distanceWalked: 0,
    distanceRover: 0,
    nearMisses: 0,
    missionFailures: 0,
    suitFailures: null,
    deathsAvoided: null,
    failureReasons: [],
    lowest: { o2: low(values.o2), h2o: low(values.h2o), food: low(values.food), pwr: low(values.pwr) },
    initialResources: { ...values },
    snapshots: [],
    events: [],
    achievements: [],
  }
}

function isReport(value: unknown): value is MissionReportData {
  if (!value || typeof value !== 'object') return false
  const report = value as Partial<MissionReportData>
  return report.version === 1 && Array.isArray(report.snapshots) && Array.isArray(report.events) &&
    Boolean(report.lowest && report.initialResources && Array.isArray(report.achievements))
}

export function readMissionReport(survival: SurvivalState): MissionReportData {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem(MISSION_REPORT_STORAGE_KEY) ?? 'null')
    if (!isReport(saved)) return createMissionReport(survival)
    return {
      ...createMissionReport(survival),
      ...saved,
      lowest: { ...createMissionReport(survival).lowest, ...saved.lowest },
      initialResources: { ...createMissionReport(survival).initialResources, ...saved.initialResources },
      activePlaySeconds: Math.max(0, Number(saved.activePlaySeconds) || 0),
      evaSeconds: Math.max(0, Number(saved.evaSeconds) || 0),
      distanceWalked: Math.max(0, Number(saved.distanceWalked) || 0),
      distanceRover: Math.max(0, Number(saved.distanceRover) || 0),
      nearMisses: Math.max(0, Number(saved.nearMisses) || 0),
      missionFailures: Math.max(0, Number(saved.missionFailures) || 0),
      snapshots: saved.snapshots.filter((item) => item && Number.isInteger(item.sol) && item.sol >= 1 && item.sol <= 10).slice(-10),
      events: saved.events.filter((item) => item && Number.isInteger(item.sol) && typeof item.text === 'string').slice(-300),
      achievements: [...new Set(saved.achievements.filter((item) => typeof item === 'string'))],
      failureReasons: [...new Set(saved.failureReasons.filter((item) => typeof item === 'string'))],
    }
  } catch {
    return createMissionReport(survival)
  }
}

export function saveMissionReport(report: MissionReportData): MissionReportData {
  try { localStorage.setItem(MISSION_REPORT_STORAGE_KEY, JSON.stringify(report)) } catch { /* Continue the report in memory if storage is full or unavailable. */ }
  return report
}

export function recordReportEvent(report: MissionReportData, sol: number, text: string, outcome = 'Recorded'): MissionReportData {
  const cleanText = text.trim().slice(0, 240)
  if (!cleanText) return report
  if (report.events.some((event) => event.sol === sol && event.text === cleanText && event.outcome === outcome)) return report
  return { ...report, events: [...report.events, { sol, text: cleanText, outcome, at: new Date().toISOString() }].slice(-300) }
}

export function observeReportVitals(report: MissionReportData, survival: SurvivalState): MissionReportData {
  const values = vitalValues(survival)
  const nextLowest = { ...report.lowest }
  let lowered = false
  for (const id of Object.keys(values) as ReportVital[]) {
    const previous = nextLowest[id]
    if (!previous || values[id] < previous.value) { nextLowest[id] = { value: values[id], sol: survival.sol, minute: survival.solMinute }; lowered = true }
  }
  return lowered ? { ...report, lowest: nextLowest } : report
}

export function recordNearMiss(report: MissionReportData, sol: number, vital: ReportVital): MissionReportData {
  const key = vital.toUpperCase()
  if (report.events.some((event) => event.sol === sol && event.outcome === 'Near miss' && event.text.includes(` ${key} `))) return report
  return recordReportEvent({ ...report, nearMisses: report.nearMisses + 1 }, sol, `Critical reserve ${key} crossed below 15%.`, 'Near miss')
}

export function recordMissionFailure(report: MissionReportData, sol: number, reasons: string[]): MissionReportData {
  if (report.events.some((event) => event.sol === sol && event.outcome === 'Mission failed')) return report
  let next: MissionReportData = { ...report, missionFailures: report.missionFailures + 1, failureReasons: [...new Set([...report.failureReasons, ...reasons])] }
  for (const reason of reasons) next = recordReportEvent(next, sol, reason, 'Mission failed')
  return next
}

export function recordSolSnapshot(
  report: MissionReportData,
  sol: number,
  survival: SurvivalState,
  progress: MissionProgress,
  science: { samplesCollected: number; samplesAnalysed: number; recordsUnlocked: number; challengesDone: number },
): MissionReportData {
  const solEvent = recordReportEvent(report, sol, `Sol ${String(sol).padStart(2, '0')} completed.`, 'Completed')
  const crewMembers = Object.values(survival.crew)
  const snapshot: SolReportSnapshot = {
    sol,
    o2: Math.round(survival.resources.oxygen),
    h2o: Math.round(survival.resources.water),
    food: Math.round(survival.resources.food),
    pwr: Math.round(survival.resources.energy),
    crew: Math.round(crewMembers.reduce((sum, member) => sum + member.wellness, 0) / Math.max(1, crewMembers.length)),
    distanceWalked: Math.round(report.distanceWalked),
    distanceRover: Math.round(report.distanceRover),
    samplesCollected: science.samplesCollected,
    samplesAnalysed: science.samplesAnalysed,
    recordsUnlocked: science.recordsUnlocked,
    challengesDone: science.challengesDone,
    evaSeconds: Math.round(report.evaSeconds),
    events: solEvent.events.filter((event) => event.sol === sol).map(({ sol: eventSol, text, outcome }) => ({ sol: eventSol, text, outcome })),
    dustFront: true,
  }
  const snapshots = [...report.snapshots.filter((item) => item.sol !== sol), snapshot].sort((a, b) => a.sol - b.sol).slice(-10)
  let next = { ...solEvent, snapshots }
  const unlock = (id: string, achieved: boolean) => {
    if (!achieved || next.achievements.includes(id)) return
    next = { ...next, achievements: [...next.achievements, id] }
  }
  unlock('first-sol', sol === 1)
  unlock('field-scientist', science.samplesCollected >= 3)
  unlock('lab-researcher', science.samplesAnalysed >= 1)
  unlock('archive-builder', science.recordsUnlocked >= 10)
  unlock('challenge-scholar', science.challengesDone >= 3)
  unlock('rover-pioneer', progress.roverTripComplete)
  unlock('storm-survivor', survival.shelteredSols.includes(sol))
  unlock('ten-sols', sol === 10)
  return next
}
