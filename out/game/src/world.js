// Langit Senja — the world: an island chain at dusk, its rings and its runway.
// The ground is a height function over distance east; the sea sits at altitude 0.
import { mulberry32, range, clamp } from './random.js';

export const WORLD_LENGTH = 12000;
const ISLAND_SPAN = 1500;

function bump(x, centre, width, height) {
  const d = (x - centre) / (width / 2);
  if (d < -1 || d > 1) return 0;
  const s = 1 - d * d;
  return height * s * s;
}

function makeIslands(rnd) {
  // Five islands spread along the route, the last one holding the runway.
  // The first island is low so the takeoff clears it easily.
  const islands = [];
  const centres = [1500, 3300, 5200, 7100, 10600];
  for (let i = 0; i < centres.length; i += 1) {
    const last = i === centres.length - 1;
    const first = i === 0;
    islands.push({
      centre: centres[i] + range(rnd, -120, 120),
      width: last ? 2400 : range(rnd, 1300, 1700),
      height: last ? 150 : first ? range(rnd, 120, 160) : range(rnd, 190, 320),
      runway: last,
    });
  }
  return islands;
}

function makeDecor(rnd, islands) {
  const palms = [];
  const houses = [];
  const boats = [];
  for (const island of islands) {
    const n = island.runway ? 2 : 5;
    for (let i = 0; i < n; i += 1) {
      palms.push({ x: island.centre + range(rnd, -island.width / 2 + 120, island.width / 2 - 120) });
    }
    for (let i = 0; i < 3; i += 1) {
      houses.push({
        x: island.centre + range(rnd, -island.width / 2 + 200, island.width / 2 - 200),
        w: range(rnd, 34, 52),
        h: range(rnd, 26, 40),
        roof: rnd() > 0.5,
      });
    }
  }
  for (let i = 0; i < 7; i += 1) {
    boats.push({ x: range(rnd, 400, WORLD_LENGTH - 800), bob: range(rnd, 0, Math.PI * 2) });
  }
  return { palms, houses, boats };
}

export function buildWorld(mission) {
  const rnd = mulberry32(mission.seed);
  const islands = makeIslands(rnd);
  const decor = makeDecor(rnd, islands);
  const runwayIsland = islands[islands.length - 1];
  const runway = {
    x0: runwayIsland.centre - 420,
    x1: runwayIsland.centre + 420,
    alt: runwayIsland.height * 0.55,
  };
  const rings = mission.rings.map((r, i) => ({
    x: r.x,
    alt: r.alt,
    index: i,
    refuel: mission.refuelRings.includes(i),
    taken: false,
  }));

  function groundHeight(x) {
    if (x < 0) return 55;
    // Home strip: flat ground for the takeoff roll, on every seed.
    if (x < 1100) return 55;
    if (x > WORLD_LENGTH) return islands[islands.length - 1].height * 0.4;
    let h = 0;
    for (const island of islands) h += bump(x, island.centre, island.width, island.height);
    if (x >= runway.x0 && x <= runway.x1) return runway.alt;
    return h;
  }

  function groundSlope(x) {
    return (groundHeight(x + 8) - groundHeight(x - 8)) / 16;
  }

  return {
    mission,
    islands,
    decor,
    runway,
    rings,
    startX: 320,
    startAlt: 0,
    length: WORLD_LENGTH,
    groundHeight,
    groundSlope,
    nextRing() {
      return rings.find((r) => !r.taken) ?? null;
    },
    ringsLeft() {
      return rings.filter((r) => !r.taken).length;
    },
    reset() {
      for (const r of rings) r.taken = false;
    },
  };
}

export function ringHit(plane, ring, radius) {
  const dx = plane.x - ring.x;
  const dy = plane.alt - ring.alt;
  return dx * dx + dy * dy < radius * radius;
}

export function clampToWorld(x) {
  return clamp(x, 0, WORLD_LENGTH + 600);
}
