# v30 playability and private-command audit

Date: 2026-07-15  
Scope: `soldier_ABM_v30` Gameplay/Debug boundary, general cognition, enemy projection, physical command/report loop, verification evidence, and next implementation slice

## Verdict

**Pass as a deterministic, playable command laboratory. Partial as a finished battlefield game.**

v30 closes the most important architectural gap left by v29: the human and enemy general can now operate through private situation models instead of using exact century/world state. Gameplay presents Blue's reports and contact beliefs, the Red general reasons from its own sensor/report history, and both human and AI orders travel through physical runners. A century may act before its general learns that the order arrived; success and field evidence require a return, while a command post may infer only that a locally predicted return deadline was missed.

The interface separation is real and audited. Gameplay cards do not consume omniscient century records, exact enemy state is absent from the Blue general projection, observer-only text is scrubbed when leaving Debug, and the renderer suppresses every exact Red world object/event/annotation in favor of coarse Blue-general contact glyphs.

The remaining playability limitation is strategic and environmental rather than a truth leak: contact glyphs are not yet terrain-aware, and the battle still lacks terrain, objective/time pressure, a true reserve, mission constraints, pursuit/withdrawal rules, and non-annihilation victory. v30 is therefore a sound foundation for the Ridge Road vertical slice, not the endpoint of the tactical design.

## Audit scope and evidence

The audit inspected:

- `src/engine.js` for general ownership, sensing, memory, FSM decisions, facade projection, command queuing, delivery, return reports, and tick barriers;
- `src/ui.js`, `src/renderer.js`, `index.html`, and `styles.css` for Gameplay/Debug data use and visual gating;
- `test/general.test.mjs`, inherited engine/capability tests, and both audit tools;
- `docs/TACTICAL_EMERGENCE_RESEARCH.md`, `docs/GRAND_STRATEGY_RESEARCH.md`, and their integrated `docs/DESIGN_SYNTHESIS_AND_ROADMAP.md` for roadmap alignment;
- the v30 standalone artifact through the UI/self-containment audit.

Read-only verification on the current tree passed:

| Gate | Result | What it establishes |
|---|---:|---|
| `node --test --test-concurrency=1 test/*.test.mjs` | 40/40 release gate | Capability, protocol, tactics, determinism, stability, and eight general tests with embedded hardening regressions |
| `node tools/audit-architecture.mjs` | 18/18 reported checks | Static/runtime truth firewall, ownership including history/lease maps, frozen projections, epistemic command-post scheduling |
| `node tools/audit-ui.mjs` | 8/8 reported checks | Default Gameplay mode, enemy projection, AI toggle, annotation gate, and v30 standalone |

The total remains 40 because the final counterexamples were embedded into the existing eight general tests: same-time serial tie-breaking, healthy distant round trips without duplicate posture epochs, team-posture non-dedupe, transit-aged friendly pose/strength, a killed remote runner that cannot free its command-post lease before `expectedReturnAt`, and reversed return order where a newer serial returns first and the older overdue runner cannot regress either confirmed or material posture.

## Requirement matrix

