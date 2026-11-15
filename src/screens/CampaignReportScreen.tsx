import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { TEN_SOL_CAMPAIGN } from '../game/data/tenSolCampaign'
import type { LandingSiteId } from '../game/data/landingSites'
import { SAMPLES } from '../game/data/gameplay'
import { SCIENCE_CATEGORIES, SCIENCE_ENTRIES } from '../game/science/scienceDatabase'
import { SCIENCE_CHALLENGES } from '../game/science/scienceChallenges'
import type { ScienceProgress } from '../game/science/types'
import type { CampaignDecision, EndingId, SurvivalState } from '../game/state/survivalState'
import type { ColonyState } from '../game/state/colonyState'
import type { MissionProgress } from '../game/data/gameplay'
import type { MissionReportData, ReportVital, SolReportSnapshot } from '../game/campaign/missionReport'
import { MISSION_RANK_THRESHOLDS, MISSION_SCORE_WEIGHTS } from '../game/campaign/missionReport'
import './CampaignReportScreen.css'

type ReportProps = {
  report: MissionReportData
  survival: SurvivalState
  colony: ColonyState
  progress: MissionProgress
  science: ScienceProgress
  siteId: LandingSiteId
  ending: EndingId | null
  failureReasons: string[]
  failureSolutions: string[]
  onClose: () => void
  onPlayAgain: () => void
  onViewScience: () => void
}

const achievementInfo = [
  ['first-sol', 'First Footprints', 'Completed the first Sol', '◉'],
  ['field-scientist', 'Field Scientist', 'Collected three samples', '⌖'],
  ['lab-researcher', 'Lab Researcher', 'Completed a sample analysis', '⌬'],
  ['archive-builder', 'Archive Builder', 'Unlocked ten science records', '▤'],
  ['challenge-scholar', 'Challenge Scholar', 'Completed three learning challenges', '✧'],
  ['rover-pioneer', 'Routefinder', 'Reached the rover survey beacon', '⌁'],
  ['storm-survivor', 'Storm Protocol', 'Sheltered during a dust front', '⟡'],
  ['ten-sols', 'Ten Sols', 'Recorded the final Sol', '✦'],
] as const

function average(values: number[]) { return values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0 }
function clamp(value: number) { return Math.max(0, Math.min(100, value)) }
function formatDuration(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor(total % 3600 / 60)
  return hours ? `${hours}h ${minutes}m` : `${minutes}m ${total % 60}s`
}
function formatGameClock(minute?: number) {
  if (!Number.isFinite(minute)) return 'time not recorded'
  const value = Math.max(0, Math.floor(minute!))
  return `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`
}
function deltaAt(snapshots: SolReportSnapshot[], index: number, id: 'distanceWalked' | 'distanceRover') {
  if (index === 0) return snapshots[index].sol === 1 ? snapshots[index][id] : null
  if (snapshots[index - 1].sol !== snapshots[index].sol - 1) return null
  return Math.max(0, snapshots[index][id] - snapshots[index - 1][id])
}

function consecutiveSnapshotGroups(snapshots: SolReportSnapshot[]) {
  const groups: SolReportSnapshot[][] = []
  for (const snapshot of snapshots) {
    const current = groups[groups.length - 1]
    if (!current || current[current.length - 1].sol !== snapshot.sol - 1) groups.push([snapshot])
    else current.push(snapshot)
  }
  return groups
}

function useCountUp(target: number) {
  const [value, setValue] = useState(0)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setValue(target); return }
    let frame = 0
    let start: number | null = null
    const animate = (now: number) => {
      start ??= now
      const progress = Math.min(1, (now - start) / 900)
      setValue(Math.round(target * (1 - (1 - progress) ** 3)))
      if (progress < 1) frame = requestAnimationFrame(animate)
    }
    frame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frame)
  }, [target])
  return value
}

function AnimatedValue({ value, suffix = '' }: { value: number; suffix?: string }) {
  return <>{useCountUp(value).toLocaleString()}{suffix}</>
}

