import { useEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CanvasTexture, CatmullRomCurve3, Float32BufferAttribute, SRGBColorSpace, Shape, TubeGeometry, Vector3 } from 'three'
import type { BuildingId } from '../../game/data/outpostBuildings'
import type { LandingSiteId } from '../../game/data/landingSites'
import { getColonyLayout } from '../../game/world3d/colonyLayout'
import type { ColonyBuilding } from '../../game/world3d/colonyLayout'
import { getTerrainHeight } from '../../game/world3d/terrain'
import type { Group } from 'three'
import type { CropPlot } from '../../game/state/colonyState'
import { GreenhouseCropRow, GreenhouseGlassShell, GREENHOUSE_CONFIG } from './GreenhouseKit'

const dark = '#39474b'
const teal = '#52b9b4'
const orange = '#dc7847'

export const LAB_CONFIG = {
  mainWidth: 18,
  mainDepth: 12,
  innerWidth: 18,
  innerDepth: 12,
  wallHeight: 5.4,
  towerHeight: 9.2,
  weathering: 0.35,
  windowGlow: 0.36,
  propDensity: 1,
  palette: { hull: '#d4d8d1', frame: '#546367', trim: '#61bcb5', warning: '#df8950', glass: '#31535a', dust: '#8f4c3c' },
} as const

export const POWER_SITE_CONFIG = {
  solarTables: 3,
  modulesPerTable: { rows: 2, columns: 6 },
  tableSpacing: 5.2,
  panelTiltRadians: { dawn: 0.12, peak: 0.46, stormStow: 0.02 },
  panelSizeMeters: [1.82, 1.82] as const,
  batteryContainers: 3,
  batteryCapacityKwh: 500,
  dustOpacityAtMax: 0.56,
} as const

let labSignTexture: CanvasTexture | null = null
let batterySignTexture: CanvasTexture | null = null

function getBatterySignTexture() {
  if (batterySignTexture) return batterySignTexture
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 192
  const context = canvas.getContext('2d')!
  context.fillStyle = '#26383d'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#e1a24d'
  context.fillRect(0, 0, 20, canvas.height)
  context.fillStyle = '#eef0e7'
  context.font = '700 55px Arial, sans-serif'
  context.textBaseline = 'middle'
  context.fillText('BATTERY BANK 02', 58, 70)
  context.fillStyle = '#9bd7c2'
  context.font = '700 34px Arial, sans-serif'
  context.fillText('500 kWh  ·  POWER STORAGE', 60, 142)
  batterySignTexture = new CanvasTexture(canvas)
  batterySignTexture.colorSpace = SRGBColorSpace
  return batterySignTexture
}

function getLabSignTexture() {
  if (labSignTexture) return labSignTexture
  const canvas = document.createElement('canvas')
  canvas.width = 1024
  canvas.height = 128
  const context = canvas.getContext('2d')!
  context.fillStyle = '#23383d'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.fillStyle = '#dc7847'
  context.fillRect(0, 0, 18, canvas.height)
  context.fillStyle = '#71c9bf'
  context.fillRect(28, 20, 5, 88)
  context.fillStyle = '#edf0e6'
  context.font = '700 48px Arial, sans-serif'
  context.textBaseline = 'middle'
  context.fillText('RESEARCH LAB', 110, 48)
  context.fillStyle = '#bed0c8'
  context.font = '22px Arial, sans-serif'
  context.fillText('SCIENCE MODULE  ·  ALPHA 01', 112, 96)
  labSignTexture = new CanvasTexture(canvas)
  labSignTexture.colorSpace = SRGBColorSpace
  return labSignTexture
}

function Airlock({ x = 0, z = 0, scale = 1, open = false }: { x?: number; z?: number; scale?: number; open?: boolean }) {
  const door = useRef<Group>(null)
  useFrame((_, delta) => {
    if (door.current) {
      const target = open ? -1.35 : 0
      door.current.rotation.y += (target - door.current.rotation.y) * (1 - Math.exp(-8 * Math.min(delta, 0.05)))
    }
  })
  return (
    <group position={[x, 0, z]} scale={scale}>
      <mesh position={[0, 1.52, 0]} castShadow><boxGeometry args={[2.55, 3.05, 2.45]} /><meshStandardMaterial color="#c1c9c7" metalness={0.18} roughness={0.68} /></mesh>
      <group ref={door} position={[-0.78, 1.36, 1.24]}>
        <mesh position={[0.78, 0, 0]}><boxGeometry args={[1.56, 2.4, 0.05]} /><meshStandardMaterial color="#35484d" metalness={0.4} roughness={0.53} /></mesh>
      </group>
      <mesh position={[0, 2.62, 1.27]}><boxGeometry args={[1.82, 0.1, 0.06]} /><meshStandardMaterial color={teal} metalness={0.25} roughness={0.5} /></mesh>
      <mesh position={[0.61, 1.42, 1.11]}><boxGeometry args={[0.07, 0.42, 0.045]} /><meshStandardMaterial color="#c8d0cb" metalness={0.5} roughness={0.36} /></mesh>
      <mesh position={[0, 3.12, 0]} castShadow><boxGeometry args={[2.76, 0.18, 2.76]} /><meshStandardMaterial color={dark} metalness={0.42} roughness={0.54} /></mesh>
      <mesh position={[0, 0.18, 0.9]} castShadow><boxGeometry args={[2.45, 0.26, 1.75]} /><meshStandardMaterial color="#747f7d" metalness={0.22} roughness={0.76} /></mesh>
      <mesh position={[0, 0.34, 1.7]} rotation={[-0.14, 0, 0]} castShadow><boxGeometry args={[1.9, 0.12, 1.65]} /><meshStandardMaterial color="#9ea6a0" roughness={0.88} /></mesh>
      <mesh position={[-0.84, 2.58, 0.18]}><sphereGeometry args={[0.065, 10, 8]} /><meshStandardMaterial color="#91e1ca" emissive="#286f5c" emissiveIntensity={0.6} /></mesh>
      <mesh position={[0.84, 2.58, 0.18]}><sphereGeometry args={[0.065, 10, 8]} /><meshStandardMaterial color="#e89059" emissive="#793e22" emissiveIntensity={0.42} /></mesh>
    </group>
  )
}

const HABITAT_SCALE = { width: 30, depth: 20, wallHeight: 4.2, domeRadius: 7.4, towerHeight: 14.5 } as const

