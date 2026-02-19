import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { PillarItem } from '../components/PillarItem';
import { SPRING_CONFIGS, slideUp, fadeOut } from '../lib/animations';

// SVG icons matching the value props
const ShieldIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
  </svg>
);

const CycleIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2" />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke={COLORS.accent} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
    <line x1="1" y1="1" x2="23" y2="23" />
  </svg>
);

export const Scene3Features: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–120

  // Three pillars spring in staggered at 7.0s (frame 0 local)
  // Self-custody → Automated → Private
  // Accent line expands at 7.5s → local frame 15
  const lineProgress = spring({
    frame: frame - 15,
    fps: FPS,
    config: SPRING_CONFIGS.smooth,
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 800]);

  // Pillars fade out at 8.5s → local frame 45
  const pillarExit = fadeOut(frame, 45, 15);

  // "Dollar-cost average on Solana" slides up at 9.0s → local frame 60
  const line1 = slideUp(frame, FPS, 60, SPRING_CONFIGS.gentle);
  // "without exposing your strategy." slides up at 9.4s → local frame 72
  const line2 = slideUp(frame, FPS, 72, SPRING_CONFIGS.gentle);

  // Everything fades out at 10.5s → local frame 105
  const textExit = fadeOut(frame, 105, 15);

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
      }}
    >
      {/* Pillars section */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: pillarExit,
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            gap: 120,
          }}
        >
          <PillarItem icon={<ShieldIcon />} label="Self-custody" delay={0} />
          <PillarItem icon={<CycleIcon />} label="Automated" delay={10} />
          <PillarItem icon={<EyeOffIcon />} label="Private" delay={20} />
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

      {/* Differentiator text */}
      <div
        style={{
          position: 'absolute',
          width: WIDTH,
          height: HEIGHT,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 16,
          opacity: textExit,
        }}
      >
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 400,
            fontSize: 58,
            color: COLORS.foreground,
            opacity: line1.opacity,
            transform: `translateY(${line1.translateY}px)`,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          Dollar-cost average on Solana
        </div>
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 400,
            fontSize: 58,
            color: COLORS.accent,
            opacity: line2.opacity,
            transform: `translateY(${line2.translateY}px)`,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          without exposing your strategy.
        </div>
      </div>
    </div>
  );
};
