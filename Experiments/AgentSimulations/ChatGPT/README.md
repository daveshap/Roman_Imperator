# Agent Simulations — ChatGPT Experiments

Single-file HTML prototypes (and a few supporting scripts) exploring **Roman-style infantry** as agent-based models: local rules, formation commands, and increasingly human locomotion.

**How to run:** open any `.html` file in a browser (Chrome/Edge/Firefox). No server required unless a file loads external assets.

**Current recommended build:** [`self_assembling_line_abm_3d_v9.html`](./self_assembling_line_abm_3d_v9.html)  
(Solid checkpoint of the full form-up stack. v8 is the same lineage just before the v9 label.)

---

## Directory map

### Self-assembling form-up series (main line)

| File | Role |
|------|------|
| `self_assembling_line_abm_3d.html` | **v1** — original line prototype |
| `self_assembling_line_abm_3d_v2.html` … `v9.html` | Incremental form-up ABM (see [Version history](#version-history-self-assembling-line-abm) below) |
| `self_assembling_formations_abm_3d_stable.html` | Stable multi-formation experiment (reference) |
| `self_assembling_formations_minimal_revert.html` | Minimal multi-formation + intact line logic (reference for lattice rules) |
| `rtw_autonomous_drills_v2.html` | RTW-style drills: camera, hard contacts, lattice/snap formation rules |

### Earlier / parallel experiments (ordinary prototypes)

These are exploratory battle or command demos—not the main form-up lineage.

| File | Role |
|------|------|
| `iron_age_agent_battle.html` (+ numbered copies, `_v3_1`, `_v4_*`, `_debug`) | Iron-age skirmish ABMs; line-command and debug variants |
| `formup_abm_3d_offline.html` | Earlier offline form-up / 3D ABM sketch |
| `tiered_command_replay (1).html` | Large replay / tiered command visualization demo |
| `roman_abm_sim.py` | Python-side Roman ABM experiment (not the browser stack) |

### Diagnostics

| File / folder | Role |
|---------------|------|
| `telemetry_turn_diag.py` | Headless Python stress of FSM + residual desire (diagnosed on-post spin) |
| `telemetry_turn_out/` | CSV/JSON outputs from that diagnostic |

---

## Design goals (main series)

1. **No painted floor slots** as a global truth the engine “assigns” — but agents may hold an **internal** picture of formation (mental lattice).
2. **Shared doctrine:** facing + shape (line / square / rect / triple) + spacing.
3. **Human-like motion:** face the way you walk; run only roughly forward; inertia; room to move on the approach.
4. **Formations that look like troops,** not a fluid or a mosh pit — with optional **combat / practice / parade** tolerance ladders.

---

## Version history: self-assembling line ABM

Each version kept what worked and added one hard problem. What failed taught the next design.

### v1 — `self_assembling_line_abm_3d.html`

**What it was:** Pure **local-rule line** form-up. No slot indices on the ground. “FORM LINE!” = shared facing + depth consensus + left/right spacing + soft separation/cohesion. Soft forces only for personal space; 3D stick-figure render; orbit camera.

**What worked:**
- Line *could* emerge from neighbors alone (relational, not slotted).
- Clear demo of the scientific claim: no floor X’s required for a thin rank.

**What didn’t:**
- Soft separation → stacking / interpenetration under pressure.
- Camera was orbit-only (no pan / weak controls).
- Only one formation concept (line + loose).
- Motion was omnidirectional-feeling; men could “slide” into place sideways/backwards.

**Realism gain:** First credible “self-organizing rank” lab toy.

---

### v2 — camera + hard collisions

**Added:** Better camera (orbit, pan, zoom-to-cursor, WASD, follow center, reset). **Hard disc collisions** (body radius, multi-iteration resolve, inelastic contact, obstacles/bounds).

**What worked:**
- Bodies stop occupying the same point; formation looks physical.
- Camera usable for long watch sessions.

**What didn’t:**
- Still only line/loose; no multi-shape doctrine.
- Motion still not human gait-relative in a strong way.

**Realism gain:** Troops as solid people, not ghosts.

---

### v3 — multi-formation + anisotropic speed

**Added:** **LINE / SQUARE / RECT** (local rank-file rules + weak global aspect). **Facing-relative speed envelope** (run cone ~15°, walk, slow strafe, back-pedal).

**What worked:**
- Different shapes via shared facing + spacing doctrine.
- Directional speed limits made pure sideways “skating” harder.

**What didn’t:**
- Men could still **move without turning first** enough; reverse/side shuffle into line still looked wrong.
- Aspect/shape pressure incomplete; square often became a fat rectangle.
- No real “I’m done forming” discipline.

**Realism gain:** Doctrine of shape + “you don’t run sideways.”

---

### v4 — headed locomotion + FSM

**Added:** Per-soldier **FSM** (forming_up, turning, adjusting, holding, milling, evading). **Headed motion:** pick travel direction → turn → walk **forward**. Inspired by headed social-force / unicycle pedestrian models.

**What worked:**
- Much more “people relocating,” less “particles sliding.”
- Holding + unit facing as a concept.

**What didn’t (critical):**
- Desire still mixed **cohesion / pack-to-center / aspect** forces → **edge men walked into the middle** → clump + endless jostle.
- Local rules without a clear “don’t collapse the blob” policy.

**Realism gain:** Turn-then-walk human loop — but the *plan* of where to go was wrong.

**Lesson:** Headed locomotion amplifies bad steering. If desire points at the centroid, the whole cohort marches into a knot.

---

### v5 — lattice self-assembly (no center pull)

**Added:** Formation desire rewritten from **rtw_autonomous_drills** + **minimal_revert**: nearest L/R/F/B spacing, **local lattice snap**, line depth consensus only for LINE, isolation glue only when lonely, mean-shift toward free space when packed. Optional outer envelope only if *outside* the planned half-span.

**What worked:**
- Edges stay edges; ranks/files start to appear without a global clump.

**What didn’t:**
- Half the unit **froze green**, half stuck **gold turning** toward noise or never finishing.
- Still pure local/emergent shape; square/rect often “good enough ranks” but wrong envelope.
- Soft settle / solid gates immature.

**Realism gain:** Crystal-bond formation (robotics lattice), not flock-to-center.

---

### v6 — unit doctrine + social/fuzzy solid

**Added:** **Doctrine** layer: target frontage/depth/aspect vs measured envelope (`shapeQ`). **Fuzzy solid score** (local + shape + social + role). Line **extend** when frontage too short. Stronger square aspect pressure. HUD shape quality / targets.

**What worked:**
- Unit-level awareness: “we’re too short / too deep / wrong aspect.”
- Lazy solidify-on-local-only reduced.

**What didn’t:**
- Social gate initially treated “busy polishing” like “unit not ready” → **reciprocal never-settle** (everyone waits on everyone).
- Still no proactive “I know where *my* spot is” — mostly jostle + global reshape.

**Realism gain:** Centurion-level geometry of the unit, not only private neighbor math.

**Lesson:** Social awareness must distinguish **fleeing/routing** from **still dressing ranks.**

---

### v7 — mental archetype + particle-filter seats

**Added:** Shared **lattice archetype** from the command (what a square/line *is*). Each soldier runs a **particle filter** over “which seat is mine?” (distance + occupancy), then walks to that belief. **Musical chairs:** unique claim, closest wins, timeout → next free seat. Sticky locks, frozen formation frame (anti-skate). Travel **~2 m soft bubble**, jam divert (ant-sim). Ally contact no longer triggers EVADING (that had been a half-speed crawl bug). **TRIPLE** line formation.

**What worked:**
- Form-up speed and intentionality jumped: “go to a post,” not Brownian rank assembly.
- Musical chairs fixed dual-claim fights.
- Traffic bubble / jam reduced conga-line piles.

**What didn’t (and was diagnosed):**
- On-post **endless turning** (~90–180°) for a subset of men even with unique seats.
- Early “halt plant / zero desire” facing fix **destroyed packing** (see below).

**Realism gain:** Internal map of the order + personal seat hypothesis — like humans hearing “form square!” and walking to a place in a mental grid.

**Telemetry (`telemetry_turn_diag.py`):** Chronic turners were often **on seat** (`slot_dist` small) but **`bondGood` false** → plant path skipped → residual separation/noise kept `needMove` + **`travelHeading` thrashing** → FSM faced travel forever. A secondary bug kicked long dress-turns back into **FORMING_UP/travel**, restarting the loop.

---

### v8 — facing fix (telemetry-backed) + drill standards

**Added / fixed:**
1. **On-post plant even if multi-criteria bond is soft** — dress **unit facing only**; do **not** rewrite travel heading from residual force; do **not** mass-zero packing forces (that was the bad experiment).
2. **Exact turn finish** (no overshoot past forward then reverse).
3. **Drill standards:** COMBAT / PRACTICE / PARADE batch-set arrive/lock, claim timeout, shape gates, traffic bubble, pressure, etc. Parade tightened after feedback (practice ≈ solid drill; parade = inspection-grade).

**What worked:**
- Packing + settle both good; brains look “human” again.
- Combat vs practice vs parade is a useful design dial.

**What didn’t / residual:**
- Parade/practice tolerances still tuning knobs, not physical truth.
- Neighbor-links overlay is proximity debug, not formation topology (can look random).

**Realism gain:** Facing discipline without killing last-step packing; doctrine of *how good is good enough* (battle vs drill vs parade).

---

### v9 — solid checkpoint

**What it is:** Labeled freeze of the v8 working stack after drill-standard retune and facing fix. Prefer **v9** for further features.

Same capabilities as late v8: mental seats, musical chairs, traffic, no ally-EVADING, on-post unit facing, combat/practice/parade.

---

## Feature stack (how realism accumulated)

```
Local spacing + depth (v1)
    + solid bodies + camera (v2)
    + multi-shape doctrine + gait limits (v3)
    + turn-then-walk FSM (v4)  … broke until desire fixed …
    + lattice / no center-clump (v5)
    + unit envelope + fuzzy solid (v6)
    + mental lattice + particle seats + musical chairs + traffic (v7)
    + telemetry-correct on-post facing + drill standards (v8/v9)
```

Roughly: **physics → doctrine → body → bonds → unit geometry → personal seat → discipline standards.**

---

## What failed and why (cheat sheet)

| Failure | Root cause | Fix |
|---------|------------|-----|
| Stacking bodies | Soft separation only | Hard disc resolve (v2) |
| Sideways moonwalk into line | Force-driven velocity ≠ facing | Headed FSM (v4) + mesh facing fix |
| Everyone walks to center | Cohesion / pack / aspect as center pull | Lattice + envelope-only exterior (v5) |
| Lazy solidify / wrong shape | Solid on local spacing only | Doctrine shapeQ + gates (v6) |
| Never settle (social) | “Busy polishing” blocked solid | Social = fleeing only |
| Slow / purposeless form-up | Pure jostle | Mental seats + PF (v7) |
| Dual-claim fights | Two MAP same slot | Musical chairs (v7) |
| Ally “evade” crawl | emergency on body contact | Separation only; EVADING = terrain (v7) |
| On-post spin ±90–180° | Plant required bondGood; residual → travelHeading | On-post unit facing (v8 telemetry) |
| Fix spin → sloppy clump | Zeroed desire / early plant for all near posts | Revert; only gate facing, not packing |

---

## Controls (v9 / late v8)

| Input | Action |
|-------|--------|
| `1` / `2` / `3` / `4` | Line / square / rect / triple |
| `7` / `8` / `9` | Combat / practice / parade standards |
| `M` | Loose mill |
| `R` | Scatter |
| `Q` / `E` | Face left / right |
| `Space` | Pause |
| LMB / RMB / wheel / WASD | Camera |

Toggles: mental archetype, believed spots, neighbor links (proximity debug only), analysis footprint, collision discs, FSM color discs.

---

## Related references (design lineage)

- **Headed / unicycle pedestrians** — face travel, then move (v4).
- **Self-assembling robot lattices** — local bonds, solidify, free-space exploration (v5–v6).
- **Particle filters / desired pose** — personal seat belief (v7); not full SLAM of the map (formation frame is shared doctrine).
- **Ant / traffic jams** — soft travel bubble + “not making progress → divert” (v7).
- **Musical chairs** — unique seats, timeout reassignment (v7).

Internal references in this folder: `rtw_autonomous_drills_v2.html`, `self_assembling_formations_minimal_revert.html`.

---

## Suggested reading order

1. Open **v9** (or v8) — full story in one file.  
2. Optionally open **v1** — pure local line, no seats.  
3. Skim **v4** vs **v5** — headed motion with bad vs good desire.  
4. **v7** vs early failed facing patches — seats + why plant gates matter.  

---

## License / provenance

Experimental prototypes produced in-session for *Roman Imperator* / formation research. Treat as research scratch, not production code.
