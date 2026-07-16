# Soldier ABM v30 release notes

Release date: 2026-07-15

v30 turns the inherited v29 capability battle into a playable private-command laboratory. It adds a firm Gameplay/Debug interface boundary, independently owned general cognition for both teams, a non-cheating enemy general, and field knowledge that travels back on the same physical runners that carry orders out.

The release remains governed by one rule:

> Doctrine may be shared before contact. Live knowledge and intent must be perceived, communicated, remembered, or inferred by the actor that uses it.

## Release highlights

- Gameplay is now the default browser mode. The human commands Blue B1/B2; Red formations appear as intelligence contacts rather than selectable enemy units.
- Gameplay's command and intelligence panels consume only `generalSituation('blue')`. They do not read exact century observer records, Red's private general projection, capability summaries, tactical roles, communications internals, or diagnostics.
- Enemy tracks are obfuscated into anonymous/recognized contact marks plus bounded confidence, age, strength, range, bearing, and threat bands. Enemy engine century identity and private state are absent. Contacts are threat-sorted with deterministic confidence, freshness, range, and private-track-ID tie-breaks.
- The Gameplay renderer suppresses every exact Red soldier, centurion, courier, corpse, hit flash, hold zone, command-post annotation, and FSM/role/count label. It draws only coarse contact glyphs from Blue's general projection; Blue floating labels show only public standards. Debug restores world truth.
- Blue and Red now own separate general brains, sensors, FSMs, friendly/enemy/signature track maps, latest-order plus posture/zone receipt maps, per-serial receipt history, command-post runner leases, decision histories, and deterministic traits.
- The Red general can autonomously choose among observe, probe, deceive, press, guard, and recover using only its private beliefs. It aggregates all credible enemy tracks for force comparison, separates strength evidence from location confidence, clears stale zones physically, and issues through the same public order functions as a human general.
- General runners now have a complete outbound/return information loop and epistemic capacity model. A successful delivery copies the order to the centurion and creates a finite field report; the post accounts for one lease per recipient until the matching return or a belief-derived missed-return deadline. Remote runner death is not instant staff knowledge.
- Added `generalSituation(team)`, `setGeneralAI(team, enabled)`, `debug.generalKnowledge(team)`, and general sensor inspection through `debug.percept('general-blue')` and `debug.percept('general-red')`.
- Added focused general tests and expanded architecture/UI audits.
- Added tactical-emergence and grand-strategy research documents, the integrated `docs/DESIGN_SYNTHESIS_AND_ROADMAP.md`, and `V30_PLAYABILITY_AUDIT.md`.

## Gameplay and Debug boundary

Gameplay is a restricted command view, while Debug is an explicitly omniscient laboratory view.

| Area | Gameplay | Debug |
|---|---|---|
| Selection | Blue B1/B2 | B1/B2/R1/R2 |
| Friendly status | General-owned doctrine, direct sight, reports, and receipt state | Exact observer century state |
| Enemy status | Blue general-owned contact projections | Exact Red century state and internals |
| Roster/cognition | Hidden | Capability summaries and private-track overlays |
| Global totals | Hidden | Exact casualties, hits, messages, and runner totals |
| Canvas | Exact Blue friendlies/public marks; coarse Blue-belief contacts; no exact Red world objects or annotations | Exact bodies/events/labels, zones, and both command posts |

Switching back to Gameplay synchronously replaces observer card text with Blue's general projection and disables the cognition overlay. If the dedicated Gameplay projection cannot be read, the UI fails closed to unknown/pending information instead of falling back to `snapshot.centuries`.

Gameplay enemy rendering is belief-only: the renderer receives Blue's general situation separately, skips exact Red world records, and draws coarse glyphs from contact position, confidence/age, and strength band. Terrain LOS, concealment, dead ground, and richer uncertainty geometry remain future work.

## Private general cognition

Each team general owns:

