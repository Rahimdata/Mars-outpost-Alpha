import type { SampleId } from '../data/gameplay'

export type ScienceCategoryId =
  | 'geology'
  | 'atmosphere'
  | 'water'
  | 'regolith'
  | 'radiation'
  | 'climate'
  | 'survival'
  | 'agriculture'
  | 'energy'
  | 'robotics'

export type DiscoveryCondition =
  | { kind: 'scan'; id: SampleId }
  | { kind: 'collect'; id: SampleId }
  | { kind: 'analyze'; id: SampleId }
  | { kind: 'flag'; id: ScienceFlag }
  | { kind: 'challenge'; id: string }

export type ScienceFlag =
  | 'storm-observed'
  | 'greenhouse-observed'
  | 'solar-inspected'
  | 'rover-survey-complete'
  | 'radiation-shielding-built'
  | 'crop-harvested'

export type ScienceSignals = {
  scannedSampleIds: SampleId[]
  collectedSampleIds: SampleId[]
  analyzedSampleIds: SampleId[]
  completedChallengeIds: string[]
  flags: Partial<Record<ScienceFlag, boolean>>
}

export type ScienceSource = {
  organization: string
  title: string
  url: string
}

export type ScienceEntry = {
  id: string
  title: string
  category: ScienceCategoryId
  summary: string
  explanation: string
  facts: string[]
  relevance: string
  gameConnection: string
  requirements: DiscoveryCondition[]
  relatedEntryIds: string[]
  sources: ScienceSource[]
  diagram: {
    label: string
    steps: string[]
  }
}

export type AnalysisStatus = 'collected' | 'in-progress' | 'complete'

export type SampleAnalysisRecord = {
  sampleId: SampleId
  sampleName: string
  collectionLocation: string
  collectionSol: number
  status: AnalysisStatus
  startedAtGameMinute?: number
  completesAtGameMinute?: number
  completedSol?: number
  result?: string
  relatedEntryId?: string
}

export type ResearchRecordKind =
  | 'sample-collected'
  | 'analysis-started'
  | 'analysis-completed'
  | 'discovery-unlocked'
  | 'challenge-completed'
  | 'observation'

export type ResearchRecord = {
  id: string
  sol: number
  kind: ResearchRecordKind
  title: string
  text: string
}

export type ScienceProgress = {
  version: 1
  unlockedEntryIds: string[]
  readEntryIds: string[]
  sampleAnalyses: Partial<Record<SampleId, SampleAnalysisRecord>>
  completedChallengeIds: string[]
  researchLog: ResearchRecord[]
}

export type ScienceChallenge = {
  id: string
  title: string
  category: ScienceCategoryId
  scenario: string
  learningObjective: string
  question: string
  options: string[]
  correctOption: number
  hint: string
  explanation: string
  unlockEntryId: string
}

export const INITIAL_SCIENCE_PROGRESS: ScienceProgress = {
  version: 1,
  unlockedEntryIds: [],
  readEntryIds: [],
  sampleAnalyses: {},
  completedChallengeIds: [],
  researchLog: [],
}