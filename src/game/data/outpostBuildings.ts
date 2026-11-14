export type BuildingId =
  | 'habitat'
  | 'greenhouse'
  | 'laboratory'
  | 'solar-array'
  | 'battery-storage'
  | 'rover-garage'

export type BuildingStatus = 'operational' | 'standby' | 'not-activated'

export type BuildingInteraction = {
  id: string
  label: string
  detail: string
  status: 'available' | 'future'
  futurePart?: string
}

export type OutpostBuilding = {
  id: BuildingId
  name: string
  purpose: string
  description: string
  condition: string
  status: BuildingStatus
  x: number
  y: number
  rockyX?: number
  rockyY?: number
  interactions: BuildingInteraction[]
}

export const OUTPOST_BUILDINGS: OutpostBuilding[] = [
  {
    id: 'habitat',
    name: 'Habitat Module',
    purpose: 'Crew quarters and central operations',
    description:
      'A pressurized habitat module with an attached airlock, external service lines, observation ports, and a communications mast.',
    condition: 'Life-support controls active',
    status: 'operational',
    x: 525,
    y: 295,
    rockyX: 500,
    rockyY: 304,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Habitat',
        detail:
          'The pressure shell and airlock are ready. Oxygen production, air scrubbing, and water recovery are adjustable at the habitat console.',
        status: 'available',
      },
      {
        id: 'quarters',
        label: 'View Crew Quarters',
        detail:
          'Crew quarters connect to the shared life-support loop. Use the console inside to tune oxygen output, air scrubbing, and water recovery.',
        status: 'available',
      },
      {
        id: 'life-support',
        label: 'Life Support Interface',
        detail:
          'Adjust oxygen output, cabin air scrubbing, and water recovery from the habitat console. The settings affect crew wellness, energy draw, and survival reserves.',
        status: 'available',
      },
    ],
  },
  {
    id: 'greenhouse',
    name: 'Greenhouse',
    purpose: 'Controlled plant-growth research',
    description:
      'A framed, reinforced growing module with transparent panels, planting beds, and an exterior environmental-control unit.',
    condition: 'Environmental controls active',
    status: 'not-activated',
    x: 760,
    y: 220,
    rockyX: 770,
    rockyY: 196,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Greenhouse',
        detail:
          'Temperature, humidity, lighting, water feed, power allocation, and crop growth can be managed from the greenhouse panel.',
        status: 'available',
      },
      {
        id: 'growing-area',
        label: 'View Growing Area',
        detail:
          'Plant crops from the colony panel, then tune environmental controls here. Lighting, water, and power settings affect growth, reserves, and crop condition.',
        status: 'available',
      },
      {
        id: 'environmental-systems',
        label: 'Environmental Systems',
        detail:
          'Tune temperature, humidity, grow lighting, water feed, and power allocation. The settings directly affect greenhouse stability and crop growth.',
        status: 'available',
      },
    ],
  },
  {
    id: 'laboratory',
    name: 'Research Laboratory',
    purpose: 'Scientific analysis and sample storage',
    description:
      'A compact research module with external instrument housings, sample lockers, sensor equipment, and a protected work entrance.',
    condition: 'Installed; research equipment on standby',
    status: 'standby',
    x: 860,
    y: 350,
    rockyX: 885,
    rockyY: 330,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Laboratory',
        detail:
          'The exterior module is ready for inspection. Laboratory systems are on standby and no sample analysis is running.',
        status: 'available',
      },
      {
        id: 'equipment',
        label: 'View Research Equipment',
        detail:
          'Instrument housings and sensor mounts are present outside the lab. Science activities and analysis tools will be introduced with the campaign.',
        status: 'available',
      },
      {
        id: 'samples',
        label: 'View Sample Storage',
        detail:
          'The sample storage lockers are empty at campaign start. Geological collection and analysis are planned for later parts.',
        status: 'available',
      },
    ],
  },
  {
    id: 'solar-array',
    name: 'Solar Array',
    purpose: 'Outpost power-generation equipment',
    description:
      'Two dust-aware panel banks mounted on low supports, with visible service rails and cables routed toward the power equipment.',
    condition: 'Generation and distribution simulated',
    status: 'standby',
    x: 275,
    y: 225,
    rockyX: 240,
    rockyY: 220,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Solar Array',
        detail:
          'The panel banks generate power. Dust, storms, array condition, battery storage, and the output setting affect the energy reserve.',
        status: 'available',
      },
      {
        id: 'layout',
        label: 'View Panel Layout',
        detail:
          'Tune array output and adjust colony distribution priorities. Dust buildup can be cleared from the colony operations panel.',
        status: 'available',
      },
      {
        id: 'power-equipment',
        label: 'Power Equipment',
        detail:
          'Solar generation feeds the shared energy reserve. Set output and balance priority between life support, greenhouse, research, and battery charging.',
        status: 'available',
      },
    ],
  },
  {
    id: 'battery-storage',
    name: 'Battery Storage',
    purpose: 'Protected electrical storage',
    description:
      'An insulated technical enclosure with heat-management louvers, protected service panels, and armored power conduits.',
    condition: 'Installed; storage not simulated',
    status: 'standby',
    x: 410,
    y: 405,
    rockyX: 420,
    rockyY: 422,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Battery Storage',
        detail:
          'The enclosure and cooling louvers are in place. Charge level and battery cycling are not simulated yet.',
        status: 'available',
      },
      {
        id: 'storage-equipment',
        label: 'View Storage Equipment',
        detail:
          'The storage module is connected visually to the outpost power route. Battery reserves and charging behavior are planned for Part 5.',
        status: 'available',
      },
      {
        id: 'safety',
        label: 'View Safety Systems',
        detail:
          'Thermal monitoring and electrical safety controls are not active yet. Equipment condition and repair systems are planned for Part 8.',
        status: 'future',
        futurePart: 'PART 8',
      },
    ],
  },
  {
    id: 'rover-garage',
    name: 'Rover Garage',
    purpose: 'Vehicle storage and maintenance',
    description:
      'A reinforced vehicle bay with a wide access door, external tool racks, and a parked pressurized exploration rover.',
    condition: 'Garage installed; rover not yet deployable',
    status: 'operational',
    x: 700,
    y: 430,
    rockyX: 725,
    rockyY: 440,
    interactions: [
      {
        id: 'inspect',
        label: 'Inspect Rover Garage',
        detail:
          'The vehicle bay and equipment racks are ready for inspection. Garage repair and maintenance systems will be added later.',
        status: 'available',
      },
      {
        id: 'rover',
        label: 'View Rover',
        detail:
          'The rover is parked in its bay. It is not drivable in this part; rover operations and field missions are planned for Part 7.',
        status: 'available',
      },
      {
        id: 'maintenance',
        label: 'Maintenance Equipment',
        detail:
          'The garage contains a visible service area. Spare-parts inventory and repair interactions are planned for Part 8.',
        status: 'future',
        futurePart: 'PART 8',
      },
    ],
  },
]
