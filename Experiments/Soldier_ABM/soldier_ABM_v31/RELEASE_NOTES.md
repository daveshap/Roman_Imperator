# Soldier ABM v31 release notes

Release date: 2026-07-15

v31 fixes the first battle's two clearest playability failures. Gameplay now renders enemy bodies that the Blue general physically sees without exposing Red internals, and centurions now treat a hold zone as a mission destination below local survival, line integrity, and mutual-support doctrine.

The governing rule is unchanged:

> Doctrine may be shared before contact. Live knowledge and intent must be perceived, communicated, remembered, or inferred by the actor that uses it.

## Highlights

- Added sanitized current enemy silhouettes and remains to Gameplay through `generalSituation('blue').directSight`.
- Preserved remembered/reported contact glyphs outside current sight and prevented duplicate coarse glyphs for a currently visible formation.
- Added an explicit centurion priority hierarchy: emergency withdrawal, immediate threat, formation survival, mutual support, then mission/posture.
- Added `march-to-zone` and `form-line` centurion states.
- Replaced post-hoc zone attraction with HOLD area-destination semantics and interruption/resumption hysteresis.
- Added private line orientation/integrity, exposed-wing scanning, outer/seam/rear threat classification, and full flank refusal.
- Added finite support points and nonrecursive anchor-line help requests.
- Added sender-local peer runner leases so remote courier loss cannot become instant capacity knowledge.
- Added 12 doctrine regressions and hardened direct-sight projection regressions; the suite now contains 53 Node tests.

## Gameplay visibility correction

v30 intentionally filtered exact Red observer records but overcorrected: a physically visible enemy disappeared from Gameplay and was represented only by a coarse formation contact. v31 separates current visual geometry from belief tracks.

`senseGeneral()` now emits a deeply frozen `directSight` frame for each team's finite command-post sensor:

```text
directSight = {
  observedAt,
  bodies:  [{ visualClass, x, z, heading, recognizedMark? }],
  remains: [{ visualClass, x, z, heading }]
}
```

`visualClass` is `ranker`, `standard`, or `runner`. Position is quantized to 0.05 m and heading to 2.5°. Only a living, visibly recognized standard can carry its public mark. Arrays are deterministically sorted.

The projection excludes engine/body ID, century ID, team, profile, capabilities, condition, HP, morale, fatigue, FSM/posture/combat state, and sender/receiver/target identity. Red runners are visually present but excluded before enemy-formation clustering, so they cannot become false formation evidence. Fallen enemy bodies are rendered as sanitized remains.

Gameplay continues to skip exact Red soldiers, centurions, couriers, fallen-body observer records, hit flashes, zones, command post, and internal labels. It draws sanitized silhouettes from `directSight` and uncertain formation glyphs from `contacts[]`. A contact now has `directlyVisible`; the coarse glyph is skipped for the current frame when direct bodies already represent it. Debug remains omniscient.

This is command-post sight, not magical team vision. Bodies outside the general post's finite horizon remain absent unless remembered or reported through the general's tracks.

## Centurion doctrine hierarchy

`updateCenturionBrain()` now evaluates immediate action in fixed order:

1. **Emergency withdrawal** — perceived collapse, morale failure, or physically received ally withdrawal. A stored zone cannot reverse retreat.
2. **Immediate threat** — fresh outer-flank, seam, rear, or close local contact. The officer guards, forms, or applies bounded HOLD counterpressure while facing the perceived threat.
3. **Formation survival** — a broken perceived mutual line or own cohesion below 0.58, unless the officer/ally is in an authorized detachment. The century reforms in `form-line`.
4. **Mutual support** — a finite support/flank request, unless fresh close direct contact requires the receiver's own response. The support point and threat point remain separate.
5. **Mission** — aggressive fix/flank, HOLD transit/ground defense, or defensive bait/cover.

Threat and formation overrides latch for at least 2.8 s. Formation recovery uses a higher 0.78 cohesion threshold and requires a known line to become sound; zone movement waits a further 3 s. This keeps noisy observations from immediately returning the century to waypoint behavior.

The officer owns a `lineHeading`, separate from march direction and local threat facing. Mutual-line measurement settles toward the shared doctrinal frontage, while the locally selected `desiredHeading` can face a contact. This prevents two officers from classifying the same physical line in independently rotated contact frames. The gaze performs a 0.55 s exposed-side scan every 3.2 s when close contact does not dominate. Flank assessment consumes only fresh direct formation tracks and distinguishes `outer-flank`, `seam-penetration`, and `rear-penetration`. Refusal can turn about 81° and, inside 18 m, fully around.

Mutual-line geometry uses only a private ally track dead-reckoned from its observation and stops using it after 6.5 s. It classifies depth/gap as sound within 4.2/3.5 m, strained beyond those tolerances, broken beyond 8.4/7 m, and unknown without usable ally evidence. Authorized `maneuver-flank` and `ambush-strike` detachments are not pulled back by ordinary seam repair. Hold-like guide motion is tethered below soldier dress speed.

## Hold-zone semantics

A HOLD zone is now an area destination rather than a frame-by-frame attraction force.

