import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { slideUp, SPRING_CONFIGS } from '../lib/animations';

interface PillarItemProps {
  icon: React.ReactNode;
  label: string;
  delay: number;
}

export const PillarItem: React.FC<PillarItemProps> = ({ icon, label, delay }) => {
  const frame = useCurrentFrame();
  const { opacity, translateY } = slideUp(frame, FPS, delay, SPRING_CONFIGS.snappy);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 16,
        opacity,
        transform: `translateY(${translateY}px)`,
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 16,
          border: `1px solid ${COLORS.border}`,
          backgroundColor: COLORS.card,
        }}
      >
        {icon}
      </div>
      <span
        style={{
          fontFamily: manropeFamily,
          fontWeight: 500,
          fontSize: 28,
          color: COLORS.foreground,
          letterSpacing: -0.5,
        }}
      >
        {label}
      </span>
    </div>
  );
};
