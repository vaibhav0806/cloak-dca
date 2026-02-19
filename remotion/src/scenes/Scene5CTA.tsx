import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { jetbrainsFamily } from '../lib/fonts';
import { CloakWordmark } from '../components/CloakWordmark';
import { slideUp, SPRING_CONFIGS } from '../lib/animations';

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-60

  const url = slideUp(frame, FPS, 18, SPRING_CONFIGS.smooth);
  const handle = slideUp(frame, FPS, 26, SPRING_CONFIGS.smooth);

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
        gap: 20,
      }}
    >
      <CloakWordmark delay={4} fontSize={110} />
      <div
        style={{
          fontFamily: jetbrainsFamily,
          fontWeight: 400,
          fontSize: 34,
          color: COLORS.mutedFg,
          opacity: url.opacity,
          transform: `translateY(${url.translateY}px)`,
          marginTop: 8,
        }}
      >
        usecloak.xyz
      </div>
      <div
        style={{
          fontFamily: jetbrainsFamily,
          fontWeight: 400,
          fontSize: 28,
          color: COLORS.mutedFg,
          opacity: handle.opacity,
          transform: `translateY(${handle.translateY}px)`,
        }}
      >
        powered by solana
      </div>
    </div>
  );
};