| Requirement | Status | Evidence and qualification |
|---|---|---|
| Gameplay defaults to a restricted player view | Pass | `<body data-ui-mode="gameplay">`; UI initialization calls `setUIMode('gameplay')`. |
| Gameplay tactical panels use only Blue general knowledge | Pass | `readGeneralSituation()` calls `simulation.generalSituation(TEAM.BLUE)`; Gameplay card/selected functions are audited against `snapshot.centuries` and private observer fields. Contacts are threat-sorted with deterministic tie-breaks. |
| Enemy projection hides private state and identity | Pass | Contacts omit enemy `centuryId`, team, FSM/posture/reason, profile, capabilities, condition, HP, morale, and fatigue; UI shows whitelisted bands and generic contact labels unless a standard is recognized. |
| Gameplay canvas hides exact enemy world truth | Pass | Exact Red bodies, centurions, couriers, corpses, hit flashes, zones, post, and labels are skipped; coarse glyphs come only from Blue general contacts. |
| Gameplay enemy rendering is terrain-aware | Deferred | Contact glyphs are belief-only but the open field has no LOS occlusion, concealment, dead ground, silhouettes, or covariance areas. |
| Each general owns private cognition | Pass | Two unique brains plus unique friendly, enemy, latest/family receipt, per-serial receipt-history, and runner-lease maps; signature map and decision history are also per general. |
| General sensing is finite and anonymous | Pass | Fixed-post sight horizon, deterministic error, geometry clustering, public standard signatures, no hostile hidden century lookup, and no private actor fields in percepts. |
| Friendly location and strength evidence are not conflated | Pass | Guide sightings convert to formation centers; counts update only with a full visible footprint. Location and strength own separate confidence/timestamps, and returned evidence is transit-decayed. |
| General AI is non-cheating | Pass | `chooseGeneralIntent()` is statically barred from world collections and consumes private tracks/traits; decisions enqueue public physical commands. |
| General force comparison considers multiple threats | Pass | Every credible enemy track contributes confidence-weighted strength; the best track is only the focal contact for range/motion. |
| Player and AI use the same material order path | Pass | Both call `issuePosture()`/`setHoldZone()`, which call `enqueueGeneralCommand()`; no direct century posture mutation. |
| Outbound orders are physically delayed | Pass | One command-post lease per recipient, queued family supersession before dispatch, later-tick dispatch, physical search/reacquisition, and no same-tick delivery. A late old runner may physically overlap after the post's predicted deadline. |
| Courier targeting uses belief, not true pose | Pass | Target estimate derives from that general's private friendly center/heading and doctrine geometry. |
| Field knowledge returns physically | Pass | Report composed from the recipient centurion at delivery; evidence and confirmed payload merge only when that runner reaches the general post. A deadline creates only local overdue knowledge. |
| Return-report age affects friendly and enemy evidence | Pass | Friendly pose and enemy contact are dead-reckoned over courier transit; pose, strength, and contact confidence decay while separate original evidence times remain. |
| Intended and confirmed intent remain distinct | Pass | Issue changes per-century intended posture/zone; successful return changes serial-guarded confirmation. Late old returns cannot regress newer confirmation. |
| Runner capacity is epistemic | Pass | A matching return or belief-derived `expectedReturnAt` releases the local lease. Remote runner death never directly changes lease/receipt; debug HP-zero counterfactual covers it. |
| AI reconciles physical command uncertainty | Pass | Failed/overdue and acknowledged/satisfied-but-mismatched state retries physically; unchanged set-zone intent is deduped; stale zones clear only through ordinary packets. |
| Debug remains available without contaminating cognition | Pass | Observer/debug projections are frozen/detached; `generalKnowledge` exposes history/leases; HP zero invokes material death for counterfactuals; mutators remain quarantined. |
| The player has a strategically complete battle loop | Partial | Posture, zones, selection, tempo, pause, reports, alerts, and enemy AI are playable; objective, reserve, terrain, reconnaissance tasking, and pursuit/withdrawal planning are absent. |

## Gameplay/Debug boundary audit

### Gameplay reads

The knowledge-bearing Gameplay panels consume a single projection:

```js
simulation.generalSituation('blue')
```

The returned object is detached and deeply frozen. It contains Blue's general state/intent, friendly tracks, enemy contact tracks, latest order state, and alerts. Friendly pose and strength facts may originate in doctrine, direct vision, or a returned runner report, but expose separate confidence/age fields; weak strength becomes `unknown`. Private equivalent-command `satisfied` status projects as acknowledged rather than leaking scheduler internals. Enemy facts may originate in direct general vision or a centurion report carried back by a runner.

