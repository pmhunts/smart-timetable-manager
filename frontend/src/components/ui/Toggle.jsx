import { useId } from 'react';
import cn from '../../utils/cn.js';

/** Accessible switch. Renders a label/description row when `label` is given. */
export default function Toggle({ checked, onChange, disabled, label, description, icon: Icon, size = 'md', className }) {
  const id = useId();
  const dims = size === 'sm' ? { track: 'h-5 w-9', knob: 'h-4 w-4', on: 'translate-x-4' } : { track: 'h-6 w-11', knob: 'h-5 w-5', on: 'translate-x-5' };

  const control = (
    <button
      id={id}
      type="button"
      role="switch"
      aria-checked={Boolean(checked)}
      disabled={disabled}
      onClick={() => !disabled && onChange?.(!checked)}
      className={cn(
        'relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 transition-colors duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500/40 disabled:cursor-not-allowed disabled:opacity-50',
        dims.track,
        checked ? 'bg-accent-600' : 'bg-zinc-300 dark:bg-zinc-700'
      )}
    >
      <span
        className={cn(
          'inline-block transform rounded-full bg-white shadow transition-transform duration-200',
          dims.knob,
          checked ? dims.on : 'translate-x-0'
        )}
      />
    </button>
  );

  if (!label) return control;

  return (
    <div className={cn('flex items-center justify-between gap-4 py-2.5', disabled && 'opacity-60', className)}>
      <label htmlFor={id} className="flex min-w-0 cursor-pointer items-start gap-3">
        {Icon && <Icon className="mt-0.5 h-4 w-4 shrink-0 text-zinc-400" />}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-zinc-800 dark:text-zinc-200">{label}</span>
          {description && <span className="block text-xs text-zinc-500">{description}</span>}
        </span>
      </label>
      {control}
    </div>
  );
}
