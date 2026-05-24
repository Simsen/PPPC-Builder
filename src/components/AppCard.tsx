import { ChevronDown, ChevronRight, Trash2, ShieldCheck, AppWindow, RefreshCw } from 'lucide-react';
import { PPPC_PERMISSIONS } from '@/lib/permissions';
import { generateRandomUUID } from '@/lib/uuid';
import type { OutputMode, PermissionState, SelectedApp } from '@/lib/types';
import { PermissionRow } from './PermissionRow';
import { cn } from '@/lib/cn';

interface Props {
  item: SelectedApp;
  mode: OutputMode;
  onToggleExpanded: () => void;
  onRemove: () => void;
  onChangePermission: (permId: string, next: PermissionState) => void;
  onChangeCodeRequirement: (next: string) => void;
  onChangeProfile: (next: SelectedApp['profile']) => void;
}

export function AppCard({
  item,
  mode,
  onToggleExpanded,
  onRemove,
  onChangePermission,
  onChangeCodeRequirement,
  onChangeProfile,
}: Props) {
  const enabledCount = Object.values(item.permissions).filter((p) => p.enabled)
    .length;

  return (
    <div className="rounded-lg border border-border/60 bg-card-elevated/30 overflow-hidden transition hover:border-border-strong/50">
      <button
        type="button"
        onClick={onToggleExpanded}
        className="w-full flex items-center gap-3 p-4 text-left hover:bg-card-elevated/60 transition"
      >
        <div className="text-muted-foreground">
          {item.expanded ? (
            <ChevronDown className="w-4 h-4" />
          ) : (
            <ChevronRight className="w-4 h-4" />
          )}
        </div>
        <div className="w-9 h-9 rounded-md bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
          <AppWindow className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium truncate">{item.app.displayName}</span>
            {item.isKnownApp && (
              <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                <ShieldCheck className="w-3 h-3" />
                Known
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate font-mono">
            {item.app.bundleId}
          </div>
        </div>
        <span className="text-xs text-muted-foreground whitespace-nowrap tabular-nums">
          {enabledCount} / {PPPC_PERMISSIONS.length}
        </span>
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="text-muted-foreground hover:text-destructive p-1 rounded-md hover:bg-destructive/10 transition cursor-pointer"
          aria-label="Remove app"
        >
          <Trash2 className="w-4 h-4" />
        </span>
      </button>

      <div
        className={cn(
          'border-t border-border/60 transition-all',
          !item.expanded && 'hidden',
        )}
      >
        {mode === 'separate' && (
          <div className="p-4 bg-primary/[0.03] border-b border-border/60">
            <div className="section-label mb-2">Profile metadata (this app)</div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Policy / payload name
                </label>
                <input
                  type="text"
                  value={item.profile.name}
                  onChange={(e) =>
                    onChangeProfile({ ...item.profile, name: e.target.value })
                  }
                  placeholder={`PPPC - ${item.app.displayName}`}
                  className="w-full text-sm bg-input/60 border border-border/60 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Organization
                </label>
                <input
                  type="text"
                  value={item.profile.organization}
                  onChange={(e) =>
                    onChangeProfile({
                      ...item.profile,
                      organization: e.target.value,
                    })
                  }
                  placeholder="IT Department"
                  className="w-full text-sm bg-input/60 border border-border/60 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  Description
                </label>
                <input
                  type="text"
                  value={item.profile.description}
                  onChange={(e) =>
                    onChangeProfile({
                      ...item.profile,
                      description: e.target.value,
                    })
                  }
                  placeholder="Optional"
                  className="w-full text-sm bg-input/60 border border-border/60 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-[11px] font-medium text-muted-foreground mb-1">
                  PayloadIdentifier (UUID)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={item.profile.identifier}
                    onChange={(e) =>
                      onChangeProfile({
                        ...item.profile,
                        identifier: e.target.value,
                      })
                    }
                    className="flex-1 text-xs font-mono bg-input/60 border border-border/60 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60"
                  />
                  <button
                    type="button"
                    onClick={() =>
                      onChangeProfile({
                        ...item.profile,
                        identifier: generateRandomUUID(),
                      })
                    }
                    title="Generate new UUID"
                    className="px-2 rounded-md border border-border/60 hover:bg-card-elevated text-muted-foreground hover:text-foreground transition"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        <div className="p-4 bg-background/30 border-b border-border/60">
          <div className="section-label mb-2">Code Requirement</div>
          <textarea
            value={item.app.codeRequirement ?? ''}
            onChange={(e) => onChangeCodeRequirement(e.target.value)}
            rows={3}
            className="w-full text-[11px] font-mono bg-input/60 border border-border/60 rounded-md px-3 py-2 resize-y focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60 transition"
            placeholder={`identifier "${item.app.bundleId}" and anchor apple generic`}
          />
          {!item.app.codeRequirement && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Default requirement will be used if left empty.
            </p>
          )}
        </div>
        <div className="p-2">
          {PPPC_PERMISSIONS.map((perm) => (
            <PermissionRow
              key={perm.id}
              perm={perm}
              state={
                item.permissions[perm.id] ?? {
                  enabled: false,
                  authorization: 'Allow',
                }
              }
              onChange={(next) => onChangePermission(perm.id, next)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
