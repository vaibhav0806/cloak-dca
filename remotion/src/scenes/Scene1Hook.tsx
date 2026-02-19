import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { slideUp, fadeOut, SPRING_CONFIGS } from '../lib/animations';

export const Scene1Hook: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–105

  // "Your trades are public." slides up at 0.3s (frame 9), synced with VO
  const line = slideUp(frame, FPS, 9, SPRING_CONFIGS.gentle);

  // Text fades out at 2.5s (frame 75)
  const exitOpacity = fadeOut(frame, 75, 15);

  return (
    <div
      style={{
        position: 'absolute',
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 64,
          color: COLORS.foreground,
          opacity: Math.min(line.opacity, exitOpacity),
          transform: `translateY(${line.translateY}px)`,
          textAlign: 'center',
          padding: '0 60px',
        }}
      >
        Your trades are public.
      </div>
    </div>
  );
};
