// Langit Senja — the aircraft: its state, its physics and its drawing.
// Side view, nose to the right: fuselage, glass, wing, tail, a spinning prop,
// navigation lights and gear that drops when slow and low.
import { PLANE } from './config.js';
import { clamp, lerp } from './random.js';

export function makePlane(world) {
  return {
    x: world.startX,
    alt: world.groundHeight(world.startX) + 2,
    speed: 0,
    pitch: 0,
    throttle: 0,
    boost: false,
    fuel: 100,
    propAngle: 0,
    grounded: true,
    crashed: false,
    landed: false,
    distance: 0,
  };
}

// One physics step. `ctl` is { climb: -1|0|1, throttle: -1|0|1, boost: bool },
// `gust` is the wind's vertical push this step (px/s), `dt` seconds.
export function stepPlane(plane, world, ctl, gust, dt) {
  if (plane.crashed || plane.landed) return;
  const target = clamp(plane.throttle, 0, 1) * PLANE.cruiseSpeed * (plane.boost ? PLANE.boostSpeed : 1);
  const accel = plane.throttle > 0 ? PLANE.accel : PLANE.accel * 0.7;
  plane.speed += clamp(target - plane.speed, -accel * dt, accel * dt);
  plane.speed = clamp(plane.speed, 0, PLANE.maxSpeed * 1.15);

  const wantPitch = ctl.climb * PLANE.maxPitch;
  plane.pitch += clamp(wantPitch - plane.pitch, -PLANE.pitchRate * dt, PLANE.pitchRate * dt);
  if (ctl.climb === 0) plane.pitch = lerp(plane.pitch, 0, Math.min(1, PLANE.pitchSettle * dt));

  const burn = PLANE.fuelBase + plane.throttle * PLANE.fuelThrottle + (plane.boost ? PLANE.fuelBoost : 0);
  plane.fuel = Math.max(0, plane.fuel - burn * dt);
  if (plane.fuel <= 0) {
    plane.throttle = 0;
    plane.boost = false;
  }
  plane.propAngle += (2 + plane.throttle * 26) * dt;

  const groundNow = world.groundHeight(plane.x);
  if (plane.grounded) {
    // Takeoff roll: the wheels hold the plane to the ground until it has
    // flying speed and the pilot pulls up. Rolling into the sea is a ditch.
    if (groundNow <= 2) {
      plane.crashed = true;
      return;
    }
    plane.alt = groundNow + 1;
    plane.x += plane.speed * dt;
    plane.distance += plane.speed * dt;
    if (plane.speed > PLANE.stallSpeed * 0.9 && ctl.climb > 0) {
      plane.grounded = false;
      plane.alt += 2;
    }
    return;
  }

  // Airborne: lift comes from speed; below stall speed the nose drops and
  // the plane sinks. The wind is weakest near the ground (boundary layer),
  // so gusts fade as the plane nears the terrain — landings stay fair.
  const heightAboveGround = plane.alt - world.groundHeight(plane.x);
  const gustHere = gust * clamp(heightAboveGround / 150, 0.15, 1);
  let climbRate = Math.sin(plane.pitch) * plane.speed + gustHere;
  if (plane.speed < PLANE.stallSpeed) {
    const shortfall = (PLANE.stallSpeed - plane.speed) / PLANE.stallSpeed;
    climbRate -= PLANE.sinkRate * shortfall;
  }
  plane.alt += climbRate * dt;
  plane.x += plane.speed * dt;
  plane.distance += plane.speed * dt;

  const ground = world.groundHeight(plane.x);
  const onRunway = plane.x >= world.runway.x0 && plane.x <= world.runway.x1;
  if (plane.alt <= ground + 1) {
    plane.alt = ground + 1;
    const gentle = onRunway && plane.speed <= PLANE.landSpeedMax && climbRate >= -PLANE.landSinkMax;
    if (gentle) {
      plane.landed = true;
      plane.grounded = true;
      plane.pitch = 0;
    } else {
      plane.crashed = true;
    }
  }
}

export function drawPlane(ctx, plane, screenX, screenY, scale) {
  const s = scale;
  ctx.save();
  ctx.translate(screenX, screenY);
  ctx.rotate(-plane.pitch * 0.6);
  ctx.scale(s, s);

  const body = '#e8542f';
  const cream = '#f6f1e3';
  const dark = '#26221f';
  // Tail
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-34, -4); ctx.lineTo(-46, -20); ctx.lineTo(-38, -20); ctx.lineTo(-26, -4);
  ctx.closePath(); ctx.fill();
  ctx.fillRect(-46, -4, 22, 3);
  // Fuselage
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.moveTo(-38, -6);
  ctx.quadraticCurveTo(10, -14, 34, -4);
  ctx.quadraticCurveTo(38, 0, 30, 3);
  ctx.lineTo(-34, 5);
  ctx.quadraticCurveTo(-40, 0, -38, -6);
  ctx.fill();
  // Cream cheatline
  ctx.fillStyle = cream;
  ctx.fillRect(-30, -2, 56, 3);
  // Cockpit glass
  ctx.fillStyle = '#9fd8ef';
  ctx.beginPath();
  ctx.moveTo(6, -10); ctx.lineTo(20, -9); ctx.lineTo(24, -3); ctx.lineTo(4, -3);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke();
  // Wing
  ctx.fillStyle = cream;
  ctx.beginPath();
  ctx.moveTo(-6, 2); ctx.lineTo(10, 2); ctx.lineTo(4, 22); ctx.lineTo(-12, 22);
  ctx.closePath(); ctx.fill();
  ctx.strokeStyle = dark; ctx.stroke();
  // Propeller
  const pa = plane.propAngle;
  ctx.strokeStyle = dark; ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(36 + Math.cos(pa) * 15, -2 + Math.sin(pa) * 15);
  ctx.lineTo(36 - Math.cos(pa) * 15, -2 - Math.sin(pa) * 15);
  ctx.stroke();
  ctx.fillStyle = dark;
  ctx.beginPath(); ctx.arc(36, -2, 3, 0, Math.PI * 2); ctx.fill();
  // Navigation lights
  ctx.fillStyle = '#ff5a4d';
  ctx.beginPath(); ctx.arc(-40, -19, 2.2, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#7ee081';
  ctx.beginPath(); ctx.arc(4, 22, 2.2, 0, Math.PI * 2); ctx.fill();
  // Gear, dropped when slow and low
  if (plane.speed < 150) {
    ctx.strokeStyle = dark; ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-18, 4); ctx.lineTo(-18, 12);
    ctx.moveTo(14, 4); ctx.lineTo(14, 12);
    ctx.stroke();
    ctx.fillStyle = dark;
    ctx.beginPath(); ctx.arc(-18, 13, 2.6, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(14, 13, 2.6, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}
