import { Canvas } from '@react-three/fiber'
import { Suspense } from 'react'
import type { LandingSiteId } from '../../game/data/landingSites'
import MarsEngineScene from './MarsEngineScene'
import './MarsEnginePreview.css'

type MarsEnginePreviewProps = {
  siteId: LandingSiteId
  onBack: () => void
}

function MarsEnginePreview({ siteId, onBack }: MarsEnginePreviewProps) {
  const siteName = siteId === 'rocky-basin' ? 'Rocky Basin' : 'Open Plain'

  return (
    <main className="mars-engine-preview">
      <header className="mars-engine-preview__header">
        <div>
          <strong>MARS: OUTPOST ALPHA</strong>
          <span>3D ENGINE PREVIEW · {siteName.toUpperCase()}</span>
        </div>
        <button type="button" onClick={onBack}>Return to 2D outpost</button>
      </header>

      <div className="mars-engine-preview__canvas">
        <Canvas
          shadows
          dpr={[1, 1.5]}
          camera={{ position: [8, 6, 9], fov: 42, near: 0.1, far: 100 }}
          gl={{ antialias: true, powerPreference: 'high-performance' }}
          fallback={
            <div className="mars-engine-preview__fallback">
              This browser could not start the 3D view. Return to the outpost and
              try a browser with WebGL 2 support.
            </div>
          }
        >
          <Suspense fallback={null}>
            <MarsEngineScene siteId={siteId} />
          </Suspense>
        </Canvas>

        <div className="mars-engine-preview__label">
          <span>ENGINE FOUNDATION</span>
          <strong>Placeholder geometry · not final Mars art</strong>
        </div>

        <p className="mars-engine-preview__hint">
          Drag to look around · Scroll or pinch to zoom
        </p>
      </div>
    </main>
  )
}

export default MarsEnginePreview