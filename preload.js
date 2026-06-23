const { contextBridge, ipcRenderer  } = require("electron")

async function invoke(channel, ...args) {
  const result = await ipcRenderer.invoke(channel, ...args);
  if (result.ok) return result.data;

  const error = new Error(result.error.message);
  error.status = result.error.status;
  error.details = result.error.details;
  throw error;
}

contextBridge.exposeInMainWorld("app", {
  window_minimize: () => invoke("window_minimize"),
  window_maximize: () => invoke("window_maximize"),
  window_close: () => invoke("window_close"),
  window_is_maximized: () => invoke("window_is_maximized"),

  health: () => invoke('api:health'),
  auth: {
    register: (credentials) => invoke('api:auth:register', credentials),
    login: (credentials) => invoke('api:auth:login', credentials),
    logout: () => invoke('api:auth:logout'),
    isLoggedIn: () => invoke('api:auth:is-logged-in')
  },
  users: {
    getCurrent: () => invoke('api:users:get-current'),
    updateCurrent: (changes) => invoke('api:users:update-current', changes),
    deleteCurrent: () => invoke('api:users:delete-current')
  },
  folders: {
    list: (filters) => invoke('api:folders:list', filters),
    create: (folder) => invoke('api:folders:create', folder),
    get: (id) => invoke('api:folders:get', id),
    replace: (id, folder) => invoke('api:folders:replace', id, folder),
    update: (id, changes) => invoke('api:folders:update', id, changes),
    delete: (id) => invoke('api:folders:delete', id)
  },
  todos: {
    list: (filters) => invoke('api:todos:list', filters),
    search: (filters) => invoke('api:todos:search', filters),
    create: (todo) => invoke('api:todos:create', todo),
    get: (id) => invoke('api:todos:get', id),
    replace: (id, todo) => invoke('api:todos:replace', id, todo),
    update: (id, changes) => invoke('api:todos:update', id, changes),
    delete: (id) => invoke('api:todos:delete', id)
  }
});
