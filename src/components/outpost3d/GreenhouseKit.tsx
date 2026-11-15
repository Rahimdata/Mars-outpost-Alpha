import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { BufferGeometry, CatmullRomCurve3, Float32BufferAttribute, InstancedMesh, Object3D, SphereGeometry, TubeGeometry, Vector3 } from 'three'
import type { CropPlot } from '../../game/state/colonyState'

export const GREENHOUSE_CONFIG = {
  length: 20, width: 12, sideHeight: 2.8, ridgeHeight: 4.5, bayWidth: 1.25,
  glassTint: '#a8d8dc', glassOpacity: 0.22, dustOpacity: 0.12,
  plantCountPerBed: 14, aisleWidth: 4.7, growLight: '#ed8be8',
  growLightIntensity: 0.8, frameColor: '#849394', weathering: 0.22,
} as const

function createVaultShell() {
  const geometry = new BufferGeometry()
  const lengthSteps = 32, archSteps = 20
  const positions: number[] = [], uvs: number[] = [], indices: number[] = []
  for (let zi = 0; zi <= lengthSteps; zi += 1) {
    const z = -GREENHOUSE_CONFIG.length / 2 + zi / lengthSteps * GREENHOUSE_CONFIG.length
    for (let ai = 0; ai <= archSteps; ai += 1) {
      const a = -Math.PI / 2 + ai / archSteps * Math.PI
      positions.push(Math.sin(a) * GREENHOUSE_CONFIG.width / 2, GREENHOUSE_CONFIG.sideHeight + (GREENHOUSE_CONFIG.ridgeHeight - GREENHOUSE_CONFIG.sideHeight) * Math.cos(a), z)
      uvs.push(ai / archSteps, zi / lengthSteps)
      if (zi < lengthSteps && ai < archSteps) {
        const here = zi * (archSteps + 1) + ai, next = here + archSteps + 1
        indices.push(here, next, here + 1, next, next + 1, here + 1)
      }
    }
  }
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setIndex(indices)
  geometry.computeVertexNormals()
  return geometry
}

function createRib() {
  const points = [
    [-6, 2.8], [-5.75, 3.5], [-4.9, 4.08], [-3.7, 4.38], [-2.2, 4.5],
    [0, 4.54], [2.2, 4.5], [3.7, 4.38], [4.9, 4.08], [5.75, 3.5], [6, 2.8],
  ].map(([x, y]) => new Vector3(
    x * GREENHOUSE_CONFIG.width / 12,
    GREENHOUSE_CONFIG.sideHeight + (y - 2.8) * (GREENHOUSE_CONFIG.ridgeHeight - GREENHOUSE_CONFIG.sideHeight) / 1.74,
    0,
  ))
  return new TubeGeometry(new CatmullRomCurve3(points), 40, 0.085, 8, false)
}

/** Reusable arched glazing and instanced structural ribs; hide the roof indoors to keep the camera clear. */
export function GreenhouseGlassShell({ roof = true }: { roof?: boolean }) {
  const shell = useMemo(createVaultShell, [])
  const rib = useMemo(createRib, [])
  const ribs = useRef<InstancedMesh>(null)
  const count = Math.ceil(GREENHOUSE_CONFIG.length / GREENHOUSE_CONFIG.bayWidth) + 1
  useLayoutEffect(() => {
    if (!ribs.current) return
    const transform = new Object3D()
    for (let i = 0; i < count; i += 1) {
      transform.position.set(0, 0, -GREENHOUSE_CONFIG.length / 2 + i * GREENHOUSE_CONFIG.bayWidth)
      transform.updateMatrix()
      ribs.current.setMatrixAt(i, transform.matrix)
    }
    ribs.current.instanceMatrix.needsUpdate = true
    ribs.current.computeBoundingSphere()
  }, [count])
  useEffect(() => () => { shell.dispose(); rib.dispose() }, [shell, rib])
  return <group>
    {roof && <mesh geometry={shell} renderOrder={1}><meshPhysicalMaterial color={GREENHOUSE_CONFIG.glassTint} metalness={0.08} roughness={0.16} clearcoat={0.9} clearcoatRoughness={0.12} transparent opacity={GREENHOUSE_CONFIG.glassOpacity} depthWrite={false} side={2} envMapIntensity={1.25} /></mesh>}
    <instancedMesh ref={ribs} args={[rib, undefined, count]} castShadow receiveShadow><meshStandardMaterial color={GREENHOUSE_CONFIG.frameColor} metalness={0.56} roughness={0.42} /></instancedMesh>
  </group>
}

