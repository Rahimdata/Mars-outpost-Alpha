export type CrewIntroduction = {
  name: string
  role: string
  initials: string
  visual: 'commander' | 'engineer' | 'scientist' | 'specialist'
  description: string
  dialogue: string
}

export type IntroScene = {
  id: string
  label: string
  title: string
  paragraphs: string[]
  visual: 'journey' | 'mission' | 'crew' | 'approach' | 'descent' | 'surface'
  crew?: CrewIntroduction
}

export const crewIntroductions: CrewIntroduction[] = [
  {
    name: 'Jack Miller',
    role: 'Mission Commander',
    initials: 'JM',
    visual: 'commander',
    description: 'Short brown hair, calm expression, white suit with an orange commander stripe.',
    dialogue: 'We trained for this moment. Now it’s time to make every decision count.',
  },
  {
    name: 'Ryan Cooper',
    role: 'Mission Engineer',
    initials: 'RC',
    visual: 'engineer',
    description: 'Short hair, light stubble, white suit with an engineering tool belt.',
    dialogue: 'Keep the systems running, and we’ll have a chance to call this place home.',
  },
  {
    name: 'Dr. Emma Ross',
    role: 'Mission Scientist',
    initials: 'ER',
    visual: 'scientist',
    description: 'Tied-back hair, glasses, white suit with a science tablet and sample scanner.',
    dialogue: 'Mars has a history written in its rocks. I intend to understand it.',
  },
  {
    name: 'Alex Carter',
    role: 'Mission Specialist',
    initials: 'AC',
    visual: 'specialist',
    description: 'Energetic and friendly, in a white suit with communications equipment and headset.',
    dialogue: 'First mission rule: document everything. We don’t want to forget a single moment.',
  },
]

export const introScenes: IntroScene[] = [
  {
    id: 'journey',
    label: '01 / THE JOURNEY',
    title: 'Humanity’s next frontier',
    paragraphs: [
      'Humanity has always looked toward the stars.',
      'For generations, Mars was a distant dream. Now, that dream is becoming a mission.',
    ],
    visual: 'journey',
  },
  {
    id: 'mission',
    label: '02 / THE MISSION',
    title: 'The First Ten Sols',
    paragraphs: [
      'After years of preparation, the first crew of Outpost Alpha is approaching the Red Planet.',
      'Their mission is simple to describe, but difficult to accomplish: establish a research outpost, protect the crew, and learn how to survive.',
    ],
    visual: 'mission',
  },
  ...crewIntroductions.map((crew, index): IntroScene => ({
    id: `crew-${crew.visual}`,
    label: `0${index + 3} / THE CREW`,
    title: crew.name,
    paragraphs: [crew.description, `“${crew.dialogue}”`],
    visual: 'crew',
    crew,
  })),
  {
    id: 'approach',
    label: '07 / MARS APPROACH',
    title: 'Destination: Mars',
    paragraphs: [
      'After months of travel, the crew finally sees their destination.',
      'Below them lies an unfamiliar world of dust, ancient landscapes, and unanswered questions.',
    ],
    visual: 'approach',
  },
  {
    id: 'descent',
    label: '08 / ENTRY CHECK',
    title: 'Atmospheric entry',
    paragraphs: [
      'Jack: “All stations, report status.”',
      'Ryan: “Engineering systems are holding.”  Emma: “Atmospheric readings are coming in.”  Alex: “Communication is stable. Outpost Alpha, we’re almost there.”',
    ],
    visual: 'descent',
  },
  {
    id: 'surface',
    label: '09 / ARRIVAL',
    title: 'The first sight of home',
    paragraphs: [
      'Below the spacecraft lies the place where four explorers will begin a new chapter.',
      'An unfamiliar world. Limited resources. A future that depends on every decision.',
    ],
    visual: 'surface',
  },
]