- A century is considered arrived within `max(1.5 m, radius × 0.60)` of its sector center.
- Outside the area, and only when no higher doctrine priority applies, it enters `march-to-zone` at up to 0.56 m/s.
- Movement toward the zone does not rotate the line away from doctrinal/contact facing.
- Fresh direct contact inside 25 m interrupts transit; credible recent reported contact can halt it inside 19 m.
- HOLD counterpressure uses the 13.5/16 m entry/exit envelope and sufficient cohesion. Outside a zone-relative tactical leash it may pressure only if the direction returns toward the zone.
- A broken line or low cohesion enters `form-line`; the destination remains stored and can resume after recovery hysteresis.
- Without an explicit zone, the mission uses its doctrinal fallback anchor.
- Team-scoped zones still derive separate left/right sectors.

Observer/debug `zonePhase` is one of `none`, `approach`, `interrupted`, `fallback`, `holding-area`, `holding-anchor`, or `tactical-override`. HOLD owns these transit semantics; aggressive and defensive-feint postures retain their existing anchor use.

## Coordination and physical communication

A century in `form-line` with cohesion below 0.45 and fresh direct contact may send a short-lived `anchor-line` support request. The packet carries a seam/support point separately from threat geometry. The receiver moves toward support and faces the threat it sees or was told about. Supporting does not itself generate another help request, preventing recursive echo.

Physical peer runners no longer use a global courier-population query as apparent sender knowledge. A sender that chooses the runner channel records:

```text
centurionRunnerLease = { serial, expectedReturnAt }
```

The deadline is derived from the sender's perceived peer distance, round-trip speed, and margin, capped at 45 s. Only a matching physical return clears it early. Death or removal outside sender knowledge does not. After the local deadline, the next send attempt marks the channel `runner-overdue` and may dispatch a replacement. Voice remains separately available when privately believed in range and off cooldown.

## State, schema, and tuning changes

- `CENTURION_STATE` adds `MARCH_TO_ZONE` (`march-to-zone`) and `FORM_LINE` (`form-line`).
- Centurion brains add `lineHeading`, `lineIntegrityBand`, `doctrinePriority`, `doctrineCommitUntil`, `zonePhase`, `zoneResumeAt`, `helpRequest`, and `centurionRunnerLease`.
- Observer century projections add `lineHeading`, `lineIntegrityBand`, `doctrinePriority`, and `zonePhase`.
- `generalSituation(team)` adds `directSight`; contact entries add `directlyVisible`.
- `generalStatusBand()` reports `march-to-zone` as moving and `form-line` as forming.
- Active v31 constants include `allyLineMaxAge: 6.5`, `lineDepthBreak: 8.4`, `lineGapBreak: 7`, `formationBreakCohesion: 0.58`, `formationRecoverCohesion: 0.78`, `contactHaltRange: 25`, `contactDirectFreshness: 3.2`, `doctrineOverrideMin: 2.8`, `zoneArrivalFraction: 0.60`, `zoneResumeDelay: 3`, `flankScanPeriod: 3.2`, and `flankScanDuration: 0.55`.
- Public facade `version` is `31`; standalone artifacts are named `soldier_ABM_v31.html` and `soldier-abm-v31.bundle.js`.

## Verification

The v31 gate passes:

- 53 deterministic Node tests: 24 engine, eight capability, nine general, 12 doctrine;
- 21 named architecture checks, including `sanitizedDirectSight`, `doctrinePriorityHierarchy`, and `epistemicPeerRunnerLease`;
- nine UI/release checks, including `gameplayDefault`, `enemyProjectionOnly`, `directSightSilhouettes`, and `releaseVersion: 31`;
- a six-seed (`0x3101`–`0x3106`, 12 rankers per century) 120 s battle sweep with 183–247 strikes, 18–19 casualties, zero overlaps/non-finite states, and exercise of `form-line`, `guard-flank`, FIX, and committed FLANK behavior in every seed; the focused paired-warning regression covers `support-ally`.

The sweep is a stability/behavior exercise, not evidence of historical casualty calibration.

## Compatibility

- The three public postures and general command APIs are unchanged.
- General and peer messages still travel through finite voice, standards, or physical runners.
- v30's enemy-general FSM, receipt history, command-post leases, returned reports, capability model, combat model, and Gameplay/Debug split are inherited.
- `V30_PLAYABILITY_AUDIT.md` is intentionally preserved as historical evidence; the current review is `V31_DOCTRINE_AND_VISIBILITY_AUDIT.md`.

## Known limits

- Direct sight is a radial, open-field sensor at a fixed command post. It is not aggregate friendly vision and has no terrain LOS, occlusion, concealment, gaze/FOV limit, weather, or mistaken identity.
- Direct-sight geometry is finely quantized but not range-noised; belief tracks remain scalar-confidence point estimates rather than covariance regions.
- A zone is an area destination, not a fortification, patrol polygon, hard containment boundary, or “hold at all costs” instruction. Its arrival rule and tactical leash are terrain-agnostic.
- The line model coordinates one peer century. It does not yet represent a larger multi-century frontage, reserve topology, terrain-constrained frontage, echelons, or passage of lines.
- `perceivedOwn` still comes from the current own-formation visual count; a partial scan can still resemble casualties.
- A late peer/general runner may coexist with a replacement after the sender/post's local overdue deadline. Capture, interrogation, packet corruption, and cancellation are not modeled.
- General AI still chooses only the three postures and optional zones. It has no terrain hypotheses, objectives/time pressure, reserve policy, deception history, or opponent course-of-action model.
- Combat/stability behavior is not calibrated to historical casualty rates.

See `V31_DOCTRINE_AND_VISIBILITY_AUDIT.md` for the requirement/evidence matrix and residual-risk assessment.
