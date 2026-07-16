# Soldier ABM v29 release notes

v29 adds bounded individual capability, development, equipment, and condition layers to the complete v28 two-century-per-team battle. It deliberately does not introduce a causal unit-wide “skill” value: every soldier, centurion, and physical runner owns a unique frozen profile/capability tree plus a unique mutable local condition.

## What changed

- Added correlated natural aptitudes for stature, strength, agility, endurance, perception, cognition, and nerve. Default opposing slots are numerically mirrored for fair laboratory comparisons while object ownership remains unique.
- Added separate training axes for weapons, defense, formation, discipline, conditioning, awareness, command, tactics, leadership, and communication; separate battle/command experience; causal equipment scalars; and non-causal equipment class labels.
- Added stable additive/multiplicative modifiers with IDs, time windows, duplicate rejection, input/final clamps, and overflow-safe log-space resolution.
- Added default → team → century → exact-actor deployment precedence. A named centurion or soldier can now receive a promotion, instructor, injury modifier, or issued item without changing peers.
- Replaced fixed actor performance with bounded capability effects on HP, armor, shield, motion, fatigue, perception, memory, formation correction, order comprehension, relays, melee timing, hit chance, defense, reach, damage, morale shock/recovery, route/rally thresholds, command clarity, officer track confidence, and report cadence.
- Kept the no-telepathy boundary: decisions can read only the actor’s own frozen capabilities plus perceived/communicated evidence. Opponent defense, armor, shield, and damage capability are read only inside sealed material strike resolution.
- Added `inspectActor()` and `rosterSummary()`, observer-only capability summaries, base-drill/base-weapon UI labels, and caller-supplied `unitProfiles` on construction/reset.
- Added a pure `src/capabilities.js` module, eight focused capability/profile tests, expanded runtime ownership audits, and comprehensive schema/formula/function documentation.

## Hardening completed during audit

- Frozen caller objects no longer bypass profile normalization.
- Extreme valid modifier products no longer overflow back to the neutral fallback.
- Penetration suppresses only protection above neutral armor and never improves already-poor armor.
- Newly issued orders cannot affect a soldier before its own comprehension time.
- Active runners and their nested mutable effects arrays are included in identity/ownership audits.
- An explicit hold-zone radius of zero now clamps to 4 m; only an omitted radius receives the 14 m default.
- v28 distribution files were removed from the v29 tree.

## Release gate

The final tree passes:

- 32/32 deterministic Node tests: 24 inherited battle/protocol/stability tests plus 8 capability/profile tests.
- 15/15 static/runtime architecture checks.
- Standalone rebuild and browser UI/self-containment audit.
- Complete README function-catalog coverage: 22 capability declarations, 106 engine declarations, and eight named engine arrow helpers.

The audit found no remaining engine, mathematical, or no-telepathy release blocker. Percepts contain neither engine body identities nor private profile/capability/condition fields; opponent capabilities are inaccessible outside material combat resolution; observer polling remains non-causal.

## Independent headless soak

Tactical regression:

| Scenario | Required tactical timing | Result |
|---|---:|---|
| Default, 12 soldiers/century, seed `0x2c12` | `FIX` 76.300 s; `FLANK` 76.967 s | Red victory 124.167 s; B2/R19 alive |
| Default, 36 soldiers/century, seed `0x3636` | `FIX` 75.467 s; `FLANK` 75.967 s | Red time victory 360 s; B15/R17 alive |
| Blue aggressive vs Red feint, 12/century, seed `0x2a10` | `DRAW` 65.133 s; `AMBUSH` 65.600 s | Blue victory 141.167 s; B5/R2 alive |

The feint seed’s winner differs from v28 because individual combat variance changed the exchange, while the communication/tactical timing remained exact.

A deliberately moderate trained profile was run in six mirrored 12-per-century matches across three seeds, swapping trained sides. The trained force won 4/6, averaged 7.0 survivors versus 4.5, sustained 102 casualties versus 117, and obtained a 1.147× casualty-exchange advantage. Its mean observer-only overall rating rose 5.07%. One seed defeated the trained force in both side swaps, so development mattered without overriding battle dynamics.

Across nine tactical/training matches and 1,464 one-second diagnostic samples there were zero persistent overlaps, zero non-finite bodies, zero cumulative-counter regressions, and zero duplicate terminal events. Every terminal result remained stable through 60 extra ticks.

## Known frontier

- The battle accepts deployment layers but does not yet own a persistent campaign roster, attendance/training calendar, facilities, instructor/champion lifecycle, aptitude caps, or post-battle XP ledger. Natural aptitudes remain seed/formation-slot generated rather than attached to a serialized campaign identity.
- Battle experience is intentionally broad but bounded; it is the closest remaining approximation to generalized skill.
- Profile modifiers resolve at deployment time zero. Mutable `condition.effects` is reserved for future wounds/buffs and does not yet trigger live capability recalculation.
- Relayed orders preserve the officer’s original clarity/presence; future work should degrade fidelity by hop and incorporate the relayer’s own communication capability.
- Command skill affects track confidence, orders, reports, and tactical judgment, while the line-correction gains themselves remain fixed doctrine constants.
- Defense is facing-weighted competence, not yet a pre-sealed parry/dodge intention. Target fatigue and routing do not yet alter defense.
- One trained matchup and the full-scale default replay reached the 360 s limit, retaining the known late-stalemate tuning frontier.

## Integrity

Final SHA-256 values:

| Artifact | SHA-256 |
|---|---|
| `src/engine.js` | `14dbc88d9a08783a6321b81ff2270c66b04f468db22bb07117223513a4ed2987` |
| `src/capabilities.js` | `9acba0bea5286633dc34525deeeb7e0700d887af27cbaa072fd05b710a252f9c` |
| `README.md` | `f53a3e0db78cf177dc7b65cce95754172d2510eac360e9c80cffea865691371d` |
| `test/engine.test.mjs` | `56be976916f193646cf40a69750359098e0825f41aa61f18235365bcec8cb71d` |
| `test/capabilities.test.mjs` | `d71e962ac458850d7ebb4242e2ad20e10e07d9d42af5c36f3304549ae8c6db82` |
| `dist/soldier_ABM_v29.html` | `22cc05c48354b5a7e809aaf8323aa3601c3ea44f11bb6858ab1d7f3fda950b49` |
