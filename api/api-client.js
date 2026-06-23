class ApiError extends Error {
  constructor(message, { status = 0, details, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

function buildQuery(values = {}) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== undefined && value !== null && value !== '') query.set(key, String(value));
  }
  const result = query.toString();
  return result ? `?${result}` : '';
}

function resourceId(value) {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id < 1) throw new TypeError('Resource ID must be a positive integer');
  return id;
}

class ApiClient {
  constructor({ baseUrl, tokenStore, timeoutMs = 15_000 }) {
    if (!baseUrl) throw new Error('baseUrl is required');
    this.baseUrl = baseUrl.replace(/\/$/, '');
    this.tokenStore = tokenStore;
    this.timeoutMs = timeoutMs;
  }

  async request(path, { method = 'GET', body, query, authenticated = true } = {}) {
    const headers = { Accept: 'application/json' };
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    if (authenticated) {
      const token = await this.tokenStore.get();
      if (!token) throw new ApiError('You are not logged in', { status: 401 });
      headers.Authorization = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    let response;
    try {
      response = await fetch(`${this.baseUrl}${path}${buildQuery(query)}`, {
        method,
        headers,
        body: body === undefined ? undefined : JSON.stringify(body),
        signal: controller.signal
      });
    } catch (error) {
      const message = error.name === 'AbortError' ? 'The API request timed out' : 'Unable to reach the API';
      throw new ApiError(message, { cause: error });
    } finally {
      clearTimeout(timeout);
    }

    if (response.status === 204) return undefined;
    const isJson = response.headers.get('content-type')?.includes('application/json');
    const payload = isJson ? await response.json() : await response.text();
    if (!response.ok) {
      if (response.status === 401 && authenticated) await this.tokenStore.clear();
      const apiError = payload?.error;
      throw new ApiError(apiError?.message || `API request failed with status ${response.status}`, {
        status: response.status,
        details: apiError?.details
      });
    }
    return payload;
  }
}

module.exports = { ApiClient, ApiError, resourceId };
