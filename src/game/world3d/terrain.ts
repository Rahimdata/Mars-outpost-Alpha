import type { LandingSiteId } from '../data/landingSites'
import { CAMPAIGN_STATE_KEY } from '../state/campaignState'
import { getColonyLayout } from './colonyLayout'
import type { ColonyBuilding } from './colonyLayout'
import { WORLD_CONFIG } from './worldConfig'

function readTerrainSeedOffset() {
  try {
    const campaign = JSON.parse(localStorage.getItem(CAMPAIGN_STATE_KEY) ?? 'null') as { seed?: unknown } | null
    return typeof campaign?.seed === 'number' && Number.isFinite(campaign.seed) ? Math.abs(Math.floor(campaign.seed)) % 10000 : 0
  } catch { return 0 }
}

const terrainSeedOffset = readTerrainSeedOffset()

function latticeValue(x: number, z: number, seed: number): number {
  const value = Math.sin(x * 127.1 + z * 311.7 + seed * 74.7) * 43758.5453123
  return (value - Math.floor(value)) * 2 - 1
}

function smooth(value: number): number {
  return value * value * (3 - 2 * value)
}

function valueNoise(x: number, z: number, seed: number): number {
  const x0 = Math.floor(x)
  const z0 = Math.floor(z)
  const tx = smooth(x - x0)
  const tz = smooth(z - z0)
  const a = latticeValue(x0, z0, seed)
  const b = latticeValue(x0 + 1, z0, seed)
  const c = latticeValue(x0, z0 + 1, seed)
  const d = latticeValue(x0 + 1, z0 + 1, seed)
  const top = a + (b - a) * tx
  const bottom = c + (d - c) * tx
  return top + (bottom - top) * tz
}

function fbm(x: number, z: number, seed: number, octaves = 4): number {
  let sum = 0
  let amplitude = 0.52
  let frequency = 1
  let normalization = 0

  for (let octave = 0; octave < octaves; octave += 1) {
    sum += valueNoise(x * frequency, z * frequency, seed + octave * 17) * amplitude
    normalization += amplitude
    amplitude *= 0.5
    frequency *= 2.03
  }

  return sum / normalization
}

function crater(x: number, z: number, centerX: number, centerZ: number, radius: number, depth: number): number {
  const distance = Math.hypot(x - centerX, z - centerZ) / radius
  const bowl = -depth * Math.exp(-distance * distance * 3.1)
  const rimDistance = (distance - 1.02) / 0.105
  const rim = depth * 0.34 * Math.exp(-rimDistance * rimDistance)
  return bowl + rim
}

export function rawTerrainHeight(siteId: LandingSiteId, x: number, z: number): number {
  const broad = fbm(x * 0.0085, z * 0.0085, (siteId === 'rocky-basin' ? 23 : 51) + terrainSeedOffset)
  const middle = fbm(x * 0.026, z * 0.026, (siteId === 'rocky-basin' ? 71 : 93) + terrainSeedOffset)
  const fine = fbm(x * 0.092, z * 0.092, (siteId === 'rocky-basin' ? 127 : 149) + terrainSeedOffset, 3)

  if (siteId === 'open-plain') {
    return (
      broad * 7.4 +
      middle * 1.8 +
      fine * 0.28 +
      crater(x, z, 74, -93, 39, 3.8) +
      crater(x, z, -112, 62, 23, 2.1) +
      crater(x, z, 145, 122, 31, 2.5)
    )
  }

  const ridgeNoise = valueNoise((x + z * 0.38) * 0.014, (z - x * 0.27) * 0.009, 201 + terrainSeedOffset)
  const ridges = Math.pow(1 - Math.abs(ridgeNoise), 3.2) * 11
  const basinDistance = Math.hypot(x - 28, z + 34)
  const basin = -7.2 * Math.exp(-(basinDistance * basinDistance) / (2 * 78 * 78))
  const basinRim = 4.3 * Math.exp(-Math.pow((basinDistance - 72) / 15, 2))

  return (
    broad * 15.5 +
    middle * 4.5 +
    fine * 0.65 +
    ridges +
    basin +
    basinRim +
    crater(x, z, -102, -110, 48, 6.5) +
    crater(x, z, 128, 82, 32, 4.5)
  )
}

const startHeightBySite: Record<LandingSiteId, number> = {
  'open-plain': rawTerrainHeight('open-plain', 0, WORLD_CONFIG.playerStart[2]),
  'rocky-basin': rawTerrainHeight('rocky-basin', 0, WORLD_CONFIG.playerStart[2]),
}

export function getRawTerrainHeight(siteId: LandingSiteId, x: number, z: number): number {
  return rawTerrainHeight(siteId, x, z) - startHeightBySite[siteId]
}

type GradedPad = { x: number; z: number; height: number; cos: number; sin: number; halfWidth: number; halfDepth: number; blend: number }
const padDimensions: Record<ColonyBuilding['id'], [number, number]> = {
  habitat: [35.5, 35.5],
  greenhouse: [15.2, 27],
  laboratory: [25, 21],
  'solar-array': [20, 17],
  'battery-storage': [17, 13],
  'rover-garage': [20, 22],
}
const gradedPadsBySite: Partial<Record<LandingSiteId, GradedPad[]>> = {}

function getGradedPads(siteId: LandingSiteId): GradedPad[] {
  if (!gradedPadsBySite[siteId]) {
    gradedPadsBySite[siteId] = getColonyLayout(siteId).map((building) => {
      const [width, depth] = padDimensions[building.id]
      return { x: building.x, z: building.z, height: building.y, cos: Math.cos(building.rotation), sin: Math.sin(building.rotation), halfWidth: width / 2, halfDepth: depth / 2, blend: siteId === 'rocky-basin' ? 6 : 0 }
    })
  }
  return gradedPadsBySite[siteId]!
}

/** Smooth, level construction pads keep Rocky Basin facilities above the uneven terrain. */
export function getTerrainHeight(siteId: LandingSiteId, x: number, z: number): number {
  const naturalHeight = getRawTerrainHeight(siteId, x, z)
  if (siteId !== 'rocky-basin') return naturalHeight

  let height = naturalHeight
  for (const pad of getGradedPads(siteId)) {
    const dx = x - pad.x
    const dz = z - pad.z
    if (Math.abs(dx) > pad.halfWidth + pad.blend + pad.halfDepth || Math.abs(dz) > pad.halfWidth + pad.blend + pad.halfDepth) continue
    const localX = dx * pad.cos - dz * pad.sin
    const localZ = dx * pad.sin + dz * pad.cos
    const edgeX = Math.abs(localX) - pad.halfWidth
    const edgeZ = Math.abs(localZ) - pad.halfDepth
    if (edgeX > pad.blend || edgeZ > pad.blend) continue
    const edge = Math.max(0, edgeX / pad.blend, edgeZ / pad.blend)
    const smoothEdge = edge * edge * (3 - 2 * edge)
    const padWeight = 1 - smoothEdge
    height += (pad.height - height) * padWeight
  }
  return height
}
