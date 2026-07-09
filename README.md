# Renewable Generation — Digital Twin Dashboard

An interactive 3D digital twin of a renewable energy facility, styled as an
enterprise monitoring platform. Built with **Three.js + Vite + GSAP**, no
framework, no external 3D assets — every mesh, texture and material is
procedurally generated at runtime.

![stack](https://img.shields.io/badge/three.js-r172-049EF4) ![build](https://img.shields.io/badge/vite-6-646CFF) ![motion](https://img.shields.io/badge/gsap-3-88CE02)

## Features

**Scene**
- Irregular industrial platform over dark water with painted roads, dashed
  lane markings, parking bays, cable trenches, hazard boundaries and
  landscaped patches — all drawn into one procedural canvas site plan
- ~350 PV panels as `InstancedMesh` (glass / frame / legs share matrices)
  with randomized tilt, yaw, spacing, dropout and per-instance tint
- 14 wind turbines with tapered towers, extruded airfoil blades, per-unit
  rotor speeds and blinking aviation beacons
- Utility buildings (HVAC, doors, lit windows, weathered concrete),
  transformer stations with cooling fins and hazard bands, inverter
  cabinets with breathing LED strips, fenced HV substation
- Engraved metallic floor typography (`TextGeometry`): TOTAL POWER
  CAPACITY · 30 GW · SOLAR 26 GW · WIND 4 GW · 30 GW BY 2030
- Animated power distribution: `CatmullRomCurve3` + `TubeGeometry` cables
  with a custom pulse shader — green AC, blue data, violet comms, amber
  transformer loops — all feeding Unreal Bloom

**Rendering**
- ACES tone mapping, PMREM room environment, exponential fog,
  PCF-soft shadows from a single moonlight key
- Post chain: Render/SSAO → half-res Unreal Bloom → vignette → Output →
  SMAA, with an adaptive DPR governor that steps resolution down before
  letting frame rate collapse

**Day/night + system filters**
- Time-of-day slider (bottom-left) drives a three.js Sky dome and a
  travelling sun: the shadow-casting key light morphs between moon and
  sun, with coordinated fog, exposure, water colour, floodlights and
  bloom-threshold grading from midnight to noon
- Top tabs filter the facility: **Solar + Wind / Solar / Wind** — the
  selected system gets bright ground illumination (amber wash under the
  arrays, blue discs under the turbines) while the other fades to charcoal

**Interaction**
- Cinematic GSAP fly-in, then polar-clamped OrbitControls (no flipping)
- Hover: glowing bracket on instanced panels, emissive boost + scale pop
  on structures, cursor tooltip with live values
- Click: glassmorphism telemetry card with sample data and sparkline;
  double-click or "Focus camera" flies the camera to the object
- Toolbar: Select / Pan / Rotate modes, animated Zoom In/Out, Reset View
- Render-settings popover (cube icon, top bar): bloom, SSAO, shadows,
  auto-orbit, power-flow toggles

## Run

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production bundle in dist/
```

## Architecture

```
src/
├── main.js                     entry
├── App.js                      composition root + render loop + quality governor
├── config/settings.js          palette, layout, camera, quality constants
├── core/
│   ├── RendererManager.js      WebGL renderer, colour pipeline
│   ├── SceneManager.js         scene, fog, PMREM environment
│   ├── CameraManager.js        camera, OrbitControls, fly-in/focus/reset
│   ├── LightingManager.js      moon/sun key, hemisphere, floods
│   ├── DayNightCycle.js        sky dome, sun path, time-of-day grading
│   └── PostProcessingManager.js  composer chain
├── world/
│   ├── Ground.js               platform, site plan, water, trees
│   ├── SolarFarm.js            instanced PV field + telemetry
│   ├── WindTurbines.js         procedural turbines + rotor animation
│   ├── Structures.js           buildings, transformers, inverters, substation
│   ├── PowerFlow.js            pulse-shader cable network
│   ├── SystemHighlights.js     filter illumination under solar/wind
│   └── FloorText.js            engraved metallic labels + frames
├── interaction/
│   └── SelectionManager.js     raycast hover/click/double-click
├── ui/
│   └── UIManager.js            dashboard chrome, counters, info card
└── styles/main.css             glassmorphism design system
```
