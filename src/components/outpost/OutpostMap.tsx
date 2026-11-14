import type { PointerEvent, KeyboardEvent } from 'react'
import type { BuildingId } from '../../game/data/outpostBuildings'
import type { LandingSiteId } from '../../game/data/landingSites'

type OutpostMapProps = {
  siteId: LandingSiteId
  selectedBuilding: BuildingId | null
  zoom: number
  panX: number
  panY: number
  onSelectBuilding: (id: BuildingId) => void
}

function OutpostMap({
  siteId,
  selectedBuilding,
  zoom,
  panX,
  panY,
  onSelectBuilding,
}: OutpostMapProps) {
  const rocky = siteId === 'rocky-basin'
  const viewWidth = 1200 / zoom
  const viewHeight = 700 / zoom
  const viewX = (1200 - viewWidth) / 2 + panX
  const viewY = (700 - viewHeight) / 2 + panY

  function handleBuildingKey(event: KeyboardEvent<SVGGElement>, id: BuildingId) {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelectBuilding(id)
    }
  }

  function buildingPosition(
    x: number,
    y: number,
    rockyX?: number,
    rockyY?: number,
  ) {
    return rocky ? { x: rockyX ?? x, y: rockyY ?? y } : { x, y }
  }

  return (
    <svg
      className={`outpost-map outpost-map--${siteId}`}
      viewBox={`${viewX} ${viewY} ${viewWidth} ${viewHeight}`}
      role="img"
      aria-label={`${rocky ? 'Rocky Basin' : 'Open Plain'} outpost environment. Select a structure to inspect it.`}
    >
      <defs>
        <linearGradient id="marsSky" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={rocky ? '#555061' : '#584957'} />
          <stop offset="62%" stopColor={rocky ? '#b26b59' : '#c77a5d'} />
          <stop offset="100%" stopColor="#e1a077" />
        </linearGradient>
        <linearGradient id="marsGround" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={rocky ? '#ae624e' : '#be6b51'} />
          <stop offset="100%" stopColor={rocky ? '#633d3e' : '#754347'} />
        </linearGradient>
        <linearGradient id="hull" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#f4f1e9" />
          <stop offset="52%" stopColor="#c8d0d0" />
          <stop offset="100%" stopColor="#77858a" />
        </linearGradient>
        <linearGradient id="windowGlass" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#71a6b5" />
          <stop offset="100%" stopColor="#213948" />
        </linearGradient>
        <linearGradient id="panelBlue" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="#38738a" />
          <stop offset="100%" stopColor="#152b40" />
        </linearGradient>
        <filter id="buildingShadow" x="-40%" y="-40%" width="180%" height="200%">
          <feGaussianBlur in="SourceAlpha" stdDeviation="7" />
          <feOffset dy="8" />
          <feComponentTransfer>
            <feFuncA type="linear" slope="0.35" />
          </feComponentTransfer>
          <feMerge>
            <feMergeNode />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect x="-100" y="-100" width="1400" height="900" fill="url(#marsSky)" />

      <circle
        cx="920"
        cy="145"
        r="54"
        fill="#f5bc8d"
        opacity="0.76"
      />
      <circle cx="920" cy="145" r="75" fill="#f3a775" opacity="0.09" />

      {rocky ? (
        <g className="distant-rocks">
          <path d="M-20 372 L40 333 L92 346 L148 290 L216 319 L260 274 L329 309 L386 281 L448 341 L510 330 L570 365 Z" />
          <path d="M747 375 L800 326 L855 346 L920 277 L975 306 L1033 262 L1110 312 L1160 293 L1240 348 L1260 378 Z" />
          <path d="M122 377 L154 324 L182 375 M844 373 L883 319 L914 374 M1010 371 L1041 322 L1079 373" />
        </g>
      ) : (
        <g className="distant-hills">
          <path d="M-20 370 C120 295 215 320 340 351 C470 310 567 302 700 349 C850 300 1010 304 1220 365 L1240 420 L-20 420 Z" />
        </g>
      )}

      <path d="M-100 376 Q270 325 590 372 T1300 360 L1300 800 L-100 800 Z" fill="url(#marsGround)" />
      <path d="M-80 470 Q300 420 580 474 T1290 445" className="terrain-contour" />
      <path d="M-40 548 Q270 502 560 543 T1280 522" className="terrain-contour terrain-contour--second" />

      {rocky && (
        <g className="foreground-rocks">
          <path d="M55 484 l31 -48 43 9 20 47 -28 22 -56 -3 Z" />
          <path d="M1060 535 l37 -58 54 12 23 50 -44 19 -62 -6 Z" />
          <path d="M918 416 l20 -37 32 10 9 35 -23 16 -35 -7 Z" />
          <path d="M320 561 l26 -39 40 7 14 37 -30 16 -43 -5 Z" />
        </g>
      )}

      <g className="site-label">
        <path d="M510 105 H690" />
        <circle cx="600" cy="105" r="4" />
        <text x="600" y="91" textAnchor="middle">
          {rocky ? 'ALPHA-02 · ROCKY BASIN' : 'ALPHA-01 · OPEN PLAIN'}
        </text>
      </g>

      <g className="service-paths">
        <path d="M500 400 L610 414 L710 406 L810 380" />
        <path d="M530 360 L490 392 L410 405" />
        <path d="M500 345 L402 300 L300 260" />
        <path d="M570 336 L710 270 L760 240" />
      </g>

      {OUTPOST_BUILDINGS.map((building) => {
        const position = buildingPosition(
          building.x,
          building.y,
          building.rockyX,
          building.rockyY,
        )
        const selected = selectedBuilding === building.id

        return (
          <g
            key={building.id}
            className={`building building--${building.id}${selected ? ' is-selected' : ''}`}
            transform={`translate(${position.x} ${position.y})`}
            role="button"
            tabIndex={0}
            aria-label={`Inspect ${building.name}`}
            aria-pressed={selected}
            onClick={() => onSelectBuilding(building.id)}
            onKeyDown={(event) => handleBuildingKey(event, building.id)}
            onPointerDown={(event: PointerEvent<SVGGElement>) => event.stopPropagation()}
          >
            <title>{building.name} — select to inspect</title>
            <ellipse
              className="building-selection-ring"
              cx="0"
              cy="26"
              rx={building.id === 'solar-array' ? '95' : '73'}
              ry="24"
            />

            {building.id === 'habitat' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="20" rx="77" ry="22" fill="#382f34" opacity=".55" />
                <path d="M-62 -4 L-28 -26 L52 -15 L68 4 L35 19 L-48 11 Z" fill="#9ca8ab" />
                <path d="M-62 -36 L-28 -57 L52 -47 L68 -28 L35 -10 L-48 -21 Z" fill="url(#hull)" />
                <path d="M-62 -36 L-62 -4 L-48 11 L-48 -21 Z" fill="#9ba6a8" />
                <path d="M-48 -21 L35 -10 L35 19 L-48 11 Z" fill="#e1e2dc" />
                <path d="M35 -10 L68 -28 L68 4 L35 19 Z" fill="#8b999c" />
                <path d="M-42 -16 L-42 4 M-27 -14 L-27 6 M-12 -12 L-12 8 M3 -11 L3 10" stroke="#8d9b9e" strokeWidth="2" />
                <path d="M-50 -34 L30 -24" stroke="#3aa1a6" strokeWidth="5" />
                <path d="M-16 -54 L45 -46 L58 -37 L-3 -44 Z" fill="#f2f1eb" />
                <rect x="46" y="-1" width="13" height="19" rx="3" fill="#66767c" />
                <rect x="50" y="3" width="7" height="11" rx="2" fill="#253b43" />
                <path d="M-55 -39 L-66 -51 L-64 -54 L-51 -43" fill="none" stroke="#cad2d0" strokeWidth="3" />
                <path d="M-66 -52 L-66 -67 M-71 -67 H-61" stroke="#dce1dc" strokeWidth="2" />
                <circle cx="-66" cy="-67" r="3" fill="#e99a61" />
              </g>
            )}

            {building.id === 'greenhouse' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="19" rx="69" ry="19" fill="#382f34" opacity=".55" />
                <path d="M-57 -13 L-26 -47 L34 -43 L62 -12 L31 7 L-39 4 Z" fill="#78949a" />
                <path d="M-57 -37 L-26 -73 L34 -69 L62 -36 L31 -17 L-39 -20 Z" fill="#c8e2df" fillOpacity=".5" stroke="#e3ece6" strokeWidth="3" />
                <path d="M-57 -37 L-57 -13 L-39 4 L-39 -20 Z" fill="#d5dfdc" />
                <path d="M-39 -20 L31 -17 L31 7 L-39 4 Z" fill="#e5e6de" />
                <path d="M31 -17 L62 -36 L62 -12 L31 7 Z" fill="#91a9aa" />
                <path d="M-26 -73 L-26 -47 M3 -71 L3 -38 M34 -69 L34 -43 M-47 -25 L43 -22" stroke="#edf1e9" strokeWidth="3" />
                <path d="M-35 -9 l4 -11 4 11 M-20 -6 l4 -13 4 13 M-4 -5 l4 -12 4 12 M12 -3 l4 -11 4 11" fill="#477b58" stroke="#477b58" strokeWidth="3" />
                <rect x="42" y="1" width="20" height="10" rx="2" fill="#7b8c8d" />
              </g>
            )}

            {building.id === 'laboratory' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="19" rx="67" ry="19" fill="#382f34" opacity=".55" />
                <path d="M-56 -8 L-25 -30 L44 -22 L62 -4 L30 14 L-42 8 Z" fill="#849194" />
                <path d="M-56 -40 L-25 -62 L44 -54 L62 -36 L30 -18 L-42 -24 Z" fill="url(#hull)" />
                <path d="M-56 -40 L-56 -8 L-42 8 L-42 -24 Z" fill="#899799" />
                <path d="M-42 -24 L30 -18 L30 14 L-42 8 Z" fill="#dde0da" />
                <path d="M30 -18 L62 -36 L62 -4 L30 14 Z" fill="#78878b" />
                <path d="M-48 -38 L36 -30" stroke="#3d9da2" strokeWidth="4" />
                <rect x="-25" y="-12" width="17" height="13" rx="3" fill="url(#windowGlass)" />
                <rect x="0" y="-10" width="17" height="13" rx="3" fill="url(#windowGlass)" />
                <rect x="40" y="-31" width="11" height="10" rx="2" fill="#e7a05d" />
                <path d="M-60 -45 L-67 -53 L-64 -56 L-55 -47" stroke="#d9dfd9" strokeWidth="3" fill="none" />
              </g>
            )}

            {building.id === 'solar-array' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="15" rx="102" ry="17" fill="#382f34" opacity=".45" />
                <path d="M-63 -10 L-16 2 L-16 9 L-63 -3 Z M31 4 L78 -8 L78 -1 L31 11 Z" fill="#90999a" />
                <path d="M-38 -17 L-82 -31 L-62 -59 L-20 -46 Z" fill="url(#panelBlue)" stroke="#b1d0d5" strokeWidth="2" />
                <path d="M19 -3 L62 -18 L83 -46 L39 -32 Z" fill="url(#panelBlue)" stroke="#b1d0d5" strokeWidth="2" />
                <path d="M-70 -35 L-29 -22 M-62 -47 L-41 -41 M-52 -55 L-31 -49 M-55 -52 L-73 -28 M-39 -46 L-58 -22" stroke="#70a9b8" strokeWidth="1.5" />
                <path d="M34 -31 L76 -44 M43 -37 L62 -7 M56 -41 L76 -12 M70 -43 L87 -21" stroke="#70a9b8" strokeWidth="1.5" />
                <path d="M-39 -17 L-39 8 M52 -4 L52 12 M-39 8 L52 12" stroke="#d3d4cc" strokeWidth="3" />
                <path d="M-15 2 L-15 12 M31 1 L31 12" stroke="#c9cfca" strokeWidth="3" />
              </g>
            )}

            {building.id === 'battery-storage' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="16" rx="63" ry="19" fill="#382f34" opacity=".55" />
                <path d="M-44 -6 L-15 -26 L49 -19 L56 -7 L28 12 L-37 7 Z" fill="#738187" />
                <path d="M-44 -37 L-15 -57 L49 -50 L56 -38 L28 -18 L-37 -24 Z" fill="#d5d9d5" />
                <path d="M-44 -37 L-44 -6 L-37 7 L-37 -24 Z" fill="#879396" />
                <path d="M-37 -24 L28 -18 L28 12 L-37 7 Z" fill="#b9c2c1" />
                <path d="M28 -18 L56 -38 L56 -7 L28 12 Z" fill="#718086" />
                <path d="M-34 -33 L34 -27" stroke="#408e95" strokeWidth="4" />
                <path d="M-25 -15 L-25 2 M-18 -16 L-18 3 M-11 -15 L-11 4" stroke="#58696e" strokeWidth="2" />
                <circle cx="39" cy="-33" r="4" fill="#e6a75f" />
                <rect x="35" y="-9" width="12" height="9" rx="2" fill="#3d4b50" />
              </g>
            )}

            {building.id === 'rover-garage' && (
              <g filter="url(#buildingShadow)">
                <ellipse cx="0" cy="22" rx="74" ry="20" fill="#382f34" opacity=".55" />
                <path d="M-63 -10 L-30 -34 L45 -28 L68 -7 L34 15 L-47 9 Z" fill="#859295" />
                <path d="M-63 -48 L-30 -72 L45 -66 L68 -45 L34 -23 L-47 -29 Z" fill="url(#hull)" />
                <path d="M-63 -48 L-63 -10 L-47 9 L-47 -29 Z" fill="#889597" />
                <path d="M-47 -29 L34 -23 L34 15 L-47 9 Z" fill="#cdd3cf" />
                <path d="M34 -23 L68 -45 L68 -7 L34 15 Z" fill="#79888c" />
                <path d="M-41 -25 L29 -20" stroke="#38989f" strokeWidth="4" />
                <path d="M-32 -19 L20 -15 L20 7 L-32 3 Z" fill="#39474c" stroke="#d4d9d4" strokeWidth="2" />
                <path d="M-24 -22 L-5 -20 L-5 0 L-24 -2 Z" fill="#17252c" />
                <path d="M1 -19 L12 -18 L12 2 L1 1 Z" fill="#19272d" />
                <circle cx="0" cy="19" r="3" fill="#eaa267" />
              </g>
            )}

            <text className="building-label" x="0" y="47" textAnchor="middle">
              {building.name.toUpperCase()}
            </text>
          </g>
        )
      })}

      <g className="site-marker">
        <circle cx="570" cy="495" r="5" />
        <path d="M570 500 v22 h40" />
        <text x="615" y="525">LANDING ZONE</text>
      </g>
    </svg>
  )
}

import { OUTPOST_BUILDINGS } from '../../game/data/outpostBuildings'

export default OutpostMap