function PerformanceChart({ scores }: { scores: Array<{ id: string; label: string; score: number; weight: number }> }) {
  return <div className="mission-report-performance">{scores.map((item) => <div className="mission-report-performance__row" key={item.id}>
    <div><span>{item.label}</span><b>{item.score}<small>/100</small></b></div>
    <div className="mission-report-bar"><i style={{ '--bar-value': `${item.score}%`, '--bar-delay': `${scores.indexOf(item) * 90}ms` } as CSSProperties} /></div>
  </div>)}</div>
}

function VitalsChart({ snapshots, lows }: { snapshots: SolReportSnapshot[]; lows: MissionReportData['lowest'] }) {
  const width = 900, height = 300, left = 48, right = 20, top = 18, bottom = 38
  const plotWidth = width - left - right, plotHeight = height - top - bottom
  const x = (sol: number) => left + ((sol - 1) / 9) * plotWidth
  const y = (value: number) => top + plotHeight - (clamp(value) / 100) * plotHeight
  const series: Array<{ id: ReportVital; label: string; color: string; dash?: string }> = [
    { id: 'o2', label: 'O₂', color: '#5eead4' },
    { id: 'h2o', label: 'H₂O', color: '#60a5fa', dash: '8 4' },
    { id: 'food', label: 'Food', color: '#fbbf24', dash: '3 4' },
    { id: 'pwr', label: 'Power', color: '#c4b5fd', dash: '12 4' },
  ]
  const segments = consecutiveSnapshotGroups(snapshots).filter((group) => group.length > 1)
  return <div className="mission-report-chart-scroll"><svg className="mission-report-vitals-chart" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Recorded colony vitals by Sol">
    {[0, 25, 50, 75, 100].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} className="mission-report-gridline" /><text x={left - 10} y={y(value) + 4} textAnchor="end" className="mission-report-axis-label">{value}%</text></g>)}
    {snapshots.filter((item) => item.dustFront).map((item) => <rect key={`storm-${item.sol}`} x={x(item.sol) - plotWidth / 18} y={top} width={plotWidth / 9} height={plotHeight} className="mission-report-storm-band"><title>Dust front · Sol {item.sol}</title></rect>)}
    {series.flatMap((item) => segments.map((group, index) => <polyline key={`${item.id}-${index}`} points={group.map((snapshot) => `${x(snapshot.sol)},${y(snapshot[item.id])}`).join(' ')} fill="none" stroke={item.color} strokeWidth="3" strokeDasharray={item.dash} strokeLinejoin="round" strokeLinecap="round" className="mission-report-line" />))}
    {snapshots.map((snapshot) => <g key={`sol-${snapshot.sol}`}><line x1={x(snapshot.sol)} x2={x(snapshot.sol)} y1={top} y2={top + plotHeight} className="mission-report-sol-guide" /><text x={x(snapshot.sol)} y={height - 10} textAnchor="middle" className="mission-report-axis-label">{snapshot.sol}</text>{series.map((item) => <circle key={item.id} cx={x(snapshot.sol)} cy={y(snapshot[item.id])} r="4" fill={item.color} stroke="#111820" strokeWidth="2"><title>Sol {snapshot.sol} · {item.label} {snapshot[item.id]}%</title></circle>)}</g>)}
  </svg><div className="mission-report-legend">{series.map((item) => <span key={item.id}><i style={{ background: item.color }} />{item.label}</span>)}<span><i className="mission-report-legend__storm" />Dust-front Sol</span></div>
  {snapshots.length === 0 && <p className="mission-report-chart-empty">No Sol snapshots were saved for this campaign.</p>}
  {snapshots.length > 0 && <div className="mission-report-lows">Lowest recorded: {series.map((item) => <span key={item.id}>{item.label} <b>{lows[item.id]?.value.toFixed(0) ?? '—'}%</b> · Sol {lows[item.id]?.sol ?? '—'} · {formatGameClock(lows[item.id]?.minute)}</span>)}</div>}
  </div>
}

