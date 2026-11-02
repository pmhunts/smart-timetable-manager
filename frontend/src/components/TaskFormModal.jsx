import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import Modal from './ui/Modal.jsx';
import Button from './ui/Button.jsx';
import TaskFields from './TaskFields.jsx';
import OverlapAlert from './OverlapAlert.jsx';
import LockBanner from './LockBanner.jsx';
import { taskService } from '../services/taskService.js';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useMutationError from '../hooks/useMutationError.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { emptyTask, formToPayload, taskToForm, validateTask } from '../utils/task.js';
import { getErrorBody, getFieldErrors } from '../utils/errors.js';

/** Create (POST /tasks) or edit (PUT /tasks/:id) a single task. */
export default function TaskFormModal({ open, onClose, task, defaultDate, onSaved }) {
  const { today } = useUserTimezone();
  const { isLocked } = useEditingWindow();
  const handleError = useMutationError();
  const [form, setForm] = useState(() => emptyTask());
  const [errors, setErrors] = useState({});
  const [overlap, setOverlap] = useState(null);
  const [saving, setSaving] = useState(false);
  const editing = Boolean(task?.id);

  useEffect(() => {
    if (!open) return;
    setForm(task ? taskToForm(task) : emptyTask({ scheduleDate: defaultDate || today }));
    setErrors({});
    setOverlap(null);
  }, [open, task, defaultDate, today]);

  const onChange = (patch) => setForm((f) => ({ ...f, ...patch }));

  const submit = async (e) => {
    e?.preventDefault();
    const v = validateTask(form, { requireDate: true });
    if (form.scheduleDate && form.scheduleDate < today) v.scheduleDate = 'Past dates are read-only';
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    setOverlap(null);
    try {
      const payload = formToPayload(form, { includeDate: true, includeId: false });
      const saved = editing ? await taskService.update(task.id, payload) : await taskService.create(payload);
      toast.success(editing ? 'Task updated' : 'Task created');
      onSaved?.(saved);
      onClose();
    } catch (err) {
      const code = handleError(err, 'Could not save the task');
      if (code === 'TASK_OVERLAP') setOverlap(getErrorBody(err));
      setErrors(getFieldErrors(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? 'Edit task' : 'New task'}
      description={editing ? 'Changes to time or title notify you if update alerts are on.' : 'Adds the task to that day’s timetable.'}
      size="lg"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving} disabled={isLocked}>
            {editing ? 'Save changes' : 'Create task'}
          </Button>
        </>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        {isLocked && <LockBanner compact />}
        {overlap && <OverlapAlert conflicts={overlap.conflicts} message={overlap.message} />}
        <TaskFields value={form} onChange={onChange} errors={errors} showDate minDate={today} disabled={isLocked} />
        <button type="submit" className="hidden" />
      </form>
    </Modal>
  );
}
