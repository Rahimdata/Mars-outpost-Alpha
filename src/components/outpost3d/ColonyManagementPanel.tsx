import { useState } from 'react'
import { OUTPOST_BUILDINGS } from '../../game/data/outpostBuildings'
import type { BuildingId } from '../../game/data/outpostBuildings'
import type { SurvivalState } from '../../game/state/survivalState'
import { BUILDING_INFO, CROP_INFO, EXPANSION_INFO, EXPANSION_IDS, buildingUpgradeDuration, greenhouseStability } from '../../game/state/colonyState'
import type { ColonyPriority, ColonyState, CropId, ExpansionId, MaterialId } from '../../game/state/colonyState'
import './ColonyManagementPanel.css'

type Props = {
  colony: ColonyState
  survival: SurvivalState
  selected: BuildingId
  rates: ReturnType<typeof import('../../game/state/colonyState').resourceRates>
  notice: string
  onSelect: (id: BuildingId) => void
  onUpgrade: (id: BuildingId) => void
  onExpand: (id: ExpansionId) => void
  onPlant: (id: CropId) => void
  onHarvest: (id: string) => void
  onPriority: (id: ColonyPriority, value: number) => void
  onAssign: (crew: 'ryan' | 'emma' | 'alex', task: 'maintenance' | 'greenhouse' | 'research' | 'logistics') => void
  onSolarMaintenance: () => void
  onEvent: (action: 'repair' | 'defer') => void
  onClose: () => void
}

const materialLabel: Record<MaterialId, string> = { alloy: 'Alloy', parts: 'Components', regolith: 'Regolith', 'bio-supplies': 'Bio-supplies' }
const buildingEquipment: Record<BuildingId, keyof SurvivalState['equipment']> = { habitat: 'habitat', greenhouse: 'greenhouse', laboratory: 'laboratory', 'solar-array': 'solar-array', 'battery-storage': 'battery-storage', 'rover-garage': 'rover' }
const priorityLabels: Record<ColonyPriority, string> = { 'life-support': 'Life support', greenhouse: 'Greenhouse', research: 'Research', battery: 'Battery reserve', maintenance: 'Maintenance' }
const costs = (value: Partial<Record<MaterialId, number>>) => Object.entries(value).filter(([, amount]) => amount).map(([id, amount]) => `${amount} ${materialLabel[id as MaterialId]}`).join(' · ')
const signed = (value: number) => `${value >= 0 ? '+' : ''}${(value * 100).toFixed(2)}`

