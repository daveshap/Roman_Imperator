# Agent Simulations — ChatGPT Experiments

Single-file HTML prototypes (and a few supporting scripts) exploring **Roman-style infantry** as agent-based models: local rules, formation commands, and increasingly human locomotion.

**How to run:** open any `.html` file in a browser (Chrome/Edge/Firefox). No server required unless a file loads external assets.

**Current recommended build / solid checkpoint:** [`soldier_ABM_v07.html`](./soldier_ABM_v07.html)  
(Form-up works end-to-end; face-in-place; late thrash largely solved. Next work = copy → `v08`.)

---

## Directory map

### Clean form-up lab (new lineage) — primary

Versioning: `soldier_ABM_vNN.html` with **NN = 00, 01, 02, …**  
**Checkpoint** = copy the current tip file, bump NN, continue work on the new tip. Linear history (not orphan archives).

| File | Role |
|------|------|
| `soldier_ABM_v00.html` | First solid sticky muster→form→dress |
| `soldier_ABM_v01.html` | Local “don’t all mob one seat” + spatial queries |
| `soldier_ABM_v02.html` | Scale: O(1) seats, candidate rings, dress fast-path |
| `soldier_ABM_v03.html` | Near-rank picks (not far exile) + collision slide |
| `soldier_ABM_v04.html` | **Great baseline** — occupancy perception; cascade free nearest; plant/micro-center |
| `soldier_ABM_v05.html` | Face orders + aggressive twirl gates — **form-up regressed; skip** |
| `soldier_ABM_v06.html` | Pure v04 packing + FACE L/R / ABOUT only (`formFacing` vs `unitFacing`) |
| `soldier_ABM_v07.html` | **Solid checkpoint** — v06 + seat-heading / FOV / stuck-wing / sticky commit / plant protect |

