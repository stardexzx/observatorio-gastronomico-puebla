/** Use the HTTP Host seen by the browser; Next can normalize request.url to localhost. */
export function isSameOriginJson(request: Pick<Request, 'url' | 'headers'>): boolean {
  if (!request.headers.get('content-type')?.toLowerCase().startsWith('application/json')) return false;
  const origin = request.headers.get('origin'), host = request.headers.get('host');
  if (!origin || !host || /[\s/\\@?#]/.test(host)) return false;
  try {
    const protocol = new URL(request.url).protocol;
    if (!['http:', 'https:'].includes(protocol)) return false;
    const expected = new URL(`${protocol}//${host}`).origin;
    return origin === expected;
  } catch { return false; }
}
