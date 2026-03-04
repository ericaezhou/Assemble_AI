'use client';

import { useEffect, useRef } from 'react';
import { useThemeStore, PRESETS, FONTS, type FontChoice, type PresetName } from '@/store/themeStore';

interface ThemeSettingsProps {
  onClose: () => void;
}

export default function ThemeSettings({ onClose }: ThemeSettingsProps) {
  const { accent, background, font, preset, applyPreset, setCustomAccent, setFont } = useThemeStore();
  const panelRef = useRef<HTMLDivElement>(null);

  // Close on outside click or ESC
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener('keydown', handleKey);
    document.addEventListener('mousedown', handleClick);
    return () => {
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('mousedown', handleClick);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100]" style={{ background: 'rgba(28,25,23,0.4)' }}>
      <div
        ref={panelRef}
        className="absolute top-0 right-0 h-full w-80 flex flex-col"
        style={{
          background: 'var(--bg)',
          borderLeft: '2px solid var(--border)',
          boxShadow: '-4px 0 0 var(--border)',
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '2px solid var(--border-light)' }}
        >
          <div>
            <p className="section-heading mb-0.5">Customize</p>
            <h2 className="text-base font-black" style={{ color: 'var(--text)' }}>Theme Settings</h2>
          </div>
          <button onClick={onClose} className="btn btn-ghost" style={{ padding: '4px 8px' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5 flex flex-col gap-7">

          {/* Color presets */}
          <section>
            <p className="section-heading mb-3">Color Preset</p>
            <div className="grid grid-cols-2 gap-2">
              {PRESETS.map(p => (
                <button
                  key={p.name}
                  onClick={() => applyPreset(p.name as PresetName)}
                  className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg border-2 transition-all text-left"
                  style={{
                    background: p.background,
                    borderColor: preset === p.name ? p.accent : 'var(--border-light)',
                    boxShadow: preset === p.name ? `2px 2px 0 ${p.accent}` : 'none',
                  }}
                >
                  <span
                    className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                    style={{ background: p.accent, borderColor: 'var(--border)' }}
                  />
                  <span className="text-xs font-bold" style={{ color: 'var(--text)' }}>{p.label}</span>
                </button>
              ))}
            </div>
          </section>

          {/* Custom accent */}
          <section>
            <p className="section-heading mb-3">Custom Accent</p>
            <div className="flex items-center gap-3">
              <div className="relative">
                <input
                  type="color"
                  value={accent}
                  onChange={e => setCustomAccent(e.target.value)}
                  className="w-10 h-10 rounded-lg border-2 cursor-pointer"
                  style={{ borderColor: 'var(--border)', padding: '2px' }}
                />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{accent.toUpperCase()}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Click to pick any color</p>
              </div>
            </div>
          </section>

          {/* Font */}
          <section>
            <p className="section-heading mb-3">Font</p>
            <div className="flex flex-col gap-2">
              {FONTS.map(f => (
                <button
                  key={f.value}
                  onClick={() => setFont(f.value as FontChoice)}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg border-2 transition-all text-left"
                  style={{
                    borderColor: font === f.value ? 'var(--accent)' : 'var(--border-light)',
                    background: font === f.value ? 'var(--accent-light)' : 'var(--surface)',
                    boxShadow: font === f.value ? '2px 2px 0 var(--accent)' : 'none',
                    fontFamily: f.css,
                  }}
                >
                  <span className="text-sm font-semibold" style={{ color: 'var(--text)' }}>{f.label}</span>
                  <span className="text-xs" style={{ color: 'var(--text-muted)', fontFamily: f.css }}>
                    Aa Bb Cc
                  </span>
                </button>
              ))}
            </div>
          </section>

          {/* Preview */}
          <section>
            <p className="section-heading mb-3">Preview</p>
            <div className="card p-4 flex flex-col gap-3" style={{ cursor: 'default' }}>
              <div className="flex items-center gap-2">
                <span
                  className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black border-2"
                  style={{ background: 'var(--accent-light)', borderColor: 'var(--border)', color: 'var(--accent)' }}
                >
                  A
                </span>
                <span className="text-sm font-black" style={{ color: 'var(--text)' }}>ASSEMBLE</span>
                <span className="w-1.5 h-1.5 rounded-full ml-0.5" style={{ background: 'var(--accent)' }} />
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                The quick brown fox jumps over the lazy dog.
              </p>
              <div className="flex gap-2">
                <button className="btn btn-primary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                  Primary
                </button>
                <button className="btn btn-secondary" style={{ fontSize: '0.7rem', padding: '4px 10px' }}>
                  Secondary
                </button>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
