const assert = require('node:assert/strict');
const { mkdtemp, readFile, rm, writeFile } = require('node:fs/promises');
const { tmpdir } = require('node:os');
const path = require('node:path');
const { test } = require('node:test');
const Module = require('node:module');

function withMockedModules(mocks, callback) {
  const originalLoad = Module._load;
  Module._load = function mockedLoad(request, parent, isMain) {
    const parentFile = parent?.filename || '';
    for (const mock of mocks) {
      if (mock.matches(request, parentFile)) return mock.value;
    }
    return originalLoad.call(this, request, parent, isMain);
  };
  try {
    return callback();
  } finally {
    Module._load = originalLoad;
  }
}

function reload(modulePath) {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

test('TokenStore persists encrypted tokens and clears invalid files', async () => {
  const directory = await mkdtemp(path.join(tmpdir(), 'todo-token-store-'));
  const electronMock = {
    app: {
      isReady: () => true,
      getPath: () => directory
    },
    safeStorage: {
      isEncryptionAvailable: () => true,
      encryptString: value => Buffer.from(`encrypted:${value}`, 'utf8'),
      decryptString: buffer => {
        const value = buffer.toString('utf8');
        if (!value.startsWith('encrypted:')) throw new Error('invalid payload');
        return value.slice('encrypted:'.length);
      }
    }
  };

  try {
    await withMockedModules([
      { matches: request => request === 'electron', value: electronMock }
    ], async () => {
      const { TokenStore } = reload('../api/token-store');
      const store = new TokenStore('token-file');

      await store.set('jwt-token');
      assert.equal(await readFile(path.join(directory, 'token-file'), 'utf8'), Buffer.from('encrypted:jwt-token').toString('base64'));
      assert.equal(await new TokenStore('token-file').get(), 'jwt-token');

      await writeFile(path.join(directory, 'broken-token'), 'not-base64');
      const brokenStore = new TokenStore('broken-token');
      assert.equal(await brokenStore.get(), null);

      await store.clear();
      assert.equal(await new TokenStore('token-file').get(), null);
    });
  } finally {
    await rm(directory, { recursive: true, force: true });
    delete require.cache[require.resolve('../api/token-store')];
  }
});

test('TokenStore requires a ready Electron app and handles unavailable encryption', async () => {
  const electronMock = {
    app: {
      isReady: () => false,
      getPath: () => tmpdir()
    },
    safeStorage: {
      isEncryptionAvailable: () => false,
      encryptString: value => Buffer.from(value),
      decryptString: buffer => buffer.toString('utf8')
    }
  };

  await withMockedModules([
    { matches: request => request === 'electron', value: electronMock }
  ], async () => {
    const { TokenStore } = reload('../api/token-store');
    assert.throws(() => new TokenStore(), /after Electron app\.whenReady/);

    electronMock.app.isReady = () => true;
    const store = new TokenStore('unused-token-file');
    await store.set('memory-token');
    assert.equal(await store.get(), 'memory-token');
  });
  delete require.cache[require.resolve('../api/token-store')];
});

test('createTodoApi wires all domain APIs around one client and token store', async (t) => {
  const electronMock = {
    app: {
      isReady: () => true,
      getPath: () => tmpdir()
    },
    safeStorage: {
      isEncryptionAvailable: () => false,
      encryptString: value => Buffer.from(value),
      decryptString: buffer => buffer.toString('utf8')
    }
  };

  await withMockedModules([
    { matches: request => request === 'electron', value: electronMock }
  ], async () => {
    const { createTodoApi, ApiError } = reload('../api');
    const fetchMock = t.mock.method(globalThis, 'fetch', async () => ({
      ok: true,
      status: 200,
      headers: { get: () => 'application/json' },
      async json() {
        return { status: 'ok' };
      },
      async text() {
        return JSON.stringify({ status: 'ok' });
      }
    }));
    const api = createTodoApi({ baseUrl: 'https://api.example.test', timeoutMs: 1000 });

    assert.equal(typeof api.health, 'function');
    assert.equal(typeof api.auth.login, 'function');
    assert.equal(typeof api.users.getCurrent, 'function');
    assert.equal(typeof api.folders.list, 'function');
    assert.equal(typeof api.todos.search, 'function');
    assert.equal(ApiError.name, 'ApiError');
    assert.deepEqual(await api.health(), { status: 'ok' });
    assert.equal(fetchMock.mock.callCount(), 1);
  });
  delete require.cache[require.resolve('../api')];
  delete require.cache[require.resolve('../api/token-store')];
});

test('main process registers successful and failing IPC handlers', async () => {
  const handlers = new Map();
  const electronMock = {
    app: { isReady: () => true },
    ipcMain: {
      handle(channel, operation) {
        handlers.set(channel, operation);
      }
    }
  };
  const api = {
    health: async () => ({ ok: true }),
    auth: {
      register: async credentials => credentials,
      login: async credentials => ({ id: 1, email: credentials.email }),
      logout: async () => undefined,
      isLoggedIn: async () => true
    },
    users: {
      getCurrent: async () => ({ id: 1 }),
      updateCurrent: async changes => changes,
      deleteCurrent: async () => undefined
    },
    folders: {
      list: async filters => filters,
      create: async folder => folder,
      get: async id => ({ id }),
      replace: async (id, folder) => ({ id, ...folder }),
      update: async (id, changes) => ({ id, ...changes }),
      delete: async id => ({ id })
    },
    todos: {
      list: async filters => filters,
      search: async filters => filters,
      create: async todo => todo,
      get: async id => ({ id }),
      replace: async (id, todo) => ({ id, ...todo }),
      update: async (id, changes) => ({ id, ...changes }),
      delete: async () => {
        const error = new Error('Missing todo');
        error.status = 404;
        error.details = { id: 9 };
        throw error;
      }
    }
  };

  await withMockedModules([
    { matches: request => request === 'electron', value: electronMock }
  ], async () => {
    const { registerApiHandlers } = reload('../api/main-process');
    registerApiHandlers(api);
  });

  assert.equal(handlers.size, 21);
  assert.deepEqual(await handlers.get('api:health')({}), { ok: true, data: { ok: true } });
  assert.deepEqual(await handlers.get('api:auth:register')({}, { email: 'test@example.test' }), {
    ok: true,
    data: { email: 'test@example.test' }
  });
  assert.deepEqual(await handlers.get('api:auth:login')({}, { email: 'test@example.test' }), {
    ok: true,
    data: { id: 1, email: 'test@example.test' }
  });
  assert.deepEqual(await handlers.get('api:auth:logout')({}), { ok: true, data: undefined });
  assert.deepEqual(await handlers.get('api:auth:is-logged-in')({}), { ok: true, data: true });
  assert.deepEqual(await handlers.get('api:users:get-current')({}), { ok: true, data: { id: 1 } });
  assert.deepEqual(await handlers.get('api:users:update-current')({}, { username: 'ada' }), {
    ok: true,
    data: { username: 'ada' }
  });
  assert.deepEqual(await handlers.get('api:users:delete-current')({}), { ok: true, data: undefined });
  assert.deepEqual(await handlers.get('api:folders:list')({}, { parent: 'root' }), {
    ok: true,
    data: { parent: 'root' }
  });
  assert.deepEqual(await handlers.get('api:folders:create')({}, { name: 'Inbox' }), {
    ok: true,
    data: { name: 'Inbox' }
  });
  assert.deepEqual(await handlers.get('api:folders:get')({}, 7), { ok: true, data: { id: 7 } });
  assert.deepEqual(await handlers.get('api:folders:replace')({}, 7, { name: 'Archive' }), {
    ok: true,
    data: { id: 7, name: 'Archive' }
  });
  assert.deepEqual(await handlers.get('api:folders:update')({}, 7, { name: 'Done' }), {
    ok: true,
    data: { id: 7, name: 'Done' }
  });
  assert.deepEqual(await handlers.get('api:folders:delete')({}, 7), { ok: true, data: { id: 7 } });
  assert.deepEqual(await handlers.get('api:todos:list')({}, { page: 1 }), {
    ok: true,
    data: { page: 1 }
  });
  assert.deepEqual(await handlers.get('api:todos:search')({}, { q: 'tests' }), {
    ok: true,
    data: { q: 'tests' }
  });
  assert.deepEqual(await handlers.get('api:todos:create')({}, { title: 'Test' }), {
    ok: true,
    data: { title: 'Test' }
  });
  assert.deepEqual(await handlers.get('api:todos:get')({}, 9), { ok: true, data: { id: 9 } });
  assert.deepEqual(await handlers.get('api:todos:replace')({}, 9, { title: 'Updated' }), {
    ok: true,
    data: { id: 9, title: 'Updated' }
  });
  assert.deepEqual(await handlers.get('api:todos:update')({}, 9, { status: 'done' }), {
    ok: true,
    data: { id: 9, status: 'done' }
  });
  assert.deepEqual(await handlers.get('api:todos:delete')({}, 9), {
    ok: false,
    error: { message: 'Missing todo', status: 404, details: { id: 9 } }
  });

  delete require.cache[require.resolve('../api/main-process')];
});

test('initializeTodoApi selects the local API in debug mode', async (t) => {
  const handlers = new Map();
  const electronMock = {
    app: { isReady: () => true },
    ipcMain: {
      handle(channel, operation) {
        handlers.set(channel, operation);
      }
    }
  };
  const createdApis = [];
  const api = {
    health: async () => undefined,
    auth: {
      register: async () => undefined,
      login: async () => undefined,
      logout: async () => undefined,
      isLoggedIn: async () => false
    },
    users: {
      getCurrent: async () => undefined,
      updateCurrent: async () => undefined,
      deleteCurrent: async () => undefined
    },
    folders: {
      list: async () => undefined,
      create: async () => undefined,
      get: async () => undefined,
      replace: async () => undefined,
      update: async () => undefined,
      delete: async () => undefined
    },
    todos: {
      list: async () => undefined,
      search: async () => undefined,
      create: async () => undefined,
      get: async () => undefined,
      replace: async () => undefined,
      update: async () => undefined,
      delete: async () => undefined
    }
  };
  const previousDebug = process.env.SHADOWEB_DEBUG;
  t.after(() => {
    if (previousDebug === undefined) delete process.env.SHADOWEB_DEBUG;
    else process.env.SHADOWEB_DEBUG = previousDebug;
    delete require.cache[require.resolve('../api/main-process')];
  });

  process.env.SHADOWEB_DEBUG = '1';
  await withMockedModules([
    { matches: request => request === 'electron', value: electronMock },
    {
      matches: (request, parentFile) => request === '.' && parentFile.endsWith(path.join('api', 'main-process.js')),
      value: {
        createTodoApi(options) {
          createdApis.push(options);
          return api;
        }
      }
    }
  ], async () => {
    const { initializeTodoApi } = reload('../api/main-process');
    assert.equal(initializeTodoApi(), api);
  });

  assert.deepEqual(createdApis, [{ baseUrl: 'http://127.0.0.1:4040', timeoutMs: 15_000 }]);
  assert.equal(handlers.has('api:todos:list'), true);
});

test('initializeTodoApi rejects calls before Electron is ready', async () => {
  const electronMock = {
    app: { isReady: () => false },
    ipcMain: { handle() {} }
  };

  await withMockedModules([
    { matches: request => request === 'electron', value: electronMock },
    {
      matches: (request, parentFile) => request === '.' && parentFile.endsWith(path.join('api', 'main-process.js')),
      value: { createTodoApi: () => ({}) }
    }
  ], async () => {
    const { initializeTodoApi } = reload('../api/main-process');
    assert.throws(() => initializeTodoApi(), /after app\.whenReady/);
  });

  delete require.cache[require.resolve('../api/main-process')];
});
