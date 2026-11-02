import { Clock, Pencil, Trash2 } from 'lucide-react';
import Button from './ui/Button.jsx';
import TaskStatusActions from './TaskStatusActions.jsx';
import ReminderIcons from './ReminderIcons.jsx';
import { CategoryTag, PriorityBadge, StatusBadge } from './StatusBadge.jsx';
import { categoryStyle } from '../utils/constants.js';
import { durationLabel, formatDate, formatTime12 } from '../utils/date.js';
import cn from '../utils/cn.js';

/**
 * Full task row. `editable` controls edit/delete buttons (hidden when locked/past).
 */
export default function TaskCard({ task, onStatusChange, onEdit, onDelete, onOpen, editable = false, showDate = false }) {
  const style = categoryStyle(task.category);
  const faded = task.status === 'COMPLETED' || task.status === 'SKIPPED';

  return (
    <div
      className={cn(
        'group relative flex flex-col gap-3 rounded-xl border border-l-4 border-zinc-200 bg-white p-4 transition hover:shadow-soft sm:flex-row sm:items-start',
        'dark:border-zinc-800 dark:bg-zinc-900',
        style.bar,
        task.status === 'ONGOING' && 'ring-1 ring-sky-300 dark:ring-sky-500/40',
        task.status === 'MISSED' && 'bg-rose-50/40 dark:bg-rose-500/5'
      )}
    >
      <div className="w-28 shrink-0">
        {showDate && <p className="text-xs font-medium text-zinc-500">{formatDate(task.scheduleDate, { weekday: 'short', month: 'short', day: 'numeric' })}</p>}
        <p className="text-sm font-semibold tabular-nums text-zinc-800 dark:text-zinc-100">{formatTime12(task.startTime)}</p>
        <p className="flex items-center gap-1 text-xs text-zinc-500">
          <Clock className="h-3 w-3" /> {formatTime12(task.endTime)} · {durationLabel(task.startTime, task.endTime)}
        </p>
      </div>

      <button type="button" onClick={() => onOpen?.(task)} className="min-w-0 flex-1 text-left" disabled={!onOpen}>
        <p className={cn('font-medium text-zinc-900 dark:text-zinc-100', faded && 'text-zinc-500 line-through decoration-zinc-400 dark:text-zinc-500')}>
          {task.title}
        </p>
        {task.description && <p className="mt-0.5 line-clamp-2 text-sm text-zinc-500">{task.description}</p>}
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <StatusBadge status={task.status} />
          <CategoryTag category={task.category} />
          <PriorityBadge priority={task.priority} />
          <ReminderIcons task={task} className="ml-1" />
        </div>
      </button>

      <div className="flex shrink-0 items-center gap-1 self-end sm:self-start">
        {onStatusChange && <TaskStatusActions task={task} onChange={onStatusChange} />}
        {editable && onEdit && <Button variant="ghost" size="icon-sm" icon={Pencil} onClick={() => onEdit(task)} title="Edit task" aria-label="Edit task" />}
        {editable && onDelete && (
          <Button
            variant="ghost"
            size="icon-sm"
            icon={Trash2}
            onClick={() => onDelete(task)}
            className="hover:!bg-rose-50 hover:!text-rose-600 dark:hover:!bg-rose-500/10"
            title="Delete task"
            aria-label="Delete task"
          />
        )}
      </div>
    </div>
  );
}