function ActivityChart({ snapshots }: { snapshots: SolReportSnapshot[] }) {
  const distances = snapshots.map((_, index) => ({ walk: deltaAt(snapshots, index, 'distanceWalked'), rover: deltaAt(snapshots, index, 'distanceRover') }))
  const maxDistance = Math.max(1, ...distances.flatMap((item) => item.walk === null || item.rover === null ? [] : [item.walk + item.rover]))
  return <div className="mission-report-activity">
    {TEN_SOL_CAMPAIGN.map((sol) => {
      const index = snapshots.findIndex((item) => item.sol === sol.sol)
      const data = index < 0 ? null : snapshots[index]
      const walk = index < 0 ? null : distances[index].walk
      const rover = index < 0 ? null : distances[index].rover
      const canSplitActivity = walk !== null && rover !== null
      return <div className={`mission-report-activity__column${data?.dustFront ? ' is-storm' : ''}`} key={sol.sol} title={`${data?.dustFront ? 'Dust-front day · ' : ''}${canSplitActivity ? `Sol ${sol.sol}: walked ${walk} m, rover ${rover} m` : data ? `Sol ${sol.sol}: activity total is recorded, but its per-Sol split is unavailable` : `Sol ${sol.sol}: activity not recorded`} `}>
        <div className="mission-report-activity__bars">{canSplitActivity && <><i className="walk" style={{ height: `${Math.max(2, walk / maxDistance * 100)}%` }} /><i className="rover" style={{ height: `${Math.max(2, rover / maxDistance * 100)}%` }} /></>}</div><small>{sol.sol}</small>
      </div>
    })}
  </div>
}

