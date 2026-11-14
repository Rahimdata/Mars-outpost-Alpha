export type LandingSiteId = 'open-plain' | 'rocky-basin'

export type LandingSiteData = {
  id: LandingSiteId
  designation: string
  name: string
  environment: string
  advantages: string[]
  challenges: string[]
  constructionDifficulty: 'low' | 'moderate'
  explorationDifficulty: 'low' | 'moderate'
  geologicalResearchOpportunity: 'standard' | 'enhanced'
  initialPreparation: 'lower' | 'higher'
  briefing: string
  crewReactions: {
    jack: string
    ryan: string
    emma: string
    alex: string
  }
}

export const LANDING_SITES: Record<LandingSiteId, LandingSiteData> = {
  'open-plain': {
    id: 'open-plain',
    designation: 'ALPHA-01',
    name: 'Open Plain',
    environment: 'Wide, relatively flat terrain with fine surface dust and an open horizon.',
    advantages: [
      'Simpler initial habitat placement',
      'Straighter rover routes and broad visibility',
      'More room to plan future solar arrays',
    ],
    challenges: [
      'Less natural terrain shielding',
      'More exposure to dust and surface conditions',
      'Fewer nearby rocky features for early study',
    ],
    constructionDifficulty: 'low',
    explorationDifficulty: 'low',
    geologicalResearchOpportunity: 'standard',
    initialPreparation: 'lower',
    briefing:
      'A practical location for getting the first habitat systems established. The crew will have clear routes and room to work, while planning protection from the exposed environment.',
    crewReactions: {
      jack: 'An open approach. We’ll have room to establish the outpost and organize our operations.',
      ryan: 'That should simplify our initial setup. I’ll begin assessing the habitat placement.',
      emma: 'We may have fewer geological features nearby, but there’s still plenty to study.',
      alex: 'Clear routes and a wide horizon. I’ll start planning our first rover survey.',
    },
  },

  'rocky-basin': {
    id: 'rocky-basin',
    designation: 'ALPHA-02',
    name: 'Rocky Basin',
    environment: 'Uneven ground with visible rock formations and varied terrain.',
    advantages: [
      'Nearby formations offer stronger early geology opportunities',
      'Terrain may offer options for carefully planned shielding',
      'A strong starting point for geological fieldwork',
    ],
    challenges: [
      'Habitat placement needs more inspection',
      'Rover routes are less straightforward',
      'Site preparation takes more care',
    ],
    constructionDifficulty: 'moderate',
    explorationDifficulty: 'moderate',
    geologicalResearchOpportunity: 'enhanced',
    initialPreparation: 'higher',
    briefing:
      'A more demanding site to prepare, with geological features close to the outpost. The crew can pursue more early research, but will need to inspect the terrain and plan routes carefully.',
    crewReactions: {
      jack: 'This terrain will demand careful planning. Let’s make sure our decision pays off.',
      ryan: 'Uneven ground means more preparation. I’ll inspect the area before we place the habitat.',
      emma: 'Those geological formations could provide valuable clues about Mars’s ancient environment.',
      alex: 'Exploration routes will need more planning. I’ll map the accessible terrain.',
    },
  },
}