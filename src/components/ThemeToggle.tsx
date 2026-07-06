'use client';

import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';
import { Moon, Sun } from 'lucide-react';

export default function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm border border-white/40 shadow-sm animate-pulse" />
    );
  }

  return (
    <button
      onClick={() => setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')}
      className="p-2 text-ink-muted hover:text-brand-indigo bg-white/30 dark:bg-black/30 backdrop-blur-sm rounded-xl transition-all duration-300 border border-white/40 dark:border-white/20 shadow-sm hover:shadow-ambient-hover"
      title="Toggle Dark Mode"
    >
      {resolvedTheme === 'dark' ? (
        <Sun className="w-5 h-5 text-amber-300" />
      ) : (
        <Moon className="w-5 h-5 text-brand-indigo" />
      )}
    </button>
  );
}