/** Plant form and maturity come from persisted crop progress; this is presentation only. */
export function GreenhouseCropRow({ crop, x, z = 0, row = 0 }: { crop: CropPlot; x: number; z?: number; row?: number }) {
  const leaves = useRef<InstancedMesh>(null), produce = useRef<InstancedMesh>(null)
  const leafGeometry = useMemo(() => new SphereGeometry(1, 7, 5), [])
  const fruitGeometry = useMemo(() => new SphereGeometry(1, 8, 6), [])
  const transform = useMemo(() => new Object3D(), [])
  const count = GREENHOUSE_CONFIG.plantCountPerBed, leavesPerPlant = 4
  const stage = Math.max(0.08, Math.min(1, crop.progress / 100)), ripe = crop.progress >= 70
  const leafColor = crop.crop === 'leafy-greens' ? '#6f9a48' : crop.crop === 'radish' ? '#77a94b' : '#4f8747'
  const updatePlants = (time: number) => {
    if (!leaves.current || !produce.current) return
    const height = 0.25 + stage * 0.62
    for (let plant = 0; plant < count; plant += 1) {
      const plantZ = -6.3 + plant * (12.6 / Math.max(1, count - 1))
      for (let leaf = 0; leaf < leavesPerPlant; leaf += 1) {
        const angle = leaf * Math.PI * 0.5 + plant * 0.31
        const sway = Math.sin(time * 1.35 + plant * 0.7 + leaf) * 0.035
        transform.position.set(Math.cos(angle) * (0.1 + leaf * 0.045), 0.98 + height * (0.45 + (leaf % 2) * 0.16) + sway, plantZ + Math.sin(angle) * (0.1 + leaf * 0.045))
        transform.rotation.set(0.14 * Math.sin(angle), angle + sway, 0.42 * Math.cos(angle) + sway * 1.6)
        transform.scale.set(0.16 + stage * 0.09, 0.07 + stage * 0.055, 0.31 + stage * 0.2)
        transform.updateMatrix()
        leaves.current.setMatrixAt(plant * leavesPerPlant + leaf, transform.matrix)
      }
      transform.position.set(0, 1.02 + height * 0.24, plantZ)
      transform.rotation.set(0, 0, 0)
      transform.scale.set(0.11, crop.crop === 'radish' ? 0.16 : 0.09, 0.11)
      transform.updateMatrix()
      produce.current.setMatrixAt(plant, transform.matrix)
    }
    leaves.current.instanceMatrix.needsUpdate = true
    produce.current.instanceMatrix.needsUpdate = true
  }
  useLayoutEffect(() => { updatePlants(0) }, [count, crop.crop, crop.progress, leavesPerPlant, stage])
  useFrame(({ clock }) => updatePlants(clock.elapsedTime))
  useEffect(() => () => { leafGeometry.dispose(); fruitGeometry.dispose() }, [leafGeometry, fruitGeometry])
  const produceColor = crop.crop === 'radish' ? ripe ? '#c34e40' : '#a78d65' : crop.crop === 'potato' ? '#e4d58b' : '#6f9a48'
  return <group position={[x, 0, z + row * 0.54]}>
    <instancedMesh ref={leaves} args={[leafGeometry, undefined, count * leavesPerPlant]} castShadow><meshStandardMaterial color={leafColor} roughness={0.82} /></instancedMesh>
    <instancedMesh ref={produce} args={[fruitGeometry, undefined, count]} castShadow><meshStandardMaterial color={produceColor} roughness={0.72} emissive={ripe && crop.crop === 'radish' ? '#4b1712' : '#000000'} emissiveIntensity={0.12} /></instancedMesh>
  </group>
}
