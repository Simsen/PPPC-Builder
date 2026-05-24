import { useEffect, useState } from 'react';
import { Tag, Loader2, X, ChevronDown } from 'lucide-react';
import { listScopeTags, type ScopeTag } from '@/lib/graph';
import { cn } from '@/lib/cn';

interface Props {
  value: string[];
  onChange: (next: string[]) => void;
  signedIn: boolean;
}

let cached: ScopeTag[] | null = null;
let cachePromise: Promise<ScopeTag[]> | null = null;

async function getScopeTags(): Promise<ScopeTag[]> {
  if (cached) return cached;
  if (cachePromise) return cachePromise;
  cachePromise = listScopeTags().then((tags) => {
    cached = tags;
    return tags;
  });
  return cachePromise;
}

export function ScopeTagPicker({ value, onChange, signedIn }: Props) {
  const [tags, setTags] = useState<ScopeTag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!signedIn) return;
    setLoading(true);
    setError(null);
    getScopeTags()
      .then((data) => setTags(data))
      .catch((e) => setError(e instanceof Error ? e.message : String(e)))
      .finally(() => setLoading(false));
  }, [signedIn]);

  const selected = tags.filter((t) => value.includes(t.id));
  const selectedLabels = selected.length > 0
    ? selected.map((t) => t.displayName).join(', ')
    : value.length > 0
      ? `${value.length} selected`
      : 'None — Intune will use Default on deploy';

  function toggleTag(id: string) {
    onChange(
      value.includes(id)
        ? value.filter((x) => x !== id)
        : [...value, id],
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => signedIn && setOpen((v) => !v)}
        disabled={!signedIn}
        className={cn(
          'w-full flex items-center gap-2 text-sm bg-input/60 border border-border/60 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 transition',
          !signedIn && 'opacity-60 cursor-not-allowed',
          open && 'ring-2 ring-ring/60',
        )}
        title={signedIn ? 'Choose scope tags' : 'Sign in to load scope tags'}
      >
        <Tag className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
        <span className="flex-1 text-left truncate">
          {!signedIn ? 'Sign in to load scope tags' : selectedLabels}
        </span>
        {loading && (
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
        )}
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-muted-foreground transition',
            open && 'rotate-180',
          )}
        />
      </button>

      {open && signedIn && (
        <div className="mt-1 rounded-md border border-border bg-card shadow-[var(--shadow-soft)] overflow-hidden max-h-72 overflow-y-auto">
          {error && (
            <div className="p-3 text-xs text-destructive">{error}</div>
          )}
          {!error && tags.length === 0 && !loading && (
            <div className="p-3 text-xs text-muted-foreground">
              No scope tags found.
            </div>
          )}
          {tags.map((t) => {
            const checked = value.includes(t.id);
            return (
              <button
                key={t.id}
                type="button"
                onClick={() => toggleTag(t.id)}
                className="w-full flex items-start gap-2 px-3 py-2 text-left text-sm hover:bg-card-elevated/50 transition border-b border-border/40 last:border-0"
              >
                <span
                  className={cn(
                    'mt-0.5 w-4 h-4 rounded border flex items-center justify-center flex-shrink-0',
                    checked
                      ? 'bg-primary border-primary'
                      : 'bg-input border-border',
                  )}
                >
                  {checked && (
                    <span className="text-primary-foreground text-[10px] leading-none">
                      ✓
                    </span>
                  )}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium truncate">{t.displayName}</div>
                  {t.description && (
                    <div className="text-[11px] text-muted-foreground line-clamp-2">
                      {t.description}
                    </div>
                  )}
                </div>
                {t.isBuiltIn && (
                  <span className="text-[10px] text-muted-foreground self-center">
                    built-in
                  </span>
                )}
              </button>
            );
          })}
          <div className="flex items-center justify-end px-2 py-1.5 border-t border-border bg-card-elevated/30">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-xs px-2 py-1 rounded hover:bg-card-elevated text-muted-foreground hover:text-foreground"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Tag chip summary below button when collapsed */}
      {!open && selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map((t) => (
            <span
              key={t.id}
              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-primary/10 text-primary text-[10px]"
            >
              {t.displayName}
              <button
                type="button"
                onClick={() => toggleTag(t.id)}
                className="text-primary/60 hover:text-primary"
                aria-label={`Remove ${t.displayName}`}
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
