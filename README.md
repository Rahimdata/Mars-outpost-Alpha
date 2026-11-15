# Mars: Outpost Alpha

**Mars: Outpost Alpha** is a browser-based Mars survival and colony-management game. Guide a crew through a ten-Sol campaign by exploring the surface, maintaining outpost systems, managing supplies, and making decisions that shape the mission outcome.

The game is designed to introduce young players to mission planning and resource trade-offs through exploration, a rover, crew interactions, colony management, and a learning-focused science archive. Campaign resource values and outcomes are simplified game simulations; they are not live NASA telemetry or operational mission forecasts. NASA learning resources are credited in the in-game science archive.

## Run locally

Requirements: Node.js and npm.

```bash
npm install
npm run dev
```

Open the local URL printed by Vite. To create a production build:

```bash
npm run build
npm run preview
```

## Controls

The 3D surface uses **WASD** to move, **Shift** to run, **Space** to jump, and **E** to interact. Use the mouse to look around. In-game prompts and the controls panel provide context for other actions.

## Built with

React, TypeScript, Vite, Three.js, and React Three Fiber.

## Audio asset

The intro music loader looks for `public/audio/intro_ambient.mp3`. Add the licensed audio file at that path if you want the optional intro track included in a deployment; do not commit audio you do not have permission to distribute.
