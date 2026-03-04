import { create } from 'zustand';
import { persist } from 'zustand/middleware';

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
        set({ accent: hex, preset: 'custom' });
      },

      setFont: (font) => set({ font }),
    }),
    { name: 'assemble-theme' }
  )
);
