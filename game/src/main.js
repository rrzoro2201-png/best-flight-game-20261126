// Langit Senja — the game: loop, states, scoring and wiring.
// Title -> flying -> landed or crashed, with three sorties to choose from.
import { VIEW, STEP, MISSIONS, SCORES, PLANE } from './config.js';
import { buildWorld, ringHit, clampToWorld } from './world.js';
import { makePlane, stepPlane } from './plane.js';
import { drawScene, SCREEN_TITLE, SCREEN_PLAY, SCREEN_PAUSED, SCREEN_LANDED, SCREEN_OVER } from './render.js';
import { makeInput, attachInput, controlFromInput } from './input.js';
import { makeAudio } from './audio.js';
import { stageShot } from './shots.js';

const BEST_KEY = 'langit-senja-best';

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.missions = MISSIONS;
    this.selectedMission = 0;
    this.best = Number(localStorage.getItem(BEST_KEY) ?? 0) || 0;
    this.input = makeInput();
    this.audio = makeAudio();
    this.screen = SCREEN_TITLE;
    this.time = 0;
    this.camAlt = 0;
    this.frozen = false;
    this.flash = null;
    this.flashUntil = 0;
    this.world = buildWorld(MISSIONS[0]);
    this.plane = makePlane(this.world);
    this.score = 0;
    this.timeLeft = MISSIONS[0].timeLimit;
    this.landBonus = 0;
    this.timeBonus = 0;
    this.fuelBonus = 0;
    this.crashReason = '';
    this.warnedFuel = false;
    this.lastTime = 0;
    if (canvas) attachInput(this.input, canvas);
  }

  get mission() {
    return this.missions[this.selectedMission];
  }

  start(missionIndex, quiet = false) {
    this.selectedMission = missionIndex;
    this.world = buildWorld(this.mission);
    this.plane = makePlane(this.world);
    this.plane.fuel = this.mission.fuel;
    this.score = 0;
    this.timeLeft = this.mission.timeLimit;
    this.landBonus = 0;
    this.timeBonus = 0;
    this.fuelBonus = 0;
    this.crashReason = '';
    this.warnedFuel = false;
    this.camAlt = 0;
    this.screen = SCREEN_PLAY;
    if (!quiet) this.audio.ensure();
  }

  showFlash(text, ms = 1600) {
    this.flash = text;
    this.flashUntil = performance.now() + ms;
  }

  gustAt(time) {
    if (!this.mission.wind) return 0;
    return Math.sin(time * 0.9) * 46 + Math.sin(time * 2.3 + 1.7) * 26;
  }

  step(dt, ctl, silent = false) {
    if (this.screen !== SCREEN_PLAY) return;
    this.time += dt;
    const plane = this.plane;
    const wasGrounded = plane.grounded;
    plane.throttle = ctl.throttle > 0 ? Math.min(1, plane.throttle + dt * 1.6) : ctl.throttle < 0 ? Math.max(0, plane.throttle - dt * 1.6) : plane.throttle;
    plane.boost = ctl.boost && plane.fuel > 0;
    stepPlane(plane, this.world, ctl, this.gustAt(this.time), dt);
    plane.x = clampToWorld(plane.x);

    if (!silent) {
      this.audio.setEngine(plane.throttle, plane.boost, !plane.grounded);
      if (plane.fuel < 25 && !this.warnedFuel) {
        this.warnedFuel = true;
        this.showFlash('LOW FUEL — find a green ring');
        this.audio.warn();
      }
    }

    // Rings.
    const next = this.world.nextRing();
    if (next && ringHit(plane, next, PLANE.ringRadius)) {
      next.taken = true;
      this.score += SCORES.ring;
      if (next.refuel) {
        plane.fuel = 100;
        this.score += SCORES.refuel;
        this.showFlash(`RING ${next.index + 1} — REFUELLED +${SCORES.refuel}`);
      } else {
        this.showFlash(`RING ${next.index + 1}  +${SCORES.ring}`);
      }
      if (!silent) this.audio.ring();
    }

    // Clock.
    this.timeLeft -= dt;
    if (this.timeLeft <= 0 && !plane.landed && !plane.crashed) {
      plane.crashed = true;
      this.crashReason = 'Out of time — the sun set on the sortie.';
    }

    if (plane.landed) {
      this.landBonus = SCORES.land;
      this.timeBonus = Math.round(Math.max(0, this.timeLeft) * SCORES.timeBonus);
      this.fuelBonus = Math.round(plane.fuel * SCORES.fuelBonus);
      this.score += this.landBonus + this.timeBonus + this.fuelBonus;
      this.screen = SCREEN_LANDED;
      this.finish();
      if (!silent) this.audio.land();
    } else if (plane.crashed) {
      if (!this.crashReason) {
        this.crashReason = plane.alt <= 2 ? 'Ditched in the sea.' : 'Into the hillside.';
      }
      this.screen = SCREEN_OVER;
      this.finish();
      if (!silent) this.audio.crash();
    }
    void wasGrounded;
  }

  finish() {
    if (this.score > this.best) {
      this.best = this.score;
      try {
        localStorage.setItem(BEST_KEY, String(this.best));
      } catch {
        // Private mode: the best score just lives for this session.
      }
    }
  }

  handleKeys() {
    const input = this.input;
    if (input.down('KeyM')) {
      this.audio.muted = !this.audio.muted;
      input.keys.delete('KeyM');
    }
    if (this.screen === SCREEN_TITLE) {
      if (input.down('Digit1')) { this.selectedMission = 0; input.keys.delete('Digit1'); }
      if (input.down('Digit2')) { this.selectedMission = 1; input.keys.delete('Digit2'); }
      if (input.down('Digit3')) { this.selectedMission = 2; input.keys.delete('Digit3'); }
      if (input.down('Enter') || input.down('Space')) {
        input.keys.delete('Enter');
        input.keys.delete('Space');
        this.start(this.selectedMission);
      }
      return;
    }
    if (this.screen === SCREEN_PLAY) {
      if (input.down('KeyP') || input.down('Escape')) {
        input.keys.delete('KeyP');
        input.keys.delete('Escape');
        this.screen = SCREEN_PAUSED;
      }
      return;
    }
    if (this.screen === SCREEN_PAUSED) {
      if (input.down('KeyP') || input.down('Escape') || input.down('Enter')) {
        input.keys.delete('KeyP');
        input.keys.delete('Escape');
        input.keys.delete('Enter');
        this.screen = SCREEN_PLAY;
      }
      return;
    }
    // Landed or crashed.
    if (input.down('KeyR') || input.down('Enter') || input.down('Space')) {
      input.keys.delete('KeyR');
      input.keys.delete('Enter');
      input.keys.delete('Space');
      this.start(this.selectedMission);
      return;
    }
    if (input.down('Digit1')) { this.selectedMission = 0; input.keys.delete('Digit1'); this.start(0); }
    if (input.down('Digit2')) { this.selectedMission = 1; input.keys.delete('Digit2'); this.start(1); }
    if (input.down('Digit3')) { this.selectedMission = 2; input.keys.delete('Digit3'); this.start(2); }
  }

  handleClick() {
    const click = this.input.clicked;
    if (!click) return;
    this.input.clicked = null;
    this.audio.ensure();
    if (this.screen === SCREEN_TITLE) {
      // Mission rows sit between y=300 and y=492, centred.
      if (click.x > VIEW.width / 2 - 330 && click.x < VIEW.width / 2 + 330) {
        for (let i = 0; i < 3; i += 1) {
          if (click.y >= 300 + i * 64 && click.y <= 352 + i * 64) {
            this.selectedMission = i;
            this.start(i);
            return;
          }
        }
      }
      this.start(this.selectedMission);
      return;
    }
    if (this.screen === SCREEN_LANDED || this.screen === SCREEN_OVER) {
      this.start(this.selectedMission);
    }
  }

  frame(now) {
    const dt = Math.min(0.05, (now - this.lastTime) / 1000 || STEP);
    this.lastTime = now;
    if (!this.frozen) {
      this.handleKeys();
      this.handleClick();
      if (this.screen === SCREEN_PLAY) {
        const ctl = controlFromInput(this.input);
        let acc = 0;
        while (acc < dt) {
          const step = Math.min(STEP, dt - acc);
          this.step(step, ctl);
          acc += step;
        }
      }
    }
    drawScene(this.ctx, this, now / 1000);
    requestAnimationFrame((t) => this.frame(t));
  }

  // Headless self-test: fly the selected mission with the autopilot and
  // report the outcome. Used with ?selftest=1 to prove the game completes.
  // (The test itself lives in boot() below, where the autopilot is imported.)
}

