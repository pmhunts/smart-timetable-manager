import { CalendarDays, Clock, Pencil, Repeat, Trash2 } from 'lucide-react';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import TaskStatusActions from './TaskStatusActions.jsx';
import ReminderIcons from './ReminderIcons.jsx';
import { CategoryTag, PriorityBadge, StatusBadge } from './StatusBadge.jsx';
import { durationLabel, formatDateLong, formatTime12, WEEKDAYS } from '../utils/date.js';
import { REPEAT_TYPES } from '../utils/constants.js';

function repeatText(task) {
  if (task.sourceTaskId) return 'Occurrence of a recurring task';
  if (!task.repeatType || task.repeatType === 'NONE') return null;
  let text = REPEAT_TYPES.find((r) => r.value === task.repeatType)?.label;
  if (task.repeatType === 'CUSTOM' && task.repeatDays?.length) {
    text = `Every ${task.repeatDays.map((d) => WEEKDAYS[d - 1]?.short).join(', ')}`;
  }
  return task.repeatUntil ? `${text} until ${task.repeatUntil}` : text;
}

export default function TaskDetailModal({ task, open, onClose, onStatusChange, onEdit, onDelete, editable }) {
  if (!task) return null;
  const repeat = repeatText(task);
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={task.title}
      size="md"
      footer={
        <>
          {editable && onDelete && (
            <Button variant="ghost" icon={Trash2} className="mr-auto text-rose-600 hover:!bg-rose-50 dark:hover:!bg-rose-500/10" onClick={() => onDelete(task)}>
              Delete
            </Button>
          )}
          <TaskStatusActions task={task} onChange={onStatusChange} size="sm" />
          {editable && onEdit && (
            <Button variant="secondary" size="sm" icon={Pencil} onClick={() => onEdit(task)}>
              Edit
            </Button>
          )}
        </>
      }
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge status={task.status} />
          <CategoryTag category={task.category} />
          <PriorityBadge priority={task.priority} />
        </div>
        {task.description ? (
          <p className="whitespace-pre-line text-sm text-zinc-700 dark:text-zinc-300">{task.description}</p>
        ) : (
          <p className="text-sm italic text-zinc-400">No description</p>
        )}
        <dl className="grid gap-3 rounded-xl bg-zinc-50 p-4 text-sm dark:bg-zinc-800/50">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-zinc-400" />
            <dd>{formatDateLong(task.scheduleDate)}</dd>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-zinc-400" />
            <dd>
              {formatTime12(task.startTime)} – {formatTime12(task.endTime)}{' '}
              <span className="text-zinc-500">({durationLabel(task.startTime, task.endTime)})</span>
            </dd>
          </div>
          {repeat && (
            <div className="flex items-center gap-2">
              <Repeat className="h-4 w-4 text-zinc-400" />
              <dd>{repeat}</dd>
            </div>
          )}
          <div className="flex items-center gap-2">
            <span className="text-zinc-500">Reminders:</span>
            <ReminderIcons task={task} />
            <span className="text-xs text-zinc-500">{task.reminderEnabled === false ? 'Off' : 'On'}</span>
          </div>
        </dl>
        {!editable && <p className="text-xs text-zinc-500">This task is read-only right now (past date or editing window closed).</p>}
      </div>
    </Modal>
  );
}
