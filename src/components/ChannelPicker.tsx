import { Laptop, User } from 'lucide-react';
import type { DeploymentChannel } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  value: DeploymentChannel;
  onChange: (next: DeploymentChannel) => void;
}

/**
 * Choose how the policy is delivered: device-channel (system-wide, no user
 * sign-in needed) or user-channel (applies to the signed-in user only).
 * For PPPC the practical default is deviceChannel; userChannel exists for
 * per-user privacy preference profiles.
 */
export function ChannelPicker({ value, onChange }: Props) {
  return (
    <div className="grid grid-cols-2 gap-2">
      <Option
        active={value === 'deviceChannel'}
        onClick={() => onChange('deviceChannel')}
        icon={<Laptop className="w-4 h-4" />}
        title="Device channel"
        sub="System-wide, no user required"
      />
      <Option
        active={value === 'userChannel'}
        onClick={() => onChange('userChannel')}
        icon={<User className="w-4 h-4" />}
        title="User channel"
        sub="Per signed-in user"
      />
    </div>
  );
}

function Option({
  active,
  onClick,
  icon,
  title,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  sub: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex items-start gap-2 p-2.5 rounded-md border text-left transition',
        active
          ? 'border-primary/50 bg-primary/8 ring-1 ring-primary/40'
          : 'border-border/60 hover:bg-card-elevated/60',
      )}
    >
      <div
        className={cn(
          'mt-0.5 w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0',
          active ? 'bg-primary/15 text-primary' : 'bg-card text-muted-foreground',
        )}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-[12px] font-medium leading-tight">{title}</div>
        <div className="text-[10px] text-muted-foreground mt-0.5 truncate">
          {sub}
        </div>
      </div>
    </button>
  );
}
