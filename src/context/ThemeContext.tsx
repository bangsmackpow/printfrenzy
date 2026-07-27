"use client";

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useSession } from 'next-auth/react';

type Theme = 'light' | 'dark' | 'polarized-light' | 'polarized-dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setExactTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const [theme, setTheme] = useState<Theme>('light');
  const [isLoaded, setIsLoaded] = useState(false);

  // Initial load from session or localStorage
  useEffect(() => {
    if (!isLoaded) {
      const saved = localStorage.getItem('theme') as Theme;
      if (session?.user?.theme) {
        setTheme(session.user.theme as Theme);
      } else if (saved) {
        setTheme(saved);
      } else if (typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        setTheme('dark');
      }
      setIsLoaded(true);
    }
  }, [session, isLoaded]);

  // Sync to backend and apply locally
  useEffect(() => {
    if (!isLoaded) return;

    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
    
    // Standard dark class for tailwind
    if (theme.includes('dark')) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }
  }, [theme, session, isLoaded]);

  const toggleTheme = useCallback(() => {
    setTheme(prev => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'polarized-dark';
      if (prev === 'polarized-dark') return 'polarized-light';
      return 'light';
    });
  }, []);

  const setExactTheme = useCallback((t: Theme) => {
    setTheme(t);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setExactTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error('useTheme must be used within ThemeProvider');
  return context;
}
