import { forwardRef, useId } from 'react';
import cn from '../../utils/cn.js';

/** `options`: array of strings or { value, label }. */
const Select = forwardRef(function Select({ label, error, options = [], className, id, children, ...props }, ref) {
  const autoId = useId();
  const selectId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={selectId} className="label">
          {label}
        </label>
      )}
      <select ref={ref} id={selectId} className={cn('field pr-8', error && 'border-rose-400')} {...props}>
        {children}
        {options.map((o) => {
          const opt = typeof o === 'string' ? { value: o, label: o } : o;
          return (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          );
        })}
      </select>
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
});

export default Select;
