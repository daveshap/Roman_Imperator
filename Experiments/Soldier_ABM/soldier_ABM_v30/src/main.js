import { TEAM, TUNING } from './constants.js';
import { createBattlefieldSimulation } from './engine.js';
import { createBattlefieldRenderer } from './renderer.js';
import { createBattlefieldUI } from './ui.js';

const canvas = document.getElementById('battlefield');
const simulation = createBattlefieldSimulation();
const renderer = createBattlefieldRenderer(canvas);
const ui = createBattlefieldUI(simulation, renderer);

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const frameStarted = performance.now();
  const elapsed = Math.min(.075, Math.max(0, (now - last) / 1000));
  last = now;

  if (!simulation.paused && !simulation.result) {
    accumulator += elapsed * simulation.timeScale;
    const population = simulation.observe().soldiers.length;
    const maxSteps = population > 260 ? 8 : population > 170 ? 10 : 14;
    let steps = 0;
    while (accumulator >= TUNING.fixedDt && steps < maxSteps) {
      simulation.step(TUNING.fixedDt);
      accumulator -= TUNING.fixedDt;
      steps++;
    }
    if (steps === maxSteps) accumulator = Math.min(accumulator, TUNING.fixedDt * 2);
  } else {
    accumulator = 0;
  }

  const snapshot = simulation.observe();
  renderer.render(snapshot, simulation.generalSituation(TEAM.BLUE));
  ui.update(snapshot, simulation.diagnostics(), performance.now() - frameStarted);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
