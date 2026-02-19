import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { PillarItem } from '../components/PillarItem';
import { SPRING_CONFIGS, fadeOut } from '../lib/animations';

// SVG icons matching the value props
const ShieldIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CycleIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const Scene3ValueProps: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0-150

  // Accent line expands from center
  const lineProgress = spring({
    frame: frame - 20,
    fps: FPS,
    config: SPRING_CONFIGS.smooth,
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 800]);

  // Exit fade
  const exitOpacity = fadeOut(frame, 125, 25);

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
        opacity: exitOpacity,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'center',
          gap: 80,
        }}
      >
        <PillarItem icon={<ShieldIcon />} label="Self-custody" delay={10} />
        <PillarItem icon={<CycleIcon />} label="Automated" delay={25} />
        <PillarItem icon={<EyeOffIcon />} label="Private" delay={40} />
      </div>
      {/* Accent line */}
      <div
        style={{
          width: lineWidth,
          height: 1,
          backgroundColor: COLORS.accent,
          opacity: 0.3,
          marginTop: 48,
        }}
      />
    </div>
  );
};
