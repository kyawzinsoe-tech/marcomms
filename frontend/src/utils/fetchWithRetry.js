/**
 * Lightweight exponential backoff fetch wrapper for idempotent GET operations.
 * Retries only transient network errors or gateway 502/503/504 status codes.
 * Excludes 4xx client errors (400, 401, 403, 404, 422) from retry loops.
 */
export async function fetchWithRetry(url, options = {}, maxRetries = 2, delayMs = 200) {
  let attempt = 0;

  while (attempt <= maxRetries) {
    try {
      const response = await fetch(url, options);

      // Return immediately on success or client-side errors (400, 401, 403, 404, 422)
      if (response.ok || (response.status >= 400 && response.status < 500)) {
        return response;
      }

      // If server error 500-504 and attempts remain, retry with backoff
      if (response.status >= 500 && attempt < maxRetries) {
        attempt++;
        const backoff = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      return response;
    } catch (err) {
      // Network failure (e.g. TypeError: Failed to fetch)
      if (attempt < maxRetries) {
        attempt++;
        const backoff = delayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw err;
    }
  }
}
