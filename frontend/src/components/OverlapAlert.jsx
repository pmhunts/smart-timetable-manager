import { AlertTriangle } from 'lucide-react';
import { formatTime12 } from '../utils/date.js';

/** Shows server-reported overlapping tasks (409 TASK_OVERLAP). */
export default function OverlapAlert({ conflicts, message }) {
  if (!conflicts?.length && !message) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">
      <div className="flex items-center gap-2 font-medium">
        <AlertTriangle className="h-4 w-4" />
        {message || 'This time overlaps with other tasks'}
      </div>
      {conflicts?.length > 0 && (
        <ul className="mt-2 space-y-1 pl-6 text-xs">
          {conflicts.map((c) => (
            <li key={c.id ?? `${c.title}-${c.startTime}`} className="list-disc">
              <span className="font-medium">{c.title}</span> · {formatTime12(c.startTime)} – {formatTime12(c.endTime)}
            </li>
          ))}
        </ul>
      )}
      <p className="mt-2 text-xs opacity-80">Change the time, or enable “Allow overlap” for this task.</p>
    </div>
  );
}
