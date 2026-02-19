import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { fadeIn, fadeOut, slideUp, SPRING_CONFIGS } from '../lib/animations';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-120

  // Line 1: "Your trades are public." — fades up at 1s (frame 30)
  const line1 = slideUp(frame, FPS, 30, SPRING_CONFIGS.gentle);
  const line1Exit = fadeOut(frame, 80, 15);
  const line1Opacity = Math.min(line1.opacity, line1Exit);

  // Line 2: "Everyone can see your strategy." — appears at ~2.8s (frame 84)
  const line2 = slideUp(frame, FPS, 84, SPRING_CONFIGS.gentle);
  const line2Exit = fadeOut(frame, 105, 15);
  const line2Opacity = Math.min(line2.opacity, line2Exit);

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
        gap: 0,
      }}
    >
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 48,
          color: COLORS.foreground,
          opacity: line1Opacity,
          transform: `translateY(${line1.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        Your trades are public.
      </div>
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 48,
          color: COLORS.foreground,
          opacity: line2Opacity,
          transform: `translateY(${line2.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
          marginTop: 20,
        }}
      >
        Everyone can see your strategy.
      </div>
    </div>
  );
};
