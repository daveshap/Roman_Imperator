# v29 capability and variance audit

## Verdict

The v29 release candidate passed independent architecture, formula, documentation, tactical-regression, training-effect, determinism, and stability review. No release-blocking engine or no-telepathy defect remains.

## Invariants verified

- Every initially deployed soldier and centurion owns a distinct deeply frozen profile, capability tree, and distinct mutable condition/effects record.
- Active physical runners enter the same identity/ownership audit.
- Profiles resolve in default → team → century → exact-actor order; caller objects are detached, all external scalars are clamped, frozen input cannot bypass validation, and duplicate modifier IDs are rejected.
- The 20 modifier targets have explicit final bounds. Extreme positive/negative valid stacks reach the correct bound without overflow, underflow, mutation, or tick-by-tick compounding.
- Natural aptitudes are reproducible, bounded within `0.90–1.10`, varied across formation slots, and mirrored across corresponding default opposing slots.
- Exact-actor development changes only that actor; century development changes only that century’s deployment lineage; natural aptitudes do not change when development changes.
- Weapon, formation, discipline, armor, and class-label counterfactuals remain causally independent where specified.
- Route threshold is always below rally threshold with at least 0.12 hysteresis.
- Percepts are deeply frozen and contain no engine ID, profile, capability, condition, HP, morale, fatigue, armor, attack, defense, damage, or reach field.
- Soldier/centurion decisions read only their own capabilities. Target private capabilities appear only in the material strike resolver after intentions are sealed.
- Same seed and inputs remain exactly deterministic despite asymmetric observer, diagnostics, inspection, and roster-summary polling.

## Capability response checks

- Weapon development monotonically improves attack/damage without changing armor or formation quality.
- Formation drill improves formation quality and order response without changing damage or armor.
- Discipline improves morale stability and lowers the route threshold without changing damage.
- Armor changes material protection without changing attack.
- A weapon/armor/shield class-label-only change has no mechanical effect.
- Trained attack raises hit probability; trained defense lowers an opponent’s hit probability.
- Weapon damage raises landed damage; armor lowers it; penetration helps only against armor above neutral.
- Formation drill reduces order-reaction delay.
- Centurion command/tactics/leadership/communication development improves command quality, judgment, clarity, and order cadence within hard bounds.

## Behavioral calibration

The training comparison used:

```text
weapons/defense 1.12
formation/discipline/command 1.10
conditioning/tactics/leadership 1.08
awareness/communication 1.06
battle/command experience 1.05
```

Across 78 actors per tier, trained mean capability lifts were:

| Rating | Mean lift |
|---|---:|
| Overall | 5.07% |
| Attack | 6.31% |
| Defense | 5.65% |
| Morale | 4.72% |
| Formation | 6.76% |
| Order response | 5.66% |
| Damage | 6.42% |
| Speed | 2.56% |
| Perception | 2.08% |
| Command | 5.29% |
| Leadership | 4.21% |
| Reach | 0.00% |

Reach correctly did not change because the trained layer supplied no weapon-reach/equipment improvement.

Six side-swapped battles produced four trained wins and two regular wins. Trained sides averaged 7.0 survivors to 4.5 and a 1.147× casualty-exchange advantage. This is a visible reward for development, not an automatic victory flag.

## Tactical and numerical stability

- Default fix/flank and defensive-feint draw/ambush timings remained exact in the independent regression seeds.
- Nine headless matches produced 1,464 one-second samples with zero persistent overlaps, non-finite bodies, counter regressions, or duplicate results.
- Every terminal result remained immutable after 60 extra ticks.
- The full-scale 36-per-century replay remained collision-stable but reached the time limit, confirming the known late-stalemate balance frontier.

## Explicitly deferred

- Persistent campaign actor IDs and serialized natural aptitudes.
- Training facilities, attendance, time/cost curves, instructors/champions, XP awards, and post-battle profile writes.
- Runtime wound/buff recalculation from `condition.effects`.
- Relay-hop fidelity loss and relayer-skill effects.
- Command-scaled line-correction gains.
- Explicit pre-sealed dodge/parry intentions and fatigue/routing defense penalties.
- Historical equipment catalog and empirical casualty calibration.
