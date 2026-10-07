import type { Theme } from './types';

export interface ThemeColours {
  /** the page behind everything. */
  page: string;
  /** the panel the map sits on. Margin-band tints are mixed toward it. */
  panel: string;
  /** the outline round the seats, and the pointed-at and selected rings. */
  outline: string;
  /** the gap ring of a selected seat, and the hairline of a filtered-out one. */
  ground: string;
  /** the fill of a seat with no holder: an off-white, so a vacancy reads as neither a party nor a gap. */
  vacant: string;
}

export const THEME_COLOURS: Record<Theme, ThemeColours> = {
  dark: { page: '#0f0f0f', panel: '#242424', outline: '#ebebeb', ground: '#0f0f0f', vacant: '#e8e6df' },
  light: { page: '#f3f1ea', panel: '#f1f2f3', outline: '#000000', ground: '#ffffff', vacant: '#fbfaf6' },
};
