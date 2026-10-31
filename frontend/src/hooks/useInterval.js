import { useEffect, useRef } from 'react';

/** Appelle `callback` toutes les `delay` ms (pause quand l'onglet est caché). */
export default function useInterval(callback, delay) {
  const saved = useRef(callback);
  saved.current = callback;

  useEffect(() => {
    if (!delay) return undefined;
    const tick = () => {
      if (!document.hidden) saved.current();
    };
    const id = setInterval(tick, delay);
    return () => clearInterval(id);
  }, [delay]);
}
