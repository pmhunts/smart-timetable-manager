import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { settingsService } from '../services/settingsService.js';

const EditingWindowContext = createContext(null);
const REFRESH_MS = 60_000;

/**
 * Keeps the editing-window state in sync with the server. The backend is the authority;
 * this only drives read-only UI. Countdown targets are absolute instants, and `clockOffset`
 * corrects for drift between the browser clock and server time.
 */
export function EditingWindowProvider({ children }) {
  const [data, setData] = useState(null); // { settings, state }
  const [loading, setLoading] = useState(true);
  const [clockOffset, setClockOffset] = useState(0);
  const timer = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const res = await settingsService.getEditingWindow();
      setData(res);
      if (res?.state?.serverTime) {
        setClockOffset(new Date(res.state.serverTime).getTime() - Date.now());
      }
      return res;
    } catch {
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    timer.current = setInterval(refresh, REFRESH_MS);
    return () => clearInterval(timer.current);
  }, [refresh]);

  // Re-fetch exactly when the current window closes or the next one opens.
  useEffect(() => {
    const state = data?.state;
    if (!state) return undefined;
    const target = state.isOpen ? state.currentWindow?.closesAt : state.nextWindow?.opensAt;
    if (!target) return undefined;
    const ms = new Date(target).getTime() - (Date.now() + clockOffset) + 1000;
    if (ms <= 0 || ms > REFRESH_MS) return undefined;
    const t = setTimeout(refresh, ms);
    return () => clearTimeout(t);
  }, [data, clockOffset, refresh]);

  /** Apply a state object received from elsewhere (e.g. a 403 body or dashboard payload). */
  const applyState = useCallback((state) => {
    if (state) setData((prev) => ({ ...(prev || {}), state }));
  }, []);

  const value = useMemo(
    () => ({
      settings: data?.settings || null,
      state: data?.state || null,
      isLocked: Boolean(data?.state?.isLocked),
      loading,
      clockOffset,
      refresh,
      applyState,
      setData,
    }),
    [data, loading, clockOffset, refresh, applyState]
  );

  return <EditingWindowContext.Provider value={value}>{children}</EditingWindowContext.Provider>;
}

export const useEditingWindow = () => useContext(EditingWindowContext);