- a six-state FSM and current intent/reason;
- deterministic aggression, deception, patience, and acumen traits;
- doctrine-seeded friendly-century tracks;
- geometry-associated enemy formation tracks;
- recognized standard-signature associations;
- latest per-recipient/family receipt watermarks plus per-recipient/family/serial `receiptHistory`;
- one command-post-local `runnerLease` per recipient, with a belief-derived `expectedReturnAt`;
- intended and serial-guarded confirmed posture/zone state;
- separately aged location and strength evidence (`strengthConfidence`, `strengthObservedAt`);
- decision timing, order/report counts, and bounded deception state.

The fixed general post has finite sight. Its sensor uses deterministic range error, public friendly standards, guide-to-formation-center conversion, full-footprint-only strength evidence, and enemy geometry clustering. A partial formation footprint can refresh location without pretending to provide a complete strength count. It does not group hostiles by hidden `centuryId`, inspect actor profiles or conditions, or read a centurion brain. Both general sensor frames are frozen before either general FSM runs in a tick.

General awareness continues to update while autonomous decision-making is disabled. Friendly location and strength have independent evidence confidence/times: returned pose is projected using reported velocity over courier transit, and both pose and strength confidence decay over that interval rather than becoming current merely because the runner arrived. When enabled, the FSM reasons from its own friendly/enemy tracks and traits. Force comparison sums every credible enemy track and discounts its own strength comparison when strength evidence is weak; the best track is only the focal range/motion contact. It cannot read `centuries`, `soldiers`, `bodyById`, live centurions, capabilities, or conditions. A decision calls `issuePosture()`, `setHoldZone()`, or `clearHoldZone()` and therefore creates queued, independently addressed physical orders rather than mutating a century mission.

## Physical orders and return reports

The general-command lifecycle is now:

1. Player or AI intent creates one serialized packet per addressed century and one exact history record keyed by recipient, family, and serial.
2. The packet is queued by recipient and command family; newer queued same-family intent explicitly supersedes the older queued record.
3. On a later courier-service phase, a physical runner leaves the team's fixed post and creates a local lease with a return deadline derived from the believed target round trip, a margin/floor, and packet expiry.
4. Its initial target is derived only from that general's private friendly track, converted from believed formation center to guide; it then searches/reacquires physically.
5. Successful delivery copies the packet into the centurion's private command inbox.
6. At delivery, that centurion composes a frozen field report from its own perceived strength/state, public standard, quantized pose/velocity, and at most one private enemy track.
7. The same runner returns to the originating command post.
8. Return processing updates that serial's own receipt, serial-guards confirmed posture/zone, projects carried friendly/enemy poses across transit, decays pose/strength/contact confidence, and preserves the separate evidence timestamps.

Centuries can therefore react while their general still sees an order as `outbound`. Command-post capacity never inspects the remote courier list: only the matching serial/family return releases its lease early. Killing a remote runner through combat—or through `debug.setCondition(id, { hp: 0 })` in a counterfactual—does not change the lease or receipt. If the predicted deadline passes, the post releases the lease and marks that serial `overdue` with `overdueAt`/reason, without fabricating a death, delivery, or return. A late physical return can still replace overdue with `acknowledged` or returned-undelivered `failed`; a queued packet may separately fail if it expires at the post.

Intended posture/zone changes on issue, while confirmed payload and confirmation serial change only after a successful physical return and cannot regress when an older runner arrives late. Autonomous reconciliation compares both: it retries failed/overdue state and also repairs an acknowledged or satisfied latest receipt whose confirmed payload still disagrees. Materially unchanged set-zone intent is deduplicated while its matching receipt is queued, outbound, or correctly confirmed, but failed/overdue intent retries normally.

An older successful return may remove only a still-queued genuinely equivalent individual-posture or zone retry with the same payload and `teamScope`. Its private receipt becomes `satisfied` with `satisfiedAt`/`satisfiedBySerial`—not a fabricated `returnedAt`—and Gameplay projects that as acknowledged. An already dispatched retry is unaffected. Team-scoped posture is never deduplicated this way because its serial is the proposal/ACK/COMMIT coordination epoch.

