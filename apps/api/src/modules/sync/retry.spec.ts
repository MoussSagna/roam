import {
  ProviderAuthenticationError,
  ProviderConfigurationError,
  ProviderRateLimitError,
  ProviderRequestError,
  ProviderResponseError,
  ProviderTimeoutError,
  ProviderUnavailableError,
} from '../providers/provider.errors.js';
import { isRetryable, withRetry } from './retry.js';

describe('retry policy (orchestrator only; clients never retry)', () => {
  it('retryable: timeout, network, 5xx — never 400, 401/403, invalid data, missing key, 429', () => {
    expect(isRetryable(new ProviderTimeoutError('p', 'op', 'x'))).toBe(true);
    expect(isRetryable(new ProviderUnavailableError('p', 'op', 'HTTP 503', 503))).toBe(true);
    for (const error of [
      new ProviderRequestError('p', 'op', 'HTTP 400'),
      new ProviderAuthenticationError('p', 'op', 'HTTP 401'),
      new ProviderResponseError('p', 'op', 'shape'),
      new ProviderConfigurationError('p', 'op', 'no key'),
      new ProviderRateLimitError('p', 'op', 'HTTP 429'),
      new RangeError('x'),
    ])
      expect(isRetryable(error)).toBe(false);
  });

  it('retries a transient failure with the configured delays, then succeeds', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const run = vi
      .fn()
      .mockRejectedValueOnce(new ProviderTimeoutError('p', 'op', 'x'))
      .mockResolvedValueOnce('ok');
    await expect(withRetry(run, sleep, undefined, [10, 20])).resolves.toBe('ok');
    expect(sleep).toHaveBeenCalledWith(10);
  });

  it('gives up after the last delay; a non-retryable error is thrown at once', async () => {
    const sleep = vi.fn().mockResolvedValue(undefined);
    const unavailable = new ProviderUnavailableError('p', 'op', 'HTTP 502', 502);
    const run = vi.fn().mockRejectedValue(unavailable);
    await expect(withRetry(run, sleep, undefined, [10, 20])).rejects.toBe(unavailable);
    expect(run).toHaveBeenCalledTimes(3);

    const auth = vi.fn().mockRejectedValue(new ProviderAuthenticationError('p', 'op', 'HTTP 401'));
    await expect(withRetry(auth, sleep, undefined, [10])).rejects.toBeInstanceOf(
      ProviderAuthenticationError,
    );
    expect(auth).toHaveBeenCalledTimes(1);
  });
});
