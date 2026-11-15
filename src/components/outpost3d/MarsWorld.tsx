import { useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import { useFrame } from '@react-three/fiber'
import {
  BufferGeometry,
  Color,
  DirectionalLight,
  Float32BufferAttribute,
  MathUtils,
  IcosahedronGeometry,
  InstancedMesh,
  Object3D,
  Shape,
  ShapeGeometry,
} from 'three'
import type { Group } from 'three'
import type { LandingSiteId } from '../../game/data/landingSites'
import type { RoverWorldPosition, WorldControls } from '../../game/world3d/types'
import type { BuildingId } from '../../game/data/outpostBuildings'
import { getTerrainHeight } from '../../game/world3d/terrain'
import { getRockInstances } from '../../game/world3d/rockField'
import type { RockInstance } from '../../game/world3d/rockField'
import { WORLD_CONFIG } from '../../game/world3d/worldConfig'
import ThirdPersonPlayer from './ThirdPersonPlayer'
import MarsTerrain from './MarsTerrain'
import ColonyBuildings from './ColonyBuildings'
import WorldActors from './WorldActors'
import InteriorScene from './InteriorScene'
import WorldInteractionManager from './WorldInteractionManager'
import ExpansionModules from './ExpansionModules'
import type { CropPlot, ExpansionId } from '../../game/state/colonyState'
import type { FootstepSurface } from '../../game/state/MarsAudioManager'
import type { InteractionTarget, InteriorBuildingId, SampleId } from '../../game/data/gameplay'

type MarsWorldProps = {
  siteId: LandingSiteId
  controls: WorldControls
  interiorBuildingId: InteriorBuildingId | null
  doorOpenBuildingId: BuildingId | null
  roverDriving: boolean
  roverPosition: RoverWorldPosition
  initialRoverBattery: number
  stormIntensity: number
  solMinute: number
  powerPercent: number
  solarDust: number
  builtExpansions: ExpansionId[]
  crops: CropPlot[]
  roverEfficiency: number
  navigationTarget: [number, number, number] | null
  interiorNavigationTarget: [number, number, number] | null
  scannedSamples: SampleId[]
  collectedSamples: SampleId[]
  onNearbyChange: (target: InteractionTarget | null) => void
  onInteract: (target: InteractionTarget) => void
  onRoverStatus: (battery: number, distance: number, position: RoverWorldPosition) => void
  onRoverSurvey: () => void
  onFootstep: (surface: FootstepSurface, running: boolean, inside: boolean) => void
  onMotion: (x: number, z: number, speed: number) => void
}

export const MARS_MOUNTAIN_CONFIG = {
  seed: 522,
  segments: 320,
  radialSteps: 14,
  fogDensity: 0.0032,
  dustFogDensity: 0.0085,
  hazeColor: '#c58f7d',
  layers: [
    { inner: 74, outer: 126, height: 20, seed: 37, color: '#754a45' },
    { inner: 116, outer: 198, height: 39, seed: 113, color: '#96645a' },
    { inner: 184, outer: 286, height: 62, seed: 229, color: '#b18073' },
  ],
  palette: { lit: '#b5785d', shadow: '#543d3c', haze: '#c58f7d', darkRock: '#68453f' },
} as const

function makeRockGeometry(): IcosahedronGeometry {
  const geometry = new IcosahedronGeometry(1, 1)
  const positions = geometry.attributes.position
  for (let index = 0; index < positions.count; index += 1) {
    const x = positions.getX(index)
    const y = positions.getY(index)
    const z = positions.getZ(index)
    const irregularity = 0.82 + Math.abs(Math.sin(x * 11.7 + y * 5.1 + z * 9.2)) * 0.24
    positions.setXYZ(index, x * irregularity, y * irregularity, z * irregularity)
  }
  geometry.computeVertexNormals()
  return geometry
}

function InstancedRockLayer({
  rocks,
  geometry,
  siteId,
  castShadow,
}: {
  rocks: RockInstance[]
  geometry: IcosahedronGeometry
  siteId: LandingSiteId
  castShadow: boolean
}) {
  const mesh = useRef<InstancedMesh>(null)

  useLayoutEffect(() => {
    const instance = mesh.current
    if (!instance) return
    const dummy = new Object3D()
    const color = new Color()

    rocks.forEach((rock, index) => {
      const ground = getTerrainHeight(siteId, rock.x, rock.z)
      dummy.position.set(rock.x, ground + rock.size * 0.36, rock.z)
      dummy.rotation.set(rock.rotation * 0.21, rock.rotation, rock.rotation * 0.13)
      dummy.scale.set(rock.size * 1.3, rock.size * (0.58 + rock.tint * 0.12), rock.size)
      dummy.updateMatrix()
      instance.setMatrixAt(index, dummy.matrix)

      const tint = rock.tint
      // Keep the instances in a sunlit regolith range; the old multipliers
      // drove the standard material almost to black after tone mapping.
      color.setRGB(0.78 * tint, 0.47 * tint, 0.34 * tint)
      instance.setColorAt(index, color)
    })

    instance.instanceMatrix.needsUpdate = true
    if (instance.instanceColor) instance.instanceColor.needsUpdate = true
    instance.computeBoundingSphere()
  }, [geometry, rocks, siteId])

  if (rocks.length === 0) return null

  return (
    <instancedMesh
      ref={mesh}
      args={[geometry, undefined, rocks.length]}
      castShadow={castShadow}
      receiveShadow
      frustumCulled
    >
      <meshStandardMaterial color="#ffffff" roughness={1} vertexColors />
    </instancedMesh>
  )
}

function RockField({ siteId }: { siteId: LandingSiteId }) {
  const allRocks = useMemo(() => getRockInstances(siteId), [siteId])
  const smallRocks = useMemo(() => allRocks.filter((rock) => rock.size <= 1.8), [allRocks])
  const boulders = useMemo(() => allRocks.filter((rock) => rock.size > 1.8), [allRocks])
  const geometry = useMemo(() => makeRockGeometry(), [])

  useEffect(() => () => geometry.dispose(), [geometry])

  return (
    <group>
      <InstancedRockLayer rocks={smallRocks} geometry={geometry} siteId={siteId} castShadow={false} />
      <InstancedRockLayer rocks={boulders} geometry={geometry} siteId={siteId} castShadow />
    </group>
  )
}

function ridgeNoise(angle: number, seed: number, octaves = 6): number {
  let total = 0
  let amplitude = 0.56
  let weight = 0
  for (let octave = 0; octave < octaves; octave += 1) {
    const frequency = 3.1 * 2 ** octave
    const warped = angle + Math.sin(angle * (1.7 + octave * 0.31) + seed) * 0.11
    const signal = Math.sin(warped * frequency + seed * (octave + 1) * 0.73)
    const ridged = 1 - Math.abs(signal)
    total += (ridged * ridged * 2 - 0.58) * amplitude
    weight += amplitude
    amplitude *= 0.48
  }
  return total / weight
}

function makeMountainRing(layer: (typeof MARS_MOUNTAIN_CONFIG.layers)[number], siteId: LandingSiteId): BufferGeometry {
  const segments = MARS_MOUNTAIN_CONFIG.segments
  const rows = MARS_MOUNTAIN_CONFIG.radialSteps
  const stride = segments + 1
  const positions = new Float32Array(stride * (rows + 1) * 3)
  const colors = new Float32Array(stride * (rows + 1) * 3)
  const indices = new Uint32Array(segments * rows * 6)
  const lit = new Color(MARS_MOUNTAIN_CONFIG.palette.lit)
  const shadow = new Color(MARS_MOUNTAIN_CONFIG.palette.shadow)
  const haze = new Color(MARS_MOUNTAIN_CONFIG.palette.haze)
  const rockyBoost = siteId === 'rocky-basin' ? 1.24 : 1

  for (let row = 0; row <= rows; row += 1) {
    const t = row / rows
    const radius = MathUtils.lerp(layer.inner, layer.outer, t)
    const radialProfile = Math.pow(Math.sin(Math.PI * t), 0.72)
    for (let column = 0; column <= segments; column += 1) {
      const angle = column / segments * Math.PI * 2
      const noise = ridgeNoise(angle, layer.seed + (siteId === 'rocky-basin' ? 19 : 0))
      const massif = Math.sin(angle * 2.3 + layer.seed) * 0.24 + Math.sin(angle * 5.7 - layer.seed) * 0.12
      const mesa = Math.max(0, 1 - Math.abs(Math.sin(angle * 1.35 + layer.seed * 0.4)) * 4.2)
      const peak = Math.max(-0.2, noise + massif) + mesa * 0.24
      const y = -3 + radialProfile * layer.height * rockyBoost * (0.58 + peak)
      const index = row * stride + column
      positions.set([Math.cos(angle) * radius, y, Math.sin(angle) * radius], index * 3)

      const slopeShade = 0.78 + Math.max(0, Math.sin(angle * 2.1 + layer.seed)) * 0.26
      const rock = shadow.clone().lerp(lit, MathUtils.clamp(0.46 + noise * 0.3, 0.2, 0.78)).multiplyScalar(slopeShade)
      const distanceHaze = layer.height < 25 ? 0.3 : layer.height < 45 ? 0.53 : 0.73
      rock.lerp(haze, distanceHaze)
      colors.set([rock.r, rock.g, rock.b], index * 3)
    }
  }

  let cursor = 0
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < segments; column += 1) {
      const a = row * stride + column
      const b = a + stride
      indices.set([a, b, a + 1, b, b + 1, a + 1], cursor)
      cursor += 6
    }
  }

  const geometry = new BufferGeometry()
  geometry.setAttribute('position', new Float32BufferAttribute(positions, 3))
  geometry.setAttribute('color', new Float32BufferAttribute(colors, 3))
  geometry.setIndex(Array.from(indices))
  geometry.computeVertexNormals()
  geometry.computeBoundingSphere()
  return geometry
}

