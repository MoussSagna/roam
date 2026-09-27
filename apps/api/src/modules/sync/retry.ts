import { ProviderTimeoutError, ProviderUnavailableError } from '../providers/provider.errors.js';

/**
 * Retry policy of the sync orchestrator (DATA_PERSISTENCE_AND_SYNC.md "Retry"). Provider clients never retry; the
 * orchestrator retries a batch only for transient failures — timeout, network, 5xx — a few times with growing delays.
 * Never for 400/401/403/404, invalid responses, missing configuration, or 429 (the provider asked us to slow down: the
 * run stops and resumes later from its cursor).
 */
export const RETRY_DELAYS_MS = [1_000, 5_000] as const;

export function isRetryable(error: unknown): boolean {
  return error instanceof ProviderTimeoutError || error instanceof ProviderUnavailableError;
}

export async function withRetry<T>(
  run: () => Promise<T>,
  sleep: (ms: number) => Promise<void>,
  onRetry: (error: unknown, attempt: number) => void = () => undefined,
  delays: readonly number[] = RETRY_DELAYS_MS,
): Promise<T> {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isRetryable(error) || attempt >= delays.length) throw error;
      onRetry(error, attempt + 1);
      await sleep(delays[attempt]);
    }
  }
}
