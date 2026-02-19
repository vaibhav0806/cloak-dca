import React from 'react';
import { Composition } from 'remotion';
import { CloakVideo } from './CloakVideo';
import { WIDTH, HEIGHT, FPS, DURATION_FRAMES } from './lib/constants';

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="CloakIntro"
      component={CloakVideo}
      durationInFrames={DURATION_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