function Habitat({ openDoor }: { openDoor: boolean }) {
  return (
    <group>
      {/* 30 × 20 m pressure-rated landing deck with a two-storey central hall. */}
      <mesh position={[0, 0.34, 0]} castShadow receiveShadow><boxGeometry args={[HABITAT_SCALE.width, 0.68, HABITAT_SCALE.depth]} /><meshStandardMaterial color="#596568" metalness={0.28} roughness={0.86} /></mesh>
      <mesh position={[0, 0.7, 0]} castShadow receiveShadow><boxGeometry args={[28.8, 0.18, 18.8]} /><meshStandardMaterial color="#b9b8ad" metalness={0.12} roughness={0.82} /></mesh>
      <mesh position={[0, 3.05, 0]} castShadow receiveShadow><cylinderGeometry args={[7.35, 7.65, 4.7, 16]} /><meshStandardMaterial color="#c9cec8" metalness={0.2} roughness={0.68} /></mesh>
      <mesh position={[0, 5.65, 0]} scale={[7.45, 4.4, 7.45]} castShadow><sphereGeometry args={[1, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#aebdc0" metalness={0.3} roughness={0.27} clearcoat={0.5} side={2} /></mesh>
      <mesh position={[0, 7.45, 0]}><sphereGeometry args={[0.34, 16, 10]} /><meshStandardMaterial color="#ffcc8d" emissive="#b45c2d" emissiveIntensity={0.65} /></mesh>
      {Array.from({ length: 8 }, (_, i) => { const a = (i / 8) * Math.PI * 2; return <mesh key={`dome-rib-${i}`} position={[Math.sin(a) * 3.7, 5.8, Math.cos(a) * 3.7]} rotation={[0, a, 0]}><boxGeometry args={[0.16, 4.0, 0.18]} /><meshStandardMaterial color="#e2ded2" metalness={0.46} roughness={0.54} /></mesh> })}
      {/* Connected cylindrical living wings, visible pressure hoops and dark windows. */}
      {[-1, 1].map((side) => <group key={`wing-${side}`} position={[side * 10.2, 0, -0.3]}>
        <mesh position={[0, 2.5, 0]} rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[3.0, 3.0, 10.2, 16]} /><meshStandardMaterial color="#d2d4cb" metalness={0.17} roughness={0.72} /></mesh>
        {[-3.8, -1.8, 0.2, 2.2, 4.2].map((z) => <mesh key={z} position={[0, 2.5, z]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[2.82, 0.075, 6, 16]} /><meshStandardMaterial color="#667477" metalness={0.55} roughness={0.52} /></mesh>)}
        <mesh position={[-side * 5.1, 2.5, -0.3]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[1.55, 1.55, 4.4, 12]} /><meshStandardMaterial color="#84918d" metalness={0.38} roughness={0.68} /></mesh>
        {[-1, 1].map((z) => <mesh key={`window-${z}`} position={[0, 2.7, z * 3.35]}><boxGeometry args={[0.07, 1.0, 1.35]} /><meshPhysicalMaterial color="#29434a" metalness={0.54} roughness={0.2} clearcoat={0.9} emissive="#17434a" emissiveIntensity={0.24} /></mesh>)}
      </group>)}
      {/* Foundation piers, facade seams, and protected observation glazing. */}
      {[-12, -6, 6, 12].flatMap((x) => [-7.5, 7.5].map((z) => <mesh key={`foot-${x}-${z}`} position={[x, 0.3, z]} castShadow><boxGeometry args={[1.1, 0.58, 1]} /><meshStandardMaterial color="#465356" metalness={0.3} roughness={0.9} /></mesh>))}
      {Array.from({ length: 12 }, (_, i) => { const x = -13.2 + i * 2.4; return <group key={`facade-${x}`}><mesh position={[x, 2.9, 10.12]}><boxGeometry args={[0.07, 3.65, 0.08]} /><meshStandardMaterial color="#84908d" metalness={0.42} roughness={0.68} /></mesh>{Math.abs(x) > 4 && <mesh position={[x, 2.95, 10.19]}><boxGeometry args={[1.15, 0.74, 0.06]} /><meshPhysicalMaterial color="#29434a" metalness={0.52} roughness={0.22} clearcoat={0.8} emissive="#1b4247" emissiveIntensity={0.22} /></mesh>}</group> })}
      <mesh position={[0, 1.45, 10.16]}><boxGeometry args={[26.8, 0.2, 0.14]} /><meshStandardMaterial color={teal} metalness={0.36} roughness={0.48} emissive="#1d6761" emissiveIntensity={0.2} /></mesh>
      {/* Canopy, lit HABITAT ALPHA plaque, and human-scale 2.4 m airlock. */}
      <mesh position={[0, 4.25, 12.2]} castShadow><boxGeometry args={[5.2, 0.32, 3.8]} /><meshStandardMaterial color="#4d5a5c" metalness={0.5} roughness={0.58} /></mesh>
      <mesh position={[0, 4.02, 12.25]}><boxGeometry args={[3.8, 0.08, 3.2]} /><meshStandardMaterial color="#e6b96f" emissive="#cc7e38" emissiveIntensity={0.55} /></mesh>
      <mesh position={[0, 5, 13.05]}><boxGeometry args={[3.8, 0.52, 0.12]} /><meshStandardMaterial color="#26393d" metalness={0.28} roughness={0.64} /></mesh>
      <mesh position={[0, 5, 13.13]}><boxGeometry args={[3.15, 0.22, 0.035]} /><meshStandardMaterial color="#b9e0d5" emissive="#74c6b4" emissiveIntensity={0.5} /></mesh>
      <Airlock z={12.25} open={openDoor} />
      {/* 14.5 m communications tower, dish and red warning beacon. */}
      <mesh position={[8.5, 7.25, -5.2]} castShadow><cylinderGeometry args={[0.68, 1.05, 14.5, 12]} /><meshStandardMaterial color="#657477" metalness={0.56} roughness={0.52} /></mesh>
      {[2.2, 5.4, 8.6, 11.8].map((y) => <mesh key={y} position={[8.5, y, -5.2]}><torusGeometry args={[0.73, 0.08, 6, 12]} /><meshStandardMaterial color="#bbc2b8" metalness={0.5} roughness={0.55} /></mesh>)}
      <mesh position={[8.5, 14.9, -5.2]}><sphereGeometry args={[0.42, 16, 12]} /><meshStandardMaterial color="#f08b54" emissive="#e34820" emissiveIntensity={1.4} /></mesh>
      <pointLight position={[8.5, 14.9, -5.2]} color="#ff613d" intensity={4} distance={18} />
      <mesh position={[8.5, 11.5, -5.2]} rotation={[0.4, 0, 0]}><cylinderGeometry args={[0.35, 0.8, 0.34, 16, 1, true]} /><meshStandardMaterial color="#bac1b8" metalness={0.45} roughness={0.52} side={2} /></mesh>
      {/* Life-support tanks and exterior work lights. */}
      {[-1, 1].map((side) => <group key={`tank-${side}`} position={[side * 13.6, 0, -6.1]}><mesh position={[0, 1.7, 0]} castShadow><cylinderGeometry args={[1.05, 1.05, 3.2, 14]} /><meshStandardMaterial color="#aeb9b4" metalness={0.34} roughness={0.62} /></mesh>{[-1.25, 0, 1.25].map((y) => <mesh key={y} position={[0, y + 1.7, 0]}><torusGeometry args={[1.06, 0.07, 6, 14]} /><meshStandardMaterial color="#687779" metalness={0.58} roughness={0.5} /></mesh>)}</group>)}
      {[-12, 12].map((x) => <group key={`flood-${x}`} position={[x, 0, 8.5]}><mesh position={[0, 2.3, 0]} castShadow><cylinderGeometry args={[0.08, 0.1, 4.6, 8]} /><meshStandardMaterial color="#606e70" metalness={0.55} roughness={0.48} /></mesh><mesh position={[0, 4.55, 0]}><boxGeometry args={[0.75, 0.2, 0.45]} /><meshStandardMaterial color="#fff0ca" emissive="#ffd084" emissiveIntensity={0.7} /></mesh><pointLight position={[0, 4.2, 0.25]} color="#ffd39a" intensity={2} distance={9} /></group>)}
    </group>
  )
}

function Greenhouse({ openDoor, crops, stormIntensity }: { openDoor: boolean; crops: CropPlot[]; stormIntensity: number }) {
  const bayPositions = Array.from({ length: 17 }, (_, i) => -10 + i * 1.25)
  const accumulatedDust = Math.min(0.48, GREENHOUSE_CONFIG.dustOpacity + GREENHOUSE_CONFIG.weathering * 0.05 + stormIntensity * 0.3)
  return (
    <group>
      {/* Prepared pad, raised sealed plinth and anchor points. */}
      <mesh position={[0, 0.04, 0]} receiveShadow><boxGeometry args={[14.2, 0.12, 22.2]} /><meshStandardMaterial color="#aa8b78" roughness={0.98} /></mesh>
      <mesh position={[0, 0.27, 0]} castShadow receiveShadow><boxGeometry args={[12.8, 0.42, 20.8]} /><meshStandardMaterial color="#697677" metalness={0.18} roughness={0.86} /></mesh>
      <mesh position={[0, 0.51, 0]}><boxGeometry args={[12.2, 0.12, 20.1]} /><meshStandardMaterial color="#8c9995" metalness={0.16} roughness={0.74} /></mesh>
      {[-5.6, 5.6].flatMap((x) => [-9, -6, -3, 0, 3, 6, 9].map((z) => <mesh key={`anchor-${x}-${z}`} position={[x, 0.55, z]}><cylinderGeometry args={[0.08, 0.08, 0.12, 8]} /><meshStandardMaterial color="#d5c6a5" metalness={0.58} roughness={0.46} /></mesh>))}
      {/* Side glazing and the continuous curved insulated roof shell. */}
      {[-5.96, 5.96].map((x) => <group key={`sideglass-${x}`}>
        <mesh position={[x, 1.78, 0]} renderOrder={1}><boxGeometry args={[0.06, 2.56, 19.8]} /><meshPhysicalMaterial color={GREENHOUSE_CONFIG.glassTint} metalness={0.12} roughness={0.18} clearcoat={0.9} transparent opacity={GREENHOUSE_CONFIG.glassOpacity} depthWrite={false} side={2} envMapIntensity={1.1} /></mesh>
        <mesh position={[x * 0.99, 0.75, 0]}><boxGeometry args={[0.08, 0.42, 19.8]} /><meshStandardMaterial color="#b58a6e" transparent opacity={accumulatedDust} roughness={0.96} /></mesh>
        <mesh position={[x, 1.43, 0]}><boxGeometry args={[0.13, 0.12, 20.0]} /><meshStandardMaterial color="#536265" metalness={0.42} roughness={0.62} /></mesh>
      </group>)}
      <GreenhouseGlassShell />
      {[-5.8, 5.8].map((x) => <mesh key={`gutter-${x}`} position={[x, 2.8, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.12, 0.12, 20.4, 8]} /><meshStandardMaterial color="#697879" metalness={0.5} roughness={0.52} /></mesh>)}
      {[-10, 10].map((z) => <group key={`end-${z}`}><mesh position={[0, 1.4, z]}><boxGeometry args={[11.9, 2.75, 0.07]} /><meshPhysicalMaterial color={GREENHOUSE_CONFIG.glassTint} metalness={0.1} roughness={0.18} transparent opacity={0.16} depthWrite={false} side={2} /></mesh><mesh position={[0, 2.9, z]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 12, 8]} /><meshStandardMaterial color={GREENHOUSE_CONFIG.frameColor} metalness={0.55} roughness={0.46} /></mesh></group>)}
      {/* 1.25 m repeated frame bays, gasketed base, crop rows visible through glass. */}
      {bayPositions.map((z) => <mesh key={`base-gasket-${z}`} position={[0, 0.62, z]}><boxGeometry args={[12.15, 0.1, 0.1]} /><meshStandardMaterial color="#354447" roughness={0.82} /></mesh>)}
      {crops.map((crop, index) => <GreenhouseCropRow key={crop.id} crop={crop} x={index % 2 ? 3.4 : -3.4} row={Math.floor(index / 2)} />)}
      {/* Exterior entrance airlock, canopy, status/keypad, and de-dusting grate. */}
      <mesh position={[0, 0.72, 11.1]} castShadow><boxGeometry args={[4.2, 0.16, 3.1]} /><meshStandardMaterial color="#3b484b" metalness={0.38} roughness={0.68} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[-1.65 + i * 0.47, 0.82, 11.1]}><boxGeometry args={[0.04, 0.025, 2.8]} /><meshStandardMaterial color="#ddae67" metalness={0.2} roughness={0.8} /></mesh>)}
      <mesh position={[0, 3.35, 11.1]} castShadow><boxGeometry args={[4.2, 0.25, 3.0]} /><meshStandardMaterial color="#414e50" metalness={0.44} roughness={0.56} /></mesh>
      <mesh position={[0, 3.19, 11.1]}><boxGeometry args={[3.5, 0.07, 2.6]} /><meshStandardMaterial color="#efbd72" emissive="#bd7337" emissiveIntensity={0.52} /></mesh>
      <mesh position={[0, 4.25, 12.22]}><boxGeometry args={[2.65, 0.42, 0.1]} /><meshStandardMaterial color="#26383c" metalness={0.24} roughness={0.58} /></mesh>
      <mesh position={[0, 4.25, 12.29]}><boxGeometry args={[2.25, 0.16, 0.03]} /><meshStandardMaterial color="#c5e6dc" emissive="#68bdae" emissiveIntensity={0.52} /></mesh>
      <Airlock z={10.25} open={openDoor} />
      <mesh position={[1.56, 1.7, 11.57]}><boxGeometry args={[0.32, 0.58, 0.12]} /><meshStandardMaterial color="#324346" metalness={0.38} roughness={0.52} /></mesh>
      <mesh position={[1.56, 1.95, 11.64]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#7fd49d" emissive="#398252" emissiveIntensity={0.8} /></mesh>
      <mesh position={[-1.56, 2.05, 11.48]}><boxGeometry args={[0.25, 0.38, 0.1]} /><meshStandardMaterial color="#404d50" metalness={0.4} roughness={0.55} /></mesh>
      {/* Water/nutrient tanks, insulated service run, exchanger and pump cabinet. */}
      {[-1, 1].map((side) => <group key={`water-tank-${side}`} position={[side * 7.2, 0, -5.7]}>
        <mesh position={[0, 1.45, 0]} castShadow><cylinderGeometry args={[0.8, 0.8, 2.6, 12]} /><meshStandardMaterial color="#aeb9b4" metalness={0.32} roughness={0.62} /></mesh>
        {[-0.9, 0, 0.9].map((y) => <mesh key={y} position={[0, y + 1.45, 0]}><torusGeometry args={[0.82, 0.07, 6, 12]} /><meshStandardMaterial color="#667678" metalness={0.5} roughness={0.54} /></mesh>)}
      </group>)}
      <mesh position={[0, 1.2, -8.3]} castShadow><boxGeometry args={[2.8, 1.8, 1.5]} /><meshStandardMaterial color="#889592" metalness={0.32} roughness={0.68} /></mesh>
      <mesh position={[0, 2.2, -8.3]}><cylinderGeometry args={[0.44, 0.5, 0.22, 12]} /><meshStandardMaterial color="#59696b" metalness={0.48} roughness={0.5} /></mesh>
      <mesh position={[5.8, 1.1, 3.8]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.12, 0.12, 7.0, 8]} /><meshStandardMaterial color="#35494d" metalness={0.36} roughness={0.72} /></mesh>
      <mesh position={[-7.2, 2.05, 5.0]} castShadow><boxGeometry args={[1.6, 2.2, 1.6]} /><meshStandardMaterial color="#85918d" metalness={0.3} roughness={0.72} /></mesh>
      <mesh position={[-7.2, 3.18, 5.0]}><cylinderGeometry args={[0.25, 0.3, 0.48, 10]} /><meshStandardMaterial color="#758584" metalness={0.45} roughness={0.48} /></mesh>
      <mesh position={[-7.2, 3.45, 5.0]}><sphereGeometry args={[0.08, 8, 6]} /><meshStandardMaterial color="#e2b97d" emissive="#9c6537" emissiveIntensity={0.36} /></mesh>
      {/* Warm crop-light bars glow softly through the sealed glazing. */}
      {[-4.5, 0, 4.5].map((x) => <mesh key={`growlight-${x}`} position={[x, 3.65, 0]}><boxGeometry args={[0.13, 0.09, 16.5]} /><meshStandardMaterial color="#f5d7ed" emissive={GREENHOUSE_CONFIG.growLight} emissiveIntensity={GREENHOUSE_CONFIG.growLightIntensity} /></mesh>)}
    </group>
  )
}

