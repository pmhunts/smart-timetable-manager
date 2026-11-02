import { useCallback } from 'react';
import toast from 'react-hot-toast';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';
import { getErrorBody, getErrorCode, getErrorMessage } from '../utils/errors.js';

/**
 * Shared handler for failed mutations: toasts the message and, when the backend reports the
 * editing window closed, pushes the returned window state into context so the UI locks itself.
 * Returns the error code so callers can branch (e.g. TASK_OVERLAP).
 */
export default function useMutationError() {
  const editingWindow = useEditingWindow();
  return useCallback(
    (err, fallback) => {
      const code = getErrorCode(err);
      if (code === 'EDITING_WINDOW_CLOSED') {
        const body = getErrorBody(err);
        if (body.editingWindow) editingWindow?.applyState(body.editingWindow);
        else editingWindow?.refresh();
      }
      if (code !== 'TASK_OVERLAP') toast.error(getErrorMessage(err, fallback));
      return code;
    },
    [editingWindow]
  );
}
