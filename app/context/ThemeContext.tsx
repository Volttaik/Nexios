'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark';
export type UIStyle = 'flat' | 'glass' | 'soft';
export type BGPattern = 'none' | 'dots' | 'grid' | 'lines' | 'noise' | 'circuit';

interface ThemeContextType {
  theme: Theme;
  isDark: boolean;
  uiStyle: UIStyle;
  bgPattern: BGPattern;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
  setUIStyle: (s: UIStyle) => void;
  setBGPattern: (p: BGPattern) => void;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: 'dark',
  isDark: true,
  uiStyle: 'flat',
  bgPattern: 'none',
  toggleTheme: () => {},
  setTheme: () => {},
  setUIStyle: () => {},
  setBGPattern: () => {},
});

function applyAll(theme: Theme, uiStyle: UIStyle, bgPattern: BGPattern) {
  const root = document.documentElement;
  const body = document.body;

  root.classList.remove('dark');
  root.classList.remove('ui-glass', 'ui-soft', 'ui-flat');
  body.classList.remove('pattern-dots', 'pattern-grid', 'pattern-lines', 'pattern-noise', 'pattern-circuit');
  root.classList.remove('pattern-dots', 'pattern-grid', 'pattern-lines', 'pattern-noise', 'pattern-circuit');

  if (theme === 'dark') root.classList.add('dark');
  root.classList.add(`ui-${uiStyle}`);
  if (bgPattern !== 'none') root.classList.add(`pattern-${bgPattern}`);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('dark');
  const [uiStyle, setUIStyleState] = useState<UIStyle>('flat');
  const [bgPattern, setBGPatternState] = useState<BGPattern>('none');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const savedTheme = (localStorage.getItem('nexios-theme') as Theme) ||
      (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
    const savedStyle = (localStorage.getItem('nexios-ui-style') as UIStyle) || 'flat';
    const savedPattern = (localStorage.getItem('nexios-bg-pattern') as BGPattern) || 'none';
    setThemeState(savedTheme);
    setUIStyleState(savedStyle);
    setBGPatternState(savedPattern);
    applyAll(savedTheme, savedStyle, savedPattern);
    setMounted(true);
  }, []);

  const setTheme = (t: Theme) => {
    setThemeState(t);
    localStorage.setItem('nexios-theme', t);
    applyAll(t, uiStyle, bgPattern);
  };

  const setUIStyle = (s: UIStyle) => {
    setUIStyleState(s);
    localStorage.setItem('nexios-ui-style', s);
    applyAll(theme, s, bgPattern);
  };

  const setBGPattern = (p: BGPattern) => {
    setBGPatternState(p);
    localStorage.setItem('nexios-bg-pattern', p);
    applyAll(theme, uiStyle, p);
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  if (!mounted) return <>{children}</>;

  return (
    <ThemeContext.Provider value={{ theme, isDark: theme === 'dark', uiStyle, bgPattern, toggleTheme, setTheme, setUIStyle, setBGPattern }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
