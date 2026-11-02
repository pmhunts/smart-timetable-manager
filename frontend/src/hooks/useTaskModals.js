import { useCallback, useState } from 'react';
import toast from 'react-hot-toast';
import { taskService } from '../services/taskService.js';
import useMutationError from './useMutationError.js';

/**
 * Shared state for task detail / edit / delete modals used by several pages.
 * `onChanged()` is called after any successful mutation so the page can refetch.
 */
export default function useTaskModals(onChanged) {
  const handleError = useMutationError();
  const [selected, setSelected] = useState(null);
  const [editing, setEditing] = useState(null); // task object, or {} for "new"
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  const openDetail = useCallback((task) => setSelected(task), []);
  const closeDetail = useCallback(() => setSelected(null), []);
  const openEdit = useCallback((task) => {
    setSelected(null);
    setEditing(task || {});
  }, []);
  const closeEdit = useCallback(() => setEditing(null), []);
  const askDelete = useCallback((task) => {
    setSelected(null);
    setDeleting(task);
  }, []);

  const onStatusChange = useCallback(
    (updated) => {
      setSelected((s) => (s && s.id === updated.id ? updated : s));
      onChanged?.(updated);
    },
    [onChanged]
  );

  const confirmDelete = useCallback(async () => {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await taskService.remove(deleting.id);
      toast.success('Task deleted');
      setDeleting(null);
      onChanged?.();
    } catch (err) {
      handleError(err, 'Could not delete the task');
    } finally {
      setDeleteBusy(false);
    }
  }, [deleting, handleError, onChanged]);

  return {
    selected,
    editing,
    deleting,
    deleteBusy,
    openDetail,
    closeDetail,
    openEdit,
    closeEdit,
    askDelete,
    cancelDelete: () => setDeleting(null),
    confirmDelete,
    onStatusChange,
  };
}
