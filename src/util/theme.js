import { useEffect, useState } from 'react';

const getMediaQuery = () => {
  try {
    return window.matchMedia?.('(prefers-color-scheme: dark)') ?? null;
  } catch {
    return null;
  }
};

const getSystemTheme = () => (getMediaQuery()?.matches ? 'dark' : 'light');

// Tracks the OS-level light/dark preference reactively; the app always
// follows the system setting, there is no in-app override.
const useSystemTheme = () => {
  const [theme, setTheme] = useState(getSystemTheme);

  useEffect(() => {
    const mediaQuery = getMediaQuery();
    if (!mediaQuery) {
      return;
    }
    const onChange = () => setTheme(getSystemTheme());
    mediaQuery.addEventListener('change', onChange);
    return () => mediaQuery.removeEventListener('change', onChange);
  }, []);

  return theme;
};

export { getSystemTheme, useSystemTheme };
