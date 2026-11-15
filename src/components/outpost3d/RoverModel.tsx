import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'

type RoverModelProps = { speed: { current: number } }

function RoverModel({ speed }: RoverModelProps) {
  const wheels = useRef<Group>(null)
  const mast = useRef<Group>(null)
  useFrame((state, delta) => {
    if (wheels.current) {
      for (const wheel of wheels.current.children) wheel.rotation.x -= speed.current * delta * 1.8
    }
    if (mast.current) mast.current.rotation.y = Math.sin(state.clock.elapsedTime * 0.35) * 0.12
  })

  return (
    <group position={[0, 0.06, 0]}>
      {/* low, shielded chassis */}
      <mesh position={[0, 0.93, 0]} castShadow receiveShadow><boxGeometry args={[2.05, 0.56, 3.35]} /><meshStandardMaterial color="#c6ceca" metalness={0.4} roughness={0.62} /></mesh>
      <mesh position={[0, 1.27, 0.1]} castShadow><boxGeometry args={[1.74, 0.18, 2.82]} /><meshStandardMaterial color="#59676a" metalness={0.5} roughness={0.48} /></mesh>
      <mesh position={[0, 1.4, -0.67]} castShadow><boxGeometry args={[1.1, 0.52, 1.04]} /><meshStandardMaterial color="#e0e2dc" metalness={0.2} roughness={0.62} /></mesh>
      <mesh position={[0, 1.68, -0.65]} castShadow><boxGeometry args={[0.65, 0.16, 0.68]} /><meshStandardMaterial color="#25383f" metalness={0.68} roughness={0.28} /></mesh>
      <mesh position={[0, 1.77, 0.75]} castShadow><boxGeometry args={[1.1, 0.08, 1.06]} /><meshStandardMaterial color="#244754" metalness={0.56} roughness={0.33} /></mesh>
      <mesh position={[0, 1.83, 0.75]}><boxGeometry args={[0.035, 0.025, 0.98]} /><meshStandardMaterial color="#8cb6b5" metalness={0.42} roughness={0.42} /></mesh>
      {[-0.32, 0, 0.32].map((x) => <mesh key={x} position={[x, 1.35, 1.17]}><boxGeometry args={[0.035, 0.025, 0.04]} /><meshStandardMaterial color="#7dd2c8" emissive="#316d67" emissiveIntensity={0.6} /></mesh>)}

      {/* Raised side rails protect the instrument deck and frame fold-out power panels. */}
      {[-1, 1].map((side) => <group key={`deck-rail-${side}`}>
        <mesh position={[side * 0.96, 1.34, -0.2]} castShadow><boxGeometry args={[0.08, 0.12, 2.45]} /><meshStandardMaterial color="#59686a" metalness={0.62} roughness={0.44} /></mesh>
        <mesh position={[side * 0.72, 1.61, 0.05]} rotation={[0.04, 0, side * -0.08]} castShadow><boxGeometry args={[0.48, 0.08, 1.28]} /><meshStandardMaterial color="#263f4a" metalness={0.54} roughness={0.31} /></mesh>
        <mesh position={[side * 0.72, 1.66, 0.05]} rotation={[0.04, 0, side * -0.08]}><boxGeometry args={[0.4, 0.025, 1.18]} /><meshStandardMaterial color="#327184" metalness={0.5} roughness={0.28} /></mesh>
        <mesh position={[side * 0.68, 1.47, -0.85]} castShadow><boxGeometry args={[0.42, 0.43, 0.62]} /><meshStandardMaterial color="#7d8984" metalness={0.3} roughness={0.64} /></mesh>
        <mesh position={[side * 0.68, 1.49, -0.52]}><boxGeometry args={[0.24, 0.08, 0.035]} /><meshStandardMaterial color="#d6a66d" metalness={0.24} roughness={0.6} /></mesh>
      </group>)}
      {/* Bumper, recovery tow points, and low-profile front work lamps. */}
      <mesh position={[0, 0.65, 1.8]} castShadow><boxGeometry args={[2.28, 0.22, 0.28]} /><meshStandardMaterial color="#566466" metalness={0.5} roughness={0.56} /></mesh>
      <mesh position={[0, 0.76, 1.95]}><boxGeometry args={[1.78, 0.09, 0.035]} /><meshStandardMaterial color="#dc7847" metalness={0.18} roughness={0.62} /></mesh>
      {[-0.72, 0.72].map((x) => <group key={`headlamp-${x}`} position={[x, 1.18, 1.78]}><mesh><cylinderGeometry args={[0.17, 0.2, 0.12, 12]} /><meshStandardMaterial color="#435255" metalness={0.55} roughness={0.38} /></mesh><mesh position={[0, 0, 0.08]}><sphereGeometry args={[0.105, 12, 10]} /><meshStandardMaterial color="#f1d8a3" emissive="#e2b96f" emissiveIntensity={1.1} /></mesh><pointLight position={[0, 0, 0.45]} color="#f4d49a" intensity={0.55} distance={5} decay={2} /></group>)}
      {[-0.9, 0.9].map((x) => <mesh key={`tow-${x}`} position={[x, 0.66, 1.98]}><torusGeometry args={[0.11, 0.035, 6, 12]} /><meshStandardMaterial color="#d3b47e" metalness={0.46} roughness={0.5} /></mesh>)}

      {/* rocker bogie arms and six independently animated wheels */}
      <group ref={wheels}>
        {[-1, 1].map((side) => [-1, 0, 1].map((axle) => {
          const z = axle * 1.12
          return (
            <group key={`${side}-${axle}`} position={[side * 1.08, 0.52, z]}>
              <mesh position={[-side * 0.23, 0.12, -z * 0.3]} rotation={[0, 0, side * 0.18]} castShadow><cylinderGeometry args={[0.075, 0.075, 0.74, 10]} /><meshStandardMaterial color="#707d7e" metalness={0.58} roughness={0.5} /></mesh>
              <mesh rotation={[0, 0, Math.PI / 2]} castShadow receiveShadow><cylinderGeometry args={[0.46, 0.46, 0.34, 18]} /><meshStandardMaterial color="#394346" metalness={0.12} roughness={0.88} /></mesh>
              <mesh rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.29, 0.29, 0.355, 16]} /><meshStandardMaterial color="#9aa4a1" metalness={0.64} roughness={0.48} /></mesh>
              <mesh position={[side * 0.19, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.43, 0.045, 8, 18]} /><meshStandardMaterial color="#232d31" roughness={0.91} /></mesh>
              <mesh position={[side * 0.2, 0, 0]} rotation={[0, Math.PI / 2, 0]}><torusGeometry args={[0.245, 0.035, 8, 16]} /><meshStandardMaterial color="#d0a66f" metalness={0.58} roughness={0.42} /></mesh>
              <mesh position={[side * 0.215, 0, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.105, 0.105, 0.37, 12]} /><meshStandardMaterial color="#596769" metalness={0.66} roughness={0.4} /></mesh>
              {Array.from({ length: 12 }, (_, index) => (
                <mesh key={index} position={[side * 0.18, Math.cos(index * Math.PI / 6) * 0.4, Math.sin(index * Math.PI / 6) * 0.4]} rotation={[index * Math.PI / 6, 0, 0]}>
                  <boxGeometry args={[0.12, 0.14, 0.035]} /><meshStandardMaterial color="#586466" roughness={0.9} />
                </mesh>
              ))}
            </group>
          )
        }))}
      </group>

      {/* sensor mast, cameras and radio whip */}
      <group ref={mast} position={[0, 1.55, -1.18]}>
        <mesh position={[0, 0.7, 0]} castShadow><cylinderGeometry args={[0.055, 0.075, 1.42, 8]} /><meshStandardMaterial color="#758283" metalness={0.58} roughness={0.46} /></mesh>
        <mesh position={[0, 1.42, 0]} castShadow><boxGeometry args={[0.58, 0.3, 0.38]} /><meshStandardMaterial color="#e0e2db" metalness={0.22} roughness={0.55} /></mesh>
        {[-0.17, 0.17].map((x) => <mesh key={x} position={[x, 1.4, 0.2]}><sphereGeometry args={[0.075, 14, 12]} /><meshStandardMaterial color="#19272c" metalness={0.68} roughness={0.21} /></mesh>)}
        <mesh position={[0, 1.65, -0.03]} rotation={[0.28, 0, 0]}><cylinderGeometry args={[0.012, 0.02, 0.82, 6]} /><meshStandardMaterial color="#879594" metalness={0.58} roughness={0.42} /></mesh>
      </group>
      <mesh position={[0.82, 1.75, 0.9]} rotation={[0, 0, -0.18]}><cylinderGeometry args={[0.014, 0.025, 1.25, 6]} /><meshStandardMaterial color="#687777" metalness={0.52} roughness={0.47} /></mesh>
      <mesh position={[0, 0.74, 1.72]}><boxGeometry args={[1.5, 0.08, 0.045]} /><meshStandardMaterial color="#dc7847" roughness={0.62} /></mesh>
      {[-0.78, 0.78].map((x) => <mesh key={x} position={[x, 1.13, 1.68]}><sphereGeometry args={[0.12, 14, 10]} /><meshStandardMaterial color="#e8bc7e" emissive="#7e542a" emissiveIntensity={0.55} /></mesh>)}
      {/* Modulated status beacon and sample-locker indicators stay easy to read in dust. */}
      <mesh position={[0.78, 1.74, -1.24]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#79e0ba" emissive="#32b784" emissiveIntensity={0.72} /></mesh>
      <mesh position={[-0.78, 1.74, -1.24]}><sphereGeometry args={[0.09, 10, 8]} /><meshStandardMaterial color="#e88d64" emissive="#bd503b" emissiveIntensity={0.54} /></mesh>
    </group>
  )
}

export default RoverModel
