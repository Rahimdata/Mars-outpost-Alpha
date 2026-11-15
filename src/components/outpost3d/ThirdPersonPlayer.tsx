import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { LandingSiteId } from '../../game/data/landingSites'
import type { BuildingId } from '../../game/data/outpostBuildings'
import { getColonyLayout } from '../../game/world3d/colonyLayout'
import { getRockInstances } from '../../game/world3d/rockField'
import { getTerrainHeight } from '../../game/world3d/terrain'
import type { RoverWorldPosition, WorldControls } from '../../game/world3d/types'
import { WORLD_CONFIG } from '../../game/world3d/worldConfig'
import AstronautModel from './AstronautModel'
import type { AstronautAnimation } from './AstronautModel'
import RoverModel from './RoverModel'
import { EXPANSION_POSITIONS } from './ExpansionModules'
import type { ExpansionId } from '../../game/state/colonyState'
import type { FootstepSurface } from '../../game/state/MarsAudioManager'

type InteriorBuildingId = Extract<BuildingId, 'habitat' | 'greenhouse' | 'laboratory'>

// [centerX, centerZ, halfWidth, halfDepth] for the habitat's fixed furniture.
const HABITAT_INTERIOR_OBSTACLES: Array<[number, number, number, number]> = [
  [-9.3, -5.6, 3.3, 0.8], [-11.4, -1, 1.2, 1.9], [-8.2, -1, 1.2, 1.9],
  [8.2, -1, 1.2, 1.9], [11.4, -1, 1.2, 1.9], [-9.5, 5.4, 3.1, 1.25],
  [7.3, 5.2, 1.35, 2.3], [11.3, 5.2, 1.35, 2.3], [-12, 0, 0.95, 2.55],
  [-9.5, 0, 0.95, 2.55], [-7, 0, 0.95, 2.55], [9.2, -0.2, 3.0, 1.15],
  [0, -7.5, 2.2, 0.55],
]

// The laboratory has an 18 × 12 m walkable envelope. Keep its large fixtures
// out of the circulation lane while still letting the player approach the
// existing sample-logging bench.
const LAB_INTERIOR_OBSTACLES: Array<[number, number, number, number]> = [
  [-3.42, -3.9, 0.12, 2.1], [-3.42, 2.45, 0.12, 1.33],
  [3.42, -3.9, 0.12, 2.1], [3.42, 2.45, 0.12, 1.33],
  [-7.8, -0.16, 0.83, 0.12], [-3.85, -0.16, 0.43, 0.12],
  [7.8, -0.16, 0.83, 0.12], [3.85, -0.16, 0.43, 0.12],
  [-2.35, -5.7, 1.1, 0.5], [2.3, -5.7, 1.1, 0.5],
  [0, -3.0, 1.5, 1.15], [-1.95, 0.2, 1.1, 0.6],
  [3.9, -0.8, 0.7, 0.45], [-6.1, 0.9, 1.65, 0.75], [6.1, 1.8, 1.25, 0.95],
  [-7.9, -4.2, 0.7, 0.22], [-6.15, -4.2, 0.7, 0.22], [-4.4, -4.2, 0.7, 0.22],
  [6.15, -5.3, 0.4, 0.32],
]

type ThirdPersonPlayerProps = {
  playerRef: { current: Group | null }
  siteId: LandingSiteId
  controls: WorldControls
  interiorBuildingId: InteriorBuildingId | null
  roverDriving: boolean
  roverPosition: RoverWorldPosition
  initialRoverBattery: number
  roverEfficiency: number
  builtExpansions: ExpansionId[]
  onRoverStatus: (battery: number, distance: number, position: RoverWorldPosition) => void
  onRoverSurvey: () => void
  onFootstep: (surface: FootstepSurface, running: boolean, inside: boolean) => void
  onMotion: (x: number, z: number, speed: number) => void
}

