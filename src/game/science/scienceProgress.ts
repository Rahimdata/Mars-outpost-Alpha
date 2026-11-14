import type { SampleId } from '../data/gameplay'
import { SAMPLES } from '../data/gameplay'
import { SCIENCE_ENTRIES, SAMPLE_RESULT_ENTRY } from './scienceDatabase'
import type {
  ResearchRecord,
  ScienceEntry,
  ScienceProgress,
  ScienceSignals,
  SampleAnalysisRecord,
} from './types'
import { INITIAL_SCIENCE_PROGRESS } from './types'

export const SCIENCE_SAVE_KEY = 'mars-outpost-alpha-science-v1'
export const ANALYSIS_DURATION_GAME_MINUTES = 45
export const ANALYSIS_ENERGY_COST_PERCENT = 5

const SAMPLE_LOCATIONS: Record<SampleId, string> = {
  'fractured-basalt': 'Fictional Outpost Alpha survey point · basalt ridge',
  'layered-outcrop': 'Fictional Outpost Alpha survey point · basin edge',
  'iron-rich-regolith': 'Fictional Outpost Alpha survey point · regolith field',
}

function validStringArray(value: unknown): string[] {
  return Array.isArray(value) ? [...new Set(value.filter((item): item is string => typeof item === 'string'))] : []
}

function isSampleId(value: string): value is SampleId {
  return value === 'fractured-basalt' || value === 'layered-outcrop' || value === 'iron-rich-regolith'
}

export function readScienceProgress(): ScienceProgress {
  try {
    const saved = JSON.parse(localStorage.getItem(SCIENCE_SAVE_KEY) ?? 'null') as Partial<ScienceProgress> | null
    if (!saved || saved.version !== 1) return INITIAL_SCIENCE_PROGRESS

    const sampleAnalyses: ScienceProgress['sampleAnalyses'] = {}
    if (saved.sampleAnalyses && typeof saved.sampleAnalyses === 'object') {
      for (const [key, value] of Object.entries(saved.sampleAnalyses)) {
        if (!isSampleId(key) || !value || typeof value !== 'object') continue
        const record = value as SampleAnalysisRecord
        if (!['collected', 'in-progress', 'complete'].includes(record.status)) continue
        sampleAnalyses[key] = {
          sampleId: key,
          sampleName: SAMPLES[key].name,
          collectionLocation: typeof record.collectionLocation === 'string' ? record.collectionLocation : SAMPLE_LOCATIONS[key],
          collectionSol: Number.isFinite(record.collectionSol) ? Math.max(1, Math.floor(record.collectionSol)) : 1,
          status: record.status,
          startedAtGameMinute: Number.isFinite(record.startedAtGameMinute) ? record.startedAtGameMinute : undefined,
          completesAtGameMinute: Number.isFinite(record.completesAtGameMinute) ? record.completesAtGameMinute : undefined,
          completedSol: Number.isFinite(record.completedSol) ? record.completedSol : undefined,
          result: typeof record.result === 'string' ? record.result : undefined,
          relatedEntryId: typeof record.relatedEntryId === 'string' ? record.relatedEntryId : undefined,
        }
      }
    }

    const validEntryIds = new Set(SCIENCE_ENTRIES.map((entry) => entry.id))
    return {
      ...INITIAL_SCIENCE_PROGRESS,
      unlockedEntryIds: validStringArray(saved.unlockedEntryIds).filter((id) => validEntryIds.has(id)),
      readEntryIds: validStringArray(saved.readEntryIds).filter((id) => validEntryIds.has(id)),
      sampleAnalyses,
      completedChallengeIds: validStringArray(saved.completedChallengeIds),
      researchLog: Array.isArray(saved.researchLog)
        ? saved.researchLog.filter((record): record is ResearchRecord =>
            Boolean(record && typeof record.id === 'string' && typeof record.text === 'string' && Number.isFinite(record.sol)),
          ).slice(-100)
        : [],
    }
  } catch {
    return INITIAL_SCIENCE_PROGRESS
  }
}

function addRecord(
  progress: ScienceProgress,
  record: Omit<ResearchRecord, 'id'> & { id?: string },
): ScienceProgress {
  const id = record.id ?? `${record.kind}:${record.sol}:${Date.now()}`
  if (progress.researchLog.some((item) => item.id === id)) return progress
  return {
    ...progress,
    researchLog: [...progress.researchLog, { ...record, id }].slice(-100),
  }
}

export function syncCollectedSamples(
  progress: ScienceProgress,
  collectedSampleIds: readonly SampleId[],
  sol: number,
): ScienceProgress {
  let next = progress
  for (const sampleId of collectedSampleIds) {
    if (next.sampleAnalyses[sampleId]) continue
    const sampleName = SAMPLES[sampleId].name
    const analysis: SampleAnalysisRecord = {
      sampleId,
      sampleName,
      collectionLocation: SAMPLE_LOCATIONS[sampleId],
      collectionSol: Math.max(1, Math.floor(sol)),
      status: 'collected',
      relatedEntryId: SAMPLE_RESULT_ENTRY[sampleId],
    }
    next = {
      ...next,
      sampleAnalyses: { ...next.sampleAnalyses, [sampleId]: analysis },
    }
    next = addRecord(next, {
      id: `sample-collected:${sampleId}`,
      sol,
      kind: 'sample-collected',
      title: `Sample secured · ${sampleName}`,
      text: `Recorded at ${analysis.collectionLocation}. The site and sample reading are fictional game content.`,
    })
  }
  return next
}