The UI turns that projection into bounded vocabulary. Unknown or malformed values fall back to `UNKNOWN`, not raw string interpolation. Enemy cards expose:

- anonymous `CONTACT A/B` or a safely validated recognized mark;
- strength band;
- confidence and age bands;
- threat band;
- range and bearing bands.

They do not expose an enemy plan, role, state, exact strength, capability, morale, order, or objective.

Gameplay also uses observer time/config/result for lifecycle presentation and receives diagnostics in the update signature, but exact global tallies are inside `.debug-only` markup. The Gameplay Blue/enemy score panels are overwritten from `generalSituation('blue')`, not diagnostics.

### Debug reads

Debug deliberately consumes `observe()` and `diagnostics()` to show:

- both general FSM states, intents, reasons, exact private-track counts, order counts, and report counts;
- all four exact century cards;
- exact state, tactical role, alive/initial count, and communication state;
- selected FSM reason, plan status/epoch, line errors, standard, and hold zone;
- deployment capability/training summaries;
- exact global casualty/combat/message totals;
- optional copies of all centurion private tracks and individual contacts;
- both teams' zones, post annotations, and floating state/role/count labels.

This is appropriate for a laboratory as long as it is visibly labeled and never becomes a cognitive input. v30 meets that condition.

### Mode transition

Returning to Gameplay:

1. propagates Gameplay mode to the renderer;
2. forces selection back to B1 if a Red century was selected;
3. disables the cognition overlay in both control and engine presentation state;
4. immediately rewrites score, selected, and century cards from the last Blue situation projection;
5. applies CSS that hides every `.debug-only` element.

This closes the common one-frame leak in which observer text survives a mode change until the next render update.

## Enemy projection and obfuscation audit

### Engine projection

`generalSituation(team)` is a projection of one general brain, not a filter over enemy century snapshots.

Enemy track IDs are general-owned serials such as `blue-general-track-1`; they do not encode Red century identity. A public standard may later populate `recognizedMark`, but recognition is a sensor result. Position is the general's quantized, predicted track estimate. Confidence decays and the track expires. Strength, range, bearing, and threat are projected as coarse bands. The projected array is sorted by threat band, then confidence, freshness, range band, and private track ID, making the most urgent belief appear first without querying material enemy state.

Numeric confidence and quantized believed x/z remain in the public method for map clients. This is acceptable under the current contract because they are private estimates, not material truth. The browser intentionally does not print the coordinates or an exact strength number.

### Renderer projection

Gameplay rendering now enforces an enemy-world truth firewall:

- no Red hold-zone geometry or label;
- no Red general-post diamond or label;
- no Red floating century label;
- no exact Red soldiers or centurions;
- no Red physical courier;
- no Red corpse marker;
- no hit flash whose target is Red;
- no exact Blue FSM, tactical role, or alive/initial count in floating labels;
- no private centurion-track overlay because the cognition option is disabled/hidden.

`main.js` passes `simulation.generalSituation(TEAM.BLUE)` separately to `renderer.render()`. In Gameplay, `drawGameplayContacts()` is the only enemy projection: it draws a coarse radius from `strengthBand`, opacity/dashing from confidence and age, a safe recognized/generic mark, and the Blue general's believed x/z. Debug restores the observer bodies, couriers, corpses, events, zones, and labels.

This closes the exact-enemy visual leak. It is not yet a complete terrain-visibility model: glyphs are circular point estimates, the battlefield has no occlusion/concealment/dead ground, and the renderer does not yet express track covariance or competing hypotheses.

## General brain, sensor, tracks, and FSM audit

### Ownership

`createGeneralBrain(team)` allocates independent mutable records for Blue and Red:

- `state`, `intent`, `reason`;
- frozen `traits` (`aggression`, `deception`, `patience`, `acumen`);
- `friendlyTracks`, `enemyTracks`, `signatureTracks`, latest `orderReceipts`, separate `postureReceipts`/`zoneReceipts`, per-serial `receiptHistory`, and post-local `runnerLeases`;
- per-friendly intended/confirmed posture and zone payloads, family confirmation serials, and independent pose/strength evidence clocks;
- private enemy-track serial;
- decision/order/report counters and timing;
- deception/zone commitment state.

The runtime architecture audit confirms two unique general brains and unique instances of friendly, enemy, latest-receipt, posture-receipt, zone-receipt, receipt-history, and runner-lease map families. Static checks also reject a scheduler that uses the remote courier collection as command-post capacity. No map or brain is shared across teams.

### Sensor

`senseGeneral(general)` is the only physical-world projection used by general cognition. It:

- observes from the team's fixed post;
- applies a finite sight horizon scaled by private acumen;
- derives friendly strength only when the complete doctrine-sized formation footprint is inside sight; partial coverage returns no count;
- observes a friendly centurion's guide/standard/state only within standard sight and after signal delay, then converts the noisy guide observation into the believed formation center before track storage;
- excludes enemy runners from general formation detections;
- adds deterministic range-dependent position error;
- clusters enemy detections with 2.8 m geometry links and minimum formation evidence;
- attaches a standard signature only when a centurion is physically part of the component;
- returns a frozen DTO with no engine body/century ID or private profile/condition fields.

Both teams' general percepts are produced before either general mind executes in a tick.

### Tracks

`updateGeneralAwareness()` owns the transition from current percept to private memory:

- predicts existing enemy positions using remembered velocity;
- decays confidence with a bounded half-life;
- associates by recognized signature or proximity;
- fuses direct vision and lower-confidence runner reports differently;
- expires low-confidence/old tracks;
- refreshes friendly tracks from visible standards or later return reports;
- tracks pose confidence/`observedAt` separately from `strengthConfidence`/`strengthObservedAt`;
- projects a returned friendly pose with its coarse velocity across transit and applies transit-decayed confidence independently to pose and strength;
- rejects equal-time or older returned evidence instead of overwriting same-time direct sight;
- decays unseen friendly pose and strength confidence rather than reading current friendly truth.

Location confidence and strength evidence are deliberately separate. A visible guide can refresh center/state while a partially visible footprint contributes no new strength count. This prevents an edge-of-range glimpse from being misread as catastrophic casualties, and a long courier transit cannot make an old strength count fresh merely by reaching headquarters.

A report may contain an older `observedAt`; the general preserves evidence age instead of treating return time as observation time. `generalSituation()` therefore exposes pose `confidence`/`age` and independent `strengthConfidence`/`strengthAge`; below 0.18 strength confidence its public `strengthBand` is `unknown`.

### FSM

The general decision states are:

| State | Current evidence-based use |
|---|---|
| `observe` | Maintain prior posture while contact is insufficient and patience has not elapsed. |
| `probe` | Order aggressive reconnaissance-in-force after prolonged no-contact uncertainty. |
| `deceive` | Issue/maintain defensive feint when traits and a closing/uncertain contact justify it. |
| `press` | Advance against an estimated advantage or with sufficiently aggressive uncertainty doctrine. |
| `guard` | Hold/zone against a credible near threat or preserve force under uncertainty. |
| `recover` | Hold around a believed friendly center after reported withdrawal or estimated heavy loss. |

`chooseGeneralIntent()` reads only private friendly/enemy tracks, post geometry, time, and traits. Force comparison sums every credible enemy track with confidence weighting; one best-scored contact is used only for focal range/motion reasoning. Friendly strength comparison is discounted by aggregate `strengthConfidence`, and low apparent strength with weak strength evidence produces `friendly-strength-uncertain` guard behavior rather than a false recover decision. It has no access to material force arrays, exact casualties, private century brains, or actor capabilities.

`updateGeneralBrain()` issues through public command functions, including a physical `clearHoldZone()` when the new decision no longer supports a previously active zone, and records a frozen observer event explaining state, posture, reason, whether a command was issued, and decision serial.

