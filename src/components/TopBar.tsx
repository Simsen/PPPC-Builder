import { Shield, LogIn, Loader2, LogOut } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ThemeToggle } from './ThemeToggle';

interface Props {
  clientIdConfigured: boolean;
  account: { username: string; name?: string } | null;
  busy: boolean;
  error: string | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export function TopBar({
  clientIdConfigured,
  account,
  busy,
  error,
  onSignIn,
  onSignOut,
}: Props) {
  return (
    <div className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
      <div className="max-w-[1760px] mx-auto px-6 h-14 flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <Shield className="w-5 h-5 text-primary" strokeWidth={2.2} />
          <div className="leading-none">
            <div className="text-sm font-semibold tracking-tight">
              Mac<span className="text-primary">PPPC</span>
            </div>
            <div className="text-[10px] text-muted-foreground mt-0.5">
              macOS privacy preferences
            </div>
          </div>
        </div>

        <div className="flex-1" />

        {error && (
          <span className="text-xs text-destructive max-w-xs truncate">
            {error}
          </span>
        )}

        <ThemeToggle />

        {account ? (
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md border border-primary/30 bg-primary/8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
            </span>
            <div className="hidden md:block leading-tight">
              <div className="text-[11px] font-medium text-primary">
                Connected to Intune
              </div>
              <div className="text-[10px] text-muted-foreground">
                {account.name ? `${account.name} · ${account.username}` : account.username}
              </div>
            </div>
            <span className="md:hidden text-[11px] font-medium text-primary">
              Connected
            </span>
            <button
              type="button"
              onClick={onSignOut}
              disabled={busy}
              title="Sign out"
              className="ml-1 p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-card-elevated transition disabled:opacity-50"
              aria-label="Sign out"
            >
              {busy ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <LogOut className="w-3.5 h-3.5" />
              )}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={onSignIn}
            disabled={busy || !clientIdConfigured}
            title={
              clientIdConfigured
                ? 'Sign in to Intune'
                : 'Intune deploy is disabled in this build (no Client ID configured)'
            }
            className={cn(
              'inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md font-medium transition',
              clientIdConfigured
                ? 'bg-primary text-primary-foreground hover:bg-primary-strong shadow-sm'
                : 'border border-border bg-card-elevated/40 text-muted-foreground cursor-not-allowed',
              busy && 'opacity-60 cursor-wait',
            )}
          >
            {busy ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <LogIn className="w-3.5 h-3.5" />
            )}
            Sign in to Intune
          </button>
        )}
      </div>
    </div>
  );
}
