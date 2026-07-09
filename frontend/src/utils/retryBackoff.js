// Retries `fn` with exponential backoff while `isActive()` returns true,
// giving up (loudly) after maxAttempts instead of retrying forever.
export function retryWithBackoff(fn, isActive, options = {}) {
  const { maxAttempts = 8, baseDelayMs = 1000, maxDelayMs = 15000, label = 'operation' } = options;
  let attempt = 0;

  const run = () => {
    fn().catch(err => {
      if (!isActive()) return;
      attempt += 1;
      if (attempt >= maxAttempts) {
        console.error(`${label}: giving up after ${attempt} attempts`, err);
        return;
      }
      const delay = Math.min(baseDelayMs * 2 ** (attempt - 1), maxDelayMs);
      console.warn(`${label}: attempt ${attempt} failed, retrying in ${delay}ms`);
      setTimeout(run, delay);
    });
  };

  run();
}
