import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createBattlefieldSimulation } from '../src/engine.js';
import { POSTURE, TEAM } from '../src/constants.js';

const root = path.resolve(import.meta.dirname, '..');
const engine = fs.readFileSync(path.join(root, 'src', 'engine.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');
const orca = fs.readFileSync(path.join(root, 'src', 'orca.js'), 'utf8');
const capabilitiesSource = fs.readFileSync(path.join(root, 'src', 'capabilities.js'), 'utf8');

const functionSource = (name, nextName) => {
  const start = engine.indexOf(`function ${name}(`);
  assert.ok(start >= 0, `missing function ${name}`);
  const end = nextName ? engine.indexOf(`function ${nextName}(`, start + 1) : engine.length;
  return engine.slice(start, end < 0 ? engine.length : end);
};

for (const token of ['document.', 'requestAnimationFrame(', 'canvas.getContext',
  'globalThis.soldierABM']) {
  assert.equal(engine.includes(token), false, `headless engine contains ${token}`);
}
assert.equal(renderer.includes("from './engine.js'"), false,
  'renderer must consume snapshots rather than import the world kernel');
assert.equal(ui.includes("from './engine.js'"), false,
  'UI must use its injected command facade');
assert.equal(orca.includes("from './engine.js'"), false,
  'ORCA must not import world truth');
assert.equal(capabilitiesSource.includes("from './engine.js'"), false,
  'pure deployment capability formulas must not import world truth');
assert.equal(engine.includes('century.skill'), false,
  'a causal aggregate century skill scalar bypasses individual ownership');
assert.equal(engine.includes('team.skill'), false,
  'a causal aggregate team skill scalar bypasses individual ownership');

const officerSensor = functionSource('senseCenturion', 'senseSoldier');
assert.equal(officerSensor.includes('body.centuryId'), false,
  'officer sensor groups or classifies with hidden century membership');
assert.equal(officerSensor.includes('centuryById('), false,
  'officer sensor looks up hidden century records');
assert.equal(officerSensor.includes('postError'), false,
  'officer sensor reads a soldier-private formation target error');
assert.match(officerSensor, /Geometry-based connected components/,
  'enemy detections must be clustered from perceived geometry');
assert.match(officerSensor, /body\.kind === 'runner'/,
  'officer sensor does not classify visible couriers separately');
assert.match(officerSensor, /minimumFormationEvidence/,
  'officer sensor allows isolated bodies to become formation observations');
assert.match(officerSensor, /contactClass: 'formation'/,
  'formation observations lack an explicit evidence class');

const soldierSensor = functionSource('senseSoldier', 'decayTrackConfidence');
assert.equal(/\bid\s*:/.test(soldierSensor), false,
  'soldier percept contains an engine body identifier');
assert.equal(soldierSensor.includes('centuryById('), false,
  'soldier sensor looks up hidden century membership');
assert.equal(/\b(profile|capabilities|condition|hp|maxHp|morale|fatigue|armor|damage|reach)\s*:/.test(
  soldierSensor), false, 'soldier percept publishes private capability or condition fields');
const morale = functionSource('updateSoldierMorale', 'formationTargetForSoldier');
assert.equal(morale.includes('.centurion.alive'), false,
  'soldier morale reads raw centurion life state');
assert.equal(engine.includes('perceivedTargetId'), false,
  'strike intentions still dereference perceived engine target IDs');
assert.equal(engine.includes('targetEnemyId'), false,
  'obsolete engine target handle remains in soldier memory');
const soldierOrders = functionSource('updateSoldierOrderAndGuide', 'updateSoldierMorale');
assert.equal(soldierOrders.includes('centuryById('), false,
  'soldier order cognition bypasses its frozen acoustic percept');
assert.equal(soldierOrders.includes('.centurion'), false,
  'soldier order cognition reads the live officer body');
const strikeResolution = functionSource('resolveStrikes', 'bodyMobility');
assert.match(strikeResolution, /attacker\.capabilities/,
  'material combat does not use the attacker deployment capabilities');
assert.match(strikeResolution, /target\.capabilities/,
  'material combat does not use the target deployment capabilities');
const engineWithoutStrikeResolution = engine.replace(strikeResolution, '');
assert.equal(engineWithoutStrikeResolution.includes('target.capabilities'), false,
  'target private capabilities escape the material strike boundary');

const generalSensor = functionSource('senseGeneral', 'associateGeneralEnemyTrack');
assert.equal(generalSensor.includes('body.centuryId'), false,
  'general sensor groups enemies with hidden century membership');
assert.equal(generalSensor.includes('centuryById('), false,
  'general sensor looks up hidden century records');
assert.match(generalSensor, /clusterGeneralDetections\(enemyDetections\)/,
  'general sensor does not construct contacts from perceived geometry');
assert.match(generalSensor, /range > sight/,
  'general sensor lacks a physical sight horizon');
assert.match(generalSensor, /fullFootprintVisible/,
  'general sensor can mistake a partial formation footprint for casualties');
assert.equal(/\b(profile|capabilities|condition|hp|maxHp|morale|fatigue|armor|damage|reach)\s*:/.test(
  generalSensor), false, 'general percept publishes private capability or condition fields');

const generalDecision = functionSource('chooseGeneralIntent', 'updateGeneralBrain');
for (const forbidden of ['centuries', 'soldiers', 'bodyById', 'centuryById(', 'aliveSoldiers(',
  '.centurion', '.capabilities', '.condition']) {
  assert.equal(generalDecision.includes(forbidden), false,
    `general decision reads world truth through ${forbidden}`);
}
assert.match(generalDecision, /usableGeneralEnemyTracks\(general\)/,
  'general decision does not use its private contact memory');
assert.match(generalDecision, /friendlyTracks/,
  'general decision does not use its private friendly reports');
const generalMind = functionSource('updateGeneralBrain', 'generalBearingBand');
assert.match(generalMind, /issuePosture\(general\.team/,
  'general AI does not act through the public physical-order path');
assert.equal(generalMind.includes('century.posture ='), false,
  'general AI directly mutates a century posture');
assert.match(generalMind, /postureNeedsRetry/,
  'general AI does not reconcile a lost physical posture order');
assert.match(generalMind, /zoneClearNeedsRetry/,
  'general AI does not reconcile a lost physical clear-zone order');
const situationProjection = functionSource('generalSituation', 'setGeneralAI');
for (const forbidden of ['profile:', 'capabilities:', 'condition:', 'hp:', 'morale:', 'fatigue:']) {
  assert.equal(situationProjection.includes(forbidden), false,
    `gameplay situation projection includes private ${forbidden}`);
}
const generalEnqueue = functionSource('enqueueGeneralCommand', 'issuePosture');
assert.match(generalEnqueue, /friendlyTracks\.get\(century\.standard\)/,
  'general command addressing does not use the general private friendly track');
assert.equal(generalEnqueue.includes('century.centurion'), false,
  'general command addressing reads the live centurion body');
const generalReturn = functionSource('acceptGeneralReturn', 'deliverGeneralCommand');
assert.match(generalReturn, /simTime - report\.reportedAt/,
  'returned contact reports ignore physical courier transit time');
assert.match(generalReturn, /report\.contact\.vx \* transit/,
  'returned contacts are not projected from reported motion');
assert.match(generalReturn, /reportConfidence/,
  'returned friendly reports restore confidence without transit decay');
assert.match(generalReturn, /confirmedPostureSerial/,
  'a late older return can regress newer confirmed command knowledge');
assert.match(generalReturn, /confirmedZoneSerial/,
  'a late older zone return can regress newer confirmed zone knowledge');

const generalQueue = functionSource('serviceGeneralCommandQueue', 'removeCourier');
assert.equal(generalQueue.includes('couriers.some'), false,
  'general command-post capacity reads the remote courier population');
assert.match(generalQueue, /runnerLeases/,
  'general scheduler lacks command-post-local runner leases');
assert.match(generalQueue, /expectedReturnAt/,
  'general scheduler lacks a locally predicted missed-return deadline');

const dispatch = functionSource('dispatchCenturionMessage', 'serviceGeneralCommandQueue');
assert.equal(dispatch.includes('distance(sender.centurion, receiver.centurion)'), false,
  'sender channel selection reads the receiver true pose');
assert.equal(dispatch.includes('receiver.centurion.alive'), false,
  'sender suppresses an act from unperceived receiver life state');
assert.match(dispatch, /sender\.brain\.allyTrack/,
  'sender does not select communication from private ally belief');

const posture = functionSource('issuePosture', 'setHoldZone');
assert.match(posture, /enqueueGeneralCommand/,
  'runtime posture bypasses the physical general-command network');
assert.equal(posture.includes('century.posture ='), false,
  'runtime posture directly mutates addressed officer missions');

const planService = functionSource('servicePlanCoordination', 'deliverCenturionPacket');
assert.match(planService, /pending\?\.scope === 'team'/,
  'plan negotiation is not gated to a team-scoped pending mission');
assert.match(planService, /lastCommittedMission\?\.scope === 'team'/,
  'coordinator can rebroadcast a single-century mission as a team commit');
const planInbox = functionSource('processCenturionInbox', 'servicePlanCoordination');
assert.match(planInbox, /missionFingerprint\(mission\) === missionFingerprint\(pending\)/,
  'plan commit does not require exact equality with the acknowledged mission');
assert.match(planInbox, /PLAN_STATUS\.ACKNOWLEDGED/,
  'plan commit does not require local ACK provenance');
assert.match(planService, /const sent = dispatchCenturionMessage[\s\S]*if \(!sent\)/,
  'coordinator can activate despite a withheld COMMIT act');
const trackFilter = functionSource('usableEnemyTracks', 'bestEnemyTrack');
assert.match(trackFilter, /contactClass === 'formation'/,
  'tactics can select isolated or courier contacts as formations');
const trackSelection = functionSource('bestEnemyTrack', 'assessFlankThreat');
assert.match(trackSelection, /usableEnemyTracks/,
  'best-contact selection bypasses the formation-only tactical filter');

const tickStages = [
  'updateCouriers(dt);',
  'generalPerceptFrames.set(team, senseGeneral(general))',
  'updateGeneralBrain(generalBrains.get(team), generalPerceptFrames.get(team), dt);',
  'centurionPerceptFrames.set(century.id, senseCenturion(century))',
  'updateCenturionBrain(century, centurionPerceptFrames.get(century.id), dt);',
  'integrateCenturions(dt);',
  'perceptFrames.set(soldier.id, senseSoldier(soldier))',
  'updateSoldierMind(soldier, perceptFrames.get(soldier.id), dt);',
  'resolveStrikes();',
  'integrateSoldiers(dt);',
  'resolveBodyCollisions();',
  'publishSoldierCues();',
  'commitCenturyOrders();',
  'projectMatchResult();'
];
const stepSource = functionSource('step', 'centuryObserverSnapshot');
let previous = -1;
for (const stage of tickStages) {
  const index = stepSource.indexOf(stage);
  assert.ok(index > previous, `tick barrier missing or reordered: ${stage}`);
  previous = index;
}

const sim = createBattlefieldSimulation({ seed: 0x30aa, perCentury: 12 });
const audit = sim.debug.architectureAudit();
assert.deepEqual({
  centuries: audit.centuryCount,
  uniqueBrains: audit.uniqueBrains,
  uniqueInboxes: audit.uniqueInboxes,
  uniqueTrackMaps: audit.uniqueEnemyTrackMaps,
  soldiers: audit.soldierCount,
  uniqueDoctrines: audit.uniqueDoctrines,
  frozenDoctrines: audit.frozenDoctrines
}, {
  centuries: 4,
  uniqueBrains: 4,
  uniqueInboxes: 4,
  uniqueTrackMaps: 4,
  soldiers: 48,
  uniqueDoctrines: 48,
  frozenDoctrines: 48
});
assert.deepEqual({
  generals: audit.generalCount,
  uniqueBrains: audit.uniqueGeneralBrains,
  uniqueFriendlyMaps: audit.uniqueGeneralFriendlyTrackMaps,
  uniqueEnemyMaps: audit.uniqueGeneralEnemyTrackMaps,
  uniqueReceiptMaps: audit.uniqueGeneralReceiptMaps
}, {
  generals: 2,
  uniqueBrains: 2,
  uniqueFriendlyMaps: 2,
  uniqueEnemyMaps: 2,
  uniqueReceiptMaps: 2
});
assert.equal(audit.uniqueGeneralPostureReceiptMaps, 2);
assert.equal(audit.uniqueGeneralZoneReceiptMaps, 2);
assert.equal(audit.uniqueGeneralReceiptHistoryMaps, 2);
assert.equal(audit.uniqueGeneralRunnerLeaseMaps, 2);
assert.deepEqual({
  actors: audit.actorCount,
  uniqueProfiles: audit.uniqueProfiles,
  frozenProfiles: audit.frozenProfiles,
  uniqueCapabilities: audit.uniqueCapabilities,
  frozenCapabilities: audit.frozenCapabilities,
  uniqueConditions: audit.uniqueConditions,
  sharedMutableStatObjects: audit.sharedMutableStatObjects,
  uniqueConditionEffects: audit.uniqueConditionEffects,
  sharedMutableEffectArrays: audit.sharedMutableEffectArrays,
  validMoraleThresholds: audit.validMoraleThresholds
}, {
  actors: 52,
  uniqueProfiles: 52,
  frozenProfiles: 52,
  uniqueCapabilities: 52,
  frozenCapabilities: 52,
  uniqueConditions: 52,
  sharedMutableStatObjects: 0,
  uniqueConditionEffects: 52,
  sharedMutableEffectArrays: 0,
  validMoraleThresholds: true
});
const snapshot = sim.observe();
assert.ok(Object.isFrozen(snapshot) && Object.isFrozen(snapshot.soldiers));
assert.throws(() => snapshot.soldiers.push({}), TypeError);
for (const id of ['blue-1-s1', 'centurion-blue-1']) {
  const percept = sim.debug.percept(id);
  assert.ok(Object.isFrozen(percept));
  assert.equal(JSON.stringify(percept).includes('"id"'), false,
    `${id} percept leaks an engine ID`);
  assert.equal(JSON.stringify(percept).includes('centuryId'), false,
    `${id} percept leaks engine century membership`);
  for (const forbidden of ['profileId', 'capabilities', 'condition', 'maxHp', 'armor', 'damage']) {
    assert.equal(JSON.stringify(percept).includes(forbidden), false,
      `${id} percept leaks private ${forbidden}`);
  }
}
for (const id of ['general-blue', 'general-red']) {
  const percept = sim.debug.percept(id);
  assert.ok(Object.isFrozen(percept));
  assert.equal(JSON.stringify(percept).includes('centuryId'), false,
    `${id} percept leaks engine century membership`);
  for (const forbidden of ['profileId', 'capabilities', 'condition', 'maxHp', 'armor', 'damage']) {
    assert.equal(JSON.stringify(percept).includes(forbidden), false,
      `${id} percept leaks private ${forbidden}`);
  }
}
assert.equal(typeof sim.generalSituation, 'function',
  'public facade omits the gameplay-safe general situation projection');
assert.equal(typeof sim.setGeneralAI, 'function',
  'public facade omits enemy-general AI control');
assert.ok(Object.isFrozen(sim.generalSituation(TEAM.BLUE)));

const before = sim.observe().centuries.filter(century => century.team === TEAM.BLUE)
  .map(century => century.posture);
const receipt = sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
assert.ok(Object.isFrozen(receipt) && receipt.teamScope);
assert.deepEqual(sim.observe().centuries.filter(century => century.team === TEAM.BLUE)
  .map(century => century.posture), before,
  'general intent mutated both officer missions before physical delivery');
assert.equal(sim.observe().generalCommandsQueued, 2,
  'team order did not create independently addressed couriers');
sim.step(1 / 30);
const runnerAudit = sim.debug.architectureAudit();
assert.equal(runnerAudit.activePhysicalRunners, 2,
  'general commands did not create two auditable physical runner actors');
assert.deepEqual({
  actors: runnerAudit.actorCount,
  profiles: runnerAudit.uniqueProfiles,
  capabilities: runnerAudit.uniqueCapabilities,
  conditions: runnerAudit.uniqueConditions,
  effectArrays: runnerAudit.uniqueConditionEffects,
  sharedConditions: runnerAudit.sharedMutableStatObjects,
  sharedEffects: runnerAudit.sharedMutableEffectArrays
}, {
  actors: 54,
  profiles: 54,
  capabilities: 54,
  conditions: 54,
  effectArrays: 54,
  sharedConditions: 0,
  sharedEffects: 0
});

console.log(JSON.stringify({
  ok: true,
  checks: {
    headlessBoundaries: true,
    anonymousGeometryPerception: true,
    isolatedContactClassification: true,
    noRawOfficerLifeRead: true,
    perceptBoundOfficerSpeech: true,
    aimGeometryStrikeBoundary: true,
    beliefSelectedCommunication: true,
    perceptionBoundGeneralAI: true,
    teamScopedGeneralProjection: true,
    physicalReturnReports: true,
    physicalGeneralOrders: true,
    scopedPlanProtocol: true,
    exactTickBarriers: true,
    detachedPrivateBrains: true,
    frozenObserverSurface: true,
    privateActorCapabilities: true,
    materialOnlyOpponentStats: true,
    boundedDeploymentProfiles: true
  }
}, null, 2));
