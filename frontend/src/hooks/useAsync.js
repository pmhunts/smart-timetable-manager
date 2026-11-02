import { useCallback, useEffect, useRef, useState } from 'react';
import { getErrorMessage } from '../utils/errors.js';

/**
 * Runs `fn` whenever `deps` change and exposes { data, loading, error, reload, setData }.
 * Stale responses from superseded calls are ignored.
 */
export default function useAsync(fn, deps = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const callId = useRef(0);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const run = useCallback(fn, deps);

  const reload = useCallback(
    async ({ silent = false } = {}) => {
      const id = ++callId.current;
      if (!silent) setLoading(true);
      setError(null);
      try {
        const result = await run();
        if (id === callId.current) setData(result);
        return result;
      } catch (err) {
        if (id === callId.current) setError(getErrorMessage(err));
        return undefined;
      } finally {
        if (id === callId.current) setLoading(false);
      }
    },
    [run]
  );

  useEffect(() => {
    if (immediate) reload();
  }, [reload, immediate]);

  return { data, setData, loading, error, reload };
}
