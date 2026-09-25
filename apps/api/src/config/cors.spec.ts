import { buildCorsOptions } from './cors.js';

function allows(options: ReturnType<typeof buildCorsOptions>, origin: string | undefined): boolean {
  let result = false;
  const check = options.origin as (
    o: string | undefined,
    cb: (e: Error | null, ok: boolean) => void,
  ) => void;
  check(origin, (_error, ok) => {
    result = ok;
  });
  return result;
}

describe('buildCorsOptions', () => {
  it('allows only the listed browser origins', () => {
    const options = buildCorsOptions(['http://localhost:8081']);

    expect(allows(options, 'http://localhost:8081')).toBe(true);
    expect(allows(options, 'https://evil.example')).toBe(false);
  });

  it('never affects clients without an Origin (native mobile app, server to server)', () => {
    expect(allows(buildCorsOptions([]), undefined)).toBe(true);
  });

  it('allows no browser origin when none is configured (no "*")', () => {
    expect(allows(buildCorsOptions([]), 'http://localhost:8081')).toBe(false);
  });
});
