import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { COLORS, FPS } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { SPRING_CONFIGS, slideUp } from '../lib/animations';

interface CloakWordmarkProps {
  delay?: number;
  fontSize?: number;
}

export const CloakWordmark: React.FC<CloakWordmarkProps> = ({
  delay = 0,
  fontSize = 80,
}) => {
  const frame = useCurrentFrame();
  const { opacity, translateY } = slideUp(frame, FPS, delay, SPRING_CONFIGS.gentle);

  // Red dot pops with spring overshoot
  const dotScale = spring({
    frame: frame - delay - 8,
    fps: FPS,
    config: SPRING_CONFIGS.pop,
  });

  return (
    <div
      style={{
        opacity,
        transform: `translateY(${translateY}px)`,
        display: 'flex',
        alignItems: 'baseline',
        justifyContent: 'center',
      }}
    >
      <span
        style={{
          fontFamily: manropeFamily,
          fontWeight: 300,
          fontSize,
          letterSpacing: -3,
          color: COLORS.foreground,
        }}
      >
        cloak
      </span>
      <span
        style={{
          fontFamily: manropeFamily,
          fontWeight: 300,
          fontSize,
          color: COLORS.accent,
          transform: `scale(${dotScale})`,
          display: 'inline-block',
          transformOrigin: 'bottom center',
        }}
      >
        .
      </span>
    </div>
  );
};