function DistantMountains({ siteId, playerRef }: { siteId: LandingSiteId; playerRef: { current: Group | null } }) {
  const group = useRef<Group>(null)
  const geometries = useMemo(() => MARS_MOUNTAIN_CONFIG.layers.map((layer) => makeMountainRing(layer, siteId)), [siteId])
  useEffect(() => () => geometries.forEach((geometry) => geometry.dispose()), [geometries])
  useFrame(() => {
    const player = playerRef.current
    if (!player || !group.current) return
    group.current.position.set(player.position.x, getTerrainHeight(siteId, player.position.x, player.position.z), player.position.z)
  })

  return (
    <group ref={group}>
      {MARS_MOUNTAIN_CONFIG.layers.map((layer, index) => (
        <mesh key={layer.seed} geometry={geometries[index]} castShadow receiveShadow>
          <meshStandardMaterial vertexColors roughness={1} metalness={0} side={2} />
        </mesh>
      ))}
    </group>
  )
}

function AtmosphereDome() {
  return (
    <mesh scale={900} renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[1, 40, 28]} />
      <shaderMaterial
        side={2}
        depthWrite={false}
        toneMapped={false}
        vertexShader={[
          'varying vec3 vDirection;',
          'void main() {',
          '  vec4 worldPosition = modelMatrix * vec4(position, 1.0);',
          '  vDirection = normalize(worldPosition.xyz - cameraPosition);',
          '  gl_Position = projectionMatrix * viewMatrix * worldPosition;',
          '}',
        ].join('\n')}
        fragmentShader={[
          'varying vec3 vDirection;',
          'void main() {',
          '  float elevation = max(vDirection.y, 0.0);',
          '  vec3 horizon = vec3(0.79, 0.57, 0.49);',
          '  vec3 dustyBand = vec3(0.72, 0.49, 0.43);',
          '  vec3 zenith = vec3(0.43, 0.37, 0.40);',
          '  float glow = exp(-elevation * 18.0);',
          '  vec3 color = mix(horizon, dustyBand, smoothstep(0.015, 0.2, elevation));',
          '  color = mix(color, zenith, smoothstep(0.2, 0.82, elevation));',
          '  color += vec3(0.11, 0.055, 0.035) * glow;',
          '  gl_FragColor = vec4(color, 1.0);',
          '}',
        ].join('\n')}
      />
    </mesh>
  )
}

