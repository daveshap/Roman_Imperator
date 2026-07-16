import test from 'node:test';
import assert from 'node:assert/strict';

import {
  APTITUDE_BOUNDS, CAPABILITY_BOUNDS, DEFAULT_UNIT_PROFILE,
  normalizeUnitProfileLayer, prepareUnitProfileMap, mergeUnitProfileLayers,
  resolveUnitProfile, createActorProfile, deriveCapabilities, capabilityRatings,
  resolveModifierStack, orderReactionDelay, combatHitChance, combatDamage
} from '../src/capabilities.js';
import { createBattlefieldSimulation } from '../src/engine.js';

const recursivelyFrozen = value => {
  if (!value || typeof value !== 'object') return true;
  return Object.isFrozen(value) && Object.values(value).every(recursivelyFrozen);
};

function actor(seed = 1, layer = {}, kind = 'soldier') {
  const unitProfile = mergeUnitProfileLayers(normalizeUnitProfileLayer(layer));
  return createActorProfile({
    seed,
    actorKey: 17,
    profileId: `test-${kind}`,
    kind,
    unitProfile
  });
}

test('modifier stacks are stable, bounded, time-aware, and never mutate inputs', () => {
  const effects = [
    { id: 'z-multiply', stat: 'attack', mode: 'multiply', value: 0.5,
      startsAt: -Infinity, expiresAt: Infinity },
    { id: 'b-add', stat: 'attack', mode: 'add', value: -0.1,
      startsAt: -Infinity, expiresAt: Infinity },
    { id: 'a-add', stat: 'attack', mode: 'add', value: 0.2,
      startsAt: -Infinity, expiresAt: Infinity },
    { id: 'm-multiply', stat: 'attack', mode: 'multiply', value: 1.1,
      startsAt: -Infinity, expiresAt: Infinity }
  ];
  const before = structuredClone(effects);
  const bounds = { min: 0, max: 2 };
  const forward = resolveModifierStack(1, effects, 'attack', bounds, 0);
  const reverse = resolveModifierStack(1, effects.slice().reverse(), 'attack', bounds, 0);
  assert.ok(Math.abs(forward - 0.605) < 1e-12);
  assert.equal(reverse, forward);
  assert.deepEqual(effects, before);

  const expired = [{ id: 'expired', stat: 'attack', mode: 'multiply', value: 1.5,
    startsAt: 0, expiresAt: 1 }];
  assert.equal(resolveModifierStack(1, expired, 'attack', bounds, 2), 1);
  assert.equal(resolveModifierStack(1, [
    { id: 'huge', stat: 'attack', mode: 'multiply', value: 100,
      startsAt: -Infinity, expiresAt: Infinity }
  ], 'attack', { min: 0.5, max: 1.5 }), 1.5);
  const overflowing = Array.from({ length: 2000 }, (_, index) => ({
    id: `overflow-${String(index).padStart(4, '0')}`,
    stat: 'attack', mode: 'multiply', value: 1.5,
    startsAt: -Infinity, expiresAt: Infinity
  }));
  const underflowing = overflowing.map(effect => ({ ...effect, value: 0.5 }));
  assert.equal(resolveModifierStack(1, overflowing, 'attack', bounds), 2);
  assert.equal(resolveModifierStack(1, underflowing, 'attack', bounds), 0);

  assert.throws(() => normalizeUnitProfileLayer({ modifiers: [
    { id: 'same', stat: 'attack', mode: 'add', value: 0.1 },
    { id: 'same', stat: 'defense', mode: 'add', value: 0.1 }
  ] }), /duplicate modifier id/);
  assert.throws(() => normalizeUnitProfileLayer({ modifiers: [
    { id: 'bad', stat: 'attack', mode: 'add', value: Infinity }
  ] }), /finite/);
});

