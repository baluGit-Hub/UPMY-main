import type { ReactNode } from 'react';

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
}

export default function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <div className="mb-8 flex flex-col gap-y-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex-1">
        <h1 className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">{title}</h1>
        {description && <p className="mt-2 text-base text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="mt-4 shrink-0 sm:mt-0 sm:ml-4">{actions}</div>}
    </div>
  );
}