function MarsSun() {
  return (
    <mesh position={[255, 176, -430]}>
      <sphereGeometry args={[11, 24, 16]} />
      <meshBasicMaterial color="#f5c49a" toneMapped={false} />
    </mesh>
  )
}

function FollowSunLight({ playerRef, stormIntensity }: { playerRef: { current: Group | null }; stormIntensity: number }) {
  const light = useRef<DirectionalLight>(null)

  useFrame(() => {
    const target = playerRef.current
    const sun = light.current
    if (!target || !sun) return

    sun.position.set(target.position.x - 42, target.position.y + 70, target.position.z + 34)
    sun.target.position.set(target.position.x, target.position.y, target.position.z)
    sun.target.updateMatrixWorld()
    sun.updateMatrixWorld()
  })

  return (
    <directionalLight
      ref={light}
      color="#ffe3c2"
      castShadow
      intensity={2.5 - stormIntensity * 1.25}
      shadow-mapSize-width={1536}
      shadow-mapSize-height={1536}
      shadow-camera-left={-72}
      shadow-camera-right={72}
      shadow-camera-top={72}
      shadow-camera-bottom={-72}
      shadow-camera-near={1}
      shadow-camera-far={190}
      shadow-bias={-0.00012}
      shadow-normalBias={0.03}
    />
  )
}

