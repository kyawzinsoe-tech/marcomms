export function formatErrorMessage(rawError, fallback = 'An unexpected error occurred. Please try again.') {
  if (!rawError) return fallback;
  const msg = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);
  const lower = msg.toLowerCase();

  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('econnrefused')) {
    return 'Unable to connect to the server. Please check your network connection and try again.';
  }
  if (lower.includes('jwt') || lower.includes('session') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('sign in')) {
    return 'Your session has expired or is invalid. Please sign in again.';
  }
  if (lower.includes('permission') || lower.includes('access denied') || lower.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('failed to load assets') || lower.includes('failed to fetch assets')) {
    return 'Unable to load assets from the server. Please try again.';
  }
  if (lower.includes('failed to load suppliers') || lower.includes('failed to fetch suppliers')) {
    return 'Unable to load suppliers from the server. Please try again.';
  }
  if (lower.includes('failed to load production orders') || lower.includes('failed to fetch production orders')) {
    return 'Unable to load production orders from the server. Please try again.';
  }

  return msg;
}