function Laboratory({ openDoor, stormIntensity }: { openDoor: boolean; stormIntensity: number }) {
  const hull = LAB_CONFIG.palette.hull
  const frame = LAB_CONFIG.palette.frame
  const signTexture = getLabSignTexture()
  const panelCount = Math.max(5, Math.round(13 * LAB_CONFIG.propDensity))
  const glassMaterial = <meshPhysicalMaterial color={LAB_CONFIG.palette.glass} metalness={0.24} roughness={0.18} clearcoat={0.9} emissive="#bf8060" emissiveIntensity={LAB_CONFIG.windowGlow + stormIntensity * 0.18} />
  return (
    <group>
      {/* Raised regolith apron, anchored service plinth, and pressure-rated central hall. */}
      <mesh position={[0, 0.035, 0]} receiveShadow><boxGeometry args={[24.5, 0.07, 19.5]} /><meshStandardMaterial color="#8a6e60" roughness={0.98} /></mesh>
      <mesh position={[0, 0.1, 0]} castShadow receiveShadow><boxGeometry args={[23.4, 0.18, 18.6]} /><meshStandardMaterial color="#655e58" metalness={0.12} roughness={0.9} /></mesh>
      <mesh position={[0, 0.18, 0]} castShadow receiveShadow><boxGeometry args={[22.5, 0.36, 17.6]} /><meshStandardMaterial color="#82766a" roughness={0.98} /></mesh>
      <mesh position={[0, 0.42, 0]} castShadow receiveShadow><boxGeometry args={[18.9, 0.22, 13.1]} /><meshStandardMaterial color="#586568" metalness={0.32} roughness={0.82} /></mesh>
      <mesh position={[0, 2.78, 0]} castShadow receiveShadow><boxGeometry args={[LAB_CONFIG.mainWidth, 4.55, LAB_CONFIG.mainDepth]} /><meshStandardMaterial color={hull} metalness={0.17} roughness={0.69} /></mesh>
      {/* Raised observatory tower brings the central roofline to 9.2 m. */}
      <mesh position={[0, 6.8, -0.6]} castShadow><boxGeometry args={[5.2, 3.2, 5.2]} /><meshStandardMaterial color="#c5cec9" metalness={0.2} roughness={0.62} /></mesh>
      <mesh position={[0, 8.05, -0.6]} castShadow><cylinderGeometry args={[3.0, 3.0, 0.32, 16]} /><meshStandardMaterial color={frame} metalness={0.48} roughness={0.54} /></mesh>
      <mesh position={[0, 8.65, -0.6]} scale={[2.9, 1.75, 2.9]}><sphereGeometry args={[1, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} /><meshPhysicalMaterial color="#6d9294" metalness={0.26} roughness={0.2} transparent opacity={0.52} clearcoat={0.9} side={2} /></mesh>
      {Array.from({ length: 8 }, (_, index) => { const angle = index / 8 * Math.PI * 2; return <mesh key={`tower-rib-${index}`} position={[Math.cos(angle) * 1.96, 8.76, -0.6 + Math.sin(angle) * 1.96]} rotation={[0, -angle, 0]}><boxGeometry args={[0.07, 1.45, 0.08]} /><meshStandardMaterial color="#d4dbd5" metalness={0.48} roughness={0.56} /></mesh> })}
      {/* Roof cowl, dark structural edge, solar panes, antenna and weather mast. */}
      <mesh position={[0, 5.15, 0]} castShadow><boxGeometry args={[18.8, 0.36, 12.8]} /><meshStandardMaterial color={frame} metalness={0.48} roughness={0.58} /></mesh>
      <mesh position={[0, 5.36, 0]}><boxGeometry args={[17.5, 0.08, 11.6]} /><meshStandardMaterial color="#aeb9b5" metalness={0.18} roughness={0.68} /></mesh>
      {[-7.8, -5.2, -2.6, 2.6, 5.2, 7.8].map((x) => <group key={`roof-panel-${x}`} position={[x, 5.48, -2.8]} rotation={[-0.12, 0, 0]}><mesh castShadow><boxGeometry args={[2.05, 0.12, 3.7]} /><meshStandardMaterial color="#34494f" metalness={0.55} roughness={0.4} /></mesh><mesh position={[0, 0.075, 0]}><boxGeometry args={[1.9, 0.035, 3.52]} /><meshStandardMaterial color="#1d4855" metalness={0.55} roughness={0.28} /></mesh></group>)}
      <mesh position={[7.5, 7.15, 2.4]} castShadow><cylinderGeometry args={[0.08, 0.12, 3.1, 8]} /><meshStandardMaterial color="#647477" metalness={0.58} roughness={0.48} /></mesh>
      <mesh position={[7.5, 8.9, 2.4]} rotation={[0.5, 0, -0.35]}><cylinderGeometry args={[0.08, 0.5, 0.42, 16, 1, true]} /><meshStandardMaterial color="#aeb8b2" metalness={0.44} roughness={0.5} side={2} /></mesh>
      <mesh position={[7.5, 8.9, 2.4]}><sphereGeometry args={[0.11, 10, 8]} /><meshStandardMaterial color="#e38a55" emissive="#b94e2b" emissiveIntensity={0.65} /></mesh>
      <mesh position={[-7.4, 6.2, 1.5]}><cylinderGeometry args={[0.055, 0.055, 1.6, 8]} /><meshStandardMaterial color="#596a6d" metalness={0.55} roughness={0.47} /></mesh>
      {[-0.35, 0.35].map((side) => <mesh key={`weather-arm-${side}`} position={[-7.4 + side, 6.85, 1.5]}><boxGeometry args={[0.08, 0.05, 0.08]} /><meshStandardMaterial color="#d2b77d" metalness={0.35} roughness={0.55} /></mesh>)}
      <mesh position={[-7.4, 6.92, 1.5]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.95, 8]} /><meshStandardMaterial color="#d5dbd2" metalness={0.5} roughness={0.42} /></mesh>
      {[-7.88, -6.92].map((x) => <mesh key={`wind-cup-${x}`} position={[x, 6.92, 1.5]}><sphereGeometry args={[0.11, 8, 8]} /><meshStandardMaterial color={orange} metalness={0.22} roughness={0.56} /></mesh>)}
      {/* Facade frame, repeating service panels, lit observation windows, louvers. */}
      {Array.from({ length: panelCount }, (_, index) => {
        const x = -LAB_CONFIG.mainWidth / 2 + 0.95 + index * ((LAB_CONFIG.mainWidth - 1.9) / (panelCount - 1))
        return <group key={`front-panel-${index}`}>
          <mesh position={[x, 2.85, 6.07]}><boxGeometry args={[0.08, 4.2, 0.08]} /><meshStandardMaterial color={frame} metalness={0.46} roughness={0.61} /></mesh>
          {Math.abs(x) > 1.8 && <>
            <mesh position={[x, 2.85, 6.13]}><boxGeometry args={[1.08, 1.25, 0.05]} /><meshStandardMaterial color={x % 2 ? '#d8d8cc' : '#c5cbc4'} roughness={0.78} /></mesh>
            <mesh position={[x, 3.47, 6.17]}><boxGeometry args={[0.82, 0.45, 0.035]} />{glassMaterial}</mesh>
            <mesh position={[x, 3.47, 6.105]}><boxGeometry args={[0.68, 0.31, 0.02]} /><meshStandardMaterial color="#dfaa78" emissive="#be754a" emissiveIntensity={0.22 + stormIntensity * 0.18} /></mesh>
          </>}
        </group>
      })}
      {[-8.5, 8.5].map((x) => <group key={`side-rib-${x}`}><mesh position={[x, 2.8, 0]}><boxGeometry args={[0.22, 4.7, 12.2]} /><meshStandardMaterial color={frame} metalness={0.45} roughness={0.63} /></mesh>{[-4.3, -2.4, 0, 2.4, 4.3].map((z) => <mesh key={z} position={[x * 0.99, 2.8, z]}><boxGeometry args={[0.12, 4.2, 0.1]} /><meshStandardMaterial color="#899693" metalness={0.4} roughness={0.62} /></mesh>)}</group>)}
      {[-6.7, 6.7].map((x) => <mesh key={`louver-${x}`} position={[x, 1.15, 6.22]}><boxGeometry args={[1.18, 0.65, 0.12]} /><meshStandardMaterial color="#415155" metalness={0.48} roughness={0.57} /></mesh>)}
      <mesh position={[0, 1.18, 6.2]}><boxGeometry args={[5.6, 0.18, 0.16]} /><meshStandardMaterial color={teal} metalness={0.38} roughness={0.5} emissive="#286a65" emissiveIntensity={0.28} /></mesh>
      <mesh position={[0, 4.72, 6.22]}><boxGeometry args={[4.8, 0.48, 0.16]} /><meshStandardMaterial color="#26383d" metalness={0.36} roughness={0.55} /></mesh>
      <mesh position={[0, 4.72, 6.32]}><boxGeometry args={[4.3, 0.26, 0.04]} /><meshStandardMaterial color="#d8ded5" emissive="#7cbcb3" emissiveIntensity={0.32} /></mesh>
      <mesh position={[0, 4.72, 6.36]}><planeGeometry args={[4.15, 0.52]} /><meshBasicMaterial map={signTexture} toneMapped={false} /></mesh>
      <mesh position={[-1.82, 4.72, 6.36]}><boxGeometry args={[0.2, 0.14, 0.045]} /><meshStandardMaterial color={orange} emissive={orange} emissiveIntensity={0.28} /></mesh>
      <mesh position={[-1.82, 4.72, 6.39]}><torusGeometry args={[0.055, 0.018, 6, 12]} /><meshStandardMaterial color="#f1c889" emissive="#c78245" emissiveIntensity={0.42} /></mesh>
      <Airlock z={8.3} scale={1.05} open={openDoor} />
      <pointLight position={[0, 3.3, 9.35]} color="#f0bc7c" intensity={2.2 + stormIntensity * 1.4} distance={8} decay={2} />
      {/* Dust skirts, corner anchors, warning stripes and weathered lower cladding. */}
      {[-7.9, 7.9].map((x) => <group key={`dust-skirt-${x}`}><mesh position={[x, 0.78, 6.16]}><boxGeometry args={[1.0, 0.34, 0.12]} /><meshStandardMaterial color={LAB_CONFIG.palette.dust} roughness={0.98} transparent opacity={LAB_CONFIG.weathering} /></mesh><mesh position={[x, 0.62, 5.97]}><boxGeometry args={[1.15, 0.06, 0.025]} /><meshStandardMaterial color="#e4bb75" roughness={0.86} /></mesh></group>)}
      {[-10.8, 10.8].map((x) => [-7.5, 7.5].map((z) => <group key={`${x}-${z}`} position={[x, 0.55, z]}><mesh castShadow><boxGeometry args={[0.32, 0.86, 0.32]} /><meshStandardMaterial color="#5b6768" metalness={0.4} roughness={0.76} /></mesh><mesh position={[0, -0.48, 0]}><cylinderGeometry args={[0.085, 0.085, 0.32, 8]} /><meshStandardMaterial color="#d5b278" metalness={0.42} roughness={0.5} /></mesh></group>))}
      {/* Connected pressure annex, cylindrical instrument room and sealed tunnels. */}
      <mesh position={[11.3, 2.55, -1.9]} castShadow><boxGeometry args={[6.2, 4.4, 7.0]} /><meshStandardMaterial color="#cbd2cd" metalness={0.19} roughness={0.72} /></mesh>
      <mesh position={[11.3, 4.82, -1.9]} castShadow><boxGeometry args={[6.5, 0.2, 7.3]} /><meshStandardMaterial color={frame} metalness={0.48} roughness={0.56} /></mesh>
      {[9.2, 11.3, 13.4].map((x) => <mesh key={`annex-rib-${x}`} position={[x, 2.55, 1.67]}><boxGeometry args={[0.08, 4.05, 0.08]} /><meshStandardMaterial color="#687779" metalness={0.46} roughness={0.55} /></mesh>)}
      {[-3.4, -0.8].map((z) => <mesh key={`annex-window-${z}`} position={[14.43, 2.9, z]}><boxGeometry args={[0.045, 1.3, 1.75]} />{glassMaterial}</mesh>)}
      <mesh position={[-11.8, 2.1, -1.2]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[2.15, 2.15, 5.2, 16]} /><meshStandardMaterial color="#aeb9b4" metalness={0.26} roughness={0.62} /></mesh>
      {[-3.3, -1.3, 0.7, 2.7].map((z) => <mesh key={`instrument-hoop-${z}`} position={[-11.8, 2.1, -1.2 + z]} rotation={[0, 0, Math.PI / 2]}><torusGeometry args={[2.13, 0.065, 8, 16]} /><meshStandardMaterial color="#657476" metalness={0.55} roughness={0.49} /></mesh>)}
      <mesh position={[9.0, 2.8, -1.0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.85, 0.85, 3.5, 12]} /><meshStandardMaterial color="#66787a" metalness={0.35} roughness={0.65} /></mesh>
      {/* External cryogenic sample lockers, service pipework, tanks and dust skirt. */}
      {[-1, 1].map((side) => <group key={`lab-tank-${side}`} position={[side * 7.2, 0, -7.0]}><mesh position={[0, 1.45, 0]} castShadow><cylinderGeometry args={[0.72, 0.72, 2.65, 14]} /><meshStandardMaterial color="#b9c4be" metalness={0.38} roughness={0.52} /></mesh>{[-0.8, 0, 0.8].map((y) => <mesh key={y} position={[0, 1.45 + y, 0]}><torusGeometry args={[0.75, 0.065, 8, 16]} /><meshStandardMaterial color="#617073" metalness={0.54} roughness={0.46} /></mesh>)}</group>)}
      <mesh position={[-6.7, 2.0, 7.0]} castShadow><boxGeometry args={[1.9, 2.5, 1.4]} /><meshStandardMaterial color="#919d98" metalness={0.34} roughness={0.71} /></mesh>
      <mesh position={[-6.7, 3.32, 7.0]}><cylinderGeometry args={[0.26, 0.3, 0.28, 12]} /><meshStandardMaterial color="#596b6e" metalness={0.54} roughness={0.5} /></mesh>
      <mesh position={[6.0, 2.6, 6.85]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.11, 0.11, 4.4, 8]} /><meshStandardMaterial color="#45585b" metalness={0.5} roughness={0.62} /></mesh>
      <mesh position={[0, 0.58, 8.15]}><boxGeometry args={[22.6, 0.16, 0.35]} /><meshStandardMaterial color="#d4ab67" roughness={0.92} /></mesh>
      {[-9.5, -8.3, 8.3, 9.5].map((x) => <mesh key={`anchor-${x}`} position={[x, 0.58, 5.0]}><boxGeometry args={[0.24, 0.42, 0.24]} /><meshStandardMaterial color="#58686a" metalness={0.36} roughness={0.83} /></mesh>)}
      <mesh position={[-7.0, 0.16, 7.2]} rotation={[0.2, 0.35, 0]}><dodecahedronGeometry args={[1.6, 0]} /><meshStandardMaterial color="#9c5945" roughness={1} flatShading /></mesh>
      <mesh position={[7.6, 0.14, -6.8]} rotation={[0.2, 0.2, 0]}><dodecahedronGeometry args={[1.9, 0]} /><meshStandardMaterial color="#ad654c" roughness={1} flatShading /></mesh>
    </group>
  )
}

