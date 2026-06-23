const assert = require('node:assert/strict');
const { test } = require('node:test');

const { ApiClient, ApiError, resourceId } = require('../api/api-client');

function createTokenStore(token = 'token-123') {
  return {
    cleared: false,
    async get() {
      return token;
    },
    async clear() {
      this.cleared = true;
      token = null;
    }
  };
}

function jsonResponse(body, { status = 200, headers = { 'content-type': 'application/json' } } = {}) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: {
      get(name) {
        return headers[name.toLowerCase()];
      }
    },
    async json() {
      return body;
    },
    async text() {
      return typeof body === 'string' ? body : JSON.stringify(body);
    }
  };
}

test('resourceId accepts positive safe integers', () => {
  assert.equal(resourceId(1), 1);
  assert.equal(resourceId('42'), 42);
});

test('resourceId rejects invalid identifiers', () => {
  for (const value of [0, -1, 1.2, Number.MAX_SAFE_INTEGER + 1, 'abc', null]) {
    assert.throws(() => resourceId(value), TypeError);
  }
});

test('request sends authenticated JSON requests with clean query strings', async (t) => {
  const calls = [];
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({ url, options });
    return jsonResponse({ data: [{ id: 1 }] });
  });

  const client = new ApiClient({
    baseUrl: 'https://api.example.test/',
    tokenStore: createTokenStore('secret')
  });

  const result = await client.request('/todos', {
    method: 'POST',
    query: { page: 2, limit: 50, empty: '', missing: null },
    body: { title: 'Test todo' }
  });

  assert.deepEqual(result, { data: [{ id: 1 }] });
  assert.equal(calls[0].url, 'https://api.example.test/todos?page=2&limit=50');
  assert.equal(calls[0].options.method, 'POST');
  assert.equal(calls[0].options.headers.Authorization, 'Bearer secret');
  assert.equal(calls[0].options.headers['Content-Type'], 'application/json');
  assert.equal(calls[0].options.body, JSON.stringify({ title: 'Test todo' }));
});

test('request supports unauthenticated calls and empty responses', async (t) => {
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, 'https://api.example.test/health');
    assert.equal(options.headers.Authorization, undefined);
    return jsonResponse('', { status: 204 });
  });

  const client = new ApiClient({
    baseUrl: 'https://api.example.test',
    tokenStore: createTokenStore(null)
  });

  assert.equal(await client.request('/health', { authenticated: false }), undefined);
});

test('request fails before fetch when auth token is missing', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => jsonResponse({}));
  const client = new ApiClient({
    baseUrl: 'https://api.example.test',
    tokenStore: createTokenStore(null)
  });

  await assert.rejects(
    () => client.request('/todos'),
    error => error instanceof ApiError && error.status === 401 && error.message === 'You are not logged in'
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});

test('request clears token and exposes API error details on unauthorized responses', async (t) => {
  const tokenStore = createTokenStore('expired');
  t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse(
      { error: { message: 'Token expired', details: { reason: 'jwt' } } },
      { status: 401 }
    )
  );
  const client = new ApiClient({ baseUrl: 'https://api.example.test', tokenStore });

  await assert.rejects(
    () => client.request('/todos'),
    error => error instanceof ApiError
      && error.status === 401
      && error.message === 'Token expired'
      && error.details.reason === 'jwt'
  );
  assert.equal(tokenStore.cleared, true);
});

test('request handles non-json errors and network failures', async (t) => {
  const fetchMock = t.mock.method(globalThis, 'fetch', async () =>
    jsonResponse('Server unavailable', {
      status: 503,
      headers: { 'content-type': 'text/plain' }
    })
  );
  const client = new ApiClient({ baseUrl: 'https://api.example.test', tokenStore: createTokenStore() });

  await assert.rejects(
    () => client.request('/todos'),
    error => error instanceof ApiError
      && error.status === 503
      && error.message === 'API request failed with status 503'
  );

  fetchMock.mock.mockImplementationOnce(async () => {
    throw Object.assign(new Error('aborted'), { name: 'AbortError' });
  });
  await assert.rejects(
    () => client.request('/todos'),
    error => error instanceof ApiError && error.message === 'The API request timed out'
  );

  fetchMock.mock.mockImplementationOnce(async () => {
    throw new Error('dns');
  });
  await assert.rejects(
    () => client.request('/todos'),
    error => error instanceof ApiError && error.message === 'Unable to reach the API'
  );
});

test('ApiClient validates required baseUrl', () => {
  assert.throws(() => new ApiClient({ tokenStore: createTokenStore() }), /baseUrl is required/);
});
