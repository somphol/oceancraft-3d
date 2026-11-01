# Build State

| Field | Value |
| --- | --- |
| Project | **OCEANCRAFT 3D — Deep Sea Fishing & Hydrodynamics Studio** (`oceancraft-3d`) |
| Started | 2026-11-01 05:45:11 UTC |
| Packaged | 2026-11-01 06:39:52 UTC |
| Duration | **54m 41s** (3,281 seconds) |
| Harness | OpenCode 2.2.5 |
| Model | DeepSeek V4.1 Flash (`opencode-go/deepseek-v4.1-flash`) |
| Session | `ses_e6a5c0fe4ffezOp3UOe393igmV` |
| Repository | <https://github.com/somphol/oceancraft-3d> |
| Live demo | <https://somphol.github.io/oceancraft-3d/> |
| Last feature update | 2026-11-01 21:15:16 UTC |

## Token usage

| Metric | Tokens |
| --- | ---: |
| Input | 412,283 |
| Output | 144,477 |
| Reasoning | 146,772 |
| **Total (input + output + reasoning)** | **703,532** |
| Cache read | 60,907,776 |
| Cache write | 1,178 |
| Total including cache | 61,612,486 |

> Snapshot taken from the OpenCode session record when the project was packaged at 2026-11-01 06:39:52 UTC. The final state commit, GitHub push and Pages verification happen outside this snapshot, so the live session totals are marginally higher. Total cost reported by the session: **$0.00**.

## Post-build update

**2026-11-01 21:15:16 UTC** — Mobile scene-camera controls: pinch-to-zoom, two-finger pan, one-finger orbit/move mode, dedicated view pad (zoom in/out, move, recenter), and a collapsible fishing panel. Mobile camera target raised so the boat sits above the info panel by default.

Original build timing and token snapshot above are preserved. This incremental update is not included in those figures.

## What was built

- A complete 3D fishing studio in three modular files:
  - `index.html` — 21,921 bytes, 356 lines
  - `style.css` — 52,429 bytes, 801 lines
  - `script.js` — 168,957 bytes, 3,748 lines
- A 380 × 380 ocean plane with up to 112 × 112 segments, five-component wave field, procedural normal map, vertex-coloured crests/foam and warm sun glints.
- A hand-built fishing boat with sampled four-point buoyancy, damped float, bow pitch, side roll, flapping flag, glowing cabin, outboard motor, rod/reel and wake.
- Three sea states: **Calm Sunset**, **Stormy Waves** (rain, lightning, thunder, 3.1 m swell) and **Bioluminescent Night** (moon, 1,200 stars, glowing plankton).
- Cast charge/release, parabolic bobber flight, splash particles, ripples, bite window, hold-to-reel tension minigame, surges, line snaps and slack escapes.
- **18 species** across Common (8), Rare (6) and Legendary (4), each with a distinct procedural SVG illustration.
- Aquarium logbook with Field Guide, Catches, Records & Badges and Boat & Gear tabs; 12 trophy badges; catch reveal cards.
- Five permanent upgrades: Carbon Cast Rod, Ball-Bearing Reel, Braided Kevlar Line, Deep-Scan Sonar and Glow Lure.
- localStorage autosave with validated `oceancraft_save.json` export and File import.
- Fully synthesised Web Audio ocean ambience, reel ticks, splashes, bites, surges, snaps, escapes, thunder and catch fanfares.
- Responsive desktop and 390 × 844 mobile layouts with a two-row top bar, touch-sized cast/reel controls, **pinch zoom, two-finger pan, a view pad (zoom ±, move, recenter)** and a **collapsible rig panel**.
- 18-check built-in self-test surface and headless Chrome end-to-end verification.

## Verification

- **18/18** self-tests pass (`?selftest=1` / `OceanCraft.runSelfTests(true)`).
- Live GitHub Pages returned HTTP 200 with `OceanCraft.state === "idle"`, **0 uncaught errors** and 18/18 tests.
- Headless Chrome 156 (WebGL via SwiftShader) verified:
  - cast charge → mouse/keyboard release → flight → splash → wait,
  - bite → reel hold → tension/progress → catch reveal → logbook update,
  - high-tension line snap and slack-line escape with auto re-rig,
  - five gear cards and coin-guarded purchases,
  - JSON export download and real File import,
  - mute persistence across reload,
  - mobile 390 × 844 HUD and logbook layouts,
  - mobile zoom in/out, two-finger pan, pinch zoom, recenter, collapsed rig panel and bite auto-expand,
  - **0 uncaught exceptions** and no app-level console errors.
- Rendering observed at ~88 draw calls, ~30,396 triangles and ~2,500 points at 1600 × 1000 in the headless test environment.

## Files

| File | Size |
| --- | ---: |
| `index.html` | 21,921 bytes |
| `style.css` | 52,429 bytes |
| `script.js` | 168,957 bytes |
| `README.md` | 12,270 bytes |
| `favicon.svg` | 1,432 bytes |
| `screenshot.png` | 1,169,040 bytes |
| `screenshot-storm.png` | 1,103,434 bytes |
| `screenshot-night.png` | 989,484 bytes |
| `screenshot-gameplay.png` | 1,156,845 bytes |
| `screenshot-logbook.png` | 485,250 bytes |
| `screenshot-catch.png` | 316,744 bytes |
| `screenshot-mobile.png` | 976,074 bytes |
| `screenshot-mobile-view.png` | 1,071,753 bytes |
| `screenshot-mobile-logbook.png` | 487,471 bytes |

## Notes

- No image, texture, 3D model or audio assets are used. Boat, lighthouse, fish, particles, sky and soundscape are generated at runtime.
- The project directory follows the OceanCraft brief in this session; the existing `cyberdoom-retro-fps` project is a separate build.
- Mobile defaults: three-quarter camera target lifted above the rig panel; pinch to zoom, two-finger drag to pan, one-finger orbit, move mode for one-finger pan, and the rig chevron to collapse the info panel.

## Credits

Built with [OpenCode](https://opencode.ai) 2.2.5 and **DeepSeek V4.1 Flash** (`opencode-go/deepseek-v4.1-flash`) in a single agent session. The game code, procedural art, boat model, wave/lighting system, fish illustrations, UI, audio synthesis, save system and verification harness were generated for this project.

Runtime libraries: [Three.js](https://threejs.org/) r128 (MIT) and OrbitControls from the Three.js r128 examples (MIT). Typefaces: **Cormorant Garamond**, **Manrope** and **IBM Plex Mono** from Google Fonts (SIL OFL 1.1). See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
