import test from 'node:test';
import assert from 'node:assert/strict';

import { createBattlefieldSimulation } from '../src/engine.js';
import {
  TEAM, POSTURE, CENTURION_STATE, MESSAGE_KIND, TUNING
} from '../src/constants.js';
import { angleDifference, headingTo } from '../src/math.js';

const DT = TUNING.fixedDt;

function century(sim, id) {
  const value = sim.observe().centuries.find(item => item.id === id);
  assert.ok(value, `missing century ${id}`);
  return value;
}

function officer(sim, id) {
  const value = sim.observe().centurions.find(item => item.centuryId === id);
  assert.ok(value, `missing officer ${id}`);
  return value;
}

function runFor(sim, seconds) {
  const steps = Math.ceil(seconds / DT);
  for (let index = 0; index < steps; index++) sim.step(DT);
  return sim.observe();
}

function runUntil(sim, predicate, maxSeconds, label) {
  const steps = Math.ceil(maxSeconds / DT);
  for (let index = 0; index < steps; index++) {
    sim.step(DT);
    if (predicate()) return sim.observe();
  }
  assert.fail(`${label} was not reached within ${maxSeconds}s`);
}

function hideRed(sim) {
  sim.debug.teleportCentury('red-1', -50, 68);
  sim.debug.teleportCentury('red-2', 50, 68);
}

function assertStable(sim, label) {
  const diagnostics = sim.diagnostics();
  assert.equal(diagnostics.nonFinite, 0, `${label}: non-finite physical state`);
  assert.equal(diagnostics.overlaps, 0, `${label}: physical overlap`);
}

function prepareBlueOneHold(sim) {
  hideRed(sim);
  sim.debug.teleportCentury('blue-1', -5, -48);
  sim.debug.teleportCentury('blue-2', 5, -48);
  sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  runUntil(sim, () => ['blue-1', 'blue-2'].every(id => {
    const unit = century(sim, id);
    return unit.posture === POSTURE.HOLD && unit.planStatus === 'committed';
  }), 16, 'team hold posture delivery and commitment');
}

function prepareBlueOneZone(sim, zone = { x: -5, z: -10, radius: 10 }) {
  prepareBlueOneHold(sim);
  sim.setHoldZone('blue-1', zone);
  runUntil(sim, () => century(sim, 'blue-1').holdZone !== null,
    16, 'hold-zone delivery');
  const leader = century(sim, 'blue-1').center;
  sim.debug.teleportCentury('blue-2', leader.x + 8.35, leader.z);
  sim.step(DT);
  return century(sim, 'blue-1').holdZone;
}

test('a zone is a persistent destination, never a force that reverses withdrawal', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31ab, perCentury: 12 });
  const zone = prepareBlueOneZone(sim);
  assert.ok(zone.z > century(sim, 'blue-1').center.z);

  const dispatchWithdraw = () => sim.debug.dispatch('blue-2', MESSAGE_KIND.WITHDRAW, {});
  if (!dispatchWithdraw()) {
    runUntil(sim, dispatchWithdraw, 2, 'fresh physical withdrawal dispatch');
  }
  runUntil(sim, () => century(sim, 'blue-1').state === CENTURION_STATE.WITHDRAW,
    2, 'withdrawal receipt and arbitration');
  const start = officer(sim, 'blue-1');
  runFor(sim, 3);
  const end = officer(sim, 'blue-1');

  assert.equal(century(sim, 'blue-1').doctrinePriority, 'emergency-withdrawal');
  assert.ok(end.z < start.z - 0.8,
    `withdrawal moved toward the forward zone: ${start.z} -> ${end.z}`);
  assert.deepEqual(century(sim, 'blue-1').holdZone, zone,
    'local survival reaction erased the eventual mission destination');
  assertStable(sim, 'zone/withdrawal hierarchy');
});

