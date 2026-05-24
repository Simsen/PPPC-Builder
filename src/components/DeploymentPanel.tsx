import { useEffect, useMemo, useState } from 'react';
import {
  Rocket,
  CheckCircle2,
  XCircle,
  Loader2,
  ExternalLink,
  AlertTriangle,
  Copy as CopyIcon,
} from 'lucide-react';
import { Card, CardHeader, CardBody } from './Card';
import { AssignmentPicker } from './AssignmentPicker';
import { deployProfiles, type DeployResult } from '@/lib/deploy';
import {
  EMPTY_ASSIGNMENT,
  type AssignmentConfig,
} from '@/lib/assignments';
import type { GeneratedProfile } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  profiles: GeneratedProfile[];
  signedIn: boolean;
  canSignIn: boolean;
  tenantHint: string | null;
  onOpenSignIn: () => void;
}

/** Stable key for a profile across renders. */
function profileKey(p: GeneratedProfile): string {
  return p.bundleId ?? p.filename;
}

/** Validate that an assignment is complete enough to deploy. */
function isAssignmentValid(a: AssignmentConfig): boolean {
  if (a.mode === 'none' || a.mode === 'allUsers' || a.mode === 'allDevices') {
    return true;
  }
  return a.mode === 'groups' && a.groups.length > 0;
}

