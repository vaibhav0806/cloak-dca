import React from 'react';
import { AbsoluteFill, Sequence, Audio, staticFile } from 'remotion';
import { SCENES } from './lib/constants';
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

      {/* Scene 1: The Hook (0s–3.5s) — VO: "Your trades are public." */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}>
        <Scene1Hook />
        <Audio src={staticFile('audio/vo-1.mp3')} startFrom={0} />
      </Sequence>

      {/* Scene 2: Brand Reveal (3.5s–7s) — NO VO, visual only */}
      <Sequence from={SCENES.brandReveal.start} durationInFrames={SCENES.brandReveal.duration}>
        <Scene2BrandReveal />
      </Sequence>

      {/* Scene 3: Features (7s–11s) — VO: "Private DCA on Solana." */}
      <Sequence from={SCENES.features.start} durationInFrames={SCENES.features.duration}>
        <Scene3Features />
        <Audio src={staticFile('audio/vo-2.mp3')} startFrom={0} />
      </Sequence>

      {/* Scene 4: CTA (11s–15s) — VO: "Start accumulating privately." */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <Scene4CTA />
        <Audio src={staticFile('audio/vo-3.mp3')} startFrom={0} />
      </Sequence>
    </AbsoluteFill>
  );
};