test('a hold century intercepted en route halts, forms on contact, then resumes its zone mission', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31b0, perCentury: 12 });
  const zone = prepareBlueOneZone(sim);
  runUntil(sim, () => century(sim, 'blue-1').state === CENTURION_STATE.MARCH_TO_ZONE,
    8, 'safe zone march after line-repair hysteresis');
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);

  const beforeContact = century(sim, 'blue-1').center;
  sim.debug.teleportCentury('red-1', beforeContact.x, beforeContact.z + 17);
  runUntil(sim, () => {
    const unit = century(sim, 'blue-1');
    return unit.doctrinePriority === 'immediate-threat' &&
      [CENTURION_STATE.FORM_LINE, CENTURION_STATE.COUNTER,
        CENTURION_STATE.GUARD_FLANK].includes(unit.state);
  }, 1, 'contact halt above zone transit');

  const formedAt = century(sim, 'blue-1').center;
  const redCenter = century(sim, 'red-1').center;
  runFor(sim, 1.5);
  const halted = century(sim, 'blue-1');
  const facingError = Math.abs(angleDifference(
    headingTo(halted.center, redCenter), halted.heading));
  assert.ok(facingError < 0.48,
    `formation failed to face its physical threat: ${facingError}`);
  assert.ok(halted.center.z - formedAt.z < 1.5,
    'century continued sprinting through its interception toward the zone');
  assert.deepEqual(halted.holdZone, zone);

  sim.debug.teleportCentury('red-1', -50, 68);
  runUntil(sim, () => century(sim, 'blue-1').state === CENTURION_STATE.MARCH_TO_ZONE,
    12, 'post-threat zone mission resumption');
  const resumedAt = century(sim, 'blue-1').center.z;
  runFor(sim, 2);
  assert.ok(century(sim, 'blue-1').center.z > resumedAt + 0.25,
    'cleared century did not resume controlled progress toward its stored zone');
  assertStable(sim, 'zone interception and resumption');
});

test('a true outer-flank threat produces a full refused facing instead of waypoint fixation', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31b1, perCentury: 12 });
  prepareBlueOneHold(sim);
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);
  const center = century(sim, 'blue-1').center;
  const officerStart = officer(sim, 'blue-1');
  sim.debug.teleportCentury('red-1', center.x - 14, center.z + 8);

  runUntil(sim, () => century(sim, 'blue-1').state === CENTURION_STATE.GUARD_FLANK,
    1.5, 'outer-flank guard');
  runFor(sim, 0.8);
  const unit = century(sim, 'blue-1');
  assert.equal(unit.flankThreat?.threatKind, 'outer-flank');
  assert.equal(unit.doctrinePriority, 'immediate-threat');
  assert.ok(Math.abs(unit.heading) > 0.75,
    `refused line remained inside the obsolete 41-degree clamp: ${unit.heading}`);
  assert.ok(officer(sim, 'blue-1').z < officerStart.z + 0.5,
    'flank guard kept advancing toward an unrelated destination');
  assertStable(sim, 'outer-flank refusal');
});

test('a physically perceived broken mutual line outranks independent forward movement', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31b2, perCentury: 12 });
  hideRed(sim);
  sim.debug.teleportCentury('blue-1', -5, -46);
  sim.debug.teleportCentury('blue-2', 5, -46);
  sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
  runUntil(sim, () => ['blue-1', 'blue-2'].every(id => {
    const unit = century(sim, id);
    return unit.posture === POSTURE.HOLD && unit.planStatus === 'committed';
  }), 16, 'team hold coordination');
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);

  sim.debug.teleportCentury('blue-2', 5, -59, { moveFallback: false });
  const initialDepthGap = Math.abs(
    century(sim, 'blue-1').center.z - century(sim, 'blue-2').center.z);
  runUntil(sim, () => ['blue-1', 'blue-2'].some(id => {
    const unit = century(sim, id);
    return unit.state === CENTURION_STATE.FORM_LINE &&
      unit.doctrinePriority === 'formation-survival';
  }), 1.5, 'broken-line doctrinal override');
  runFor(sim, 3);
  const repairedDepthGap = Math.abs(
    century(sim, 'blue-1').center.z - century(sim, 'blue-2').center.z);
  assert.ok(repairedDepthGap < initialDepthGap - 0.8,
    `line correction failed to close depth error: ${initialDepthGap} -> ${repairedDepthGap}`);
  assertStable(sim, 'mutual-line repair');
});