function ThirdPersonPlayer({ playerRef, siteId, controls, interiorBuildingId, roverDriving, roverPosition, initialRoverBattery, roverEfficiency, builtExpansions, onRoverStatus, onRoverSurvey, onFootstep, onMotion }: ThirdPersonPlayerProps) {
  const velocity = useRef({ x: 0, z: 0 })
  const verticalSpeed = useRef(0)
  const grounded = useRef(true)
  const landingTime = useRef(0)
  const obstacles = useMemo(
  () => getRockInstances(siteId).filter((rock) => rock.size >= 0.45),
  [siteId],
)

  const buildings = useMemo(() => getColonyLayout(siteId), [siteId])
  const animation = useRef<AstronautAnimation>('idle')
  const gait = useRef(0)
  const roverSpeed = useRef(0)
  const mode = useRef('surface')
  const roverBattery = useRef(initialRoverBattery)
  const statusTimer = useRef(0)
  const roverSurveyComplete = useRef(false)
  const stepDistance = useRef(0)
  const motionTimer = useRef(0)
  const roverTripStart = useRef({ x: roverPosition.x, z: roverPosition.z })
  const initialPosition = useMemo<[number, number, number]>(() => [
    WORLD_CONFIG.playerStart[0],
    getTerrainHeight(siteId, WORLD_CONFIG.playerStart[0], WORLD_CONFIG.playerStart[2]),
    WORLD_CONFIG.playerStart[2],
  ], [siteId])

  const surfaceExit = (buildingId: InteriorBuildingId) => {
    const building = buildings.find((item) => item.id === buildingId)!
    const exitOffset = buildingId === 'habitat' ? 15.8 : building.radius + 2.1
    return {
      x: building.x + Math.sin(building.rotation) * exitOffset,
      z: building.z + Math.cos(building.rotation) * exitOffset,
    }
  }

  useFrame(({ camera }, delta) => {
    const astronaut = playerRef.current
    if (!astronaut) return
    const dt = Math.min(delta, 0.05)
    const currentMode = interiorBuildingId ? `interior:${interiorBuildingId}` : roverDriving ? 'rover' : 'surface'
    if (mode.current !== currentMode) {
      if (interiorBuildingId) astronaut.position.set(0, 0, -1.0)
      else if (mode.current.startsWith('interior:')) {
        const previousBuilding = mode.current.slice('interior:'.length) as InteriorBuildingId
        const exit = surfaceExit(previousBuilding)
        astronaut.position.set(exit.x, getTerrainHeight(siteId, exit.x, exit.z), exit.z)
      } else if (roverDriving) {
        astronaut.position.set(roverPosition.x, getTerrainHeight(siteId, roverPosition.x, roverPosition.z), roverPosition.z)
        astronaut.rotation.y = roverPosition.rotation
        roverTripStart.current = { x: roverPosition.x, z: roverPosition.z }
      }
      else if (mode.current === 'rover') {
        const tripDistance = Math.hypot(astronaut.position.x - roverTripStart.current.x, astronaut.position.z - roverTripStart.current.z)
        onRoverStatus(roverBattery.current, tripDistance, { x: astronaut.position.x, y: getTerrainHeight(siteId, astronaut.position.x, astronaut.position.z), z: astronaut.position.z, rotation: astronaut.rotation.y })
        const sideX = Math.cos(astronaut.rotation.y)
        const sideZ = -Math.sin(astronaut.rotation.y)
        const exitX = astronaut.position.x + sideX * 1.8
        const exitZ = astronaut.position.z + sideZ * 1.8
        astronaut.position.set(exitX, getTerrainHeight(siteId, exitX, exitZ), exitZ)
      }
      mode.current = currentMode
    }
    const keys = controls.keys
    const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'))
    const strafe = Number(keys.has('KeyD')) - Number(keys.has('KeyA'))
    const inputLength = Math.hypot(forward, strafe)
    let targetX = 0
    let targetZ = 0

    if (inputLength > 0) {
      const f = forward / inputLength
      const s = strafe / inputLength
      targetX = -Math.sin(controls.yaw) * f + Math.cos(controls.yaw) * s
      targetZ = -Math.cos(controls.yaw) * f - Math.sin(controls.yaw) * s
      const speed = roverDriving
        ? keys.has('ShiftLeft') || keys.has('ShiftRight') ? 8.6 : 5.2
        : keys.has('ShiftLeft') || keys.has('ShiftRight') ? WORLD_CONFIG.runSpeed : WORLD_CONFIG.walkSpeed
      targetX *= speed
      targetZ *= speed
    }

    const acceleration = roverDriving ? (inputLength > 0 ? 1.9 : 2.4) : inputLength > 0 ? 5.8 : 8.5
    const blend = 1 - Math.exp(-acceleration * dt)
    velocity.current.x += (targetX - velocity.current.x) * blend
    velocity.current.z += (targetZ - velocity.current.z) * blend

    const moveX = velocity.current.x * dt
    const moveZ = velocity.current.z * dt
    const currentGround = interiorBuildingId ? 0 : getTerrainHeight(siteId, astronaut.position.x, astronaut.position.z)
    const canMoveTo = (x: number, z: number) => {
  const radius = roverDriving ? 1.35 : 0.58

  if (interiorBuildingId) {
    if (interiorBuildingId === 'habitat') {
      const insideRoom = x > -13.1 + radius * 0.2 && x < 13.1 - radius * 0.2 && z > -8.0 + radius * 0.2 && z < 8.0 - radius * 0.2
      const hitsFurniture = HABITAT_INTERIOR_OBSTACLES.some(([cx, cz, halfWidth, halfDepth]) =>
        Math.abs(x - cx) < halfWidth + radius * 0.45 && Math.abs(z - cz) < halfDepth + radius * 0.45,
      )
      return insideRoom && !hitsFurniture
    }
    if (interiorBuildingId === 'greenhouse') {
      const insideRoom = x > -5.35 + radius * 0.2 && x < 5.35 - radius * 0.2 && z > -8.65 + radius * 0.2 && z < 8.65 - radius * 0.2
      const hitsPlanter = [-3.4, 3.4].some((bedX) => Math.abs(x - bedX) < 1.05 + radius * 0.45 && Math.abs(z) < 7.3 + radius * 0.45)
      const hitsTank = Math.abs(x - 5.15) < 0.65 + radius * 0.45 && Math.abs(z - 7.2) < 0.65 + radius * 0.45
      const hitsSeedStation = Math.abs(x + 4.65) < 1.1 + radius * 0.45 && Math.abs(z + 7.5) < 0.8 + radius * 0.45
      const hitsRack = Math.abs(x) < 4.1 + radius * 0.45 && Math.abs(z + 8.2) < 0.7 + radius * 0.45
      return insideRoom && !hitsPlanter && !hitsTank && !hitsSeedStation && !hitsRack
    }
    const insideLab = x > -8.15 + radius * 0.2 && x < 8.15 - radius * 0.2 && z > -6.05 + radius * 0.2 && z < 3.05 - radius * 0.2
    const hitsLabFixture = LAB_INTERIOR_OBSTACLES.some(([cx, cz, halfWidth, halfDepth]) =>
      Math.abs(x - cx) < halfWidth + radius * 0.45 && Math.abs(z - cz) < halfDepth + radius * 0.45,
    )
    return insideLab && !hitsLabFixture
  }

  if (
    Math.abs(x) > WORLD_CONFIG.worldLimit ||
    Math.abs(z) > WORLD_CONFIG.worldLimit
  ) {
    return false
  }

  const nextGround = getTerrainHeight(siteId, x, z)
  if (nextGround - currentGround > (roverDriving ? 0.45 : 0.72)) {
    return false
  }

  if (
    buildings.some((building) => {
      const dx = x - building.x
      const dz = z - building.z
      if (building.id === 'habitat') {
        const cos = Math.cos(building.rotation)
        const sin = Math.sin(building.rotation)
        const localX = cos * dx - sin * dz
        const localZ = sin * dx + cos * dz
        const isAtAirlock = Math.abs(localX) < 1.45 && localZ > 9.4 && localZ < 15.2
        return !isAtAirlock && Math.abs(localX) < 15.0 + radius && Math.abs(localZ) < 10.0 + radius
      }
      if (building.id === 'greenhouse') {
        const cos = Math.cos(building.rotation)
        const sin = Math.sin(building.rotation)
        const localX = cos * dx - sin * dz
        const localZ = sin * dx + cos * dz
        const isAtAirlock = Math.abs(localX) < 1.55 && localZ > 9.3 && localZ < 14.4
        return !isAtAirlock && Math.abs(localX) < 6.4 + radius && Math.abs(localZ) < 10.4 + radius
      }
      if (building.id === 'laboratory') {
        const cos = Math.cos(building.rotation)
        const sin = Math.sin(building.rotation)
        const localX = cos * dx - sin * dz
        const localZ = sin * dx + cos * dz
        const isAtAirlock = Math.abs(localX) < 1.8 && localZ > 8.0 && localZ < 12.2
        return !isAtAirlock && Math.abs(localX) < 12.25 + radius && Math.abs(localZ) < 9.75 + radius
      }
      if (building.id === 'rover-garage') {
        const cos = Math.cos(building.rotation)
        const sin = Math.sin(building.rotation)
        const localX = cos * dx - sin * dz
        const localZ = sin * dx + cos * dz
        const insideBay = Math.abs(localX) < 8.25 - radius * 0.2 && Math.abs(localZ) < 5.2 - radius * 0.2
        const atVehicleDoor = Math.abs(localX) < 3.3 - radius * 0.25 && localZ > 5.0 - radius && localZ < 13.0
        const atPersonAirlock = !roverDriving && localX < -8.0 + radius && localX > -12.5 && Math.abs(localZ + 1.3) < 1.55 + radius
        const inGarageShell = Math.abs(localX) < 9.3 + radius && Math.abs(localZ) < 6.4 + radius
        return inGarageShell && !insideBay && !atVehicleDoor && !atPersonAirlock
      }
      return Math.hypot(dx, dz) < building.radius + radius
    })
  ) {
    return false
  }

  if (
    builtExpansions.some((id) => {
      const [moduleX, moduleZ] = EXPANSION_POSITIONS[id]
      const moduleRadius = id === 'regolith-shield' ? 4.2 : 3.8
      return Math.hypot(x - moduleX, z - moduleZ) < moduleRadius + radius
    })
  ) {
    return false
  }

  return !obstacles.some((rock) => {
    const rockRadius = Math.max(0.55, rock.size * 0.78)
    return Math.hypot(x - rock.x, z - rock.z) < rockRadius + radius
  })
}

    const nextX = astronaut.position.x + moveX
    const nextZ = astronaut.position.z + moveZ
    if (canMoveTo(nextX, nextZ)) {
      astronaut.position.x = nextX
      astronaut.position.z = nextZ
    } else {
      if (canMoveTo(nextX, astronaut.position.z)) astronaut.position.x = nextX
      else velocity.current.x *= 0.12
      if (canMoveTo(astronaut.position.x, nextZ)) astronaut.position.z = nextZ
      else velocity.current.z *= 0.12
    }

    const horizontalSpeed = Math.hypot(velocity.current.x, velocity.current.z)
    roverSpeed.current = roverDriving ? horizontalSpeed : 0
    if (horizontalSpeed > 0.14) {
      const targetRotation = Math.atan2(velocity.current.x, -velocity.current.z)
      const rotationDelta = Math.atan2(
        Math.sin(targetRotation - astronaut.rotation.y),
        Math.cos(targetRotation - astronaut.rotation.y),
      )
      astronaut.rotation.y += rotationDelta * (1 - Math.exp(-9 * dt))
    }

    if (roverDriving && keys.has('Space')) {
      velocity.current.x *= Math.exp(-9 * dt)
      velocity.current.z *= Math.exp(-9 * dt)
    }
    if (!roverDriving && grounded.current && horizontalSpeed > 0.7) {
      stepDistance.current += horizontalSpeed * dt
      const running = keys.has('ShiftLeft') || keys.has('ShiftRight')
      const stride = running ? 1.48 : 1.12
      if (stepDistance.current >= stride) {
        stepDistance.current %= stride
        let surface: FootstepSurface = interiorBuildingId === 'greenhouse' ? 'grating' : interiorBuildingId ? 'metal' : 'regolith'
        if (!interiorBuildingId) {
          const nearbyRock = obstacles.some((rock) => Math.hypot(astronaut.position.x - rock.x, astronaut.position.z - rock.z) < rock.size + 1.2)
          if (nearbyRock) surface = 'rock'
        }
        onFootstep(surface, running, Boolean(interiorBuildingId))
      }
    } else if (horizontalSpeed < 0.3) stepDistance.current = 0
    motionTimer.current += dt
    if (motionTimer.current >= 0.15) {
      motionTimer.current = 0
      onMotion(astronaut.position.x, astronaut.position.z, roverDriving ? horizontalSpeed : horizontalSpeed)
    }
    if (controls.jumpQueued) {
      controls.jumpQueued = false
      if (!roverDriving && !interiorBuildingId && grounded.current) {
        verticalSpeed.current = WORLD_CONFIG.jumpSpeed
        grounded.current = false
      }
    }
    if (!grounded.current) {
      verticalSpeed.current -= WORLD_CONFIG.gravity * dt
      astronaut.position.y += verticalSpeed.current * dt
      const terrainY = interiorBuildingId ? 0 : getTerrainHeight(siteId, astronaut.position.x, astronaut.position.z)
      if (astronaut.position.y <= terrainY) {
        astronaut.position.y = terrainY
        verticalSpeed.current = 0
        grounded.current = true
        landingTime.current = 0.28
      }
    } else {
      const terrainY = interiorBuildingId ? 0 : getTerrainHeight(siteId, astronaut.position.x, astronaut.position.z)
      astronaut.position.y += (terrainY - astronaut.position.y) * (1 - Math.exp(-14 * dt))
    }

    const distanceToMarker = Math.hypot(
      astronaut.position.x - WORLD_CONFIG.objectivePosition[0],
      astronaut.position.z - WORLD_CONFIG.objectivePosition[2],
    )

    if (roverDriving) {
      if (horizontalSpeed > 0.2) roverBattery.current = Math.max(0, roverBattery.current - dt * 0.035 * roverEfficiency)
      if (!roverSurveyComplete.current && distanceToMarker < 4.5) {
        roverSurveyComplete.current = true
        onRoverSurvey()
      }
      statusTimer.current += dt
      if (statusTimer.current >= 0.45) {
        statusTimer.current = 0
        const tripDistance = Math.hypot(astronaut.position.x - roverTripStart.current.x, astronaut.position.z - roverTripStart.current.z)
        onRoverStatus(roverBattery.current, tripDistance, { x: astronaut.position.x, y: getTerrainHeight(siteId, astronaut.position.x, astronaut.position.z), z: astronaut.position.z, rotation: astronaut.rotation.y })
      }
    }

    landingTime.current = Math.max(0, landingTime.current - dt)
    const interaction = keys.has('KeyE')
    animation.current = roverDriving ? 'idle' : !grounded.current
      ? 'jump'
      : landingTime.current > 0
        ? 'land'
        : interaction
          ? 'interact'
          : horizontalSpeed < 0.16
            ? 'idle'
            : keys.has('ShiftLeft') || keys.has('ShiftRight') ? 'run' : 'walk'
    gait.current +=(horizontalSpeed - gait.current) * (1 - Math.exp(-9 * dt))

    let followDistance = interiorBuildingId ? Math.min(controls.cameraDistance, interiorBuildingId === 'habitat' || interiorBuildingId === 'greenhouse' ? 3.8 : 5.2) : roverDriving ? Math.max(controls.cameraDistance, 9.5) : controls.cameraDistance
    let horizontalDistance = followDistance * Math.cos(controls.pitch)
    let cameraHeight = Math.max(1.55, 2.4 + followDistance * Math.sin(controls.pitch))
    let desiredX = astronaut.position.x + Math.sin(controls.yaw) * horizontalDistance
    let desiredZ = astronaut.position.z + Math.cos(controls.yaw) * horizontalDistance
    for (let attempt = 0; attempt < 4; attempt += 1) {
      let blocked = false
      for (let sample = 3; sample <= 8 && !blocked; sample += 1) {
        const fraction = sample / 8
        const sampleX = astronaut.position.x + (desiredX - astronaut.position.x) * fraction
        const sampleZ = astronaut.position.z + (desiredZ - astronaut.position.z) * fraction
        const cameraLineY = astronaut.position.y + cameraHeight * fraction
        if (getTerrainHeight(siteId, sampleX, sampleZ) + 0.75 > cameraLineY) blocked = true
        if (!blocked && obstacles.some((rock) => {
          const radius = rock.size * 0.72 + 0.45
          return Math.hypot(sampleX - rock.x, sampleZ - rock.z) < radius
            && cameraLineY < getTerrainHeight(siteId, rock.x, rock.z) + rock.size * 1.1
        })) blocked = true
      }
      if (!blocked) break
      followDistance = Math.max(WORLD_CONFIG.minCameraDistance, followDistance * 0.78)
      horizontalDistance = followDistance * Math.cos(controls.pitch)
      cameraHeight = Math.max(1.55, 2.4 + followDistance * Math.sin(controls.pitch))
      desiredX = astronaut.position.x + Math.sin(controls.yaw) * horizontalDistance
      desiredZ = astronaut.position.z + Math.cos(controls.yaw) * horizontalDistance
    }
    if (interiorBuildingId === 'habitat') {
      desiredX = Math.max(-13, Math.min(13, desiredX))
      desiredZ = Math.max(-8.2, Math.min(8.2, desiredZ))
    } else if (interiorBuildingId === 'greenhouse') {
      desiredX = Math.max(-5.72, Math.min(5.72, desiredX))
      desiredZ = Math.max(-9.55, Math.min(9.55, desiredZ))
    } else if (interiorBuildingId === 'laboratory') {
      desiredX = Math.max(-8.25, Math.min(8.25, desiredX))
      desiredZ = Math.max(-5.85, Math.min(2.85, desiredZ))
    }

    const cameraBlend = 1 - Math.exp(-7 * dt)
    camera.position.x += (desiredX - camera.position.x) * cameraBlend
    camera.position.y += (astronaut.position.y + cameraHeight - camera.position.y) * cameraBlend
    camera.position.z += (desiredZ - camera.position.z) * cameraBlend
    camera.lookAt(astronaut.position.x, astronaut.position.y + (roverDriving ? 1.8 : interiorBuildingId ? 1.45 : 1.08), astronaut.position.z)
  })

  return (
    <group
      ref={playerRef}
      position={initialPosition}
    >
      <AstronautModel animation={animation} gait={gait} visible={!roverDriving} />
      {roverDriving && <RoverModel speed={roverSpeed} />}
    </group>
  )
}

export default ThirdPersonPlayer
