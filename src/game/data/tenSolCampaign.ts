export type CampaignSol = {
  sol: number
  title: string
  briefing: string
  objective: string
  supportingObjectives: string[]
  crewReport: string
  debrief: string
  nextRequirement: string
}

export const TEN_SOL_CAMPAIGN: CampaignSol[] = [
  {
    sol: 1,
    title: 'A World Without a Welcome',
    briefing: 'Touchdown is complete. Outpost Alpha is standing, but the first survey is still ahead.',
    objective: 'Complete the Sol 01 surface survey with the crew and rover.',
    supportingObjectives: ['Check the habitat life-support console', 'Log and collect a geological sample', 'Drive the rover to the survey beacon'],
    crewReport: 'Ryan checks the pressure shell, Emma begins a field log, and Alex watches the local radio link.',
    debrief: 'The crew has a first surface route and a baseline sample. The colony begins its first Sol with working systems and limited reserves.',
    nextRequirement: 'Reach the rover survey beacon.',
  },
  {
    sol: 2,
    title: 'The Breath of Life',
    briefing: 'The first habitat checks are in. Cabin support needs a full inspection before the crew relies on it.',
    objective: 'Inspect the life-support console and keep the habitat system above 60% condition.',
    supportingObjectives: ['Inspect the habitat interior', 'Repair the habitat system if its condition is low', 'Rest the crew if fatigue rises'],
    crewReport: 'Ryan asks for a careful pressure and air-loop inspection before he signs off on the habitat.',
    debrief: 'Life-support status has been recorded and the crew has a clearer recovery plan.',
    nextRequirement: 'Inspect life support; maintain habitat condition at 60% or higher.',
  },
  {
    sol: 3,
    title: 'Power Under Pressure',
    briefing: 'Solar generation and battery reserves now shape every choice about which systems can stay online.',
    objective: 'Inspect the solar array and battery storage while keeping energy reserves above 15%.',
    supportingObjectives: ['Check both power facilities', 'Repair worn power equipment', 'Monitor energy during surface work'],
    crewReport: 'Ryan traces the array cable; Alex reports a stable local link while the power check runs.',
    debrief: 'The power route and stored energy are now part of the operations log.',
    nextRequirement: 'Inspect solar and battery systems; retain at least 15% energy.',
  },
  {
    sol: 4,
    title: 'The Invisible Threat',
    briefing: 'A local dust-front warning is available immediately. An Earth reply takes time to travel, so the crew must use the local alert to protect itself while any request is in transit.',
    objective: 'Use the local storm warning and shelter inside a colony building during the dust storm.',
    supportingObjectives: ['Follow Alex’s immediate local storm warning', 'Shelter before the storm peak', 'Optionally request Earth guidance and review it when the delayed reply arrives'],
    crewReport: 'Alex’s local weather alert is immediate. Earth can add advice, but the radio signal cannot bring a real-time response; the crew must decide locally.',
    debrief: 'The crew recorded its first storm shelter period. Solar output and exposed equipment were checked afterward. Earth guidance, if requested, remained delayed during the immediate response.',
    nextRequirement: 'Shelter during a storm and record the event.',
  },
  {
    sol: 5,
    title: 'Growing Beyond Earth',
    briefing: 'The greenhouse can help stabilize food supplies, but only if its environmental equipment stays in good condition.',
    objective: 'Inspect and maintain the greenhouse; keep food reserves above 15%.',
    supportingObjectives: ['Check grow lighting and water feed', 'Repair greenhouse equipment when needed', 'Review the food reserve indicator'],
    crewReport: 'Emma asks for a stable growing environment before the crew counts on local food production.',
    debrief: 'Greenhouse output is now included in the colony’s food outlook.',
    nextRequirement: 'Inspect the greenhouse, keep it above 60% condition, and retain 15% food.',
  },
  {
    sol: 6,
    title: 'Beyond the Outpost',
    briefing: 'The first route is mapped. The next survey should extend the geological record beyond the habitat work zone.',
    objective: 'Collect at least two geological samples and complete a rover survey.',
    supportingObjectives: ['Scan distinct points of interest', 'Collect samples for the field locker', 'Use the rover to reach the survey beacon'],
    crewReport: 'Emma compares textures while Alex monitors the route and rover telemetry.',
    debrief: 'The expanded sample set gives the crew more context for future field work.',
    nextRequirement: 'Collect two samples and record a rover beacon visit.',
  },
  {
    sol: 7,
    title: 'The Repair Mission',
    briefing: 'Repeated surface work has worn several systems. Ryan needs time and energy to restore critical equipment. Review Curiosity RAD data and record a one-hour shelter or EVA plan.',
    objective: 'Maintain three different systems, then use the Journal to choose a one-hour radiation plan from Curiosity RAD data.',
    supportingObjectives: ['Inspect equipment condition', 'Prioritize habitat and power systems', 'Review the archived RAD reading and record shelter or EVA'],
    crewReport: 'Ryan recommends repairing the weakest systems first. Emma asks the team to compare the archived radiation measurement with the shelter trade-off before recording a plan.',
    debrief: 'Three systems have recorded maintenance, and the crew documented a radiation plan informed by Curiosity’s archived surface measurement. The simplified wellness outcome is a game rule, not a real dose estimate.',
    nextRequirement: 'Maintain at least three distinct systems and record a radiation plan in the Journal.',
  },
  {
    sol: 8,
    title: 'A Sustainable Future',
    briefing: 'The outpost must balance daily consumption, greenhouse production, solar generation, and crew recovery.',
    objective: 'End the Sol with resources above 20% and average crew wellness above 40%.',
    supportingObjectives: ['Repair systems that affect production', 'Rest the crew in the habitat', 'Avoid prolonged exposure during storms'],
    crewReport: 'Emma and Ryan agree: the colony needs reliable routines as much as new discoveries.',
    debrief: 'The colony’s reserves and crew condition show whether the current systems can support longer operations.',
    nextRequirement: 'Keep every primary resource above 20% and average wellness above 40%.',
  },
  {
    sol: 9,
    title: 'Mission Critical',
    briefing: 'The next operational plan will set the final Sol’s priorities. Choose how to use the remaining margin.',
    objective: 'Choose one final campaign priority based on the colony’s condition. Open the Journal (J) to record your choice.',
    supportingObjectives: ['Review the journal and resource status', 'Compare crew, research, and infrastructure needs', 'Record one campaign decision'],
    crewReport: 'Each crew member has a recommendation shaped by their assignment and the current outpost state.',
    debrief: 'The final priority is on record and will influence the campaign outcome together with the colony’s condition.',
    nextRequirement: 'Record a campaign priority.',
  },
  {
    sol: 10,
    title: 'The Future of Mars',
    briefing: 'Ten Sols have brought the crew from first arrival to a real decision about what Outpost Alpha can become.',
    objective: 'Review the campaign record and complete the final assessment.',
    supportingObjectives: ['Review resources and crew condition', 'Review repairs and discoveries', 'Resolve the campaign ending from the record'],
    crewReport: 'Jack’s final assessment reflects the crew’s work, the systems they kept running, and what they learned.',
    debrief: 'The ten-Sol record is complete. The ending follows the decisions made and the condition of the outpost.',
    nextRequirement: 'Complete the final campaign assessment.',
  },
]

export const CAMPAIGN_ENDINGS = {
  home: {
    title: 'A Home on Mars',
    text: 'The crew leaves Outpost Alpha with stable supplies, working systems, and a research record strong enough to support a lasting settlement.',
  },
  foundation: {
    title: 'The Foundation',
    text: 'The outpost is not ready to stand alone, but its repairs, field records, and crew routines give the next mission a practical foundation.',
  },
  lesson: {
    title: 'The Lesson That Remains',
    text: 'The crew returns with hard-won knowledge about what the outpost could not sustain. Their record gives the next attempt a better chance.',
  },
} as const

export const FINAL_CAMPAIGN_LINE = "The future isn't something we wait for. It's something we build."
