import { CONFIG } from './config';
import { getBest, setBest, getMuted, setMuted } from './storage';
import { unlockAudio, playHit, playFail } from './audio';

type State = 'menu' | 'playing' | 'gameover';

const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

let dpr = 1;
let cssW = 0;
let cssH = 0;

let state: State = 'menu';
let score = 0;
let best = getBest();
let muted = getMuted();

let markerAngle = 0;
let markerSpeed: number = CONFIG.markerSpeedStart;
let zoneStart = 0;
let zoneArcDeg: number = CONFIG.zoneArcStart;

let flashT = 0;
let flashKind: 'hit' | 'fail' | null = null;
let shakeT = 0;
let shakeMag = 0;

let lastTs = 0;
let muteRect = { x: 0, y: 0, w: CONFIG.muteBtnSize, h: CONFIG.muteBtnSize };

function degToRad(d: number): number {
  return (d * Math.PI) / 180;
}

function normalizeAngle(a: number): number {
  const tau = Math.PI * 2;
  a = a % tau;
  if (a < 0) a += tau;
  return a;
}

function angleInArc(angle: number, start: number, arcRad: number, forgiveness: number): boolean {
  const a = normalizeAngle(angle);
  const s = normalizeAngle(start - forgiveness);
  const len = arcRad + forgiveness * 2;
  const rel = normalizeAngle(a - s);
  return rel <= len;
}

function resize(): void {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  cssW = window.innerWidth;
  cssH = window.innerHeight;
  canvas.width = Math.floor(cssW * dpr);
  canvas.height = Math.floor(cssH * dpr);
  canvas.style.width = cssW + 'px';
  canvas.style.height = cssH + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const pad = CONFIG.muteBtnPad;
  muteRect = {
    x: cssW - CONFIG.muteBtnSize - pad,
    y: pad,
    w: CONFIG.muteBtnSize,
    h: CONFIG.muteBtnSize,
  };
}

function randomZone(): void {
  zoneStart = Math.random() * Math.PI * 2;
}

function resetRun(): void {
  score = 0;
  markerAngle = Math.random() * Math.PI * 2;
  markerSpeed = CONFIG.markerSpeedStart;
  zoneArcDeg = CONFIG.zoneArcStart;
  randomZone();
  flashT = 0;
  flashKind = null;
  shakeT = 0;
  shakeMag = 0;
}

function startGame(): void {
  resetRun();
  state = 'playing';
}

function buzz(ms: number): void {
  try {
    const nav = navigator as Navigator & { vibrate?: (n: number) => boolean };
    nav.vibrate?.(ms);
  } catch {
    /* ignore */
  }
}

function endGame(): void {
  state = 'gameover';
  if (score > best) {
    best = score;
    setBest(best);
  }
  flashKind = 'fail';
  flashT = CONFIG.flashDurationMs;
  shakeT = CONFIG.shakeDurationMs;
  shakeMag = CONFIG.shakeMagnitudeFail;
  playFail();
  buzz(30);
}

function onHitSuccess(): void {
  score += 1;
  markerSpeed = Math.min(CONFIG.markerSpeedMax, markerSpeed + CONFIG.markerSpeedRamp);
  zoneArcDeg = Math.max(CONFIG.zoneArcMin, zoneArcDeg - CONFIG.zoneArcShrink);
  randomZone();
  flashKind = 'hit';
  flashT = CONFIG.flashDurationMs;
  shakeT = CONFIG.shakeDurationMs;
  shakeMag = CONFIG.shakeMagnitudeHit;
  playHit();
  buzz(10);
}

function attempt(): void {
  if (state === 'menu' || state === 'gameover') {
    startGame();
    return;
  }
  const forgiveness = degToRad(CONFIG.forgivenessDeg);
  const zoneArc = degToRad(zoneArcDeg);
  if (angleInArc(markerAngle, zoneStart, zoneArc, forgiveness)) {
    onHitSuccess();
  } else {
    endGame();
  }
}

