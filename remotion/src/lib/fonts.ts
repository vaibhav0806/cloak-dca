import { loadFont as loadManrope } from '@remotion/google-fonts/Manrope';
import { loadFont as loadJetBrainsMono } from '@remotion/google-fonts/JetBrainsMono';

export const { fontFamily: manropeFamily } = loadManrope('normal', {
  weights: ['300', '400', '500', '600'],
});

export const { fontFamily: jetbrainsFamily } = loadJetBrainsMono('normal', {
  weights: ['400'],
});
