import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

export type AstronautAnimation = 'idle' | 'walk' | 'run' | 'jump' | 'land' | 'interact'

export const WALK_CONFIG = {
  strideLength: 1.35,
  thighAmplitude: 28 * Math.PI / 180,
  kneeAmplitude: 42 * Math.PI / 180,
  armAmplitude: 20 * Math.PI / 180,
  bodyBob: 0.025,
  hipSway: 0.018,
  chestCounterYaw: 7 * Math.PI / 180,
  speedBlend: 8,
} as const

type AstronautModelProps = {
  animation: { current: AstronautAnimation }
  gait: { current: number }
  visible?: boolean
}

/** Replaceable procedural suit rig used until a licensed rigged astronaut GLB is added. */
function AstronautModel({ animation, gait, visible = true }: AstronautModelProps) {
  const root = useRef<Group>(null)
  const chest = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const leftLeg = useRef<Group>(null)
  const rightLeg = useRef<Group>(null)
  const leftKnee = useRef<Group>(null)
  const rightKnee = useRef<Group>(null)
  const head = useRef<Group>(null)
  const phase = useRef(0)
  const walkWeight = useRef(0)

  useFrame(({ clock }, delta) => {
    const dt = Math.min(delta, 0.05)
    const t = clock.elapsedTime
    const currentAnimation = animation.current
    const speed = Math.max(0, gait.current)
    const targetWeight = Math.max(0, Math.min(1, speed / 3.2))
    const blend = 1 - Math.exp(-WALK_CONFIG.speedBlend * dt)

    walkWeight.current += (targetWeight - walkWeight.current) * blend
    const weight = walkWeight.current
    const smoothWeight = weight * weight * (3 - 2 * weight)

    // One continuous gait cycle represents two steps. It stops advancing at rest.
    if (speed > 0.03 && currentAnimation !== 'jump' && currentAnimation !== 'land') {
      phase.current = (phase.current + (speed / WALK_CONFIG.strideLength) * Math.PI * 2 * dt) % (Math.PI * 2)
    }

    const p = phase.current
    const leftStep = Math.sin(p)
    const rightStep = Math.sin(p + Math.PI)
    const runScale = currentAnimation === 'run' ? 1.16 : 1
    const special = currentAnimation === 'jump' || currentAnimation === 'land'

    const leftThigh = special ? (currentAnimation === 'jump' ? -0.28 : 0.12) : leftStep * WALK_CONFIG.thighAmplitude * runScale * smoothWeight
    const rightThigh = special ? (currentAnimation === 'jump' ? 0.32 : 0.12) : rightStep * WALK_CONFIG.thighAmplitude * runScale * smoothWeight
    const leftBend = special ? 0.08 : (Math.max(0, leftStep) * WALK_CONFIG.kneeAmplitude + 0.04) * smoothWeight
    const rightBend = special ? 0.08 : (Math.max(0, rightStep) * WALK_CONFIG.kneeAmplitude + 0.04) * smoothWeight

    if (leftLeg.current) leftLeg.current.rotation.x += (leftThigh - leftLeg.current.rotation.x) * blend
    if (rightLeg.current) rightLeg.current.rotation.x += (rightThigh - rightLeg.current.rotation.x) * blend
    if (leftKnee.current) leftKnee.current.rotation.x += (leftBend - leftKnee.current.rotation.x) * blend
    if (rightKnee.current) rightKnee.current.rotation.x += (rightBend - rightKnee.current.rotation.x) * blend

    const armScale = currentAnimation === 'run' ? 1.18 : 1
    const leftArmTarget = currentAnimation === 'interact' ? -0.92 : special ? -0.82 : -rightStep * WALK_CONFIG.armAmplitude * armScale * smoothWeight
    const rightArmTarget = currentAnimation === 'interact' ? -0.58 : special ? -0.82 : -leftStep * WALK_CONFIG.armAmplitude * armScale * smoothWeight
    if (leftArm.current) leftArm.current.rotation.x += (leftArmTarget - leftArm.current.rotation.x) * blend
    if (rightArm.current) rightArm.current.rotation.x += (rightArmTarget - rightArm.current.rotation.x) * blend

    if (root.current) {
      root.current.position.y = 0.32 + (special ? 0 : Math.abs(Math.sin(p * 2)) * WALK_CONFIG.bodyBob * smoothWeight)
      root.current.position.x = Math.sin(p) * WALK_CONFIG.hipSway * smoothWeight
    }
    if (chest.current) {
      const breath = (1 - smoothWeight) * Math.sin(t * 1.45) * 0.008
      chest.current.rotation.y += (-Math.sin(p) * WALK_CONFIG.chestCounterYaw * smoothWeight - chest.current.rotation.y) * blend
      chest.current.rotation.x += (-0.055 * smoothWeight - chest.current.rotation.x) * blend
      chest.current.scale.y += (1 + breath - chest.current.scale.y) * blend
    }
    if (head.current) {
      const headLook = (1 - smoothWeight) * Math.sin(t * 0.42) * 0.035
      const stabilization = -Math.sin(p) * WALK_CONFIG.chestCounterYaw * 0.18 * smoothWeight
      head.current.rotation.y += (headLook + stabilization - head.current.rotation.y) * blend
    }
  })

  return (
    <group ref={root} visible={visible} position={[0, 0.32, 0]}>
      {/* Structural backpack and twin cooling cartridges */}
      <group position={[0, 1.18, 0.34]}>
        <mesh castShadow><boxGeometry args={[0.62, 0.76, 0.32]} /><meshStandardMaterial color="#aeb8b7" metalness={0.32} roughness={0.58} /></mesh>
        <mesh position={[0, 0.06, 0.19]} castShadow><boxGeometry args={[0.44, 0.42, 0.08]} /><meshStandardMaterial color="#e6e8e2" roughness={0.68} /></mesh>
        {[-1, 1].map((side) => (
          <group key={side} position={[side * 0.38, -0.02, 0.02]}>
            <mesh castShadow><cylinderGeometry args={[0.085, 0.085, 0.62, 12]} /><meshStandardMaterial color="#778589" metalness={0.48} roughness={0.48} /></mesh>
            <mesh position={[0, -0.27, 0]}><torusGeometry args={[0.09, 0.025, 8, 14]} /><meshStandardMaterial color="#df7a4e" metalness={0.2} roughness={0.5} /></mesh>
          </group>
        ))}
        <mesh position={[0, -0.42, 0.01]}><boxGeometry args={[0.42, 0.08, 0.3]} /><meshStandardMaterial color="#68777a" metalness={0.3} roughness={0.62} /></mesh>
      </group>

      {/* Torso and life-support harness */}
      <group ref={chest} position={[0, 1.18, 0]}>
        <mesh castShadow><capsuleGeometry args={[0.39, 0.62, 8, 16]} /><meshStandardMaterial color="#e4e5df" roughness={0.84} /></mesh>
        <mesh position={[0, 0.11, -0.39]} castShadow><boxGeometry args={[0.5, 0.39, 0.09]} /><meshStandardMaterial color="#c5cdca" metalness={0.16} roughness={0.6} /></mesh>
        {/* Commander orange chest stripe */}
        <mesh position={[0.2, 0.16, -0.445]} rotation={[0, 0, -0.08]}><boxGeometry args={[0.095, 0.34, 0.018]} /><meshStandardMaterial color="#e87843" roughness={0.58} /></mesh>
        <mesh position={[-0.13, 0.1, -0.454]}><boxGeometry args={[0.12, 0.085, 0.022]} /><meshStandardMaterial color="#344950" metalness={0.35} roughness={0.38} /></mesh>
        <mesh position={[-0.13, 0.1, -0.47]}><boxGeometry args={[0.075, 0.045, 0.01]} /><meshStandardMaterial color="#62cfca" emissive="#1f6f6d" emissiveIntensity={0.4} /></mesh>
        <mesh position={[0, -0.31, -0.03]}><torusGeometry args={[0.37, 0.045, 8, 24]} /><meshStandardMaterial color="#818e8d" metalness={0.3} roughness={0.6} /></mesh>
        <mesh position={[0, 0.39, 0]}><cylinderGeometry args={[0.17, 0.19, 0.16, 16]} /><meshStandardMaterial color="#aab5b3" roughness={0.65} /></mesh>
      </group>

      {/* Helmet: white pressure shell, gasket, mirrored blue-gold visor */}
      <group ref={head} position={[0, 1.93, -0.015]}>
        <mesh castShadow><sphereGeometry args={[0.37, 32, 24]} /><meshStandardMaterial color="#e9e9e2" roughness={0.36} metalness={0.08} /></mesh>
        <mesh position={[0, 0, -0.252]} scale={[0.83, 0.68, 0.27]}>
          <sphereGeometry args={[0.35, 32, 24]} />
          <meshPhysicalMaterial color="#4e7480" metalness={0.78} roughness={0.16} clearcoat={1} clearcoatRoughness={0.08} envMapIntensity={1.15} />
        </mesh>
        <mesh position={[0, -0.04, -0.14]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[0.345, 0.035, 10, 36]} /><meshStandardMaterial color="#d4d7d2" metalness={0.32} roughness={0.42} /></mesh>
        <mesh position={[0.24, 0.2, -0.18]} rotation={[0, 0, -0.45]}><boxGeometry args={[0.035, 0.13, 0.018]} /><meshBasicMaterial color="#fff2da" transparent opacity={0.72} /></mesh>
        <mesh position={[0.32, 0.015, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.045, 0.045, 0.08, 12]} /><meshStandardMaterial color="#d7794c" metalness={0.45} roughness={0.45} /></mesh>
      </group>

      {/* Articulated pressure-suit arms, cuffs and gloves */}
      {[[-1, leftArm], [1, rightArm]].map(([side, ref]) => (
        <group key={String(side)} ref={ref as React.RefObject<Group>} position={[Number(side) * 0.48, 1.48, 0]}>
          <mesh position={[Number(side) * 0.14, -0.2, 0]} rotation={[0, 0, Number(side) * -0.13]} castShadow><capsuleGeometry args={[0.17, 0.33, 5, 12]} /><meshStandardMaterial color="#d9dcd6" roughness={0.82} /></mesh>
          <mesh position={[Number(side) * 0.26, -0.44, -0.01]} rotation={[0, 0, Number(side) * -0.1]} castShadow><capsuleGeometry args={[0.135, 0.28, 5, 10]} /><meshStandardMaterial color="#e2e3dc" roughness={0.84} /></mesh>
          <mesh position={[Number(side) * 0.29, -0.57, -0.01]} rotation={[Math.PI / 2, 0, Number(side) * -0.1]}><cylinderGeometry args={[0.15, 0.15, 0.09, 14]} /><meshStandardMaterial color="#889597" metalness={0.35} roughness={0.5} /></mesh>
          <mesh position={[Number(side) * 0.31, -0.69, -0.035]} castShadow><sphereGeometry args={[0.14, 14, 12]} /><meshStandardMaterial color="#c5cbc7" roughness={0.77} /></mesh>
          <mesh position={[Number(side) * 0.31, -0.78, -0.08]}><boxGeometry args={[0.17, 0.055, 0.14]} /><meshStandardMaterial color="#9da9a7" roughness={0.72} /></mesh>
        </group>
      ))}

      {/* Waist and articulated legs */}
      <mesh position={[0, 0.77, 0]} castShadow><capsuleGeometry args={[0.3, 0.24, 5, 12]} /><meshStandardMaterial color="#d8dad4" roughness={0.84} /></mesh>
      {[[-1, leftLeg], [1, rightLeg]].map(([side, ref]) => (
        <group key={String(side)} ref={ref as React.RefObject<Group>} position={[Number(side) * 0.2, 0.69, 0]}>
          <mesh position={[0, -0.25, 0]} castShadow><capsuleGeometry args={[0.19, 0.34, 6, 12]} /><meshStandardMaterial color="#d9dcd6" roughness={0.84} /></mesh>
          <group ref={Number(side) < 0 ? leftKnee : rightKnee} position={[0, -0.55, 0]}>
            <mesh position={[0, 0, -0.005]}><torusGeometry args={[0.17, 0.035, 8, 18]} /><meshStandardMaterial color="#829092" metalness={0.28} roughness={0.62} /></mesh>
            <mesh position={[0, -0.23, -0.045]} castShadow><capsuleGeometry args={[0.15, 0.24, 5, 10]} /><meshStandardMaterial color="#c7ceca" roughness={0.76} /></mesh>
            <mesh position={[0, -0.36, -0.12]} castShadow><boxGeometry args={[0.31, 0.14, 0.48]} /><meshStandardMaterial color="#626f72" roughness={0.9} /></mesh>
            <mesh position={[0, -0.28, -0.325]}><boxGeometry args={[0.2, 0.045, 0.018]} /><meshStandardMaterial color="#e2764b" roughness={0.62} /></mesh>
          </group>
        </group>
      ))}
    </group>
  )
}

export default AstronautModel
