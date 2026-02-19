import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { jetbrainsFamily } from '../lib/fonts';
import { CloakWordmark } from '../components/CloakWordmark';
import { slideUp, SPRING_CONFIGS } from '../lib/animations';

export const Scene5CTA: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-70

  const url = slideUp(frame, FPS, 25, SPRING_CONFIGS.smooth);
  const handle = slideUp(frame, FPS, 35, SPRING_CONFIGS.smooth);

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
      <CloakWordmark delay={5} fontSize={80} />
      <div
        style={{
          fontFamily: jetbrainsFamily,
          fontWeight: 400,
          fontSize: 26,
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
          fontSize: 20,
          color: COLORS.border,
          opacity: handle.opacity,
          transform: `translateY(${handle.translateY}px)`,
        }}
      >
        @cloakdefi
      </div>
    </div>
  );
};
