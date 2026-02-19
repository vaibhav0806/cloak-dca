import { spring, interpolate, SpringConfig } from 'remotion';
import { SPRING_CONFIGS } from './animations';

// Blur-in: element sharpens from blurry to crisp
export function blurIn(frame: number, start: number, duration: number = 20): number {
  return interpolate(frame, [start, start + duration], [12, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// Scale reveal: element grows from small to full size via spring
export function scaleReveal(
  frame: number,
  fps: number,
  delay: number,
  fromScale: number = 0.82,
  config: SpringConfig = SPRING_CONFIGS.snappy
): number {
  const progress = spring({ frame: frame - delay, fps, config });
  return interpolate(progress, [0, 1], [fromScale, 1.0]);
}

// Per-character stagger animation
export function charStagger(
  charIndex: number,
  frame: number,
  fps: number,
  baseDelay: number,
  perCharDelay: number = 5,
  config: SpringConfig = SPRING_CONFIGS.snappy
): { opacity: number; translateY: number } {
  const charDelay = baseDelay + charIndex * perCharDelay;
  const progress = spring({ frame: frame - charDelay, fps, config });
  return {
    opacity: progress,
    translateY: interpolate(progress, [0, 1], [20, 0]),
  };
}

// Dramatic exit: scale down + blur out + fade simultaneously
export function dramaticExit(
  frame: number,
  startFrame: number,
  duration: number = 20
): { opacity: number; scale: number; blur: number } {
  const progress = interpolate(frame, [startFrame, startFrame + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return {
    opacity: interpolate(progress, [0, 1], [1, 0]),
    scale: interpolate(progress, [0, 1], [1.0, 0.88]),
    blur: interpolate(progress, [0, 1], [0, 10]),
  };
}

// Cinematic zoom: slow creep 1.0 → 1.05 over the full video
export function cinematicZoom(frame: number, totalFrames: number): number {
  return interpolate(frame, [0, totalFrames], [1.0, 1.05], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// Glow surge at scene transitions
export function glowSurge(
  frame: number,
  triggerFrame: number,
  peakOpacity: number = 0.6,
  riseFrames: number = 6,
  decayFrames: number = 20
): number {
  const rise = interpolate(
    frame,
    [triggerFrame, triggerFrame + riseFrames],
    [0, peakOpacity],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const fall = interpolate(
    frame,
    [triggerFrame + riseFrames, triggerFrame + riseFrames + decayFrames],
    [peakOpacity, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  if (frame < triggerFrame) return 0;
  if (frame < triggerFrame + riseFrames) return rise;
  return fall;
}

// Ring burst speed multiplier
export function ringBurstMultiplier(
  frame: number,
  burstStart: number,
  duration: number = 30
): number {
  return interpolate(
    frame,
    [burstStart, burstStart + 8, burstStart + duration],
    [1.0, 3.5, 1.0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
}
