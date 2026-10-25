/**
 * Central place to customise VibePlay.
 *  - App name / tagline: set VITE_APP_NAME / VITE_APP_TAGLINE in a .env file (see .env.example).
 *  - Colours: edit the CSS variables in src/index.css, or add presets to ACCENTS below.
 */
export const APP_NAME: string = import.meta.env.VITE_APP_NAME || 'VibePlay';
export const APP_TAGLINE: string = import.meta.env.VITE_APP_TAGLINE || 'Your music, your vibe';
export const APP_VERSION = '1.0.0';

export const STORAGE_PREFIX = 'vibeplay';

export type AccentId = 'violet' | 'electric' | 'rose' | 'emerald' | 'amber';

export interface AccentPreset {
  id: AccentId;
  label: string;
  /** space separated rgb triplets, used as `rgb(var(--brand))` */
  brand: string;
  accent: string;
}

export const ACCENTS: AccentPreset[] = [
  { id: 'violet', label: 'Violet', brand: '139 92 246', accent: '59 130 246' },
  { id: 'electric', label: 'Electric blue', brand: '59 130 246', accent: '34 211 238' },
  { id: 'rose', label: 'Rose', brand: '236 72 153', accent: '139 92 246' },
  { id: 'emerald', label: 'Emerald', brand: '16 185 129', accent: '59 130 246' },
  { id: 'amber', label: 'Amber', brand: '245 158 11', accent: '236 72 153' },
];

export const DEFAULT_ACCENT: AccentId = 'violet';
