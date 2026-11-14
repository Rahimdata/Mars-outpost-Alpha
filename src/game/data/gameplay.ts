import type { BuildingId } from './outpostBuildings'

export type InteriorBuildingId = Extract<BuildingId, 'habitat' | 'greenhouse' | 'laboratory'>

export type CrewId = 'ryan' | 'emma' | 'alex'
export type SampleId = 'fractured-basalt' | 'layered-outcrop' | 'iron-rich-regolith'

export type InteractionTarget =
  | { kind: 'building'; id: BuildingId }
  | { kind: 'crew'; id: CrewId }
  | { kind: 'sample'; id: SampleId }
  | { kind: 'interior-equipment'; id: 'life-support' | 'grow-lights' | 'lab-workbench' }
  | { kind: 'exterior-equipment'; id: 'communications' }
  | { kind: 'interior-exit' }
  | { kind: 'rover' }
  | { kind: 'rover-exit' }

export type MissionProgress = {
  talkedTo: CrewId[]
  acceptedTasks: CrewId[]
  inspected: string[]
  scannedSamples: SampleId[]
  collectedSamples: SampleId[]
  roverTripComplete: boolean
  journal: string[]
}

export const EMPTY_MISSION_PROGRESS: MissionProgress = {
  talkedTo: [],
  acceptedTasks: [],
  inspected: [],
  scannedSamples: [],
  collectedSamples: [],
  roverTripComplete: false,
  journal: [],
}

export const CREW = {
  ryan: {
    name: 'Ryan Cooper',
    role: 'ENGINEER',
    task: 'Inspect the habitat life-support console',
    dialogue: [
      'The pressure shell is holding. I am checking the power umbilical and keeping the air-recovery loop isolated until we finish the first inspection.',
      'Jack, take a look at the life-support console inside the habitat. I will trace the exterior service line and meet you back here.',
    ],
  },
  emma: {
    name: 'Dr. Emma Ross',
    role: 'PLANETARY GEOLOGIST',
    task: 'Scan and collect one surface sample',
    dialogue: [
      'The nearby outcrop has fractured volcanic rock beside finer wind-worked material. Those textures tell us where to direct the first field scan.',
      'Use the scanner at a marked point, then collect the sample if the site is stable. The readings here are a game simulation, not mission data.',
    ],
  },
  alex: {
    name: 'Alex Carter',
    role: 'MISSION SPECIALIST',
    task: 'Drive the rover to the survey beacon',
    dialogue: [
      'Comms check is clean inside the local link. The beacon gives us a safe first route marker beyond the habitat work zone.',
      'Take the six-wheel rover to the cyan survey beacon. I will monitor the route and keep the radio open.',
    ],
  },
} satisfies Record<CrewId, { name: string; role: string; task: string; dialogue: string[] }>

export const SAMPLES = {
  'fractured-basalt': {
    name: 'Fractured Basalt Outcrop',
    type: 'VOLCANIC ROCK',
    position: [38, -52] as const,
    description: 'Basalt is an igneous rock formed as lava cools. Basaltic compositions have been identified in Martian rocks; this outcrop and its scanner result are fictional.',
    relevance: 'Compare the fracture pattern with nearby blocks before selecting a return route.',
  },
  'layered-outcrop': {
    name: 'Layered Basin Edge',
    type: 'LAYERED ROCK',
    position: [-48, -42] as const,
    description: 'Layered rocks can record changes in how material was deposited. Layering alone does not prove that liquid water formed this fictional outcrop.',
    relevance: 'A first-pass texture record for the Sol 01 field log.',
  },
  'iron-rich-regolith': {
    name: 'Iron-Tinted Regolith',
    type: 'SURFACE MATERIAL',
    position: [58, 33] as const,
    description: 'Mars looks red in part because iron-bearing material has oxidized. The exact composition of this fictional sample is not measured by a real instrument.',
    relevance: 'Record surface color and grain texture for comparison with later samples.',
  },
} satisfies Record<SampleId, { name: string; type: string; position: readonly [number, number]; description: string; relevance: string }>

export const INTERIOR_EQUIPMENT = {
  'life-support': {
    name: 'Habitat Life-Support Console',
    purpose: 'Monitors cabin pressure, air circulation and water recovery.',
    status: 'Active · oxygen, air scrubbing, and water recovery are adjustable',
  },
  'grow-lights': {
    name: 'Greenhouse Environmental Panel',
    purpose: 'Coordinates grow lighting, water feed and environmental monitoring.',
    status: 'Active · environmental setpoints affect crop growth and reserves',
  },
  'lab-workbench': {
    name: 'Laboratory Analysis Bench',
    purpose: 'Provides a work surface for sample imaging and instrument checks.',
    status: 'Research equipment on standby',
  },
} satisfies Record<'life-support' | 'grow-lights' | 'lab-workbench', { name: string; purpose: string; status: string }>

export const EXTERIOR_EQUIPMENT = {
  communications: {
    name: 'Outpost Communications Mast',
    purpose: 'Maintains the local surface radio link and relays crew telemetry.',
    status: 'Local link active · Earth communication has a long delay',
  },
} satisfies Record<'communications', { name: string; purpose: string; status: string }>

export function interactionKey(target: InteractionTarget): string {
  return `${target.kind}:${'id' in target ? target.id : 'exit'}`
}
