import { useState } from 'react';
import { Settings2, TimerReset } from 'lucide-react';
import Card from './ui/Card.jsx';
import Button from './ui/Button.jsx';
import Modal from './ui/Modal.jsx';
import EditingWindowStatus from './EditingWindowStatus.jsx';
import EditingWindowForm from './EditingWindowForm.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import { formatTime12, WEEKDAYS } from '../utils/date.js';

export default function EditingWindowCard() {
  const { settings, loading } = useEditingWindow();
  const [open, setOpen] = useState(false);

  const days = settings?.applicableDays || [];
  const daysLabel = days.length === 7 ? 'Every day' : days.map((d) => WEEKDAYS[d - 1]?.short).join(', ');

  return (
    <>
      <Card
        title="Timetable Configuration Window"
        description="When you're allowed to plan and change your day"
        icon={TimerReset}
        actions={
          <Button variant="secondary" size="sm" icon={Settings2} onClick={() => setOpen(true)}>
            Configure
          </Button>
        }
      >
        {loading ? (
          <div className="h-28 animate-pulse rounded-xl bg-zinc-100 dark:bg-zinc-800" />
        ) : (
          <>
            <EditingWindowStatus />
            {settings?.editingEnabled && (
              <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div>
                  <dt className="text-zinc-500">Opens</dt>
                  <dd className="font-medium">{formatTime12(settings.startTime)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Closes</dt>
                  <dd className="font-medium">{formatTime12(settings.endTime)}</dd>
                </div>
                <div>
                  <dt className="text-zinc-500">Days</dt>
                  <dd className="truncate font-medium" title={daysLabel}>
                    {daysLabel}
                  </dd>
                </div>
              </dl>
            )}
          </>
        )}
      </Card>

      <Modal open={open} onClose={() => setOpen(false)} title="Timetable Configuration Window" description="Restrict when your timetable can be created or changed." size="md">
        <EditingWindowForm onSaved={() => setOpen(false)} showStatus={false} />
      </Modal>
    </>
  );
}