function SolarArray({ solMinute, stormIntensity, solarDust }: { solMinute: number; stormIntensity: number; solarDust: number }) {
  const tables = useRef<Array<Group | null>>([])
  const dust = Math.min(POWER_SITE_CONFIG.dustOpacityAtMax, Math.max(0, solarDust) / 100 * POWER_SITE_CONFIG.dustOpacityAtMax)
  useFrame(() => {
    const daylight = Math.sin((solMinute / 1440) * Math.PI * 2 - Math.PI / 2)
    const stowed = stormIntensity > 0.35
    const tilt = stowed ? POWER_SITE_CONFIG.panelTiltRadians.stormStow : POWER_SITE_CONFIG.panelTiltRadians.dawn + Math.max(0, daylight) * (POWER_SITE_CONFIG.panelTiltRadians.peak - POWER_SITE_CONFIG.panelTiltRadians.dawn)
    tables.current.forEach((table, index) => {
      if (!table) return
      table.rotation.x += (tilt - table.rotation.x) * 0.035
      table.rotation.z = stowed ? 0 : Math.sin(solMinute / 1440 * Math.PI * 2 + index * 0.18) * 0.025
    })
  })
  return <group>
    <mesh position={[0, 0.06, 0]} receiveShadow><boxGeometry args={[19.4, 0.12, 16.2]} /><meshStandardMaterial color="#8e786b" roughness={0.98} /></mesh>
    {Array.from({ length: POWER_SITE_CONFIG.solarTables }, (_, tableIndex) => {
      const z = (tableIndex - (POWER_SITE_CONFIG.solarTables - 1) / 2) * POWER_SITE_CONFIG.tableSpacing
      return <group key={z} position={[0, 0, z]}>
      <group ref={(node) => { tables.current[tableIndex] = node }}>
        {/* Torque tube, bearing cradles and four braced steel legs. */}
        <mesh position={[0, 1.65, 0]} rotation={[0, 0, Math.PI / 2]} castShadow><cylinderGeometry args={[0.12, 0.12, 11.7, 10]} /><meshStandardMaterial color="#607174" metalness={0.68} roughness={0.42} /></mesh>
        {[-5.45, 5.45].map((x) => <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[0.16, 1.64, 0.16]} /><meshStandardMaterial color="#687879" metalness={0.58} roughness={0.49} /></mesh>
          <mesh position={[0, 0.12, 0]}><boxGeometry args={[0.62, 0.18, 0.62]} /><meshStandardMaterial color="#9b9588" metalness={0.16} roughness={0.86} /></mesh>
          <mesh position={[0, 0.6, 0.25]} rotation={[0.35, 0, 0]}><boxGeometry args={[0.11, 0.9, 0.11]} /><meshStandardMaterial color="#536467" metalness={0.52} roughness={0.55} /></mesh>
        </group>)}
        {/* Continuous glazed surface with 12 module frames and fine photovoltaic cell lines. */}
        <mesh position={[0, 1.78, 0]} castShadow><boxGeometry args={[11.25, 0.12, 3.7]} /><meshStandardMaterial color="#8b9a98" metalness={0.58} roughness={0.42} /></mesh>
        <mesh position={[0, 1.852, 0]}><boxGeometry args={[11.08, 0.035, 3.54]} /><meshStandardMaterial color="#173b49" metalness={0.62} roughness={0.3} /></mesh>
        <mesh position={[0, 1.875, 0]}><boxGeometry args={[10.98, 0.012, 3.44]} /><meshStandardMaterial color="#245365" metalness={0.42} roughness={0.28} transparent opacity={1 - dust * 0.52} /></mesh>
        {Array.from({ length: 29 }, (_, line) => {
          const x = -5.31 + line * 0.379
          const moduleEdge = (line + 1) % 5 === 0
          return <mesh key={`cell-x-${line}`} position={[x, 1.884, 0]}><boxGeometry args={[moduleEdge ? 0.045 : 0.014, 0.012, 3.4]} /><meshStandardMaterial color={moduleEdge ? '#9cb5b1' : '#78aeb8'} metalness={0.42} roughness={0.42} /></mesh>
        })}
        {Array.from({ length: 9 }, (_, line) => <mesh key={`cell-z-${line}`} position={[0, 1.884, -1.53 + line * 0.382]}><boxGeometry args={[11.0, 0.012, line === 4 ? 0.045 : 0.014]} /><meshStandardMaterial color={line === 4 ? '#9cb5b1' : '#78aeb8'} metalness={0.42} roughness={0.42} /></mesh>)}
        {dust > 0 && <mesh position={[0, 1.895, 0]}><boxGeometry args={[10.98, 0.008, 3.44]} /><meshStandardMaterial color="#b86b49" roughness={1} transparent opacity={dust} depthWrite={false} /></mesh>}
        <mesh position={[0, 1.58, -1.95]}><boxGeometry args={[11.8, 0.14, 0.14]} /><meshStandardMaterial color="#536568" metalness={0.55} roughness={0.5} /></mesh>
        <mesh position={[0, 1.58, 1.95]}><boxGeometry args={[11.8, 0.14, 0.14]} /><meshStandardMaterial color="#536568" metalness={0.55} roughness={0.5} /></mesh>
      </group>
      <mesh position={[0, 0.14, 0]}><boxGeometry args={[12.2, 0.12, 0.3]} /><meshStandardMaterial color="#59686a" metalness={0.38} roughness={0.78} /></mesh>
      </group>
    })}
    <mesh position={[0, 0.42, 8.0]} castShadow><boxGeometry args={[2.6, 0.8, 1.8]} /><meshStandardMaterial color="#9ba7a3" metalness={0.32} roughness={0.68} /></mesh>
    <mesh position={[0, 0.88, 8.0]}><boxGeometry args={[1.8, 0.05, 0.08]} /><meshStandardMaterial color={stormIntensity > 0.35 ? '#fbbf24' : teal} emissive={stormIntensity > 0.35 ? '#80500d' : '#236d68'} emissiveIntensity={0.55} /></mesh>
    <mesh position={[0, 0.25, 7.1]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.08, 0.08, 2.0, 10]} /><meshStandardMaterial color="#35494c" metalness={0.48} roughness={0.58} /></mesh>
  </group>
}

