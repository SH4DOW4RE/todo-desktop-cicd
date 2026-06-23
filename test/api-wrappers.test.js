const assert = require('node:assert/strict');
const { test } = require('node:test');

const { createAuthApi } = require('../api/auth-api');
const { createFoldersApi } = require('../api/folders-api');
const { createTodosApi } = require('../api/todos-api');
const { createUsersApi } = require('../api/users-api');

function createRecordingClient(response = { ok: true }) {
  const calls = [];
  return {
    calls,
    request(path, options) {
      calls.push({ path, options });
      return Promise.resolve(response);
    }
  };
}

test('auth API registers, logs in, stores token, logs out, and checks session state', async () => {
  const client = createRecordingClient({ token: 'jwt', user: { id: 1, username: 'ada' } });
  let storedToken = null;
  const tokenStore = {
    async get() {
      return storedToken;
    },
    async set(token) {
      storedToken = token;
    },
    async clear() {
      storedToken = null;
    }
  };
  const auth = createAuthApi(client, tokenStore);

  await auth.register({ username: 'ada', email: 'ada@example.test', password: 'secret' });
  assert.deepEqual(client.calls[0], {
    path: '/auth/register',
    options: {
      method: 'POST',
      body: { username: 'ada', email: 'ada@example.test', password: 'secret' },
      authenticated: false
    }
  });

  const user = await auth.login({ email: 'ada@example.test', password: 'secret' });
  assert.deepEqual(user, { id: 1, username: 'ada' });
  assert.equal(storedToken, 'jwt');
  assert.equal(await auth.isLoggedIn(), true);

  await auth.logout();
  assert.equal(await auth.isLoggedIn(), false);
});

test('folders API maps operations to REST endpoints', async () => {
  const client = createRecordingClient();
  const folders = createFoldersApi(client);

  await folders.list({ parent: 'root' });
  await folders.create({ name: 'Inbox', parent: null });
  await folders.get('3');
  await folders.replace(3, { name: 'Archive', parent: 1 });
  await folders.update(3, { name: 'Done' });
  await folders.delete(3);

  assert.deepEqual(client.calls, [
    { path: '/folders', options: { query: { parent: 'root' } } },
    { path: '/folders', options: { method: 'POST', body: { name: 'Inbox', parent: null } } },
    { path: '/folders/3', options: undefined },
    { path: '/folders/3', options: { method: 'PUT', body: { name: 'Archive', parent: 1 } } },
    { path: '/folders/3', options: { method: 'PATCH', body: { name: 'Done' } } },
    { path: '/folders/3', options: { method: 'DELETE' } }
  ]);
});

test('todos API maps list, search, mutation, and delete operations', async () => {
  const client = createRecordingClient();
  const todos = createTodosApi(client);
  const todo = { title: 'Ship tests', content: '', status: 'todo' };

  await todos.list({ page: 1, limit: 20 });
  await todos.search({ q: 'tests' });
  await todos.create(todo);
  await todos.get(5);
  await todos.replace(5, { ...todo, status: 'done' });
  await todos.update(5, { status: 'done' });
  await todos.delete(5);

  assert.deepEqual(client.calls, [
    { path: '/todos', options: { query: { page: 1, limit: 20 } } },
    { path: '/todos/search', options: { query: { q: 'tests' } } },
    { path: '/todos', options: { method: 'POST', body: todo } },
    { path: '/todos/5', options: undefined },
    { path: '/todos/5', options: { method: 'PUT', body: { ...todo, status: 'done' } } },
    { path: '/todos/5', options: { method: 'PATCH', body: { status: 'done' } } },
    { path: '/todos/5', options: { method: 'DELETE' } }
  ]);
});

test('users API maps current-user operations and clears token after deletion', async () => {
  const client = createRecordingClient();
  let cleared = false;
  const users = createUsersApi(client, {
    async clear() {
      cleared = true;
    }
  });

  await users.getCurrent();
  await users.updateCurrent({ username: 'grace' });
  await users.deleteCurrent();

  assert.deepEqual(client.calls, [
    { path: '/users/me', options: undefined },
    { path: '/users/me', options: { method: 'PATCH', body: { username: 'grace' } } },
    { path: '/users/me', options: { method: 'DELETE' } }
  ]);
  assert.equal(cleared, true);
});