export function boot() {
  const canvas = document.getElementById('game');
  const params = new URLSearchParams(location.search);
  const game = new Game(canvas);
  const shot = params.get('shot');
  if (shot) {
    const seed = Number(params.get('seed') ?? 1);
    void seed;
    game.frozen = true;
    game.screen = stageShot(shot, game);
    game.time = 0;
    drawScene(game.ctx, game, 0);
    requestAnimationFrame((t) => game.frame(t));
    return game;
  }
  if (params.get('selftest') === '1') {
    // The self-test runs in the page: import the autopilot lazily so the
    // normal game never pays for it.
    import('./shots.js').then(({ autopilot }) => {
      const missionIndex = Number(params.get('mission') ?? 0);
      game.start(missionIndex, true);
      let steps = 0;
      const max = 600 / STEP;
      while (!game.plane.crashed && !game.plane.landed && steps < max) {
        game.step(STEP, autopilot(game), true);
        steps += 1;
      }
      const result = {
        mission: game.mission.name,
        landed: game.plane.landed,
        crashed: game.plane.crashed,
        score: game.score,
        rings: game.world.rings.filter((r) => r.taken).length,
        ringsTotal: game.world.rings.length,
        fuel: Math.round(game.plane.fuel),
        timeLeft: Math.round(game.timeLeft),
        steps,
      };
      document.title = `SELFTEST ${JSON.stringify(result)}`;
      const status = document.getElementById('status');
      if (status) status.textContent = JSON.stringify(result);
    });
    return game;
  }
  requestAnimationFrame((t) => game.frame(t));
  return game;
}

boot();
