import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { LandingSiteId } from '../../game/data/landingSites'
import type { InteriorBuildingId } from '../../game/data/gameplay'
import type { CropPlot } from '../../game/state/colonyState'
import { GreenhouseCropRow, GreenhouseGlassShell, GREENHOUSE_CONFIG } from './GreenhouseKit'
import { LAB_CONFIG } from './ColonyBuildings'

function Console({ position, color = '#61c9bf' }: { position: [number, number, number]; color?: string }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.52, 0]} castShadow><boxGeometry args={[1.15, 1.05, 0.54]} /><meshStandardMaterial color="#657477" metalness={0.42} roughness={0.58} /></mesh>
      <mesh position={[0, 1.12, -0.29]} rotation={[-0.12, 0, 0]}><boxGeometry args={[0.95, 0.6, 0.055]} /><meshStandardMaterial color="#1c3035" metalness={0.45} roughness={0.32} /></mesh>
      <mesh position={[0, 1.12, -0.25]} rotation={[-0.12, 0, 0]}><boxGeometry args={[0.78, 0.43, 0.018]} /><meshStandardMaterial color="#244b4d" emissive={color} emissiveIntensity={0.24} roughness={0.42} /></mesh>
      {[-0.28, 0.28].map((x) => <mesh key={x} position={[x, 0.99, -0.23]}><sphereGeometry args={[0.04, 8, 8]} /><meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.7} /></mesh>)}
    </group>
  )
}

function InnerAirlockDoor({ open, z }: { open: boolean; z: number }) {
  const door = useRef<Group>(null)
  useFrame((_, delta) => {
    if (door.current) {
      const target = open ? -1.35 : 0
      door.current.rotation.y += (target - door.current.rotation.y) * (1 - Math.exp(-8 * Math.min(delta, 0.05)))
    }
  })
  return <group ref={door} position={[-0.78, 0, z]}><mesh position={[0.78, 1.3, 0]} castShadow><boxGeometry args={[1.56, 2.4, 0.12]} /><meshStandardMaterial color="#34484b" metalness={0.4} roughness={0.5} /></mesh></group>
}

