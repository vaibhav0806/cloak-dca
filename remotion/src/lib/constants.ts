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
export const DURATION_FRAMES = 360; // 12 seconds

// Scene timing (in frames)
export const SCENES = {
  hook: { start: 0, duration: 75 },          // 0s–2.5s
  brandReveal: { start: 75, duration: 75 },   // 2.5s–5s
  valueProps: { start: 150, duration: 90 },   // 5s–8s
  differentiator: { start: 240, duration: 60 }, // 8s–10s
  cta: { start: 300, duration: 60 },          // 10s–12s
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
