'use client';

import { useEffect } from 'react';

interface ThemeProviderProps {
  children: React.ReactNode;
  theme?: 'dark' | 'light';
}

export default function ThemeProvider({ children, theme = 'dark' }: ThemeProviderProps) {
  useEffect(() => {
    // Apply theme class to body
    const applyTheme = (currentTheme: 'dark' | 'light') => {
      if (currentTheme === 'light') {
        document.body.classList.add('light-theme');
      } else {
        document.body.classList.remove('light-theme');
      }
    };

    applyTheme(theme);

    // Cleanup function
    return () => {
      document.body.classList.remove('light-theme');
    };
  }, [theme]);

  return <>{children}</>;
}
