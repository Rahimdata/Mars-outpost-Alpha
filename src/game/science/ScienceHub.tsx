import { useEffect, useMemo, useRef, useState } from 'react'
import type { SampleId } from '../../game/data/gameplay'
import { SCIENCE_CATEGORIES, SCIENCE_ENTRIES } from '../../game/science/scienceDatabase'
import { SCIENCE_CHALLENGES } from '../../game/science/scienceChallenges'
import {
  advanceSampleAnalyses,
  completeScienceChallenge,
  markScienceEntryRead,
  readScienceProgress,
  startSampleAnalysis,
  syncCollectedSamples,
  unlockScienceEntries,
  ANALYSIS_DURATION_GAME_MINUTES,
  ANALYSIS_ENERGY_COST_PERCENT,
  SCIENCE_SAVE_KEY,
} from './scienceProgress'
import type { ScienceCategoryId, ScienceFlag, ScienceProgress, ScienceSignals } from '../../game/science/types'
import './ScienceHub.css'


export type ScienceHubProps = {
  open: boolean
  onClose: () => void
  sol: number
  gameMinute: number
  atResearchLab: boolean
  collectedSampleIds: readonly SampleId[]
  scannedSampleIds: readonly SampleId[]
  flags?: Partial<Record<ScienceFlag, boolean>>
  energyPercent: number
  onConsumeEnergy: (amountPercent: number) => boolean
  onJournalRecord?: (text: string) => void
}

type TabId = 'database' | 'samples' | 'challenges' | 'journal' | 'debrief'

const SOL_DEBRIEFS: Record<number, { title: string; concept: string; colonyLink: string; assumption: string }> = {
  1: {
    title: 'Reading the First Rocks',
    concept: 'A rock’s texture and mineral clues help scientists reconstruct how it formed. A scan is evidence to evaluate, not a complete answer.',
    colonyLink: 'A well-documented geological sample can guide where the rover explores next.',
    assumption: 'Outpost Alpha’s sample readings and locations are fictional.',
  },
  2: {
    title: 'Air, Pressure, and Life Support',
    concept: 'Mars has a thin, mostly carbon-dioxide atmosphere. People need a controlled environment and a suitable breathing supply.',
    colonyLink: 'Life-support condition and stored resources are linked in the game’s simplified colony model.',
    assumption: 'Game oxygen and pressure mechanics are not engineering specifications.',
  },
  3: {
    title: 'Power Is Part of Every Experiment',
    concept: 'Solar generation, storage, dust, and equipment demand must be considered together.',
    colonyLink: 'A power shortfall can limit optional research and greenhouse operation.',
    assumption: 'The resource rates are balancing values created for gameplay.',
  },
  4: {
    title: 'Dust Changes Surface Operations',
    concept: 'Dust storms can obscure observations and reduce sunlight reaching solar-powered equipment.',
    colonyLink: 'The outpost can shelter and maintain its array after the scripted storm.',
    assumption: 'The storm schedule and its magnitude are fictional.',
  },
  5: {
    title: 'Growing Food Takes a System',
    concept: 'Plants require managed light, water, and environmental conditions. A greenhouse also consumes power and needs maintenance.',
    colonyLink: 'Harvested game crops enter the shared crew food reserve.',
    assumption: 'Crop names, growth rates, and yields are illustrative, not agronomic predictions.',
  },
  6: {
    title: 'A Sample Needs Its Context',
    concept: 'A sample is more useful when its collection location, surrounding geology, and instrument method are recorded.',
    colonyLink: 'The Research Laboratory unlocks fictional analysis records for samples already collected by the player.',
    assumption: 'The results are educational examples, not measurements from Mars.',
  },
  7: {
    title: 'Maintenance Protects Data and Hardware',
    concept: 'Exploration systems need inspection and service. A degraded instrument can reduce the quality or availability of work.',
    colonyLink: 'The colony maintenance and materials systems connect engineering effort to scientific uptime.',
    assumption: 'Repair costs and condition changes are simplified game values.',
  },
  8: {
    title: 'Sustainability Is a Balance',
    concept: 'Food, water, energy, crew time, and equipment condition are interdependent.',
    colonyLink: 'The colony overview can help explain the trade-offs behind a greenhouse or power upgrade.',
    assumption: 'The game does not simulate a complete closed-loop life-support system.',
  },
  9: {
    title: 'Evidence Guides Mission Priorities',
    concept: 'Scientific goals compete for time and resources, so teams choose targets based on expected information and mission needs.',
    colonyLink: 'Your discoveries and colony condition contribute to the campaign record.',
    assumption: 'The game’s final campaign logic is narrative gameplay, not a mission-planning model.',
  },
  10: {
    title: 'The Scientific Record',
    concept: 'Careful observations, samples, analysis, and uncertainty notes form a durable record for future missions.',
    colonyLink: 'The science journal preserves discoveries and analysis for the final assessment.',
    assumption: 'No discovery in Outpost Alpha is a real-world finding about Mars.',
  },
}

