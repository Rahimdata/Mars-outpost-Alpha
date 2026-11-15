import { lazy, Suspense, useState } from 'react'
import OutpostMap from '../components/outpost/OutpostMap'
import BuildingPanel from '../components/outpost/BuildingPanel'
import {
  OUTPOST_BUILDINGS,
  type BuildingId,
  type BuildingStatus,
} from '../game/data/outpostBuildings'
import { FIRST_STEPS_GUIDE_KEY, getCampaignState } from '../game/state/campaignState'
import { LANDING_SITES } from '../game/data/landingSites'
import type { LandingSiteId } from '../game/data/landingSites'
import './OutpostEnvironment.css'

const MarsEnginePreview = lazy(
  () => import('./MarsGameScreen'),
)

type OutpostEnvironmentProps = {
  onBackToEntry: () => void
}

const statusText: Record<BuildingStatus, string> = {
  operational: 'Operational',
  standby: 'Standby',
  'not-activated': 'Not activated',
}

function OutpostEnvironment({ onBackToEntry }: OutpostEnvironmentProps) {
  const campaign = getCampaignState()
  const siteId = campaign.landingSite?.id as LandingSiteId | undefined
  const [selectedBuilding, setSelectedBuilding] = useState<BuildingId | null>(null)
  const [zoom, setZoom] = useState(1)
  const [panX, setPanX] = useState(0)
  const [panY, setPanY] = useState(0)
  const [showEnginePreview, setShowEnginePreview] = useState(false)
  const [showFirstSteps, setShowFirstSteps] = useState(() => {
    try { return localStorage.getItem(FIRST_STEPS_GUIDE_KEY) !== 'true' } catch { return true }
  })

  function dismissFirstSteps() {
    setShowFirstSteps(false)
    try { localStorage.setItem(FIRST_STEPS_GUIDE_KEY, 'true') } catch { /* The guide remains dismissed for this screen. */ }
  }

  if (!siteId || !campaign.landingSiteConfirmed) {
    return (
      <main className="outpost-screen outpost-screen--error">
        <section className="outpost-error-card">
          <p className="outpost-eyebrow">OUTPOST ALPHA · ENTRY CHECK</p>
          <h1>Landing site required</h1>
          <p>
            Complete and confirm your landing-site selection before entering the outpost
          </p>
          <button type="button" onClick={onBackToEntry}>
            Return to landing briefing
          </button>
        </section>
      </main>
    )
  }

  const site = LANDING_SITES[siteId]

  if (showEnginePreview) {
    return (
      <Suspense
        fallback={
          <div className="engine-loading">
            Loading 3D engine preview…
          </div>
        }
      >
        <MarsEnginePreview
          siteId={siteId}
          onExit={() => setShowEnginePreview(false)}
        />
      </Suspense>
    )
  }

  function adjustZoom(amount: number) {
    setZoom((current) =>
      Math.min(1.22, Math.max(0.84, Number((current + amount).toFixed(2)))),
    )
  }

  function resetCamera() {
    setZoom(1)
    setPanX(0)
    setPanY(0)
  }

  function pan(dx: number, dy: number) {
    setPanX((current) => Math.max(-65, Math.min(65, current + dx)))
    setPanY((current) => Math.max(-42, Math.min(42, current + dy)))
  }

  return (
    <main className={`outpost-screen outpost-screen--${siteId}`}>
      <header className="outpost-header">
        <div className="outpost-header__brand">
          <span className="outpost-brand-mark" />
          <span>
            <strong>OUTPOST ALPHA</strong>
            <small>FIELD OPERATIONS</small>
          </span>
        </div>

        <div className="outpost-location">
          <span className="outpost-location__dot" />
          <span>
            {site.designation} · {site.name}
          </span>
          <small>LOCAL SURFACE OPERATIONS</small>
        </div>

        <div className="outpost-header__actions">
          <button
            className="outpost-preview-button"
            type="button"
            onClick={() => setShowEnginePreview(true)}
          >
            Enter 3D Mars world
          </button>

          <button
            className="outpost-back-button"
            type="button"
            onClick={onBackToEntry}
          >
            Site briefing
          </button>
        </div>
      </header>

      <section className="outpost-toolbar" aria-label="Outpost status">
        <div className="outpost-title-block">
          <p className="outpost-eyebrow">MISSION DAY 01 · SOL 01</p>
          <h1>Outpost Environment</h1>
        </div>

        <div className="outpost-stats">
          <div>
            <small>MISSION STATUS</small>
            <b>
              <i className="status-indicator status-indicator--green" />
              INITIAL SETUP
            </b>
          </div>
          <div>
            <small>CREW</small>
            <b>04 <span>ON SITE</span></b>
          </div>
          <div>
            <small>STRUCTURES</small>
            <b>06 <span>INSTALLED</span></b>
          </div>
        </div>
      </section>

      <section className="outpost-workspace">
        <div className="map-frame">
          <div className="map-frame__topline">
            <span>COLONY OVERVIEW</span>
            <span>CAMERA · {Math.round(zoom * 100)}%</span>
          </div>

          <OutpostMap
            siteId={siteId}
            selectedBuilding={selectedBuilding}
            zoom={zoom}
            panX={panX}
            panY={panY}
            onSelectBuilding={setSelectedBuilding}
          />

          <div className="camera-controls" aria-label="Map camera controls">
            <button
              type="button"
              onClick={() => adjustZoom(0.1)}
              aria-label="Zoom in"
            >
              +
            </button>
            <button
              type="button"
              onClick={() => adjustZoom(-0.1)}
              aria-label="Zoom out"
            >
              −
            </button>
            <span />
            <button type="button" onClick={() => pan(-24, 0)} aria-label="Pan map left">
              ←
            </button>
            <button type="button" onClick={() => pan(24, 0)} aria-label="Pan map right">
              →
            </button>
            <button type="button" onClick={() => pan(0, -18)} aria-label="Pan map up">
              ↑
            </button>
            <button type="button" onClick={() => pan(0, 18)} aria-label="Pan map down">
              ↓
            </button>
            <button className="camera-reset" type="button" onClick={resetCamera}>
              Reset
            </button>
          </div>

          <div className="map-instruction">
            <span className="map-instruction__dot" />
            Select a structure to inspect
          </div>
        </div>

        <aside className="outpost-sidebar">
          {selectedBuilding ? (
            <BuildingPanel
              key={selectedBuilding}
              buildingId={selectedBuilding}
              onClose={() => setSelectedBuilding(null)}
            />
          ) : (
            <div className="outpost-overview">
              <p className="outpost-eyebrow">SITE OVERVIEW</p>
              <h2>{site.name}</h2>
              <p className="overview-description">{site.environment}</p>

              <div className="overview-site-facts">
                <div>
                  <small>CONSTRUCTION</small>
                  <b>{site.constructionDifficulty}</b>
                </div>
                <div>
                  <small>ROVER ROUTES</small>
                  <b>{site.explorationDifficulty}</b>
                </div>
                <div>
                  <small>GEOLOGY</small>
                  <b>{site.geologicalResearchOpportunity}</b>
                </div>
              </div>

              {showFirstSteps && <section className="first-steps-card" aria-labelledby="first-steps-title">
                <div className="first-steps-card__heading">
                  <div><span className="first-steps-card__eyebrow">NEW TO THE OUTPOST?</span><h3 id="first-steps-title">Your first steps</h3></div>
                  <button type="button" onClick={dismissFirstSteps} aria-label="Dismiss first steps guide">×</button>
                </div>
                <p>Enter the 3D world, then follow the mission objective and marker to Ryan.</p>
                <div className="first-steps-controls" aria-label="Starter controls">
                  <span><kbd>W A S D</kbd><b>Move</b></span>
                  <span><kbd>E</kbd><b>Talk or use</b></span>
                  <span><kbd>J</kbd><b>Open Journal</b></span>
                </div>
                <details className="first-steps-terms">
                  <summary>Quick Mars word guide</summary>
                  <dl>
                    <div><dt>O₂ · Oxygen</dt><dd>The gas the crew breathes.</dd></div>
                    <div><dt>H₂O · Water</dt><dd>Water the crew and outpost use.</dd></div>
                    <div><dt>Sol</dt><dd>One day on Mars.</dd></div>
                    <div><dt>Radiation</dt><dd>Invisible energy and particles from space. Shielding can reduce exposure.</dd></div>
                  </dl>
                </details>
                <small className="first-steps-card__note">Game readings are simulations unless a science source is shown. You can close this guide anytime.</small>
              </section>}

              <div className="structure-list">
                <p className="outpost-eyebrow">STRUCTURE STATUS</p>
                {OUTPOST_BUILDINGS.map((building) => (
                  <button
                    key={building.id}
                    type="button"
                    onClick={() => setSelectedBuilding(building.id)}
                  >
                    <span
                      className={`structure-status-dot structure-status-dot--${building.status}`}
                    />
                    <span>{building.name}</span>
                    <small>{statusText[building.status]}</small>
                  </button>
                ))}
              </div>

              <p className="overview-footnote">
                Resource levels and equipment performance are not simulated in
                this part.
              </p>
            </div>
          )}
        </aside>
      </section>

      <footer className="outpost-footer">
        <span>
          <i className="footer-state-dot" /> OUTPOST ALPHA · {site.designation}
        </span>
        <span>INITIAL SURFACE INSPECTION</span>
        <span>OUTPOST ALPHA / ENVIRONMENT</span>
      </footer>
    </main>
  )
}

export default OutpostEnvironment
