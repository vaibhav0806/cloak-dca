import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { SCENES, DURATION_FRAMES } from './lib/constants';
import { Background } from './components/Background';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2BrandReveal } from './scenes/Scene2BrandReveal';
import { Scene3Features } from './scenes/Scene3Features';
import { Scene4CTA } from './scenes/Scene4CTA';

export const CloakVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Persistent background layer */}
      <Background />

      {/* Scene 1: The Hook (0s–3.5s) */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: Brand Reveal (3.5s–7s) — silent visuals */}
      <Sequence from={SCENES.brandReveal.start} durationInFrames={SCENES.brandReveal.duration}>
        <Scene2BrandReveal />
      </Sequence>

      {/* Scene 3: Features (7s–11s) */}
      <Sequence from={SCENES.features.start} durationInFrames={SCENES.features.duration}>
        <Scene3Features />
      </Sequence>

      {/* Scene 4: CTA (11s–15s) */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <Scene4CTA />
      </Sequence>

      {/* VO audio — placed at composition level so they can bleed across scenes */}
      {/* VO 1: 0.3s (frame 9), ~4.5s audio, ends ~4.8s */}
      <Sequence from={9} durationInFrames={135} name="VO 1">
        <Audio src={staticFile('audio/line_1.mp3')} volume={1} />
      </Sequence>

      {/* VO 2: 5.3s (frame 159), ~4.2s audio, ends ~9.5s — 0.5s gap after VO 1 */}
      <Sequence from={159} durationInFrames={127} name="VO 2">
        <Audio src={staticFile('audio/line_2.mp3')} volume={1} />
      </Sequence>

      {/* VO 3: 10.4s (frame 312), ~4.6s audio, ends at 15s — 0.9s gap after VO 2 */}
      <Sequence from={312} durationInFrames={138} name="VO 3">
        <Audio src={staticFile('audio/line_3.mp3')} volume={1} />
      </Sequence>
    </AbsoluteFill>
  );
};
