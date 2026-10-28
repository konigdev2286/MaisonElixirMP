'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  return (
    <div className="inline-flex items-center border border-border bg-card p-1 text-xs">
      <button
        type="button"
        onClick={() => setTheme('light')}
        className={`px-2 py-1 font-medium transition-colors ${
          theme === 'light'
            ? 'bg-fg text-bg'
            : 'text-fg-muted hover:text-fg'
        }`}
        title="Mode clair"
      >
        Clair
      </button>
      <button
        type="button"
        onClick={() => setTheme('dark')}
        className={`px-2 py-1 font-medium transition-colors ${
          theme === 'dark'
            ? 'bg-fg text-bg'
            : 'text-fg-muted hover:text-fg'
        }`}
        title="Mode sombre"
      >
        Sombre
      </button>
      <button
        type="button"
        onClick={() => setTheme('auto')}
        className={`px-2 py-1 font-medium transition-colors ${
          theme === 'auto'
            ? 'bg-fg text-bg'
            : 'text-fg-muted hover:text-fg'
        }`}
        title="Automatique selon le téléphone"
      >
        Auto
      </button>
    </div>
  );
}