function BatteryStorage({ powerPercent }: { powerPercent: number }) {
  const fan = useRef<Group>(null)
  const sign = useMemo(getBatterySignTexture, [])
  const status = powerPercent < 20 ? '#ef6666' : powerPercent < 40 ? '#f0ad48' : '#71d7a2'
  useFrame((_, delta) => { if (fan.current) fan.current.rotation.z += Math.min(delta, 0.05) * (powerPercent < 10 ? 0.35 : 1.8) })
  return <group>
    {/* Larger service pad with perimeter curb, drainage joint and painted access lane. */}
    <mesh position={[0, 0.12, 0]} castShadow receiveShadow><boxGeometry args={[16.4, 0.24, 12.4]} /><meshStandardMaterial color="#666f70" metalness={0.12} roughness={0.88} /></mesh>
    <mesh position={[0, 0.26, 0]}><boxGeometry args={[15.7, 0.08, 11.7]} /><meshStandardMaterial color="#a6a49b" roughness={0.9} /></mesh>
    {[-7.65, 7.65].flatMap((x) => [-5.55, 5.55].map((z) => <mesh key={`${x}-${z}`} position={[x, 0.42, z]}><boxGeometry args={[0.42, 0.25, 0.42]} /><meshStandardMaterial color="#59696a" metalness={0.36} roughness={0.72} /></mesh>))}
    {/* Three clearly separated battery containers, with end doors, ribs, vents and service lights. */}
    {[-4.6, 0, 4.6].map((x, index) => <group key={x} position={[x, 0, -0.45]}>
      <mesh position={[0, 1.72, 0]} castShadow><boxGeometry args={[3.9, 2.9, 5.4]} /><meshStandardMaterial color={index === 1 ? '#c7cec6' : '#b8c2bc'} metalness={0.27} roughness={0.62} /></mesh>
      <mesh position={[0, 3.22, 0]} castShadow><boxGeometry args={[4.02, 0.14, 5.52]} /><meshStandardMaterial color="#657477" metalness={0.58} roughness={0.48} /></mesh>
      {Array.from({ length: 9 }, (_, rib) => <mesh key={rib} position={[-1.72 + rib * 0.43, 1.72, 2.74]}><boxGeometry args={[0.06, 2.65, 0.055]} /><meshStandardMaterial color="#899795" metalness={0.48} roughness={0.56} /></mesh>)}
      <mesh position={[0, 0.82, 2.78]}><boxGeometry args={[3.25, 0.16, 0.06]} /><meshStandardMaterial color={index === 1 ? '#e0a552' : '#568b88'} metalness={0.24} roughness={0.62} /></mesh>
      <mesh position={[-1.15, 1.7, 2.79]}><boxGeometry args={[0.68, 1.75, 0.08]} /><meshStandardMaterial color="#536467" metalness={0.38} roughness={0.54} /></mesh>
      <mesh position={[0, 2.8, 2.78]}><boxGeometry args={[1.55, 0.34, 0.08]} /><meshStandardMaterial color="#26383d" metalness={0.24} roughness={0.58} /></mesh>
      <mesh position={[0, 2.8, 2.83]}><planeGeometry args={[1.35, 0.22]} /><meshBasicMaterial color="#d5e5d9" /></mesh>
      <mesh position={[0, 2.25, 2.79]}><planeGeometry args={[2.65, 0.54]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      <mesh position={[1.48, 1.16, 2.82]}><boxGeometry args={[0.38, 0.38, 0.035]} /><meshStandardMaterial color="#e4b34f" emissive="#6f4c15" emissiveIntensity={0.2} /></mesh>
      <mesh position={[1.48, 1.16, 2.85]}><planeGeometry args={[0.25, 0.25]} /><meshBasicMaterial color="#27383c" /></mesh>
      {[-1.35, 1.35].map((ventX) => <group key={ventX} position={[ventX, 3.0, -2.2]}><mesh><boxGeometry args={[0.8, 0.16, 0.65]} /><meshStandardMaterial color="#536467" metalness={0.45} roughness={0.54} /></mesh>{[-0.22, 0, 0.22].map((v) => <mesh key={v} position={[0, v, 0.34]}><boxGeometry args={[0.66, 0.035, 0.035]} /><meshStandardMaterial color="#aebbb4" metalness={0.48} /></mesh>)}</group>)}
      {[-0.55, 0.55].map((lightX) => <mesh key={lightX} position={[lightX, 0.62, 2.82]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={index === 1 ? status : '#6ed6a4'} emissive={index === 1 ? status : '#246b4a'} emissiveIntensity={0.9} /></mesh>)}
    </group>)}
    {/* Inverter and transformer cabinet with a readable live power bar. */}
    <group position={[6.75, 0, 3.3]}>
      <mesh position={[0, 1.25, 0]} castShadow><boxGeometry args={[2.25, 2.35, 1.6]} /><meshStandardMaterial color="#768581" metalness={0.36} roughness={0.62} /></mesh>
      <mesh position={[0, 1.32, 0.83]}><boxGeometry args={[1.55, 1.05, 0.06]} /><meshStandardMaterial color="#26383d" metalness={0.28} roughness={0.55} /></mesh>
      <mesh position={[0, 1.32, 0.88]}><boxGeometry args={[1.22, 0.18, 0.025]} /><meshStandardMaterial color="#3b4a4b" /></mesh>
      <mesh position={[-0.61 + Math.max(0, Math.min(100, powerPercent)) * 0.0061, 1.32, 0.9]}><boxGeometry args={[Math.max(0.02, powerPercent * 0.0122), 0.12, 0.03]} /><meshStandardMaterial color={status} emissive={status} emissiveIntensity={0.55} /></mesh>
      <mesh position={[0, 0.62, 0.84]}><boxGeometry args={[0.78, 0.27, 0.035]} /><meshStandardMaterial color={status} emissive={status} emissiveIntensity={0.75} /></mesh>
    </group>
    {/* Ventilation control hut and a three-blade cooling fan. */}
    <group position={[-6.5, 0, 3.25]}>
      <mesh position={[0, 1.22, 0]} castShadow><boxGeometry args={[2.6, 2.3, 2.2]} /><meshStandardMaterial color="#9ea9a3" metalness={0.24} roughness={0.7} /></mesh>
      <mesh position={[0, 2.42, 0]}><boxGeometry args={[2.8, 0.16, 2.4]} /><meshStandardMaterial color="#526265" metalness={0.48} roughness={0.54} /></mesh>
      <mesh position={[0, 1.45, 1.13]}><torusGeometry args={[0.42, 0.07, 8, 18]} /><meshStandardMaterial color="#425357" metalness={0.58} /></mesh>
      <group ref={fan} position={[0, 1.45, 1.19]}><mesh><cylinderGeometry args={[0.07, 0.07, 0.08, 10]} /><meshStandardMaterial color="#c5cec8" metalness={0.6} /></mesh>{[0, 1, 2].map((blade) => <mesh key={blade} rotation={[0, 0, blade * Math.PI * 2 / 3]} position={[0, 0.2, 0]}><boxGeometry args={[0.08, 0.34, 0.045]} /><meshStandardMaterial color="#aebbb4" metalness={0.48} /></mesh>)}</group>
    </group>
    <Airlock x={-6.5} z={1.2} scale={0.52} />
    {[-5.1, 5.0].map((x) => <mesh key={x} position={[x, 2.9, -3.3]}><cylinderGeometry args={[0.08, 0.1, 0.55, 10]} /><meshStandardMaterial color="#657477" metalness={0.55} roughness={0.5} /></mesh>)}
    <mesh position={[0, 0.55, 6.28]}><boxGeometry args={[4.2, 0.7, 0.12]} /><meshStandardMaterial color="#26383d" metalness={0.24} roughness={0.6} /></mesh>
    <mesh position={[0, 0.55, 6.35]}><boxGeometry args={[3.5, 0.22, 0.035]} /><meshStandardMaterial color="#c9e1d5" emissive="#6eb9a0" emissiveIntensity={0.3} /></mesh>
    <mesh position={[-0.9, 0.34, 6.45]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color={status} emissive={status} emissiveIntensity={0.9} /></mesh>
    {/* Bollards, emergency stop and lightning mast define the service perimeter. */}
    {[-7.4, -3.8, 0, 3.8, 7.4].flatMap((x) => [-5.6, 5.6].map((z) => <group key={`bollard-${x}-${z}`} position={[x, 0, z]}><mesh position={[0, 0.68, 0]} castShadow><cylinderGeometry args={[0.12, 0.16, 1.25, 8]} /><meshStandardMaterial color="#59696a" metalness={0.46} roughness={0.56} /></mesh><mesh position={[0, 1.1, 0]}><torusGeometry args={[0.13, 0.035, 6, 10]} /><meshStandardMaterial color="#dc7847" /></mesh></group>))}
    <group position={[8.8, 0, 3.4]}><mesh position={[0, 0.75, 0]} castShadow><boxGeometry args={[0.48, 1.5, 0.42]} /><meshStandardMaterial color="#b85f48" metalness={0.18} roughness={0.7} /></mesh><mesh position={[0, 1.25, 0.23]}><boxGeometry args={[0.25, 0.25, 0.05]} /><meshStandardMaterial color="#f2cfaa" emissive="#b6633b" emissiveIntensity={0.35} /></mesh></group>
    <group position={[8.3, 0, -5.1]}><mesh position={[0, 3.0, 0]} castShadow><cylinderGeometry args={[0.055, 0.085, 6.0, 8]} /><meshStandardMaterial color="#778582" metalness={0.55} roughness={0.5} /></mesh><mesh position={[0, 6.05, 0]}><sphereGeometry args={[0.14, 10, 8]} /><meshStandardMaterial color="#f29a64" emissive="#d95137" emissiveIntensity={0.9} /></mesh></group>
    {Array.from({ length: 13 }, (_, i) => <mesh key={`conduit-${i}`} position={[-6 + i, 0.34, -6.1]}><boxGeometry args={[0.48, 0.1, 0.18]} /><meshStandardMaterial color="#415357" metalness={0.48} roughness={0.66} /></mesh>)}
  </group>
}

export const ROVER_GARAGE_CONFIG = {
  width: 18,
  depth: 12,
  clearHeight: 5.2,
  roofPeak: 6.4,
  bayWidth: 6.6,
  bayHeight: 4.3,
  bayCount: 2,
  apronWidth: 18,
  apronDepth: 15,
  doorSpeed: 5.5,
  palette: { hull: '#bfc8c3', frame: '#47585c', dark: '#26383d', glass: '#3a777c', teal: '#5cc7bd', orange: '#df814d', safety: '#e2b85e', concrete: '#8b8981' },
} as const

function RoverGarage({ open }: { open: boolean }) {
  const panels = useRef<Array<Group | null>>([])
  const beacon = useRef<Group>(null)
  const sign = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 1024
    canvas.height = 192
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#172c32'
    ctx.fillRect(0, 0, 1024, 192)
    ctx.fillStyle = '#df814d'
    ctx.fillRect(0, 0, 22, 192)
    ctx.fillRect(1002, 0, 22, 192)
    ctx.fillStyle = '#e8e7dd'
    ctx.font = 'bold 78px Arial'
    ctx.fillText('ROVER GARAGE', 54, 91)
    ctx.fillStyle = '#72c9bd'
    ctx.font = 'bold 30px Arial'
    ctx.fillText('MARS SURFACE VEHICLE SERVICE  ·  OUTPOST ALPHA', 58, 145)
    const texture = new CanvasTexture(canvas)
    texture.colorSpace = SRGBColorSpace
    return texture
  }, [])
  useEffect(() => () => sign.dispose(), [sign])
  useFrame((state, delta) => {
    const blend = 1 - Math.exp(-ROVER_GARAGE_CONFIG.doorSpeed * Math.min(delta, 0.05))
    panels.current.forEach((panel, index) => {
      if (!panel) return
      const closedY = 0.45 + index * 0.48
      const openY = 4.58 + index * 0.075
      const targetY = open ? openY : closedY
      const targetZ = open ? 5.55 - index * 0.055 : 5.78
      panel.position.y += (targetY - panel.position.y) * blend
      panel.position.z += (targetZ - panel.position.z) * blend
    })
    if (beacon.current) beacon.current.rotation.y = state.clock.elapsedTime * 1.4
  })
  const metal = '#73817f'
  const rail = '#34474b'
  const lamp = '#f5d29a'
  return (
    <group>
      {/* Concrete hangar slab and broad, tapered approach apron. */}
      <mesh position={[0, 0.12, 0]} receiveShadow castShadow><boxGeometry args={[18.6, 0.24, 12.7]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.concrete} roughness={0.94} /></mesh>
      <mesh position={[0, 0.07, 13.3]} receiveShadow><boxGeometry args={[18.2, 0.14, 15]} /><meshStandardMaterial color="#979087" roughness={0.98} /></mesh>
      {Array.from({ length: 8 }, (_, i) => <mesh key={`apron-joint-${i}`} position={[-8.1 + i * 2.31, 0.145, 13.3]}><boxGeometry args={[0.025, 0.008, 14.4]} /><meshStandardMaterial color="#6e706d" roughness={1} /></mesh>)}
      {[-3.35, 3.35].map((x) => <group key={`lane-${x}`} position={[x, 0.16, 13.15]}><mesh><boxGeometry args={[0.12, 0.025, 13.9]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.safety} emissive="#4d3921" emissiveIntensity={0.16} /></mesh>{Array.from({ length: 7 }, (_, i) => <mesh key={i} position={[0, 0.012, -5.5 + i * 1.8]}><boxGeometry args={[0.055, 0.018, 0.62]} /><meshStandardMaterial color="#f1d17b" /></mesh>)}</group>)}
      <mesh position={[0, 0.17, 18.5]} rotation={[-Math.PI / 2, 0, 0]}><shapeGeometry args={[(() => { const shape = new Shape(); shape.moveTo(-0.55, -0.5); shape.lineTo(0.55, -0.5); shape.lineTo(0.55, 0.15); shape.lineTo(1.1, 0.15); shape.lineTo(0, 1.15); shape.lineTo(-1.1, 0.15); shape.lineTo(-0.55, 0.15); shape.closePath(); return shape })()]} /><meshBasicMaterial color="#e2b85e" /></mesh>
      {[-1.65, 1.65].map((x) => <group key={x}>{Array.from({ length: 8 }, (_, i) => <mesh key={i} position={[x, 0.16, 11.0 + i * 1.2]}><boxGeometry args={[0.95, 0.012, 0.17]} /><meshStandardMaterial color="#514f4b" transparent opacity={0.14 + i * 0.015} /></mesh>)}</group>)}
      {/* Gently pitched two-wing roof, broad canopy, and structural frame. */}
      <mesh position={[0, 5.28, 0]} castShadow><boxGeometry args={[18.1, 0.34, 12.2]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.frame} metalness={0.5} roughness={0.6} /></mesh>
      <mesh position={[-4.45, 5.88, 0]} rotation={[0, 0, 0.13]} castShadow><boxGeometry args={[9.9, 0.32, 13.7]} /><meshStandardMaterial color="#bac4bf" metalness={0.24} roughness={0.69} /></mesh>
      <mesh position={[4.45, 5.88, 0]} rotation={[0, 0, -0.13]} castShadow><boxGeometry args={[9.9, 0.32, 13.7]} /><meshStandardMaterial color="#cbd2cb" metalness={0.2} roughness={0.68} /></mesh>
      {[-5.5, -2.75, 0, 2.75, 5.5].map((z) => <group key={`truss-${z}`} position={[0, 4.98, z]}><mesh><boxGeometry args={[17.0, 0.12, 0.16]} /><meshStandardMaterial color={rail} metalness={0.56} roughness={0.52} /></mesh>{[-6.2, -3.1, 0, 3.1, 6.2].map((x) => <mesh key={x} position={[x, 0.28, 0]} rotation={[0, 0, x < 0 ? -0.08 : 0.08]}><boxGeometry args={[0.09, 0.62, 0.1]} /><meshStandardMaterial color={metal} metalness={0.5} roughness={0.55} /></mesh>)}</group>)}
      {/* Main hangar volume, side-office and tool-store annex. */}
      <mesh position={[-8.7, 2.75, -3.95]} castShadow receiveShadow><boxGeometry args={[0.6, 5.35, 3.1]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.hull} metalness={0.2} roughness={0.72} /></mesh>
      <mesh position={[-8.7, 2.75, 2.2]} castShadow receiveShadow><boxGeometry args={[0.6, 5.35, 7.0]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.hull} metalness={0.2} roughness={0.72} /></mesh>
      <mesh position={[-8.7, 4.65, -1.3]} castShadow><boxGeometry args={[0.6, 1.55, 2.9]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.hull} metalness={0.2} roughness={0.72} /></mesh>
      <mesh position={[8.7, 2.75, 0]} castShadow receiveShadow><boxGeometry args={[0.6, 5.35, 11.6]} /><meshStandardMaterial color="#b7c1bc" metalness={0.22} roughness={0.72} /></mesh>
      <mesh position={[0, 2.75, -5.7]} castShadow receiveShadow><boxGeometry args={[17.4, 5.35, 0.6]} /><meshStandardMaterial color="#c3cbc5" metalness={0.2} roughness={0.72} /></mesh>
      {[-6.15, 6.15].map((x) => <mesh key={x} position={[x, 2.65, 5.75]} castShadow><boxGeometry args={[5.1, 5.15, 0.55]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.hull} metalness={0.22} roughness={0.72} /></mesh>)}
      <mesh position={[0, 5.05, 5.74]} castShadow><boxGeometry args={[7.2, 0.7, 0.58]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.frame} metalness={0.48} roughness={0.58} /></mesh>
      {[-8.2, -5.2, 5.2, 8.2].map((x) => <mesh key={x} position={[x, 2.7, 5.92]}><boxGeometry args={[0.16, 5.2, 0.18]} /><meshStandardMaterial color={metal} metalness={0.55} roughness={0.48} /></mesh>)}
      <mesh position={[0, 5.45, 6.28]} castShadow><boxGeometry args={[8.5, 0.25, 2.25]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.frame} metalness={0.52} roughness={0.5} /></mesh>
      <mesh position={[0, 5.15, 6.45]}><boxGeometry args={[6.85, 0.12, 0.12]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} emissive="#6c351b" emissiveIntensity={0.2} /></mesh>
      {/* Animated 9-section roll-up bay door with guides, vision slit and motor hood. */}
      {[-3.38, 3.38].map((x) => <group key={x}><mesh position={[x, 2.45, 5.98]}><boxGeometry args={[0.18, 4.72, 0.22]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.frame} metalness={0.58} roughness={0.46} /></mesh><mesh position={[x, 2.45, 6.12]}><boxGeometry args={[0.055, 4.55, 0.035]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.safety} emissive="#493914" emissiveIntensity={0.16} /></mesh></group>)}
      {Array.from({ length: 9 }, (_, i) => <group key={`door-panel-${i}`} ref={(node) => { panels.current[i] = node }} position={[0, 0.45 + i * 0.48, 5.78]}><mesh castShadow><boxGeometry args={[6.55, 0.44, 0.1]} /><meshStandardMaterial color={i % 2 ? '#58696a' : '#6b7a78'} metalness={0.4} roughness={0.56} /></mesh><mesh position={[0, 0.15, 0.06]}><boxGeometry args={[6.45, 0.035, 0.02]} /><meshStandardMaterial color="#9aa6a0" metalness={0.5} roughness={0.45} /></mesh>{i === 5 && <mesh position={[0, 0, 0.065]}><boxGeometry args={[1.15, 0.21, 0.022]} /><meshPhysicalMaterial color="#8ac6c4" emissive="#326864" emissiveIntensity={0.35} roughness={0.18} transparent opacity={0.7} /></mesh>}</group>)}
      <mesh position={[0, 4.72, 5.83]} castShadow><boxGeometry args={[7.45, 0.42, 0.62]} /><meshStandardMaterial color="#36494d" metalness={0.55} roughness={0.48} /></mesh>
      <mesh position={[0, 4.72, 6.16]}><boxGeometry args={[6.7, 0.12, 0.055]} /><meshStandardMaterial color="#a7b3ae" metalness={0.48} roughness={0.5} /></mesh>
      {[-3.55, 3.55].map((x) => <group key={x} position={[x, 4.6, 6.5]}><mesh><boxGeometry args={[0.22, 0.28, 0.14]} /><meshStandardMaterial color="#2b3839" /></mesh><mesh position={[0, 0.17, 0.08]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color={open ? '#72dc9b' : '#e15c4c'} emissive={open ? '#31b86c' : '#bb3329'} emissiveIntensity={0.9} /></mesh></group>)}
      {/* Person airlock on the west wall with a bright portal and keypad. */}
      <mesh position={[-9.03, 1.55, -1.3]} castShadow><boxGeometry args={[0.2, 3.1, 1.85]} /><meshStandardMaterial color="#34474b" metalness={0.44} roughness={0.52} /></mesh>
      <mesh position={[-8.84, 1.45, -1.3]}><boxGeometry args={[0.055, 2.45, 1.35]} /><meshStandardMaterial color="#273b40" metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[-8.79, 1.6, -1.3]}><boxGeometry args={[0.025, 1.35, 0.9]} /><meshPhysicalMaterial color="#5d9d9d" emissive="#214b49" emissiveIntensity={0.28} transparent opacity={0.48} /></mesh>
      <mesh position={[-9.0, 3.2, -1.3]}><boxGeometry args={[1.0, 0.18, 2.45]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} emissive="#a44d28" emissiveIntensity={0.35} /></mesh>
      <mesh position={[-9.33, 1.25, 0.1]}><boxGeometry args={[0.08, 0.48, 0.32]} /><meshStandardMaterial color="#334649" metalness={0.35} roughness={0.55} /></mesh>
      <mesh position={[-9.39, 1.37, 0.1]}><boxGeometry args={[0.035, 0.18, 0.22]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.teal} emissive="#287f78" emissiveIntensity={0.65} /></mesh>
      {/* Office/control room module, glazed toward the bay. */}
      <mesh position={[10.95, 2.2, -0.55]} castShadow><boxGeometry args={[4.6, 4.35, 7.8]} /><meshStandardMaterial color="#aebbb5" metalness={0.22} roughness={0.68} /></mesh>
      <mesh position={[8.61, 2.65, -0.55]}><boxGeometry args={[0.05, 1.8, 5.2]} /><meshPhysicalMaterial color="#75b9b7" metalness={0.16} roughness={0.18} transparent opacity={0.3} side={2} /></mesh>
      <mesh position={[8.56, 2.65, -0.55]}><boxGeometry args={[0.1, 2.05, 5.48]} /><meshStandardMaterial color={rail} wireframe metalness={0.5} /></mesh>
      <mesh position={[10.95, 4.45, -0.55]}><boxGeometry args={[4.75, 0.14, 8.0]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} metalness={0.22} roughness={0.58} /></mesh>
      {/* Small parts annex, cladding seams, vents, bolts and bumper rails. */}
      <mesh position={[-11.05, 1.72, -1.0]} castShadow><boxGeometry args={[4.1, 3.42, 5.3]} /><meshStandardMaterial color="#8b9894" metalness={0.28} roughness={0.74} /></mesh>
      <mesh position={[-11.05, 3.5, -1.0]}><boxGeometry args={[4.3, 0.18, 5.5]} /><meshStandardMaterial color={rail} metalness={0.52} roughness={0.55} /></mesh>
      {[-7.9, 7.9].map((x) => <group key={x}>{[-4.5, -2.5, 0, 2.5, 4.5].map((z) => <mesh key={z} position={[x, 2.7, z]}><boxGeometry args={[0.07, 4.7, 0.1]} /><meshStandardMaterial color="#899692" metalness={0.38} roughness={0.62} /></mesh>)}<mesh position={[x * 1.025, 0.72, 0]}><boxGeometry args={[0.12, 0.22, 10.4]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} metalness={0.18} roughness={0.72} /></mesh><mesh position={[x * 1.025, 1.08, 0]}><boxGeometry args={[0.12, 0.12, 10.4]} /><meshStandardMaterial color="#36474a" metalness={0.5} roughness={0.55} /></mesh></group>)}
      {[-3.2, -1.6, 0, 1.6, 3.2].map((z) => <mesh key={z} position={[0, 2.8, z]}><boxGeometry args={[17.2, 0.07, 0.09]} /><meshStandardMaterial color="#6c7978" metalness={0.42} roughness={0.6} /></mesh>)}
      {[-4.8, 4.8].map((x) => <group key={x} position={[x, 0, 5.98]}><mesh position={[0, 2.65, 0]}><boxGeometry args={[0.08, 5.2, 0.08]} /><meshStandardMaterial color={rail} metalness={0.5} /></mesh>{[0.6, 1.5, 2.4, 3.3, 4.2].map((y) => <mesh key={y} position={[0, y, 0.08]}><boxGeometry args={[0.08, 0.42, 0.04]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.safety} /></mesh>)}</group>)}
      <mesh position={[0, 4.78, 6.55]}><planeGeometry args={[5.8, 0.62]} /><meshBasicMaterial map={sign} toneMapped={false} /></mesh>
      <mesh position={[-2.55, 4.0, 6.5]}><planeGeometry args={[1.25, 0.34]} /><meshBasicMaterial color="#f1d19a" toneMapped={false} /></mesh>
      <mesh position={[2.55, 4.0, 6.5]}><planeGeometry args={[1.25, 0.34]} /><meshBasicMaterial color="#f1d19a" toneMapped={false} /></mesh>
      {/* Interior two-bay markings, service pit, drains and Bay 1 dock. */}
      {[-4.2, 4.2].map((x, bay) => <group key={bay} position={[x, 0.26, -0.1]}><mesh><boxGeometry args={[0.08, 0.024, 8.8]} /><meshStandardMaterial color={bay === 0 ? ROVER_GARAGE_CONFIG.palette.teal : ROVER_GARAGE_CONFIG.palette.safety} emissive={bay === 0 ? '#1e726d' : '#513e1c'} emissiveIntensity={0.22} /></mesh><mesh position={[0, 0.015, 0]}><boxGeometry args={[7.4, 0.02, 0.08]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.safety} /></mesh><mesh position={[0, 0.04, -4.35]}><boxGeometry args={[2.0, 0.035, 0.025]} /><meshStandardMaterial color="#d9ded3" /></mesh></group>)}
      <mesh position={[-4.2, 0.3, -4.35]}><planeGeometry args={[1.5, 0.26]} /><meshBasicMaterial color="#e2e1d7" /></mesh>
      <mesh position={[0, 0.27, 0.8]}><boxGeometry args={[1.15, 0.035, 5.4]} /><meshStandardMaterial color="#323b3c" roughness={0.9} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <mesh key={`drain-${i}`} position={[7.8, 0.28, -4.7 + i * 0.75]}><boxGeometry args={[0.22, 0.025, 0.52]} /><meshStandardMaterial color="#374446" metalness={0.48} roughness={0.54} /></mesh>)}
      {/* Gantry crane, hoist and cable reels. */}
      {[-3.5, 3.5].map((x) => <mesh key={x} position={[x, 4.72, -0.1]}><boxGeometry args={[0.17, 0.16, 10.5]} /><meshStandardMaterial color={rail} metalness={0.6} roughness={0.48} /></mesh>)}
      <mesh position={[0, 4.52, 0.4]}><boxGeometry args={[7.2, 0.23, 0.22]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} metalness={0.4} roughness={0.5} /></mesh>
      <mesh position={[0, 4.12, 0.4]}><cylinderGeometry args={[0.045, 0.045, 0.7, 8]} /><meshStandardMaterial color="#647174" metalness={0.64} roughness={0.42} /></mesh>
      <mesh position={[0, 3.72, 0.4]}><torusGeometry args={[0.22, 0.045, 8, 14]} /><meshStandardMaterial color="#e0b55e" metalness={0.42} roughness={0.5} /></mesh>
      {[-5.5, 0, 5.5].map((x) => <group key={x} position={[x, 0, -0.6]}><mesh position={[0, 4.72, 0]}><boxGeometry args={[0.22, 0.1, 1.15]} /><meshStandardMaterial color={lamp} emissive="#bc9b5f" emissiveIntensity={0.75} /></mesh><pointLight position={[0, 4.5, 0]} color="#dbe6dc" intensity={0.42} distance={9} /></group>)}
      {/* Workshop benches, tool wall, wheel racks, battery lockers and stocked bins. */}
      <group position={[-6.0, 0, -3.8]}><mesh position={[0, 1.02, 0]} castShadow><boxGeometry args={[4.7, 0.18, 1.2]} /><meshStandardMaterial color="#8e9994" metalness={0.32} roughness={0.56} /></mesh>{[-2.05, 2.05].map((x) => <mesh key={x} position={[x, 0.5, 0]}><boxGeometry args={[0.12, 1.0, 0.12]} /><meshStandardMaterial color={rail} metalness={0.52} /></mesh>)}<mesh position={[0, 2.25, -0.55]}><boxGeometry args={[4.6, 1.8, 0.12]} /><meshStandardMaterial color="#48585a" metalness={0.26} roughness={0.65} /></mesh>{Array.from({ length: 18 }, (_, i) => <mesh key={i} position={[-2.0 + (i % 9) * 0.5, 2.15 + Math.floor(i / 9) * 0.48, -0.46]} rotation={[0, 0, i % 3 * 0.12]}><boxGeometry args={[0.055, 0.36 + i % 2 * 0.12, 0.08]} /><meshStandardMaterial color={i % 4 ? '#bfc5bc' : ROVER_GARAGE_CONFIG.palette.orange} metalness={0.34} roughness={0.55} /></mesh>)}</group>
      {[-7.8, 7.8].map((x) => <group key={x} position={[x, 0, -0.4]}>{[0.85, 1.9, 2.95].map((y, i) => <mesh key={y} position={[0, y, 0]}><torusGeometry args={[0.62, 0.11, 8, 18]} /><meshStandardMaterial color={i === 0 ? '#3e4d50' : '#6e7775'} metalness={0.28} roughness={0.78} /></mesh>)}<mesh position={[0, 1.9, -0.05]}><cylinderGeometry args={[0.07, 0.07, 2.9, 8]} /><meshStandardMaterial color="#455659" metalness={0.55} /></mesh></group>)}
      {[-6.9, -5.4, -3.9].map((x) => <group key={x} position={[x, 0, -1.8]}><mesh position={[0, 1.05, 0]} castShadow><boxGeometry args={[1.25, 1.8, 0.9]} /><meshStandardMaterial color={x === -5.4 ? '#b36b43' : '#4c5b5d'} metalness={0.25} roughness={0.6} /></mesh>{[0.55, 1.05, 1.55].map((y) => <mesh key={y} position={[0, y, 0.47]}><boxGeometry args={[0.84, 0.25, 0.04]} /><meshStandardMaterial color="#d1b783" /></mesh>)}</group>)}
      {/* Office telemetry desk and wall displays inside the glazed side module. */}
      <group position={[10.6, 0, -0.55]}><mesh position={[0, 1.12, 0]} castShadow><boxGeometry args={[3.2, 0.18, 1.2]} /><meshStandardMaterial color="#657477" metalness={0.42} roughness={0.54} /></mesh>{[-1.35, 1.35].map((x) => <mesh key={x} position={[x, 0.56, 0]}><boxGeometry args={[0.12, 1.1, 0.12]} /><meshStandardMaterial color={rail} metalness={0.54} /></mesh>)}{[-0.95, 0, 0.95].map((x) => <mesh key={x} position={[x, 2.25, -0.45]}><boxGeometry args={[0.78, 0.62, 0.06]} /><meshStandardMaterial color="#18333a" emissive="#327b7c" emissiveIntensity={0.38} /></mesh>)}<mesh position={[0.25, 1.22, 0.3]}><cylinderGeometry args={[0.11, 0.11, 0.08, 12]} /><meshStandardMaterial color="#d3b98b" roughness={0.7} /></mesh></group>
      {/* Exterior charging post, service tanks, pipework, tool crates and floodlights. */}
      <group position={[8.6, 0, 1.1]}><mesh position={[0, 1.05, 0]} castShadow><boxGeometry args={[0.72, 2.1, 0.6]} /><meshStandardMaterial color="#45575a" metalness={0.42} roughness={0.52} /></mesh><mesh position={[0, 1.7, 0.33]}><boxGeometry args={[0.4, 0.34, 0.04]} /><meshStandardMaterial color="#16383b" emissive="#64d2a6" emissiveIntensity={0.62} /></mesh><mesh position={[0.45, 1.0, -0.38]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.42, 0.045, 8, 18]} /><meshStandardMaterial color="#35484a" metalness={0.48} /></mesh><mesh position={[0, 0.5, 0.56]}><cylinderGeometry args={[0.035, 0.035, 1.6, 8]} /><meshStandardMaterial color="#27383b" /></mesh></group>
      {[-10.0, 10.0].map((x) => <group key={x} position={[x, 0, -5.0]}><mesh position={[0, 1.35, 0]} castShadow><cylinderGeometry args={[0.72, 0.72, 2.5, 14]} /><meshStandardMaterial color="#bfc7c0" metalness={0.34} roughness={0.55} /></mesh>{[-0.8, 0, 0.8].map((y) => <mesh key={y} position={[0, 1.35 + y, 0]}><torusGeometry args={[0.76, 0.06, 8, 16]} /><meshStandardMaterial color={rail} metalness={0.55} /></mesh>)}</group>)}
      {[-13.2, 13.2].map((x) => <group key={x} position={[x, 0, 8.0]}><mesh position={[0, 3.1, 0]} castShadow><cylinderGeometry args={[0.09, 0.13, 6.2, 8]} /><meshStandardMaterial color="#586769" metalness={0.48} /></mesh><mesh position={[0, 6.25, 0]}><boxGeometry args={[0.72, 0.18, 0.72]} /><meshStandardMaterial color={lamp} emissive="#e2a96a" emissiveIntensity={1.05} /></mesh><pointLight position={[0, 5.8, 0]} color="#ffc981" intensity={1.0} distance={15} /></group>)}
      {[-7.7, 7.7].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 5.9, 0]}><boxGeometry args={[0.2, 0.1, 11.0]} /><meshStandardMaterial color="#46585a" metalness={0.52} /></mesh><mesh position={[0, 5.78, 0]}><boxGeometry args={[0.8, 0.05, 0.36]} /><meshStandardMaterial color={lamp} emissive="#d79f5b" emissiveIntensity={0.8} /></mesh></group>)}
      {/* Roof HVAC, solar strips, comm dish, antenna and rotating warning beacon. */}
      <mesh position={[5.7, 6.12, -2.3]} castShadow><boxGeometry args={[3.2, 0.72, 2.4]} /><meshStandardMaterial color="#778481" metalness={0.4} roughness={0.62} /></mesh>
      {[-3, 3].map((x) => <group key={x} position={[x, 6.11, -3.3]}>{[-0.65, 0, 0.65].map((z) => <mesh key={z} position={[0, 0.4, z]}><boxGeometry args={[0.06, 0.62, 0.42]} /><meshStandardMaterial color="#536366" /></mesh>)}</group>)}
      {[-3.2, 0, 3.2].map((x) => <group key={x} position={[x, 6.14, 1.8]} rotation={[-0.16, 0, -0.1]}><mesh><boxGeometry args={[2.65, 0.08, 2.35]} /><meshStandardMaterial color="#294953" metalness={0.54} roughness={0.38} /></mesh><mesh position={[0, 0.055, 0]}><boxGeometry args={[2.48, 0.025, 2.18]} /><meshStandardMaterial color="#285c66" metalness={0.4} roughness={0.3} /></mesh></group>)}
      <group position={[-6.0, 6.35, -3.1]} rotation={[0.7, 0, 0]}><mesh><cylinderGeometry args={[0.08, 0.08, 2.2, 8]} /><meshStandardMaterial color="#556568" metalness={0.5} /></mesh><mesh position={[0, 1.12, 0]}><sphereGeometry args={[0.08, 10, 8]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.teal} emissive="#257e77" emissiveIntensity={0.65} /></mesh></group>
      <group position={[7.2, 6.45, -4.0]}><mesh><cylinderGeometry args={[0.18, 0.18, 0.18, 10]} /><meshStandardMaterial color={rail} metalness={0.58} /></mesh><mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.55, 0.72, 0.08, 18, 1, true]} /><meshStandardMaterial color="#aab6b0" metalness={0.42} side={2} /></mesh><mesh position={[0, 1.18, 0]}><cylinderGeometry args={[0.045, 0.045, 1.35, 8]} /><meshStandardMaterial color={rail} metalness={0.55} /></mesh></group>
      <group ref={beacon} position={[-7.0, 6.4, 4.25]}><mesh><cylinderGeometry args={[0.13, 0.18, 0.32, 12]} /><meshStandardMaterial color="#59696b" metalness={0.48} /></mesh><mesh position={[0, 0.24, 0]}><sphereGeometry args={[0.19, 12, 10]} /><meshStandardMaterial color="#ef7557" emissive="#ec4c31" emissiveIntensity={1.2} /></mesh><pointLight position={[0, 0.24, 0]} color="#ff6148" intensity={0.32} distance={4} /></group>
      <pointLight position={[0, 4.15, 6.6]} color="#ffc985" intensity={3.1} distance={15} decay={2} />
      <pointLight position={[0, 3.5, 1.8]} color="#b7ded6" intensity={0.8} distance={12} />
      {/* Mission bay numbers and hazard blocks on both jambs. */}
      {[-2.55, 2.55].map((x, i) => <group key={i} position={[x, 3.95, 6.57]}><mesh><boxGeometry args={[1.35, 0.36, 0.035]} /><meshStandardMaterial color="#25383c" /></mesh><mesh position={[0, 0, 0.025]}><planeGeometry args={[1.22, 0.26]} /><meshBasicMaterial color="#e6d6a9" /></mesh></group>)}
      {[-3.1, 3.1].map((x) => <mesh key={x} position={[x, 0.27, 5.95]} rotation={[0, 0, Math.PI / 2]}><boxGeometry args={[0.62, 0.035, 0.2]} /><meshStandardMaterial color={ROVER_GARAGE_CONFIG.palette.orange} /></mesh>)}
    </group>
  )
}

