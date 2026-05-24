import { useEffect, useState } from 'react';
import {
  Users,
  Laptop,
  UsersRound,
  CircleSlash,
  Filter,
  Search,
  X,
  Loader2,
  Plus,
} from 'lucide-react';
import {
  searchGroups,
  listMacAssignmentFilters,
  type AssignmentFilter,
  type GraphGroup,
} from '@/lib/graph';
import type {
  AssignmentConfig,
  AssignmentMode,
  GroupTarget,
} from '@/lib/assignments';
import { cn } from '@/lib/cn';

interface Props {
  value: AssignmentConfig;
  onChange: (next: AssignmentConfig) => void;
  signedIn: boolean;
}

export function AssignmentPicker({ value, onChange, signedIn }: Props) {
  const [filters, setFilters] = useState<AssignmentFilter[]>([]);
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState<string | null>(null);

  useEffect(() => {
    if (!signedIn || value.mode === 'none') return;
    if (filters.length > 0 || filtersLoading) return;
    setFiltersLoading(true);
    setFiltersError(null);
    listMacAssignmentFilters()
      .then((data) => setFilters(data))
      .catch((e) =>
        setFiltersError(e instanceof Error ? e.message : String(e)),
      )
      .finally(() => setFiltersLoading(false));
  }, [signedIn, value.mode, filters.length, filtersLoading]);

  function setMode(mode: AssignmentMode) {
    if (mode === 'none') {
      onChange({ mode: 'none', groups: [], filter: null });
    } else if (mode === 'groups') {
      onChange({ ...value, mode: 'groups' });
    } else {
      onChange({ ...value, mode, groups: [] });
    }
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <ModeChip
          active={value.mode === 'none'}
          onClick={() => setMode('none')}
          icon={<CircleSlash className="w-4 h-4" />}
          label="No assignment"
          sub="Create only"
        />
        <ModeChip
          active={value.mode === 'allUsers'}
          onClick={() => setMode('allUsers')}
          icon={<Users className="w-4 h-4" />}
          label="All users"
          sub="Licensed users"
        />
        <ModeChip
          active={value.mode === 'allDevices'}
          onClick={() => setMode('allDevices')}
          icon={<Laptop className="w-4 h-4" />}
          label="All devices"
          sub="Every enrolled Mac"
        />
        <ModeChip
          active={value.mode === 'groups'}
          onClick={() => setMode('groups')}
          icon={<UsersRound className="w-4 h-4" />}
          label="Groups"
          sub="Include / exclude"
        />
      </div>

      {value.mode === 'groups' && (
        <GroupsPicker
          value={value.groups}
          onChange={(groups) => onChange({ ...value, groups })}
          signedIn={signedIn}
          filters={filters}
          filtersLoading={filtersLoading}
          filtersError={filtersError}
        />
      )}

      {(value.mode === 'allUsers' || value.mode === 'allDevices') && (
        <FilterPicker
          filters={filters}
          loading={filtersLoading}
          error={filtersError}
          value={value.filter}
          onChange={(filter) => onChange({ ...value, filter })}
        />
      )}
    </div>
  );
}

function ModeChip({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-2.5 p-3 rounded-md border text-left transition',
        active
          ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/40'
          : 'border-border/60 hover:bg-card-elevated/60',
      )}
    >
      <div
        className={cn(
          'mt-0.5 w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
          active ? 'bg-primary/15 text-primary' : 'bg-card text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium leading-tight">{label}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {sub}
        </div>
      </div>
    </button>
  );
}

