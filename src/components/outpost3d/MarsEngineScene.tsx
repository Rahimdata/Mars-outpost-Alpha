import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { OrbitControls } from '@react-three/drei'
import type { LandingSiteId } from '../../game/data/landingSites'
import type { Group } from 'three'

type MarsEngineSceneProps = {
  siteId: LandingSiteId
}

function TestBeacon() {
  const beacon = useRef<Group>(null)

  useFrame((_, delta) => {
    if (beacon.current) beacon.current.rotation.y += delta * 0.18
  })

  return (
    <group ref={beacon} position={[0, 0.35, 0]} castShadow>
      <mesh position={[0, -0.16, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[1.2, 1.5, 0.35, 8]} />
        <meshStandardMaterial color="#8d9899" roughness={0.75} />
      </mesh>

      <mesh position={[0, 0.65, 0]} castShadow>
        <cylinderGeometry args={[0.34, 0.48, 1.3, 10]} />
        <meshStandardMaterial color="#d8d9d2" roughness={0.55} />
      </mesh>

      <mesh position={[0, 1.36, 0]} castShadow>
        <sphereGeometry args={[0.46, 20, 14]} />
        <meshStandardMaterial
          color="#d9774f"
          metalness={0.18}
          roughness={0.42}
        />
      </mesh>

      <mesh position={[0, 0.55, 0.39]}>
        <boxGeometry args={[0.08, 0.55, 0.04]} />
        <meshStandardMaterial color="#56b7b4" metalness={0.3} />
      </mesh>
    </group>
  )
}

function BasinRocks() {
  return (
    <group>
      <mesh position={[-4, 0.6, -2]} rotation={[0.2, 0.4, 0.1]} castShadow>
        <dodecahedronGeometry args={[1.1, 0]} />
        <meshStandardMaterial color="#79504a" roughness={1} />
      </mesh>
      <mesh position={[4.2, 0.42, -1]} rotation={[0.1, -0.5, 0.3]} castShadow>
        <dodecahedronGeometry args={[0.8, 0]} />
        <meshStandardMaterial color="#68464a" roughness={1} />
      </mesh>
      <mesh position={[3.1, 0.3, 3]} rotation={[0.3, 0.8, 0]} castShadow>
        <dodecahedronGeometry args={[0.55, 0]} />
        <meshStandardMaterial color="#8b594d" roughness={1} />
      </mesh>
    </group>
  )
}

function MarsEngineScene({ siteId }: MarsEngineSceneProps) {
  const isRockyBasin = siteId === 'rocky-basin'

  return (
    <>
      <color attach="background" args={[isRockyBasin ? '#49414a' : '#51434a']} />
      <fog attach="fog" args={[isRockyBasin ? '#9a6254' : '#b36d55', 13, 34]} />

      <ambientLight intensity={1.15} />
      <directionalLight
        castShadow
        position={[-6, 10, 5]}
        intensity={2.2}
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[50, 50]} />
        <meshStandardMaterial
          color={isRockyBasin ? '#70454a' : '#a65743'}
          roughness={1}
        />
      </mesh>

      <gridHelper
        args={[40, 40, '#b47b65', '#80534d']}
        position={[0, 0.015, 0]}
      />

      {!isRockyBasin && (
        <mesh position={[0, 0.03, 0]} receiveShadow>
          <cylinderGeometry args={[5, 5.4, 0.05, 48]} />
          <meshStandardMaterial color="#bd7152" roughness={1} />
        </mesh>
      )}

      <TestBeacon />
      {isRockyBasin && <BasinRocks />}

      <OrbitControls
        makeDefault
        target={[0, 1, 0]}
        enableDamping
        dampingFactor={0.08}
        minDistance={4}
        maxDistance={17}
        maxPolarAngle={Math.PI / 2 - 0.06}
      />
    </>
  )
}

export default MarsEngineScene