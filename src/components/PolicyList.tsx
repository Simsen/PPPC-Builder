import { useState } from 'react';
import { FileText, Wand2 } from 'lucide-react';
import { Card, CardHeader, CardBody } from './Card';
import { ScopeTagPicker } from './ScopeTagPicker';
import { ChannelPicker } from './ChannelPicker';
import type {
  DeploymentChannel,
  OutputMode,
  ProfileSettings,
  SelectedApp,
} from '@/lib/types';
import { safeFilename } from '@/lib/state';

interface Props {
  mode: OutputMode;
  apps: SelectedApp[];
  shared: ProfileSettings;
  signedIn: boolean;
  onChangeApp: (id: number, partial: Partial<SelectedApp>) => void;
  onChangeShared: (next: ProfileSettings) => void;
}

const inputCls =
  'w-full bg-input/60 border border-border/60 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60 transition';

/**
 * Per-policy name + description + scope tag editor on the Deploy step.
 */
export function PolicyList({
  mode,
  apps,
  shared,
  signedIn,
  onChangeApp,
  onChangeShared,
}: Props) {
  if (mode === 'bundle') {
    return (
      <Card>
        <CardHeader
          icon={<FileText className="w-4 h-4" />}
          title="Intune policy"
          subtitle="Name, description, and scope tags applied when uploading"
        />
        <CardBody className="space-y-3">
          <Row
            value={shared.payloadName}
            onValueChange={(v) => onChangeShared({ ...shared, payloadName: v })}
            description={shared.payloadDescription}
            onDescriptionChange={(v) =>
              onChangeShared({ ...shared, payloadDescription: v })
            }
            placeholderName="PPPC Configuration"
          />
          <ScopeTagRow
            value={shared.scopeTagIds}
            onChange={(ids) => onChangeShared({ ...shared, scopeTagIds: ids })}
            signedIn={signedIn}
          />
          <ChannelRow
            value={shared.deploymentChannel}
            onChange={(ch) =>
              onChangeShared({ ...shared, deploymentChannel: ch })
            }
          />
        </CardBody>
      </Card>
    );
  }

  // separate
  return (
    <Card>
      <CardHeader
        icon={<FileText className="w-4 h-4" />}
        title="Intune policies"
        subtitle={`${apps.length} policies will be uploaded — name, describe, and tag each one`}
      />
      <CardBody className="space-y-4">
        <BulkPattern apps={apps} onChangeApp={onChangeApp} />
        <div className="space-y-3">
          {apps.map((a) => (
            <div
              key={a.id}
              className="rounded-md border border-border/60 bg-card-elevated/30 p-3 space-y-3"
            >
              <div className="flex items-center gap-2">
                <div className="text-xs text-muted-foreground font-mono truncate">
                  {a.app.bundleId}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  → {safeFilename(a.profile.name || `PPPC - ${a.app.displayName}`)}.mobileconfig
                </div>
              </div>
              <Row
                value={a.profile.name}
                onValueChange={(v) =>
                  onChangeApp(a.id, { profile: { ...a.profile, name: v } })
                }
                description={a.profile.description}
                onDescriptionChange={(v) =>
                  onChangeApp(a.id, {
                    profile: { ...a.profile, description: v },
                  })
                }
                placeholderName={`PPPC - ${a.app.displayName}`}
              />
              <ScopeTagRow
                value={a.scopeTagIds}
                onChange={(ids) => onChangeApp(a.id, { scopeTagIds: ids })}
                signedIn={signedIn}
              />
              <ChannelRow
                value={a.deploymentChannel}
                onChange={(ch) =>
                  onChangeApp(a.id, { deploymentChannel: ch })
                }
              />
            </div>
          ))}
        </div>
      </CardBody>
    </Card>
  );
}

function Row({
  value,
  onValueChange,
  description,
  onDescriptionChange,
  placeholderName,
}: {
  value: string;
  onValueChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  placeholderName: string;
}) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
          Policy name
        </label>
        <input
          type="text"
          value={value}
          onChange={(e) => onValueChange(e.target.value)}
          placeholder={placeholderName}
          className={inputCls}
        />
      </div>
      <div>
        <label className="block text-[11px] font-medium text-muted-foreground mb-1">
          Description
        </label>
        <input
          type="text"
          value={description}
          onChange={(e) => onDescriptionChange(e.target.value)}
          placeholder="Optional"
          className={inputCls}
        />
      </div>
    </div>
  );
}

function ScopeTagRow({
  value,
  onChange,
  signedIn,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  signedIn: boolean;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
        Scope tags
      </label>
      <ScopeTagPicker value={value} onChange={onChange} signedIn={signedIn} />
    </div>
  );
}

function ChannelRow({
  value,
  onChange,
}: {
  value: DeploymentChannel;
  onChange: (next: DeploymentChannel) => void;
}) {
  return (
    <div>
      <label className="block text-[11px] font-medium text-muted-foreground mb-1">
        Deployment channel
      </label>
      <ChannelPicker value={value} onChange={onChange} />
    </div>
  );
}

function BulkPattern({
  apps,
  onChangeApp,
}: {
  apps: SelectedApp[];
  onChangeApp: (id: number, partial: Partial<SelectedApp>) => void;
}) {
  const [pattern, setPattern] = useState('PPPC - {appName}');
  const [descriptionPattern, setDescriptionPattern] = useState('');

  function apply() {
    for (const a of apps) {
      const name = pattern
        .replace(/\{appName\}/g, a.app.displayName)
        .replace(/\{bundleId\}/g, a.app.bundleId);
      const description = descriptionPattern
        .replace(/\{appName\}/g, a.app.displayName)
        .replace(/\{bundleId\}/g, a.app.bundleId);
      onChangeApp(a.id, {
        profile: {
          ...a.profile,
          name,
          description: description || a.profile.description,
        },
      });
    }
  }

  return (
    <div className="rounded-md border border-border/60 bg-background/30 p-3">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-3.5 h-3.5 text-muted-foreground" />
        <div className="section-label">Bulk rename</div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-2 items-end">
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Policy name pattern
          </label>
          <input
            type="text"
            value={pattern}
            onChange={(e) => setPattern(e.target.value)}
            className={inputCls}
            placeholder="PPPC - {appName}"
          />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-muted-foreground mb-1">
            Description pattern (optional)
          </label>
          <input
            type="text"
            value={descriptionPattern}
            onChange={(e) => setDescriptionPattern(e.target.value)}
            className={inputCls}
            placeholder="Privacy preferences for {appName}"
          />
        </div>
        <button
          type="button"
          onClick={apply}
          className="px-3 py-1.5 text-sm rounded-md bg-primary text-primary-foreground font-medium hover:bg-primary-strong transition shadow-sm"
        >
          Apply to all
        </button>
      </div>
      <p className="text-[10px] text-muted-foreground mt-2">
        Placeholders: <code>{'{appName}'}</code>, <code>{'{bundleId}'}</code>
      </p>
    </div>
  );
}
