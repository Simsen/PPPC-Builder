import { Package, Layers } from 'lucide-react';
import type { OutputMode } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  value: OutputMode;
  onChange: (next: OutputMode) => void;
  appCount: number;
}

export function OutputModeToggle({ value, onChange, appCount }: Props) {
  return (
    <div className="px-5 py-3 border-b border-border/60 bg-card-elevated/30">
      <div className="section-label mb-2">Output</div>
      <div className="grid grid-cols-2 gap-2">
        <ModeButton
          active={value === 'bundle'}
          onClick={() => onChange('bundle')}
          icon={<Package className="w-4 h-4" />}
          title="Single bundle"
          subtitle={`One .mobileconfig for all ${appCount} app${appCount === 1 ? '' : 's'}`}
        />
        <ModeButton
          active={value === 'separate'}
          onClick={() => onChange('separate')}
          icon={<Layers className="w-4 h-4" />}
          title="Separate profiles"
          subtitle={`One .mobileconfig per app · ${appCount} polic${appCount === 1 ? 'y' : 'ies'}`}
        />
      </div>
    </div>
  );
}

function ModeButton({
  active,
  onClick,
  icon,
  title,
  subtitle,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
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
        <div className="text-sm font-medium">{title}</div>
        <div className="text-[11px] text-muted-foreground mt-0.5 truncate">
          {subtitle}
        </div>
      </div>
    </button>
  );
}