function GroundDust({ playerRef, stormIntensity = 0 }: { playerRef: { current: Group | null }; stormIntensity?: number }) {
  const group = useRef<Group>(null)
  const geometry = useMemo(() => {
    let seed = 623
    const random = () => {
      seed = (seed * 16807) % 2147483647
      return (seed - 1) / 2147483646
    }
    const positions = new Float32Array(55 * 3)
    for (let i = 0; i < 55; i += 1) {
      positions[i * 3] = (random() - 0.5) * 32
      positions[i * 3 + 1] = 0.3 + random() * 2.4
      positions[i * 3 + 2] = (random() - 0.5) * 32
    }
    const value = new BufferGeometry()
    value.setAttribute('position', new Float32BufferAttribute(positions, 3))
    return value
  }, [])

  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame((state) => {
    const player = playerRef.current
    if (!group.current || !player) return
    group.current.position.set(player.position.x, player.position.y, player.position.z)
    group.current.position.x += Math.sin(state.clock.elapsedTime * 0.35) * stormIntensity * 2.4
    group.current.rotation.y = state.clock.elapsedTime * (0.012 + stormIntensity * 0.17)
  })

  return (
    <group ref={group}>
      <points geometry={geometry} frustumCulled={false}>
        <pointsMaterial
          color="#e4b28e"
          size={0.12}
          sizeAttenuation
          transparent
          opacity={0.12 + stormIntensity * 0.55}
          depthWrite={false}
        />
      </points>
    </group>
  )
}

