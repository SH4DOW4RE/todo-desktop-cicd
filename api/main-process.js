// Copy this setup into the Electron application's main.js. Keep API calls and
// JWT storage in the main process; expose only these explicit IPC operations.
const { app, ipcMain } = require('electron');
const { createTodoApi } = require('.');

function serializeError(error) {
  return {
    message: error.message || 'Unexpected error',
    status: error.status || 0,
    details: error.details
  };
}

function handle(channel, operation) {
  ipcMain.handle(channel, async (_event, ...args) => {
    try {
      return { ok: true, data: await operation(...args) };
    } catch (error) {
      return { ok: false, error: serializeError(error) };
    }
  });
}

function registerApiHandlers(api) {
  handle('api:health', () => api.health());

  handle('api:auth:register', (credentials) => api.auth.register(credentials));
  handle('api:auth:login', (credentials) => api.auth.login(credentials));
  handle('api:auth:logout', () => api.auth.logout());
  handle('api:auth:is-logged-in', () => api.auth.isLoggedIn());

  handle('api:users:get-current', () => api.users.getCurrent());
  handle('api:users:update-current', (changes) => api.users.updateCurrent(changes));
  handle('api:users:delete-current', () => api.users.deleteCurrent());

  handle('api:folders:list', (filters) => api.folders.list(filters));
  handle('api:folders:create', (folder) => api.folders.create(folder));
  handle('api:folders:get', (id) => api.folders.get(id));
  handle('api:folders:replace', (id, folder) => api.folders.replace(id, folder));
  handle('api:folders:update', (id, changes) => api.folders.update(id, changes));
  handle('api:folders:delete', (id) => api.folders.delete(id));

  handle('api:todos:list', (filters) => api.todos.list(filters));
  handle('api:todos:search', (filters) => api.todos.search(filters));
  handle('api:todos:create', (todo) => api.todos.create(todo));
  handle('api:todos:get', (id) => api.todos.get(id));
  handle('api:todos:replace', (id, todo) => api.todos.replace(id, todo));
  handle('api:todos:update', (id, changes) => api.todos.update(id, changes));
  handle('api:todos:delete', (id) => api.todos.delete(id));
}

// Call this inside your existing app.whenReady() before creating the window.
function initializeTodoApi() {
  const isDebug = process.env.SHADOWEB_DEBUG === 'true' || process.env.SHADOWEB_DEBUG === '1';
  const API_URL = isDebug ? 'http://127.0.0.1:4040' : 'https://todo-api.shadoweb.fr';

  if (!app.isReady()) throw new Error('initializeTodoApi must run after app.whenReady()');
  const api = createTodoApi({
    baseUrl: API_URL,
    timeoutMs: 15_000
  });
  registerApiHandlers(api);
  return api;
}

module.exports = { initializeTodoApi, registerApiHandlers };

/*
app.whenReady().then(() => {
  initializeTodoApi();
  createWindow();
});
*/
