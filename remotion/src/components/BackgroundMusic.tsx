import React from 'react';
import { interpolate } from 'remotion';
import { COLORS, WIDTH, HEIGHT, RINGS, SCENES } from '../lib/constants';
import { fadeIn } from '../lib/animations';
import { glowSurge, ringBurstMultiplier } from '../lib/animationsMusic';
import { FloatingOrbs } from './FloatingOrbs';

interface BackgroundMusicProps {
  globalFrame: number;
}

// Enhanced orbital rings with burst + dot trails
const OrbitalRingsMusic: React.FC<{ frame: number }> = ({ frame }) => {
  const cx = WIDTH / 2;
  const cy = HEIGHT / 2;
  const ringOpacity = fadeIn(frame, 0, 60);

  // Ring burst at brand reveal (global frame 105)
  const burstMult = ringBurstMultiplier(frame, SCENES.brandReveal.start, 30);

  return (
    <svg
      width={WIDTH}
      height={HEIGHT}
      style={{ position: 'absolute', top: 0, left: 0, opacity: ringOpacity }}
    >
      {RINGS.map((ring, i) => {
        const radius = ring.size / 2;
        const baseDegreesPerFrame = 360 / (ring.speed * 30);
        // Apply burst multiplier to speed
        const degreesPerFrame = baseDegreesPerFrame * burstMult;
        const direction = ring.reverse ? -1 : 1;

        // Accumulate rotation properly for burst effect
        // Use base rotation + burst offset to avoid jumpy behavior
        const baseRotation = frame * baseDegreesPerFrame * direction;
        const burstOffset = frame > SCENES.brandReveal.start
          ? interpolate(
              frame,
              [SCENES.brandReveal.start, SCENES.brandReveal.start + 30],
              [0, 40 * direction],
              { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
            )
          : 0;
        const rotation = baseRotation + burstOffset;

        // Outer rings scale up slightly at transitions, inner rings scale down
        const isOuter = i < 3;
        const transitionScale = interpolate(
          frame,
          [SCENES.brandReveal.start, SCENES.brandReveal.start + 20, SCENES.brandReveal.start + 50],
          [1.0, isOuter ? 1.06 : 0.96, 1.0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );

        return (
          <g
            key={i}
            transform={`translate(${cx}, ${cy}) scale(${transitionScale}) translate(${-cx}, ${-cy}) rotate(${rotation}, ${cx}, ${cy})`}
          >
            <circle
              cx={cx}
              cy={cy}
              r={radius}
              fill="none"
              stroke={COLORS.accent}
              strokeWidth={1}
              opacity={ring.opacity}
            />
            {Array.from({ length: ring.dots }).map((_, d) => {
              const angle = (d / ring.dots) * Math.PI * 2;
              const dotX = cx + Math.cos(angle) * radius;
              const dotY = cy + Math.sin(angle) * radius;
              const dotOpacity = interpolate(d, [0, ring.dots - 1], [0.15, 0.5]);

              // Dot trail: 3 ghost copies at previous rotation positions
              const trails = [1, 2, 3].map((n) => {
                const trailRotation = rotation - n * degreesPerFrame * direction * 3;
                const trailRad = (trailRotation * Math.PI) / 180;
                const cosR = Math.cos(trailRad - rotation * Math.PI / 180 + angle);
                const sinR = Math.sin(trailRad - rotation * Math.PI / 180 + angle);
                // Simpler approach: offset the angle
                const trailAngle = angle - n * degreesPerFrame * (Math.PI / 180) * 3;
                const tx = cx + Math.cos(trailAngle) * radius;
                const ty = cy + Math.sin(trailAngle) * radius;
                const trailOpacity = dotOpacity * [0.4, 0.2, 0.1][n - 1];
                return (
                  <circle
                    key={`trail-${n}`}
                    cx={tx}
                    cy={ty}
                    r={2}
                    fill={COLORS.accent}
                    opacity={trailOpacity}
                  />
                );
              });

              return (
                <React.Fragment key={d}>
                  {trails}
                  <circle
                    cx={dotX}
                    cy={dotY}
                    r={2.5}
                    fill={COLORS.accent}
                    opacity={dotOpacity}
                  />
                </React.Fragment>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
};

// Enhanced center glow with surges at scene transitions
const CenterGlowMusic: React.FC<{ frame: number }> = ({ frame }) => {
  const basePulse = interpolate(Math.sin(frame / 30), [-1, 1], [0.3, 0.6]);

  // Surges at each scene transition
  const surge1 = glowSurge(frame, SCENES.brandReveal.start, 0.7, 6, 25);
  const surge2 = glowSurge(frame, SCENES.features.start, 0.5, 6, 20);
  const surge3 = glowSurge(frame, SCENES.cta.start, 0.6, 6, 20);

  // Sustained CTA pulse
  const ctaPulse = interpolate(
    frame,
    [SCENES.cta.start + 60, SCENES.cta.start + 80, SCENES.cta.start + 120],
    [0, 0.25, 0.15],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );

  const glowOpacity = basePulse + surge1 + surge2 + surge3 + ctaPulse;

  // Glow size grows at brand reveal
  const glowWidth = interpolate(
    frame,
    [SCENES.brandReveal.start, SCENES.brandReveal.start + 30, SCENES.brandReveal.start + 60],
    [600, 900, 700],
    { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
  );
  const glowHeight = glowWidth * 0.83;

  return (
    <div
      style={{
        position: 'absolute',
        left: WIDTH / 2 - glowWidth / 2,
        top: HEIGHT / 2 - glowHeight / 2,
        width: glowWidth,
        height: glowHeight,
        borderRadius: '50%',
        background: `radial-gradient(circle, ${COLORS.accent}30, ${COLORS.accent}10 40%, transparent 70%)`,
        opacity: glowOpacity,
        filter: 'blur(40px)',
      }}
    />
  );
};

export const BackgroundMusic: React.FC<BackgroundMusicProps> = ({ globalFrame }) => {
  return (
    <div
      style={{
        position: 'absolute',
        width: WIDTH,
        height: HEIGHT,
        backgroundColor: COLORS.background,
        overflow: 'hidden',
      }}
    >
      <OrbitalRingsMusic frame={globalFrame} />
      <FloatingOrbs />
      <CenterGlowMusic frame={globalFrame} />
    </div>
  );
};
