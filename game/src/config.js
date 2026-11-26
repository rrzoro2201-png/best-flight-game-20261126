// Langit Senja — configuration: screen, physics, palette and the three missions.
// One mission is one sortie: rings to fly through in order, then a runway landing.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const PX_PER_M = 4; // 4 world pixels make one metre on the HUD
export const KMH_PER_PX = 0.9; // world px/s to km/h on the HUD

export const PLANE = {
  cruiseSpeed: 175, // px/s at full throttle
  maxSpeed: 235,
  stallSpeed: 92,
  accel: 90, // px/s^2 toward the throttle target
  maxPitch: 0.44, // radians, about 25 degrees
  pitchRate: 1.5, // radians/s the pilot can command
  pitchSettle: 0.9, // radians/s the nose returns toward level
  sinkRate: 140, // px/s the plane sinks when stalled, scaled by the shortfall
  fuelCapacity: 100,
  fuelBase: 0.5, // per second at idle
  fuelThrottle: 0.7, // per second at full throttle
  fuelBoost: 2.2, // extra per second while boosting
  boostSpeed: 1.3, // speed multiplier while boosting
  ringRadius: 46, // px: how close the nose must pass to a ring's centre
  landSpeedMax: 165, // px/s above this, touching the runway is a crash
  landSinkMax: 95, // px/s of descent above this, touching the runway is a crash
};

export const COLOURS = {
  skyTop: '#2b3a67',
  skyMid: '#c65d7b',
  skyLow: '#f6a45c',
  sunCore: '#ffe9a8',
  sunGlow: '#ffb347',
  seaDeep: '#1d4e6b',
  seaLight: '#2f7ea6',
  sand: '#e8cf9a',
  grass: '#4d8a4a',
  grassDark: '#356b38',
  hill: '#2f6b34',
  rock: '#7a6a58',
  runway: '#3a3f4a',
  runwayLine: '#f5f0dc',
  ring: '#ffd94a',
  ringGlow: '#ff9d2e',
  planeBody: '#e8542f',
  planeWing: '#f6f1e3',
  planeGlass: '#9fd8ef',
  hudPanel: 'rgba(12, 18, 32, 0.82)',
  hudText: '#eaf6ff',
  hudAmber: '#ffcf4d',
  hudGreen: '#7ee081',
  hudRed: '#ff5a4d',
};

export const MISSIONS = [
  {
    id: 1,
    name: 'Island Hop',
    tag: 'Six rings, a gentle evening, full tanks',
    seed: 11,
    timeLimit: 240,
    wind: 0,
    fuel: 100,
    rings: [
      { x: 1500, alt: 330 }, { x: 3000, alt: 330 }, { x: 4500, alt: 360 },
      { x: 6000, alt: 240 }, { x: 7600, alt: 340 }, { x: 9200, alt: 300 },
    ],
    refuelRings: [],
  },
  {
    id: 2,
    name: 'Sunset Courier',
    tag: 'Eight rings against the clock — speed pays',
    seed: 27,
    timeLimit: 150,
    wind: 0,
    fuel: 100,
    rings: [
      { x: 1300, alt: 300 }, { x: 2600, alt: 380 }, { x: 3900, alt: 240 },
      { x: 5200, alt: 400 }, { x: 6500, alt: 280 }, { x: 7800, alt: 380 },
      { x: 9100, alt: 260 }, { x: 9900, alt: 330 },
    ],
    refuelRings: [],
  },
  {
    id: 3,
    name: 'Storm Run',
    tag: 'Gusts off the sea and thin fuel — green rings refuel',
    seed: 43,
    timeLimit: 240,
    wind: 1,
    fuel: 55,
    rings: [
      { x: 1600, alt: 320 }, { x: 3400, alt: 380 }, { x: 5200, alt: 420 },
      { x: 7000, alt: 430 }, { x: 8800, alt: 330 },
    ],
    refuelRings: [1, 3], // ring indexes (0-based) that refill the tanks
  },
];

export const SCORES = { ring: 100, refuel: 25, land: 500, timeBonus: 5, fuelBonus: 3 };