function HabitatInterior({ openDoor }: { openDoor: boolean }) {
  const innerDoor = useRef<Group>(null)
  useFrame((_, delta) => {
    if (innerDoor.current) {
      const target = openDoor ? -1.35 : 0
      innerDoor.current.rotation.y += (target - innerDoor.current.rotation.y) * (1 - Math.exp(-8 * Math.min(delta, 0.05)))
    }
  })
  return (
    <group>
      {/* Broad modular deck, 28 × 18 m circulation envelope. */}
      <mesh position={[0, 0.12, 0]} receiveShadow><boxGeometry args={[28, 0.24, 18]} /><meshStandardMaterial color="#687476" roughness={0.88} /></mesh>
      {Array.from({ length: 13 }, (_, i) => <mesh key={`floor-seam-${i}`} position={[-12 + i * 2, 0.245, 0]}><boxGeometry args={[0.025, 0.012, 17.4]} /><meshStandardMaterial color="#9aa39e" metalness={0.3} roughness={0.65} /></mesh>)}
      {[-13.8, 13.8].map((x) => <group key={x}><mesh position={[x, 2.2, 0]} castShadow><boxGeometry args={[0.3, 4.2, 17.8]} /><meshStandardMaterial color="#c7cfca" metalness={0.16} roughness={0.72} /></mesh>{[-6, -3, 0, 3, 6].map((z) => <mesh key={z} position={[x * 0.98, 2.2, z]}><boxGeometry args={[0.12, 4.0, 0.14]} /><meshStandardMaterial color="#7e8a88" metalness={0.46} roughness={0.58} /></mesh>)}</group>)}
      {/* Open 8 m atrium and its ribs; no low ceiling blocks the camera. */}
      {[-5.5, -2.75, 0, 2.75, 5.5].map((x) => <group key={x} position={[x, 7.45, -1]}><mesh><boxGeometry args={[0.16, 0.12, 12.8]} /><meshStandardMaterial color="#71807f" metalness={0.48} roughness={0.54} /></mesh><mesh position={[0, 0.05, 0]}><boxGeometry args={[1.8, 0.04, 11.8]} /><meshStandardMaterial color="#9eb6b3" transparent opacity={0.16} roughness={0.18} /></mesh></group>)}
      {[-8, -4, 0, 4, 8].map((x) => <group key={`light-${x}`} position={[x, 5.2, -1]}><mesh><boxGeometry args={[1.5, 0.08, 0.36]} /><meshStandardMaterial color="#f2e8cf" emissive="#e8c986" emissiveIntensity={0.42} /></mesh><pointLight position={[0, -0.4, 0]} color="#ffe2b3" intensity={0.45} distance={8} /></group>)}
      {/* Wide, bright center aisle with floor guidance strips. */}
      {[-1.55, 1.55].map((x) => <mesh key={`guide-${x}`} position={[x, 0.27, 0]}><boxGeometry args={[0.045, 0.025, 15.2]} /><meshStandardMaterial color="#62d2c6" emissive="#2faaa0" emissiveIntensity={0.65} /></mesh>)}
      {/* Command centre: curved console wall and live mission display. */}
      <group position={[-9.3, 0, -5.6]}>
        <mesh position={[0, 1.35, 0]} castShadow><boxGeometry args={[6.6, 1.9, 0.8]} /><meshStandardMaterial color="#657579" metalness={0.36} roughness={0.62} /></mesh>
        {[-2.1, 0, 2.1].map((x) => <mesh key={x} position={[x, 2.5, 0.43]}><boxGeometry args={[1.75, 1.05, 0.07]} /><meshStandardMaterial color="#16353d" emissive="#238c8b" emissiveIntensity={0.38} roughness={0.36} /></mesh>)}
        <mesh position={[0, 3.25, -0.35]}><boxGeometry args={[7.2, 0.09, 0.08]} /><meshStandardMaterial color="#e5b776" emissive="#bd7e43" emissiveIntensity={0.5} /></mesh>
        <mesh position={[0, 0.38, 1.3]}><cylinderGeometry args={[0.34, 0.38, 0.7, 12]} /><meshStandardMaterial color="#455457" metalness={0.36} roughness={0.7} /></mesh>
      </group>
      {/* Ryan's command console retained at its existing interaction point. */}
      <Console position={[-3.95, 0.36, 1.42]} />
      {/* Living quarters: four bunks and lockers in the rear wing. */}
      {[-11.4, -8.2, 8.2, 11.4].map((x, i) => <group key={`bunk-${i}`} position={[x, 0, -1.0]}>
        <mesh position={[0, 0.74, 0]} castShadow><boxGeometry args={[2.25, 0.48, 3.5]} /><meshStandardMaterial color="#8d9995" roughness={0.8} /></mesh>
        <mesh position={[0, 1.05, 0]}><boxGeometry args={[2.18, 0.12, 3.38]} /><meshStandardMaterial color={i % 2 ? '#c3b8a1' : '#b2c8bf'} roughness={0.95} /></mesh>
        <mesh position={[0, 1.85, -1.55]} castShadow><boxGeometry args={[2.15, 1.55, 0.24]} /><meshStandardMaterial color="#4e5c60" metalness={0.2} roughness={0.78} /></mesh>
        <mesh position={[0.72, 2.05, -1.39]}><boxGeometry args={[0.7, 0.36, 0.04]} /><meshStandardMaterial color="#e3b66d" emissive="#ad723c" emissiveIntensity={0.2} /></mesh>
      </group>)}
      {/* Mess / galley to front left with worktop and food storage. */}
      <group position={[-9.5, 0, 5.4]}><mesh position={[0, 0.95, 0]} castShadow><boxGeometry args={[6.0, 0.18, 2.2]} /><meshStandardMaterial color="#b6bcb4" metalness={0.16} roughness={0.65} /></mesh>{[-2.2, 2.2].map((x) => <mesh key={x} position={[x, 0.48, 0]}><boxGeometry args={[0.12, 0.9, 1.8]} /><meshStandardMaterial color="#586568" metalness={0.34} roughness={0.7} /></mesh>)}{[-1.8, 0, 1.8].map((x) => <mesh key={`cab-${x}`} position={[x, 1.7, -1.1]} castShadow><boxGeometry args={[1.4, 1.25, 0.35]} /><meshStandardMaterial color="#a8b2ae" roughness={0.7} /></mesh>)}</group>
      {/* Medical bay at front right: beds, privacy screens and treatment monitor. */}
      <group position={[9.3, 0, 5.2]}>{[-2.0, 2.0].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[2.25, 0.34, 4.3]} /><meshStandardMaterial color="#d2d5cb" roughness={0.72} /></mesh><mesh position={[0, 1.1, -1.8]}><boxGeometry args={[2.2, 0.12, 0.7]} /><meshStandardMaterial color="#9bafaa" roughness={0.88} /></mesh><mesh position={[0, 1.65, -2.25]}><boxGeometry args={[2.0, 1.25, 0.15]} /><meshStandardMaterial color="#6d7b7b" roughness={0.7} /></mesh></group>)}<mesh position={[0, 2.4, -2.2]}><boxGeometry args={[2.8, 1.1, 0.08]} /><meshStandardMaterial color="#1b353d" emissive="#318c86" emissiveIntensity={0.35} /></mesh></group>
      {/* Greenhouse / botanical wall at mid-left, with vivid plants and grow strips. */}
      <group position={[-9.5, 0, 0.0]}>{[-2.5, 0, 2.5].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 0.55, 0]} castShadow><boxGeometry args={[1.65, 0.65, 4.8]} /><meshStandardMaterial color="#554b3d" roughness={0.95} /></mesh>{[-1.3, 0, 1.3].map((z) => <mesh key={z} position={[0, 1.15, z]} castShadow><sphereGeometry args={[0.32, 7, 6]} /><meshStandardMaterial color="#6d965c" roughness={0.9} /></mesh>)}</group>)}<mesh position={[0, 3.2, 0]}><boxGeometry args={[7.6, 0.08, 0.15]} /><meshStandardMaterial color="#e5da9b" emissive="#d2be6e" emissiveIntensity={0.8} /></mesh></group>
      {/* Lab workbench and sample scanner on mid-right. */}
      <group position={[9.2, 0, -0.2]}><mesh position={[0, 0.85, 0]} castShadow><boxGeometry args={[5.8, 0.18, 2.0]} /><meshStandardMaterial color="#aab3ae" metalness={0.24} roughness={0.58} /></mesh>{[-2.2, 2.2].map((x) => <mesh key={x} position={[x, 0.45, 0]}><boxGeometry args={[0.14, 0.8, 1.6]} /><meshStandardMaterial color="#58676a" metalness={0.32} roughness={0.66} /></mesh>)}<mesh position={[0, 1.55, -0.7]} castShadow><boxGeometry args={[1.15, 1.2, 1.0]} /><meshStandardMaterial color="#778985" metalness={0.38} roughness={0.56} /></mesh><mesh position={[0, 2.25, -0.7]}><torusGeometry args={[0.35, 0.08, 8, 14]} /><meshStandardMaterial color="#6ad6ca" emissive="#2aa99d" emissiveIntensity={0.8} /></mesh>{[-1.8, 0, 1.8].map((x) => <mesh key={`can-${x}`} position={[x, 1.13, 0.18]}><cylinderGeometry args={[0.22, 0.24, 0.48, 10]} /><meshStandardMaterial color="#b4a17b" roughness={0.62} /></mesh>)}</group>
      {/* Life-support equipment remains at its current interaction point. */}
      <mesh position={[0, 1.25, -7.5]} castShadow><boxGeometry args={[4.2, 1.75, 0.65]} /><meshStandardMaterial color="#adb6b2" metalness={0.25} roughness={0.64} /></mesh>
      <mesh position={[0, 1.72, -7.15]}><boxGeometry args={[3.1, 0.65, 0.045]} /><meshStandardMaterial color="#263b40" emissive="#246865" emissiveIntensity={0.3} /></mesh>
      {/* Airlock vestibule at the front; wide door and illuminated direction marks. */}
      <mesh position={[0, 2.1, 8.65]}><boxGeometry args={[3.5, 4.0, 0.22]} /><meshStandardMaterial color="#7e8d89" metalness={0.42} roughness={0.58} /></mesh>
      <group ref={innerDoor} position={[-0.8, 0, 8.52]}><mesh position={[0.8, 1.35, 0]} castShadow><boxGeometry args={[1.6, 2.55, 0.12]} /><meshStandardMaterial color="#35484d" metalness={0.42} roughness={0.5} /></mesh></group>
      <mesh position={[0, 3.62, 8.52]}><boxGeometry args={[2.3, 0.1, 0.15]} /><meshStandardMaterial color="#e5b776" emissive="#bd7e43" emissiveIntensity={0.5} /></mesh>
    </group>
  )
}

