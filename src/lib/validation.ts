export async function validateLink(url: string): Promise<'ok' | 'broken'> {
  if (!url || !url.trim()) return 'broken';

  try {
    // Try HEAD request first to save bandwidth
    const response = await fetch(url, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
    
    if (response.ok) return 'ok';
    
    // If HEAD fails (e.g. 403, 405), fallback to GET
    if (response.status === 403 || response.status === 405 || response.status === 404 /* sometimes head is 404 */) {
      const getResponse = await fetch(url, { method: 'GET', signal: AbortSignal.timeout(5000) });
      return getResponse.ok ? 'ok' : 'broken';
    }

    return 'broken';
  } catch (error) {
    // Catch fetch failures like DNS resolution, network timeout, invalid URL format, etc.
    return 'broken';
  }
}
