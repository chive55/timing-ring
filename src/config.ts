/** All tunables for Timing Ring */
export const CONFIG = {
  /** Ring radius as fraction of min(canvas width, height) / 2 */
  ringRadiusRatio: 0.72,

  /** Marker angular speed in radians per second at start */
  markerSpeedStart: 2.2,
  /** Speed added per successful hit (rad/s) */
  markerSpeedRamp: 0.18,
  /** Soft cap on marker speed */
  markerSpeedMax: 8.5,

  /** Zone arc width in degrees at start */
  zoneArcStart: 48,
  /** Minimum zone arc width in degrees */
  zoneArcMin: 14,
  /** Degrees shrunk per hit */
  zoneArcShrink: 1.6,

  /** Extra forgiveness in degrees on each side of the zone */
  forgivenessDeg: 3,

  /** Ring stroke width as fraction of radius */
  ringStrokeRatio: 0.06,
  /** Marker length as fraction of radius */
  markerLengthRatio: 0.18,

  colors: {
    bg: '#0a0a12',
    ring: '#1a1a2e',
    ringGlow: '#2a2a4a',
    zone: '#f5c542',
    zoneGlow: '#ffe08a',
    marker: '#3dfff0',
    markerGlow: '#a0fff8',
    text: '#e8e8f0',
    textDim: '#6a6a80',
    flashHit: 'rgba(61, 255, 240, 0.25)',
    flashFail: 'rgba(255, 60, 90, 0.35)',
  },

  storageKeyPrefix: 'timing-ring',

  /** HUD / layout */
  muteBtnSize: 44,
  muteBtnPad: 16,

  /** Flash / shake */
  flashDurationMs: 120,
  shakeDurationMs: 160,
  shakeMagnitudeHit: 3,
  shakeMagnitudeFail: 8,
} as const;