function Structure({ building, doorOpen, crops, stormIntensity, solMinute, powerPercent, solarDust }: { building: ColonyBuilding; doorOpen: boolean; crops: CropPlot[]; stormIntensity: number; solMinute: number; powerPercent: number; solarDust: number }) {
  const content = {
    habitat: <Habitat openDoor={doorOpen} />,
    greenhouse: <Greenhouse openDoor={doorOpen} crops={crops} stormIntensity={stormIntensity} />,
    laboratory: <Laboratory openDoor={doorOpen} stormIntensity={stormIntensity} />,
    'solar-array': <SolarArray solMinute={solMinute} stormIntensity={stormIntensity} solarDust={solarDust} />,
    'battery-storage': <BatteryStorage powerPercent={powerPercent} />,
    'rover-garage': <RoverGarage open={doorOpen} />,
  }[building.id]
  return (
    <group position={[building.x, building.y, building.z]} rotation={[0, building.rotation, 0]}>
      {building.id === 'laboratory'
        ? <mesh position={[0, 0.08, 0]} receiveShadow><boxGeometry args={[22.8, 0.16, 18]} /><meshStandardMaterial color="#aa8b78" roughness={0.96} /></mesh>
        : building.id === 'rover-garage' || building.id === 'solar-array' || building.id === 'battery-storage' ? null
          : <mesh position={[0, 0.08, 0]} receiveShadow><cylinderGeometry args={[building.radius, building.radius + 0.32, 0.16, 32]} /><meshStandardMaterial color="#aa8b78" roughness={0.96} /></mesh>}
      {content}
      <mesh position={[0, 0.2, -building.radius - 0.35]} castShadow>
        <boxGeometry args={[0.62, 0.42, 0.18]} /><meshStandardMaterial color="#4d5b5e" metalness={0.2} roughness={0.66} />
      </mesh>
      <mesh position={[0, 0.43, -building.radius - 0.39]}>
        <boxGeometry args={[0.18, 0.025, 0.025]} /><meshStandardMaterial color={teal} emissive="#236d68" emissiveIntensity={0.45} />
      </mesh>
    </group>
  )
}