test('pre-commit flank staging repairs a broken line and remains latched until recovered', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31d1, perCentury: 12 });
  hideRed(sim);
  runFor(sim, 0.9);
  assert.equal(century(sim, 'blue-2').state, CENTURION_STATE.STAGE_FLANK);

  const fixer = century(sim, 'blue-1').center;
  const flanker = century(sim, 'blue-2').center;
  sim.debug.teleportCentury('blue-2', flanker.x, fixer.z - 14,
    { moveFallback: false });
  const initialGap = Math.abs(
    century(sim, 'blue-1').center.z - century(sim, 'blue-2').center.z);
  runUntil(sim, () => {
    const unit = century(sim, 'blue-2');
    return unit.state === CENTURION_STATE.FORM_LINE &&
      unit.doctrinePriority === 'formation-survival';
  }, 1.5, 'pre-commit flank line repair');
  const repairStartedAt = sim.simTime;

  runFor(sim, 1.2);
  assert.equal(century(sim, 'blue-2').doctrinePriority, 'formation-survival',
    'line repair dropped back to staging before its minimum commitment');
  assert.notEqual(century(sim, 'blue-2').state, CENTURION_STATE.MANEUVER_FLANK,
    'a role assignment alone authorized detachment without FIXED evidence');

  runUntil(sim, () => century(sim, 'blue-2').doctrinePriority === 'mission',
    16, 'sound-line recovery release');
  const released = century(sim, 'blue-2');
  const repairedGap = Math.abs(
    century(sim, 'blue-1').center.z - century(sim, 'blue-2').center.z);
  assert.ok(sim.simTime - repairStartedAt >= TUNING.doctrineOverrideMin - 0.35,
    'formation-survival latch released before its doctrinal minimum');
  assert.ok(['sound', 'unknown'].includes(released.lineIntegrityBand));
  assert.ok(released.perceivedCohesion >= TUNING.formationRecoverCohesion);
  assert.ok(repairedGap < initialGap - 1,
    `staging did not repair its depth break: ${initialGap} -> ${repairedGap}`);
  assertStable(sim, 'pre-commit staging recovery latch');
});

test('a support request cannot pull a centurion off its own fresh frontal danger', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31d5, perCentury: 12 });
  hideRed(sim);
  runFor(sim, 0.9);
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);
  const start = century(sim, 'blue-2').center;
  sim.debug.teleportCentury('red-1', start.x, start.z + 10, { moveFallback: false });
  runUntil(sim, () => {
    const unit = century(sim, 'blue-2');
    return unit.doctrinePriority === 'immediate-threat' &&
      [CENTURION_STATE.FORM_LINE, CENTURION_STATE.GUARD_FLANK].includes(unit.state);
  }, 1.2, 'local frontal danger arbitration');

  sim.debug.setCommunicationEnabled('blue-1', true);
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.SUPPORT_REQUEST, {
    requestKind: 'anchor-line',
    supportPoint: century(sim, 'blue-1').center
  }), true);
  sim.debug.setCommunicationEnabled('blue-1', false);
  runFor(sim, 1);

  const receiver = century(sim, 'blue-2');
  assert.equal(receiver.doctrinePriority, 'immediate-threat');
  assert.notEqual(receiver.state, CENTURION_STATE.SUPPORT_ALLY);
  const threat = century(sim, 'red-1').center;
  const facingError = Math.abs(angleDifference(
    headingTo(receiver.center, threat), receiver.heading));
  assert.ok(facingError < 0.55,
    `support receiver turned away from its own danger: ${facingError}`);
  assertStable(sim, 'local danger above mutual support');
});

test('hold counterpressure faces a withdrawing enemy without chasing beyond its zone', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31d6, perCentury: 12 });
  prepareBlueOneHold(sim);
  const initial = century(sim, 'blue-1').center;
  sim.setHoldZone('blue-1', { x: initial.x, z: initial.z, radius: 10 });
  runUntil(sim, () => century(sim, 'blue-1').holdZone !== null,
    16, 'local zone delivery for pursuit leash');
  const zone = century(sim, 'blue-1').holdZone;
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);
  sim.debug.teleportCentury('red-2', -50, 68);

  let maximumExcursion = 0;
  const steps = Math.ceil(30 / DT);
  for (let index = 0; index < steps; index++) {
    if (index % 4 === 0) {
      const defender = century(sim, 'blue-1').center;
      sim.debug.teleportCentury('red-1', defender.x, defender.z + 12,
        { moveFallback: false });
    }
    sim.step(DT);
    const defender = century(sim, 'blue-1').center;
    maximumExcursion = Math.max(maximumExcursion,
      Math.hypot(defender.x - zone.x, defender.z - zone.z));
  }

  const defender = century(sim, 'blue-1');
  assert.ok(maximumExcursion <= zone.radius + 1.4,
    `zone defender pursued indefinitely: max excursion ${maximumExcursion}`);
  assert.equal(defender.doctrinePriority, 'immediate-threat');
  assert.ok([CENTURION_STATE.FORM_LINE, CENTURION_STATE.GUARD_FLANK,
    CENTURION_STATE.COUNTER].includes(defender.state));
  assertStable(sim, 'zone-defense pursuit leash');
});