function SurveyBeacon({ siteId }: { siteId: LandingSiteId }) {
  const ring = useRef<Object3D>(null)
  const x = WORLD_CONFIG.objectivePosition[0]
  const z = WORLD_CONFIG.objectivePosition[2]
  const y = getTerrainHeight(siteId, x, z)

  useFrame((state) => {
    if (ring.current) ring.current.rotation.y = state.clock.elapsedTime * 0.55
  })

  return (
    <group position={[x, y, z]}>
      <mesh position={[0, 0.06, 0]} receiveShadow>
        <cylinderGeometry args={[1.5, 1.75, 0.12, 32]} />
        <meshStandardMaterial color="#584145" roughness={1} />
      </mesh>
      <mesh position={[0, 1, 0]} castShadow>
        <cylinderGeometry args={[0.13, 0.18, 1.8, 10]} />
        <meshStandardMaterial color="#b7c4c1" metalness={0.3} roughness={0.55} />
      </mesh>
      <mesh position={[0, 2.02, 0]}>
        <sphereGeometry args={[0.25, 16, 12]} />
        <meshStandardMaterial color="#67ded2" emissive="#1d7a76" emissiveIntensity={0.8} />
      </mesh>
      <mesh ref={ring} position={[0, 2.02, 0]}>
        <torusGeometry args={[0.42, 0.035, 8, 32]} />
        <meshStandardMaterial color="#83e6df" emissive="#238b87" emissiveIntensity={0.55} />
      </mesh>
    </group>
  )
}

function ObjectiveRoute({ playerRef, siteId, target, interior = false }: { playerRef: RefObject<Group | null>; siteId: LandingSiteId; target: [number, number, number] | null; interior?: boolean }) {
  const arrows = useRef<Array<Object3D | null>>([])
  const geometry = useMemo(() => {
    const shape = new Shape()
    // Slim, forward-facing ground chevron with a readable notch.
    shape.moveTo(-0.13, -0.44)
    shape.lineTo(0.13, -0.44)
    shape.lineTo(0.13, -0.12)
    shape.lineTo(0.43, -0.12)
    shape.lineTo(0, 0.48)
    shape.lineTo(-0.43, -0.12)
    shape.lineTo(-0.13, -0.12)
    shape.closePath()
    return new ShapeGeometry(shape)
  }, [])
  useEffect(() => () => geometry.dispose(), [geometry])

  useFrame(() => {
    const player = playerRef.current
    if (!player || !target) {
      arrows.current.forEach((arrow) => { if (arrow) arrow.visible = false })
      return
    }
    const dx = target[0] - player.position.x
    const dz = target[2] - player.position.z
    const distance = Math.hypot(dx, dz)
    if (distance < 1.5) {
      arrows.current.forEach((arrow) => { if (arrow) arrow.visible = false })
      return
    }
    const angle = Math.atan2(dx, dz)
    arrows.current.forEach((arrow, index) => {
      if (!arrow) return
      const alongRoute = Math.min(distance - 0.8, 2.2 + index * 2.25)
      if (alongRoute <= 0) {
        arrow.visible = false
        return
      }
      const x = player.position.x + (dx / distance) * alongRoute
      const z = player.position.z + (dz / distance) * alongRoute
      arrow.visible = true
      arrow.position.set(x, interior ? 0.42 : getTerrainHeight(siteId, x, z) + 0.2, z)
      // Apply yaw before laying the chevron flat so its nose points toward the target.
      arrow.rotation.set(Math.PI / 2, angle, 0, 'YXZ')
      const scale = 0.78 + Math.sin(index * 0.65) * 0.035
      arrow.scale.setScalar(scale)
    })
  })

  if (!target) return null
  return <group>
    {Array.from({ length: 7 }, (_, index) => <group key={index} ref={(node) => { arrows.current[index] = node }}>
      <mesh geometry={geometry} position={[0, 0, 0]}>
        <meshBasicMaterial color="#123b3b" transparent opacity={0.68} depthWrite={false} side={2} />
      </mesh>
      <mesh geometry={geometry} scale={0.72} position={[0, 0.012, 0]}>
        <meshBasicMaterial color="#79eee2" transparent opacity={0.92} depthWrite={false} side={2} toneMapped={false} />
      </mesh>
    </group>)}
  </group>
}