test('profile normalization clamps development scalars and detaches caller input', () => {
  const source = {
    training: { weapons: 99, discipline: -5, formation: NaN },
    experience: { battle: 9 },
    equipment: {
      weaponClass: 'test sword', armorClass: 'test armor', weaponReach: 7,
      penetration: 2, armor: -1
    }
  };
  const map = prepareUnitProfileMap({ 'blue-1': source });
  source.training.weapons = 0.1;
  source.equipment.weaponClass = 'mutated';
  const resolved = resolveUnitProfile(map, 'blue', 'blue-1');
  assert.equal(resolved.training.weapons, 1.35);
  assert.equal(resolved.training.discipline, 0.70);
  assert.equal(resolved.training.formation, 1);
  assert.equal(resolved.experience.battle, 1.35);
  assert.equal(resolved.equipment.weaponReach, 1.60);
  assert.equal(resolved.equipment.penetration, 0.60);
  assert.equal(resolved.equipment.armor, 0.60);
  assert.equal(resolved.equipment.weaponClass, 'test sword');
  assert.ok(recursivelyFrozen(map));
  assert.ok(recursivelyFrozen(resolved));

  const hostileFrozenLayer = Object.freeze({
    training: Object.freeze({ weapons: 99 }),
    equipment: Object.freeze({ armor: -4 })
  });
  const safelyMerged = mergeUnitProfileLayers(hostileFrozenLayer);
  assert.equal(safelyMerged.training.weapons, 1.35);
  assert.equal(safelyMerged.equipment.armor, 0.60);

  const prototypeKeyMap = prepareUnitProfileMap(JSON.parse(
    '{"__proto__":{"training":{"weapons":1.2}}}'
  ));
  assert.equal(Object.getPrototypeOf(prototypeKeyMap), null);
  assert.equal(Object.prototype.hasOwnProperty.call(prototypeKeyMap, '__proto__'), true);
});

test('keyed aptitudes and micro capabilities are reproducible, bounded, and varied', () => {
  const simA = createBattlefieldSimulation({ seed: 0x2901, perCentury: 12 });
  const simB = createBattlefieldSimulation({ seed: 0x2901, perCentury: 12 });
  const snapshot = simA.observe();
  const inspections = snapshot.soldiers.map(soldier => simA.inspectActor(soldier.id));
  for (const inspection of inspections) {
    for (const value of Object.values(inspection.profile.aptitudes)) {
      assert.ok(value >= APTITUDE_BOUNDS.min && value <= APTITUDE_BOUNDS.max);
    }
    assert.ok(inspection.capabilities.morale.routeThreshold <
      inspection.capabilities.morale.rallyThreshold);
    assert.ok(recursivelyFrozen(inspection));
    assert.deepEqual(inspection, simB.inspectActor(inspection.id));
  }
  assert.ok(new Set(inspections.map(item => item.capabilities.combat.reach)).size > 8);
  assert.ok(new Set(inspections.map(item => item.capabilities.combat.damage)).size > 8);

  // Default laboratory rosters mirror opposing slots, preventing accidental
  // aggregate quality bias while retaining unique actor-owned objects.
  assert.deepEqual(simA.inspectActor('blue-1-s1').profile.aptitudes,
    simA.inspectActor('red-1-s1').profile.aptitudes);
  assert.notDeepEqual(simA.inspectActor('blue-1-s1').profile.aptitudes,
    simA.inspectActor('blue-1-s2').profile.aptitudes);
  assert.notDeepEqual(simA.inspectActor('centurion-blue-1').profile.aptitudes,
    simA.inspectActor('centurion-blue-2').profile.aptitudes);
  assert.notDeepEqual(simA.inspectActor('blue-1-s1').profile.aptitudes,
    createBattlefieldSimulation({ seed: 0x2902, perCentury: 12 })
      .inspectActor('blue-1-s1').profile.aptitudes);
});

