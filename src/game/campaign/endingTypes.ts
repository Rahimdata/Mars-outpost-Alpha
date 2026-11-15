import type { MissionProgress } from '../data/gameplay'
import type { ColonyState } from '../state/colonyState'
import type { SurvivalState } from '../state/survivalState'
import type { ScienceProgress } from '../science/types'

export type EndingId = 'home' | 'foundation' | 'lesson'

export type PerformanceLevel =
  | 'Excellent'
  | 'Strong'
  | 'Stable'
  | 'Needs Improvement'
  | 'Critical'

export type EvaluationCategoryId =
  | 'crew'
  | 'oxygen'
  | 'water'
  | 'food'
  | 'energy'
  | 'infrastructure'
  | 'maintenance'
  | 'radiation'
  | 'science'
  | 'research'
  | 'objectives'
  | 'decisions'
  | 'sustainability'

export type CategoryResult = {
  id: EvaluationCategoryId
  title: string
  score: number
  level: PerformanceLevel
  explanation: string
  evidence: string[]
  recommendation?: string
}

export type CampaignSnapshot = {
  survival: SurvivalState
  progress: MissionProgress
  colony: ColonyState
  science: ScienceProgress
}

export type CampaignEvaluation = {
  score: number
  ending: EndingId
  endingTitle: string
  endingReason: string
  criticalFailures: string[]
  categories: CategoryResult[]
  completedSols: number[]
  evaluatedAt: string
}

export type CampaignArchiveRecord = {
  id: string
  completedAt: string
  ending: EndingId
  evaluation: CampaignEvaluation
}