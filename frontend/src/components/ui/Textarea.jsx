import { forwardRef, useId } from 'react';
import cn from '../../utils/cn.js';

const Textarea = forwardRef(function Textarea({ label, error, className, id, rows = 3, ...props }, ref) {
  const autoId = useId();
  const areaId = id || autoId;
  return (
    <div className={className}>
      {label && (
        <label htmlFor={areaId} className="label">
          {label}
        </label>
      )}
      <textarea ref={ref} id={areaId} rows={rows} className={cn('field resize-y', error && 'border-rose-400')} {...props} />
      {error && <p className="mt-1 text-xs text-rose-600 dark:text-rose-400">{error}</p>}
    </div>
  );
});

export default Textarea;
