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

const sim = createBattlefieldSimulation({ seed: 0x28aa, perCentury: 12 });
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
}

const before = sim.observe().centuries.filter(century => century.team === TEAM.BLUE)
  .map(century => century.posture);
const receipt = sim.issuePosture(TEAM.BLUE, POSTURE.HOLD);
assert.ok(Object.isFrozen(receipt) && receipt.teamScope);
assert.deepEqual(sim.observe().centuries.filter(century => century.team === TEAM.BLUE)
  .map(century => century.posture), before,
  'general intent mutated both officer missions before physical delivery');
assert.equal(sim.observe().generalCommandsQueued, 2,
  'team order did not create independently addressed couriers');

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
    physicalGeneralOrders: true,
    scopedPlanProtocol: true,
    exactTickBarriers: true,
    detachedPrivateBrains: true,
    frozenObserverSurface: true
  }
}, null, 2));