**Deep design notes:** [v04 core](#soldier_abm-form-up-lab-v04--what-works-and-why) · [learnings since v04 → v07](#learnings-since-v04--v07-checkpoint)

### Self-assembling form-up series (legacy main line)

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

## soldier_ABM form-up lab (v04) — what works and why

Captured after v04: form-up is **~99% there** — men take a post, stay on it, and make **micro-adjustments to sit dead-center**. This section freezes the *ideas* so we don’t re-learn them the hard way.

### Scientific claim (non-negotiable)

| Allowed | Forbidden |
|---------|-----------|
| Shared **doctrine**: shape (triple/rect/square), spacing, facing, form-on **(0,0)** | Omniscient **formation controller** that assigns each man a world seat |
| Each man’s **private** belief: “that’s my spot” | Global claim auction / Hungarian / sim-owned free-seat table |
| Occupancy from **what he can see** (bodies, distance to seat centers) | Telepathic “everyone knows who owns file 5” |
| Local cascade: 1st free nearest → 2nd → … | Far-field exile (“go to the opposite end of the map”) |

Mental model ≠ painted floor owned by the engine.  
Mental model = **shared idea of the order** + **private seat hypothesis** + **local perception of who is already using a post**.

There is **no centurion** in this lab. Anchor is geometric origin `(0,0)`. Century size capped at **300** (RTW-scale unit, not 6k stress).

### Shapes only

- **Triple** — 3 ranks deep, files = ceil(N/3)  
- **Rect** — wide shallow block (aspect ~2.4)  
- **Square** — ≈√N side  

No line formation in this lineage (kept out on purpose — purify the experiment).

### The three private phases

Each soldier runs his **own** phase machine. The unit is often mixed colors at once (purple / blue / green). That is correct — not a global “everyone dresses now.”

```
MUSTER  →  FORM  →  DRESS
 mass       ranks     micro
 on site    + files   + plant
```

| Phase | Behavior | Private advance rule |
|-------|----------|----------------------|
| **MUSTER** | Run toward site + local mass; **no seats yet** | Near inner site (+ friends / hold time); personal stagger so not all flip the same frame |
| **FORM** | Pick a free seat in the mental lattice; walk there; sticky commit | Near post long enough + slow → **DRESS** |
| **DRESS** | Face unit facing; strong magnet to seat center; almost no re-pick | Only leave if badly displaced or seat clearly taken by a closer man |

**Why phases matter:** pure seat-seeking from scatter makes everyone solve the full packing problem while still a cloud. Muster first gets a blob on the parade ground; form is “fill ranks/files”; dress is “stop thrashing and look like soldiers.”

### Seat model (what each man “knows”)

1. **Doctrine lattice** — full rectangular grid on `(0,0)` for the current shape, `si = rank * cols + file`. Shared *idea*, not a dispatcher.  
2. **Local candidates only** — spiral/ring of seats near *me* (`candRadius` ~11 m, max ~48). Far-side seats are not even scored.  
3. **Private belief** `beliefSi` — “this is my post” until timeout, shove, or **perception says taken**.  
4. **Stickiness** — min commit time + big score bonus for current belief → no synchronized musical chairs.  
5. **Cascade pick** — among seats I consider **free**, sort by distance, try **1st free, 2nd free, …** (up to `nearRankMax` ~12). Stay local; never optimize “farthest open corner of the army.”

### Occupancy perception (the v04 breakthrough)

This is the difference between “pretty good” and “they plant and stay.”

A visible other man makes a seat **taken for me** if any of:

1. His body is within **`occupyR` (~0.58 × spacing)** of the seat center, or  
2. His computed body-seat is that index, or  
3. His **belief** is that seat and he is **closer** to it than I am (claim in progress).

**Closer man wins.** If two bodies share a post, the farther one must treat it as occupied and cascade to the next free nearest seat — not orbit (“dance”) the planted man.

Earlier bugs that looked like AI personality were mostly **bad sensors**:

| Symptom | False perception |
|---------|------------------|
| Two men “both good” on one post | Seat treated free if *I* was near it, even with someone else closer |
| Dancing around a planted man | Belief sticky on a seat that never registered as taken |
| Everyone mobs one free hole | Greedy nearest with no “taken / closer claim” |
| Exile to far end of block | Huge score penalties for contested near seats → far seats won |

v04 fixes the sensor first; cascade then works because the 1st nearest is honestly free or honestly skipped.

### Dress plant (why micro-adjust looks right)

Once **DRESS**:

- Face **unit facing**, not travel heading (kills spin).  
- Strong pull to seat center; separation almost off when planted.  
- Kill residual velocity on post.  
- Fast path in the mind loop: planted dress men skip expensive re-score / Nash work.

Result: they settle, then **nudge to dead center** if shoved slightly — human “dress the line,” not Brownian polish forever.

### Traffic / collisions (good enough for form-up)

- Soft bubble wider while **relocating** (muster/form).  
- Ahead-neighbor side peel + hard-contact **lateral slide** (keep tangential velocity).  
- Planted dress peels little; movers peel more.  

Still not full infantry pathfinding — enough that cross-traffic doesn’t freeze into a mosh of headbutts.

### Efficiency (v02+) without changing the rules

| Cost | Approach |
|------|----------|
| Body → seat | O(1) grid index + 3×3 refine, not scan all slots |
| Seat scoring | Local candidate ring only |
| Dress men | Fast path every frame |
| Lattice | Cached until shape / N / spacing / facing change |
| Neighbors | Integer-key spatial hash |
| Draw | LOD at higher N (skip depth sort / ticks) |
| N | Cap **300** for this lab |

Logic and formation quality stay; we only avoid O(N² × slots) thrash.

### Version arc through v04

| Ver | Lesson |
|-----|--------|
| **v00** | Phases + sticky private seats beat pure force soup |
| **v01** | Uncontested greed → mob one hole; local yield, not auction |
| **v02** | Same rules, cheap structure → higher N playable |
| **v03** | “Not closest ⇒ go far” overshoots; k-th nearest free; slide collisions |
| **v04** | **Occupancy perception** + cascade free nearest → plant + micro-center |

---

## Learnings since v04 → v07 checkpoint

Compressed so we don’t re-break a working form-up.

### What v04 already nailed

- Private seat belief + **closer-wins occupancy**  
- Free cascade (1st free, 2nd free, …)  
- Muster → form → dress plant  
- Dress micro-center; no global auction  

### v05 — what *not* to do (form-up regression)

Tried to kill residual twirl by hard **relocate vs plant face gates** (travel only if far from seat; near post always unit-face / weak move).

**Result:** last men **stopped short of seats** or stalled — “believed spot correct, body not walking.”  

**Lesson:** form-up locomotion was fine enough; **don’t strangle approach** to fix heading. Ship face orders separately from packing.

### v06 — face-in-place done right

**Stationary facing** (not reform). Keep **v04 packing 100%**; only add face.

| Command | Keys | Latin (UI title) |
|---------|------|------------------|
| FACE LEFT | `Q` | Ad scutum, clina |
| FACE RIGHT | `E` | Ad gladium, clina |
| ABOUT FACE | `F` | Transforma |

Critical split:

| Concept | Role | FACE changes it? |
|---------|------|------------------|
| **`formFacing`** | Footprint / ranks-files in world | **No** |
| **`unitFacing`** | Where men look / dress front | **Yes** |

If FACE rotated a single `facing` used by the lattice, seats would **teleport** (looks like reform/explosion).  
Short `faceOrderT` = pivot in place; then full v04 walk logic resumes.

### Late-form problems after v04 (symptoms → causes → fixes in v06/v07)

| Symptom | Cause | Fix (version) |
|---------|--------|----------------|
| Last men **spin** with correct target | `travelHeading = atan2(desire)` includes sep/jam noise → thrash + align-gate crawl | Face **seat** (`gx,gz`), not desire (`dx,dz`) — **v07** |
| Stall short of seat | `onPost` true when only **locked** (outside arriveR) → weak pull + `needMove=false` | On-post freeze only at **arriveR** — **v07** |
| Magnetic cup / only find free after wandering | Candidate spiral fills **nearest N** seats (dense core); free **edge** seats never listed | `candMax = nSlots`, `candR ≥ formHalf` — **v06/v07** |
| Kid thrash: run one way, abandon, run other | `stuckFormT` / claimTimeout / wing pick while **still closing** | Stuck/timeout only if **!closing**; claim timeout → nearest free, not wing every time — **v07** |
| Center reshuffle; knock green men off | Passers flagged `takenHard`; collisions shove DRESS equally | `takenHard` only **same-seat claim** + closer; planted **barely move**, movers peel — **v07** |
| Dual “best for unit” always-on score | Edge/gap weights dominated early FORM → **dozens clump center** | **Reverted.** Unit priority only as **stuck wing escape**, not continuous score — **v07** |

### v07 architecture (what “working” means now)

```
MUSTER → FORM (nearest free cascade + sticky + occupy)
              ↓ only if long NO-PROGRESS stuck
         pickWingFree (free seat far from planted mass COM)
              ↓ plant
         DRESS (unit face, micro-center, hard to knock off)
```

Plus face orders: `unitFacing` only; seats fixed.

**Default pick stays selfish nearest free** (works).  
**Wing escape** is the adult “middle is full, go to the open end” — but only when genuinely stuck, not every few seconds.

### Hard lessons (compression)

1. **Perception before personality** — dancing/sharing was sensors, not “dumb AI.”  
2. **Don’t mix face polish with packing** — v05 form regression.  
3. **Split formFacing / unitFacing** — required for ABOUT FACE without reform.  
4. **FOV of the lattice ≠ body senseR** — empty wing seats must be *listable* or seekers never choose them.  
5. **Travel heading = seat, not force soup** — kills last-man spin.  
6. **Abandon only when not closing** — timeouts while walking a good seat = kid thrash.  
7. **Protect the line** — planted DRESS is sacred; seekers bounce.  
8. **Unit integrity ≠ continuous dual score** — continuous “best for unit” clumped the mass; use **conditional strategy** (stuck → wing) instead.  
9. **One change at a time when debugging late form** — multi-knob rewrites hid the wins.

### Controls (v07)

| Input | Action |
|-------|--------|
| `1` / `2` / `3` | Triple / rect / square |
| `Q` / `E` / `F` | Face left / right / about |
| `R` | Scatter |
| Space | Pause |
| `+` / `-` | Tempo |
| N slider | 12–300 |
| Show believed spots | Private targets |
| Drag / wheel | Orbit / zoom |

Colors: **purple** muster · **blue** form · **green** dress/hold. HUD: phase counts, face°, near-post %, frame ms.

### What *not* to “fix” next (unless intentional)

- Global seat auction / omniscient controller.  
- Continuous dual “best for unit” scoring as default pick (failed clump).  
- Aggressive relocate-face gates that freeze approach (v05).  
- Face-travel from residual force near post.  
- Wing re-pick while still closing on a good seat.  
- Knocking DRESS men off for soft contact.  
- Expanding N past ~300 without a scale plan.

### Open / remaining (honest)

v07 is a **working checkpoint**, not perfection:

- Rare late edge cases at high N / max tempo.  
- Shape switch mid-dress (rect→square).  
- Optional post-plant dress-right / cover (relational polish).  
- Centurion as **physical** agent (orders, not seat dispatcher).  
- Multi-century re-embed later.

### Bottom line (v07)

> **v04 proved packing can look human.**  
> **v06 proved face orders without destroying packing.**  
> **v07 proved late thrash is mostly bad heading, premature abandon, FOV, and soft plants — not a need to redesign the whole ABM.**  
> **Keep nearest-free + occupancy; escape the cup only when stuck; never teleport seats on ABOUT FACE.**

### Bottom line (capture this)

> **Don’t invent the formation from flocking.**  
> **Give doctrine (shape + spacing + site).**  
> **Let each man own a private seat belief.**  
> **Let him see who is already using a post (closer wins).**  
> **Cascade nearest free seats — not furthest, not auction.**  
> **Muster, then form, then dress with unit face and plant.**  
> **v04 works because perception finally matches the packing problem the men are solving.**

---

## Version history: self-assembling line ABM (legacy)

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

**What it is:** Labeled freeze of the v8 working stack after drill-standard retune and facing fix.

Same capabilities as late v8: mental seats, musical chairs, traffic, no ally-EVADING, on-post unit facing, combat/practice/parade.

---

### v16 — private mental lattice (no global auction)

**What changed:** Form-up mental model is **per-soldier**, not a sim-owned claim table.

- Shared **doctrine only**: shape (line/square/rect/triple) + spacing + facing.
- Each man estimates a **personal formation origin** from men he can sense (local mass).
- He paints candidate cells in his head, scores them with **personal prefs** (edge/center, front/back, dense/sparse) + distance.
- Occupancy is **local**: a cell is “taken” only if he sees a body on it.
- If stuck / taken → **next best** (his list). No closest-wins auction, no global unique pass.
- Continuous re-score as the block forms (kids packing a square).
- On-post facing discipline kept from v8/v9.

**What this is not:** omniscient formation controller, painted floor slots owned by the engine, or Hungarian seat assignment.

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