export function startSampleAnalysis(
  progress: ScienceProgress,
  sampleId: SampleId,
  sol: number,
  gameMinute: number,
  atResearchLab: boolean,
  energyPercent: number,
): { progress: ScienceProgress; ok: boolean; message: string } {
  const sample = progress.sampleAnalyses[sampleId]
  if (!atResearchLab) return { progress, ok: false, message: 'Sample analysis can only be started inside the Research Laboratory.' }
  if (!sample) return { progress, ok: false, message: 'This sample is not in the existing field locker.' }
  if (sample.status === 'in-progress') return { progress, ok: false, message: 'This sample is already being analyzed.' }
  if (sample.status === 'complete') return { progress, ok: false, message: 'Analysis is already complete. Review the result in the research log.' }
  if (energyPercent < ANALYSIS_ENERGY_COST_PERCENT) return { progress, ok: false, message: 'The laboratory needs at least 5% energy to start an analysis.' }

  const started = {
    ...sample,
    status: 'in-progress' as const,
    startedAtGameMinute: gameMinute,
    completesAtGameMinute: gameMinute + ANALYSIS_DURATION_GAME_MINUTES,
  }
  let next = {
    ...progress,
    sampleAnalyses: { ...progress.sampleAnalyses, [sampleId]: started },
  }
  next = addRecord(next, {
    id: `analysis-started:${sampleId}`,
    sol,
    kind: 'analysis-started',
    title: `Analysis started · ${sample.sampleName}`,
    text: `Ryan and Emma prepared the fictional sample for a 45 game-minute laboratory analysis.`,
  })
  return { progress: next, ok: true, message: `Analysis started · ${sample.sampleName}.` }
}

export function advanceSampleAnalyses(
  progress: ScienceProgress,
  gameMinute: number,
  sol: number,
): ScienceProgress {
  let next = progress
  for (const [sampleId, sample] of Object.entries(next.sampleAnalyses) as Array<[SampleId, SampleAnalysisRecord]>) {
    if (sample.status !== 'in-progress' || sample.completesAtGameMinute === undefined || gameMinute < sample.completesAtGameMinute) continue
    const relatedEntryId = SAMPLE_RESULT_ENTRY[sampleId]
    const resultBySample: Record<SampleId, string> = {
      'fractured-basalt': 'The fictional scan pattern is consistent with a basalt-like igneous sample. Mineral identification would require calibrated instruments and more than this game result.',
      'layered-outcrop': 'The fictional layered texture supports comparing sedimentary processes. Layering alone cannot identify the exact depositional setting or prove past life.',
      'iron-rich-regolith': 'The fictional surface sample is logged as iron-tinted regolith. Color is an observation, not a mineralogical or chemical assay.',
    }
    const completed: SampleAnalysisRecord = {
      ...sample,
      status: 'complete',
      completedSol: Math.max(1, Math.floor(sol)),
      result: resultBySample[sampleId],
      relatedEntryId,
    }
    next = {
      ...next,
      sampleAnalyses: { ...next.sampleAnalyses, [sampleId]: completed },
    }
    next = addRecord(next, {
      id: `analysis-completed:${sampleId}`,
      sol,
      kind: 'analysis-completed',
      title: `Analysis complete · ${sample.sampleName}`,
      text: `${completed.result} This is educational game text, not a real instrument result.`,
    })
  }
  return next
}

export function unlockScienceEntries(
  progress: ScienceProgress,
  signals: ScienceSignals,
  sol: number,
): { progress: ScienceProgress; newEntries: ScienceEntry[] } {
  const conditionsMet = (entry: ScienceEntry) => entry.requirements.every((requirement) => {
    if (requirement.kind === 'scan') return signals.scannedSampleIds.includes(requirement.id)
    if (requirement.kind === 'collect') return signals.collectedSampleIds.includes(requirement.id)
    if (requirement.kind === 'analyze') return signals.analyzedSampleIds.includes(requirement.id)
    if (requirement.kind === 'challenge') return signals.completedChallengeIds.includes(requirement.id)
    return Boolean(signals.flags[requirement.id])
  })

  const newEntries = SCIENCE_ENTRIES.filter(
    (entry) => !progress.unlockedEntryIds.includes(entry.id) && conditionsMet(entry),
  )
  if (newEntries.length === 0) return { progress, newEntries }

  let next: ScienceProgress = {
    ...progress,
    unlockedEntryIds: [...new Set([...progress.unlockedEntryIds, ...newEntries.map((entry) => entry.id)])],
  }
  for (const entry of newEntries) {
    next = addRecord(next, {
      id: `discovery-unlocked:${entry.id}`,
      sol,
      kind: 'discovery-unlocked',
      title: `Science entry unlocked · ${entry.title}`,
      text: `New database record: ${entry.summary}`,
    })
  }
  return { progress: next, newEntries }
}

export function markScienceEntryRead(progress: ScienceProgress, entryId: string): ScienceProgress {
  if (!progress.unlockedEntryIds.includes(entryId) || progress.readEntryIds.includes(entryId)) return progress
  return { ...progress, readEntryIds: [...progress.readEntryIds, entryId] }
}

export function completeScienceChallenge(
  progress: ScienceProgress,
  challengeId: string,
  sol: number,
  title: string,
): ScienceProgress {
  if (progress.completedChallengeIds.includes(challengeId)) return progress
  let next = {
    ...progress,
    completedChallengeIds: [...progress.completedChallengeIds, challengeId],
  }
  return addRecord(next, {
    id: `challenge-completed:${challengeId}`,
    sol,
    kind: 'challenge-completed',
    title: `Challenge complete · ${title}`,
    text: 'Scientific interpretation recorded. No survival resources were awarded or changed.',
  })
}