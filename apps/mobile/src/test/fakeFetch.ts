/**
 * A scripted `fetch` for the API layer's tests: each call is recorded and answered by `handler`, so no
 * test depends on a network or a running API.
 */

export type FakeResponseInit = {
  status: number;
  /** Serialized as JSON unless it is already a string (to send malformed bodies). */
  body?: unknown;
  headers?: Record<string, string>;
};

export type RecordedRequest = {
  url: string;
  method: string;
  headers: Record<string, string>;
  body: unknown;
};

export function fakeResponse({ status, body, headers = {} }: FakeResponseInit): Response {
  const text = body === undefined ? '' : typeof body === 'string' ? body : JSON.stringify(body);
  const lowerHeaders = Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { get: (name: string) => lowerHeaders[name.toLowerCase()] ?? null },
    text: async () => text,
  } as unknown as Response;
}

export function createFakeFetch(
  handler: (request: RecordedRequest) => FakeResponseInit | Promise<FakeResponseInit>,
) {
  const requests: RecordedRequest[] = [];
  const fetchImpl = jest.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const request: RecordedRequest = {
      url: String(input),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: typeof init?.body === 'string' ? JSON.parse(init.body) : undefined,
    };
    requests.push(request);
    return fakeResponse(await handler(request));
  }) as unknown as typeof fetch;
  return { fetchImpl, requests };
}

/** The `{ data }` envelope of a successful API answer. */
export const ok = (data: unknown, status = 200): FakeResponseInit => ({ status, body: { data } });

/** The `{ error }` envelope of a failed API answer. */
export const apiError = (
  status: number,
  code: string,
  message = 'Something happened.',
  extra: Partial<FakeResponseInit> = {},
): FakeResponseInit => ({ status, body: { error: { code, message } }, ...extra });