function WalkingNetwork({ siteId, buildings }: { siteId: LandingSiteId; buildings: ColonyBuilding[] }) {
  const geometry = useMemo(() => {
    const habitat = buildings.find((building) => building.id === 'habitat')!
    const positions: number[] = []
    const indices: number[] = []
    for (const building of buildings) {
      if (building.id === 'habitat') continue
      const dx = building.x - habitat.x
      const dz = building.z - habitat.z
      const length = Math.hypot(dx, dz)
      const ux = dx / length
      const uz = dz / length
      const start = new Vector3(habitat.x + ux * (habitat.radius * 0.7), 0, habitat.z + uz * (habitat.radius * 0.7))
      const end = new Vector3(building.x - ux * (building.radius * 0.72), 0, building.z - uz * (building.radius * 0.72))
      const sideX = -uz * 0.72
      const sideZ = ux * 0.72
      const baseIndex = positions.length / 3
      const segments = 16
      for (let index = 0; index <= segments; index += 1) {
        const t = index / segments
        const x = start.x + (end.x - start.x) * t
        const z = start.z + (end.z - start.z) * t
        const y = getTerrainHeight(siteId, x, z) + 0.055
        positions.push(x - sideX, y, z - sideZ, x + sideX, y, z + sideZ)
        if (index < segments) {
          const current = baseIndex + index * 2
          indices.push(current, current + 1, current + 2, current + 1, current + 3, current + 2)
        }
      }
    }
    const path = new BufferGeometry()
    path.setAttribute('position', new Float32BufferAttribute(positions, 3))
    path.setIndex(indices)
    path.computeVertexNormals()
    return path
  }, [buildings, siteId])
  useEffect(() => () => geometry.dispose(), [geometry])
  return <mesh geometry={geometry} receiveShadow><meshStandardMaterial color="#a98b78" roughness={0.98} side={2} /></mesh>
}

