import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import Input from './ui/Input.jsx';
import LockBanner from './LockBanner.jsx';
import { timetableService } from '../services/timetableService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useMutationError from '../hooks/useMutationError.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { addDays, formatDate } from '../utils/date.js';
import { getErrorBody, getErrorCode } from '../utils/errors.js';

/** POST /timetable/:id/duplicate → copies all tasks to another date. */
export default function DuplicateTimetableModal({ timetable, open, onClose, onDuplicated }) {
  const { today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const handleError = useMutationError();
  const [targetDate, setTargetDate] = useState('');
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open && timetable) {
      const next = timetable.scheduleDate >= today ? addDays(timetable.scheduleDate, 1) : addDays(today, 1);
      setTargetDate(next);
      setTitle(`${timetable.title}`);
      setError('');
      setExistingId(null);
    }
  }, [open, timetable, today]);

  const submit = async () => {
    if (!targetDate) return setError('Pick a date');
    if (targetDate < today) return setError('Pick today or a future date');
    setSaving(true);
    setExistingId(null);
    try {
      const created = await timetableService.duplicate(timetable.id, { targetDate, title: title.trim() || undefined });
      toast.success(`Timetable copied to ${formatDate(targetDate)}`);
      onDuplicated?.(created);
      onClose();
    } catch (err) {
      if (getErrorCode(err) === 'TIMETABLE_EXISTS') {
        setExistingId(getErrorBody(err).existingId);
        setError('A timetable already exists for this date.');
      } else {
        handleError(err, 'Could not duplicate the timetable');
      }
    } finally {
      setSaving(false);
    }
    return undefined;
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Duplicate timetable"
      description={timetable ? `Copy all ${timetable.taskCount ?? ''} tasks from ${formatDate(timetable.scheduleDate)} to another day.` : ''}
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={isLocked}>
            Duplicate
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {isLocked && <LockBanner compact />}
        <Input label="Target date" type="date" min={today} value={targetDate} onChange={(e) => setTargetDate(e.target.value)} error={error} disabled={isLocked} />
        {existingId && (
          <Button to={`/timetable/${existingId}`} variant="soft" size="sm" onClick={onClose}>
            Open existing timetable
          </Button>
        )}
        <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={255} disabled={isLocked} />
      </div>
    </Modal>
  );
}
