import React from 'react';
import { AbsoluteFill, Sequence } from 'remotion';
import { SCENES } from './lib/constants';
import { Background } from './components/Background';
import { Scene1Hook } from './scenes/Scene1Hook';
import { Scene2BrandReveal } from './scenes/Scene2BrandReveal';
import { Scene3ValueProps } from './scenes/Scene3ValueProps';
import { Scene4Differentiator } from './scenes/Scene4Differentiator';
import { Scene5CTA } from './scenes/Scene5CTA';

export const CloakVideo: React.FC = () => {
  return (
    <AbsoluteFill>
      {/* Persistent background layer */}
      <Background />

      {/* Scene 1: The Hook (0s–4s) */}
      <Sequence from={SCENES.hook.start} durationInFrames={SCENES.hook.duration}>
        <Scene1Hook />
      </Sequence>

      {/* Scene 2: Brand Reveal (4s–8s) */}
      <Sequence from={SCENES.brandReveal.start} durationInFrames={SCENES.brandReveal.duration}>
        <Scene2BrandReveal />
      </Sequence>

      {/* Scene 3: Value Props (8s–13s) */}
      <Sequence from={SCENES.valueProps.start} durationInFrames={SCENES.valueProps.duration}>
        <Scene3ValueProps />
      </Sequence>

      {/* Scene 4: Differentiator (13s–15.7s) */}
      <Sequence from={SCENES.differentiator.start} durationInFrames={SCENES.differentiator.duration}>
        <Scene4Differentiator />
      </Sequence>

      {/* Scene 5: CTA / Closer (15.7s–18s) */}
      <Sequence from={SCENES.cta.start} durationInFrames={SCENES.cta.duration}>
        <Scene5CTA />
      </Sequence>
    </AbsoluteFill>
  );
};