function hitMute(x: number, y: number): boolean {
  return (
    x >= muteRect.x &&
    x <= muteRect.x + muteRect.w &&
    y >= muteRect.y &&
    y <= muteRect.y + muteRect.h
  );
}

function toggleMute(): void {
  muted = !muted;
  setMuted(muted);
}

function pointerPos(e: MouseEvent | TouchEvent): { x: number; y: number } {
  if ('changedTouches' in e) {
    const t = e.changedTouches[0] ?? e.touches[0];
    if (!t) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: t.clientX - rect.left, y: t.clientY - rect.top };
  }
  const rect = canvas.getBoundingClientRect();
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function onPointer(e: Event): void {
  e.preventDefault();
  unlockAudio();
  const { x, y } = pointerPos(e as MouseEvent | TouchEvent);
  if (hitMute(x, y)) {
    toggleMute();
    return;
  }
  attempt();
}

function onKey(e: KeyboardEvent): void {
  if (e.code === 'Space' || e.key === ' ') {
    e.preventDefault();
    unlockAudio();
    attempt();
  }
}

canvas.addEventListener('pointerdown', onPointer, { passive: false });
window.addEventListener('keydown', onKey);
window.addEventListener('resize', resize);
resize();

function update(dt: number): void {
  if (state === 'playing' || state === 'menu') {
    const spd = state === 'menu' ? CONFIG.markerSpeedStart * 0.55 : markerSpeed;
    markerAngle = normalizeAngle(markerAngle + spd * (dt / 1000));
  }
  if (flashT > 0) flashT = Math.max(0, flashT - dt);
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
}

function drawRing(cx: number, cy: number, r: number): void {
  const stroke = r * CONFIG.ringStrokeRatio;
  const zoneArc = degToRad(zoneArcDeg);

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = CONFIG.colors.ring;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'butt';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.strokeStyle = CONFIG.colors.ringGlow;
  ctx.lineWidth = stroke * 0.35;
  ctx.globalAlpha = 0.5;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(cx, cy, r, zoneStart, zoneStart + zoneArc);
  ctx.strokeStyle = CONFIG.colors.zoneGlow;
  ctx.lineWidth = stroke * 1.35;
  ctx.globalAlpha = 0.35;
  ctx.lineCap = 'round';
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.arc(cx, cy, r, zoneStart, zoneStart + zoneArc);
  ctx.strokeStyle = CONFIG.colors.zone;
  ctx.lineWidth = stroke;
  ctx.lineCap = 'round';
  ctx.stroke();

  const mx = cx + Math.cos(markerAngle) * r;
  const my = cy + Math.sin(markerAngle) * r;
  const len = r * CONFIG.markerLengthRatio;
  const tx = cx + Math.cos(markerAngle) * (r - len);
  const ty = cy + Math.sin(markerAngle) * (r - len);

  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(mx, my);
  ctx.strokeStyle = CONFIG.colors.markerGlow;
  ctx.lineWidth = stroke * 0.9;
  ctx.lineCap = 'round';
  ctx.globalAlpha = 0.45;
  ctx.stroke();
  ctx.globalAlpha = 1;

  ctx.beginPath();
  ctx.moveTo(tx, ty);
  ctx.lineTo(mx, my);
  ctx.strokeStyle = CONFIG.colors.marker;
  ctx.lineWidth = stroke * 0.55;
  ctx.lineCap = 'round';
  ctx.stroke();

  ctx.beginPath();
  ctx.arc(mx, my, stroke * 0.45, 0, Math.PI * 2);
  ctx.fillStyle = CONFIG.colors.marker;
  ctx.fill();
}