test('one-century development changes only that deployment layer, never aptitudes or peers', () => {
  const sourceLayer = {
    training: {
      weapons: 1.28, defense: 1.18, formation: 1.24,
      discipline: 1.20, conditioning: 1.12
    },
    equipment: { armor: 1.25, weaponDamage: 1.12, weaponClass: 'gladius-veteran' },
    modifiers: [{ id: 'camp-instructor', stat: 'orderResponse', mode: 'multiply', value: 1.05 }]
  };
  const baseline = createBattlefieldSimulation({ seed: 0x2903, perCentury: 12 });
  const trained = createBattlefieldSimulation({
    seed: 0x2903,
    perCentury: 12,
    unitProfiles: { 'blue-1': sourceLayer }
  });
  sourceLayer.training.weapons = 0.7;
  sourceLayer.equipment.armor = 0.6;

  const baseB1 = baseline.inspectActor('blue-1-s1');
  const trainedB1 = trained.inspectActor('blue-1-s1');
  assert.deepEqual(trainedB1.profile.aptitudes, baseB1.profile.aptitudes);
  assert.ok(trainedB1.capabilities.combat.attack > baseB1.capabilities.combat.attack);
  assert.ok(trainedB1.capabilities.body.armor > baseB1.capabilities.body.armor);
  assert.ok(trainedB1.capabilities.formation.orderResponse >
    baseB1.capabilities.formation.orderResponse);
  assert.equal(trainedB1.profile.training.weapons, 1.28);
  assert.equal(trainedB1.profile.equipment.armor, 1.25);

  for (const actorId of ['blue-2-s1', 'red-1-s1', 'red-2-s1',
    'centurion-blue-2', 'centurion-red-1', 'centurion-red-2']) {
    assert.deepEqual(trained.inspectActor(actorId).profile,
      baseline.inspectActor(actorId).profile);
    assert.deepEqual(trained.inspectActor(actorId).capabilities,
      baseline.inspectActor(actorId).capabilities);
  }
});

test('exact actor development overrides its century without leaking to peers', () => {
  const baseline = createBattlefieldSimulation({ seed: 0x2909, perCentury: 12 });
  const specialized = createBattlefieldSimulation({
    seed: 0x2909,
    perCentury: 12,
    unitProfiles: {
      'blue-1': { training: { formation: 1.08 } },
      'centurion-blue-1': {
        training: { command: 1.30, tactics: 1.22 },
        experience: { command: 1.18 }
      },
      'blue-1-s1': { training: { weapons: 1.25 } }
    }
  });
  const officer = specialized.inspectActor('centurion-blue-1');
  const ranker = specialized.inspectActor('blue-1-s1');
  assert.equal(officer.profile.training.formation, 1.08);
  assert.equal(officer.profile.training.command, 1.30);
  assert.equal(ranker.profile.training.formation, 1.08);
  assert.equal(ranker.profile.training.weapons, 1.25);
  assert.equal(ranker.profile.training.command, 1);
  assert.ok(officer.capabilities.command.quality >
    baseline.inspectActor('centurion-blue-1').capabilities.command.quality);
  assert.ok(ranker.capabilities.combat.attack >
    baseline.inspectActor('blue-1-s1').capabilities.combat.attack);
  assert.deepEqual(specialized.inspectActor('blue-1-s2').profile.aptitudes,
    baseline.inspectActor('blue-1-s2').profile.aptitudes);
  assert.equal(specialized.inspectActor('blue-1-s2').profile.training.weapons, 1);
  assert.deepEqual(specialized.inspectActor('blue-2-s1'),
    baseline.inspectActor('blue-2-s1'));

  const resetLayer = { 'red-2-s3': { training: { defense: 1.19 } } };
  const resetSim = createBattlefieldSimulation({ seed: 0x2909, perCentury: 12 });
  resetSim.reset({ unitProfiles: resetLayer });
  resetLayer['red-2-s3'].training.defense = 0.70;
  assert.equal(resetSim.inspectActor('red-2-s3').profile.training.defense, 1.19);
});