test('line doctrine bounds noisy ally velocity and expires stale mutual-line geometry', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31d7, perCentury: 12 });
  hideRed(sim);
  runFor(sim, 0.8);
  const leader = century(sim, 'blue-1').center;
  sim.debug.teleportCentury('blue-2', leader.x + 22, leader.z,
    { moveFallback: false });
  runFor(sim, 0.5);
  let knowledge = sim.debug.knowledge('blue-1');
  assert.ok(Math.hypot(knowledge.allyTrack.vx, knowledge.allyTrack.vz) <=
    TUNING.centurionMaxSpeed * 1.15 + 1e-9,
  'noisy visual fixes produced an impossible ally velocity');

  sim.debug.teleportCentury('blue-2', 64, 68, { moveFallback: false });
  sim.debug.setCommunicationEnabled('blue-1', false);
  sim.debug.setCommunicationEnabled('blue-2', false);
  runFor(sim, TUNING.allyLineMaxAge + 0.8);
  const unit = century(sim, 'blue-1');
  knowledge = sim.debug.knowledge('blue-1');
  assert.ok(sim.simTime - knowledge.allyTrack.observedAt > TUNING.allyLineMaxAge);
  assert.equal(unit.lineIntegrityBand, 'unknown');
  assert.equal(unit.lineDepthError, 0);
  assert.equal(unit.lineGapError, 0);
  assertStable(sim, 'stale ally line geometry expiry');
});

test('a physically delivered flank warning sends the partner to the seam, not the enemy track', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31d7, perCentury: 12 });
  prepareBlueOneHold(sim);
  const defender = century(sim, 'blue-1').center;
  sim.debug.teleportCentury('red-1', defender.x - 14, defender.z + 8,
    { moveFallback: false });

  runUntil(sim, () => sim.observe().recentCommunicationEvents.some(event =>
    event.event === 'delivered' && event.kind === MESSAGE_KIND.FLANK_WARNING &&
    event.senderId === 'blue-1' && event.receiverId === 'blue-2'),
  2.5, 'physical flank-warning delivery');
  runUntil(sim, () => sim.debug.knowledge('blue-2').supportRequest?.kind === 'flank',
    0.8, 'flank warning inbox processing');

  const request = sim.debug.knowledge('blue-2').supportRequest;
  assert.equal(request.threatKind, 'outer-flank');
  assert.equal(request.side, 'negative-lateral');
  for (const field of ['x', 'z', 'threatX', 'threatZ']) {
    assert.ok(Number.isFinite(request[field]), `flank warning omitted ${field}`);
  }
  const guard = century(sim, 'blue-1');
  const supporter = century(sim, 'blue-2');
  assert.equal(guard.state, CENTURION_STATE.GUARD_FLANK);
  assert.equal(guard.doctrinePriority, 'immediate-threat');
  assert.equal(supporter.state, CENTURION_STATE.SUPPORT_ALLY);
  assert.equal(supporter.doctrinePriority, 'mutual-support');
  assert.ok(Math.hypot(request.x - request.threatX, request.z - request.threatZ) > 4,
    'support point collapsed onto the enemy contact instead of the friendly seam');
  const warningEvents = sim.observe().recentCommunicationEvents.filter(event =>
    event.kind === MESSAGE_KIND.FLANK_WARNING && event.senderId === 'blue-1');
  assert.ok(warningEvents.some(event => event.event === 'dispatched' && event.mode === 'voice'));
  assert.ok(warningEvents.some(event => event.event === 'delivered' && event.delivery === 'voice'));
  assertStable(sim, 'paired physical flank warning');
});

