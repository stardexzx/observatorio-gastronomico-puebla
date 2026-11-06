import { useEffect, useState } from 'react';
export default function useRemoteData(loader, deps = []) {
  const [attempt, setAttempt] = useState(0);
  const [state, setState] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    let live = true;
    Promise.resolve().then(() => { if (live) setState({ loading: true, data: null, error: null }); return loader(); }).then(data => { if (live) setState({ loading: false, data, error: null }); }).catch(error => { if (live) setState({ loading: false, data: null, error }); });
    return () => { live = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);
  return { ...state, retry: () => setAttempt(value => value + 1) };
}
