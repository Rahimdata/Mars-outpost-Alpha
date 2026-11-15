import type { ExpansionId } from '../../game/state/colonyState'
import { getTerrainHeight } from '../../game/world3d/terrain'
import type { LandingSiteId } from '../../game/data/landingSites'

export const EXPANSION_POSITIONS: Record<ExpansionId, [number, number]> = {
  'habitat-extension': [-46, 34], 'advanced-greenhouse': [-29, 39], 'water-processor': [-12, 43],
  'regolith-shield': [5, 45], 'maintenance-bay': [22, 42], 'research-wing': [39, 34],
}

function Module({ id }: { id: ExpansionId }) {
  const teal = '#69bcb7'
  if (id === 'regolith-shield') return <group>{[-2, 0, 2].map((x) => <mesh key={x} position={[x, 0.55, 0]} scale={[1.4, 0.6, 1]} castShadow><dodecahedronGeometry args={[1, 1]} /><meshStandardMaterial color="#987262" roughness={1} /></mesh>)}</group>
  if (id === 'advanced-greenhouse') return <group><mesh position={[0, 1.2, 0]} castShadow><boxGeometry args={[7, 2.4, 5]} /><meshStandardMaterial color="#aebbb5" metalness={0.25} roughness={0.58} /></mesh><mesh position={[0, 1.28, 2.53]}><boxGeometry args={[4.8, 1.45, 0.05]} /><meshStandardMaterial color="#67938d" roughness={0.3} transparent opacity={0.55} /></mesh><mesh position={[0, 2.47, 0]}><boxGeometry args={[6.8, 0.07, 4.8]} /><meshStandardMaterial color={teal} emissive="#164e4b" emissiveIntensity={0.35} /></mesh></group>
  if (id === 'water-processor') return <group><mesh position={[0, 1, 0]} castShadow><cylinderGeometry args={[1.2, 1.35, 2, 12]} /><meshStandardMaterial color="#aeb8b5" metalness={0.38} roughness={0.55} /></mesh><mesh position={[0, 2.05, 0]}><cylinderGeometry args={[0.5, 0.5, 0.12, 16]} /><meshStandardMaterial color={teal} emissive="#236d68" emissiveIntensity={0.5} /></mesh>{[-1.6, 1.6].map((x) => <mesh key={x} position={[x, 0.75, 0]}><boxGeometry args={[0.65, 1.5, 0.7]} /><meshStandardMaterial color="#59696a" metalness={0.4} roughness={0.7} /></mesh>)}</group>
  if (id === 'maintenance-bay') return <group><mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[6.2, 2.6, 4.2]} /><meshStandardMaterial color="#c1c9c4" metalness={0.18} roughness={0.7} /></mesh><mesh position={[0, 1.15, 2.13]}><boxGeometry args={[3.5, 2.1, 0.05]} /><meshStandardMaterial color="#35484b" metalness={0.32} roughness={0.55} /></mesh></group>
  if (id === 'research-wing') return <group><mesh position={[0, 1.3, 0]} castShadow><boxGeometry args={[6.5, 2.6, 5]} /><meshStandardMaterial color="#bdc7c3" metalness={0.22} roughness={0.65} /></mesh><mesh position={[0, 1.48, 2.53]}><boxGeometry args={[4.2, 1.05, 0.05]} /><meshStandardMaterial color="#526b70" metalness={0.4} roughness={0.45} /></mesh><mesh position={[0, 2.65, 0]}><boxGeometry args={[6.8, 0.1, 5.3]} /><meshStandardMaterial color={teal} metalness={0.3} roughness={0.5} /></mesh></group>
  return <group><mesh position={[0, 1.15, 0]} castShadow><cylinderGeometry args={[2.3, 2.7, 2.3, 12]} /><meshStandardMaterial color="#d1d6d0" metalness={0.15} roughness={0.7} /></mesh><mesh position={[0, 2.34, 0]}><cylinderGeometry args={[1.8, 2.2, 0.12, 12]} /><meshStandardMaterial color={teal} metalness={0.3} roughness={0.5} /></mesh></group>
}

export default function ExpansionModules({ siteId, expansions }: { siteId: LandingSiteId; expansions: ExpansionId[] }) {
  return <group>{expansions.map((id) => { const [x, z] = EXPANSION_POSITIONS[id]; return <group key={id} position={[x, getTerrainHeight(siteId, x, z), z]}><mesh position={[0, 0.08, 0]} receiveShadow><cylinderGeometry args={[5, 5.4, 0.16, 24]} /><meshStandardMaterial color="#a98b78" roughness={0.96} /></mesh><Module id={id} /></group> })}</group>
}