## Public API additions and changes

### Construction and reset

`createBattlefieldSimulation()` and `reset()` accept `generalAI`:

```js
const simulation = createBattlefieldSimulation({
  seed: 0x3001,
  perCentury: 24,
  generalAI: { blue: false, red: true }
});
```

`generalAI: true` enables both teams. The headless engine defaults both off. The browser's checked enemy-AI control enables Red during UI initialization. When `reset()` omits `generalAI`, the current enable flags are retained.

### Gameplay projection

```js
const situation = simulation.generalSituation('blue');
```

The method validates `blue`/`red` and returns a newly detached, deeply frozen object containing:

- `team`, `aiEnabled`;
- `general`: state, intent, reason, last decision time, orders issued, reports received;
- `friendly[]`: own ID/mark, pose confidence/age, independent `strengthConfidence`/`strengthAge`, strength/status bands, per-century intended posture, order status/source, believed quantized position; strength becomes `unknown` below 0.18 confidence, private `satisfied` receipts project as acknowledged, and equal-time latest statuses use the higher serial;
- `contacts[]`: private track ID, optional recognized mark, confidence/age and categorical threat geometry, believed quantized position, ordered by threat with deterministic tie-breaks;
- `alerts[]`: overdue/uncertain/withdrawing-friendly and near-command-post warnings.

The projection is team-scoped, not globally player-scoped. Trusted/debug code may request Red; the browser Gameplay UI requests only Blue.

### AI control

```js
simulation.setGeneralAI('red', true);
```

The method returns frozen `{ team, enabled }`. Enabling schedules a near-term decision opportunity but does not immediately issue an order or change material state.

### Debug additions

- `debug.generalKnowledge(team)` returns a detached private-brain copy including intended/confirmed posture/zone with confirmation serials, full per-serial `receiptHistory`, and current post-local `runnerLeases`.
- `debug.percept('general-blue' | 'general-red')` projects the current identifier-free general sensor DTO.
- `debug.setCondition(actorId, { hp: 0 })` now invokes the material death path, enabling real courier-loss counterfactuals instead of leaving a zero-HP actor alive.

`observe()`, `diagnostics()`, `inspectActor()`, `rosterSummary()`, and the other debug methods remain omniscient observer/test surfaces. `observe()` now includes detached `generalSituations.blue` and `.red`; Gameplay does not consume Red or the exact century summaries.

## Inherited v29 systems

v30 preserves the v29 individual-capability and battle architecture:

- unique frozen natural/development/equipment/capability records and unique mutable conditions per actor;
- bounded correlated natural variation and layered `unitProfiles`;
- stable finite modifier stacks and independent training domains;
- private centurion/soldier perception, tracks, plans, morale, orders, and combat FSMs;
- physical voice, standards, century runners, general runners, officer orders, and soldier relays;
- proposal/ACK/COMMIT team-plan epochs and abort reconciliation;
- fix/flank, hold-wing, and bait/cover doctrine;
- sealed strike intentions, material-only opponent capability reads, simultaneous damage, collision resolution, routing/rally, and deterministic replay.

`V29_CAPABILITY_AUDIT.md` remains the detailed calibration record for those inherited systems.

## Release gate

The current v30 tree passes:

- 40/40 deterministic Node tests: eight capability tests, 24 inherited engine/protocol/stability tests, and eight general tests;
- all 18 checks reported by `tools/audit-architecture.mjs`;
- all eight checks reported by `tools/audit-ui.mjs` against the self-contained v30 build.

New release evidence includes:

- unique ownership for both general brains and every audited friendly/enemy/latest/posture/zone/receipt-history/runner-lease map family;
- frozen general percepts without engine identities or private actor fields;
- static rejection of material-world reads inside general decision logic;
- private-track-only command targeting, guide-to-center conversion, full-footprint strength gating, aggregate enemy comparison, velocity-projected/transit-decayed friendly and enemy reports, and stale-zone clearing;
- per-serial receipts, post-local runner leases, belief-derived deadlines, and proof that remote runner death neither releases capacity nor changes a receipt;
- intended versus serial-guarded confirmed posture/zone, unchanged set-zone dedupe, and physical retry/repair after failed, overdue, or acknowledged/satisfied-but-mismatched state;
- truthful equivalent-queue satisfaction with exact payload/team-scope matching and team-posture-epoch exclusion;
- independent strength confidence/age with weak evidence projected as unknown;
- threat-sorted gameplay contacts with deterministic tie-breaks and no hidden enemy identity;
- initial enemy ignorance outside the general sight horizon;
- team-scoped, detached `generalSituation()` values;
- physical AI commands with no decision-tick or dispatch-tick posture mutation;
- field knowledge and confirmed command payloads updating only on successful runner return, without late-serial regression;
- Gameplay's Blue-only projection consumption and rejection of enemy selection;
- Debug-only exact cards, cognition, roster quality, seed/strength, and global tallies;
- renderer mode propagation, exact Red world suppression, and Blue-belief contact rendering;
- standalone metadata at release version 30.

These counterexamples are embedded in the existing eight general tests—same-time serial ordering, long healthy round trips, team-epoch non-dedupe, stale returned friendly evidence, remote-runner-death lease behavior, and reversed return order where a newer confirmed/material posture survives an older overdue runner's later return—so the deterministic total remains 40 rather than growing through one-assertion test shells. The architecture audit also asserts two distinct receipt-history maps and two distinct runner-lease maps and rejects command-post capacity code that reads the remote courier collection.

The complete evidence/risk judgment is in `V30_PLAYABILITY_AUDIT.md`.

## Known limits

- Gameplay contact glyphs are coarse circular point estimates, not terrain-aware LOS, silhouettes, or uncertainty areas.
- General posts are fixed, invulnerable logical sensor/runner origins rather than embodied commanders.
- General AI has only three posture families and optional zones. It has no terrain, objective/time, reserve, mission-purpose, pursuit-limit, rally-point, or course-of-action hypothesis model.
- Command receipts now retain truthful per-serial lifecycle/provenance, but general track/report evidence still lacks immutable report IDs, full chain of custody, contradictions, and decision traces.
- Return reports are composed once at delivery and do not model distortion, capture, interrogation, staff competence, or variable fidelity.
- The battlefield remains flat/open, without elevation, occlusion, weather, roughness, roads, water, fortification, missiles, cavalry, supply, or relief.
- Match adjudication remains casualty/time based rather than objective, delay, withdrawal, or route based.
- Enemy/general track uncertainty is scalar confidence rather than a covariance or multi-hypothesis model.
- The inherited v29 campaign, live-effect, equipment-catalog, relay-fidelity, explicit defense-intention, and late-stalemate frontiers remain.

## Recommended next slices

Follow the integrated roadmap's two immediate gates:

1. **P0 — Traceable command:** general-purpose immutable report/message packets, source chains, observed/created/sent/received times, contradiction history, decision traces, and expanded audits so every AI command is reconstructible from the evidence available then.
2. **P1 — Ridge Road:** objective/time/plan/reserve gameplay at the current two-century scale.

The slice should retain two centuries per side and add a road, shallow ridge, wet gully, ford, incomplete terrain reports, a timed hold-and-withdraw objective, a route-clearance objective, main effort, true reserve, rally/pursuit boundaries, one conditional release order, and terrain-aware contact visibility. This exercises the new private generals and physical reporting without prematurely expanding into a campaign.

The synthesis's five-node logistics/trade **Road to battle** slice is P2, after Ridge Road validates the tactical command loop.
