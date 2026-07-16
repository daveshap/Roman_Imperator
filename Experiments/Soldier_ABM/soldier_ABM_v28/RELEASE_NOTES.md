# Soldier ABM v28 release notes

v28 is the first head-to-head formation release: two independently commanded centuries per team, four private centurion brains, and no shared tactical mind.

## What changed

- Added four-century battles with independently owned doctrine, perceptions, tracks, inboxes, plans, FSM state, and soldiers.
- Added physical general-to-centurion couriers for broad `AGGRESSIVE`, `HOLD`, and `DEFENSIVE_FEINT` postures, plus optional hold-ground zones.
- Added centurion voice, standards, semantic reports, delayed runners, proposal/ACK/COMMIT team plans, bounded ABORT reconciliation, and message-age/epoch rejection.
- Added perceived enemy formation tracks, seam and flank threat assessment, friendly-line support, fix-and-flank coordination, zone defense, counterattacks, feints, draws, and ambushes.
- Added simultaneous melee resolution, routed-agent restrictions, projected edge-safe collision solving, terminal adjudication, and monotonic observer diagnostics.
- Replaced the former monolithic prototype with ES modules, a deterministic engine facade, a standalone build, architecture audits, behavioral tests, and a comprehensive README.

## Release gate

The exact release candidate passes all 24 deterministic behavior tests plus the architecture, standalone-build, and UI audits. The audited engine source SHA-256 is:

`2da0bfd32f60274ceccf285469f2a7e02bc1ac396405b41f2719f1653ad2015d`

The no-telepathy audit found no release blocker. Officer decisions consume frozen percept DTOs and private copied beliefs; runtime intent crosses centuries only through finite public signals or physical messages.

## Headless soak results

Every one-second sample in all four release soaks had zero persistent overlaps and zero non-finite values. Communication, combat, and soldier/centurion/runner casualty counters stayed monotonic.

| Scenario | Outcome | Commands dispatched / delivered | Runner / voice deliveries | Strikes / hits | Casualties S / C / R |
|---|---|---:|---:|---:|---:|
| Mutual hold, 12 soldiers/century, 120 s | Expected non-terminal standoff | 62 / 62 | 0 / 62 | 0 / 0 | 0 / 0 / 0 |
| Red feint vs. Blue aggressive, 12 soldiers/century | Red victory at 137.667 s | 135 / 127 | 1 / 126 | 475 / 135 | 44 / 3 / 0 |
| Default head-to-head, 12 soldiers/century | Red victory at 133.767 s | 112 / 107 | 1 / 106 | 312 / 96 | 31 / 2 / 0 |
| Default head-to-head, 36 soldiers/century | Red time victory at 360 s | 239 / 221 | 8 / 213 | 1057 / 309 | 109 / 1 / 0 |

The default aggressive doctrine produced `FIXED` then `FLANK` at 76.300/76.967 s at scale 12 and 75.467/75.967 s at scale 36. The feint scenario produced `DRAW` then `AMBUSH` at 65.133/65.600 s.

## Known tuning frontier

The large 36-per-century battle can reach the time limit, and late guard/hold/counter transitions can churn when threat scores sit near their hysteresis thresholds. That is a balance/FSM tuning issue rather than an information-boundary failure. Terrain, occlusion, acoustic masking, missiles, cavalry, formation rank closure, and historical combat calibration remain future work.
