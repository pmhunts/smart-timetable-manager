import { CalendarClock } from 'lucide-react';
import cn from '../utils/cn.js';

export default function Logo({ className, showText = true }) {
  return (
    <div className={cn('flex items-center gap-2.5', className)}>
      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-accent-500 to-violet-600 text-white shadow-sm">
        <CalendarClock className="h-4 w-4" />
      </div>
      {showText && (
        <div className="leading-tight">
          <p className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">Smart Timetable</p>
          <p className="text-[11px] text-zinc-500">Plan · Focus · Follow through</p>
        </div>
      )}
    </div>
  );
}
