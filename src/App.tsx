import { useEffect, useState } from 'react'
import type { CSSProperties } from 'react'
import CinematicIntro from './components/cinematic/CinematicIntro'
import OutpostEnvironment from './screens/OutpostEnvironment'
import './App.css'
import PartThree from './screens/PartThree'
import PartFourEntry from './screens/PartFourEntry'
import {
  FIRST_STEPS_GUIDE_KEY,
  getCampaignState,
  startCampaignState,
} from './game/state/campaignState'
import { archiveAndResetActiveSaves } from './game/state/campaignLifecycle'
import { getIntroMusicSettings, setIntroMusicPaused, setIntroMusicSettings, startIntroMusic } from './game/state/introMusic'

type Screen = 'menu' | 'briefing' | 'cinematic' | 'part3' | 'part4' | 'outpost'
type Modal = 'settings' | 'credits' | null

type Preferences = {
  scale: number
  reduceMotion: boolean
}

const SAVE_KEY = 'mars-outpost-alpha-part1'
const PREFERENCES_KEY = 'mars-outpost-alpha-preferences'

const defaultPreferences: Preferences = {
  scale: 100,
  reduceMotion: false,
}

function readPreferences(): Preferences {
  try {
    const saved = localStorage.getItem(PREFERENCES_KEY)
    return saved
      ? { ...defaultPreferences, ...JSON.parse(saved) as Partial<Preferences> }
      : defaultPreferences
  } catch {
    return defaultPreferences
  }
}

