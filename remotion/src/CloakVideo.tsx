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
      {/* VO 1: "Every trade you make on-chain is public..." at 0.3s (frame 9), ~4.5s */}
      <Sequence from={9} durationInFrames={DURATION_FRAMES - 9}>
        <Audio src={staticFile('audio/line_1.mp3')} />
      </Sequence>

      {/* VO 2: "Cloak gives you private, automated DCA..." at 7.0s (frame 210), ~4.2s */}
      <Sequence from={210} durationInFrames={DURATION_FRAMES - 210}>
        <Audio src={staticFile('audio/line_2.mp3')} />
      </Sequence>

      {/* VO 3: "Take back your privacy..." at 11.3s (frame 339), ~4.6s */}
      <Sequence from={339} durationInFrames={DURATION_FRAMES - 339}>
        <Audio src={staticFile('audio/line_3.mp3')} />
      </Sequence>
    </AbsoluteFill>
  );
};
