import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { CloakWordmark } from '../components/CloakWordmark';
import { slideUp, fadeOut, SPRING_CONFIGS } from '../lib/animations';

export const Scene2BrandReveal: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–105

  // Wordmark appears at 3.8s → local frame 9 (3.8 - 3.5 = 0.3s)
  // Tagline fades up at 4.5s → local frame 30 (4.5 - 3.5 = 1.0s)
  const tagline = slideUp(frame, FPS, 30, SPRING_CONFIGS.smooth);

  // Everything fades out at 6.5s → local frame 90 (6.5 - 3.5 = 3.0s)
  const exitOpacity = fadeOut(frame, 90, 15);

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
      <CloakWordmark delay={9} fontSize={110} />
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
