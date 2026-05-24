import { useEffect, useState } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';
import {
  applyTheme,
  getThemePref,
  resolveTheme,
  setThemePref,
  watchOsTheme,
  type ThemePref,
} from '@/lib/theme';
import { cn } from '@/lib/cn';

export function ThemeToggle() {
  const [pref, setPref] = useState<ThemePref>(() => getThemePref());

  useEffect(() => {
    // Re-apply when OS preference flips and the user is on 'auto'
    return watchOsTheme(() => {
      if (getThemePref() === 'auto') applyTheme('auto');
    });
  }, []);

  function update(next: ThemePref) {
    setThemePref(next);
    setPref(next);
  }

  const resolved = resolveTheme(pref);

  return (
    <div
      className="inline-flex items-center gap-0.5 p-0.5 rounded-md border border-border bg-card-elevated/40"
      role="radiogroup"
      aria-label="Theme"
    >
      <Btn
        active={pref === 'light'}
        onClick={() => update('light')}
        title="Light"
      >
        <Sun className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        active={pref === 'auto'}
        onClick={() => update('auto')}
        title={`Auto (currently ${resolved})`}
      >
        <Monitor className="w-3.5 h-3.5" />
      </Btn>
      <Btn
        active={pref === 'dark'}
        onClick={() => update('dark')}
        title="Dark"
      >
        <Moon className="w-3.5 h-3.5" />
      </Btn>
    </div>
  );
}

function Btn({
  active,
  onClick,
  title,
  children,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      aria-pressed={active}
      className={cn(
        'p-1 rounded transition',
        active
          ? 'bg-card text-foreground shadow-sm'
          : 'text-muted-foreground hover:text-foreground',
      )}
    >
      {children}
    </button>
  );
}
