import { FileText, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardBody } from './Card';
import { generateRandomUUID } from '@/lib/uuid';
import type { ProfileSettings as ProfileSettingsType } from '@/lib/types';

interface Props {
  value: ProfileSettingsType;
  onChange: (next: ProfileSettingsType) => void;
  contextLabel?: string;
}

const inputCls =
  'w-full bg-input/60 border border-border/60 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring/60 focus:border-ring/60 transition';

export function ProfileSettings({ value, onChange, contextLabel }: Props) {
  function update<K extends keyof ProfileSettingsType>(
    key: K,
    next: ProfileSettingsType[K],
  ) {
    onChange({ ...value, [key]: next });
  }

  return (
    <Card>
      <CardHeader
        icon={<FileText className="w-4 h-4" />}
        title="Profile metadata"
        subtitle={
          contextLabel ?? 'Identification shown in Intune and on the Mac'
        }
      />
      <CardBody>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Field label="Organization">
            <input
              type="text"
              value={value.organization}
              onChange={(e) => update('organization', e.target.value)}
              placeholder="IT Department"
              className={inputCls}
            />
          </Field>
          <Field label="Payload Name">
            <input
              type="text"
              value={value.payloadName}
              onChange={(e) => update('payloadName', e.target.value)}
              placeholder="PPPC - App Name"
              className={inputCls}
            />
          </Field>
          <Field label="Payload Identifier (UUID)">
            <div className="flex gap-2">
              <input
                type="text"
                value={value.payloadIdentifier}
                onChange={(e) => update('payloadIdentifier', e.target.value)}
                placeholder="Auto-generated UUID"
                className={`${inputCls} font-mono text-xs`}
              />
              <button
                type="button"
                onClick={() => update('payloadIdentifier', generateRandomUUID())}
                title="Generate new UUID"
                className="px-3 rounded-md border border-border/60 hover:bg-card-elevated text-muted-foreground hover:text-foreground transition"
              >
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>
          </Field>
          <Field label="Payload Description" optional>
            <input
              type="text"
              value={value.payloadDescription}
              onChange={(e) => update('payloadDescription', e.target.value)}
              placeholder="Description for this profile"
              className={inputCls}
            />
          </Field>
        </div>
      </CardBody>
    </Card>
  );
}

function Field({
  label,
  optional,
  children,
}: {
  label: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-muted-foreground mb-1.5 tracking-wide uppercase">
        {label}
        {optional && (
          <span className="text-muted-foreground/70 font-normal normal-case"> (optional)</span>
        )}
      </label>
      {children}
    </div>
  );
}
