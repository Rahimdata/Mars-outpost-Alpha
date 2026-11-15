import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { SAMPLES, type InteractionTarget, type InteriorBuildingId, type SampleId } from '../../game/data/gameplay'
import type { LandingSiteId } from '../../game/data/landingSites'
import { getCrewWorldPositions } from '../../game/world3d/actorLayout'
import { getColonyLayout } from '../../game/world3d/colonyLayout'
import type { WorldControls } from '../../game/world3d/types'
import type { RoverWorldPosition } from '../../game/world3d/types'

type Props = {
  siteId: LandingSiteId
  controls: WorldControls
  playerRef: { current: Group | null }
  interiorBuildingId: InteriorBuildingId | null
  roverDriving: boolean
  roverPosition: RoverWorldPosition
  onNearbyChange: (target: InteractionTarget | null) => void
  onInteract: (target: InteractionTarget) => void
}

function WorldInteractionManager({ siteId, controls, playerRef, interiorBuildingId, roverDriving, roverPosition, onNearbyChange, onInteract }: Props) {
  const buildings = useMemo(() => getColonyLayout(siteId), [siteId])
  const crew = useMemo(() => getCrewWorldPositions(siteId), [siteId])
  const previousTargetKey = useRef('')
  const interactionDown = useRef(false)

  useFrame(() => {
    const player = playerRef.current
    if (!player) return
    const candidates: Array<{ target: InteractionTarget; distance: number; priority: number }> = []
    const offer = (target: InteractionTarget, distance: number, range: number, priority = 0) => {
      if (distance > range) return
      candidates.push({ target, distance, priority })
    }

    if (roverDriving) {
      offer({ kind: 'rover-exit' }, 0, 1)
    } else if (interiorBuildingId) {
      const exitDoorZ = interiorBuildingId === 'habitat' ? 7.45 : interiorBuildingId === 'greenhouse' ? 8.0 : 2.65
      offer({ kind: 'interior-exit' }, Math.hypot(player.position.x, player.position.z - exitDoorZ), 2.2)
      if (interiorBuildingId === 'habitat') {
        offer({ kind: 'interior-equipment', id: 'life-support' }, Math.hypot(player.position.x + 3.95, player.position.z - 1.42), 2.2)
      } else if (interiorBuildingId === 'greenhouse') {
        offer({ kind: 'interior-equipment', id: 'grow-lights' }, Math.hypot(player.position.x, player.position.z + 2.6), 2.0)
      } else {
        offer({ kind: 'interior-equipment', id: 'lab-workbench' }, Math.hypot(player.position.x - 3.9, player.position.z + 0.8), 2.2)
      }
    } else {
      const habitat = buildings.find((building) => building.id === 'habitat')!
      offer({ kind: 'exterior-equipment', id: 'communications' }, Math.hypot(player.position.x - (habitat.x + 9), player.position.z - (habitat.z - 3)), 3.6)
      for (const building of buildings) {
        const distance = building.id === 'rover-garage'
          ? Math.hypot(
              player.position.x - (building.x + Math.sin(building.rotation) * 8.5),
              player.position.z - (building.z + Math.cos(building.rotation) * 8.5),
            )
          : Math.max(0, Math.hypot(player.position.x - building.x, player.position.z - building.z) - building.radius)
        offer({ kind: 'building', id: building.id }, distance + 0.55, 4.2)
      }
      for (const person of crew) {
        const distance = Math.hypot(player.position.x - person.x, player.position.z - person.z)
        // Let the talk prompt win over a nearby building/airlock when a crew
        // member is within reach, so doorway placement cannot block mission dialogue.
        offer({ kind: 'crew', id: person.id }, distance, 4.1, -1)
      }
      for (const id of Object.keys(SAMPLES) as SampleId[]) {
        const sample = SAMPLES[id]
        offer({ kind: 'sample', id }, Math.hypot(player.position.x - sample.position[0], player.position.z - sample.position[1]), 3.8)
      }
      const roverDistance = Math.hypot(player.position.x - roverPosition.x, player.position.z - roverPosition.z)
      offer({ kind: 'rover' }, roverDistance - 0.1, 4.3)
    }

    candidates.sort((a, b) => a.priority - b.priority || a.distance - b.distance)
    const target = candidates[0]?.target ?? null
    const targetKey = target ? `${target.kind}:${'id' in target ? target.id : 'exit'}` : ''
    if (targetKey !== previousTargetKey.current) {
      previousTargetKey.current = targetKey
      onNearbyChange(target)
    }

    const isDown = controls.keys.has('KeyE')
    if (isDown && !interactionDown.current && target) onInteract(target)
    interactionDown.current = isDown
  })

  return null
}

export default WorldInteractionManager
