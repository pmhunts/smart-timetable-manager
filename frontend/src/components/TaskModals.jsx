import TaskDetailModal from './TaskDetailModal.jsx';
import TaskFormModal from './TaskFormModal.jsx';
import ConfirmDialog from './ui/ConfirmDialog.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import useUserTimezone from '../hooks/useUserTimezone.js';

/** Renders the detail / edit / delete modals driven by `useTaskModals`. */
export default function TaskModals({ modals, defaultDate, onSaved }) {
  const { isLocked } = useEditingWindow();
  const { today } = useUserTimezone();
  const sel = modals.selected;
  const canEdit = (task) => !isLocked && task && task.scheduleDate >= today;

  return (
    <>
      <TaskDetailModal
        task={sel}
        open={Boolean(sel)}
        onClose={modals.closeDetail}
        onStatusChange={modals.onStatusChange}
        onEdit={modals.openEdit}
        onDelete={modals.askDelete}
        editable={canEdit(sel)}
      />
      <TaskFormModal
        open={Boolean(modals.editing)}
        onClose={modals.closeEdit}
        task={modals.editing?.id ? modals.editing : null}
        defaultDate={defaultDate}
        onSaved={onSaved}
      />
      <ConfirmDialog
        open={Boolean(modals.deleting)}
        onClose={modals.cancelDelete}
        onConfirm={modals.confirmDelete}
        loading={modals.deleteBusy}
        title="Delete task?"
        message={
          modals.deleting
            ? `“${modals.deleting.title}” will be removed${
                modals.deleting.repeatType && modals.deleting.repeatType !== 'NONE' ? ' along with its future recurring occurrences' : ''
              }. Pending reminders are cancelled. This cannot be undone.`
            : ''
        }
        confirmLabel="Delete task"
      />
    </>
  );
}
