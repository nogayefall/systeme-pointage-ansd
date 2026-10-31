import { useCallback, useEffect, useRef, useState } from 'react';
import { errorMessage } from '../services/api';

/**
 * Charge des données et expose { data, loading, error, reload }.
 * `silent` : le rechargement automatique ne remet pas l'écran en chargement.
 */
export default function useFetch(fetcher, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null });
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const counter = useRef(0);

  const load = useCallback(async ({ silent = false } = {}) => {
    const id = ++counter.current;
    if (!silent) setState((s) => ({ ...s, loading: true, error: null }));
    try {
      const data = await fetcherRef.current();
      if (id === counter.current) setState({ data, loading: false, error: null });
    } catch (e) {
      if (id === counter.current) {
        setState((s) => ({ data: silent ? s.data : null, loading: false, error: errorMessage(e) }));
      }
    }
  }, []);

  useEffect(() => {
    load();
    return () => { counter.current += 1; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  const reload = useCallback((opts) => load(opts), [load]);
  return { ...state, reload };
}
