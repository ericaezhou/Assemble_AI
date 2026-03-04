'use client';

import { useEffect } from 'react';
import { useThemeStore, FONTS } from '@/store/themeStore';

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { accent, accentLight, background, font } = useThemeStore();

  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', accent);
    root.style.setProperty('--accent-light', accentLight);
    root.style.setProperty('--bg', background);

    const fontDef = FONTS.find(f => f.value === font);
    if (fontDef) root.style.setProperty('--font-body', fontDef.css);
  }, [accent, accentLight, background, font]);

  return <>{children}</>;
}
