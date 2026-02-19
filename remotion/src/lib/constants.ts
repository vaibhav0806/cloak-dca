// Brand colors from brand-kit/colors/colors.css
export const COLORS = {
  accent: '#ff6347',
  foreground: '#ffffff',
  background: '#000000',
  card: '#0a0a0a',
  secondary: '#141414',
  muted: '#1a1a1a',
  mutedFg: '#737373',
  border: '#262626',
  borderHover: '#333333',
} as const;

// Video dimensions
export const WIDTH = 1920;
export const HEIGHT = 1080;
export const FPS = 30;
export const DURATION_FRAMES = 450; // 15 seconds

// Scene timing (in frames)
export const SCENES = {
  hook: { start: 0, duration: 105 },           // 0s–3.5s
  brandReveal: { start: 105, duration: 105 },  // 3.5s–7s
  features: { start: 210, duration: 120 },     // 7s–11s
  cta: { start: 330, duration: 120 },          // 11s–15s
} as const;

// Orbital ring configs (matching landing page hero)
export const RINGS = [
  { size: 900, speed: 80, opacity: 0.05, reverse: false, dots: 3 },
  { size: 720, speed: 60, opacity: 0.07, reverse: true, dots: 4 },
  { size: 550, speed: 50, opacity: 0.06, reverse: false, dots: 3 },
  { size: 320, speed: 40, opacity: 0.08, reverse: true, dots: 3 },
  { size: 240, speed: 35, opacity: 0.07, reverse: false, dots: 4 },
  { size: 160, speed: 25, opacity: 0.1, reverse: true, dots: 3 },
  { size: 100, speed: 20, opacity: 0.12, reverse: false, dots: 3 },
] as const;
