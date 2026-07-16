import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
const standalone = fs.readFileSync(path.join(root, 'dist', 'soldier_ABM_v31.html'), 'utf8');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([
  ...[...ui.matchAll(/byId\('([^']+)'\)/g)].map(match => match[1]),
  ...[...ui.matchAll(/setText\('([^']+)'/g)].map(match => match[1])
]);
for (const id of referencedIds) {
  if (id.startsWith('card-')) continue;
  assert.ok(ids.has(id), `UI references missing HTML id: ${id}`);
}
assert.ok(ids.has('battlefield'));
assert.match(html, /<body[^>]+data-ui-mode="gameplay"/,
  'gameplay must be the default interface mode');
assert.ok(ids.has('modeGameplay') && ids.has('modeDebug'),
  'permanent gameplay/debug mode controls are missing');
assert.match(main, /getElementById\('battlefield'\)/);
assert.match(main, /renderer\.render\(snapshot, simulation\.generalSituation\(TEAM\.BLUE\)\)/,
  'gameplay renderer is not supplied with the Blue general situation projection');
assert.equal((html.match(/data-century="/g) || []).length, 4,
  'four century selectors are required');
assert.equal((html.match(/data-posture="/g) || []).length, 3,
  'three high-level posture controls are required');
assert.equal((html.match(/data-field="quality"/g) || []).length, 4,
  'all four card DOM slots must remain available to debug mode');
assert.equal((html.match(/data-century-card=/g) || []).length, 4,
  'two friendly command cards and two enemy intelligence slots are required');
assert.match(html, /MY COMMAND/);
assert.match(html, /ENEMY INTELLIGENCE/);
assert.match(html, /data-century="red-1" class="red debug-only"/,
  'enemy command selectors must be debug-only');
assert.ok(ids.has('selectedQuality'),
  'selected-century capability summary is missing');
assert.ok(ids.has('selectedReport'),
  'gameplay field-report summary is missing');
assert.ok(ids.has('blueGeneralDebug') && ids.has('redGeneralDebug'),
  'debug general-cognition diagnostics are missing');
assert.match(ui, /capabilitySummary\.mean\.overall/,
  'debug UI does not render the deployment capability summary');
assert.match(ui, /simulation\.generalSituation\(TEAM\.BLUE\)/,
  'gameplay UI must consume the Blue general situation projection');
assert.match(ui, /simulation\.setGeneralAI\(TEAM\.RED, event\.target\.checked\)/,
  'enemy general AI control is missing or addresses the wrong team');
assert.match(ui, /function updateDebugGenerals\(snapshot, diagnostics\)/,
  'debug UI does not expose the auditable general FSM projection');
assert.match(ui, /report\?\.intendedPosture \?\? situation\?\.general\?\.intent/,
  'gameplay selected posture ignores per-century intended posture');
assert.match(ui, /uiMode === UI_MODE\.GAMEPLAY && !String\(id\)\.startsWith\('blue'\)/,
  'gameplay mode does not reject enemy command selection');
assert.match(css, /body\[data-ui-mode="gameplay"\] \.debug-only \{ display: none !important; \}/,
  'debug diagnostics are not hidden in gameplay mode');
assert.match(css, /body\[data-ui-mode="debug"\] \.gameplay-only \{ display: none !important; \}/,
  'gameplay-only summaries are not hidden in debug mode');
const gameplayCardSource = ui.slice(ui.indexOf('function updateGameplayCenturyCards'),
  ui.indexOf('function processObserverEvents'));
assert.doesNotMatch(gameplayCardSource, /snapshot\.centuries|capabilitySummary|tacticalRole|communicationState/,
  'gameplay cards read omniscient century observer internals');
const gameplaySelectedSource = ui.slice(ui.indexOf('function updateGameplaySelected'),
  ui.indexOf('function update(snapshot'));
assert.doesNotMatch(gameplaySelectedSource, /snapshot\.centuries|capabilitySummary|tacticalRole|communicationState/,
  'gameplay selected-unit panel reads omniscient century observer internals');
assert.match(ui, /rawSeed === '' \? NaN : Number\(rawSeed\)/,
  'restart must preserve the valid deterministic seed 0');
assert.match(ui, /Number\.isInteger\(tempo\) \? tempo\.toFixed\(1\) : String\(tempo\)/,
  'tempo readout must preserve quarter-step values');
assert.match(ui, /event\.defaultPrevented \|\| event\.target\?\.isContentEditable/,
  'global hotkeys do not respect focused controls or handled card keys');
assert.match(renderer, /drawCenturion\(drawable\.value, snapshot\.config\.showMessages\)/,
  'runners/signals presentation toggle must also gate raised-standard rendering');
assert.match(ui, /renderer\.setUIMode\?\.\(uiMode\)/,
  'interface mode is not propagated to the battlefield renderer');
assert.match(renderer, /uiMode === 'gameplay' && century\.team !== 'blue'/,
  'gameplay renderer does not suppress enemy observer annotations');
for (const hiddenTruth of [
  /uiMode === 'gameplay' && soldier\.team !== 'blue'/,
  /uiMode === 'gameplay' && centurion\.team !== 'blue'/,
  /uiMode === 'gameplay' && courier\.team !== 'blue'/,
  /uiMode === 'gameplay' && body\.team !== 'blue'/,
  /uiMode === 'gameplay' && target\.team !== 'blue'/
]) {
  assert.match(renderer, hiddenTruth,
    'gameplay renderer exposes an omniscient enemy body, message, casualty, or hit channel');
}
assert.match(renderer, /function drawGameplayContacts\(situation\)/,
  'gameplay renderer lacks bounded general-contact glyphs');
assert.match(renderer, /if \(contact\?\.directlyVisible\) continue/,
  'a directly sighted formation still receives a duplicate belief glyph');
assert.match(renderer, /function drawObservedEnemy\(body\)/,
  'gameplay renderer lacks sanitized direct-sight enemy silhouettes');
assert.match(renderer, /playerSituation\?\.directSight\?\.bodies/,
  'gameplay enemy silhouettes do not come from the team-scoped situation projection');
const observedEnemySource = renderer.slice(renderer.indexOf('function drawObservedEnemy'),
  renderer.indexOf('function render'));
for (const forbidden of [
  /snapshot/, /centuryId/, /combatState/, /\.state/, /\.mode/, /\.reason/, /\.hp/,
  /capabilities/, /ratings/, /senderId/, /receiverId/, /standardCode/, /targetId/,
  /targetX/, /targetZ/, /packet/
]) {
  assert.doesNotMatch(observedEnemySource, forbidden,
    'sanitized enemy renderer consumes observer-only or private state');
}
const observedEnemyFields = new Set([...observedEnemySource
  .matchAll(/\bbody(?:\?\.|\.)([A-Za-z][A-Za-z0-9]*)/g)]
  .map(match => match[1]));
assert.deepEqual([...observedEnemyFields].sort(),
  ['heading', 'recognizedMark', 'visualClass', 'x', 'z'],
  'direct-sight renderers consume fields outside the exact silhouette DTO schema');
const directSightBranchStart = renderer.indexOf(
  "if (uiMode === 'gameplay' && Array.isArray(playerSituation?.directSight?.bodies))");
assert.ok(directSightBranchStart >= 0, 'gameplay render lacks a direct-sight body branch');
const directSightBranch = renderer.slice(directSightBranchStart,
  renderer.indexOf('drawables.sort', directSightBranchStart));
assert.doesNotMatch(directSightBranch,
  /snapshot|centuryId|combatState|\.state|\.mode|\.reason|\.hp|capabilities|ratings|senderId|receiverId|standardCode|targetId|targetX|targetZ|packet/,
  'gameplay direct-sight branch falls back to observer or private body data');
const labelSource = renderer.slice(renderer.indexOf('function drawCenturyLabels'),
  renderer.indexOf('function drawCombatFlashes'));
assert.match(labelSource, /uiMode === 'debug'/,
  'exact FSM, role, and strength labels are not debug-gated');
assert.equal(standalone.includes('<link rel="stylesheet" href="./styles.css">'), false,
  'standalone still references external CSS');
assert.equal(standalone.includes('<script type="module" src="./src/main.js"></script>'), false,
  'standalone still references source modules');
assert.match(standalone, /name="soldier-abm-version" content="31"/);
assert.match(standalone, /createBattlefieldSimulation/);

console.log(JSON.stringify({
  ok: true,
  checks: {
    controlsResolve: true,
    fourCenturySelectors: true,
    threePostures: true,
    standaloneIsSelfContained: true,
    gameplayDefault: true,
    enemyProjectionOnly: true,
    directSightSilhouettes: true,
    enemyGeneralAIToggle: true,
    releaseVersion: 31
  }
}, null, 2));