This is a coherent finite opponent, not yet a plan-searching general. It has no objective model, terrain model, reserve, mission schema, or competing enemy-course hypotheses.

## Physical outbound order and return-report audit

### Outbound authority

`enqueueGeneralCommand()` resolves scope (`blue`, `red`, `all`, or an exact century), gives each affected team its own serial, creates one copied/frozen addressed packet per century, and records an exact private receipt keyed by recipient, command family, and serial. Latest-order and posture/zone maps point to the newest records without destroying `receiptHistory`. It derives the courier target only from that general's private friendly track, converting the believed formation center back to a guide estimate; it never samples the live centurion pose. Commands remain separated into posture and zone families. A newer same-family packet explicitly supersedes an older queued record, while an outbound packet is never rewritten or recalled.

Each friendly track records intended and confirmed posture/zone separately. Intended state changes when an order is enqueued. Confirmed state changes only after a successful physical return and carries a family-specific confirmation serial, so an older late return may update its own receipt history without regressing a newer confirmed payload. This preserves individual-century intent without overwriting team intent or the partner century's state.

The service allows one **staff-accounted lease** per recipient, not one globally known physical runner. At dispatch, `expectedGeneralReturnAt()` combines the private target estimate with runner speed, a return margin/configured floor, and packet expiry. `serviceGeneralCommandQueue()` consults only the brain's `runnerLeases`. The matching serial/family's physical return releases a lease early; otherwise the post releases it at `expectedReturnAt`. A runner is still a material body with its own profile, capabilities, condition, position, velocity, and search state, so it can die remotely or arrive after the lease deadline. `removeCourier()` never edits general leases or receipts: physical overlap with a later replacement is possible precisely because the staff does not know the old runner's remote state.

### Delivery authority

`deliverGeneralCommand()` validates the live material receiver, mute state, centurion survival, and packet expiry. On success it:

- copies the command into only that centurion's private `commandInbox`;
- composes a frozen `returnPacket` through `composeGeneralFieldReport()`;
- logs material delivery.

It does **not** update the general receipt or friendly/enemy tracks. This is why a century can begin plan coordination while its general still reports the courier `outbound`.

### Return authority

`acceptGeneralReturn()` runs only after the material runner reaches the originating general post. It:

- releases a runner lease only when recipient, family, and serial match;
- changes that packet's exact history record to `acknowledged` or returned-undelivered `failed`, records the real `returnedAt`, and clears any prior overdue marker;
- updates confirmed posture/zone only when the returned serial is not older than the existing family confirmation;
- projects a successful friendly pose from reported velocity across courier transit, applies transit-decayed pose confidence, and preserves its `observedAt`;
- updates strength separately through `strengthConfidence`/`strengthObservedAt`, with the same transit decay and its own freshness guard;
- projects a carried enemy contact forward by its reported velocity across courier transit, decays confidence across that interval, preserves the original evidence time, and merges it as `runner-report` evidence;
- increments `reportsReceived` and logs the returned situation report.

The general test confirms `returnedAt > issuedAt`, no reports before physical return, and low pose/strength confidence for an old returned report rather than a false refresh.

If `expectedReturnAt` passes first, `expireGeneralRunnerLeases()` marks only that serial `overdue`, records `overdueAt`/`overdueReason`, and releases local capacity. It does not create `returnedAt`, call the runner dead, or claim delivery. A later physical return may still replace overdue with acknowledged/failed. Only a returned undelivered runner or a packet that expires while still queued is `failed` without success.

When an older successful runner returns, `satisfyQueuedEquivalentCommands()` may remove a newer retry only while it is still queued and only for the same recipient, command payload, and `teamScope`. The queued receipt becomes privately `satisfied` with `satisfiedAt`/`satisfiedBySerial`, not a fabricated return; Gameplay maps that status to acknowledged. An already outbound retry is untouched. Team-scoped posture is categorically excluded because its serial is a proposal/ACK/COMMIT coordination epoch and cannot safely be canceled for one recipient.

