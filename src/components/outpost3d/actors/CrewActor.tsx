import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { CrewId } from '../../../game/data/gameplay'

type CrewActorProps = { id: CrewId; position: [number, number, number]; rotation: number }

function CrewActor({ id, position, rotation }: CrewActorProps) {
  const body = useRef<Group>(null)
  const leftArm = useRef<Group>(null)
  const rightArm = useRef<Group>(null)
  const colours = id === 'ryan'
    ? { suit: '#d7d9d2', accent: '#dc804d', visor: '#4a6872' }
    : id === 'emma'
      ? { suit: '#d4dedb', accent: '#64b7b4', visor: '#526d72' }
      : { suit: '#d9d8d2', accent: '#d69b58', visor: '#485f69' }

  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (body.current) body.current.position.y = Math.sin(t * 0.9 + position[0]) * 0.025
    if (leftArm.current) leftArm.current.rotation.x = Math.sin(t * 0.45 + 0.7) * 0.045 - (id === 'emma' ? 0.18 : 0)
    if (rightArm.current) rightArm.current.rotation.x = Math.sin(t * 0.52 + 1.2) * 0.05 - (id === 'emma' ? 0.35 : 0)
  })

  return (
    <group position={position} rotation={[0, rotation, 0]}>
      <group ref={body}>
        <mesh position={[0, 1.14, 0]} castShadow><capsuleGeometry args={[0.35, 0.56, 6, 12]} /><meshStandardMaterial color={colours.suit} roughness={0.8} /></mesh>
        <mesh position={[0, 1.85, 0]} castShadow><sphereGeometry args={[0.31, 20, 16]} /><meshStandardMaterial color="#e0e0d9" roughness={0.43} /></mesh>
        <mesh position={[0, 1.85, -0.22]} scale={[0.84, 0.64, 0.24]}><sphereGeometry args={[0.27, 20, 16]} /><meshPhysicalMaterial color={colours.visor} metalness={0.68} roughness={0.19} clearcoat={0.8} /></mesh>
        <mesh position={[0, 1.54, 0.3]} castShadow><boxGeometry args={[0.54, 0.72, 0.28]} /><meshStandardMaterial color="#899391" metalness={0.34} roughness={0.69} /></mesh>
        <mesh position={[0.21, 1.42, -0.345]}><boxGeometry args={[0.07, 0.35, 0.025]} /><meshStandardMaterial color={colours.accent} roughness={0.65} /></mesh>
        <mesh position={[0, 0.76, 0]}><capsuleGeometry args={[0.27, 0.24, 4, 10]} /><meshStandardMaterial color="#d0d3cc" roughness={0.83} /></mesh>
        {[-1, 1].map((side) => (
          <group key={side}>
            <mesh position={[side * 0.18, 0.42, 0.02]} castShadow><capsuleGeometry args={[0.14, 0.35, 4, 8]} /><meshStandardMaterial color="#c8ceca" roughness={0.82} /></mesh>
            <mesh position={[side * 0.18, 0.17, -0.08]} castShadow><boxGeometry args={[0.29, 0.15, 0.4]} /><meshStandardMaterial color="#535e62" roughness={0.9} /></mesh>
          </group>
        ))}
        <group ref={leftArm} position={[-0.4, 1.43, 0]}>
          <mesh position={[-0.1, -0.3, 0]} rotation={[0, 0, 0.12]} castShadow><capsuleGeometry args={[0.14, 0.42, 4, 8]} /><meshStandardMaterial color="#d8dbd5" roughness={0.82} /></mesh>
          <mesh position={[-0.1, -0.59, -0.02]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#bcc4c0" roughness={0.74} /></mesh>
        </group>
        <group ref={rightArm} position={[0.4, 1.43, 0]}>
          <mesh position={[0.1, -0.3, 0]} rotation={[0, 0, -0.12]} castShadow><capsuleGeometry args={[0.14, 0.42, 4, 8]} /><meshStandardMaterial color="#d8dbd5" roughness={0.82} /></mesh>
          <mesh position={[0.1, -0.59, -0.02]}><sphereGeometry args={[0.12, 12, 10]} /><meshStandardMaterial color="#bcc4c0" roughness={0.74} /></mesh>
        </group>

        {id === 'ryan' && (
          <group position={[0, 0.9, -0.35]}>
            <mesh><torusGeometry args={[0.31, 0.045, 8, 20]} /><meshStandardMaterial color="#36464a" metalness={0.35} roughness={0.68} /></mesh>
            {[-0.23, 0, 0.23].map((x) => <mesh key={x} position={[x, 0.03, -0.05]}><boxGeometry args={[0.1, 0.18, 0.12]} /><meshStandardMaterial color="#a86f47" roughness={0.78} /></mesh>)}
          </group>
        )}
        {id === 'emma' && (
          <group position={[0, 1.85, -0.45]}>
            {[-0.105, 0.105].map((x) => <mesh key={x} position={[x, 0, 0]}><torusGeometry args={[0.085, 0.012, 6, 16]} /><meshStandardMaterial color="#222e33" metalness={0.52} roughness={0.38} /></mesh>)}
            <mesh><boxGeometry args={[0.22, 0.018, 0.02]} /><meshStandardMaterial color="#222e33" metalness={0.5} roughness={0.4} /></mesh>
            <mesh position={[0.58, -0.28, 0.05]} rotation={[0.22, 0, -0.2]}><boxGeometry args={[0.34, 0.4, 0.05]} /><meshStandardMaterial color="#435e66" metalness={0.42} roughness={0.32} /></mesh>
            <mesh position={[0.58, -0.28, 0.085]} rotation={[0.22, 0, -0.2]}><boxGeometry args={[0.27, 0.3, 0.018]} /><meshStandardMaterial color="#4fc5bc" emissive="#205d58" emissiveIntensity={0.4} /></mesh>
          </group>
        )}
        {id === 'alex' && (
          <group>
            <mesh position={[0.37, 1.86, -0.03]}><torusGeometry args={[0.1, 0.035, 8, 18]} /><meshStandardMaterial color="#343f43" metalness={0.44} roughness={0.5} /></mesh>
            <mesh position={[0.44, 1.85, 0.08]}><sphereGeometry args={[0.07, 10, 8]} /><meshStandardMaterial color="#67c8c1" metalness={0.35} roughness={0.43} /></mesh>
            <mesh position={[0.32, 2.16, 0.04]} rotation={[0, 0, -0.15]}><boxGeometry args={[0.34, 0.06, 0.07]} /><meshStandardMaterial color="#39484b" metalness={0.36} roughness={0.58} /></mesh>
          </group>
        )}
      </group>
      <mesh position={[0, 2.45, 0]}><sphereGeometry args={[0.035, 8, 8]} /><meshStandardMaterial color={colours.accent} emissive={colours.accent} emissiveIntensity={0.4} /></mesh>
    </group>
  )
}

export default CrewActor
