import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { fadeIn, SPRING_CONFIGS } from '../lib/animations';
import { blurIn, scaleReveal, dramaticExit } from '../lib/animationsMusic';

// SVG icons
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

const PILLARS = [
  { icon: <ShieldIcon />, label: 'Self-custody', direction: 'left' as const },
  { icon: <CycleIcon />, label: 'Automated', direction: 'bottom' as const },
  { icon: <EyeOffIcon />, label: 'Private', direction: 'right' as const },
];

export const MusicScene3Features: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–119

  // === Phase 1: Pillars (frames 0–59) ===

  // Pillar dramatic exit at 1.33s (frame 40)
  const pillarExit = dramaticExit(frame, 40, 19);

  // Glowing accent line wipe
  const lineProgress = spring({
    frame: frame - 15,
    fps: FPS,
    config: SPRING_CONFIGS.smooth,
  });
  const lineWidth = interpolate(lineProgress, [0, 1], [0, 900]);

  // === Phase 2: Text (frames 60–119) ===

  // "Dollar-cost average on Solana" slides from LEFT at frame 60
  const text1Progress = spring({
    frame: frame - 60,
    fps: FPS,
    config: SPRING_CONFIGS.gentle,
  });
  const text1TranslateX = interpolate(text1Progress, [0, 1], [-60, 0]);
  const text1Blur = blurIn(frame, 60, 20);
  const text1Scale = scaleReveal(frame, FPS, 60, 0.88, SPRING_CONFIGS.gentle);
  const text1Opacity = fadeIn(frame, 60, 18);

  // "without exposing your strategy." slides from RIGHT at frame 72
  const text2Progress = spring({
    frame: frame - 72,
    fps: FPS,
    config: SPRING_CONFIGS.gentle,
  });
  const text2TranslateX = interpolate(text2Progress, [0, 1], [60, 0]);
  const text2Blur = blurIn(frame, 72, 20);
  const text2Scale = scaleReveal(frame, FPS, 72, 0.88, SPRING_CONFIGS.gentle);
  const text2Opacity = fadeIn(frame, 72, 18);

  // Text dramatic exit at 3.33s (frame 100)
  const textExit = dramaticExit(frame, 100, 19);

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
      {/* Phase 1: Pillars */}
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          opacity: pillarExit.opacity,
          transform: `scale(${pillarExit.scale})`,
          filter: `blur(${pillarExit.blur}px)`,
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
          {PILLARS.map((pillar, i) => {
            const delay = 5 + i * 10;
            const progress = spring({
              frame: frame - delay,
              fps: FPS,
              config: SPRING_CONFIGS.snappy,
            });
            const blur = blurIn(frame, delay, 18);
            const scale = scaleReveal(frame, FPS, delay, 0.85, SPRING_CONFIGS.snappy);

            // Directional entrance
            let translateX = 0;
            let translateY = 0;
            if (pillar.direction === 'left') {
              translateX = interpolate(progress, [0, 1], [-40, 0]);
            } else if (pillar.direction === 'right') {
              translateX = interpolate(progress, [0, 1], [40, 0]);
            } else {
              translateY = interpolate(progress, [0, 1], [30, 0]);
            }

            return (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 20,
                  opacity: progress,
                  transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
                  filter: `blur(${blur}px)`,
                }}
              >
                <div
                  style={{
                    width: 80,
                    height: 80,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: 16,
                    border: `1px solid ${COLORS.border}`,
                    backgroundColor: COLORS.card,
                  }}
                >
                  {pillar.icon}
                </div>
                <span
                  style={{
                    fontFamily: manropeFamily,
                    fontWeight: 500,
                    fontSize: 36,
                    color: COLORS.foreground,
                    letterSpacing: -0.5,
                  }}
                >
                  {pillar.label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Glowing accent line */}
        <div
          style={{
            width: lineWidth,
            height: 2,
            backgroundColor: COLORS.accent,
            opacity: 0.8,
            marginTop: 48,
            boxShadow: `0 0 12px ${COLORS.accent}, 0 0 24px ${COLORS.accent}40`,
          }}
        />
      </div>

      {/* Phase 2: Differentiator text */}
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
          opacity: textExit.opacity,
          transform: `scale(${textExit.scale})`,
          filter: `blur(${textExit.blur}px)`,
        }}
      >
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 400,
            fontSize: 62,
            letterSpacing: -1,
            color: COLORS.foreground,
            opacity: text1Opacity,
            transform: `scale(${text1Scale}) translateX(${text1TranslateX}px)`,
            filter: `blur(${text1Blur}px)`,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          Dollar-cost average on Solana
        </div>
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 500,
            fontSize: 62,
            letterSpacing: -1,
            color: COLORS.accent,
            opacity: text2Opacity,
            transform: `scale(${text2Scale}) translateX(${text2TranslateX}px)`,
            filter: `blur(${text2Blur}px)`,
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
