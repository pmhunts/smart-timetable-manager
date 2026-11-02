import cn from '../../utils/cn.js';

export default function Card({ title, description, icon: Icon, actions, children, className, bodyClassName, padded = true }) {
  const hasHeader = title || actions;
  return (
    <section className={cn('card', className)}>
      {hasHeader && (
        <header className="flex items-start justify-between gap-3 px-5 pt-4">
          <div className="flex min-w-0 items-start gap-2.5">
            {Icon && (
              <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
                <Icon className="h-4 w-4" />
              </div>
            )}
            <div className="min-w-0">
              {title && <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{title}</h3>}
              {description && <p className="mt-0.5 text-xs text-zinc-500">{description}</p>}
            </div>
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(padded && 'p-5', hasHeader && padded && 'pt-4', bodyClassName)}>{children}</div>
    </section>
  );
}
