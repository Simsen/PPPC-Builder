import { useState } from 'react';
import JSZip from 'jszip';
import {
  Copy,
  Download,
  Check,
  FileCode2,
  CheckCircle2,
  CircleDashed,
  Upload as UploadIcon,
  ChevronRight,
  ChevronDown,
  WrapText,
  AlignLeft,
} from 'lucide-react';
import { PPPC_PERMISSIONS } from '@/lib/permissions';
import type { GeneratedProfile, OutputMode, SelectedApp } from '@/lib/types';
import { cn } from '@/lib/cn';
import { XmlHighlight } from './XmlHighlight';

interface Props {
  profiles: GeneratedProfile[];
  selectedApps: SelectedApp[];
  mode: OutputMode;
  onDeploy?: () => void;
  deployEnabled?: boolean;
}

export function Preview({ profiles, selectedApps, mode, onDeploy, deployEnabled }: Props) {
  const [copied, setCopied] = useState<string | null>(null);
  const [openMap, setOpenMap] = useState<Record<string, boolean>>({});
  const [wrap, setWrap] = useState(false);

  const hasProfiles = profiles.length > 0;
  const totalBytes = profiles.reduce((s, p) => s + p.xml.length, 0);

  function showCopied(key: string) {
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }

  function copyXml(p: GeneratedProfile, key: string) {
    const fallback = () => {
      const ta = document.createElement('textarea');
      ta.value = p.xml;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand('copy');
        showCopied(key);
      } catch {
        // ignore
      }
      document.body.removeChild(ta);
    };
    if (navigator.clipboard?.writeText) {
      navigator.clipboard
        .writeText(p.xml)
        .then(() => showCopied(key))
        .catch(fallback);
    } else {
      fallback();
    }
  }

  async function download() {
    if (!hasProfiles) return;
    if (mode === 'bundle' || profiles.length === 1) {
      const p = profiles[0];
      triggerDownload(
        new Blob([p.xml], { type: 'application/x-apple-aspen-config' }),
        p.filename,
      );
      return;
    }
    const zip = new JSZip();
    for (const p of profiles) zip.file(p.filename, p.xml);
    const blob = await zip.generateAsync({ type: 'blob' });
    triggerDownload(blob, 'pppc-profiles.zip');
  }

  function triggerDownload(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // Permissions enabled per app, by bundleId
  function permsForBundle(bundleId: string | undefined) {
    const apps = bundleId
      ? selectedApps.filter((a) => a.app.bundleId === bundleId)
      : selectedApps;
    return apps.flatMap((item) =>
      Object.entries(item.permissions)
        .filter(([, s]) => s.enabled)
        .map(([permId]) => {
          const perm = PPPC_PERMISSIONS.find((p) => p.id === permId);
          return {
            key: `${item.id}-${permId}`,
            label:
              bundleId
                ? perm?.name ?? permId
                : `${item.app.displayName} · ${perm?.name ?? permId}`,
          };
        }),
    );
  }

  const headerFilename = hasProfiles
    ? mode === 'separate' && profiles.length > 1
      ? `${profiles.length} profiles`
      : profiles[0]?.filename ?? 'profile.mobileconfig'
    : 'profile.mobileconfig';

  const downloadLabel =
    mode === 'separate' && profiles.length > 1
      ? `Download .zip (${profiles.length})`
      : 'Download';

  return (
    <div className="rounded-lg border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden flex flex-col max-h-[calc(100vh-5.5rem)]">
      {/* Title bar */}
      <div className="flex items-center gap-2.5 px-4 py-3 border-b border-border/60 bg-card-elevated/40">
        <FileCode2 className="w-4 h-4 text-primary" />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium truncate">{headerFilename}</div>
          <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
            {hasProfiles ? (
              <>
                <CheckCircle2 className="w-3 h-3 text-primary" />
                <span>
                  Valid · {totalBytes.toLocaleString()} bytes
                  {mode === 'separate' && profiles.length > 1
                    ? ` · ${profiles.length} files`
                    : ''}
                </span>
              </>
            ) : (
              <>
                <CircleDashed className="w-3 h-3" />
                <span>Awaiting input…</span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setWrap((w) => !w)}
          title={wrap ? 'Disable word wrap' : 'Wrap long lines'}
          aria-pressed={wrap}
          className={cn(
            'inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium border transition',
            wrap
              ? 'border-primary/40 bg-primary/15 text-primary'
              : 'border-border/60 text-muted-foreground hover:text-foreground hover:bg-card-elevated',
          )}
        >
          {wrap ? (
            <AlignLeft className="w-3.5 h-3.5" />
          ) : (
            <WrapText className="w-3.5 h-3.5" />
          )}
          {wrap ? 'No wrap' : 'Wrap'}
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-auto">
        {!hasProfiles && (
          <pre className="text-[11px] font-mono leading-relaxed p-4 whitespace-pre text-muted-foreground">
            {`<!-- Select an app and enable permissions to preview -->`}
          </pre>
        )}

        {hasProfiles && (
          <div className="divide-y divide-border/60">
            {profiles.map((p) => {
              const key = p.bundleId ?? p.filename;
              const open = !!openMap[key];
              const permTags = permsForBundle(p.bundleId);
              return (
                <div key={key}>
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMap((m) => ({ ...m, [key]: !m[key] }))
                    }
                    className="w-full flex items-center gap-2.5 px-4 py-3 text-left hover:bg-card-elevated/40 transition"
                  >
                    {open ? (
                      <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="text-[13px] font-medium truncate">
                        {p.filename}
                      </div>
                      <div className="text-[11px] text-muted-foreground truncate">
                        {p.policyName} · {p.xml.length.toLocaleString()} bytes
                      </div>
                    </div>
                  </button>
                  {open && (
                    <div className="bg-background/60 border-t border-border/60">
                      {permTags.length > 0 && (
                        <div className="px-4 py-2.5 border-b border-border/60">
                          <div className="section-label mb-1.5">Permissions</div>
                          <div className="flex flex-wrap gap-1.5">
                            {permTags.map((t) => (
                              <span
                                key={t.key}
                                className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[11px] font-medium"
                              >
                                {t.label}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      <div className="flex items-center justify-end px-2 py-1.5 border-b border-border/60">
                        <button
                          type="button"
                          onClick={() => copyXml(p, key)}
                          className="inline-flex items-center gap-1.5 text-[11px] px-2 py-1 rounded text-muted-foreground hover:text-foreground hover:bg-card-elevated/60 transition"
                        >
                          {copied === key ? (
                            <>
                              <Check className="w-3 h-3 text-primary" />
                              Copied
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              Copy XML
                            </>
                          )}
                        </button>
                      </div>
                      <div className="max-h-[60vh] overflow-auto">
                        <XmlHighlight xml={p.xml} wrap={wrap} />
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="grid grid-cols-2 gap-2 p-3 border-t border-border/60 bg-card-elevated/40">
        {mode === 'bundle' && (
          <button
            type="button"
            onClick={() => hasProfiles && copyXml(profiles[0], 'bundle')}
            disabled={!hasProfiles}
            className={cn(
              'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border border-border/60 transition',
              hasProfiles ? 'hover:bg-card-elevated' : 'opacity-50 cursor-not-allowed',
            )}
          >
            {copied === 'bundle' ? (
              <>
                <Check className="w-4 h-4 text-primary" />
                Copied
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy
              </>
            )}
          </button>
        )}
        {mode === 'separate' && (
          <div className="text-[11px] text-muted-foreground self-center px-2">
            Use Copy XML inside each profile, or Download for all.
          </div>
        )}
        <button
          type="button"
          onClick={() => void download()}
          disabled={!hasProfiles}
          className={cn(
            'inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md bg-primary text-primary-foreground font-medium transition shadow-sm',
            hasProfiles ? 'hover:bg-primary-strong' : 'opacity-50 cursor-not-allowed',
          )}
        >
          <Download className="w-4 h-4" />
          {downloadLabel}
        </button>
        <button
          type="button"
          onClick={onDeploy}
          disabled={!deployEnabled || !hasProfiles}
          className={cn(
            'col-span-2 inline-flex items-center justify-center gap-2 px-3 py-2 text-sm rounded-md border transition',
            deployEnabled && hasProfiles
              ? 'border-primary/50 bg-primary/10 text-primary hover:bg-primary/15'
              : 'border-border/60 bg-card-elevated/40 text-muted-foreground cursor-not-allowed',
          )}
          title={deployEnabled ? 'Continue to deploy' : 'Generate profiles first'}
        >
          <UploadIcon className="w-4 h-4" />
          {mode === 'separate' && profiles.length > 1
            ? `Deploy ${profiles.length} policies to Intune`
            : 'Deploy to Intune'}
        </button>
      </div>
    </div>
  );
}

