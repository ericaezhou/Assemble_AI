import { create } from 'zustand';
import { persist } from 'zustand/middleware';

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: h = ((b - r) / d + 2) / 6; break;
      case b: h = ((r - g) / d + 4) / 6; break;
    }
  }
  return [h * 360, s * 100, l * 100];
}

function hslToHex(h: number, s: number, l: number): string {
  s /= 100; l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color).toString(16).padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

function deriveThemeFromAccent(hex: string): { accentLight: string; background: string } {
  const [h, s] = hexToHsl(hex);
  const accentLight = hslToHex(h, Math.min(s, 70), 95);
  const background  = hslToHex(h, Math.min(s * 0.25, 25), 97.5);
  return { accentLight, background };
}

export type FontChoice = 'inter' | 'mono' | 'rounded' | 'serif';
export type PresetName = 'amber' | 'indigo' | 'emerald' | 'rose' | 'custom';

export interface ThemePreset {
  name: PresetName;
  label: string;
  accent: string;
  accentLight: string;
  background: string;
}

export const PRESETS: ThemePreset[] = [
  { name: 'amber',   label: 'Amber',   accent: '#ea580c', accentLight: '#fff7ed', background: '#faf7f2' },
  { name: 'indigo',  label: 'Indigo',  accent: '#6d28d9', accentLight: '#f5f3ff', background: '#f8f7ff' },
  { name: 'emerald', label: 'Emerald', accent: '#059669', accentLight: '#f0fdf4', background: '#f4faf7' },
  { name: 'rose',    label: 'Rose',    accent: '#e11d48', accentLight: '#fff1f2', background: '#fdf4f5' },
];

export const FONTS: { value: FontChoice; label: string; css: string }[] = [
  { value: 'inter',   label: 'Inter',   css: 'var(--font-geist-sans), system-ui, sans-serif' },
  { value: 'mono',    label: 'Mono',    css: 'var(--font-geist-mono), "JetBrains Mono", monospace' },
  { value: 'rounded', label: 'Rounded', css: '"Nunito", "Varela Round", system-ui, sans-serif' },
  { value: 'serif',   label: 'Serif',   css: '"Playfair Display", "Georgia", serif' },
];

interface ThemeState {
  accent: string;
  accentLight: string;
  background: string;
  font: FontChoice;
  preset: PresetName;

  applyPreset: (name: PresetName) => void;
  setCustomAccent: (hex: string) => void;
  setFont: (font: FontChoice) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      accent:      '#ea580c',
      accentLight: '#fff7ed',
      background:  '#faf7f2',
      font:        'inter',
      preset:      'amber',

      applyPreset: (name) => {
        const p = PRESETS.find(p => p.name === name);
        if (!p) return;
        set({ accent: p.accent, accentLight: p.accentLight, background: p.background, preset: name });
      },

      setCustomAccent: (hex) => {
        const { accentLight, background } = deriveThemeFromAccent(hex);
        set({ accent: hex, accentLight, background, preset: 'custom' });
      },

      setFont: (font) => set({ font }),
    }),
    { name: 'assemble-theme' }
  )
);