function drawText(): void {
  const pad = 24;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  if (state === 'playing' || state === 'gameover') {
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 ' + Math.min(72, cssW * 0.16) + 'px system-ui, sans-serif';
    ctx.fillText(String(score), cssW / 2, pad + 8);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '500 ' + Math.min(18, cssW * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('BEST ' + best, cssW / 2, pad + 8 + Math.min(72, cssW * 0.16) * 0.95);
  } else {
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '500 ' + Math.min(18, cssW * 0.045) + 'px system-ui, sans-serif';
    ctx.fillText('BEST ' + best, cssW / 2, pad + 8);
  }
  if (state === 'menu') {
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 ' + Math.min(36, cssW * 0.09) + 'px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('TIMING RING', cssW / 2, cssH * 0.22);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '400 ' + Math.min(16, cssW * 0.042) + 'px system-ui, sans-serif';
    ctx.fillText('Tap when the marker hits the gold', cssW / 2, cssH * 0.78);
    ctx.fillText('TAP TO START', cssW / 2, cssH * 0.84);
  }
  if (state === 'gameover') {
    ctx.fillStyle = CONFIG.colors.text;
    ctx.font = '700 ' + Math.min(28, cssW * 0.07) + 'px system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.fillText('MISSED', cssW / 2, cssH * 0.78);
    ctx.fillStyle = CONFIG.colors.textDim;
    ctx.font = '400 ' + Math.min(16, cssW * 0.042) + 'px system-ui, sans-serif';
    ctx.fillText('TAP TO RESTART', cssW / 2, cssH * 0.84);
  }
}

function drawMute(): void {
  const x = muteRect.x;
  const y = muteRect.y;
  const w = muteRect.w;
  const h = muteRect.h;
  const cx = x + w / 2;
  const cy = y + h / 2;
  ctx.strokeStyle = CONFIG.colors.textDim;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(cx, cy, w * 0.38, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = CONFIG.colors.textDim;
  ctx.beginPath();
  ctx.moveTo(cx - 6, cy - 5);
  ctx.lineTo(cx - 1, cy - 5);
  ctx.lineTo(cx + 5, cy - 10);
  ctx.lineTo(cx + 5, cy + 10);
  ctx.lineTo(cx - 1, cy + 5);
  ctx.lineTo(cx - 6, cy + 5);
  ctx.closePath();
  ctx.fill();
  if (muted) {
    ctx.strokeStyle = CONFIG.colors.text;
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy - 10);
    ctx.lineTo(cx + 10, cy + 10);
    ctx.stroke();
  } else {
    ctx.strokeStyle = CONFIG.colors.textDim;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(cx + 4, cy, 8, -0.6, 0.6);
    ctx.stroke();
  }
}

function drawFlash(): void {
  if (flashT <= 0 || !flashKind) return;
  const a = flashT / CONFIG.flashDurationMs;
  ctx.fillStyle = flashKind === 'hit' ? CONFIG.colors.flashHit : CONFIG.colors.flashFail;
  ctx.globalAlpha = a;
  ctx.fillRect(0, 0, cssW, cssH);
  ctx.globalAlpha = 1;
}

function render(): void {
  let ox = 0;
  let oy = 0;
  if (shakeT > 0) {
    const p = shakeT / CONFIG.shakeDurationMs;
    ox = (Math.random() * 2 - 1) * shakeMag * p;
    oy = (Math.random() * 2 - 1) * shakeMag * p;
  }
  ctx.save();
  ctx.translate(ox, oy);
  ctx.fillStyle = CONFIG.colors.bg;
  ctx.fillRect(-ox - 20, -oy - 20, cssW + 40, cssH + 40);
  const cx = cssW / 2;
  const cy = cssH / 2;
  const r = (Math.min(cssW, cssH) / 2) * CONFIG.ringRadiusRatio;
  drawRing(cx, cy, r);
  drawText();
  drawMute();
  drawFlash();
  ctx.restore();
}

function frame(ts: number): void {
  if (!lastTs) lastTs = ts;
  let dt = ts - lastTs;
  lastTs = ts;
  if (dt > 32) dt = 32;
  update(dt);
  render();
  requestAnimationFrame(frame);
}

// Spin slowly on menu so the ghost hint is clear
randomZone();
markerAngle = 0;
requestAnimationFrame(frame);
