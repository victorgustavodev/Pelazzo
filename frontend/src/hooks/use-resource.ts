import { useEffect, useState, useCallback } from 'react';
import { message } from '../services/api';
export function useResource<T>(
  load: (signal: AbortSignal) => Promise<T>,
  dependencies: readonly unknown[],
) {
  const [state, setState] = useState<{
    key?: string;
    data?: T;
    error?: string;
    loading: boolean;
  }>({ loading: true });
  const [version, setVersion] = useState(0);
  const resourceKey = JSON.stringify([...dependencies, version]);
  useEffect(() => {
    const controller = new AbortController();
    load(controller.signal)
      .then((data) => {
        if (!controller.signal.aborted)
          setState({ key: resourceKey, data, loading: false });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setState({ key: resourceKey, error: message(error), loading: false });
      });
    return () => controller.abort();
    // The caller supplies stable resource keys; loader closures are refreshed with them.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceKey]);
  return {
    ...(state.key === resourceKey ? state : { loading: true }),
    reload: useCallback(() => setVersion((v) => v + 1), []),
  };
}
