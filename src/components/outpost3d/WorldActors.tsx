import { useMemo } from 'react'
import type { LandingSiteId } from '../../game/data/landingSites'
import type { RoverWorldPosition } from '../../game/world3d/types'
import { SAMPLES, type SampleId } from '../../game/data/gameplay'
import { getCrewWorldPositions } from '../../game/world3d/actorLayout'
import { getTerrainHeight } from '../../game/world3d/terrain'
import CrewActor from './actors/CrewActor'
import RoverModel from './RoverModel'

function GeologicalSites({ siteId, scanned, collected }: { siteId: LandingSiteId; scanned: SampleId[]; collected: SampleId[] }) {
  return (
    <group>
      {(Object.entries(SAMPLES) as Array<[SampleId, typeof SAMPLES[SampleId]]>).map(([id, sample], siteIndex) => {
        const [x, z] = sample.position
        const y = getTerrainHeight(siteId, x, z)
        const isCollected = collected.includes(id)
        const isScanned = scanned.includes(id)
        return (
          <group key={id} position={[x, y, z]}>
            <mesh position={[0, 0.09, 0]} rotation={[-Math.PI / 2, 0, 0]}>
              <torusGeometry args={[1.05, 0.025, 6, 32]} />
              <meshStandardMaterial color={isCollected ? '#d4aa72' : isScanned ? '#78cfc2' : '#d49b70'} emissive={isScanned ? '#24675e' : '#6c3a27'} emissiveIntensity={0.3} transparent opacity={0.75} />
            </mesh>
            {Array.from({ length: 6 }, (_, index) => {
              const angle = siteIndex * 0.5 + index * Math.PI / 3
              const distance = 0.3 + (index % 3) * 0.22
              const size = 0.42 + ((index * 7 + siteIndex) % 4) * 0.14
              return (
                <mesh key={index} position={[Math.cos(angle) * distance, size * 0.27, Math.sin(angle) * distance]} rotation={[0.08 * index, angle, 0.16 * index]} castShadow>
                  <dodecahedronGeometry args={[size, 0]} />
                  <meshStandardMaterial color={index % 2 ? '#925f4b' : '#a97458'} roughness={0.98} flatShading />
                </mesh>
              )
            })}
            <mesh position={[0, 2.5, 0]}>
              <cylinderGeometry args={[0.025, 0.025, 1.5, 6]} />
              <meshBasicMaterial color={isCollected ? '#d4aa72' : '#8de0d5'} transparent opacity={isCollected ? 0.2 : 0.18} />
            </mesh>
            <mesh position={[0, 3.25, 0]}>
              <sphereGeometry args={[0.09, 10, 8]} />
              <meshStandardMaterial color={isCollected ? '#d8ad72' : '#84e0d6'} emissive={isCollected ? '#70502b' : '#205d57'} emissiveIntensity={0.5} />
            </mesh>
          </group>
        )
      })}
    </group>
  )
}

function StaticRover({ siteId, position }: { siteId: LandingSiteId; position: RoverWorldPosition }) {
  return <group position={[position.x, getTerrainHeight(siteId, position.x, position.z), position.z]} rotation={[0, position.rotation, 0]}><RoverModel speed={{ current: 0 }} /></group>
}

function CrewGroup({ siteId }: { siteId: LandingSiteId }) {
  const positions = useMemo(() => getCrewWorldPositions(siteId), [siteId])
  return <group>{positions.map((person) => <CrewActor key={person.id} id={person.id} position={[person.x, person.y, person.z]} rotation={person.rotation} />)}</group>
}

type WorldActorsProps = {
  siteId: LandingSiteId
  roverDriving: boolean
  roverPosition: RoverWorldPosition
  scannedSamples: SampleId[]
  collectedSamples: SampleId[]
}

function WorldActors({ siteId, roverDriving, roverPosition, scannedSamples, collectedSamples }: WorldActorsProps) {
  return (
    <>
      <CrewGroup siteId={siteId} />
      <GeologicalSites siteId={siteId} scanned={scannedSamples} collected={collectedSamples} />
      {!roverDriving && <StaticRover siteId={siteId} position={roverPosition} />}
    </>
  )
}

export default WorldActors
