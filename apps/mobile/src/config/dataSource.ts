/**
 * Where the app's data comes from (DATA-8, `mobiledocs/MOBILE_API_INTEGRATION.md`). Chosen once, at
 * bundle time, from two public Expo variables — never per screen:
 *
 * - `EXPO_PUBLIC_DATA_SOURCE`: `mock` (default: the in-app mock repositories) or `api` (the ROAM API).
 * - `EXPO_PUBLIC_API_URL`: the API's origin (`http://localhost:3000`), without `/api/v1`. Required in
 *   `api` mode.
 *
 * Deterministic: `api` mode never falls back to the mocks when the API fails, and a missing or invalid
 * configuration stops the app at startup instead of silently picking the other source.
 */

export type DataSource = 'mock' | 'api';

export type DataSourceConfig = { source: 'mock' } | { source: 'api'; apiUrl: string };

type RawEnvironment = {
  dataSource?: string;
  apiUrl?: string;
};

export class ConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ConfigurationError';
  }
}

/** Pure: validates the raw variables (tested without touching `process.env`). */
export function resolveDataSourceConfig({ dataSource, apiUrl }: RawEnvironment): DataSourceConfig {
  const source = dataSource?.trim() || 'mock';
  if (source === 'mock') return { source: 'mock' };
  if (source !== 'api') {
    throw new ConfigurationError(
      `EXPO_PUBLIC_DATA_SOURCE must be "mock" or "api" (received "${source}").`,
    );
  }

  const url = apiUrl?.trim();
  if (!url) {
    throw new ConfigurationError(
      'EXPO_PUBLIC_API_URL is required when EXPO_PUBLIC_DATA_SOURCE=api.',
    );
  }
  if (!/^https?:\/\/[^\s/]+/.test(url)) {
    throw new ConfigurationError('EXPO_PUBLIC_API_URL must be an http(s) URL.');
  }
  const origin = url.replace(/\/+$/, '');
  if (/\/api\/v\d+$/.test(origin)) {
    throw new ConfigurationError('EXPO_PUBLIC_API_URL is the API origin: leave out "/api/v1".');
  }
  return { source: 'api', apiUrl: origin };
}

/** The app's configuration. Expo inlines `EXPO_PUBLIC_*` only when read literally like this. */
export function readDataSourceConfig(): DataSourceConfig {
  return resolveDataSourceConfig({
    dataSource: process.env.EXPO_PUBLIC_DATA_SOURCE,
    apiUrl: process.env.EXPO_PUBLIC_API_URL,
  });
}
