export type WorldControls = {
  keys: Set<string>
  yaw: number
  pitch: number
  cameraDistance: number
  isDragging: boolean
  jumpQueued: boolean
}

export type RoverWorldPosition = { x: number; y: number; z: number; rotation: number }
