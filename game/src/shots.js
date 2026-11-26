// Langit Senja — screenshot scenes behind ?shot=start|play|cover|end.
// Each scene plays the real rules forward from a fresh world, steered by a
// simple autopilot (climb toward the next ring, stay clear of the ground,
// ease off for the runway), so the frame is what a real flight looks like
// and the same seed always gives the same frame.
import { STEP, PLANE } from './config.js';
import { SCREEN_TITLE, SCREEN_PLAY, SCREEN_LANDED, SCREEN_OVER } from './render.js';

const START_SECONDS = 5;
const PLAY_SECONDS = 22;
const COVER_EXTRA_SECONDS = 4;
const END_LIMIT_SECONDS = 600;
const SAMPLE = STEP;

/** Highest ground between two x positions, sampled every 60 px. */
function maxGroundAhead(world, x0, x1) {
  let m = 0;
  for (let x = x0; x <= x1; x += 60) m = Math.max(m, world.groundHeight(x));
  return Math.max(m, world.groundHeight(x1));
}

/** Steer the plane for one step: returns { climb, throttle, boost }. */
export function autopilot(game) {
  const { plane, world } = game;
  const next = world.nextRing();

  // On the ground: full throttle, rotate once fast enough to fly.
  if (plane.grounded) {
    return { climb: plane.speed > 95 ? 1 : 0, throttle: 1, boost: false };
  }

  // Final approach: stay above the ground between here and the strip, then
  // settle onto the runway's first half. Once over the strip and low, aim
  // just under the surface so the plane keeps descending until it touches.
  if (!next) {
    const runway = world.runway;
    const floor = maxGroundAhead(world, plane.x, Math.min(runway.x0, plane.x + 900)) + 80;
    let wantAlt;
    if (plane.x < runway.x0 - 500) wantAlt = Math.max(runway.alt + 120, floor);
    else if (plane.x < runway.x0) wantAlt = Math.max(runway.alt + 12, floor);
    else if (plane.alt > runway.alt + 40) wantAlt = runway.alt + 12;
    else wantAlt = runway.alt - 2;
    const climb = plane.alt < wantAlt - 10 ? 1 : plane.alt > wantAlt + 10 ? -1 : 0;
    let throttle = 0;
    if (plane.speed < 128) throttle = 1;
    else if (plane.speed > 155) throttle = -1;
    return { climb, throttle, boost: false };
  }

  // Chasing a ring: never fly below the highest ground between here and it,
  // so a dive toward a low ring cannot run the plane into a hill on the way.
  const floor = maxGroundAhead(world, plane.x, next.x) + 80;
  const wantAlt = Math.max(next.alt, floor);
  const climb = plane.alt < wantAlt - 15 ? 1 : plane.alt > wantAlt + 15 ? -1 : 0;
  const throttle = plane.speed < PLANE.cruiseSpeed - 10 ? 1 : plane.speed > PLANE.maxSpeed - 15 ? -1 : 0;
  return { climb, throttle, boost: false };
}

/**
 * Set `game` to the named scene (start, play, cover or end; any other name is
 * start) and return the screen to draw over it.
 */
export function stageShot(name, game) {
  game.start(game.selectedMission, true);
  if (name !== 'play' && name !== 'cover' && name !== 'end') {
    for (let i = 0; i < START_SECONDS / STEP; i += 1) game.step(SAMPLE, { climb: 0, throttle: 0, boost: false }, true);
    return SCREEN_TITLE;
  }
  if (name === 'play') {
    for (let i = 0; i < PLAY_SECONDS / STEP; i += 1) {
      if (game.plane.crashed || game.plane.landed) break;
      game.step(SAMPLE, autopilot(game), true);
    }
    return game.plane.crashed ? SCREEN_OVER : SCREEN_PLAY;
  }
  if (name === 'cover') {
    // Fly until the last ring is taken, then a little more: final approach,
    // runway lights ahead, HUD lit.
    let steps = 0;
    while (!game.plane.crashed && !game.plane.landed && steps < END_LIMIT_SECONDS / STEP) {
      if (worldDone(game)) break;
      game.step(SAMPLE, autopilot(game), true);
      steps += 1;
    }
    for (let i = 0; i < COVER_EXTRA_SECONDS / STEP; i += 1) {
      if (game.plane.crashed || game.plane.landed) break;
      game.step(SAMPLE, autopilot(game), true);
    }
    return game.plane.crashed ? SCREEN_OVER : SCREEN_PLAY;
  }
  // end: fly the whole sortie to a landing (or a crash).
  let steps = 0;
  while (!game.plane.crashed && !game.plane.landed && steps < END_LIMIT_SECONDS / STEP) {
    game.step(SAMPLE, autopilot(game), true);
    steps += 1;
  }
  return game.plane.landed ? SCREEN_LANDED : SCREEN_OVER;
}

function worldDone(game) {
  return game.world.ringsLeft() === 0;
}
