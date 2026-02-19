import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { slideUp, fadeOut, SPRING_CONFIGS } from '../lib/animations';

export const Scene4Differentiator: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-60

  const line1 = slideUp(frame, FPS, 5, SPRING_CONFIGS.gentle);
  const line2 = slideUp(frame, FPS, 14, SPRING_CONFIGS.gentle);

  const exitOpacity = fadeOut(frame, 44, 16);

  return (
    <div
      style={{
        position: 'absolute',
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 58,
          color: COLORS.foreground,
          opacity: line1.opacity,
          transform: `translateY(${line1.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        Dollar-cost average on Solana
      </div>
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 58,
          color: COLORS.accent,
          opacity: line2.opacity,
          transform: `translateY(${line2.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        without exposing your strategy.
      </div>
    </div>
  );
};
