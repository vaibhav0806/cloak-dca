import { spring, interpolate, SpringConfig } from 'remotion';

// Reusable spring configs
export const SPRING_CONFIGS = {
  gentle: { damping: 20, stiffness: 80, mass: 1 } satisfies SpringConfig,
  snappy: { damping: 15, stiffness: 200, mass: 0.8 } satisfies SpringConfig,
  pop: { damping: 10, stiffness: 300, mass: 0.6 } satisfies SpringConfig,
  smooth: { damping: 30, stiffness: 60, mass: 1.2 } satisfies SpringConfig,
} as const;

// Fade in opacity over a frame range
export function fadeIn(frame: number, start: number, duration: number = 20): number {
  return interpolate(frame, [start, start + duration], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// Fade out opacity over a frame range
export function fadeOut(frame: number, start: number, duration: number = 15): number {
  return interpolate(frame, [start, start + duration], [1, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
}

// Spring-based slide up + fade in
export function slideUp(
  frame: number,
  fps: number,
  delay: number = 0,
  config: SpringConfig = SPRING_CONFIGS.gentle
): { opacity: number; translateY: number } {
  const progress = spring({
    frame: frame - delay,
    fps,
    config,
  });
  return {
    opacity: progress,
    translateY: interpolate(progress, [0, 1], [30, 0]),
  };
}

// Combined fade in then fade out
export function fadeInOut(
  frame: number,
  inStart: number,
  inDuration: number,
  outStart: number,
  outDuration: number
): number {
  const inOpacity = fadeIn(frame, inStart, inDuration);
  const outOpacity = fadeOut(frame, outStart, outDuration);
  return Math.min(inOpacity, outOpacity);
}
