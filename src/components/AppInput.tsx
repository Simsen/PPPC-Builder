import { useRef, useState, type DragEvent } from 'react';
import { Upload, ChevronDown, AlertCircle, Package } from 'lucide-react';
import { Card, CardHeader, CardBody } from './Card';
import { processFile } from '@/lib/files';
import type { AppInfo, KnownApp } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  knownApps: KnownApp[];
  onAppDetected: (info: AppInfo, fromKnownList: boolean) => void;
  onError: (message: string) => void;
  error: string | null;
  onClearError: () => void;
  alreadySelectedBundleIds: string[];
}

export function AppInput({
  knownApps,
  onAppDetected,
  onError,
  error,
  onClearError,
  alreadySelectedBundleIds,
}: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    onClearError();
    for (const file of Array.from(files)) {
      try {
        const info = await processFile(file, knownApps);
        onAppDetected(info, false);
      } catch (e) {
        onError(e instanceof Error ? e.message : String(e));
      }
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    setDragOver(false);
    void handleFiles(e.dataTransfer.files);
  }

  function pickKnown(bundleId: string) {
    const known = knownApps.find((a) => a.bundleId === bundleId);
    if (!known) return;
    setMenuOpen(false);
    onClearError();
    onAppDetected(
      {
        bundleId: known.bundleId,
        displayName: known.displayName,
        codeRequirement: known.codeRequirement,
      },
      true,
    );
  }

  return (
    <Card>
      <CardHeader
        icon={<Upload className="w-4 h-4" />}
        title="Select Application"
        subtitle="Upload a .zip / Info.plist or pick a known app"
      />
      <CardBody>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
        <label
          className={cn(
            'relative flex flex-col items-center justify-center p-8 rounded-md border-2 border-dashed border-border bg-background/40 cursor-pointer transition',
            dragOver && 'border-primary bg-primary/5',
          )}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".zip,.plist"
            multiple
            className="sr-only"
            onChange={(e) => {
              void handleFiles(e.target.files);
              e.target.value = '';
            }}
          />
          <Upload className="w-10 h-10 text-muted-foreground mb-2" />
          <p className="text-sm">
            Drag & drop a <span className="text-primary font-medium">.zip</span>{' '}
            file
          </p>
          <p className="text-xs text-muted-foreground">
            containing your .app bundle
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            or upload an{' '}
            <span className="text-primary font-medium">Info.plist</span>{' '}
            directly
          </p>
        </label>

        <div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="w-full flex items-center justify-between gap-2 px-4 py-3 rounded-md border border-border bg-background/40 hover:bg-background/60 transition"
          >
            <span className="flex items-center gap-2">
              <Package className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm">Or select a known application…</span>
            </span>
            <ChevronDown
              className={cn(
                'w-4 h-4 transition',
                menuOpen && 'rotate-180',
              )}
            />
          </button>
          {menuOpen && (
            <div className="mt-2 rounded-md border border-border bg-card shadow-[var(--shadow-soft)] overflow-y-auto max-h-[480px]">
              {knownApps.length === 0 && (
                <div className="px-4 py-3 text-xs text-muted-foreground">
                  No known apps in the library yet.
                </div>
              )}
              {knownApps.map((app) => {
                const already = alreadySelectedBundleIds.includes(app.bundleId);
                return (
                  <button
                    key={app.bundleId}
                    type="button"
                    disabled={already}
                    onClick={() => pickKnown(app.bundleId)}
                    className={cn(
                      'w-full text-left px-4 py-2.5 text-sm hover:bg-card-elevated/60 transition border-b border-border/40 last:border-0',
                      already && 'opacity-50 cursor-not-allowed',
                    )}
                  >
                    <div className="font-medium">{app.displayName}</div>
                    <div className="text-xs text-muted-foreground">
                      {app.bundleId}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 p-3 rounded-md bg-destructive/10 text-destructive text-sm">
          <AlertCircle className="w-4 h-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}
      </CardBody>
    </Card>
  );
}
