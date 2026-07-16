import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const root = path.resolve(import.meta.dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const ui = fs.readFileSync(path.join(root, 'src', 'ui.js'), 'utf8');
const main = fs.readFileSync(path.join(root, 'src', 'main.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'src', 'renderer.js'), 'utf8');
const standalone = fs.readFileSync(path.join(root, 'dist', 'soldier_ABM_v29.html'), 'utf8');

const ids = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]));
const referencedIds = new Set([...ui.matchAll(/byId\('([^']+)'\)/g)].map(match => match[1]));
for (const id of referencedIds) {
  if (id.startsWith('card-')) continue;
  assert.ok(ids.has(id), `UI references missing HTML id: ${id}`);
}
assert.ok(ids.has('battlefield'));
assert.match(main, /getElementById\('battlefield'\)/);
assert.equal((html.match(/data-century="/g) || []).length, 4,
  'four century selectors are required');
assert.equal((html.match(/data-posture="/g) || []).length, 3,
  'three high-level posture controls are required');
assert.equal((html.match(/data-field="quality"/g) || []).length, 4,
  'every century card must expose its observer-only roster quality summary');
assert.ok(ids.has('selectedQuality'),
  'selected-century capability summary is missing');
assert.match(ui, /capabilitySummary\.mean\.overall/,
  'UI does not render the deployment capability summary');
assert.match(ui, /rawSeed === '' \? NaN : Number\(rawSeed\)/,
  'restart must preserve the valid deterministic seed 0');
assert.match(ui, /Number\.isInteger\(tempo\) \? tempo\.toFixed\(1\) : String\(tempo\)/,
  'tempo readout must preserve quarter-step values');
assert.match(renderer, /drawCenturion\(drawable\.value, snapshot\.config\.showMessages\)/,
  'runners/signals presentation toggle must also gate raised-standard rendering');
assert.equal(standalone.includes('<link rel="stylesheet" href="./styles.css">'), false,
  'standalone still references external CSS');
assert.equal(standalone.includes('<script type="module" src="./src/main.js"></script>'), false,
  'standalone still references source modules');
assert.match(standalone, /name="soldier-abm-version" content="29"/);
assert.match(standalone, /createBattlefieldSimulation/);

console.log(JSON.stringify({
  ok: true,
  checks: {
    controlsResolve: true,
    fourCenturySelectors: true,
    threePostures: true,
    standaloneIsSelfContained: true,
    releaseVersion: 29
  }
}, null, 2));
