import { useState } from 'react';
import { Info } from 'lucide-react';
import type { PppcPermission, Authorization, PermissionState } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  perm: PppcPermission;
  state: PermissionState;
  onChange: (next: PermissionState) => void;
}

export function PermissionRow({ perm, state, onChange }: Props) {
  const [showTip, setShowTip] = useState(false);

  function toggle() {
    onChange({ ...state, enabled: !state.enabled });
  }

  function setAuth(auth: Authorization) {
    onChange({ ...state, authorization: auth });
  }

  const effectiveAuth: Authorization = perm.canForceAllow
    ? state.authorization
    : 'AllowStandardUserToSetSystemService';

  return (
    <div className="flex items-start justify-between gap-4 p-3 rounded-md hover:bg-background/30 transition">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggle}
            role="switch"
            aria-checked={state.enabled}
            className={cn(
              'relative inline-flex h-5 w-9 items-center rounded-full transition',
              state.enabled ? 'bg-primary' : 'bg-muted',
            )}
          >
            <span
              className={cn(
                'inline-block h-4 w-4 transform rounded-full bg-white transition',
                state.enabled ? 'translate-x-4' : 'translate-x-0.5',
              )}
            />
          </button>
          <span className="font-medium">{perm.name}</span>
          {perm.tooltip && (
            <button
              type="button"
              onMouseEnter={() => setShowTip(true)}
              onMouseLeave={() => setShowTip(false)}
              onFocus={() => setShowTip(true)}
              onBlur={() => setShowTip(false)}
              className="text-muted-foreground hover:text-foreground relative"
              aria-label="More info"
            >
              <Info className="w-4 h-4" />
              {showTip && (
                <span className="absolute left-6 top-0 z-10 w-64 p-2 rounded-md bg-card border border-border shadow-lg text-xs text-foreground">
                  {perm.tooltip}
                </span>
              )}
            </button>
          )}
        </div>
        <p className="text-sm text-muted-foreground mt-1 ml-12">
          {perm.description}
        </p>
      </div>
      {state.enabled && (
        <select
          value={effectiveAuth}
          disabled={!perm.canForceAllow}
          onChange={(e) => setAuth(e.target.value as Authorization)}
          className="text-sm bg-background border border-border rounded-md px-2 py-1.5 min-w-[180px] disabled:opacity-60"
        >
          {perm.canForceAllow && <option value="Allow">Allow</option>}
          <option value="AllowStandardUserToSetSystemService">
            Allow standard user
          </option>
          {perm.canForceAllow && <option value="Deny">Deny</option>}
        </select>
      )}
    </div>
  );
}
