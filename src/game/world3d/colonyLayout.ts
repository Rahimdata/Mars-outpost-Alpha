import { OUTPOST_BUILDINGS } from '../data/outpostBuildings'
import type { BuildingId } from '../data/outpostBuildings'
import type { LandingSiteId } from '../data/landingSites'
import { getRockInstances } from './rockField'
import { getRawTerrainHeight } from './terrain'

export type ColonyBuilding = {
  id: BuildingId
  name: string
  purpose: string
  description: string
  condition: string
  status: string
  x: number
  y: number
  z: number
  rotation: number
  radius: number
}

const buildingSpecs: Record<BuildingId, { open: [number, number]; rocky: [number, number]; radius: number; rotation: number }> = {
  habitat: { open: [0, -13], rocky: [0, -13], radius: 17.4, rotation: 0.08 },
  greenhouse: { open: [14, -19], rocky: [15, -18], radius: 11.4, rotation: 0.16 },
  laboratory: { open: [23, -4], rocky: [24, -5], radius: 16.4, rotation: -0.22 },
  'solar-array': { open: [-29, -20], rocky: [-31, -19], radius: 10.5, rotation: 0.24 },
  'battery-storage': { open: [-15, -7], rocky: [-16, -8], radius: 9.2, rotation: -0.13 },
  // Keep the garage and its long approach apron clear of the research lab.
  'rover-garage': { open: [43, 26], rocky: [45, 26], radius: 10.8, rotation: -0.12 },
}

export function getColonyLayout(siteId: LandingSiteId): ColonyBuilding[] {
  const rocky = siteId === 'rocky-basin'
  const rocks = getRockInstances(siteId).filter((rock) => rock.size > 1.35)
  const placed: ColonyBuilding[] = []

  for (const data of OUTPOST_BUILDINGS) {
    const spec = buildingSpecs[data.id]
    const preferred = rocky ? spec.rocky : spec.open
    let best: { x: number; z: number; score: number } | null = null

    for (let ring = 0; ring <= 5; ring += 1) {
      const count = ring === 0 ? 1 : 20
      for (let step = 0; step < count; step += 1) {
        const angle = (step / count) * Math.PI * 2 + ring * 0.19
        const distance = ring * 4
        const x = preferred[0] + Math.cos(angle) * distance
        const z = preferred[1] + Math.sin(angle) * distance
        const center = getRawTerrainHeight(siteId, x, z)
        const sampleRadius = Math.min(spec.radius * 0.62, 4.4)
        const samples = [
          getRawTerrainHeight(siteId, x + sampleRadius, z),
          getRawTerrainHeight(siteId, x - sampleRadius, z),
          getRawTerrainHeight(siteId, x, z + sampleRadius),
          getRawTerrainHeight(siteId, x, z - sampleRadius),
        ]
        const grade = Math.max(...samples, center) - Math.min(...samples, center)
        const overlapsBuilding = placed.some((building) =>
          Math.hypot(x - building.x, z - building.z) < spec.radius + building.radius + 4,
        )
        const overlapsBoulder = rocks.some((rock) =>
          Math.hypot(x - rock.x, z - rock.z) < spec.radius + rock.size * 0.82 + 2,
        )
        if (overlapsBuilding || overlapsBoulder) continue

        const score = grade * (rocky ? 1.1 : 1.6) + distance * 0.09
        if (!best || score < best.score) best = { x, z, score }
        if (grade <= (rocky ? 1.2 : 0.58)) break
      }
      if (best && best.score < (rocky ? 2.1 : 1.2)) break
    }

    const x = best?.x ?? preferred[0]
    const z = best?.z ?? preferred[1]
    placed.push({
      id: data.id,
      name: data.name,
      purpose: data.purpose,
      description: data.description,
      condition: data.condition,
      status: data.status,
      x,
      y: getRawTerrainHeight(siteId, x, z),
      z,
      rotation: spec.rotation,
      radius: spec.radius,
    })
  }

  return placed
}