Reconciliation compares intended payload, serial-guarded confirmation, and latest receipt. Failed/overdue state retries physically; an acknowledged or satisfied receipt whose confirmed payload disagrees is repaired. `generalZoneSetNeedsReconciliation()` deduplicates materially unchanged set-zone intent while its matching receipt is queued, outbound, or correctly confirmed, but permits retry after failure/overdue. Clear-zone uses the same physical authority. This is retry and evidence repair, not invisible material success.

## API boundary audit

### Gameplay-safe facade

| Member | Boundary judgment |
|---|---|
| `generalSituation(team)` | Pass: detached/frozen private-team projection with separate pose/strength evidence ages, weak-strength `unknown`, latest receipt ordered by `issuedAt` then serial, and private `satisfied` mapped to acknowledged; unknown team rejected. |
| `setGeneralAI(team, enabled)` | Pass: toggles one FSM; no direct order or material mutation. |
| `issuePosture(scope, posture)` | Pass: copied physical packet path; posture validated. |
| `setHoldZone(scope, zone)` / `clearHoldZone(scope)` | Pass: bounded physical packet path. |
| `observerEventsSince(index)` | Pass for notifications; frozen observer events, monotonic cursor, no cognition write-back. |

### Observer/debug facade

| Member | Intended authority |
|---|---|
| `observe()` | Omniscient render/test projection, including both general situations and exact bodies/centuries. |
| `diagnostics()` | Omniscient health and aggregate counters. |
| `inspectActor()` / `rosterSummary()` | Omniscient capability/condition inspection. |
| `debug.knowledge()` / `debug.generalKnowledge()` | Detached copies of private centurion/general brains; general output includes intended/confirmed payloads and serials, complete receipt history, and current runner leases. |
| `debug.percept()` | Fresh frozen sensor DTO for a soldier, centurion, or named general. |
| Debug mutators | Deliberately test-only scenario controls; `setCondition(..., { hp: 0 })` invokes material death for courier-loss counterfactuals; no production cognition calls them. |

The facade itself is frozen and exports no live world collection, body map, brain, or mutable configuration object.

## Playability assessment

### What is now playable

- A player can operate as Blue general from reports rather than exact data cards.
- Team or individual posture intent has visible communication latency and receipt uncertainty.
- Hold zones create spatial intent without teleporting bodies.
- Red can make autonomous, explainable, non-cheating decisions under the same material rules and retry failed intent through those rules.
- Field reports become stale, couriers can be overdue, and contact can be anonymous or lost.
- Pause and 0.25–8× tempo let the player manage communication delays without requiring constant real-time input.
- Debug can explain surprising behavior without changing the simulation.

### What is not yet a complete game loop

- Current victory rewards destruction/remaining strength, not mission accomplishment.
- All three posture families are available immediately; there is no planning commitment, reserve allocation, pursuit boundary, or opportunity cost beyond courier delay.
- Flat terrain makes the dominant spatial problem too uniform.
- The general cannot task reconnaissance or move/secure its command post.
- Enemy glyphs do not yet account for terrain LOS, concealment, dead ground, or multi-hypothesis uncertainty.
- Alerts are useful but there is no crisis object, latest-useful-decision estimate, or auto-pause policy.
- AI aggregates all credible contacts for force comparison but does not maintain multiple enemy-course hypotheses or explicit plan branches.

The appropriate label is therefore **playable systems laboratory**, not historical battle game or complete strategy game.

## Research alignment

### Tactical-emergence research

v30 substantially implements tactical Priority 0:

- general-private friendly/enemy belief models;
- direct versus report source and observation age;
- Gameplay/Debug separation;
- non-cheating general decisions;
- automated boundary tests.

