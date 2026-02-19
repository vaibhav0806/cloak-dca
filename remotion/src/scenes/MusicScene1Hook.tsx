import React from 'react';
import { useCurrentFrame } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { slideUp, fadeIn, SPRING_CONFIGS } from '../lib/animations';
import { blurIn, scaleReveal, dramaticExit } from '../lib/animationsMusic';

export const MusicScene1Hook: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–104

  // Line 1: "Every trade you make on-chain" — blur-in + scale + slideUp at 0.3s (frame 9)
  const line1Slide = slideUp(frame, FPS, 9, SPRING_CONFIGS.snappy);
  const line1Blur = blurIn(frame, 9, 22);
  const line1Scale = scaleReveal(frame, FPS, 9, 0.82, SPRING_CONFIGS.snappy);
  const line1Opacity = fadeIn(frame, 9, 18);

  // Line 2: "is public." — same treatment at 0.73s (frame 22)
  const line2Slide = slideUp(frame, FPS, 22, SPRING_CONFIGS.snappy);
  const line2Blur = blurIn(frame, 22, 22);
  const line2Scale = scaleReveal(frame, FPS, 22, 0.82, SPRING_CONFIGS.snappy);
  const line2Opacity = fadeIn(frame, 22, 18);

  // Dramatic exit at 2.73s (frame 82)
  const exit = dramaticExit(frame, 82, 22);

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
        gap: 8,
        opacity: exit.opacity,
        transform: `scale(${exit.scale})`,
        filter: `blur(${exit.blur}px)`,
      }}
    >
      {/* Line 1 - overflow hidden for baseline reveal */}
      <div style={{ overflow: 'hidden', padding: '8px 0' }}>
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 400,
            fontSize: 72,
            letterSpacing: -1,
            color: COLORS.foreground,
            opacity: line1Opacity,
            transform: `scale(${line1Scale}) translateY(${line1Slide.translateY}px)`,
            filter: `blur(${line1Blur}px)`,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          Every trade you make on-chain
        </div>
      </div>

      {/* Line 2 - bigger, bolder, accent */}
      <div style={{ overflow: 'hidden', padding: '8px 0' }}>
        <div
          style={{
            fontFamily: manropeFamily,
            fontWeight: 600,
            fontSize: 80,
            letterSpacing: -1,
            color: COLORS.accent,
            opacity: line2Opacity,
            transform: `scale(${line2Scale}) translateY(${line2Slide.translateY}px)`,
            filter: `blur(${line2Blur}px)`,
            textAlign: 'center',
            padding: '0 60px',
          }}
        >
          is public.
        </div>
      </div>
    </div>
  );
};
