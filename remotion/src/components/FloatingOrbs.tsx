import React from 'react';
import { useCurrentFrame } from 'remotion';
import { interpolate } from 'remotion';
import { COLORS, WIDTH, HEIGHT } from '../lib/constants';

const ORBS = [
  { x: WIDTH * 0.2, y: HEIGHT * 0.35, size: 100, speed: 0.8, phase: 0 },
  { x: WIDTH * 0.78, y: HEIGHT * 0.55, size: 80, speed: 1.2, phase: 2 },
  { x: WIDTH * 0.45, y: HEIGHT * 0.75, size: 60, speed: 0.6, phase: 4 },
];

export const FloatingOrbs: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <>
      {ORBS.map((orb, i) => {
        // Sine-wave floating motion
        const yOffset = Math.sin((frame / 30) * orb.speed + orb.phase) * 15;
        const opacity = interpolate(
          Math.sin((frame / 30) * orb.speed * 0.5 + orb.phase),
          [-1, 1],
          [0.15, 0.4]
        );

        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: orb.x - orb.size / 2,
              top: orb.y - orb.size / 2 + yOffset,
              width: orb.size,
              height: orb.size,
              borderRadius: '50%',
              background: `radial-gradient(circle, ${COLORS.accent}40, transparent 70%)`,
              opacity,
              filter: 'blur(20px)',
            }}
          />
        );
      })}
    </>
  );
};