function CableNetwork({ siteId, buildings }: { siteId: LandingSiteId; buildings: ColonyBuilding[] }) {
  const geometry = useMemo(() => {
    const byId = new Map(buildings.map((building) => [building.id, building]))
    const links: Array<[BuildingId, BuildingId]> = [
      ['solar-array', 'battery-storage'],
      ['battery-storage', 'habitat'],
      ['habitat', 'greenhouse'],
      ['habitat', 'laboratory'],
    ]
    return links.map(([fromId, toId]) => {
      const from = byId.get(fromId)!
      const to = byId.get(toId)!
      const dx = to.x - from.x
      const dz = to.z - from.z
      const length = Math.hypot(dx, dz)
      const startX = from.x + (dx / length) * (from.radius * 0.72)
      const startZ = from.z + (dz / length) * (from.radius * 0.72)
      const endX = to.x - (dx / length) * (to.radius * 0.72)
      const endZ = to.z - (dz / length) * (to.radius * 0.72)
      const curvePoints = Array.from({ length: 9 }, (_, index) => {
        const t = index / 8
        const x = startX + (endX - startX) * t
        const z = startZ + (endZ - startZ) * t
        return new Vector3(x, getTerrainHeight(siteId, x, z) + 0.17, z)
      })
      return new TubeGeometry(new CatmullRomCurve3(curvePoints), 18, 0.075, 6, false)
    })
  }, [buildings, siteId])
  useEffect(() => () => geometry.forEach((cable) => cable.dispose()), [geometry])
  return <group>{geometry.map((cable, index) => <mesh key={index} geometry={cable} receiveShadow><meshStandardMaterial color="#35494c" metalness={0.48} roughness={0.58} /></mesh>)}</group>
}

function CommunicationsMast({ siteId, habitat }: { siteId: LandingSiteId; habitat: ColonyBuilding }) {
  const x = habitat.x + 9
  const z = habitat.z - 3
  const y = getTerrainHeight(siteId, x, z)
  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.16, 0]} castShadow><cylinderGeometry args={[0.74, 0.92, 0.32, 16]} /><meshStandardMaterial color="#626f70" metalness={0.38} roughness={0.75} /></mesh>
      <mesh position={[0, 2.55, 0]} castShadow><cylinderGeometry args={[0.13, 0.2, 4.8, 10]} /><meshStandardMaterial color="#9ca7a3" metalness={0.55} roughness={0.52} /></mesh>
      <mesh position={[0, 4.9, 0]} rotation={[0.34, 0, 0]} castShadow><cylinderGeometry args={[0.28, 0.58, 0.38, 18, 1, true]} /><meshStandardMaterial color="#778382" metalness={0.48} roughness={0.5} side={2} /></mesh>
      <mesh position={[0, 4.9, 0.45]}><sphereGeometry args={[0.08, 12, 8]} /><meshStandardMaterial color={teal} emissive="#216c67" emissiveIntensity={0.45} /></mesh>
      <mesh position={[0.52, 3.9, 0]}><boxGeometry args={[0.8, 0.08, 0.08]} /><meshStandardMaterial color="#647274" metalness={0.55} roughness={0.46} /></mesh>
      <mesh position={[0.92, 3.93, 0]}><boxGeometry args={[0.08, 0.55, 0.08]} /><meshStandardMaterial color="#647274" metalness={0.55} roughness={0.46} /></mesh>
      {[-0.5, 0.5].map((side) => <mesh key={side} position={[side, 0.42, 0]} rotation={[0, 0, side * -0.15]}><cylinderGeometry args={[0.07, 0.08, 0.7, 8]} /><meshStandardMaterial color="#596768" metalness={0.38} roughness={0.72} /></mesh>)}
    </group>
  )
}

function ColonyBuildings({ siteId, doorOpenBuildingId, crops, stormIntensity, solMinute, powerPercent, solarDust }: { siteId: LandingSiteId; doorOpenBuildingId: BuildingId | null; crops: CropPlot[]; stormIntensity: number; solMinute: number; powerPercent: number; solarDust: number }) {
  const buildings = useMemo(() => getColonyLayout(siteId), [siteId])

  return (
    <group>
      <WalkingNetwork siteId={siteId} buildings={buildings} />
      <CableNetwork siteId={siteId} buildings={buildings} />
      {buildings.map((building) => <Structure key={building.id} building={building} doorOpen={doorOpenBuildingId === building.id} crops={crops} stormIntensity={stormIntensity} solMinute={solMinute} powerPercent={powerPercent} solarDust={solarDust} />)}
      <CommunicationsMast siteId={siteId} habitat={buildings.find((building) => building.id === 'habitat')!} />
    </group>
  )
}

export default ColonyBuildings