function GroupsPicker({
  value,
  onChange,
  signedIn,
  filters,
  filtersLoading,
  filtersError,
}: {
  value: GroupTarget[];
  onChange: (next: GroupTarget[]) => void;
  signedIn: boolean;
  filters: AssignmentFilter[];
  filtersLoading: boolean;
  filtersError: string | null;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<GraphGroup[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingIntent, setPendingIntent] = useState<'include' | 'exclude'>(
    'include',
  );

  useEffect(() => {
    if (!signedIn) return;
    const handle = setTimeout(async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await searchGroups(query);
        setResults(data);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(handle);
  }, [query, signedIn]);

  function addGroup(g: GraphGroup) {
    if (value.some((v) => v.id === g.id)) return;
    onChange([
      ...value,
      {
        id: g.id,
        displayName: g.displayName,
        intent: pendingIntent,
        filter: null,
      },
    ]);
  }

  function setGroupFilter(id: string, filter: GroupTarget['filter']) {
    onChange(value.map((g) => (g.id === id ? { ...g, filter } : g)));
  }

  function removeGroup(id: string) {
    onChange(value.filter((g) => g.id !== id));
  }

  function toggleIntent(id: string) {
    onChange(
      value.map((g) =>
        g.id === id
          ? { ...g, intent: g.intent === 'include' ? 'exclude' : 'include' }
          : g,
      ),
    );
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/30 p-3 space-y-3">
      {/* Selected */}
      {value.length > 0 && (
        <div className="space-y-2">
          {value.map((g) => (
            <div
              key={g.id}
              className="rounded-md bg-card-elevated/40 border border-border/60 overflow-hidden"
            >
              <div className="flex items-center gap-2 px-2.5 py-1.5">
                <span
                  className={cn(
                    'text-[10px] font-medium uppercase tracking-wide px-1.5 py-0.5 rounded-sm cursor-pointer',
                    g.intent === 'include'
                      ? 'bg-primary/15 text-primary'
                      : 'bg-destructive/15 text-destructive',
                  )}
                  onClick={() => toggleIntent(g.id)}
                  title="Click to toggle include/exclude"
                >
                  {g.intent}
                </span>
                <span className="flex-1 text-sm truncate">{g.displayName}</span>
                <button
                  type="button"
                  onClick={() => removeGroup(g.id)}
                  className="text-muted-foreground hover:text-destructive p-0.5"
                  aria-label="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              {/* Per-group filter — only meaningful for includes */}
              {g.intent === 'include' && (
                <div className="px-2.5 py-1.5 border-t border-border/60 bg-background/30 flex flex-wrap items-center gap-2">
                  <Filter className="w-3 h-3 text-muted-foreground" />
                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Filter
                  </span>
                  <select
                    value={g.filter?.id ?? ''}
                    onChange={(e) => {
                      const id = e.target.value;
                      if (!id) return setGroupFilter(g.id, null);
                      const f = filters.find((x) => x.id === id);
                      if (!f) return;
                      setGroupFilter(g.id, {
                        id: f.id,
                        displayName: f.displayName,
                        type: g.filter?.type ?? 'include',
                      });
                    }}
                    className="text-xs bg-input/60 border border-border/60 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-ring/60 flex-1 min-w-[140px]"
                  >
                    <option value="">No filter</option>
                    {filters.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.displayName}
                      </option>
                    ))}
                  </select>
                  {g.filter && (
                    <div className="flex gap-0.5 p-0.5 rounded bg-card-elevated/60 border border-border/60 text-[10px]">
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFilter(g.id, { ...g.filter!, type: 'include' })
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          g.filter.type === 'include'
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Include
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          setGroupFilter(g.id, { ...g.filter!, type: 'exclude' })
                        }
                        className={cn(
                          'px-1.5 py-0.5 rounded',
                          g.filter.type === 'exclude'
                            ? 'bg-destructive text-white'
                            : 'text-muted-foreground hover:text-foreground',
                        )}
                      >
                        Exclude
                      </button>
                    </div>
                  )}
                  {filtersLoading && (
                    <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
                  )}
                </div>
              )}
            </div>
          ))}
          {filtersError && (
            <div className="text-[11px] text-destructive">{filtersError}</div>
          )}
        </div>
      )}

      {/* Search */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 p-0.5 rounded-md bg-card-elevated/40 border border-border/60 text-[11px]">
          <button
            type="button"
            onClick={() => setPendingIntent('include')}
            className={cn(
              'px-2 py-1 rounded',
              pendingIntent === 'include'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Include
          </button>
          <button
            type="button"
            onClick={() => setPendingIntent('exclude')}
            className={cn(
              'px-2 py-1 rounded',
              pendingIntent === 'exclude'
                ? 'bg-destructive text-white'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            Exclude
          </button>
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              signedIn ? 'Search security groups…' : 'Sign in to search groups'
            }
            disabled={!signedIn}
            className="w-full pl-8 pr-3 py-1.5 text-sm bg-input/60 border border-border/60 rounded-md focus:outline-none focus:ring-2 focus:ring-ring/60 disabled:opacity-50"
          />
        </div>
      </div>

      {signedIn && (
        <div className="max-h-48 overflow-auto rounded-md border border-border/60 bg-background/40">
          {loading && (
            <div className="flex items-center justify-center gap-2 p-3 text-xs text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Searching…
            </div>
          )}
          {error && (
            <div className="p-3 text-xs text-destructive">{error}</div>
          )}
          {!loading && !error && results.length === 0 && (
            <div className="p-3 text-xs text-muted-foreground">
              No groups found.
            </div>
          )}
          {!loading &&
            !error &&
            results.map((g) => {
              const already = value.some((v) => v.id === g.id);
              return (
                <button
                  key={g.id}
                  type="button"
                  disabled={already}
                  onClick={() => addGroup(g)}
                  className={cn(
                    'w-full flex items-center gap-2 px-3 py-1.5 text-left text-sm hover:bg-card-elevated/50 transition border-b border-border/40 last:border-0',
                    already && 'opacity-40 cursor-not-allowed',
                  )}
                >
                  <Plus className="w-3.5 h-3.5 text-muted-foreground" />
                  <span className="flex-1 truncate">{g.displayName}</span>
                  {g.groupTypes.includes('DynamicMembership') && (
                    <span className="text-[10px] text-muted-foreground">
                      dynamic
                    </span>
                  )}
                </button>
              );
            })}
        </div>
      )}
    </div>
  );
}

function FilterPicker({
  filters,
  loading,
  error,
  value,
  onChange,
}: {
  filters: AssignmentFilter[];
  loading: boolean;
  error: string | null;
  value: AssignmentConfig['filter'];
  onChange: (next: AssignmentConfig['filter']) => void;
}) {
  const empty = !loading && !error && filters.length === 0;
  return (
    <div className="rounded-md border border-border/60 bg-background/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Filter className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="section-label">Assignment filter (optional)</div>
        {loading && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
      </div>
      {error && <div className="text-xs text-destructive mb-2">{error}</div>}
      {empty && (
        <div className="text-[11px] text-muted-foreground mb-2 leading-relaxed">
          No macOS device filters in this tenant. PPPC profiles can only use
          assignment filters of platform <code className="text-foreground">macOS</code>{' '}
          and type <code className="text-foreground">devices</code>. Create one
          in <a
            href="https://intune.microsoft.com/#view/Microsoft_Intune_DeviceSettings/DevicesMenu/~/filters"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Intune › Devices › Filters
          </a>{' '}
          and re-open this dialog.
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center">
        <select
          value={value?.id ?? ''}
          onChange={(e) => {
            const id = e.target.value;
            if (!id) {
              onChange(null);
              return;
            }
            const f = filters.find((x) => x.id === id);
            if (!f) return;
            onChange({
              id: f.id,
              displayName: f.displayName,
              type: value?.type ?? 'include',
            });
          }}
          className="text-sm bg-input/60 border border-border/60 rounded-md px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 min-w-[200px]"
        >
          <option value="">No filter</option>
          {filters.map((f) => (
            <option key={f.id} value={f.id}>
              {f.displayName}
            </option>
          ))}
        </select>
        {value && (
          <div className="flex gap-1 p-0.5 rounded-md bg-card-elevated/40 border border-border/60 text-[11px]">
            <button
              type="button"
              onClick={() => onChange({ ...value, type: 'include' })}
              className={cn(
                'px-2 py-1 rounded',
                value.type === 'include'
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Include
            </button>
            <button
              type="button"
              onClick={() => onChange({ ...value, type: 'exclude' })}
              className={cn(
                'px-2 py-1 rounded',
                value.type === 'exclude'
                  ? 'bg-destructive text-white'
                  : 'text-muted-foreground hover:text-foreground',
              )}
            >
              Exclude
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
