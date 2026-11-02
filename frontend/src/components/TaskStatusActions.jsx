import { useState } from 'react';
import toast from 'react-hot-toast';
import { Check, RotateCcw, SkipForward } from 'lucide-react';
import Button from './ui/Button.jsx';
import { taskService } from '../services/taskService.js';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Complete / Skip / Undo buttons. Status changes are allowed even while the timetable is locked.
 * `onChange(updatedTask)` receives the server response.
 */
export default function TaskStatusActions({ task, onChange, size = 'xs', showLabels = true }) {
  const [busy, setBusy] = useState(null);
  const done = task.status === 'COMPLETED' || task.status === 'SKIPPED';

  const update = async (status, label) => {
    setBusy(status);
    try {
      const updated = await taskService.setStatus(task.id, status);
      toast.success(label);
      onChange?.(updated);
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not update the task'));
    } finally {
      setBusy(null);
    }
  };

  if (done) {
    return (
      <Button variant="ghost" size={size} icon={RotateCcw} loading={busy === 'UPCOMING'} onClick={() => update('UPCOMING', 'Task restored')}>
        {showLabels && 'Undo'}
      </Button>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        variant="soft"
        size={size}
        icon={Check}
        loading={busy === 'COMPLETED'}
        disabled={Boolean(busy)}
        onClick={() => update('COMPLETED', 'Marked as completed 🎉')}
        title="Mark completed"
      >
        {showLabels && 'Done'}
      </Button>
      <Button
        variant="ghost"
        size={size}
        icon={SkipForward}
        loading={busy === 'SKIPPED'}
        disabled={Boolean(busy)}
        onClick={() => update('SKIPPED', 'Task skipped')}
        title="Skip task"
      >
        {showLabels && 'Skip'}
      </Button>
    </div>
  );
}
