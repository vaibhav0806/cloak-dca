import React from 'react';
import { COLORS, WIDTH, HEIGHT } from '../lib/constants';
import { OrbitalRings } from './OrbitalRings';
import { FloatingOrbs } from './FloatingOrbs';
import { CenterGlow } from './CenterGlow';

export const Background: React.FC = () => {
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
      <OrbitalRings />
      <FloatingOrbs />
      <CenterGlow />
    </div>
  );
};
