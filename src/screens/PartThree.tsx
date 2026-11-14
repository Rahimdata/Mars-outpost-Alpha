import { useState } from 'react'
import {
  LANDING_SITES,
  type LandingSiteId,
} from '../game/data/landingSites'
import {
  completeLandingSequence,
  confirmLandingSite,
  getCampaignState,
} from '../game/state/campaignState'
import './PartThree.css'

type PartThreeProps = {
  onComplete: () => void
}

type LandingScene = {
  title: string
  lines: { speaker: string; text: string }[]
}

const landingScenes: LandingScene[] = [
  {
    title: 'Final approach',
    lines: [
      {
        speaker: 'JACK MILLER',
        text: 'All stations, prepare for landing. This is the moment we’ve trained for.',
      },
      {
        speaker: 'RYAN COOPER',
        text: 'Landing systems are responding. Checking structural and power systems.',
      },
      {
        speaker: 'DR. EMMA ROSS',
        text: 'Surface conditions are within our expected operating range. Recording initial environmental data.',
      },
      {
        speaker: 'ALEX CARTER',
        text: 'Outpost Alpha, this is the crew. Beginning final descent.',
      },
    ],
  },
  {
    title: 'Touchdown',
    lines: [
      {
        speaker: 'JACK MILLER',
        text: 'Touchdown confirmed. Crew, welcome to Mars.',
      },
    ],
  },
]

