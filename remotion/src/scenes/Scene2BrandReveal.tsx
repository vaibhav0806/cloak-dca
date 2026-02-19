import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { CloakWordmark } from '../components/CloakWordmark';
import { slideUp, fadeOut, SPRING_CONFIGS } from '../lib/animations';

export const Scene2BrandReveal: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-75

  // Tagline fades up below wordmark
  const tagline = slideUp(frame, FPS, 22, SPRING_CONFIGS.smooth);

  // Everything fades out at the end
  const exitOpacity = fadeOut(frame, 58, 17);

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
        gap: 24,
        opacity: exitOpacity,
      }}
    >
      <CloakWordmark delay={6} fontSize={110} />
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 400,
          fontSize: 38,
          color: COLORS.mutedFg,
          opacity: tagline.opacity,
          transform: `translateY(${tagline.translateY}px)`,
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        The private way to accumulate crypto
      </div>
    </div>
  );
};
