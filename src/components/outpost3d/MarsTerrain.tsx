import { useEffect, useMemo } from 'react'
import { BufferAttribute, Color, Float32BufferAttribute, BufferGeometry, CanvasTexture, RepeatWrapping, SRGBColorSpace } from 'three'
import type { LandingSiteId } from '../../game/data/landingSites'
import { WORLD_CONFIG } from '../../game/world3d/worldConfig'
import { getTerrainHeight } from '../../game/world3d/terrain'

function createTerrainGeometry(siteId: LandingSiteId): BufferGeometry {
  const segments = WORLD_CONFIG.terrainSegments
  const size = WORLD_CONFIG.worldSize
  const stride = segments + 1
  const vertexCount = stride * stride
  const positions = new Float32Array(vertexCount * 3)
  const uvs = new Float32Array(vertexCount * 2)
  const colors = new Float32Array(vertexCount * 3)
  const indices = new Uint32Array(segments * segments * 6)
  const vertexColor = new Color()
  const isRocky = siteId === 'rocky-basin'
  for (let row = 0; row <= segments; row += 1) {
    const z = (row / segments - 0.5) * size
    for (let column = 0; column <= segments; column += 1) {
      const x = (column / segments - 0.5) * size
      const index = row * stride + column
      const height = getTerrainHeight(siteId, x, z)
      const colorNoise = Math.sin(x * 0.043 + Math.cos(z * 0.031)) * 0.035
      const geologicalPatch = Math.sin(x * 0.016 + z * 0.011) * 0.055
      const value = Math.max(0.72, Math.min(1.08, 0.88 + colorNoise + geologicalPatch + (isRocky ? -0.04 : 0)))

      positions[index * 3] = x
      positions[index * 3 + 1] = height
      positions[index * 3 + 2] = z
      uvs[index * 2] = column / segments
      uvs[index * 2 + 1] = row / segments

      vertexColor.setRGB(value, value, value)
      if (isRocky && height > 5) vertexColor.multiplyScalar(0.84)
      colors[index * 3] = vertexColor.r
      colors[index * 3 + 1] = vertexColor.g
      colors[index * 3 + 2] = vertexColor.b
    }
  }

  let cursor = 0
  for (let row = 0; row < segments; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * stride + column
      const b = a + stride
      const c = a + 1
      const d = b + 1
      indices[cursor++] = a
      indices[cursor++] = b
      indices[cursor++] = c
      indices[cursor++] = b
      indices[cursor++] = d
      indices[cursor++] = c
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('uv', new Float32BufferAttribute(uvs, 2))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(new BufferAttribute(indices, 1))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function createRegolithTexture(siteId: LandingSiteId): CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Could not create the Mars terrain texture.')

  const image = context.createImageData(canvas.width, canvas.height)
  let seed = siteId === 'rocky-basin' ? 4141 : 8629
  const random = () => {
    seed = (seed * 16807) % 2147483647
    return (seed - 1) / 2147483646
  }
  const base = siteId === 'rocky-basin' ? [118, 71, 61] : [145, 76, 55]

  for (let pixel = 0; pixel < image.data.length; pixel += 4) {
    const grain = (random() - 0.5) * 38
    image.data[pixel] = Math.max(0, Math.min(255, base[0] + grain))
    image.data[pixel + 1] = Math.max(0, Math.min(255, base[1] + grain * 0.62))
    image.data[pixel + 2] = Math.max(0, Math.min(255, base[2] + grain * 0.48))
    image.data[pixel + 3] = 255
  }
  context.putImageData(image, 0, 0)

  for (let i = 0; i < 5200; i += 1) {
    const x = random() * canvas.width
    const y = random() * canvas.height
    const radius = 0.25 + random() * (siteId === 'rocky-basin' ? 2.2 : 1.4)
    const light = random() > 0.54
    context.fillStyle = light
      ? `rgba(224, 159, 112, ${0.025 + random() * 0.11})`
      : `rgba(45, 35, 37, ${0.025 + random() * 0.12})`
    context.beginPath()
    context.ellipse(x, y, radius * 1.6, radius, random() * Math.PI, 0, Math.PI * 2)
    context.fill()
  }

  const texture = new CanvasTexture(canvas)
  texture.colorSpace = SRGBColorSpace
  texture.wrapS = RepeatWrapping
  texture.wrapT = RepeatWrapping
  texture.repeat.set(24, 24)
  texture.anisotropy = 4
  texture.needsUpdate = true
  return texture
}

function MarsTerrain({ siteId }: { siteId: LandingSiteId }) {
  const geometry = useMemo(() => createTerrainGeometry(siteId), [siteId])
  const texture = useMemo(() => createRegolithTexture(siteId), [siteId])

  useEffect(() => () => geometry.dispose(), [geometry])
  useEffect(() => () => texture.dispose(), [texture])

  return (
    <mesh geometry={geometry} receiveShadow>
      <meshStandardMaterial
        map={texture}
        color="#e2c1ad"
        roughness={0.96}
        metalness={0}
        vertexColors
        bumpMap={texture}
        bumpScale={0.052}
      />
    </mesh>
  )
}

export default MarsTerrain
