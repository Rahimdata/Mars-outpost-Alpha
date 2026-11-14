import type { CampaignSnapshot, CategoryResult, EndingId, EvaluationCategoryId, PerformanceLevel } from './endingTypes'

const CATEGORY_WEIGHTS: Record<EvaluationCategoryId, number> = {
  crew: 18,
  oxygen: 9,
  water: 8,
  food: 6,
  energy: 8,
  infrastructure: 10,
  maintenance: 6,
  radiation: 5,
  science: 7,
  research: 5,
  objectives: 8,
  decisions: 3,
  sustainability: 7,
}

function clamp(value: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, value))
}

function levelFor(score: number): PerformanceLevel {
  if (score >= 90) return 'Excellent'
  if (score >= 75) return 'Strong'
  if (score >= 60) return 'Stable'
  if (score >= 35) return 'Needs Improvement'
  return 'Critical'
}

function category(
  id: EvaluationCategoryId,
  title: string,
  score: number,
  explanation: string,
  evidence: string[],
  recommendation?: string,
): CategoryResult {
  const safeScore = Math.round(clamp(score))
  return {
    id,
    title,
    score: safeScore,
    level: levelFor(safeScore),
    explanation,
    evidence,
    ...(recommendation ? { recommendation } : {}),
  }
}

