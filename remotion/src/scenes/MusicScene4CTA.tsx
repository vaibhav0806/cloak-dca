import React from 'react';
import { useCurrentFrame, interpolate, spring } from 'remotion';
import { COLORS, FPS, WIDTH, HEIGHT } from '../lib/constants';
import { manropeFamily, jetbrainsFamily } from '../lib/fonts';
import { fadeIn, SPRING_CONFIGS } from '../lib/animations';
import { charStagger, scaleReveal, blurIn } from '../lib/animationsMusic';

const CLOAK_CHARS = ['c', 'l', 'o', 'a', 'k', '.'];
const URL_TEXT = 'usecloak.xyz';

export const MusicScene4CTA: React.FC = () => {
  const frame = useCurrentFrame(); // local frame 0–119

  // Character-staggered "cloak." wordmark at frame 4
  const dotPop = scaleReveal(frame, FPS, 29, 0, SPRING_CONFIGS.pop);

  // "usecloak.xyz" terminal-type reveal: growing width from frame 18 to 45
  const urlRevealProgress = spring({
    frame: frame - 18,
    fps: FPS,
    config: SPRING_CONFIGS.smooth,
  });
  const urlWidth = interpolate(urlRevealProgress, [0, 1], [0, 380]);
  const urlOpacity = fadeIn(frame, 18, 15);

  // "powered by solana" blur-in + fade at frame 36
  const poweredBlur = blurIn(frame, 36, 20);
  const poweredProgress = spring({
    frame: frame - 36,
    fps: FPS,
    config: SPRING_CONFIGS.smooth,
  });
  const poweredOpacity = fadeIn(frame, 36, 20);
  const poweredTranslateY = interpolate(poweredProgress, [0, 1], [20, 0]);
  const poweredScale = scaleReveal(frame, FPS, 36, 0.90, SPRING_CONFIGS.smooth);

  // Subtle glow behind wordmark in last 2s
  const glowOpacity = interpolate(
    Math.sin((frame - 60) / 20),
    [-1, 1],
    [0, 0.15],
  );
  const showGlow = frame > 60 ? glowOpacity : 0;

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
      {/* Subtle accent glow behind wordmark */}
      <div
        style={{
          position: 'absolute',
          width: 400,
          height: 200,
          borderRadius: '50%',
          background: `radial-gradient(circle, ${COLORS.accent}25, transparent 70%)`,
          opacity: showGlow,
          filter: 'blur(30px)',
          top: HEIGHT / 2 - 130,
        }}
      />

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
          const anim = charStagger(i, frame, FPS, 4, 5, SPRING_CONFIGS.snappy);
          const dotScale = isDot ? dotPop : 1;

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

      {/* "usecloak.xyz" — terminal type reveal, centered via clip-path */}
      <div
        style={{
          marginTop: 8,
          opacity: urlOpacity,
          fontFamily: jetbrainsFamily,
          fontWeight: 400,
          fontSize: 36,
          letterSpacing: 1,
          color: COLORS.mutedFg,
          whiteSpace: 'nowrap',
          clipPath: `inset(0 ${100 - interpolate(urlRevealProgress, [0, 1], [0, 100])}% 0 0)`,
        }}
      >
        {URL_TEXT}
      </div>

      {/* "powered by solana" */}
      <div
        style={{
          fontFamily: jetbrainsFamily,
          fontWeight: 400,
          fontSize: 30,
          color: COLORS.mutedFg,
          opacity: poweredOpacity,
          transform: `scale(${poweredScale}) translateY(${poweredTranslateY}px)`,
          filter: `blur(${poweredBlur}px)`,
        }}
      >
        powered by solana
      </div>
    </div>
  );
};
