// Langit Senja — rendering: dusk sky, sea, islands, rings, runway, the plane
// and the lit instrument panel. Everything is drawn, nothing is an image file.
import { VIEW, COLOURS, PX_PER_M, KMH_PER_PX } from './config.js';
import { clamp, lerp } from './random.js';
import { drawPlane } from './plane.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_LANDED = 'landed';
export const SCREEN_OVER = 'over';

function skyGradient(ctx) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, COLOURS.skyTop);
  g.addColorStop(0.45, COLOURS.skyMid);
  g.addColorStop(0.75, COLOURS.skyLow);
  g.addColorStop(1, '#f7c873');
  return g;
}

function drawSky(ctx, time) {
  ctx.fillStyle = skyGradient(ctx);
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Low sun with a halo, hanging over the sea.
  const sx = VIEW.width * 0.72;
  const sy = VIEW.height * 0.52;
  const halo = ctx.createRadialGradient(sx, sy, 10, sx, sy, 180);
  halo.addColorStop(0, 'rgba(255, 210, 120, 0.9)');
  halo.addColorStop(1, 'rgba(255, 180, 80, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(sx - 200, sy - 200, 400, 400);
  ctx.fillStyle = COLOURS.sunCore;
  ctx.beginPath(); ctx.arc(sx, sy, 34, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = COLOURS.sunGlow;
  ctx.beginPath(); ctx.arc(sx, sy, 40, 0, Math.PI * 2); ctx.globalAlpha = 0.35; ctx.fill(); ctx.globalAlpha = 1;
  // A few early stars up high.
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  for (let i = 0; i < 24; i += 1) {
    const x = (i * 397 + 53) % VIEW.width;
    const y = (i * 173 + 29) % 150;
    ctx.fillRect(x, y, 2, 2);
  }
  void time;
}

function drawClouds(ctx, camX, camAlt) {
  // Puffy dusk clouds, each one a cluster of soft ellipses. Positions are a
  // fixed function of the layer and index, so the clouds never flicker.
  for (let layer = 0; layer < 3; layer += 1) {
    const par = 0.25 + layer * 0.2;
    for (let i = 0; i < 5; i += 1) {
      const seed = (i * 73 + layer * 131) % 100 / 100;
      const wx = i * 520 + layer * 190 + seed * 120;
      const x = ((wx - camX * par) % 2600 + 2600) % 2600 - 200;
      const y = 56 + layer * 62 + seed * 34 - camAlt * 0.04 * par;
      const s = 0.8 + seed * 0.7;
      const alpha = 0.4 + seed * 0.25;
      ctx.fillStyle = `rgba(255, 216, 182, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, 78 * s, 15 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x - 42 * s, y + 5 * s, 46 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 48 * s, y + 4 * s, 52 * s, 12 * s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 6 * s, y - 9 * s, 40 * s, 11 * s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

function drawSea(ctx, camAlt) {
  const horizon = VIEW.height - camAlt - 40;
  if (horizon >= VIEW.height) return;
  const g = ctx.createLinearGradient(0, Math.max(0, horizon), 0, VIEW.height);
  g.addColorStop(0, COLOURS.seaLight);
  g.addColorStop(1, COLOURS.seaDeep);
  ctx.fillStyle = g;
  ctx.fillRect(0, Math.max(0, horizon), VIEW.width, VIEW.height - Math.max(0, horizon));
  // Sun glitter on the water.
  ctx.fillStyle = 'rgba(255, 210, 130, 0.5)';
  const sx = VIEW.width * 0.72;
  for (let i = 0; i < 12; i += 1) {
    const y = horizon + 14 + i * 12;
    const w = 30 + i * 9;
    ctx.fillRect(sx - w / 2, y, w, 2);
  }
  // Wave lines.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 8; i += 1) {
    const y = horizon + 26 + i * 22;
    ctx.beginPath();
    for (let x = 0; x <= VIEW.width; x += 40) {
      const yy = y + Math.sin((x + i * 90) * 0.02) * 3;
      if (x === 0) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
    }
    ctx.stroke();
  }
}

function drawTerrain(ctx, world, camX, camAlt, time) {
  const toScreenX = (x) => x - camX;
  const toScreenY = (alt) => VIEW.height - (alt - camAlt) - 40;
  // Islands: sand edge, grass body, a dark hill cap.
  for (const island of world.islands) {
    const x0 = toScreenX(island.centre - island.width / 2);
    const x1 = toScreenX(island.centre + island.width / 2);
    if (x1 < -50 || x0 > VIEW.width + 50) continue;
    ctx.beginPath();
    ctx.moveTo(x0, VIEW.height);
    for (let x = x0; x <= x1; x += 12) {
      ctx.lineTo(x, toScreenY(world.groundHeight(x + camX)));
    }
    ctx.lineTo(x1, VIEW.height);
    ctx.closePath();
    ctx.fillStyle = COLOURS.grass;
    ctx.fill();
    // Beach rim where the hill meets the sea.
    ctx.strokeStyle = COLOURS.sand;
    ctx.lineWidth = 5;
    ctx.beginPath();
    for (let x = x0; x <= x1; x += 12) {
      const y = toScreenY(world.groundHeight(x + camX));
      if (x === x0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.stroke();
    // Hill cap.
    ctx.fillStyle = COLOURS.hill;
    ctx.beginPath();
    ctx.ellipse(toScreenX(island.centre), toScreenY(island.height * 0.72), island.width * 0.22, island.height * 0.24, 0, Math.PI, 0);
    ctx.fill();
  }
  // Palms.
  ctx.strokeStyle = '#3a2c1e';
  ctx.lineWidth = 3;
  for (const palm of world.decor.palms) {
    const x = toScreenX(palm.x);
    if (x < -20 || x > VIEW.width + 20) continue;
    const y = toScreenY(world.groundHeight(palm.x));
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 4, y - 22, x + 10, y - 30); ctx.stroke();
    ctx.strokeStyle = COLOURS.grassDark;
    ctx.lineWidth = 2;
    for (let f = 0; f < 4; f += 1) {
      const a = -0.4 - f * 0.5;
      ctx.beginPath();
      ctx.moveTo(x + 10, y - 30);
      ctx.quadraticCurveTo(x + 10 + Math.cos(a) * 16, y - 30 + Math.sin(a) * 10, x + 10 + Math.cos(a) * 26, y - 30 + Math.sin(a) * 16);
      ctx.stroke();
    }
    ctx.strokeStyle = '#3a2c1e'; ctx.lineWidth = 3;
  }
  // Houses with warm windows.
  for (const house of world.decor.houses) {
    const x = toScreenX(house.x);
    if (x < -60 || x > VIEW.width + 60) continue;
    const y = toScreenY(world.groundHeight(house.x));
    ctx.fillStyle = '#f2e3c2';
    ctx.fillRect(x - house.w / 2, y - house.h, house.w, house.h);
    if (house.roof) {
      ctx.fillStyle = '#a34a2e';
      ctx.beginPath();
      ctx.moveTo(x - house.w / 2 - 4, y - house.h);
      ctx.lineTo(x, y - house.h - 14);
      ctx.lineTo(x + house.w / 2 + 4, y - house.h);
      ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = '#ffd94a';
    ctx.fillRect(x - 6, y - house.h + 8, 10, 10);
  }
  // Lighthouse on the runway island, beam sweeping.
  const lx = toScreenX(world.runway.x1 + 120);
  const ly = toScreenY(world.groundHeight(world.runway.x1 + 120));
  if (lx > -80 && lx < VIEW.width + 80) {
    ctx.fillStyle = '#f6f1e3';
    ctx.fillRect(lx - 8, ly - 64, 16, 64);
    ctx.fillStyle = '#c0392b';
    ctx.fillRect(lx - 8, ly - 48, 16, 10);
    ctx.fillRect(lx - 8, ly - 24, 16, 10);
    ctx.fillStyle = '#ffd94a';
    ctx.beginPath(); ctx.arc(lx, ly - 68, 5, 0, Math.PI * 2); ctx.fill();
    const beam = Math.sin(time * 0.6) * 0.5;
    const bg = ctx.createLinearGradient(lx, ly - 68, lx + 260, ly - 68 + beam * 260);
    bg.addColorStop(0, 'rgba(255, 217, 74, 0.35)');
    bg.addColorStop(1, 'rgba(255, 217, 74, 0)');
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.moveTo(lx, ly - 68);
    ctx.lineTo(lx + 260, ly - 68 + beam * 120 - 14);
    ctx.lineTo(lx + 260, ly - 68 + beam * 120 + 14);
    ctx.closePath(); ctx.fill();
  }
  // Boats bobbing on the sea.
  for (const boat of world.decor.boats) {
    const x = toScreenX(boat.x);
    if (x < -40 || x > VIEW.width + 40) continue;
    const y = toScreenY(0) + Math.sin(time * 1.4 + boat.bob) * 3;
    ctx.fillStyle = '#f6f1e3';
    ctx.beginPath();
    ctx.moveTo(x - 16, y); ctx.lineTo(x + 16, y); ctx.lineTo(x + 10, y + 8); ctx.lineTo(x - 10, y + 8);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e8542f';
    ctx.beginPath();
    ctx.moveTo(x, y - 18); ctx.lineTo(x, y); ctx.lineTo(x + 14, y - 2);
    ctx.closePath(); ctx.fill();
  }
  // Runway: flat strip, centre line, edge lights, windsock.
  const rx0 = toScreenX(world.runway.x0);
  const rx1 = toScreenX(world.runway.x1);
  const ry = toScreenY(world.runway.alt);
  if (rx1 > -50 && rx0 < VIEW.width + 50) {
    ctx.fillStyle = COLOURS.runway;
    ctx.fillRect(rx0, ry - 6, rx1 - rx0, 8);
    ctx.fillStyle = COLOURS.runwayLine;
    for (let x = rx0 + 14; x < rx1 - 10; x += 56) ctx.fillRect(x, ry - 3, 30, 3);
    ctx.fillStyle = '#ffd94a';
    for (let x = rx0 + 10; x < rx1; x += 70) {
      ctx.beginPath(); ctx.arc(x, ry - 10, 3, 0, Math.PI * 2); ctx.fill();
    }
    // Windsock.
    const wx = rx1 - 30;
    ctx.strokeStyle = '#26221f'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(wx, ry - 6); ctx.lineTo(wx, ry - 44); ctx.stroke();
    ctx.fillStyle = '#ff7a2e';
    ctx.beginPath();
    ctx.moveTo(wx, ry - 44);
    ctx.lineTo(wx + 26 + Math.sin(time * 2) * 3, ry - 40);
    ctx.lineTo(wx, ry - 34);
    ctx.closePath(); ctx.fill();
  }
}

function drawRings(ctx, world, camX, camAlt, time) {
  const toScreenX = (x) => x - camX;
  const toScreenY = (alt) => VIEW.height - (alt - camAlt) - 40;
  for (const ring of world.rings) {
    const x = toScreenX(ring.x);
    const y = toScreenY(ring.alt);
    if (x < -80 || x > VIEW.width + 80) continue;
    if (ring.taken) continue;
    const pulse = 1 + Math.sin(time * 3 + ring.index) * 0.06;
    const r = 46 * pulse;
    const glow = ctx.createRadialGradient(x, y, r * 0.4, x, y, r * 1.6);
    glow.addColorStop(0, ring.refuel ? 'rgba(126, 224, 129, 0.35)' : 'rgba(255, 157, 46, 0.30)');
    glow.addColorStop(1, 'rgba(255, 157, 46, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(x - r * 1.7, y - r * 1.7, r * 3.4, r * 3.4);
    ctx.strokeStyle = ring.refuel ? COLOURS.hudGreen : COLOURS.ring;
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = COLOURS.ringGlow;
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(x, y, r - 7, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(ring.index + 1), x, y);
  }
  // Arrow to the next ring when it is off screen.
  const next = world.nextRing();
  if (next) {
    const x = toScreenX(next.x);
    if (x > VIEW.width + 40) {
      const y = toScreenY(next.alt);
      ctx.fillStyle = COLOURS.ring;
      ctx.beginPath();
      ctx.moveTo(VIEW.width - 60, y - 12);
      ctx.lineTo(VIEW.width - 30, y);
      ctx.lineTo(VIEW.width - 60, y + 12);
      ctx.closePath(); ctx.fill();
      ctx.font = 'bold 13px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`RING ${next.index + 1}`, VIEW.width - 70, y + 4);
    }
  }
}

function drawHud(ctx, game) {
  const { plane, world, score, timeLeft, best, mission } = game;
  const altM = Math.max(0, Math.round(plane.alt / PX_PER_M));
  const speedKmh = Math.round(plane.speed * KMH_PER_PX);
  const hdg = Math.round((plane.pitch * 180) / Math.PI);
  const panelY = VIEW.height - 86;

  // Top bar: mission, score, rings, time.
  ctx.fillStyle = COLOURS.hudPanel;
  ctx.fillRect(0, 0, VIEW.width, 44);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = 'bold 17px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(`LANGIT SENJA — ${mission.name.toUpperCase()}`, 14, 22);
  ctx.font = '15px sans-serif';
  ctx.fillText(`RING ${world.rings.filter((r) => r.taken).length}/${world.rings.length}`, 430, 22);
  ctx.textAlign = 'right';
  ctx.fillText(`SCORE ${score}`, VIEW.width - 250, 22);
  const t = Math.max(0, Math.ceil(timeLeft));
  ctx.fillStyle = t <= 30 ? COLOURS.hudRed : COLOURS.hudText;
  ctx.fillText(`TIME ${Math.floor(t / 60)}:${String(t % 60).padStart(2, '0')}`, VIEW.width - 120, 22);
  ctx.fillStyle = COLOURS.hudText;
  ctx.fillText(`BEST ${best}`, VIEW.width - 14, 22);

  // Instrument panel along the bottom.
  ctx.fillStyle = COLOURS.hudPanel;
  ctx.fillRect(0, panelY, VIEW.width, 86);
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 1;
  ctx.beginPath(); ctx.moveTo(0, panelY); ctx.lineTo(VIEW.width, panelY); ctx.stroke();

  function gauge(x, label, value, unit, warn) {
    ctx.fillStyle = warn ? COLOURS.hudRed : COLOURS.hudAmber;
    ctx.font = 'bold 11px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(label, x, panelY + 16);
    ctx.fillStyle = COLOURS.hudText;
    ctx.font = 'bold 26px monospace';
    ctx.fillText(String(value), x, panelY + 44);
    ctx.font = '11px sans-serif';
    ctx.fillStyle = 'rgba(234,246,255,0.7)';
    ctx.fillText(unit, x, panelY + 66);
  }
  gauge(90, 'ALTITUDE', altM, 'm', altM < 40 && plane.speed > 60);
  gauge(240, 'SPEED', speedKmh, 'km/h', plane.speed < 95);
  gauge(390, 'HEADING', `${hdg >= 0 ? '+' : ''}${hdg}°`, 'climb', false);
  gauge(540, 'THROTTLE', `${Math.round(plane.throttle * 100)}%`, plane.boost ? 'BOOST' : 'power', false);

  // Fuel gauge.
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('FUEL', 690, panelY + 16);
  ctx.fillStyle = 'rgba(255,255,255,0.18)';
  ctx.fillRect(630, panelY + 30, 120, 14);
  ctx.fillStyle = plane.fuel < 25 ? COLOURS.hudRed : COLOURS.hudGreen;
  ctx.fillRect(630, panelY + 30, 120 * clamp(plane.fuel / 100, 0, 1), 14);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = 'bold 15px monospace';
  ctx.fillText(`${Math.round(plane.fuel)}%`, 690, panelY + 64);
  if (plane.fuel < 25) {
    ctx.fillStyle = Math.floor(performance.now() / 300) % 2 ? COLOURS.hudRed : COLOURS.hudAmber;
    ctx.beginPath(); ctx.arc(770, panelY + 37, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = COLOURS.hudRed;
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('LOW', 770, panelY + 64);
  }

  // Attitude indicator: a ball with a moving horizon.
  const cx = 880;
  const cy = panelY + 38;
  ctx.save();
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.clip();
  ctx.fillStyle = '#3d7ab8';
  ctx.fillRect(cx - 32, cy - 32, 64, 64);
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(-plane.pitch * 0.9);
  ctx.fillStyle = '#c98a4b';
  ctx.fillRect(-32, 0, 64, 32);
  ctx.fillStyle = '#3d7ab8';
  ctx.fillRect(-32, -32, 64, 32);
  ctx.fillStyle = '#fff';
  ctx.fillRect(-32, -1, 64, 2);
  ctx.restore();
  ctx.restore();
  ctx.strokeStyle = COLOURS.hudText;
  ctx.lineWidth = 2;
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI * 2); ctx.stroke();
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.font = 'bold 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('ATTITUDE', cx, panelY + 72);

  // Compass strip.
  const compassX = 1010;
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.font = 'bold 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('COMPASS', compassX + 90, panelY + 16);
  const headings = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const base = Math.round(((plane.pitch * 180) / Math.PI + 90) / 45);
  for (let i = -2; i <= 2; i += 1) {
    const h = headings[((base + i) % 8 + 8) % 8];
    ctx.fillStyle = i === 0 ? COLOURS.hudText : 'rgba(234,246,255,0.55)';
    ctx.font = i === 0 ? 'bold 16px monospace' : '13px monospace';
    ctx.fillText(h, compassX + 90 + i * 36, panelY + 44);
  }
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.beginPath();
  ctx.moveTo(compassX + 90, panelY + 56);
  ctx.lineTo(compassX + 84, panelY + 48);
  ctx.lineTo(compassX + 96, panelY + 48);
  ctx.closePath(); ctx.fill();

  // Centre flash messages.
  if (game.flash && game.flashUntil > performance.now()) {
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(12, 18, 32, 0.55)';
    const w = ctx.measureText(game.flash).width + 36;
    ctx.fillRect(VIEW.width / 2 - w / 2, 130, w, 52);
    ctx.fillStyle = COLOURS.hudAmber;
    ctx.fillText(game.flash, VIEW.width / 2, 158);
  }
}

function drawTitle(ctx, game) {
  ctx.fillStyle = 'rgba(12, 18, 32, 0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffe9a8';
  ctx.font = 'bold 64px serif';
  ctx.fillText('LANGIT SENJA', VIEW.width / 2, 150);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = '22px sans-serif';
  ctx.fillText('Island Run — fly the rings, mind the fuel, land on the strip', VIEW.width / 2, 190);
  ctx.font = 'bold 18px sans-serif';
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.fillText('CHOOSE YOUR SORTIE  —  press 1, 2 or 3', VIEW.width / 2, 260);
  const missions = game.missions;
  missions.forEach((m, i) => {
    const y = 300 + i * 64;
    const selected = game.selectedMission === i;
    ctx.fillStyle = selected ? 'rgba(255, 217, 74, 0.16)' : 'rgba(12, 18, 32, 0.6)';
    ctx.fillRect(VIEW.width / 2 - 330, y, 660, 52);
    ctx.strokeStyle = selected ? COLOURS.ring : 'rgba(255,255,255,0.3)';
    ctx.lineWidth = selected ? 2 : 1;
    ctx.strokeRect(VIEW.width / 2 - 330, y, 660, 52);
    ctx.fillStyle = COLOURS.hudText;
    ctx.font = 'bold 20px sans-serif';
    ctx.textAlign = 'left';
    ctx.fillText(`${i + 1}. ${m.name}`, VIEW.width / 2 - 310, y + 22);
    ctx.font = '15px sans-serif';
    ctx.fillStyle = 'rgba(234,246,255,0.8)';
    ctx.fillText(m.tag, VIEW.width / 2 - 310, y + 42);
    ctx.textAlign = 'right';
    ctx.fillStyle = COLOURS.hudAmber;
    ctx.fillText(`${m.rings.length} rings · ${Math.floor(m.timeLimit / 60)}:${String(m.timeLimit % 60).padStart(2, '0')}`, VIEW.width / 2 + 310, y + 32);
  });
  ctx.fillStyle = 'rgba(234,246,255,0.85)';
  ctx.font = '16px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('↑ climb · ↓ descend · → throttle up · ← throttle down · SPACE boost · P pause · M mute', VIEW.width / 2, 530);
  ctx.fillText('Click a mission or press Enter to fly the selected one', VIEW.width / 2, 560);
  if (game.best > 0) {
    ctx.fillStyle = COLOURS.hudAmber;
    ctx.font = 'bold 16px sans-serif';
    ctx.fillText(`BEST SCORE ${game.best}`, VIEW.width / 2, 600);
  }
}

function drawEnd(ctx, game, landed) {
  ctx.fillStyle = 'rgba(12, 18, 32, 0.6)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.textAlign = 'center';
  ctx.fillStyle = landed ? COLOURS.hudGreen : COLOURS.hudRed;
  ctx.font = 'bold 52px sans-serif';
  ctx.fillText(landed ? 'LANDED — SORTIE COMPLETE' : 'CRASHED', VIEW.width / 2, 220);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = '20px sans-serif';
  const lines = landed
    ? [`Rings flown: ${game.world.rings.filter((r) => r.taken).length} of ${game.world.rings.length}`, `Landing bonus +${game.landBonus}`, `Time bonus +${game.timeBonus}`, `Fuel bonus +${game.fuelBonus}`]
    : [game.crashReason || 'The sea is not a runway.'];
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, 280 + i * 32));
  ctx.fillStyle = COLOURS.hudAmber;
  ctx.font = 'bold 30px sans-serif';
  ctx.fillText(`SCORE ${game.score}`, VIEW.width / 2, 280 + lines.length * 32 + 20);
  ctx.fillStyle = COLOURS.hudText;
  ctx.font = '18px sans-serif';
  ctx.fillText('Press R or Enter to fly again — 1, 2 or 3 to change sortie', VIEW.width / 2, 280 + lines.length * 32 + 60);
}

export function drawScene(ctx, game, time) {
  const { plane, world } = game;
  const camX = clamp(plane.x - VIEW.width * 0.35, -80, world.length - VIEW.width + 200);
  const wantAlt = clamp(plane.alt - VIEW.height * 0.42, -20, 420);
  game.camAlt = lerp(game.camAlt ?? wantAlt, wantAlt, 0.06);
  const camAlt = game.camAlt;

  drawSky(ctx, time);
  drawClouds(ctx, camX, camAlt);
  drawSea(ctx, camAlt);
  drawTerrain(ctx, world, camX, camAlt, time);
  drawRings(ctx, world, camX, camAlt, time);

  const px = plane.x - camX;
  const py = VIEW.height - (plane.alt - camAlt) - 40;
  if (!plane.crashed) drawPlane(ctx, plane, px, py, 1.15);
  else {
    // Wreckage smoke where the plane went down.
    ctx.fillStyle = 'rgba(60, 60, 60, 0.7)';
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.arc(px + (i - 2) * 12, py - 10 - i * 8 - Math.sin(time * 2 + i) * 4, 10 + i * 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawHud(ctx, game);
  if (game.screen === SCREEN_TITLE) drawTitle(ctx, game);
  else if (game.screen === SCREEN_PAUSED) {
    ctx.fillStyle = 'rgba(12, 18, 32, 0.55)';
    ctx.fillRect(0, 0, VIEW.width, VIEW.height);
    ctx.fillStyle = COLOURS.hudText;
    ctx.font = 'bold 44px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('PAUSED', VIEW.width / 2, VIEW.height / 2);
    ctx.font = '18px sans-serif';
    ctx.fillText('Press P to keep flying', VIEW.width / 2, VIEW.height / 2 + 36);
  } else if (game.screen === SCREEN_LANDED) drawEnd(ctx, game, true);
  else if (game.screen === SCREEN_OVER) drawEnd(ctx, game, false);
}