export function DeploymentPanel({
  profiles,
  signedIn,
  canSignIn,
  tenantHint,
  onOpenSignIn,
}: Props) {
  const [assignmentMap, setAssignmentMap] = useState<
    Record<string, AssignmentConfig>
  >({});
  const [deploying, setDeploying] = useState(false);
  const [results, setResults] = useState<DeployResult[]>([]);
  const [progressIdx, setProgressIdx] = useState<number | null>(null);

  // Sync map with current profiles — preserve existing entries, default the rest
  useEffect(() => {
    setAssignmentMap((prev) => {
      const next: Record<string, AssignmentConfig> = {};
      for (const p of profiles) {
        const key = profileKey(p);
        next[key] = prev[key] ?? EMPTY_ASSIGNMENT;
      }
      return next;
    });
  }, [profiles]);

  const orderedAssignments = useMemo(
    () => profiles.map((p) => assignmentMap[profileKey(p)] ?? EMPTY_ASSIGNMENT),
    [profiles, assignmentMap],
  );

  const allValid = orderedAssignments.every(isAssignmentValid);
  const canDeploy = signedIn && profiles.length > 0 && !deploying && allValid;

  function updateAssignment(key: string, next: AssignmentConfig) {
    setAssignmentMap((prev) => ({ ...prev, [key]: next }));
  }

  function copyToAll(sourceKey: string) {
    const src = assignmentMap[sourceKey];
    if (!src) return;
    setAssignmentMap((prev) => {
      const next: Record<string, AssignmentConfig> = {};
      for (const k of Object.keys(prev)) next[k] = src;
      return next;
    });
  }

  async function deploy() {
    if (!canDeploy) return;
    setDeploying(true);
    setResults([]);
    setProgressIdx(0);
    try {
      const out = await deployProfiles(profiles, orderedAssignments, (idx) => {
        setProgressIdx(idx + 1);
      });
      setResults(out);
    } finally {
      setDeploying(false);
      setProgressIdx(null);
    }
  }

  const successCount = results.filter((r) => r.status !== 'failed').length;
  const failCount = results.filter((r) => r.status === 'failed').length;

  return (
    <Card>
      <CardHeader
        icon={<Rocket className="w-4 h-4" />}
        title="Deploy to Intune"
        subtitle={
          signedIn
            ? `Signed in${tenantHint ? ` · ${tenantHint}` : ''}`
            : 'Sign in to enable direct upload'
        }
      />
      <CardBody className="space-y-4">
        {!signedIn && canSignIn && (
          <button
            type="button"
            onClick={onOpenSignIn}
            className="w-full p-3 rounded-md border border-primary/30 bg-primary/5 text-primary text-sm hover:bg-primary/10 transition"
          >
            Sign in to Intune to deploy directly
          </button>
        )}
        {!signedIn && !canSignIn && (
          <div className="w-full p-3 rounded-md border border-border bg-card-elevated/40 text-muted-foreground text-xs">
            Direct deploy is disabled in this build. Use the Download button on
            the right to grab the generated <code>.mobileconfig</code> and
            upload manually to Intune.
          </div>
        )}

        {profiles.length === 0 && (
          <div className="text-xs text-muted-foreground">
            No profiles to deploy yet. Add an app and enable permissions first.
          </div>
        )}

        {profiles.map((p) => {
          const key = profileKey(p);
          const assignment = assignmentMap[key] ?? EMPTY_ASSIGNMENT;
          const valid = isAssignmentValid(assignment);
          return (
            <div
              key={key}
              className="rounded-md border border-border/60 bg-background/30"
            >
              <div className="flex items-center gap-2 px-3 py-2 border-b border-border/60">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">
                    {p.policyName}
                  </div>
                  <div className="text-[11px] text-muted-foreground truncate">
                    {p.filename}
                  </div>
                </div>
                {profiles.length > 1 && (
                  <button
                    type="button"
                    onClick={() => copyToAll(key)}
                    title="Use this assignment for all policies"
                    className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground px-2 py-1 rounded-md hover:bg-card-elevated/60 transition"
                  >
                    <CopyIcon className="w-3 h-3" />
                    Copy to all
                  </button>
                )}
              </div>
              <div className="p-3 space-y-2">
                <AssignmentPicker
                  value={assignment}
                  onChange={(next) => updateAssignment(key, next)}
                  signedIn={signedIn}
                />
                {!valid && (
                  <div className="flex items-center gap-2 p-2 rounded-md bg-warning/10 text-warning text-xs">
                    <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" />
                    <span>Add at least one group to enable deployment.</span>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => void deploy()}
            disabled={!canDeploy}
            className={cn(
              'inline-flex items-center gap-2 px-4 py-2 text-sm rounded-md font-medium transition shadow-sm',
              canDeploy
                ? 'bg-primary text-primary-foreground hover:bg-primary-strong'
                : 'bg-card-elevated/40 text-muted-foreground cursor-not-allowed',
            )}
          >
            {deploying ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deploying… {progressIdx} / {profiles.length}
              </>
            ) : (
              <>
                <Rocket className="w-4 h-4" />
                Deploy{' '}
                {profiles.length > 1 ? `${profiles.length} policies` : 'policy'}
              </>
            )}
          </button>
          {results.length > 0 && (
            <span className="text-xs text-muted-foreground">
              {successCount} succeeded · {failCount} failed
            </span>
          )}
        </div>

        {results.length > 0 && (
          <div className="space-y-1.5">
            {results.map((r, i) => (
              <div
                key={i}
                className={cn(
                  'flex items-start gap-2 p-2.5 rounded-md text-xs border',
                  r.status === 'failed'
                    ? 'bg-destructive/5 border-destructive/30 text-destructive'
                    : 'bg-primary/5 border-primary/20 text-foreground',
                )}
              >
                {r.status === 'failed' ? (
                  <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-foreground truncate">
                    {r.profile.policyName}
                  </div>
                  {r.error && (
                    <div className="text-destructive mt-0.5">{r.error}</div>
                  )}
                  {r.status !== 'failed' && (
                    <div className="text-muted-foreground mt-0.5">
                      {r.status === 'assigned' ? 'Created and assigned' : 'Created'}
                    </div>
                  )}
                </div>
                {r.portalUrl && (
                  <a
                    href={r.portalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-[11px] flex-shrink-0"
                  >
                    Open
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            ))}
          </div>
        )}
      </CardBody>
    </Card>
  );
}