test('withdrawal communication outranks a simultaneous flank support warning', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31f1, perCentury: 12 });
  hideRed(sim);
  const leader = century(sim, 'blue-1').center;
  sim.debug.teleportCentury('red-1', leader.x - 14, leader.z + 8,
    { moveFallback: false });
  const casualties = sim.observe().soldiers
    .filter(soldier => soldier.centuryId === 'blue-1')
    .slice(0, 10);
  for (const soldier of casualties) sim.debug.setCondition(soldier.id, { hp: 0 });

  runUntil(sim, () => century(sim, 'blue-1').state === CENTURION_STATE.WITHDRAW,
    1, 'local emergency withdrawal');
  runUntil(sim, () => sim.observe().recentCommunicationEvents.some(event =>
    event.event === 'dispatched' && event.senderId === 'blue-1' &&
    event.kind === MESSAGE_KIND.WITHDRAW), 1, 'withdrawal dispatch');
  const tacticalDispatches = sim.observe().recentCommunicationEvents.filter(event =>
    event.event === 'dispatched' && event.senderId === 'blue-1' &&
    [MESSAGE_KIND.WITHDRAW, MESSAGE_KIND.FLANK_WARNING].includes(event.kind));
  assert.equal(tacticalDispatches[0]?.kind, MESSAGE_KIND.WITHDRAW,
    'a withdrawing century first asked its partner to advance in support');
  runUntil(sim, () => century(sim, 'blue-2').doctrinePriority === 'emergency-withdrawal',
    2, 'partner withdrawal receipt');
  assertStable(sim, 'withdrawal report priority');
});

test('support is not recursively echoed merely because the receiver is supporting', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31ac, perCentury: 12 });
  hideRed(sim);
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.SUPPORT_REQUEST, {}), true);
  runUntil(sim, () => century(sim, 'blue-2').state === CENTURION_STATE.SUPPORT_ALLY,
    2, 'single support request receipt');
  runFor(sim, 6);
  const supportDispatches = sim.observe().recentCommunicationEvents.filter(event =>
    event.event === 'dispatched' && event.kind === MESSAGE_KIND.SUPPORT_REQUEST);
  assert.equal(supportDispatches.length, 1,
    'support state generated a reciprocal request loop');
  assert.notEqual(century(sim, 'blue-1').state, CENTURION_STATE.SUPPORT_ALLY,
    'requester was pulled into a reflected support chase');
  assertStable(sim, 'non-recursive support semantics');
});

test('a peer runner lost outside the sender perception keeps its local lease until overdue', () => {
  const sim = createBattlefieldSimulation({ seed: 0x31b3, perCentury: 12 });
  hideRed(sim);
  sim.debug.teleportCentury('blue-1', -64, -68);
  sim.debug.teleportCentury('blue-2', 64, -68);
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT, {}), true);
  let runner = sim.observe().couriers.find(courier =>
    courier.senderId === 'blue-1' && courier.mode === 'runner');
  assert.ok(runner, 'far peer dispatch created no physical runner');
  const lease = sim.debug.knowledge('blue-1').centurionRunnerLease;
  assert.ok(lease && lease.expectedReturnAt > sim.simTime);

  sim.debug.setCondition(runner.id, { hp: 0 });
  sim.step(DT);
  assert.equal(sim.observe().couriers.some(courier => courier.id === runner.id), false,
    'dead runner remained physically active');
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT, {}), false,
    'remote runner loss telepathically freed the sender channel');

  sim.debug.setCommunicationEnabled('blue-1', false);
  runUntil(sim, () => sim.simTime >= lease.expectedReturnAt, 55,
    'sender-local missed-return deadline');
  sim.debug.setCommunicationEnabled('blue-1', true);
  assert.equal(sim.debug.dispatch('blue-1', MESSAGE_KIND.LINE_REPORT, {}), true,
    'locally overdue runner lease never released');
  runner = sim.observe().couriers.find(courier =>
    courier.senderId === 'blue-1' && courier.mode === 'runner');
  assert.ok(runner, 'overdue replacement did not become a physical runner');
  runFor(sim, 0.5);
  assertStable(sim, 'peer runner lease');
});