test('training axes stay independent and class labels have no causal branch', () => {
  const base = deriveCapabilities(actor(0x2904));
  const weapons = deriveCapabilities(actor(0x2904, { training: { weapons: 1.30 } }));
  const drill = deriveCapabilities(actor(0x2904, { training: { formation: 1.30 } }));
  const discipline = deriveCapabilities(actor(0x2904, { training: { discipline: 1.30 } }));
  const armor = deriveCapabilities(actor(0x2904, { equipment: { armor: 1.30 } }));

  assert.ok(weapons.combat.attack > base.combat.attack);
  assert.ok(weapons.combat.damage > base.combat.damage);
  assert.equal(weapons.formation.quality, base.formation.quality);
  assert.equal(weapons.body.armor, base.body.armor);

  assert.ok(drill.formation.quality > base.formation.quality);
  assert.ok(drill.formation.orderResponse > base.formation.orderResponse);
  assert.equal(drill.combat.damage, base.combat.damage);
  assert.equal(drill.body.armor, base.body.armor);

  assert.ok(discipline.morale.stability > base.morale.stability);
  assert.ok(discipline.morale.routeThreshold < base.morale.routeThreshold);
  assert.equal(discipline.combat.damage, base.combat.damage);
  assert.equal(armor.body.armor, 1.30);
  assert.equal(armor.combat.attack, base.combat.attack);

  const classA = deriveCapabilities(actor(0x2904, {
    equipment: { weaponClass: 'class-a', armorClass: 'class-a', shieldClass: 'class-a' }
  }));
  const classB = deriveCapabilities(actor(0x2904, {
    equipment: { weaponClass: 'class-b', armorClass: 'class-b', shieldClass: 'class-b' }
  }));
  assert.deepEqual(capabilityRatings(classA), capabilityRatings(classB));
  assert.deepEqual({ ...classA, equipment: null }, { ...classB, equipment: null });
});

test('combat, order, armor, and centurion command mechanics respond monotonically', () => {
  const baseProfile = actor(0x2905);
  const attacker = deriveCapabilities(baseProfile);
  const trainedAttacker = deriveCapabilities(actor(0x2905, {
    training: { weapons: 1.30 }, equipment: { weaponDamage: 1.20 }
  }));
  const defender = deriveCapabilities(actor(0x2906));
  const trainedDefender = deriveCapabilities(actor(0x2906, {
    training: { defense: 1.30 }, equipment: { armor: 1.30 }
  }));
  const chance = input => combatHitChance({
    baseChance: 0.46, flankBonus: 0.26, flank: false, shieldFront: true,
    attacker: input.attacker, target: input.target, fatigue: 0, targetKind: 'soldier'
  });
  assert.ok(chance({ attacker: trainedAttacker, target: defender }) >
    chance({ attacker, target: defender }));
  assert.ok(chance({ attacker, target: trainedDefender }) <
    chance({ attacker, target: defender }));
  assert.ok(combatDamage({ directionalBase: 0.58, attacker: trainedAttacker, target: defender }) >
    combatDamage({ directionalBase: 0.58, attacker, target: defender }));
  assert.ok(combatDamage({ directionalBase: 0.58, attacker, target: trainedDefender }) <
    combatDamage({ directionalBase: 0.58, attacker, target: defender }));
  const penetratingAttacker = deriveCapabilities(actor(0x2905, {
    equipment: { penetration: 0.60 }
  }));
  assert.ok(combatDamage({ directionalBase: 0.58, attacker: penetratingAttacker,
    target: trainedDefender }) > combatDamage({ directionalBase: 0.58,
    attacker, target: trainedDefender }));
  const poorlyArmored = deriveCapabilities(actor(0x2906, { equipment: { armor: 0.70 } }));
  assert.equal(combatDamage({ directionalBase: 0.58, attacker: penetratingAttacker,
    target: poorlyArmored }), combatDamage({ directionalBase: 0.58,
    attacker, target: poorlyArmored }), 'penetration must not improve sub-baseline armor');

  const drilled = deriveCapabilities(actor(0x2905, { training: { formation: 1.30 } }));
  assert.ok(orderReactionDelay(0.24, drilled, 1) < orderReactionDelay(0.24, attacker, 1));

  const ordinaryOfficer = deriveCapabilities(actor(0x2907, {}, 'centurion'));
  const trainedOfficer = deriveCapabilities(actor(0x2907, {
    training: { command: 1.30, tactics: 1.30, leadership: 1.25, communication: 1.25 },
    experience: { command: 1.25 }
  }, 'centurion'));
  assert.ok(trainedOfficer.command.quality > ordinaryOfficer.command.quality);
  assert.ok(trainedOfficer.command.judgment > ordinaryOfficer.command.judgment);
  assert.ok(trainedOfficer.command.orderCadence < ordinaryOfficer.command.orderCadence);
  assert.ok(trainedOfficer.command.orderClarity > ordinaryOfficer.command.orderClarity);

  const maximalOfficer = deriveCapabilities(actor(0x2907, {
    training: Object.fromEntries(Object.keys(DEFAULT_UNIT_PROFILE.training)
      .map(key => [key, 1.35])),
    experience: { battle: 1.35, command: 1.35 }
  }, 'centurion'));
  assert.ok(maximalOfficer.command.quality <= CAPABILITY_BOUNDS.command.max);
  assert.ok(maximalOfficer.command.leadership <= CAPABILITY_BOUNDS.leadership.max);
  assert.ok(maximalOfficer.command.communication <= CAPABILITY_BOUNDS.communication.max);
});

