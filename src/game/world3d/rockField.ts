import type { LandingSiteId } from '../data/landingSites'
import { WORLD_CONFIG } from './worldConfig'

export type RockInstance = { x: number; z: number; size: number; rotation: number; tint: number }

function seededRandom(seedValue: number) {
  let seed = seedValue
  return () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
}

export function getRockInstances(siteId: LandingSiteId): RockInstance[] {
  const random = seededRandom(siteId === 'rocky-basin' ? 287 : 941)
  const rocky = siteId === 'rocky-basin'
  const clusterCount = rocky ? 42 : 32
  const total = rocky ? 1650 : 930
  const spread = WORLD_CONFIG.worldSize * 0.43
  const clusters = Array.from({ length: clusterCount }, () => ({
    x: (random() * 2 - 1) * spread,
    z: (random() * 2 - 1) * spread,
    width: 7 + random() * (rocky ? 26 : 20),
  }))
  const rocks: RockInstance[] = []
  for (let index = 0; index < total; index += 1) {
    const cluster = clusters[Math.floor(random() * clusters.length)]
    const angle = random() * Math.PI * 2
    const radius = Math.sqrt(random()) * cluster.width
    let x = cluster.x + Math.cos(angle) * radius
    let z = cluster.z + Math.sin(angle) * radius
    if (Math.abs(x) < 3.2 && z > -42 && z < 13) x += x < 0 ? -5 : 5
    if (Math.hypot(x, z - WORLD_CONFIG.objectivePosition[2]) < 4) x += 5
    const chance = random()
    const size = chance > (rocky ? 0.976 : 0.986)
      ? 1.8 + random() * (rocky ? 3.2 : 2.4)
      : 0.12 + Math.pow(random(), 1.8) * (rocky ? 1.45 : 0.92)
    rocks.push({ x, z, size, rotation: random() * Math.PI * 2, tint: 0.78 + random() * 0.35 })
  }
  return rocks
}
