import { forwardRef, useId } from 'react';
import cn from '../../utils/cn.js';

const Input = forwardRef(function Input({ label, error, hint, icon: Icon, className, id, right, ...props }, ref) {
  const autoId = useId();
  const inputId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={inputId} className="label">
          {label}
        </label>
      )}
      <div className="relative">
        {Icon && <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />}
        <input
          ref={ref}
          id={inputId}
          className={cn('field', Icon && 'pl-9', right && 'pr-10', error && 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20')}
          aria-invalid={Boolean(error)}
          {...props}
        />
        {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error ? (
        <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-zinc-500">{hint}</p>
      ) : null}
    </div>
  );
});

export default Input;