function App() {
  const [screen, setScreen] = useState<Screen>('menu')
  const [modal, setModal] = useState<Modal>(null)
  const [hasCampaign, setHasCampaign] = useState(
    () => localStorage.getItem(SAVE_KEY) === 'started',
  )
  const [preferences, setPreferences] = useState<Preferences>(readPreferences)
  const [isFullscreen, setIsFullscreen] = useState(Boolean(document.fullscreenElement))
  const [musicSettings, setMusicSettings] = useState(getIntroMusicSettings)

  useEffect(() => {
    const unlock = () => {
      startIntroMusic()
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
    }
    window.addEventListener('pointerdown', unlock)
    window.addEventListener('keydown', unlock)
    window.addEventListener('touchstart', unlock)
    const syncSettings = (event: Event) => setMusicSettings((event as CustomEvent<{ musicVolume: number; musicMuted: boolean }>).detail)
    const syncFocus = () => setIntroMusicPaused(document.hidden || !document.hasFocus())
    window.addEventListener('mars-intro-music-settings', syncSettings)
    document.addEventListener('visibilitychange', syncFocus)
    window.addEventListener('blur', syncFocus)
    window.addEventListener('focus', syncFocus)
    return () => {
      window.removeEventListener('pointerdown', unlock)
      window.removeEventListener('keydown', unlock)
      window.removeEventListener('touchstart', unlock)
      window.removeEventListener('mars-intro-music-settings', syncSettings)
      document.removeEventListener('visibilitychange', syncFocus)
      window.removeEventListener('blur', syncFocus)
      window.removeEventListener('focus', syncFocus)
    }
  }, [])

  useEffect(() => {
    const updateFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener('fullscreenchange', updateFullscreen)
    return () => document.removeEventListener('fullscreenchange', updateFullscreen)
  }, [])

  useEffect(() => {
    localStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences))
  }, [preferences])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setModal(null)
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  function startCampaign() {
  const result = archiveAndResetActiveSaves()

  if (!result.ok) {
    window.alert(result.message)
    return
  }

  localStorage.setItem(SAVE_KEY, 'started')
  try { localStorage.removeItem(FIRST_STEPS_GUIDE_KEY) } catch { /* A new campaign can continue even if storage is unavailable. */ }
  startCampaignState()
  setHasCampaign(true)
  setScreen('cinematic')
}

  function continueCampaign() {
  if (!hasCampaign) return

  const campaign = getCampaignState()
  setScreen(campaign.landingSiteConfirmed ? 'part4' : 'part3')
}

  function updatePreference<K extends keyof Preferences>(
    key: K,
    value: Preferences[K],
  ) {
    setPreferences((current) => ({ ...current, [key]: value }))
  }

  async function toggleFullscreen() {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen()
      } else {
        await document.documentElement.requestFullscreen()
      }
    } catch {
      // Fullscreen can be unavailable in some browsers or embedded previews.
    }
  }

  const appStyle = {
    '--ui-scale': `${preferences.scale / 100}`,
  } as CSSProperties

  return (
    <main
      className={`game-shell${preferences.reduceMotion ? ' reduced-motion' : ''}${screen === 'menu' ? ' game-shell--menu' : ''}`}
      style={appStyle}
    >
      <div className="mars-scene" aria-hidden="true">
        <div className="stars stars-back" />
        <div className="stars stars-front" />
        <div className="planet-glow" />
        <div className="mars-planet" />
        <div className="ridge ridge-far" />
        <div className="ridge ridge-mid" />
        <div className="ridge ridge-near" />
        <div className="scene-grain" />
      </div>

      <header className="topbar">
        <button
          className="brand"
          type="button"
          aria-label="Mars: Outpost Alpha home"
          onClick={() => {
            setScreen('menu')
            setModal(null)
          }}
        >
          <span className="brand-mark" aria-hidden="true">
            <span />
          </span>
          <span className="brand-copy">
            <strong>MARS</strong>
            <span>OUTPOST ALPHA</span>
          </span>
        </button>

        <div className="topbar-right">
          <span className="system-status">
            <span className="status-dot" />
            SYSTEMS NOMINAL
          </span>
          <span className="topbar-divider" />
          <span className="mission-year">MISSION YEAR 2045</span>
        </div>
      </header>

      {screen === 'menu' ? (
        <section className="menu-layout" aria-label="Main menu">
          <div className="hero-copy">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              HUMANITY’S FIRST OUTPOST
            </p>

            <h1>
              MARS:
              <br />
              <span>OUTPOST</span>
              <br />
              ALPHA
            </h1>

            <p className="campaign-name">THE FIRST TEN SOLS</p>
            <p className="tagline">
              Four pioneers. One distant world.
              <br />
              Ten Sols to build the future.
            </p>

            <div className="menu-actions">
              <button className="primary-button" type="button" onClick={startCampaign}>
                <span>Start Campaign</span>
                <span className="button-arrow" aria-hidden="true">↗</span>
              </button>

              <button
                className="secondary-button"
                type="button"
                disabled={!hasCampaign}
                onClick={continueCampaign}
                title={hasCampaign ? 'Continue your campaign' : 'Start a campaign to enable continue'}
              >
                <span className="button-icon" aria-hidden="true">Ⅱ</span>
                Continue Campaign
                {!hasCampaign && <span className="locked-label">NO SAVE</span>}
              </button>

              <div className="menu-footer-actions">
                <button type="button" className="text-button" onClick={() => setModal('settings')}>
                  Settings
                </button>
              
              </div>
            </div>
          </div>

          <aside className="mission-card" aria-label="Mission information">
            <div className="card-topline">
              <span>MISSION BRIEF</span>
              <span className="card-index">01 — 10</span>
            </div>

            <div className="mars-coordinate">
              <span className="coordinate-label">LANDING ZONE</span>
              <span className="coordinate-value">ARES VALLIS</span>
              <span className="coordinate-sub">MARS · NORTHERN LOWLANDS</span>
            </div>

            <div className="card-rule" />

            <p className="card-description">
              Establish a research outpost, protect your crew, and learn what it
              takes to make a home on another world.
            </p>

            <div className="mission-stats">
              <div>
                <span className="stat-label">CREW</span>
                <span className="stat-value">04 <small>PERSONNEL</small></span>
              </div>
              <div>
                <span className="stat-label">CAMPAIGN</span>
                <span className="stat-value">10 <small>SOLS</small></span>
              </div>
            </div>

            <div className="card-bottom">
              <span className="signal-bars" aria-hidden="true"><i /><i /><i /><i /></span>
              <span>EARTH LINK <b>DELAYED</b></span>
              <span className="signal-delay">13:42 MIN</span>
            </div>
          </aside>

          <div className="bottom-caption">
            <span className="caption-mark" />
            <span>OUTPOST ALPHA</span>
            <span className="caption-divider">·</span>
            <span>MISSION CONTROL INTERFACE</span>
          </div>

          <div className="version-label">FIELD BUILD 01.00</div>
        </section>
      ) : screen === 'cinematic' ? (
  <CinematicIntro
    onComplete={() => setScreen('part3')}
    onSkip={() => setScreen('part3')}
  />
) : screen === 'part3' ? (
  <PartThree onComplete={() => setScreen('part4')} />
) : screen === 'part4' ? (
  <PartFourEntry
    onEnter={() => setScreen('outpost')}
    onBackToSite={() => setScreen('part3')}
  />
) : screen === 'outpost' ? (
  <OutpostEnvironment onBackToEntry={() => setScreen('part4')} />
) : (
  <section className="briefing-layout" aria-label="Campaign briefing">
          <div className="briefing-panel">
            <p className="eyebrow">
              <span className="eyebrow-line" />
              MISSION INITIALIZATION
            </p>
            <h1 className="briefing-title">
              The work
              <br />
              <span>begins here.</span>
            </h1>
            <p className="briefing-lead">
              Four crew members. One unfamiliar world. Your first responsibility
              is to bring Outpost Alpha online and keep the crew safe.
            </p>

            <div className="crew-strip">
              <div className="crew-item">
                <span className="crew-initial jack">JM</span>
                <span><b>Jack Miller</b><small>COMMANDER</small></span>
              </div>
              <div className="crew-item">
                <span className="crew-initial ryan">RC</span>
                <span><b>Ryan Cooper</b><small>ENGINEER</small></span>
              </div>
              <div className="crew-item">
                <span className="crew-initial emma">ER</span>
                <span><b>Emma Ross</b><small>SCIENTIST</small></span>
              </div>
              <div className="crew-item">
                <span className="crew-initial alex">AC</span>
                <span><b>Alex Carter</b><small>MISSION SPECIALIST</small></span>
              </div>
            </div>

            <div className="briefing-note">
              <span className="note-icon" aria-hidden="true">i</span>
              <p>
                Your campaign has been initialized on this device. The cinematic
                arrival and landing sequence is ready for your arrival.
              </p>
            </div>

            <button className="secondary-button return-button" type="button" onClick={() => setScreen('menu')}>
              <span aria-hidden="true">←</span>
              Return to Main Menu
            </button>
          </div>

          <div className="briefing-side">
            <div className="briefing-coordinate">
              <span>MISSION LOCATION</span>
              <strong>ARES VALLIS</strong>
              <small>22.0° N · 330.0° W</small>
            </div>
            <div className="briefing-sol">
              <span>CAMPAIGN</span>
              <strong>SOL <b>01</b></strong>
              <small>A WORLD WITHOUT A WELCOME</small>
            </div>
            <div className="briefing-status">
              <span className="status-dot" />
              CAMPAIGN RECORD CREATED
            </div>
          </div>
        </section>
      )}

      {modal && (
        <div
          className="modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setModal(null)
          }}
        >
          <section
            className="modal-panel"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <div className="modal-heading">
              <div>
                <p className="eyebrow">OUTPOST ALPHA</p>
                <h2 id="modal-title">{modal === 'settings' ? 'Settings' : 'Credits'}</h2>
              </div>
              <button className="close-button" type="button" onClick={() => setModal(null)} aria-label="Close">
                ×
              </button>
            </div>

            {modal === 'settings' ? (
              <div className="settings-content">
                <label className="setting-row" htmlFor="music-volume">
                  <span>
                    <b>Music volume</b>
                    <small>Ambient soundtrack · starts at 30% volume.</small>
                  </span>
                  <span className="scale-control">
                    <input id="music-volume" type="range" min="0" max="100" value={musicSettings.musicVolume} onChange={(event) => setIntroMusicSettings({ ...musicSettings, musicVolume: Number(event.target.value) })} />
                    <b>{musicSettings.musicVolume}%</b>
                  </span>
                </label>
                <label className="setting-row" htmlFor="music-mute">
                  <span>
                    <b>Mute music</b>
                    <small>Mute the ambient track without affecting game sounds.</small>
                  </span>
                  <input id="music-mute" className="toggle-input" type="checkbox" checked={musicSettings.musicMuted} onChange={(event) => setIntroMusicSettings({ ...musicSettings, musicMuted: event.target.checked })} />
                </label>
                <label className="setting-row" htmlFor="interface-scale">
                  <span>
                    <b>Interface size</b>
                    <small>Adjust the scale of menu text and controls.</small>
                  </span>
                  <span className="scale-control">
                    <input
                      id="interface-scale"
                      type="range"
                      min="90"
                      max="115"
                      step="5"
                      value={preferences.scale}
                      onChange={(event) => updatePreference('scale', Number(event.target.value))}
                    />
                    <b>{preferences.scale}%</b>
                  </span>
                </label>

                <label className="setting-row" htmlFor="reduce-motion">
                  <span>
                    <b>Reduce motion</b>
                    <small>Turn off animated background movement.</small>
                  </span>
                  <input
                    id="reduce-motion"
                    className="toggle-input"
                    type="checkbox"
                    checked={preferences.reduceMotion}
                    onChange={(event) => updatePreference('reduceMotion', event.target.checked)}
                  />
                </label>

                <div className="setting-row">
                  <span>
                    <b>Fullscreen</b>
                    <small>Use the full browser window for the game.</small>
                  </span>
                  <button className="small-action" type="button" onClick={toggleFullscreen}>
                    {isFullscreen ? 'Exit fullscreen' : 'Enter fullscreen'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="credits-content">
                <p>
                  <strong>MARS: OUTPOST ALPHA</strong> is an independent,
                  fictional educational game concept.
                </p>
                <p>
                  Created by the project owner. Built with React, TypeScript,
                  and Vite.
                </p>
                <p className="credits-disclaimer">
                  This project is not affiliated with or endorsed by NASA.
                </p>
              </div>
            )}
          </section>
        </div>
      )}
    </main>
  )
}

export default App