function GreenhouseInterior({ crops, openDoor }: { crops: CropPlot[]; openDoor: boolean }) {
  return (
    <group>
      {/* 20 × 12 m room, anti-slip metal grating and drain channels. */}
      <mesh position={[0, 0.13, 0]} receiveShadow><boxGeometry args={[12, 0.26, 20]} /><meshStandardMaterial color="#657477" metalness={0.28} roughness={0.72} /></mesh>
      {Array.from({ length: 16 }, (_, i) => <mesh key={`grate-${i}`} position={[-5.6 + i * 0.75, 0.27, 0]}><boxGeometry args={[0.035, 0.025, 19.1]} /><meshStandardMaterial color="#9ba8a3" metalness={0.58} roughness={0.48} /></mesh>)}
      {[-1.2, 1.2].map((x) => <mesh key={`drain-${x}`} position={[x, 0.29, 0]}><boxGeometry args={[0.12, 0.045, 18.8]} /><meshStandardMaterial color="#3b4c4e" metalness={0.4} roughness={0.6} /></mesh>)}
      {/* Roof ribs remain visible, while roof glazing is culled around the third-person camera. */}
      <GreenhouseGlassShell roof={false} />
      {[-5.96, 5.96].map((x) => <group key={`glass-wall-${x}`}>
        <mesh position={[x, 1.55, 0]} renderOrder={1}><boxGeometry args={[0.06, 2.5, 19.6]} /><meshPhysicalMaterial color={GREENHOUSE_CONFIG.glassTint} metalness={0.1} roughness={0.18} clearcoat={0.8} transparent opacity={0.18} depthWrite={false} side={2} /></mesh>
        <mesh position={[x * 0.99, 0.7, 0]}><boxGeometry args={[0.09, 0.42, 19.5]} /><meshStandardMaterial color="#b58a6e" roughness={0.96} /></mesh>
      </group>)}
      {/* Raised beds with steel edging, substrate, drip lines and live saved crop growth. */}
      {[-3.4, 3.4].map((x, bedIndex) => <group key={`bed-${x}`} position={[x, 0, 0]}>
        {/* Open steel planter frame replaces the old solid, block-like bed body. */}
        {[-1.04, 1.04].map((edge) => <mesh key={`support-${edge}`} position={[edge, 0.42, 0]}><boxGeometry args={[0.12, 0.34, 14.45]} /><meshStandardMaterial color="#657477" metalness={0.5} roughness={0.58} /></mesh>)}
        {[-6.3, 0, 6.3].flatMap((z) => [-0.98, 0.98].map((edge) => <mesh key={`leg-${z}-${edge}`} position={[edge, 0.39, z]} castShadow><boxGeometry args={[0.1, 0.3, 0.1]} /><meshStandardMaterial color="#899692" metalness={0.46} roughness={0.58} /></mesh>))}
        {/* Narrow hydroponic channels keep the planter open instead of filling it with a solid slab. */}
        {[-0.58, 0, 0.58].map((channel) => <mesh key={`channel-${channel}`} position={[channel, 0.84, 0]}><boxGeometry args={[0.16, 0.035, 14.25]} /><meshStandardMaterial color="#596b6c" metalness={0.38} roughness={0.66} /></mesh>)}
        {[-1.04, 1.04].map((edge) => <mesh key={edge} position={[edge, 0.78, 0]}><boxGeometry args={[0.1, 0.4, 14.8]} /><meshStandardMaterial color="#899692" metalness={0.46} roughness={0.58} /></mesh>)}
        {[-7.35, 7.35].map((z) => <mesh key={`end-rail-${z}`} position={[0, 0.78, z]}><boxGeometry args={[2.05, 0.4, 0.1]} /><meshStandardMaterial color="#899692" metalness={0.46} roughness={0.58} /></mesh>)}
        <mesh position={[0, 0.91, 0]} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.035, 0.035, 14.3, 6]} /><meshStandardMaterial color="#3f8b82" metalness={0.12} roughness={0.62} /></mesh>
        <mesh position={[0, 1.13, 6.9]}><boxGeometry args={[1.2, 0.28, 0.06]} /><meshStandardMaterial color="#344548" metalness={0.3} roughness={0.66} /></mesh>
        <mesh position={[0, 1.15, 6.86]}><boxGeometry args={[0.86, 0.13, 0.025]} /><meshStandardMaterial color="#e4d7b1" roughness={0.88} /></mesh>
        <mesh position={[0, 1.0, -6.9]}><boxGeometry args={[1.0, 0.18, 0.06]} /><meshStandardMaterial color="#35494c" metalness={0.26} roughness={0.65} /></mesh>
        {crops.filter((_, index) => index % 2 === bedIndex).map((crop, cropIndex) => <GreenhouseCropRow key={crop.id} crop={crop} x={0} row={cropIndex} />)}
      </group>)}
      {/* Back-wall vertical farm racks and seed/work station. */}
      <group position={[0, 0, -8.2]}>
        {[-2.8, 0, 2.8].map((x) => <group key={x} position={[x, 0, 0]}>
          <mesh position={[0, 1.8, 0]} castShadow><boxGeometry args={[2.2, 3.2, 0.38]} /><meshStandardMaterial color="#687779" metalness={0.38} roughness={0.58} /></mesh>
          {[0.8, 1.8, 2.8].map((y) => <mesh key={y} position={[0, y, 0.25]}><boxGeometry args={[1.9, 0.12, 0.78]} /><meshStandardMaterial color="#58684d" roughness={0.88} /></mesh>)}
          {[1.15, 2.15, 3.1].map((y) => <mesh key={`led-${y}`} position={[0, y, 0.53]}><boxGeometry args={[1.8, 0.06, 0.08]} /><meshStandardMaterial color="#f5d7ed" emissive={GREENHOUSE_CONFIG.growLight} emissiveIntensity={0.75} /></mesh>)}
        </group>)}
      </group>
      <group position={[-4.65, 0, -7.5]}><mesh position={[0, 0.9, 0]} castShadow><boxGeometry args={[2.2, 0.16, 1.5]} /><meshStandardMaterial color="#aab4ae" metalness={0.24} roughness={0.58} /></mesh><mesh position={[0, 1.5, -0.55]}><boxGeometry args={[1.7, 1.0, 0.08]} /><meshStandardMaterial color="#1a353c" emissive="#398e84" emissiveIntensity={0.28} /></mesh>{[-0.7, 0.7].map((x) => <mesh key={x} position={[x, 0.46, 0]}><boxGeometry args={[0.12, 0.85, 0.12]} /><meshStandardMaterial color="#536265" metalness={0.38} roughness={0.65} /></mesh>)}</group>
      {/* Water/nutrient tanks, pump, climate console and retained grow-light interaction location. */}
      {[-4.9, 4.9].map((x) => <group key={`tank-${x}`} position={[x, 0, -8.4]}><mesh position={[0, 1.18, 0]} castShadow><cylinderGeometry args={[0.52, 0.52, 2.15, 12]} /><meshStandardMaterial color="#aebbb5" metalness={0.36} roughness={0.58} /></mesh>{[-0.7, 0, 0.7].map((y) => <mesh key={y} position={[0, 1.18 + y, 0]}><torusGeometry args={[0.54, 0.055, 6, 12]} /><meshStandardMaterial color="#657779" metalness={0.48} roughness={0.5} /></mesh>)}</group>)}
      <group position={[0, 0.34, -2.6]} rotation={[0, Math.PI, 0]}><Console position={[0, 0, 0]} color="#d7c27f" /></group>
      <mesh position={[5.15, 1.36, -5.55]} castShadow><cylinderGeometry args={[0.42, 0.5, 1.9, 14]} /><meshStandardMaterial color="#a8b4af" metalness={0.35} roughness={0.6} /></mesh>
      <mesh position={[5.15, 2.36, -5.55]}><torusGeometry args={[0.43, 0.05, 8, 18]} /><meshStandardMaterial color="#4e7777" metalness={0.45} roughness={0.46} /></mesh>
      {[-4.5, 0, 4.5].map((x) => <group key={`light-${x}`} position={[x, 0, 0]}><mesh position={[0, 4.32, 0]}><boxGeometry args={[0.14, 0.1, 17.5]} /><meshStandardMaterial color="#f0ddef" emissive={GREENHOUSE_CONFIG.growLight} emissiveIntensity={0.92} /></mesh><pointLight position={[0, 4.0, 0]} color="#d78fd2" intensity={0.75} distance={12} /></group>)}
      {/* Airlock portal, floor threshold, equipment sign and status markers. */}
      <mesh position={[0, 2.15, 9.25]}><boxGeometry args={[3.4, 4.2, 0.18]} /><meshStandardMaterial color="#7f8f8c" metalness={0.44} roughness={0.56} /></mesh>
      <InnerAirlockDoor open={openDoor} z={9.12} />
      <mesh position={[0, 3.72, 9.12]}><boxGeometry args={[2.5, 0.1, 0.15]} /><meshStandardMaterial color="#71cfb3" emissive="#3caa85" emissiveIntensity={0.48} /></mesh>
      <mesh position={[0, 0.32, 9.55]}><boxGeometry args={[4.2, 0.08, 0.72]} /><meshStandardMaterial color="#ae956d" roughness={0.98} /></mesh>
      {/* Seating nook and harvest crates. */}
      <mesh position={[-4.7, 0.55, 7.5]} castShadow><boxGeometry args={[2.1, 0.28, 0.72]} /><meshStandardMaterial color="#8c9892" roughness={0.78} /></mesh>
      {[-1, 1].map((side) => <mesh key={side} position={[side * 4.8, 0.5, 6.8]} castShadow><boxGeometry args={[0.8, 0.7, 0.8]} /><meshStandardMaterial color="#8a704f" roughness={0.9} /></mesh>)}
    </group>
  )
}

