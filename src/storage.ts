import { CONFIG } from './config';

const bestKey = `${CONFIG.storageKeyPrefix}:best`;
const mutedKey = `${CONFIG.storageKeyPrefix}:muted`;

export function getBest(): number {
  try {
    const v = localStorage.getItem(bestKey);
    if (v == null) return 0;
    const n = parseInt(v, 10);
    return Number.isFinite(n) && n >= 0 ? n : 0;
  } catch {
    return 0;
  }
}

export function setBest(score: number): void {
  try {
    localStorage.setItem(bestKey, String(Math.max(0, Math.floor(score))));
  } catch {
    // ignore
  }
}

export function getMuted(): boolean {
  try {
    return localStorage.getItem(mutedKey) === '1';
  } catch {
    return false;
  }
}

export function setMuted(muted: boolean): void {
  try {
    localStorage.setItem(mutedKey, muted ? '1' : '0');
  } catch {
    // ignore
  }
}
