import React from 'react';
import { useCurrentFrame, spring } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily } from '../lib/fonts';
import { fadeIn, SPRING_CONFIGS } from '../lib/animations';
import { charStagger, scaleReveal, blurIn, dramaticExit } from '../lib/animationsMusic';

const CLOAK_CHARS = ['c', 'l', 'o', 'a', 'k', '.'];

export const MusicScene2BrandReveal: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–104

  // Dramatic exit at 2.83s (frame 85)
  const exit = dramaticExit(frame, 85, 19);

  // Tagline blur-in + fade at 1.0s (frame 30)
  const taglineBlur = blurIn(frame, 30, 20);
  const taglineOpacity = fadeIn(frame, 30, 20);

  // Dot pop scale (for the '.' character)
  const dotPop = spring({
    frame: frame - 28,
    fps: FPS,
    config: SPRING_CONFIGS.pop,
  });

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
        opacity: exit.opacity,
        transform: `scale(${exit.scale})`,
        filter: `blur(${exit.blur}px)`,
      }}
    >
      {/* Character-staggered "cloak." wordmark */}
      <div
        style={{
          display: 'flex',
          alignItems: 'baseline',
          justifyContent: 'center',
        }}
      >
        {CLOAK_CHARS.map((char, i) => {
          const isDot = char === '.';
          const anim = charStagger(i, frame, FPS, 3, 5, SPRING_CONFIGS.snappy);
          const dotScale = isDot ? scaleReveal(frame, FPS, 28, 0, SPRING_CONFIGS.pop) : 1;

          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: manropeFamily,
                fontWeight: 300,
                fontSize: 130,
                letterSpacing: isDot ? 0 : -4,
                color: isDot ? COLORS.accent : COLORS.foreground,
                opacity: anim.opacity,
                transform: `translateY(${anim.translateY}px)${isDot ? ` scale(${dotScale})` : ''}`,
                transformOrigin: 'bottom center',
              }}
            >
              {char}
            </span>
          );
        })}
      </div>

      {/* Tagline */}
      <div
        style={{
          fontFamily: manropeFamily,
          fontWeight: 300,
          fontSize: 42,
          color: COLORS.mutedFg,
          opacity: taglineOpacity,
          filter: `blur(${taglineBlur}px)`,
          textAlign: 'center',
          padding: '0 80px',
        }}
      >
        The private way to accumulate crypto
      </div>
    </div>
  );
};
