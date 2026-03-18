import { useEffect } from 'react';
import { useThemeStore } from '@/hooks/useTheme';

export function ThemeInit() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', theme === 'dark');
    document.documentElement.classList.toggle('light', theme !== 'dark');
  }, [theme]);

  return null;
}
