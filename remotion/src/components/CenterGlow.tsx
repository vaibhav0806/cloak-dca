import React from 'react';
import { useCurrentFrame } from 'remotion';
import { interpolate } from 'remotion';
import { COLORS, WIDTH, HEIGHT, SCENES } from '../lib/constants';

export const CenterGlow: React.FC = () => {
  const frame = useCurrentFrame();

  // Slow pulsing glow
  const basePulse = interpolate(
    Math.sin(frame / 30),
    [-1, 1],
    [0.3, 0.6]
  );

  // Intensify during brand reveal (frames 120-240)
  const revealIntensity = interpolate(
    frame,
    [
      SCENES.brandReveal.start,
      SCENES.brandReveal.start + 30,
      SCENES.brandReveal.start + SCENES.brandReveal.duration - 20,
      SCENES.brandReveal.start + SCENES.brandReveal.duration,
    ],
    [0, 0.4, 0.4, 0],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  // Final pulse during CTA
  const ctaPulse = interpolate(
    frame,
    [SCENES.cta.start, SCENES.cta.start + 20, SCENES.cta.start + 50, SCENES.cta.start + SCENES.cta.duration],
    [0, 0.3, 0.3, 0.15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const glowOpacity = basePulse + revealIntensity + ctaPulse;

  return (
    <div
      style={{
        position: 'absolute',
        left: WIDTH / 2 - 300,
        top: HEIGHT / 2 - 250,
        width: 600,
        height: 500,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${COLORS.accent}30, ${COLORS.accent}10 40%, transparent 70%)`,
        opacity: glowOpacity,
        filter: 'blur(40px)',
      }}
    />
  );
};