function PartThree({ onComplete }: PartThreeProps) {
  const savedState = getCampaignState()
  const [step, setStep] = useState<'landing' | 'first-sight' | 'selection' | 'confirmed'>(
    savedState.landingSiteConfirmed
      ? 'confirmed'
      : savedState.landingSequenceCompleted
        ? 'selection'
        : 'landing',
  )
  const [landingScene, setLandingScene] = useState(0)
  const [selectedSite, setSelectedSite] = useState<LandingSiteId | null>(
    savedState.landingSite?.id ?? null,
  )
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)

  function advanceLanding() {
    if (landingScene < landingScenes.length - 1) {
      setLandingScene((current) => current + 1)
      return
    }

    completeLandingSequence()
    setStep('first-sight')
  }

  function confirmSelection() {
    if (!selectedSite) return
    confirmLandingSite(selectedSite)
    setShowConfirmDialog(false)
    setStep('confirmed')
  }

  const currentSite = selectedSite ? LANDING_SITES[selectedSite] : null

  return (
    <main className="part-three">
      {step === 'landing' && (
        <section
          className={`landing-sequence landing-sequence--scene-${landingScene}`}
          aria-label="Mars landing sequence"
        >
          <div className="landing-art" aria-hidden="true">
            <div className="landing-stars" />
            <div className="landing-planet" />
            <div className="landing-terrain landing-terrain--far" />
            <div className="landing-terrain landing-terrain--near" />
            <div className="landing-shadow" />
            <div className="landing-dust landing-dust--one" />
            <div className="landing-dust landing-dust--two" />
            <div className="lander">
              <span className="lander-body" />
              <span className="lander-window" />
              <span className="lander-leg lander-leg--left" />
              <span className="lander-leg lander-leg--right" />
              <span className="lander-engine" />
            </div>
          </div>

          <header className="landing-header">
            <span className="landing-brand">MARS <i>/</i> OUTPOST ALPHA</span>
            <span className="landing-telemetry"><b /> DESCENT TELEMETRY ACTIVE</span>
          </header>

          <div className="landing-copy">
            <p className="landing-kicker">
              {landingScene === 0 ? 'DESCENT PHASE 01' : 'DESCENT PHASE 02'}
            </p>
            <h1>{landingScenes[landingScene].title}</h1>

            {landingScene === 1 && (
              <div className="landed-status">
                <span className="status-light" />
                <span>MISSION STATUS: LANDED</span>
                <strong>OUTPOST ALPHA — MARS</strong>
              </div>
            )}

            <div className="landing-dialogue" aria-live="polite">
              {landingScenes[landingScene].lines.map((line) => (
                <p key={line.speaker}>
                  <strong>{line.speaker}</strong>
                  <span>{line.text}</span>
                </p>
              ))}
            </div>

            <div className="landing-controls">
              <div className="landing-progress">
                <span className={landingScene === 0 ? 'active' : 'complete'} />
                <span className={landingScene === 1 ? 'active' : ''} />
              </div>
              <button type="button" onClick={advanceLanding}>
                {landingScene === 0 ? 'Continue descent' : 'Continue'}
                <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>

          <p className="landing-caption">MARS APPROACH · CREWED FLIGHT 01</p>
        </section>
      )}

      {step === 'first-sight' && (
        <section className="first-sight">
          <div className="first-sight-art" aria-hidden="true">
            <div className="first-sight-sun" />
            <div className="first-sight-ridge first-sight-ridge--back" />
            <div className="first-sight-ridge first-sight-ridge--front" />
            <div className="first-sight-craft">
              <span />
              <i />
              <b />
            </div>
          </div>
          <div className="first-sight-copy">
            <p className="landing-kicker">OUTPOST ALPHA · FIRST MOMENTS</p>
            <h1>The first sight<br /><span>of home.</span></h1>
            <p>After months of preparation and a long journey, the crew has finally arrived.</p>
            <p>But landing is only the beginning. Before Outpost Alpha can become a home, the crew must choose where to establish their base.</p>
            <button type="button" onClick={() => setStep('selection')}>
              Select landing site <span aria-hidden="true">→</span>
            </button>
          </div>
        </section>
      )}

      {step === 'selection' && (
        <section className="site-selection">
          <header className="site-selection-header">
            <div>
              <p className="landing-kicker">FIRST STRATEGIC DECISION</p>
              <h1>Choose your landing site</h1>
              <p>Each location creates a different starting challenge. Compare both before confirming.</p>
            </div>
            <span className="selection-step">SITE SURVEY <b>02 / 02</b></span>
          </header>

          <div className="site-cards">
            {Object.values(LANDING_SITES).map((site) => (
              <button
                key={site.id}
                type="button"
                className={`site-card${selectedSite === site.id ? ' selected' : ''}`}
                onClick={() => setSelectedSite(site.id)}
                aria-pressed={selectedSite === site.id}
              >
                <span className={`site-preview site-preview--${site.id}`} aria-hidden="true">
                  <span className="site-sun" />
                  <span className="site-ridge site-ridge--back" />
                  <span className="site-ridge site-ridge--front" />
                  {site.id === 'rocky-basin' && (
                    <>
                      <span className="site-rock site-rock--one" />
                      <span className="site-rock site-rock--two" />
                      <span className="site-rock site-rock--three" />
                    </>
                  )}
                  <span className="site-preview-label">{site.designation} · SURFACE SURVEY</span>
                </span>

                <span className="site-card-content">
                  <span className="site-name-row">
                    <span>
                      <small>{site.designation}</small>
                      <strong>{site.name}</strong>
                    </span>
                    <span className="site-select-indicator">
                      {selectedSite === site.id ? 'SELECTED' : 'SELECT'}
                    </span>
                  </span>

                  <span className="site-environment">{site.environment}</span>

                  <span className="site-characteristics">
                    <span><small>CONSTRUCTION</small><b>{site.constructionDifficulty === 'low' ? 'Easier' : 'More challenging'}</b></span>
                    <span><small>ROVER ROUTES</small><b>{site.explorationDifficulty === 'low' ? 'Easier' : 'More challenging'}</b></span>
                    <span><small>GEOLOGY</small><b>{site.geologicalResearchOpportunity === 'standard' ? 'Standard' : 'Enhanced'}</b></span>
                    <span><small>PREPARATION</small><b>{site.initialPreparation === 'lower' ? 'Lower' : 'Higher'}</b></span>
                  </span>
                </span>
              </button>
            ))}
          </div>

          <div className="site-compare-note">
            <span className="compare-icon">i</span>
            <p>
              These are simplified fictional gameplay differences. They are not
              measurements of real landing locations.
            </p>
          </div>

          {currentSite && (
            <section className="site-briefing" aria-live="polite">
              <div className="site-briefing-heading">
                <div>
                  <p className="landing-kicker">SITE BRIEFING · {currentSite.designation}</p>
                  <h2>{currentSite.name}</h2>
                </div>
                <button type="button" className="confirm-site-button" onClick={() => setShowConfirmDialog(true)}>
                  Confirm landing site <span aria-hidden="true">→</span>
                </button>
              </div>

              <p className="site-briefing-copy">{currentSite.briefing}</p>
              <div className="site-pros-cons">
                <div>
                  <h3>Strategic advantages</h3>
                  <ul>{currentSite.advantages.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
                <div>
                  <h3>Planning challenges</h3>
                  <ul>{currentSite.challenges.map((item) => <li key={item}>{item}</li>)}</ul>
                </div>
              </div>
            </section>
          )}
        </section>
      )}

      {step === 'confirmed' && currentSite && (
        <section className="site-confirmed">
          <div className={`confirmed-landscape confirmed-landscape--${currentSite.id}`} aria-hidden="true">
            <div className="confirmed-sun" />
            <div className="confirmed-ground" />
            <div className="confirmed-lander"><i /><b /></div>
          </div>

          <div className="confirmed-content">
            <p className="landing-kicker">OUTPOST ALPHA — SITE CONFIRMED</p>
            <h1>{currentSite.name}</h1>
            <p className="confirmed-designation">{currentSite.designation} · LANDING COORDINATES RECORDED</p>
            <p className="confirmed-description">{currentSite.briefing}</p>

            <div className="crew-reactions">
              <h2>Crew assessment</h2>
              <p><strong>JACK MILLER</strong><span>“{currentSite.crewReactions.jack}”</span></p>
              <p><strong>RYAN COOPER</strong><span>“{currentSite.crewReactions.ryan}”</span></p>
              <p><strong>DR. EMMA ROSS</strong><span>“{currentSite.crewReactions.emma}”</span></p>
              <p><strong>ALEX CARTER</strong><span>“{currentSite.crewReactions.alex}”</span></p>
            </div>

            <div className="part-four-transition">
              <p>Landing coordinates recorded. Initial surface operations are ready to begin.</p>
              <button type="button" onClick={onComplete}>
                Proceed to Outpost Alpha <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        </section>
      )}

      {showConfirmDialog && currentSite && (
        <div
          className="site-confirm-overlay"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setShowConfirmDialog(false)
          }}
        >
          <section
            className="site-confirm-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-site-title"
          >
            <p className="landing-kicker">LANDING AUTHORIZATION</p>
            <h2 id="confirm-site-title">Confirm {currentSite.name}?</h2>
            <p>{currentSite.briefing}</p>
            <div className="confirm-dialog-actions">
              <button type="button" className="cancel-confirm" onClick={() => setShowConfirmDialog(false)}>
                Review sites
              </button>
              <button type="button" className="confirm-final" onClick={confirmSelection}>
                Confirm landing site
              </button>
            </div>
          </section>
        </div>
      )}
    </main>
  )
}

export default PartThree