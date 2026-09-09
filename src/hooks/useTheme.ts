import { useState, useEffect, useCallback } from 'react';

export type Theme = 'light' | 'night';

function getStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem('theme');
    if (stored === 'night') return 'night';
  } catch {
    // localStorage unavailable (e.g. sandboxed iframe)
  }
  return 'light';
}

function applyTheme(theme: Theme) {
  if (theme === 'night') {
    document.documentElement.setAttribute('data-theme', 'night');
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // Sync DOM attribute on mount and theme change
  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('theme', theme);
    } catch {
      // localStorage unavailable
    }
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'light' ? 'night' : 'light'));
  }, []);

  return { theme, setTheme, toggleTheme } as const;
}

