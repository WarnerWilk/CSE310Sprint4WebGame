# Project brief for coding agent: "The Long Fall" (working title) — Phase 2


## Game overview (recap)

We're building a browser game in the spirit of classic Flash-era web games (Kongregate, Coolmath Games, Newgrounds) — short sessions, simple controls, chunky readable feedback, a bit of dark comedy. Pure **HTML/CSS/JavaScript**, no build tools or frameworks, runnable by opening `index.html` in a browser.

**Premise:** the player is a saboteur-for-hire, secretly demolishing buildings so the destruction looks like an accident rather than sabotage — insurance-fraud / corporate-sabotage territory. Jobs happen on empty buildings at night, which is the in-fiction excuse for no casualties and keeps the tone light rather than grim.

Each level has three phases:

1. **Recon (top-down, already built):** the player explores a building floor by floor, reaching marked scan points and lingering briefly to reveal structural weak points, while avoiding patrol/camera detection, then escapes.
2. **Placement (top-down, nighttime, stealth) — today's focus:** the player sneaks back in and places a limited set of sabotage devices at structurally significant spots discovered during Recon. There are always more viable spots than devices, forcing the player to choose a "critical path" of failure rather than covering everything.
3. **Detonation (side-view, physics-based, not yet built):** the player triggers the placed devices to bring the building down. Supports are modeled as a graph of nodes with load/capacity values, color-coded green (safe) to red (near breaking), with cascading failure as supports give out and redistribute load to neighbors. Messy, staggered, asymmetric collapses should read as "believable accidents"; too-clean, synchronized collapses should read as suspicious.

**Suspicion/scoring system:** after each level, a "morning newspaper" style report reacts to the outcome, driving a star rating and replayability, in the style of a level-select world map.

**Art direction:** flat vector/cartoon style, limited night color palette (deep blues/purples) with warm accents reserved for lights, fire, and danger states.

---

## Existing codebase context

Phase 1 (Recon) should already exist in this project as a top-down prototype with: player movement (WASD/arrows, delta-time based), floor layouts with walls, scan points with a linger-to-scan mechanic, patrolling guards with vision-cone detection, a heat meter, and an exit/escape sequence. **Read through the existing Phase 1 code first** before making changes, and reuse its player movement, rendering, floor/level-data structures, and detection systems wherever they fit, rather than rebuilding them from scratch.

---

## Today's task: build a playable Phase 2 (Placement) prototype

Scope this session to **Phase 2 only**. Detonation (Phase 3) comes later. Phase 2 should be playable as a distinct stage that follows Phase 1 in the same level (or, for prototyping purposes, can be tested standalone with hardcoded input from a fake "Phase 1 result").

### Phase 2 gameplay requirements

- **Carry forward scanned spots from Phase 1** as the pool of viable placement spots for this level. Each spot should have a simple **material/structure type** (e.g. wood, steel, concrete, brick) used later for device fit. If a scan was interrupted/incomplete in Phase 1, that spot's data can be marked lower "confidence" — reflect this even if it's not fully used yet, so the data model supports it going forward.
- **Loadout selection screen** before entering the level: the player picks a limited set of devices to bring (e.g. 4 total slots, made up of some combination of acid, explosive, and press devices). Fewer devices than there are placement spots, always.
- **Device types**, each with a simple best-fit material affinity:
  - **Acid** — best on masonry/brick/some metals, slow-acting, quiet to place.
  - **Explosive** — best on major steel/concrete supports, high impact, riskier/louder to place and carry.
  - **Press/jack** — best on concrete columns or load-bearing framing, mechanical, can be visually disguised as construction equipment already on-site.
- **Placement interaction:** player walks to a spot with a compatible device selected, holds an action button for a few seconds (a visible progress bar, similar to the Phase 1 scan mechanic) to place it. Getting caught mid-placement should cancel and cost meaningful setback (e.g. lose the device, or fail the level — your call, pick one and note the assumption).
- **Stealth differences from Phase 1:** carrying a device should add a noise radius (guards can hear, not just see, the player) in addition to the existing vision-cone detection, especially when carrying bulkier devices like explosives. Reuse the Phase 1 heat meter system, extended with this noise component.
- **Optional stash/resupply mechanic:** if it's not too much added complexity, let the player carry only 1–2 devices at a time from a stash point near the entrance, requiring return trips (and added exposure) to place their full loadout. If this feels like too much for one session, it's fine to skip and have the player simply start with their full loadout on hand — note which approach you took.
- **Level completion:** once all devices from the loadout are placed (or the player chooses to end placement early with devices unused), the level is complete and should output a simple **placement map** data structure: which spots got which devices, their confidence, and material fit — this is the object Phase 3 will consume later, so keep its shape clean and well-documented even though Phase 3 isn't built yet.

### Technical requirements

- Keep using plain HTML/CSS/JS and `<canvas>`, consistent with the existing Phase 1 code.
- Reuse existing movement, rendering, and detection code rather than duplicating it; refactor shared systems into shared modules/files if they're currently Phase-1-specific.
- Placeholder art is fine — distinct shapes/colors per device type is enough for now.
- Keep the final placement-map output as a clearly structured, well-commented data object/function, since it's the hand-off point to Phase 3.

### Before you start coding

Please first reply with:
1. A short technical plan: what you'll reuse vs. refactor from Phase 1, how you'll represent the device loadout and placement-map data, and how the noise/stealth extension will work alongside the existing heat meter.
2. Any assumptions or simplifications you're making (especially your call on the "caught mid-placement" consequence and whether you're including the stash/resupply mechanic).

Then implement a working prototype: a loadout selection screen, at least one floor with several placement spots of different material types, one guard with vision + noise detection, and full placement of a small loadout (e.g. 3–4 devices) ending in a printed/logged placement-map object.
