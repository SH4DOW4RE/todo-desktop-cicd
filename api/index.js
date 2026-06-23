const { ApiClient, ApiError } = require('./api-client');
const { TokenStore } = require('./token-store');
const { createAuthApi } = require('./auth-api');
const { createUsersApi } = require('./users-api');
const { createFoldersApi } = require('./folders-api');
const { createTodosApi } = require('./todos-api');

function createTodoApi({ baseUrl, timeoutMs } = {}) {
  const tokenStore = new TokenStore();
  const client = new ApiClient({ baseUrl, timeoutMs, tokenStore });
  return {
    health: () => client.request('/health', { authenticated: false }),
    auth: createAuthApi(client, tokenStore),
    users: createUsersApi(client, tokenStore),
    folders: createFoldersApi(client),
    todos: createTodosApi(client)
  };
}

module.exports = { createTodoApi, ApiError };
