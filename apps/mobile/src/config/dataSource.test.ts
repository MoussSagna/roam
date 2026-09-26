import { ConfigurationError, resolveDataSourceConfig } from './dataSource';

describe('resolveDataSourceConfig', () => {
  it('defaults to the mock repositories', () => {
    expect(resolveDataSourceConfig({})).toEqual({ source: 'mock' });
    expect(resolveDataSourceConfig({ dataSource: '  ' })).toEqual({ source: 'mock' });
    expect(resolveDataSourceConfig({ dataSource: 'mock', apiUrl: 'http://ignored' })).toEqual({
      source: 'mock',
    });
  });

  it('reads the API origin in api mode, without a trailing slash', () => {
    expect(
      resolveDataSourceConfig({ dataSource: 'api', apiUrl: 'http://localhost:3000/' }),
    ).toEqual({
      source: 'api',
      apiUrl: 'http://localhost:3000',
    });
    expect(
      resolveDataSourceConfig({ dataSource: 'api', apiUrl: ' https://api.example.test ' }),
    ).toEqual({ source: 'api', apiUrl: 'https://api.example.test' });
  });

  it('refuses api mode without a URL instead of silently using the mocks', () => {
    expect(() => resolveDataSourceConfig({ dataSource: 'api' })).toThrow(ConfigurationError);
    expect(() => resolveDataSourceConfig({ dataSource: 'api', apiUrl: '' })).toThrow(
      /EXPO_PUBLIC_API_URL is required/,
    );
  });

  it('refuses an unknown source, a non-http URL and a URL that already has /api/v1', () => {
    expect(() => resolveDataSourceConfig({ dataSource: 'API' })).toThrow(/"mock" or "api"/);
    expect(() => resolveDataSourceConfig({ dataSource: 'api', apiUrl: 'localhost:3000' })).toThrow(
      /http\(s\) URL/,
    );
    expect(() =>
      resolveDataSourceConfig({ dataSource: 'api', apiUrl: 'http://localhost:3000/api/v1' }),
    ).toThrow(/leave out "\/api\/v1"/);
  });
});