function LaboratoryInterior({ openDoor }: { openDoor: boolean }) {
  const partition = '#788987'
  const bench = '#a9b5b0'
  const glass = '#7fc7c0'
  return (
    <>
      {/* 18 × 12 m deck with a wide center aisle and four connected work rooms. */}
      <mesh position={[0, 0.16, -1.3]} receiveShadow><boxGeometry args={[LAB_CONFIG.innerWidth, 0.32, LAB_CONFIG.innerDepth]} /><meshStandardMaterial color="#606f70" roughness={0.86} /></mesh>
      <mesh position={[0, 0.34, -1.3]}><boxGeometry args={[LAB_CONFIG.innerWidth - 0.45, 0.045, LAB_CONFIG.innerDepth - 0.45]} /><meshStandardMaterial color="#899794" metalness={0.24} roughness={0.65} /></mesh>
      {Array.from({ length: 17 }, (_, i) => <mesh key={`floor-seam-${i}`} position={[-8.2 + i * 1.025, 0.37, -1.3]}><boxGeometry args={[0.025, 0.012, 11.45]} /><meshStandardMaterial color="#a6b0aa" metalness={0.34} roughness={0.6} /></mesh>)}

      {/* Wall shell, viewing windows, and modular ribs. */}
      {[-(LAB_CONFIG.innerWidth / 2 - 0.15), LAB_CONFIG.innerWidth / 2 - 0.15].map((x) => <group key={`wall-${x}`}>
        <mesh position={[x, 2.32, -1.3]} castShadow><boxGeometry args={[0.3, 4.6, LAB_CONFIG.innerDepth]} /><meshStandardMaterial color="#cbd3ce" metalness={0.16} roughness={0.7} /></mesh>
        {[-5.4, -2.8, -0.2, 2.4].map((z) => <mesh key={z} position={[x * 0.99, 2.3, z]}><boxGeometry args={[0.12, 4.35, 0.13]} /><meshStandardMaterial color={partition} metalness={0.46} roughness={0.55} /></mesh>)}
        {[-4.3, 1.8].map((z) => <group key={`window-${z}`} position={[x * 0.982, 2.35, z]}><mesh><boxGeometry args={[0.07, 1.45, 2.05]} /><meshPhysicalMaterial color="#804f42" emissive="#d98e62" emissiveIntensity={0.3} roughness={0.2} metalness={0.12} transparent opacity={0.68} side={2} /></mesh><mesh position={[-Math.sign(x) * 0.08, 0, 0]}><boxGeometry args={[0.12, 1.72, 2.28]} /><meshStandardMaterial color="#46595b" metalness={0.48} roughness={0.48} wireframe /></mesh></group>)}
      </group>)}
      <mesh position={[0, 2.3, -1.3 - LAB_CONFIG.innerDepth / 2 + 0.3]} castShadow><boxGeometry args={[LAB_CONFIG.innerWidth, 4.6, 0.28]} /><meshStandardMaterial color="#cbd3ce" metalness={0.16} roughness={0.7} /></mesh>
      {[-6.4, 0, 6.4].map((x) => <group key={`panorama-${x}`} position={[x, 2.72, -6.84]}><mesh><boxGeometry args={[3.6, 1.45, 0.06]} /><meshPhysicalMaterial color="#b96f53" emissive="#864b3b" emissiveIntensity={0.2} roughness={0.2} metalness={0.12} transparent opacity={0.76} /></mesh><mesh position={[0, 0, 0.05]}><boxGeometry args={[3.83, 1.68, 0.1]} /><meshStandardMaterial color="#536366" metalness={0.48} roughness={0.5} wireframe /></mesh></group>)}
      {/* Glazed room dividers form a cold store, clean room, workshop and briefing bay. */}
      {[-3.42, 3.42].map((x) => <group key={`wing-partition-${x}`}>
        {[-3.9, 2.45].map((z) => <mesh key={z} position={[x, 2.05, z]}><boxGeometry args={[0.12, 3.5, z < 0 ? 4.2 : 2.65]} /><meshPhysicalMaterial color={glass} metalness={0.16} roughness={0.22} transparent opacity={0.16} side={2} /></mesh>)}
        <mesh position={[x, 1.03, -3.9]}><boxGeometry args={[0.18, 0.12, 4.2]} /><meshStandardMaterial color={partition} metalness={0.46} roughness={0.54} /></mesh>
        <mesh position={[x, 1.03, 2.45]}><boxGeometry args={[0.18, 0.12, 2.65]} /><meshStandardMaterial color={partition} metalness={0.46} roughness={0.54} /></mesh>
      </group>)}
      {[-7.8, -3.85, 3.85, 7.8].map((x) => <mesh key={`cross-divider-${x}`} position={[x, 2.05, -1.3]}><boxGeometry args={[x < 0 ? (x < -6 ? 1.65 : 0.85) : (x > 6 ? 1.65 : 0.85), 3.5, 0.12]} /><meshPhysicalMaterial color={glass} metalness={0.16} roughness={0.22} transparent opacity={0.16} side={2} /></mesh>)}

      {/* Wide circulation lane, direction lights, overhead service rails and task lights. */}
      {[-1.35, 1.35].map((x) => <mesh key={`guide-${x}`} position={[x, 0.405, -1.35]}><boxGeometry args={[0.055, 0.025, 10.7]} /><meshStandardMaterial color="#58c9bf" emissive="#2e918b" emissiveIntensity={0.65} /></mesh>)}
      {[-7.2, -4.8, -2.4, 0, 2.4, 4.8, 7.2].map((x) => <group key={`ceiling-${x}`} position={[x, 4.38, -1.2]}><mesh><boxGeometry args={[0.12, 0.1, 11.2]} /><meshStandardMaterial color="#5a696b" metalness={0.52} roughness={0.48} /></mesh><mesh position={[0, -0.1, 0]}><boxGeometry args={[1.25, 0.065, 0.26]} /><meshStandardMaterial color="#f2e8d4" emissive="#eed7a4" emissiveIntensity={0.46} /></mesh><pointLight position={[0, -0.45, 0]} color="#d5eee3" intensity={0.38} distance={7} /></group>)}
      <mesh position={[0, 4.56, -1.2]}><boxGeometry args={[0.22, 0.18, 10.8]} /><meshStandardMaterial color="#586a6c" metalness={0.58} roughness={0.48} /></mesh>
      {[-0.45, 0.45].map((x) => <mesh key={`pipe-${x}`} position={[x, 4.18, -1.2]}><cylinderGeometry args={[0.055, 0.055, 10.7, 8]} /><meshStandardMaterial color={x < 0 ? '#77b9ae' : '#d58b62'} metalness={0.52} roughness={0.4} /></mesh>)}

      {/* Main analysis hall: central terrain table, instrument benches and the existing log terminal. */}
      <group position={[0, 0, -3.0]}>
        <mesh position={[0, 0.74, 0]} castShadow><cylinderGeometry args={[1.42, 1.58, 1.42, 12]} /><meshStandardMaterial color="#46575a" metalness={0.38} roughness={0.56} /></mesh>
        <mesh position={[0, 1.5, 0]}><cylinderGeometry args={[1.55, 1.55, 0.12, 24]} /><meshStandardMaterial color="#183c43" emissive="#227c7c" emissiveIntensity={0.45} transparent opacity={0.92} /></mesh>
        <mesh position={[0, 1.58, 0]} rotation={[-Math.PI / 2, 0, 0]}><torusGeometry args={[1.2, 0.035, 8, 32]} /><meshStandardMaterial color="#6ddbd0" emissive="#218e88" emissiveIntensity={0.7} /></mesh>
        {[[-2.35, -5.7], [2.3, -5.7]].map(([x, z]) => <group key={x} position={[x, 0, z]}><mesh position={[0, 0.82, 0]} castShadow><boxGeometry args={[2.2, 0.18, 1.0]} /><meshStandardMaterial color={bench} metalness={0.28} roughness={0.55} /></mesh><mesh position={[0, 0.46, 0]}><boxGeometry args={[1.8, 0.68, 0.72]} /><meshStandardMaterial color="#566466" metalness={0.3} roughness={0.62} /></mesh><mesh position={[0, 1.14, -0.25]}><boxGeometry args={[0.7, 0.56, 0.04]} /><meshStandardMaterial color="#16333a" emissive="#2d9e9a" emissiveIntensity={0.35} /></mesh><mesh position={[-0.54, 1.08, 0.1]}><cylinderGeometry args={[0.16, 0.2, 0.34, 10]} /><meshStandardMaterial color="#7f8d88" metalness={0.42} roughness={0.48} /></mesh></group>)}
      </group>
      <group position={[3.9, 0, -0.8]}><mesh position={[0, 0.44, 0]} castShadow><boxGeometry args={[1.3, 0.12, 0.8]} /><meshStandardMaterial color="#657477" metalness={0.4} roughness={0.55} /></mesh><Console position={[0, 0, 0]} /><mesh position={[0.72, 1.3, -0.42]}><boxGeometry args={[0.055, 0.9, 0.04]} /><meshStandardMaterial color="#6dd8cb" emissive="#2b9d94" emissiveIntensity={0.55} /></mesh></group>
      <group position={[-1.95, 0, 0.2]}><mesh position={[0, 0.8, 0]} castShadow><boxGeometry args={[2.2, 0.16, 1.2]} /><meshStandardMaterial color="#aab4af" metalness={0.26} roughness={0.58} /></mesh><mesh position={[0, 1.2, -0.36]}><boxGeometry args={[0.6, 0.5, 0.4]} /><meshStandardMaterial color="#6c7774" metalness={0.5} roughness={0.38} /></mesh><mesh position={[0, 1.49, -0.36]}><cylinderGeometry args={[0.19, 0.2, 0.08, 12]} /><meshStandardMaterial color="#d4a665" metalness={0.35} roughness={0.44} /></mesh><mesh position={[0.6, 1.12, 0.08]}><boxGeometry args={[0.45, 0.46, 0.34]} /><meshStandardMaterial color="#35474b" metalness={0.48} roughness={0.5} /></mesh></group>

      {/* Cold sample store: rack bays, labelled canisters and insulated sample fridge. */}
      <group position={[-6.15, 0, -4.2]}>
        {[-1.75, 0, 1.75].map((x) => <group key={x} position={[x, 0, 0]}><mesh position={[0, 1.75, 0]} castShadow><boxGeometry args={[1.35, 3.35, 0.24]} /><meshStandardMaterial color="#526164" metalness={0.38} roughness={0.62} /></mesh>{[0.62, 1.42, 2.22, 3.02].map((y) => <group key={y}><mesh position={[0, y, 0.23]}><boxGeometry args={[1.23, 0.075, 0.58]} /><meshStandardMaterial color="#aeb9b3" metalness={0.28} roughness={0.58} /></mesh><mesh position={[0, y + 0.2, 0.44]}><cylinderGeometry args={[0.16, 0.16, 0.3, 10]} /><meshStandardMaterial color={y % 2 ? '#b88b60' : '#7a9a91'} roughness={0.7} /></mesh></group>)}</group>)}
        <mesh position={[0, 1.45, 1.5]} castShadow><boxGeometry args={[2.3, 2.8, 0.85]} /><meshStandardMaterial color="#8e9b96" metalness={0.38} roughness={0.56} /></mesh>
        <mesh position={[0, 1.55, 1.95]}><boxGeometry args={[1.2, 0.42, 0.05]} /><meshStandardMaterial color="#203d42" emissive="#51aaa0" emissiveIntensity={0.34} /></mesh>
        <mesh position={[0.96, 2.65, 1.95]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#79e0ba" emissive="#39a878" emissiveIntensity={0.7} /></mesh>
      </group>

      {/* Clean sample room: framed glass, glovebox and specimen-viewing cases. */}
      <group position={[6.15, 0, -4.15]}>
        <mesh position={[0, 1.65, -0.1]} castShadow><boxGeometry args={[4.15, 3.2, 0.14]} /><meshPhysicalMaterial color="#8fd3ce" metalness={0.12} roughness={0.2} transparent opacity={0.12} side={2} /></mesh>
        {[-2.05, 2.05].map((x) => <mesh key={x} position={[x, 1.7, -0.02]}><boxGeometry args={[0.12, 3.45, 0.18]} /><meshStandardMaterial color="#627477" metalness={0.52} roughness={0.48} /></mesh>)}
        <mesh position={[0, 0.92, 0.75]} castShadow><boxGeometry args={[3.0, 0.16, 1.15]} /><meshStandardMaterial color="#aeb9b4" metalness={0.3} roughness={0.55} /></mesh>
        <mesh position={[0, 1.53, 0.45]} castShadow><boxGeometry args={[2.1, 1.0, 0.65]} /><meshStandardMaterial color="#6b7978" metalness={0.38} roughness={0.5} /></mesh>
        {[-0.55, 0.55].map((x) => <mesh key={x} position={[x, 1.72, 0.81]}><sphereGeometry args={[0.18, 10, 8]} /><meshStandardMaterial color="#bfd0c5" metalness={0.15} roughness={0.35} /></mesh>)}
        {[-1.0, 0, 1.0].map((x) => <mesh key={`case-${x}`} position={[x, 0.82, -1.15]}><boxGeometry args={[0.72, 0.58, 0.6]} /><meshStandardMaterial color="#283c40" metalness={0.38} roughness={0.4} /></mesh>)}
      </group>

      {/* Workshop and briefing bays have distinct floors and purpose-built furnishings. */}
      <group position={[-6.1, 0, 1.55]}>
        <mesh position={[0, 0.405, 0]}><boxGeometry args={[5.15, 0.035, 4.0]} /><meshStandardMaterial color="#786d5e" roughness={0.9} /></mesh>
        <mesh position={[0, 0.92, -0.65]} castShadow><boxGeometry args={[3.2, 0.18, 1.45]} /><meshStandardMaterial color="#9ca9a3" metalness={0.34} roughness={0.58} /></mesh>
        {[-1.25, 0, 1.25].map((x) => <mesh key={x} position={[x, 1.28, -0.45]}><boxGeometry args={[0.44, 0.48, 0.4]} /><meshStandardMaterial color={x === 0 ? '#d98b5d' : '#56686b'} metalness={0.4} roughness={0.52} /></mesh>)}
        <mesh position={[0, 2.25, -2.3]}><boxGeometry args={[4.2, 1.15, 0.13]} /><meshStandardMaterial color="#4c5f60" metalness={0.42} roughness={0.58} /></mesh>
        {[-1.5, -0.5, 0.5, 1.5].map((x) => <mesh key={`tool-${x}`} position={[x, 2.25, -2.18]}><boxGeometry args={[0.12, 0.62, 0.08]} /><meshStandardMaterial color="#d3b17c" metalness={0.46} roughness={0.5} /></mesh>)}
      </group>
      <group position={[6.1, 0, 1.55]}>
        <mesh position={[0, 0.405, 0]}><boxGeometry args={[5.15, 0.035, 4.0]} /><meshStandardMaterial color="#596c6a" roughness={0.9} /></mesh>
        <mesh position={[0, 0.9, 0.25]} castShadow><boxGeometry args={[2.4, 0.16, 1.8]} /><meshStandardMaterial color="#929f99" metalness={0.2} roughness={0.6} /></mesh>
        {[-0.72, 0.72].map((x) => [-0.55, 0.95].map((z) => <group key={`${x}-${z}`} position={[x, 0, z]}><mesh position={[0, 0.52, 0]}><boxGeometry args={[0.68, 0.12, 0.62]} /><meshStandardMaterial color="#4c5d5f" metalness={0.3} roughness={0.65} /></mesh><mesh position={[0, 0.27, 0]}><cylinderGeometry args={[0.045, 0.045, 0.5, 8]} /><meshStandardMaterial color="#687779" metalness={0.48} roughness={0.52} /></mesh></group>))}
        <mesh position={[0, 2.0, -2.62]}><boxGeometry args={[4.1, 1.75, 0.14]} /><meshStandardMaterial color="#1d353d" emissive="#217d7c" emissiveIntensity={0.38} /></mesh>
        <mesh position={[0, 2.0, -2.51]}><boxGeometry args={[3.45, 1.2, 0.03]} /><meshStandardMaterial color="#a24e3d" emissive="#7f4439" emissiveIntensity={0.28} /></mesh>
      </group>

      {/* The 2.5 m inner airlock door lines up with the existing exit interaction. */}
      {[-1.34, 1.34].map((x) => <mesh key={`airlock-jamb-${x}`} position={[x, 2.1, 4.05]}><boxGeometry args={[0.16, 4.1, 0.22]} /><meshStandardMaterial color="#7c8986" metalness={0.46} roughness={0.55} /></mesh>)}
      <mesh position={[0, 4.12, 4.05]}><boxGeometry args={[2.84, 0.16, 0.22]} /><meshStandardMaterial color="#627477" metalness={0.46} roughness={0.54} /></mesh>
      <InnerAirlockDoor open={openDoor} z={4.08} />
      <mesh position={[0, 3.62, 4.08]}><boxGeometry args={[2.35, 0.1, 0.15]} /><meshStandardMaterial color="#71cfb3" emissive="#3caa85" emissiveIntensity={0.55} /></mesh>
    </>
  )
}

function InteriorScene({ buildingId, siteId, doorOpen, crops }: { buildingId: InteriorBuildingId; siteId: LandingSiteId; doorOpen: boolean; crops: CropPlot[] }) {
  const door = useRef<Group>(null)
  useFrame((_, delta) => {
    if (door.current) {
      const target = doorOpen ? -1.35 : 0
      door.current.rotation.y += (target - door.current.rotation.y) * (1 - Math.exp(-8 * Math.min(delta, 0.05)))
    }
  })
  const room = buildingId === 'habitat' ? <HabitatInterior openDoor={doorOpen} /> : buildingId === 'greenhouse' ? <GreenhouseInterior crops={crops} openDoor={doorOpen} /> : <LaboratoryInterior openDoor={doorOpen} />
  const warm = siteId === 'open-plain' ? '#bb8064' : '#aa7869'
  return (
    <>
      <color attach="background" args={['#1d2528']} />
      <ambientLight color="#d1d5cd" intensity={0.72} />
      <pointLight position={[0, 3.6, -1]} color={buildingId === 'laboratory' ? '#dff2eb' : '#e9ddb8'} intensity={buildingId === 'laboratory' ? 24 : 18} distance={buildingId === 'laboratory' ? 22 : 15} decay={2} />
      <pointLight position={[-3, 3, 1]} color={buildingId === 'greenhouse' ? '#a7d69e' : '#93d4cc'} intensity={7} distance={10} decay={2} />
      {buildingId === 'laboratory' && <>
        <pointLight position={[-6, 3.3, -4]} color="#b9ddd3" intensity={8} distance={8} decay={2} />
        <pointLight position={[6, 3.3, -4]} color="#c4e8df" intensity={8} distance={8} decay={2} />
        <pointLight position={[-6, 3.1, 1.2]} color="#f0c486" intensity={5} distance={7} decay={2} />
        <pointLight position={[6, 3.1, 1.2]} color="#a8d7d0" intensity={5} distance={7} decay={2} />
      </>}
      <fog attach="fog" args={['#30373a', 18, 50]} />
      <mesh position={[0, 0.06, 0]} receiveShadow><boxGeometry args={[40, 0.1, 40]} /><meshStandardMaterial color={warm} roughness={0.96} /></mesh>
      {room}
      {/* Existing compact airlock remains for the greenhouse and laboratory. */}
      {buildingId === 'laboratory' && <group position={[0, 0, 4.04]}>
        <mesh position={[-1.08, 2.15, 0]}><boxGeometry args={[0.14, 4.2, 0.24]} /><meshStandardMaterial color="#83918e" metalness={0.46} roughness={0.53} /></mesh>
        <mesh position={[1.08, 2.15, 0]}><boxGeometry args={[0.14, 4.2, 0.24]} /><meshStandardMaterial color="#83918e" metalness={0.46} roughness={0.53} /></mesh>
        <mesh position={[0, 4.18, 0]}><boxGeometry args={[2.3, 0.16, 0.25]} /><meshStandardMaterial color="#778482" metalness={0.4} roughness={0.55} /></mesh>
        <group ref={door} position={[-1.12, 0, 4.04]}>
          <mesh position={[0.97, 2.1, 0]} castShadow><boxGeometry args={[1.94, 4.0, 0.16]} /><meshStandardMaterial color="#47565a" metalness={0.34} roughness={0.58} /></mesh>
        </group>
      </group>}
    </>
  )
}

export default InteriorScene