function CampaignReportScreen({ report, survival, colony, progress, science, siteId, ending, failureReasons, failureSolutions, onClose, onPlayAgain, onViewScience }: ReportProps) {
  const pageRef = useRef<HTMLElement>(null)
  const [shareNotice, setShareNotice] = useState('')
  const analysisCount = Object.values(science.sampleAnalyses).filter((item) => item?.status === 'complete').length
  const sampleCount = Object.values(science.sampleAnalyses).filter(Boolean).length
  const recordCount = science.unlockedEntryIds.length
  const challengeCount = science.completedChallengeIds.length
  const averageCrew = average(Object.values(survival.crew).map((person) => person.wellness))
  const averageMorale = average(Object.values(survival.crew).map((person) => person.morale))
  const averageFatigue = average(Object.values(survival.crew).map((person) => person.fatigue))
  const equipmentAverage = average(Object.values(survival.equipment))
  const snapshots = report.snapshots
  const completedSolCount = survival.completedSols.length
  const performance = useMemo(() => {
    const scienceScore = clamp(recordCount / Math.max(1, SCIENCE_ENTRIES.length) * 40 + analysisCount / Math.max(1, Object.keys(SAMPLES).length) * 30 + challengeCount / Math.max(1, SCIENCE_CHALLENGES.length) * 30)
    const survivalScore = clamp(completedSolCount / 10 * 20 + average(Object.values(survival.resources)) * 0.5 + averageCrew * 0.3)
    const explorationScore = clamp(Math.min(100, sampleCount / Math.max(1, Object.keys(SAMPLES).length) * 35 + Number(progress.roverTripComplete) * 35 + Math.min(30, (report.distanceWalked + report.distanceRover) / 400 * 30)))
    const maintenanceScore = clamp(new Set(survival.maintenanceLog).size / 7 * 100)
    const engineeringScore = clamp(equipmentAverage * 0.65 + maintenanceScore * 0.35)
    const teamworkScore = clamp(averageCrew * 0.55 + averageMorale * 0.25 + (100 - averageFatigue) * 0.2)
    return [
      { id: 'science', label: 'Science', score: Math.round(scienceScore), weight: MISSION_SCORE_WEIGHTS.science },
      { id: 'survival', label: 'Survival', score: Math.round(survivalScore), weight: MISSION_SCORE_WEIGHTS.survival },
      { id: 'exploration', label: 'Exploration', score: Math.round(explorationScore), weight: MISSION_SCORE_WEIGHTS.exploration },
      { id: 'engineering', label: 'Engineering', score: Math.round(engineeringScore), weight: MISSION_SCORE_WEIGHTS.engineering },
      { id: 'teamwork', label: 'Teamwork', score: Math.round(teamworkScore), weight: MISSION_SCORE_WEIGHTS.teamwork },
    ]
  }, [recordCount, analysisCount, challengeCount, completedSolCount, survival.resources, averageCrew, progress.roverTripComplete, sampleCount, report.distanceWalked, report.distanceRover, survival.maintenanceLog, equipmentAverage, averageMorale, averageFatigue])
  const score = Math.round(performance.reduce((sum, item) => sum + item.score * item.weight, 0) * 100)
  const rank = MISSION_RANK_THRESHOLDS.find((item) => score >= item.minimum)?.label ?? 'Rookie'
  const grade = score >= 9500 ? 'S' : score >= 8000 ? 'A' : score >= 6000 ? 'B' : 'C'
  const bestArea = [...performance].sort((a, b) => b.score - a.score)[0]
  const growthArea = [...performance].sort((a, b) => a.score - b.score)[0]
  const categories = SCIENCE_CATEGORIES.map((category) => ({
    ...category,
    total: SCIENCE_ENTRIES.filter((entry) => entry.category === category.id).length,
    unlocked: SCIENCE_ENTRIES.filter((entry) => entry.category === category.id && science.unlockedEntryIds.includes(entry.id)).length,
  }))
  const unlockedShare = SCIENCE_ENTRIES.length ? recordCount / SCIENCE_ENTRIES.length * 100 : 0
  const netReserveLoss = (['o2', 'h2o', 'food', 'pwr'] as ReportVital[]).reduce((sum, key) => sum + Math.max(0, report.initialResources[key] - ({ o2: survival.resources.oxygen, h2o: survival.resources.water, food: survival.resources.food, pwr: survival.resources.energy })[key]), 0)
  const events = report.events.slice().reverse()
  const decisionReceiptEvent = events.find((event) => event.sol === 9 && event.text.startsWith('SOL 09 DECISION RECEIPT ·'))
  const nonDecisionEvents = events.filter((event) => event !== decisionReceiptEvent)
  const decisionLabels: Record<CampaignDecision, string> = { resilience: 'Protect the crew reserves', research: 'Prioritize scientific return', infrastructure: 'Reinforce critical systems' }
  const titleEnding = ending ? ({ home: 'A Home on Mars', foundation: 'The Foundation', lesson: 'The Lesson That Remains' } as const)[ending] : ''
  const siteName = siteId === 'rocky-basin' ? 'Rocky Basin' : 'Open Plain'
  const statusTitle = ending ? 'MISSION COMPLETE' : 'MISSION FAILED'
  const subtitle = ending ? `${titleEnding} · ${siteName} · Campaign record complete` : `Operations stopped on Sol ${String(survival.sol).padStart(2, '0')} · ${siteName}`

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function downloadPng() {
    const root = pageRef.current
    if (!root) return
    const width = Math.max(1280, root.scrollWidth)
    const height = root.scrollHeight
    const clone = root.cloneNode(true) as HTMLElement
    const originals = [root, ...Array.from(root.querySelectorAll<HTMLElement>('*'))]
    const copies = [clone, ...Array.from(clone.querySelectorAll<HTMLElement>('*'))]
    originals.forEach((element, index) => {
      const style = window.getComputedStyle(element)
      const inline = Array.from(style).map((key) => `${key}:${style.getPropertyValue(key)}`).join(';')
      copies[index]?.setAttribute('style', inline)
    })
    clone.querySelectorAll('button').forEach((button) => button.remove())
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><foreignObject width="100%" height="100%">${new XMLSerializer().serializeToString(clone)}</foreignObject></svg>`
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' })
    const imageUrl = URL.createObjectURL(blob)
    try {
      const image = new Image()
      image.src = imageUrl
      await new Promise<void>((resolve, reject) => { image.onload = () => resolve(); image.onerror = () => reject(new Error('The report image could not be rendered.')) })
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('PNG export is unavailable in this browser.')
      context.fillStyle = '#0a1016'
      context.fillRect(0, 0, width, height)
      context.drawImage(image, 0, 0, width, height)
      const png = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('PNG export failed.')), 'image/png'))
      const url = URL.createObjectURL(png)
      const link = document.createElement('a')
      link.href = url
      link.download = `mars-outpost-alpha-${ending ? 'mission-complete' : 'mission-failed'}.png`
      link.click()
      URL.revokeObjectURL(url)
      setShareNotice('PNG report downloaded.')
    } catch {
      setShareNotice('PNG export was blocked by this browser. Use Download PDF / Print instead.')
    } finally { URL.revokeObjectURL(imageUrl) }
  }

  async function shareResult() {
  const text = `${statusTitle} · ${titleEnding || `Sol ${survival.sol}`} · ${siteName} · ${completedSolCount} Sols completed · ${score.toLocaleString()} score (${rank})`
    try {
      if (navigator.share) await navigator.share({ title: 'Mars: Outpost Alpha mission report', text })
      else if (navigator.clipboard) { await navigator.clipboard.writeText(text); setShareNotice('Mission summary copied to clipboard.') }
      else setShareNotice(text)
    } catch { setShareNotice('Sharing was cancelled.') }
  }

  const summaryBars = [
    { id: 'time', label: 'Active play time', text: formatDuration(report.activePlaySeconds), value: clamp(report.activePlaySeconds / 7200 * 100), color: '#5eead4' },
    { id: 'resources', label: 'Net reserve loss', text: `${Math.round(netReserveLoss)} points`, value: clamp(netReserveLoss / 400 * 100), color: '#fbbf24' },
    { id: 'risk', label: 'Near-miss events', text: `${report.nearMisses}`, value: clamp(report.nearMisses * 20), color: '#fb7185' },
    { id: 'crew', label: 'Crew wellbeing', text: `${Math.round(averageCrew)}%`, value: clamp(averageCrew), color: '#86efac' },
  ]

  return <div className={`mission-report-overlay${ending ? ' is-complete' : ' is-failed'}`} role="dialog" aria-modal="true" aria-labelledby="mission-report-title">
    <div className="mission-report-backdrop" aria-hidden="true" />
    <section className="mission-report-page" ref={pageRef}>
      <header className="mission-report-hero">
        <div className="mission-report-particles" aria-hidden="true">{Array.from({ length: 28 }, (_, index) => <i key={index} style={{ '--particle-index': index, left: `${(index * 37 + 5) % 100}%`, top: `${(index * 19 + 12) % 90}%` } as CSSProperties} />)}</div>
        <div className="mission-report-hero__actions"><button type="button" onClick={() => window.print()}>Download PDF / Print</button><button type="button" onClick={() => void downloadPng()}>Download PNG</button><button type="button" onClick={() => void shareResult()}>Share Result</button><button type="button" className="mission-report-close" onClick={onClose} aria-label="Close mission report">×</button></div>
        <div className="mission-report-hero__badge" aria-hidden="true">{ending ? '✦' : '!'}</div>
        <p className="mission-report-kicker">OUTPOST ALPHA · FINAL CAMPAIGN ASSESSMENT</p>
        <h1 id="mission-report-title">{statusTitle}</h1>
        <p className="mission-report-subtitle">{subtitle}</p>
        <div className="mission-report-rank"><span>FINAL RANK</span><strong>{rank}</strong><b>{score.toLocaleString()} <small>/ 10,000</small></b><i>GRADE {grade}</i></div>
        <p className="mission-report-honest">{ending ? `${titleEnding}: ${({ home: 'The outpost met the sustainability target recorded by the campaign.', foundation: 'The crew completed the mission, with some colony needs still unresolved.', lesson: 'The campaign record shows critical limits that kept the colony from becoming sustainable.' } as const)[ending]}` : `Mission operations stopped because ${failureReasons.join(', ')} reached zero. The report uses the progress saved up to that point.`}</p>
      </header>

      <div className="mission-report-grid">
        <section className="mission-report-panel mission-report-stat-grid" aria-label="Campaign statistics">
          {[
            ['SOLS SURVIVED', <Fragment key="value"><AnimatedValue value={completedSolCount} /><small> / 10</small></Fragment>],
            ['DISTANCE', <Fragment key="value"><AnimatedValue value={Math.round(report.distanceWalked + report.distanceRover)} /><small> m</small><em>{Math.round(report.distanceWalked)} walked · {Math.round(report.distanceRover)} rover</em></Fragment>],
            ['SAMPLES ANALYSED', <AnimatedValue key="value" value={analysisCount} />],
            ['SCIENCE RECORDS', <Fragment key="value"><AnimatedValue value={recordCount} /><small> / {SCIENCE_ENTRIES.length}</small></Fragment>],
            ['CHALLENGES', <Fragment key="value"><AnimatedValue value={challengeCount} /><small> / {SCIENCE_CHALLENGES.length}</small></Fragment>],
            ['EVA TIME', formatDuration(report.evaSeconds)],
          ].map(([label, value]) => <article className="mission-report-stat" key={String(label)}><small>{label}</small><strong>{value}</strong></article>)}
        </section>

        <section className="mission-report-panel mission-report-timeline"><div className="mission-report-section-heading"><div><small>THE TEN-SOL JOURNEY</small><h2>Campaign timeline</h2></div><span>{snapshots.length} / 10 snapshots saved</span></div><div className="mission-report-timeline__track">{TEN_SOL_CAMPAIGN.map((item) => { const complete = survival.completedSols.includes(item.sol); const hasSnapshot = snapshots.some((snapshot) => snapshot.sol === item.sol); return <div className={`mission-report-timeline__node${complete ? ' is-recorded' : ''}`} key={item.sol}><b>{complete ? '✓' : String(item.sol).padStart(2, '0')}</b><strong>{item.title}</strong><small>{hasSnapshot ? 'Snapshot saved' : complete ? 'History unavailable' : 'Not reached'}</small></div> })}</div></section>

        <section className="mission-report-panel mission-report-panel--wide"><div className="mission-report-section-heading"><div><small>RESOURCE HISTORY</small><h2>Colony vitals across all Sols</h2></div><span>Dust fronts marked in amber</span></div><VitalsChart snapshots={snapshots} lows={report.lowest} /></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>PERFORMANCE BREAKDOWN</small><h2>How the mission went</h2></div></div><PerformanceChart scores={performance} /><div className="mission-report-insight"><span>BEST AREA</span><strong>{bestArea.label} · {bestArea.score}%</strong><span>ROOM TO GROW</span><strong>{growthArea.label} · {growthArea.score}%</strong><small>Weights: {Object.entries(MISSION_SCORE_WEIGHTS).map(([key, weight]) => `${key} ${weight}%`).join(' · ')}</small></div></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>EDUCATIONAL RECORD</small><h2>Science archive</h2></div></div><div className="mission-report-archive"><svg viewBox="0 0 120 120" role="img" aria-label={`${recordCount} of ${SCIENCE_ENTRIES.length} science records unlocked`}><circle cx="60" cy="60" r="47" className="mission-report-donut-bg" /><circle cx="60" cy="60" r="47" className="mission-report-donut-value" strokeDasharray={`${unlockedShare * 2.953} ${295.3 - unlockedShare * 2.953}`} transform="rotate(-90 60 60)" /><text x="60" y="57" textAnchor="middle">{Math.round(unlockedShare)}%</text><text x="60" y="74" textAnchor="middle">UNLOCKED</text></svg><div>{categories.map((item) => <div className="mission-report-category" key={item.id}><span>{item.label}<b>{item.unlocked}/{item.total}</b></span><div className="mission-report-bar"><i style={{ '--bar-value': `${item.total ? item.unlocked / item.total * 100 : 0}%` } as CSSProperties} /></div></div>)}</div></div></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>FIELD ACTIVITY</small><h2>Distance per Sol</h2></div></div><div className="mission-report-activity-legend"><span><i className="walk" />Walked</span><span><i className="rover" />Rover</span></div><ActivityChart snapshots={snapshots} /><p className="mission-report-footnote">Bars show per-Sol distance when consecutive snapshots are available. Hover a bar for exact values.</p></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>FIELD HONORS</small><h2>Achievements</h2></div></div><div className="mission-report-achievements">{achievementInfo.map(([id, title, detail, icon]) => { const earned = report.achievements.includes(id); return <article className={earned ? 'is-earned' : ''} key={id}><b aria-hidden="true">{icon}</b><span><strong>{title}</strong><small>{earned ? detail : 'Not earned in this campaign'}</small></span></article> })}</div></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>CAMPAIGN LOG</small><h2>Decisions & events</h2></div></div><div className="mission-report-table-wrap"><table><thead><tr><th>Sol</th><th>Event</th><th>Outcome</th></tr></thead><tbody>{survival.decisions.map((decision) => <tr key={decision}><td>09</td><td>{decisionLabels[decision]}</td><td>{decisionReceiptEvent ? decisionReceiptEvent.text.replace('SOL 09 DECISION RECEIPT · ', '') : 'Priority effects were applied, but this save has no detailed before-and-after receipt.'}</td></tr>)}{nonDecisionEvents.length ? nonDecisionEvents.slice(0, 16).map((event, index) => <tr key={`${event.sol}-${event.at}-${index}`}><td>{String(event.sol).padStart(2, '0')}</td><td>{event.text}</td><td>{event.outcome}</td></tr>) : survival.decisions.length === 0 ? <tr><td colSpan={3}>No event history was recorded for this campaign yet.</td></tr> : null}</tbody></table></div></section>

        <section className="mission-report-panel"><div className="mission-report-section-heading"><div><small>MISSION SUMMARY</small><h2>Operational overview</h2></div></div><div className="mission-report-summary-bars">{summaryBars.map((item) => <div key={item.id}><span>{item.label}<b>{item.text}</b></span><div className="mission-report-bar"><i style={{ '--bar-value': `${item.value}%`, '--bar-color': item.color } as CSSProperties} /></div></div>)}</div><div className="mission-report-low-list"><b>Lowest recorded reserves</b>{(['o2', 'h2o', 'food', 'pwr'] as ReportVital[]).map((id) => <span key={id}>{({ o2: 'O₂', h2o: 'H₂O', food: 'Food', pwr: 'Power' })[id]} {report.lowest[id]?.value.toFixed(0) ?? '—'}% · Sol {report.lowest[id]?.sol ?? '—'} · {formatGameClock(report.lowest[id]?.minute)}</span>)}<small>Suit hardware faults and deaths are not modeled by this game. Near misses count recorded reserve crossings below 15%.</small><small>Reserve loss is the net decrease from the campaign’s first recorded values; it is not gross consumption.</small></div></section>

        {!ending && <section className="mission-report-panel mission-report-decision"><small>FAILURE REVIEW · SOLUTION</small><h2>{failureReasons.join(' · ')}</h2>{failureSolutions.map((solution) => <p key={solution}>Solution: {solution}</p>)}<p>Final reserves · O₂ {Math.round(survival.resources.oxygen)}% · H₂O {Math.round(survival.resources.water)}% · Food {Math.round(survival.resources.food)}% · Power {Math.round(survival.resources.energy)}% · Crew {Math.round(averageCrew)}%</p></section>}
        {ending && <section className="mission-report-panel mission-report-decision"><small>FINAL CAMPAIGN DECISION</small><h2>{survival.decisions.length ? decisionLabels[survival.decisions[0]] : 'No final priority was recorded'}</h2><p>Final reserves · O₂ {Math.round(survival.resources.oxygen)}% · H₂O {Math.round(survival.resources.water)}% · Food {Math.round(survival.resources.food)}% · Power {Math.round(survival.resources.energy)}% · Crew {Math.round(averageCrew)}%</p><p>Solar dust {Math.round(colony.solarDust)}% · Rover survey {progress.roverTripComplete ? 'recorded' : 'not recorded'} · Sample locker {sampleCount} collected</p></section>}
      </div>

      <footer className="mission-report-footer"><p>{ending ? 'The report reflects the saved campaign record.' : `Failure record: ${report.missionFailures} mission failure${report.missionFailures === 1 ? '' : 's'} · ${report.nearMisses} near miss${report.nearMisses === 1 ? '' : 'es'}.`}</p><div><button type="button" onClick={onViewScience}>View Science Archive</button><button type="button" className="mission-report-primary" onClick={onPlayAgain}>{ending ? 'Play Again' : 'Try Again'}</button><button type="button" onClick={onClose}>Return to Outpost <kbd>Esc</kbd></button></div>{shareNotice && <span role="status">{shareNotice}</span>}</footer>
    </section>
  </div>
}

export default CampaignReportScreen
