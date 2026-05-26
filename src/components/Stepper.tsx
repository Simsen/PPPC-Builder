import { Check, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

export type Step = 'build' | 'deploy';

interface Props {
  current: Step;
  onChange: (next: Step) => void;
  canDeploy: boolean;
}

const STEPS: Array<{ id: Step; label: string; hint: string }> = [
  { id: 'build', label: 'Build profiles', hint: 'Apps, permissions, metadata' },
  { id: 'deploy', label: 'Deploy to Intune', hint: 'Assignment & upload' },
];

export function Stepper({ current, onChange, canDeploy }: Props) {
  return (
    <nav className="flex items-center gap-1 mb-5" aria-label="Workflow steps">
      {STEPS.map((step, i) => {
        const active = step.id === current;
        const completed = step.id === 'build' && current === 'deploy';
        const enabled = step.id === 'build' || canDeploy;
        return (
          <div key={step.id} className="flex items-center gap-1">
            <button
              type="button"
              disabled={!enabled}
              onClick={() => enabled && onChange(step.id)}
              className={cn(
                'group flex items-center gap-2.5 px-3 py-2 rounded-md transition text-left',
                active && 'bg-card border border-border/60',
                !active && enabled && 'hover:bg-card-elevated/40',
                !enabled && 'opacity-50 cursor-not-allowed',
              )}
            >
              <span
                className={cn(
                  'w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-semibold flex-shrink-0',
                  active && 'bg-primary text-primary-foreground',
                  completed && 'bg-primary/20 text-primary',
                  !active && !completed && 'bg-card-elevated text-muted-foreground',
                )}
              >
                {completed ? <Check className="w-3.5 h-3.5" /> : i + 1}
              </span>
              <div className="leading-tight">
                <div
                  className={cn(
                    'text-[13px] font-medium',
                    active ? 'text-foreground' : 'text-muted-foreground',
                  )}
                >
                  {step.label}
                </div>
                <div className="text-[10px] text-muted-foreground/80">
                  {step.hint}
                </div>
              </div>
            </button>
            {i < STEPS.length - 1 && (
              <ChevronRight className="w-4 h-4 text-muted-foreground/60 mx-1" />
            )}
          </div>
        );
      })}
    </nav>
  );
}
