import { useEffect, useState } from 'react'
import { introScenes } from '../../game/narrative/introScenes'
import './CinematicIntro.css'

type CinematicIntroProps = {
  onComplete: () => void
  onSkip: () => void
}

function CinematicIntro({ onComplete, onSkip }: CinematicIntroProps) {
  const [sceneIndex, setSceneIndex] = useState(0)
  const scene = introScenes[sceneIndex]
  const isLastScene = sceneIndex === introScenes.length - 1

  function nextScene() {
    if (isLastScene) {
      onComplete()
      return
    }

    setSceneIndex((current) => Math.min(current + 1, introScenes.length - 1))
  }

  function previousScene() {
    setSceneIndex((current) => Math.max(current - 1, 0))
  }

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'ArrowRight' || event.key === 'Enter') {
        event.preventDefault()
        if (isLastScene) onComplete()
        else setSceneIndex((current) => Math.min(current + 1, introScenes.length - 1))
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setSceneIndex((current) => Math.max(current - 1, 0))
      }

      if (event.key === 'Escape') {
        event.preventDefault()
        onSkip()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isLastScene, onComplete, onSkip])

  const progress = ((sceneIndex + 1) / introScenes.length) * 100

  return (
    <section className="cinematic" aria-label="Cinematic introduction">
      <div className={`cinematic-art cinematic-art--${scene.visual}`} aria-hidden="true">
        <div className="cinematic-stars" />
        <div className="cinematic-earth" />
        <div className="cinematic-mars" />
        <div className="cinematic-horizon" />
        <div className="cinematic-craft">
          <span className="craft-body" />
          <span className="craft-wing craft-wing--left" />
          <span className="craft-wing craft-wing--right" />
          <span className="craft-engine" />
        </div>

        {scene.crew && (
          <div className={`crew-portrait crew-portrait--${scene.crew.visual}`}>
            <span className="portrait-hair" />
            <span className="portrait-head">
              {scene.crew.visual === 'scientist' && <span className="portrait-glasses" />}
            </span>
            <span className="portrait-neck" />
            <span className="portrait-suit">
              <span className="portrait-stripe" />
              {scene.crew.visual === 'engineer' && <span className="portrait-toolbelt" />}
              {scene.crew.visual === 'specialist' && <span className="portrait-headset" />}
            </span>
          </div>
        )}

        <div className="cinematic-vignette" />
      </div>

      <header className="cinematic-header">
        <div className="cinematic-brand">
          <span className="cinematic-brand-mark" />
          <span>
            <strong>MARS</strong>
            <small>OUTPOST ALPHA</small>
          </span>
        </div>

        <div className="cinematic-header-status">
          <span className="status-dot" />
          TRANSMISSION RECEIVED
        </div>

        <button className="skip-button" type="button" onClick={onSkip}>
          Skip intro <span aria-hidden="true">↗</span>
        </button>
      </header>

      <div className="cinematic-content" aria-live="polite" key={scene.id}>
        <div className="cinematic-copy">
          <p className="cinematic-kicker">{scene.label}</p>
          {scene.crew && (
            <p className="cinematic-role">{scene.crew.role}</p>
          )}
          <h1>{scene.title}</h1>

          {scene.id === 'mission' && (
            <div className="cinematic-campaign-title">
              <strong>MARS: OUTPOST ALPHA</strong>
              <span>THE FIRST TEN SOLS</span>
            </div>
          )}

          <div className="cinematic-narrative">
            {scene.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>

          {scene.crew && (
            <p className="crew-dialogue">
              <span aria-hidden="true">“</span>
              {scene.crew.dialogue}
              <span aria-hidden="true">”</span>
            </p>
          )}

          {scene.id === 'surface' && (
            <div className="arrival-message">
              <strong>WELCOME TO MARS.</strong>
              <span>OUTPOST ALPHA AWAITS.</span>
            </div>
          )}
        </div>

        {scene.crew && (
          <aside className="crew-id-card" aria-label={`${scene.crew.name}, ${scene.crew.role}`}>
            <span className="crew-id-label">CREW FILE // {scene.crew.initials}</span>
            <strong>{scene.crew.name}</strong>
            <span>{scene.crew.role}</span>
          </aside>
        )}
      </div>

      <footer className="cinematic-controls">
        <div className="scene-progress" aria-label={`Scene ${sceneIndex + 1} of ${introScenes.length}`}>
          <div className="progress-track">
            <span style={{ width: `${progress}%` }} />
          </div>
          <span>{sceneIndex + 1} <i>/</i> {introScenes.length}</span>
        </div>

        <div className="scene-controls">
          <button
            className="previous-button"
            type="button"
            onClick={previousScene}
            disabled={sceneIndex === 0}
          >
            <span aria-hidden="true">←</span>
            Previous
          </button>

          <button className="continue-button" type="button" onClick={nextScene}>
            {isLastScene ? 'Begin landing' : 'Continue'}
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <p className="keyboard-hint">← → TO NAVIGATE <span>·</span> ESC TO SKIP</p>
      </footer>
    </section>
  )
}

export default CinematicIntro