It also implements part of Priority 2 through general contact tracks and an enemy general using the same engine boundary. It does not yet implement Priority 1's objective, time, mission-plan, reserve, crisis, and static-terrain loop. That is now the highest-leverage gap.

### Grand-strategy research

The grand-strategy proposal is a north star, not v30 scope. Its most reusable contracts are:

- truth belongs to the simulation; knowledge belongs to actors;
- immutable reports with provenance and observation/receipt times;
- decisions trace their evidence and doctrine;
- orders/messages move physically;
- continuous simulation uses pause, speed, briefings, and management by exception.

The proposed five-settlement logistics/trade slice should not displace the next tactical slice. It becomes the right campaign prototype after the command/report/objective loop demonstrates sustained player interest.

### Integrated synthesis

`DESIGN_SYNTHESIS_AND_ROADMAP.md` adds no new evidence. It turns both research briefs into one product thesis—legible command under uncertainty—and defines shared belief/report/doctrine/route/commitment/history/decision-trace primitives plus campaign–battle handoff boundaries. Its post-v30 ordering resolves an important ambiguity: traceable-command hardening is P0, Ridge Road is the first new playable P1, and the five-node Road to battle campaign handoff is P2.

## Recommended path: traceable command, then Ridge Road

Before adding scenario breadth, complete the synthesis's narrow **P0 — Traceable command** gate:

- general-purpose immutable `ReportPacket`/`MessagePacket` records;
- source chain plus observed, created, sent, and received times;
- contradiction/supersession history;
- `DecisionTrace` records that bind beliefs, evidence, doctrine, alternatives, chosen act, and emitted orders;
- audits proving every AI command reconstructible from then-available evidence and unchanged by UI/observer polling.

Then build **Ridge Road** as the first new playable P1 vertical slice.

### Scenario

- Two centuries per side.
- A firm road crosses a shallow ridge, drops through a wet gully, and reaches a ford.
- Defender must hold the road exit until a deadline and withdraw most of its force intact.
- Attacker must clear the route before the deadline.
- Each side has incomplete terrain confidence and one limited pre-contact reconnaissance task.

### Player decisions

- main effort and true reserve;
- hold/delay area;
- rally point and pursuit boundary;
- command-post position;
- rest, reconnaissance, or shallow preparation before contact;
- one conditional reserve-release trigger whose predicate reads beliefs/messages, never world truth.

### Implementation order

1. Land the P0 packet, provenance, contradiction, decision-trace, and audit contracts.
2. Add objective/time/withdrawal adjudication and a mission schema with purpose, areas, boundaries, rally, and one conditional branch.
3. Add an actual reserve mission and physical release order.
4. Add static elevation/slope, road, wet-ground, ford, concealment, and LOS/dead-ground fields.
5. Add reconnaissance tasking and terrain/contact reports through the P0 packet contract.
6. Make the existing belief-only contact renderer terrain-aware and express uncertainty areas/last-known motion without revealing exact bodies.
7. Add crisis/decision cues with estimated latest useful action time and extend audits so objectives, triggers, terrain knowledge, and visibility cannot read material truth.

### Acceptance criteria

- Holding, delaying, clearing the route, and withdrawing intact can each decide the battle without annihilation.
- A reserve cannot release on a trigger it has not perceived or received.
- Killing/deceiving messengers materially changes both player and AI decisions.
- Ridge dead ground and road/gully trafficability produce different sensible plans.
- The AI can decline a strong but irrelevant position and pursue the actual objective.
- Gameplay never renders an unseen exact enemy body or private enemy field.
- Same seed, commands, and polling schedule remain deterministic; observer/debug polling remains non-causal.

## Release decision

Ship v30 as the private-command and playability-boundary milestone. Preserve the current audit gates as non-negotiable regression tests. Harden the evidence chain through P0, then begin Ridge Road with objective/mission/reserve contracts before expanding combat content or campaign scale.
