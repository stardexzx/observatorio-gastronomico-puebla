import { useState } from 'react';
import useRemoteData from './useRemoteData.js';
export const PAGE_SIZE = 12;
export default function useCatalog(loader, initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const [offset, setOffset] = useState(0);
  const result = useRemoteData(() => loader({ query, offset, limit: PAGE_SIZE }), [loader, query, offset]);
  return { ...result, items: result.data?.items || [], query, offset, hasMore: result.data?.hasMore || false,
    search: value => { setQuery(value); setOffset(0); }, previous: () => setOffset(n => Math.max(0, n - PAGE_SIZE)), next: () => setOffset(n => n + PAGE_SIZE) };
}
