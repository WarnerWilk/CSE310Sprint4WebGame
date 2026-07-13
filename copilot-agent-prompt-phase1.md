# Project brief for coding agent: "The Long Fall" (working title)

---

## Game overview

We're building a browser game in the spirit of classic Flash-era web games (Kongregate, Coolmath Games, Newgrounds) — short sessions, simple controls, chunky readable feedback, a bit of dark comedy. Pure **HTML/CSS/JavaScript**, no build tools or frameworks required, runnable by just opening `index.html` in a browser.

**Premise:** the player is a saboteur-for-hire, secretly demolishing buildings so the destruction looks like an accident (structural failure, gas explosion, fire) rather than an act of sabotage — classic insurance-fraud / corporate-sabotage territory. All jobs happen on empty buildings at night, which is the in-fiction excuse for there being no casualties and keeps the tone light rather than grim.

Each level has three phases:

1. **Recon (top-down, daytime or dusk):** the player explores the building floor by floor, posing as an inspector/employee/deliveryman, and must reach certain points on each floor and linger there briefly to "scan" for structural information (blueprints, load-bearing walls, water damage, corrosion, old wiring). Lingering is risky — the longer you stay, the more attention you draw from guards/workers/cameras. After scanning the marked points, the player must escape the building before being caught.
2. **Placement (top-down, nighttime, stealth):** the player sneaks back in and places sabotage devices (acid, explosives, hydraulic presses/jacks, etc.) at structurally significant points discovered in Phase 1. There are always more viable placement spots than devices available, forcing the player to choose a "critical path" of failure rather than covering everything.
3. **Detonation (side-view, physics-based, outside the building):** the player triggers the placed devices, in whatever order/timing they choose, to bring the building down. The building is modeled as a graph of support nodes (columns, beams, walls) with a load/capacity value each. Supports are color-coded from green (low stress) through amber to red (near breaking), with visual tells — cracks, bowing, dust — appearing as stress rises. When a support fails, its load redistributes to connected neighbors, which can cascade into a full collapse. Overly clean, symmetric, simultaneous collapses should read as "suspicious" (like a controlled demolition); staggered, asymmetric collapses that mimic plausible real failure modes should read as "a believable accident."

**Suspicion / scoring system:** after each level, the game shows a lightweight "morning newspaper" style report reacting to the incident. A clean job gets a boring accident headline; a sloppy one gets a suspicious-investigation headline. This score (based on how many devices were used, how symmetric/synchronized the collapse was, whether the player was ever spotted, etc.) is the main replayability/star-rating hook, in the style of a level-select world map with 1–3 stars per level.

**Art direction:** flat vector/cartoon style, limited night color palette (deep blues/purples) with warm accent colors reserved for lights, fire, and danger states. Should read clearly at small sizes — no photorealism needed or wanted.

---

## Today's task: build a playable Phase 1 (Recon) prototype

Scope this session to **Phase 1 only**. Don't build Placement or Detonation yet — just get Recon working end to end as a small, self-contained playable prototype.

### Phase 1 gameplay requirements

- **Top-down view** of a single building floor at a time (start with 2–3 floors, connected by stairs/elevator the player can walk to and use to move between floors).
- **Player movement:** simple 2D top-down movement (arrow keys or WASD), collision with walls/furniture.
- **Scan points:** a handful of marked points scattered across the floors. Standing inside a scan point's radius for a few seconds (show a fill/progress indicator) marks it as scanned. All scan points across all floors must be scanned to "complete" the recon.
- **Detection/heat meter:** simple patrolling NPCs (or static "cameras" with a vision cone) that raise a heat meter when the player is in their sight line, especially while lingering at a scan point. If heat maxes out, the player is "caught" and the level restarts. Heat should decay slowly over time when out of sight.
- **Escape sequence:** once all scan points are scanned, an exit point activates (e.g., highlighted stairwell/door) and the player must reach it. Consider slightly increasing patrol alertness or speed during this phase for tension.
- **Win/lose state:** clear win screen on reaching the exit after all scans are done; clear "caught" state that restarts the floor/level.

### Technical requirements

- Plain HTML/CSS/JS. Canvas (`<canvas>` + 2D context) is the natural fit for top-down movement and vision cones — use that unless you have a good reason not to.
- No external assets required yet — placeholder art is fine (colored rectangles/circles for player, guards, walls, scan points, exits). Structure the code so art can be swapped in later without a rewrite.
- Single entry point (`index.html`) opened directly in a browser, no server or build step needed.
- Keep the code organized enough to extend later (e.g., separate modules/files for player, level data, NPC/patrol logic, rendering, and game state), but don't over-engineer for a one-session prototype.
- Frame-rate independent movement (use delta time), since this needs to feel responsive and consistent.

### Before you start coding

Please first reply with:
1. A short technical plan: file/folder structure, how you'll represent level data (floors, walls, scan points, patrol paths), and how the vision-cone/heat-meter detection will work.
2. Any assumptions or simplifications you're making for this first pass.

Then implement a working prototype with at least one full floor layout with 2–3 scan points, one patrolling guard, and a working exit/escape sequence, so we have something playable to iterate on.
