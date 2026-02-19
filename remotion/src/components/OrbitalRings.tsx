import React from 'react';
import { useCurrentFrame } from 'remotion';
import { interpolate } from 'remotion';
import { RINGS, COLORS, WIDTH, HEIGHT } from '../lib/constants';
import { fadeIn } from '../lib/animations';

export const OrbitalRings: React.FC = () => {
  const frame = useCurrentFrame();
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;

  // Rings fade in during Scene 1 (first 60 frames)
  const ringOpacity = fadeIn(frame, 0, 60);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0, opacity: ringOpacity }}
    >
      {RINGS.map((ring, i) => {
        const radius = ring.size / 2;
        // Continuous rotation based on speed
        const degreesPerFrame = 360 / (ring.speed * 30); // speed is in seconds
        const rotation = frame * degreesPerFrame * (ring.reverse ? -1 : 1);

        return (
          <g
            key={i}
            transform={`rotate(${rotation}, ${cx}, ${cy})`}
          >
            {/* Ring circle */}
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={1}
              opacity={ring.opacity}
            />
            {/* Dots along the ring */}
            {Array.from({ length: ring.dots }).map((_, d) => {
              const angle = (d / ring.dots) * Math.PI * 2;
              const dotX = cx + Math.cos(angle) * radius;
              const dotY = cy + Math.sin(angle) * radius;
              const dotOpacity = interpolate(
                d,
                [0, ring.dots - 1],
                [0.15, 0.5]
              );
              return (
                <circle
                  key={d}
                  cx={dotX}
                  cy={dotY}
                  r={2.5}
                  fill={COLORS.accent}
                  opacity={dotOpacity}
                />
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};