export function evaluateCampaign(snapshot: CampaignSnapshot) {
  const { survival, progress, colony, science } = snapshot
  const crew = Object.values(survival.crew)
  const averageWellness = crew.length
    ? crew.reduce((sum, person) => sum + person.wellness, 0) / crew.length
    : 0
  const averageMorale = crew.length
    ? crew.reduce((sum, person) => sum + person.morale, 0) / crew.length
    : 0
  const averageFatigue = crew.length
    ? crew.reduce((sum, person) => sum + person.fatigue, 0) / crew.length
    : 100

  const crewScore = clamp(averageWellness * 0.7 + averageMorale * 0.2 + (100 - averageFatigue) * 0.1)
  const resources = survival.resources
  const essentialMinimum = Math.min(resources.oxygen, resources.water, resources.food, resources.energy)
  const activeStructures = Object.values(survival.equipment)
  const averageEquipment = activeStructures.length
    ? activeStructures.reduce((sum, value) => sum + value, 0) / activeStructures.length
    : 0

  const unlockedScience = science.unlockedEntryIds.length
  const analyzedSamples = Object.values(science.sampleAnalyses)
    .filter((sample) => sample?.status === 'complete').length
  const objectiveScore = clamp(
    (survival.completedSols.length / 10) * 70 +
    (progress.roverTripComplete ? 10 : 0) +
    (progress.collectedSamples.length >= 2 ? 10 : progress.collectedSamples.length * 5) +
    (new Set(survival.maintenanceLog).size >= 3 ? 10 : 0),
  )

  const categories: CategoryResult[] = [
    category(
      'crew',
      'Crew survival and wellbeing',
      crewScore,
      'Based on the crew wellbeing, morale, and fatigue recorded in the campaign save.',
      [
        `Average wellbeing: ${Math.round(averageWellness)}%`,
        `Average morale: ${Math.round(averageMorale)}%`,
        `Average fatigue: ${Math.round(averageFatigue)}%`,
      ],
      averageWellness < 60 ? 'Prioritize shelter, rest, and life-support reliability.' : undefined,
    ),
    category('oxygen', 'Oxygen management', resources.oxygen,
      'Final oxygen reserve recorded by the survival system.',
      [`Final oxygen reserve: ${Math.round(resources.oxygen)}%`],
      resources.oxygen < 35 ? 'Improve habitat life support and protect the oxygen reserve.' : undefined),
    category('water', 'Water management', resources.water,
      'Final water reserve recorded by the survival system.',
      [`Final water reserve: ${Math.round(resources.water)}%`],
      resources.water < 35 ? 'Reduce water demand and improve recovery systems.' : undefined),
    category('food', 'Food sustainability', resources.food,
      'Final food reserve recorded by the survival system.',
      [`Final food reserve: ${Math.round(resources.food)}%`,
        `Crops currently growing: ${colony.crops.length}`],
      resources.food < 35 ? 'Maintain greenhouse systems and complete crop harvests.' : undefined),
    category('energy', 'Energy management', resources.energy,
      'Final energy reserve recorded by the survival system.',
      [`Final energy reserve: ${Math.round(resources.energy)}%`,
        `Solar array condition: ${Math.round(survival.equipment['solar-array'])}%`],
      resources.energy < 35 ? 'Maintain the solar array and battery storage.' : undefined),
    category('infrastructure', 'Colony infrastructure', averageEquipment,
      'Uses the recorded condition of installed colony equipment.',
      [
        `Average equipment condition: ${Math.round(averageEquipment)}%`,
        `Completed expansions: ${colony.expansions.length}`,
        `Building upgrade levels: ${Object.values(colony.upgrades).join(', ')}`,
      ],
      averageEquipment < 60 ? 'Repair critical systems before expanding the outpost.' : undefined),
    category('maintenance', 'Equipment maintenance',
      clamp(new Set(survival.maintenanceLog).size * 25),
      'Based on the number of distinct systems in the maintenance record.',
      [`Distinct systems maintained: ${new Set(survival.maintenanceLog).size}`],
      new Set(survival.maintenanceLog).size < 3 ? 'Record maintenance on more essential systems.' : undefined),
    category('radiation', 'Radiation protection', colony.radiationProtection,
      'Uses the colony radiation-protection value stored by the game.',
      [`Recorded protection: ${Math.round(colony.radiationProtection)}%`,
        `Regolith shield built: ${colony.expansions.includes('regolith-shield') ? 'Yes' : 'No'}`],
      colony.radiationProtection < 40 ? 'Build or improve habitat shielding.' : undefined),
    category('science', 'Scientific discoveries',
      clamp(unlockedScience * 15 + progress.collectedSamples.length * 8),
      'Based on unlocked science entries and collected samples recorded by the game.',
      [
        `Unlocked science entries: ${unlockedScience}`,
        `Samples collected: ${progress.collectedSamples.length}`,
        `Completed sample analyses: ${analyzedSamples}`,
      ],
      unlockedScience === 0 ? 'Scan, collect, and analyze geological samples.' : undefined),
    category('research', 'Research progress',
      clamp(survival.researchPoints * 10 + analyzedSamples * 15),
      'Based on saved research points and completed sample analyses.',
      [
        `Research points: ${survival.researchPoints.toFixed(1)}`,
        `Completed sample analyses: ${analyzedSamples}`,
      ],
      survival.researchPoints < 3 && analyzedSamples === 0 ? 'Use the laboratory to advance research.' : undefined),
    category('objectives', 'Mission objectives', objectiveScore,
      'Based on completed Sols and recorded campaign objectives.',
      [
        `Completed Sols: ${survival.completedSols.length}`,
        `Rover survey complete: ${progress.roverTripComplete ? 'Yes' : 'No'}`,
        `Samples collected: ${progress.collectedSamples.length}`,
      ],
      objectiveScore < 70 ? 'Complete campaign objectives and record the rover survey.' : undefined),
    category('decisions', 'Strategic decisions',
      survival.decisions.length ? 75 : 25,
      'Based on whether the campaign has a saved strategic decision.',
      [`Recorded strategic decisions: ${survival.decisions.length}`],
      survival.decisions.length === 0 ? 'Record a strategic priority in the campaign journal.' : undefined),
    category('sustainability', 'Colony sustainability',
      clamp((resources.oxygen + resources.water + resources.food + resources.energy) / 4 * 0.65 +
        averageEquipment * 0.2 + colony.radiationProtection * 0.15),
      'Balances final resource reserves, equipment condition, and radiation protection.',
      [
        `Lowest essential reserve: ${Math.round(essentialMinimum)}%`,
        `Average equipment condition: ${Math.round(averageEquipment)}%`,
        `Radiation protection: ${Math.round(colony.radiationProtection)}%`,
      ],
      essentialMinimum < 35 ? 'Stabilize the weakest life-support reserve before expansion.' : undefined),
  ]

  const totalWeight = categories.reduce((sum, item) => sum + CATEGORY_WEIGHTS[item.id], 0)
  const score = Math.round(categories.reduce(
    (sum, item) => sum + item.score * CATEGORY_WEIGHTS[item.id], 0,
  ) / totalWeight)

  const criticalFailures: string[] = []
  if (crew.length === 0 || averageWellness < 15) {
    criticalFailures.push('Crew wellbeing is at a critical level.')
  }
  if (resources.oxygen < 10) criticalFailures.push('Oxygen reserve is critically low.')
  if (resources.water < 10) criticalFailures.push('Water reserve is critically low.')
  if (survival.equipment.habitat < 20) criticalFailures.push('Habitat life-support condition is critical.')

  let ending: EndingId
  let endingReason: string

  if (criticalFailures.length > 0 || score < 45) {
    ending = 'lesson'
    endingReason = criticalFailures.length
      ? 'Critical crew or life-support conditions prevent a sustainable colony outcome.'
      : 'The overall campaign record shows major operational limitations.'
  } else if (
    score >= 78 &&
    averageWellness >= 65 &&
    essentialMinimum >= 40 &&
    survival.equipment.habitat >= 65 &&
    averageEquipment >= 65 &&
    colony.radiationProtection >= 40
  ) {
    ending = 'home'
    endingReason = 'Crew wellbeing, essential reserves, infrastructure, and protection all meet the sustainable-outpost thresholds.'
  } else {
    ending = 'foundation'
    endingReason = 'The crew completed meaningful work, but one or more sustainability thresholds remain below the long-term target.'
  }

  return {
    score,
    ending,
    endingReason,
    criticalFailures,
    categories,
    completedSols: [...survival.completedSols],
    evaluatedAt: new Date().toISOString(),
  }
}