function MarsWorld({
  siteId,
  controls,
  interiorBuildingId,
  doorOpenBuildingId,
  roverDriving,
  roverPosition,
  initialRoverBattery,
  stormIntensity,
  solMinute,
  powerPercent,
  solarDust,
  builtExpansions,
  crops,
  roverEfficiency,
  navigationTarget,
  interiorNavigationTarget,
  scannedSamples,
  collectedSamples,
  onNearbyChange,
  onInteract,
  onRoverStatus,
  onRoverSurvey,
  onFootstep,
  onMotion,
}: MarsWorldProps) {
  const playerRef = useRef<Group>(null)
  const skyColor = useMemo(() => new Color(siteId === 'rocky-basin' ? '#80605c' : '#a16b5c').lerp(new Color('#92736d'), stormIntensity * 0.72).getStyle(), [siteId, stormIntensity])

  return (
    <>
      {interiorBuildingId ? (
        <>
          <InteriorScene buildingId={interiorBuildingId} siteId={siteId} doorOpen={doorOpenBuildingId === interiorBuildingId} crops={crops} />
          {interiorNavigationTarget && <ObjectiveRoute playerRef={playerRef} siteId={siteId} target={interiorNavigationTarget} interior />}
        </>
      ) : (
        <>
          <color attach="background" args={[skyColor]} />
          <fogExp2 attach="fog" args={[MARS_MOUNTAIN_CONFIG.hazeColor, MARS_MOUNTAIN_CONFIG.fogDensity + stormIntensity * (MARS_MOUNTAIN_CONFIG.dustFogDensity - MARS_MOUNTAIN_CONFIG.fogDensity)]} />
          <AtmosphereDome />
          <MarsSun />
          <ambientLight color="#e9c9b0" intensity={0.78 - stormIntensity * 0.22} />
          <FollowSunLight playerRef={playerRef} stormIntensity={stormIntensity} />
          <MarsTerrain siteId={siteId} />
          <DistantMountains siteId={siteId} playerRef={playerRef} />
          <RockField siteId={siteId} />
          <ColonyBuildings siteId={siteId} doorOpenBuildingId={doorOpenBuildingId} crops={crops} stormIntensity={stormIntensity} solMinute={solMinute} powerPercent={powerPercent} solarDust={solarDust} />
          <ExpansionModules siteId={siteId} expansions={builtExpansions} />
          <WorldActors siteId={siteId} roverDriving={roverDriving} roverPosition={roverPosition} scannedSamples={scannedSamples} collectedSamples={collectedSamples} />
          <SurveyBeacon siteId={siteId} />
          <ObjectiveRoute playerRef={playerRef} siteId={siteId} target={navigationTarget} />
        </>
      )}
      <ThirdPersonPlayer
        playerRef={playerRef}
        siteId={siteId}
        controls={controls}
        interiorBuildingId={interiorBuildingId}
        roverDriving={roverDriving}
        roverPosition={roverPosition}
        initialRoverBattery={initialRoverBattery}
        roverEfficiency={roverEfficiency}
        builtExpansions={builtExpansions}
        onRoverStatus={onRoverStatus}
        onRoverSurvey={onRoverSurvey}
        onFootstep={onFootstep}
        onMotion={onMotion}
      />
      {!interiorBuildingId && <GroundDust playerRef={playerRef} stormIntensity={stormIntensity} />}
      <WorldInteractionManager
        siteId={siteId}
        controls={controls}
        playerRef={playerRef}
        interiorBuildingId={interiorBuildingId}
        roverDriving={roverDriving}
        roverPosition={roverPosition}
        onNearbyChange={onNearbyChange}
        onInteract={onInteract}
      />
    </>
  )
}

export default MarsWorld
