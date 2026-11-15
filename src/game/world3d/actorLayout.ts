import type { CrewId } from '../data/gameplay'
import type { LandingSiteId } from '../data/landingSites'
import { getColonyLayout } from './colonyLayout'
import { getTerrainHeight } from './terrain'

export type CrewWorldPosition = { id: CrewId; x: number; y: number; z: number; rotation: number }

export function getCrewWorldPositions(siteId: LandingSiteId): CrewWorldPosition[] {
  const buildings = getColonyLayout(siteId)
  const byId = new Map(buildings.map((building) => [building.id, building]))
  const habitat = byId.get('habitat')!
  // The habitat airlock is on its local +Z face (door center z=12.25).
  // Stand Ryan just outside and to the right of the entrance so he does not
  // block the doorway, while remaining close enough for the talk interaction.
  const ryanLocalX = 3.2
  const ryanLocalZ = 15
  const cos = Math.cos(habitat.rotation)
  const sin = Math.sin(habitat.rotation)
  const ryanX = habitat.x + ryanLocalX * cos + ryanLocalZ * sin
  const ryanZ = habitat.z - ryanLocalX * sin + ryanLocalZ * cos
  const laboratory = byId.get('laboratory')!
  // Stand Emma just outside the laboratory airlock, offset from the doorway
  // so she remains easy to approach without blocking the entrance.
  const emmaLocalX = 2.1
  const emmaLocalZ = 10.2
  const labCos = Math.cos(laboratory.rotation)
  const labSin = Math.sin(laboratory.rotation)
  const emmaX = laboratory.x + emmaLocalX * labCos + emmaLocalZ * labSin
  const emmaZ = laboratory.z - emmaLocalX * labSin + emmaLocalZ * labCos
  const garage = byId.get('rover-garage')!
  // Keep Alex just outside the right side of the vehicle bay entrance, clear
  // of the doorway while close enough to approach and talk to. This spot is on
  // the raised garage apron, so anchor his feet to the apron surface.
  const alexLocalX = 4.7
  const alexLocalZ = 8.8
  const garageCos = Math.cos(garage.rotation)
  const garageSin = Math.sin(garage.rotation)
  const alexX = garage.x + alexLocalX * garageCos + alexLocalZ * garageSin
  const alexZ = garage.z - alexLocalX * garageSin + alexLocalZ * garageCos
  return [
    { id: 'ryan', x: ryanX, z: ryanZ, y: getTerrainHeight(siteId, ryanX, ryanZ), rotation: habitat.rotation + 0.9 },
    { id: 'emma', x: emmaX, z: emmaZ, y: getTerrainHeight(siteId, emmaX, emmaZ), rotation: laboratory.rotation + Math.atan2(-emmaLocalX, -emmaLocalZ) },
    { id: 'alex', x: alexX, z: alexZ, y: garage.y + 0.05, rotation: Math.PI - garage.rotation + Math.atan2(-alexLocalX, -(alexLocalZ - 6.5)) },
  ]
}

export function getRoverPosition(siteId: LandingSiteId) {
  const garage = getColonyLayout(siteId).find((building) => building.id === 'rover-garage')!
  // Bay 1 parking spot inside the hangar, aligned with the +Z vehicle door.
  const localZ = 0
  const x = garage.x + Math.sin(garage.rotation) * localZ
  const z = garage.z + Math.cos(garage.rotation) * localZ
  // The rover wheels rest on the garage slab, whose top is 0.24 m above the
  // graded pad; RoverModel's lowest wheel point is 0.12 m above its root.
  return { x, y: garage.y + 0.12, z, rotation: garage.rotation }
}