test('battle capability ownership is unique, frozen, private, and deterministic under polling', () => {
  const profiles = {
    blue: { training: { formation: 1.08, discipline: 1.06 } },
    red: { equipment: { armor: 1.05 } }
  };
  const a = createBattlefieldSimulation({ seed: 0x2908, perCentury: 12, unitProfiles: profiles });
  const b = createBattlefieldSimulation({ seed: 0x2908, perCentury: 12, unitProfiles: profiles });
  const audit = a.debug.architectureAudit();
  assert.equal(audit.actorCount, 52);
  assert.equal(audit.uniqueProfiles, 52);
  assert.equal(audit.frozenProfiles, 52);
  assert.equal(audit.uniqueCapabilities, 52);
  assert.equal(audit.frozenCapabilities, 52);
  assert.equal(audit.uniqueConditions, 52);
  assert.equal(audit.sharedMutableStatObjects, 0);
  assert.equal(audit.uniqueConditionEffects, 52);
  assert.equal(audit.sharedMutableEffectArrays, 0);
  assert.equal(audit.validMoraleThresholds, true);
  assert.equal(audit.sampledPerceptsContainEngineIds, false);
  assert.equal(audit.sampledPerceptsContainPrivateFields, false);

  const withRunners = createBattlefieldSimulation({ seed: 0x2910, perCentury: 12 });
  withRunners.issuePosture('blue', 'hold');
  withRunners.step(1 / 30);
  const runnerAudit = withRunners.debug.architectureAudit();
  assert.equal(runnerAudit.activePhysicalRunners, 2);
  assert.equal(runnerAudit.actorCount, 54);
  assert.equal(runnerAudit.uniqueProfiles, 54);
  assert.equal(runnerAudit.uniqueCapabilities, 54);
  assert.equal(runnerAudit.uniqueConditions, 54);
  assert.equal(runnerAudit.uniqueConditionEffects, 54);
  assert.equal(runnerAudit.sharedMutableStatObjects, 0);
  assert.equal(runnerAudit.sharedMutableEffectArrays, 0);

  const perceptText = JSON.stringify(a.debug.percept('blue-1-s1'));
  for (const forbidden of ['profileId', 'capabilities', 'maxHp', 'armor', 'damage']) {
    assert.equal(perceptText.includes(forbidden), false);
  }

  for (let index = 0; index < 180; index++) {
    a.step(1 / 30);
    b.observe();
    b.diagnostics();
    b.inspectActor('blue-1-s1');
    b.rosterSummary();
    b.step(1 / 30);
  }
  assert.deepEqual(a.observe(), b.observe());
  assert.deepEqual(a.diagnostics(), b.diagnostics());
  assert.deepEqual(a.inspectActor('blue-1-s1'), b.inspectActor('blue-1-s1'));

  const inspection = a.inspectActor('blue-1-s1');
  assert.throws(() => { inspection.capabilities.combat.attack = 99; }, TypeError);
  assert.equal(DEFAULT_UNIT_PROFILE.training.weapons, 1);
  assert.equal(CAPABILITY_BOUNDS.attack.max, 1.50);
});