const tabs: Array<{ id: TabId; label: string }> = [
  { id: 'database', label: 'Lessons' },
  { id: 'samples', label: 'Samples' },
  { id: 'challenges', label: 'Challenges' },
  { id: 'journal', label: 'Mission log' },
  { id: 'debrief', label: 'Sol briefing' },
]

export default function ScienceHub({
  open,
  onClose,
  sol,
  gameMinute,
  atResearchLab,
  collectedSampleIds,
  scannedSampleIds,
  flags = {},
  energyPercent,
  onConsumeEnergy,
  onJournalRecord,
}: ScienceHubProps) {
  const [progress, setProgress] = useState<ScienceProgress>(readScienceProgress)
  const [tab, setTab] = useState<TabId>('database')
  const [category, setCategory] = useState<ScienceCategoryId | 'all'>('all')
  const [search, setSearch] = useState('')
  const [selectedEntryId, setSelectedEntryId] = useState<string | null>(null)
  const [selectedChallengeId, setSelectedChallengeId] = useState(SCIENCE_CHALLENGES[0]?.id ?? '')
  const [feedback, setFeedback] = useState('')
  const [lastUnlock, setLastUnlock] = useState('')
  const previousLogIds = useRef<Set<string> | null>(null)

  const analyzedSampleIds = useMemo(
    () => Object.values(progress.sampleAnalyses)
      .filter((record) => record?.status === 'complete')
      .map((record) => record!.sampleId),
    [progress.sampleAnalyses],
  )

  const signals: ScienceSignals = useMemo(() => ({
    scannedSampleIds: [...scannedSampleIds],
    collectedSampleIds: [...collectedSampleIds],
    analyzedSampleIds,
    completedChallengeIds: progress.completedChallengeIds,
    flags,
  }), [scannedSampleIds, collectedSampleIds, analyzedSampleIds, progress.completedChallengeIds, flags])

  useEffect(() => {
    try {
      localStorage.setItem(SCIENCE_SAVE_KEY, JSON.stringify(progress))
    } catch {
      // Keep the current session usable when browser storage is unavailable.
    }
  }, [progress])

  useEffect(() => {
    setProgress((current) => syncCollectedSamples(current, collectedSampleIds, sol))
  }, [collectedSampleIds, sol])

  useEffect(() => {
    if (!Number.isFinite(gameMinute)) return
    setProgress((current) => advanceSampleAnalyses(current, gameMinute, sol))
  }, [gameMinute, sol])

  useEffect(() => {
    setProgress((current) => {
      const result = unlockScienceEntries(current, signals, sol)
      if (result.newEntries.length > 0) {
        setLastUnlock(result.newEntries.map((entry) => entry.title).join(' · '))
      }
      return result.progress
    })
  }, [signals, sol])

  useEffect(() => {
    if (!onJournalRecord) return
    if (previousLogIds.current === null) {
      previousLogIds.current = new Set(progress.researchLog.map((record) => record.id))
      return
    }
    for (const record of progress.researchLog) {
      if (previousLogIds.current.has(record.id)) continue
      previousLogIds.current.add(record.id)
      onJournalRecord(`Sol ${String(record.sol).padStart(2, '0')} · ${record.title}: ${record.text}`)
    }
  }, [progress.researchLog, onJournalRecord])

  const unlockedEntries = useMemo(
    () => new Set(progress.unlockedEntryIds),
    [progress.unlockedEntryIds],
  )

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return SCIENCE_ENTRIES.filter((entry) => {
      if (category !== 'all' && entry.category !== category) return false
      if (!query) return true
      return `${entry.title} ${entry.summary} ${entry.explanation} ${entry.facts.join(' ')}`.toLowerCase().includes(query)
    })
  }, [category, search])

  const selectedEntry = SCIENCE_ENTRIES.find((entry) => entry.id === selectedEntryId)
  const selectedChallenge = SCIENCE_CHALLENGES.find((challenge) => challenge.id === selectedChallengeId)

  if (!open) return null

  function updateProgress(transform: (current: ScienceProgress) => ScienceProgress) {
    setProgress(transform)
  }

  function startAnalysis(sampleId: SampleId) {
    const result = startSampleAnalysis(progress, sampleId, sol, gameMinute, atResearchLab, energyPercent)
    if (!result.ok) {
      setFeedback(result.message)
      return
    }
    if (!onConsumeEnergy(ANALYSIS_ENERGY_COST_PERCENT)) {
      setFeedback('Analysis paused · the game resource handler could not reserve laboratory energy.')
      return
    }
    updateProgress(() => result.progress)
    setFeedback(result.message)
  }

  function answerChallenge(optionIndex: number) {
    if (!selectedChallenge) return
    if (optionIndex !== selectedChallenge.correctOption) {
      setFeedback(`Not quite. Hint: ${selectedChallenge.hint}`)
      return
    }
    updateProgress((current) => {
      const completed = completeScienceChallenge(current, selectedChallenge.id, sol, selectedChallenge.title)
      const result = unlockScienceEntries(completed, {
        ...signals,
        completedChallengeIds: completed.completedChallengeIds,
      }, sol)
      if (result.newEntries.length > 0) {
        setLastUnlock(result.newEntries.map((entry) => entry.title).join(' · '))
      }
      return result.progress
    })
    setFeedback(selectedChallenge.explanation)
  }

  function openEntry(entryId: string) {
    if (!unlockedEntries.has(entryId)) return
    setSelectedEntryId(entryId)
    setFeedback('')
    updateProgress((current) => markScienceEntryRead(current, entryId))
  }

  const completeCount = progress.unlockedEntryIds.length
  const analyzedCount = analyzedSampleIds.length

  return (
    <div className="science-hub-backdrop" role="presentation" onPointerDown={(event) => {
      event.stopPropagation()
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="science-hub" role="dialog" aria-modal="true" aria-label="Mars Learning Center">
        <header className="science-hub__header">
          <div>
            <small>OUTPOST ALPHA · LEARNING CENTER</small>
            <h2>Mars Learning Center</h2>
            <p>Learn about Mars through short lessons, field samples, and mission activities. Outpost readings and sample locations are fictional.</p>
          </div>
          <button type="button" className="science-hub__close" onClick={onClose}>Close ×</button>
        </header>

        <div className="science-hub__status">
          <span>LESSONS <b>{completeCount}/{SCIENCE_ENTRIES.length}</b></span>
          <span>SAMPLES <b>{analyzedCount}/{collectedSampleIds.length}</b></span>
          <span>ACTIVITIES <b>{progress.completedChallengeIds.length}/{SCIENCE_CHALLENGES.length}</b></span>
          <span>SOL <b>{String(sol).padStart(2, '0')}</b></span>
        </div>

        {lastUnlock && <div className="science-hub__notification" role="status">
          <strong>NEW LESSON UNLOCKED</strong><span>{lastUnlock}</span>
          <button type="button" onClick={() => setLastUnlock('')}>Dismiss</button>
        </div>}
        {feedback && <p className="science-hub__feedback" role="status">{feedback}</p>}

        <nav className="science-hub__tabs" aria-label="Learning Center sections">
          {tabs.map((item) => <button type="button" key={item.id} aria-pressed={tab === item.id} onClick={() => { setTab(item.id); setFeedback('') }}>{item.label}</button>)}
        </nav>

        {tab === 'database' && <div className="science-hub__database">
          <aside className="science-hub__filters">
            <label>Search the field guide<input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Try water, dust, or rocks" /></label>
            <label>Choose a topic<select className="science-hub__category-select" value={category} onChange={(event) => setCategory(event.target.value as ScienceCategoryId | 'all')}>
              <option value="all">All topics · {SCIENCE_ENTRIES.length}</option>
              {SCIENCE_CATEGORIES.map((item) => {
                const count = SCIENCE_ENTRIES.filter((entry) => entry.category === item.id).length
                const unlocked = SCIENCE_ENTRIES.filter((entry) => entry.category === item.id && unlockedEntries.has(entry.id)).length
                return <option key={item.id} value={item.id}>{item.label} · {unlocked}/{count} unlocked</option>
              })}
            </select></label>
            <p className="science-hub__filter-note">Every lesson is listed. Explore the outpost to unlock full details.</p>
          </aside>
          <div className="science-hub__entry-list" aria-label="Mars learning topics">
            {visibleEntries.map((entry) => {
              const unlocked = unlockedEntries.has(entry.id)
              const read = progress.readEntryIds.includes(entry.id)
              return <button type="button" key={entry.id} className="science-hub__entry" aria-pressed={selectedEntryId === entry.id} disabled={!unlocked} onClick={() => openEntry(entry.id)}>
                <span className="science-hub__entry-status">{unlocked ? read ? 'READ' : 'NEW' : 'LOCKED'}</span>
                <strong>{entry.title}</strong>
                <small>{entry.summary}</small>
              </button>
            })}
            {visibleEntries.length === 0 && <p>No records match this search.</p>}
          </div>
          <article className="science-hub__entry-detail">
            {selectedEntry && unlockedEntries.has(selectedEntry.id) ? <>
              <small>{SCIENCE_CATEGORIES.find((item) => item.id === selectedEntry.category)?.label}</small>
              <h3>{selectedEntry.title}</h3>
              <p>{selectedEntry.explanation}</p>
              <h4>Key facts</h4>
              <ul>{selectedEntry.facts.map((fact) => <li key={fact}>{fact}</li>)}</ul>
              <h4>Why it matters</h4><p>{selectedEntry.relevance}</p>
              <h4>In Outpost Alpha</h4><p>{selectedEntry.gameConnection}</p>
              <div className="science-hub__diagram"><strong>{selectedEntry.diagram.label}</strong><ol>{selectedEntry.diagram.steps.map((step) => <li key={step}>{step}</li>)}</ol></div>
              <h4>Sources</h4>
              <ul className="science-hub__sources">{selectedEntry.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.organization} · {source.title}</a></li>)}</ul>
            </> : selectedEntry ? <div className="science-hub__empty"><span>LESSON LOCKED</span><h3>{selectedEntry.title}</h3><p>{selectedEntry.summary}</p><p>Explore the surface, analyze a sample, inspect an outpost system, or complete a learning challenge to unlock the full lesson.</p></div> : <div className="science-hub__empty"><span>MARS LEARNING CENTER</span><h3>Choose a topic</h3><p>Browse Mars topics and mission lessons. Explore the surface, analyze samples, inspect outpost systems, and complete challenges to unlock full lessons.</p></div>}
          </article>
        </div>}

        {tab === 'samples' && <section className="science-hub__section">
          <div className="science-hub__section-heading"><small>RESEARCH LABORATORY</small><h3>Field Samples</h3>
            <p>{atResearchLab ? 'Laboratory access confirmed. Analysis takes 45 game minutes and 5% colony energy.' : 'You can review the field locker anywhere. Start or review analysis inside the Research Laboratory.'}</p>
          </div>
          {collectedSampleIds.length === 0 ? <p className="science-hub__empty-copy">No samples have been collected yet. Scan and collect a geology sample on the Mars surface.</p> : <div className="science-hub__sample-grid">
            {collectedSampleIds.map((sampleId) => {
              const record = progress.sampleAnalyses[sampleId]
              if (!record) return null
              const remaining = Math.max(0, (record.completesAtGameMinute ?? gameMinute) - gameMinute)
              return <article className="science-hub__sample" key={sampleId}>
                <small>{record.status.replace('-', ' ').toUpperCase()} · COLLECTED SOL {String(record.collectionSol).padStart(2, '0')}</small>
                <h4>{record.sampleName}</h4>
                <p>{record.collectionLocation}</p>
                {record.status === 'in-progress' && <div className="science-hub__progress"><span style={{ width: `${Math.max(0, Math.min(100, 100 - remaining / ANALYSIS_DURATION_GAME_MINUTES * 100))}%` }} /></div>}
                {record.status === 'complete' && <div className="science-hub__result"><strong>ANALYSIS RESULT</strong><p>{record.result}</p><small>Related database entry: {record.relatedEntryId}</small></div>}
                {record.status === 'collected' && <button type="button" disabled={!atResearchLab || energyPercent < ANALYSIS_ENERGY_COST_PERCENT} onClick={() => startAnalysis(sampleId)}>{atResearchLab ? 'Start analysis · 5% energy' : 'Go to Research Laboratory'}</button>}
                {record.status === 'in-progress' && <p>Analysis in progress · approximately {Math.ceil(remaining)} game minutes remain.</p>}
              </article>
            })}
          </div>}
        </section>}

        {tab === 'challenges' && <section className="science-hub__section science-hub__challenge-layout">
          <aside className="science-hub__challenge-list">
            <small>OPTIONAL LEARNING CHALLENGES</small>
            {SCIENCE_CHALLENGES.map((challenge) => <button type="button" key={challenge.id} aria-pressed={challenge.id === selectedChallengeId} onClick={() => { setSelectedChallengeId(challenge.id); setFeedback('') }}>
              <strong>{challenge.title}</strong><small>{progress.completedChallengeIds.includes(challenge.id) ? 'COMPLETE' : SCIENCE_CATEGORIES.find((item) => item.id === challenge.category)?.label}</small>
            </button>)}
          </aside>
          {selectedChallenge && <article className="science-hub__challenge">
            <small>{SCIENCE_CATEGORIES.find((item) => item.id === selectedChallenge.category)?.label} · LEARNING OBJECTIVE</small>
            <h3>{selectedChallenge.title}</h3>
            <p>{selectedChallenge.scenario}</p>
            <div className="science-hub__diagram"><strong>{selectedChallenge.learningObjective}</strong><p>{selectedChallenge.question}</p></div>
            <div className="science-hub__answers">{selectedChallenge.options.map((option, index) => <button type="button" key={option} disabled={progress.completedChallengeIds.includes(selectedChallenge.id)} onClick={() => answerChallenge(index)}>{String.fromCharCode(65 + index)} · {option}</button>)}</div>
            {progress.completedChallengeIds.includes(selectedChallenge.id) && <p className="science-hub__feedback">Challenge complete · no survival resources were changed.</p>}
          </article>}
        </section>}

        {tab === 'journal' && <section className="science-hub__section">
          <div className="science-hub__section-heading"><small>PERSISTENT RESEARCH LOG</small><h3>Mission Science Record</h3><p>Discovery, sample, analysis, and challenge records are stored separately from the survival save.</p></div>
          {progress.researchLog.length ? <ol className="science-hub__log">{progress.researchLog.slice().reverse().map((record) => <li key={record.id}><small>SOL {String(record.sol).padStart(2, '0')} · {record.kind.replaceAll('-', ' ').toUpperCase()}</small><strong>{record.title}</strong><span>{record.text}</span></li>)}</ol> : <p className="science-hub__empty-copy">No mission learning records yet. Discover a topic or complete an activity to begin your log.</p>}
        </section>}

        {tab === 'debrief' && <section className="science-hub__section science-hub__debrief">
          <small>EDUCATIONAL SOL BRIEFING · SOL {String(sol).padStart(2, '0')}</small>
          <h3>{SOL_DEBRIEFS[Math.max(1, Math.min(10, sol))].title}</h3>
          <div><strong>Mars concept</strong><p>{SOL_DEBRIEFS[Math.max(1, Math.min(10, sol))].concept}</p></div>
          <div><strong>Colony connection</strong><p>{SOL_DEBRIEFS[Math.max(1, Math.min(10, sol))].colonyLink}</p></div>
          <div><strong>Game assumption</strong><p>{SOL_DEBRIEFS[Math.max(1, Math.min(10, sol))].assumption}</p></div>
          <p className="science-hub__footnote">This is a short learning summary, not a replacement for mission data or scientific publications.</p>
        </section>}
      </section>
    </div>
  )
}
