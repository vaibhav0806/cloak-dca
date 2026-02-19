import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { slideUp, fadeOut, SPRING_CONFIGS } from '../lib/animations';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–105

  // Line 1: "Every trade you make on-chain" slides up at 0.3s (frame 9)
  const line1 = slideUp(frame, FPS, 9, SPRING_CONFIGS.gentle);

  // Line 2: "is public." slides up at 1.2s (frame 36)
  const line2 = slideUp(frame, FPS, 36, SPRING_CONFIGS.gentle);

  // Text fades out at end of scene (frame 88)
  const exitOpacity = fadeOut(frame, 88, 17);

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
        gap: 8,
      }}
    >
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 64,
          color: COLORS.foreground,
          opacity: Math.min(line1.opacity, exitOpacity),
          transform: `translateY(${line1.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        Every trade you make on-chain
      </div>
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 64,
          color: COLORS.accent,
          opacity: Math.min(line2.opacity, exitOpacity),
          transform: `translateY(${line2.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        is public.
      </div>
    </div>
  );
};
