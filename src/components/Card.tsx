import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Card({
  children,
  className,
  label,
}: {
  children: ReactNode;
  className?: string;
  label?: string;
}) {
  return (
    <div className={cn('mb-5', className)}>
      {label && <div className="section-label mb-2 px-1">{label}</div>}
      <section className="rounded-lg border border-border/60 bg-card shadow-[var(--shadow-soft)] overflow-hidden">
        {children}
      </section>
    </div>
  );
}

export function CardBody({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <div className={cn('p-5', className)}>{children}</div>;
}

export function CardHeader({
  icon,
  title,
  subtitle,
  actions,
}: {
  icon?: ReactNode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 px-5 pt-4 pb-3 border-b border-border/60">
      {icon && (
        <div className="w-8 h-8 rounded-md bg-primary/10 text-primary flex items-center justify-center">
          {icon}
        </div>
      )}
      <div className="flex-1 min-w-0">
        <h2 className="text-base font-semibold leading-tight">{title}</h2>
        {subtitle && (
          <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
        )}
      </div>
      {actions}
    </div>
  );
}
