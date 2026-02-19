import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile, useCurrentFrame } from 'remotion';
import { SCENES, DURATION_FRAMES } from './lib/constants';
import { BackgroundMusic } from './components/BackgroundMusic';
import { MusicScene1Hook } from './scenes/MusicScene1Hook';
import { MusicScene2BrandReveal } from './scenes/MusicScene2BrandReveal';
import { MusicScene3Features } from './scenes/MusicScene3Features';
import { MusicScene4CTA } from './scenes/MusicScene4CTA';
import { cinematicZoom } from './lib/animationsMusic';

export const CloakVideoMusic: React.FC = () => {
  const frame = useCurrentFrame();
  const zoom = cinematicZoom(frame, DURATION_FRAMES);

  return (
    <AbsoluteFill
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'center center',
      }}
    >
      {/* Enhanced background with ring bursts + glow surges */}
      <BackgroundMusic globalFrame={frame} />

      {/* Scene 1: The Hook (0s–3.5s) */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}>
        <MusicScene1Hook />
      </Sequence>

      {/* Scene 2: Brand Reveal (3.5s–7s) */}
      <Sequence from={SCENES.brandReveal.start} durationInFrames={SCENES.brandReveal.duration}>
        <MusicScene2BrandReveal />
      </Sequence>

      {/* Scene 3: Features (7s–11s) */}
      <Sequence from={SCENES.features.start} durationInFrames={SCENES.features.duration}>
        <MusicScene3Features />
      </Sequence>

      {/* Scene 4: CTA (11s–15s) */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <MusicScene4CTA />
      </Sequence>

      {/* Background music — full 15s */}
      <Audio src={staticFile('audio/music.mp3')} volume={1} />
    </AbsoluteFill>
  );
};