export default function ColonyManagementPanel(props: Props) {
  const [tab, setTab] = useState<'systems' | 'greenhouse' | 'construction' | 'operations'>('systems')
  const { colony, survival } = props
  const level = colony.upgrades[props.selected]
  const condition = survival.equipment[buildingEquipment[props.selected]]
  const active = colony.construction
  return <div className="colony-management-backdrop" role="presentation" onPointerDown={(event) => { event.stopPropagation(); if (event.target === event.currentTarget) props.onClose() }}>
    <section className="colony-management" role="dialog" aria-modal="true" aria-label="Colony systems">
      <header className="colony-management__header"><div><small>OUTPOST ALPHA · SOL {String(survival.sol).padStart(2, '0')}</small><h2>Colony Systems</h2><p>Fictional planning values · maintain a stable crew and sustainable supplies.</p></div><button type="button" onClick={props.onClose}>Close ×</button></header>
      <div className="colony-management__materials">{(Object.keys(colony.materials) as MaterialId[]).map((id) => <span key={id}>{materialLabel[id]} <b>{Math.floor(colony.materials[id])}</b></span>)}<span>Protection <b>{Math.round(colony.radiationProtection)}%</b></span></div>
      <nav className="colony-management__tabs">{(['systems', 'greenhouse', 'construction', 'operations'] as const).map((id) => <button type="button" key={id} aria-pressed={tab === id} onClick={() => setTab(id)}>{id}</button>)}</nav>
      {props.notice && <p className="colony-management__notice" role="status">{props.notice}</p>}
      {tab === 'systems' && <div className="colony-management__content">
        <div className="colony-management__building-list">{OUTPOST_BUILDINGS.map((building) => <button type="button" key={building.id} aria-pressed={building.id === props.selected} onClick={() => props.onSelect(building.id)}><strong>{BUILDING_INFO[building.id].label}</strong><span>LEVEL {colony.upgrades[building.id]} · {Math.round(survival.equipment[buildingEquipment[building.id]])}%</span></button>)}</div>
        <article className="colony-management__detail"><small>BUILDING SYSTEM</small><h3>{BUILDING_INFO[props.selected].label}</h3><p>{BUILDING_INFO[props.selected].benefit}</p><div className="colony-management__stat"><span>Condition</span><b>{Math.round(condition)}% · {condition < 25 ? 'Critical malfunction' : condition < 55 ? 'Requires maintenance' : condition < 78 ? 'Degraded' : 'Operational'}</b></div><div className="colony-management__stat"><span>Upgrade</span><b>Level {level}{level < 3 ? ` → ${level + 1}` : ' · MAX'}</b></div>
          {active?.kind === 'upgrade' && active.target === props.selected ? <ProgressBar remaining={active.minutesLeft} total={buildingUpgradeDuration(level)} /> : level < 3 ? <><p className="colony-management__cost">Cost: {costs({ alloy: 5 * level, parts: 4 * level, regolith: 3 * level, 'bio-supplies': props.selected === 'greenhouse' ? 2 * level : 0 })} · 8% energy · {buildingUpgradeDuration(level)} game min</p><button type="button" onClick={() => props.onUpgrade(props.selected)}>Start upgrade</button></> : null}
          {props.selected === 'solar-array' && <button type="button" onClick={props.onSolarMaintenance}>Ryan · Clear panel dust ({Math.round(colony.solarDust)}%)</button>}
          <p className="colony-management__footnote">Level effects use the same saved condition and resource simulation shown in the field HUD.</p>
        </article>
      </div>}
      {tab === 'greenhouse' && <div className="colony-management__content colony-management__stack">
        <div className="colony-management__stat"><span>Plots</span><b>{colony.crops.length} active · capacity {2 + colony.upgrades.greenhouse - 1 + (colony.expansions.includes('advanced-greenhouse') ? 2 : 0)}</b></div>
        <div className="colony-management__stat"><span>Environmental stability · equipment, water, and energy</span><b>{greenhouseStability(colony, survival)}%</b></div>
        <div className="colony-management__crop-list">{colony.crops.length ? colony.crops.map((crop) => <article key={crop.id}><strong>{CROP_INFO[crop.crop].name}</strong><span>{crop.progress >= 100 ? 'READY TO HARVEST' : `GROWING · ${Math.floor(crop.progress)}%`} · condition ${Math.round(crop.condition)}% · batch yield ≈{Math.round(CROP_INFO[crop.crop].food * (0.45 + crop.condition / 180) * (1 + (colony.upgrades.greenhouse - 1) * 0.14))}% food</span><progress max="100" value={crop.progress} />{crop.progress >= 100 && <button type="button" onClick={() => props.onHarvest(crop.id)}>Harvest into crew food reserve</button>}</article>) : <p>No active crops. Planting uses bio-supplies, then consumes water and energy gradually.</p>}</div>
        <div className="colony-management__actions">{(Object.keys(CROP_INFO) as CropId[]).map((crop) => <button type="button" key={crop} onClick={() => props.onPlant(crop)}>Plant {CROP_INFO[crop].name} · {CROP_INFO[crop].duration} game min</button>)}</div>
        <p className="colony-management__footnote">Growth depends on greenhouse condition, water, energy priority, and environmental stability. Harvest adds directly to the existing food reserve. The resource overview shows food consumption until harvest because crops pay out in batches.</p>
      </div>}
      {tab === 'construction' && <div className="colony-management__content colony-management__stack">
        {active && <article className="colony-management__job"><strong>{active.kind === 'upgrade' ? `${BUILDING_INFO[active.target as BuildingId].label} upgrade` : EXPANSION_INFO[active.target as ExpansionId].title}</strong><ProgressBar remaining={active.minutesLeft} total={active.kind === 'upgrade' ? buildingUpgradeDuration(colony.upgrades[active.target as BuildingId]) : EXPANSION_INFO[active.target as ExpansionId].duration} /><span>{Math.ceil(active.minutesLeft)} game minutes remaining · crew {colony.assignment?.crew ? 'assigned' : 'unassigned'}</span></article>}
        <div className="colony-management__expansions">{EXPANSION_IDS.map((id) => { const info = EXPANSION_INFO[id]; const built = colony.expansions.includes(id); return <article key={id}><strong>{info.title}</strong><p>{info.purpose}</p><span>{built ? 'COMPLETE · MODULE INSTALLED' : `${costs(info.cost)} · ${info.duration} game min · 10% energy`}</span>{!built && <button type="button" onClick={() => props.onExpand(id)}>{active ? 'Construction busy' : 'Begin construction'}</button>}</article> })}</div>
        <p className="colony-management__footnote">Completed modules appear in the 3D colony. Construction spends materials at start and cannot be duplicated while a job is active.</p>
      </div>}
      {tab === 'operations' && <div className="colony-management__content colony-management__stack">
        <div className="colony-management__resources"><h3>Resource balance · % per 100 game min</h3>{([['oxygen', 'Oxygen'], ['water', 'Water'], ['food', 'Food'], ['energy', 'Energy']] as const).map(([id, label]) => { const rate = props.rates[id] * 100; return <div className="colony-management__stat" key={id}><span>{label} · current {Math.round(survival.resources[id])}%</span><b>{signed(rate)}%</b></div> })}<small>Net rates include current crop loads, equipment condition, solar dust, and upgrades.</small></div>
        <div className="colony-management__priorities"><h3>Operational priorities · 1 low to 5 high</h3>{(Object.keys(priorityLabels) as ColonyPriority[]).map((id) => <label key={id}>{priorityLabels[id]}<input type="range" min="1" max="5" step="1" value={colony.priorities[id]} onChange={(event) => props.onPriority(id, Number(event.target.value))} /><b>{colony.priorities[id]}</b></label>)}</div>
        <div className="colony-management__stat"><span>Radiation protection · simplified gameplay indicator</span><b>{Math.round(colony.radiationProtection)}%</b></div><div className="colony-management__stat"><span>Surface exposure risk index · protection-based game value</span><b>{Math.round(100 - colony.radiationProtection)}%</b></div><p className="colony-management__footnote">Protection reduces the slow fictional wellness penalty while exposed. Values are not real Mars dose limits or engineering calculations.</p>
        <div className="colony-management__assignment"><h3>Crew assignments</h3>{colony.assignment ? <p>{colony.assignment.crew.toUpperCase()} · {colony.assignment.task.toUpperCase()} · {Math.ceil(colony.assignment.minutesLeft)} game min</p> : <p>No active assignment</p>}<div className="colony-management__actions"><button type="button" onClick={() => props.onAssign('ryan', 'maintenance')}>Ryan · maintenance</button><button type="button" onClick={() => props.onAssign('emma', 'greenhouse')}>Emma · greenhouse</button><button type="button" onClick={() => props.onAssign('emma', 'research')}>Emma · research</button><button type="button" onClick={() => props.onAssign('alex', 'logistics')}>Alex · logistics materials</button></div></div>
        {colony.event && <article className="colony-management__event"><small>COLONY EVENT</small><strong>{colony.event.title}</strong><p>{colony.event.body}</p>{colony.event.resolved ? <span>RESOLVED</span> : <div className="colony-management__actions"><button type="button" onClick={() => props.onEvent('repair')}>Repair · 2 components + 5% energy</button><button type="button" onClick={() => props.onEvent('defer')}>Defer · possible yield loss</button></div>}</article>}
      </div>}
    </section>
  </div>
}

function ProgressBar({ remaining, total }: { remaining: number; total: number }) {
  return <div className="colony-management__progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(100 - remaining / total * 100)}><span style={{ width: `${Math.min(100, Math.max(0, 100 - remaining / total * 100))}%` }} /></div>
}
