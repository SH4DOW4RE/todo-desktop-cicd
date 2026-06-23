# Electron API snippets

These CommonJS modules are intended for an Electron application. Copy the `snippets` directory into the Electron project, initialize it from `main.js`, and use `preload.js` as the window preload script.

The snippets require an Electron version whose bundled Node.js provides `fetch`. API calls execute in the main process, so browser CORS does not apply. JWTs are never exposed to the renderer and are encrypted with Electron `safeStorage` when platform encryption is available. If encryption is unavailable, the token remains in memory and users must log in again after restarting.

## Main process

```js
const path = require('node:path');
const { app, BrowserWindow } = require('electron');
const { initializeTodoApi } = require('./snippets/main-process');

function createWindow() {
  return new BrowserWindow({
    webPreferences: {
      preload: path.join(__dirname, 'snippets/preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
}

app.whenReady().then(() => {
  initializeTodoApi();
  createWindow();
});
```

Set the API URL in the Electron application's environment:

```sh
TODO_API_URL=https://api.example.com electron .
```

## Renderer usage

The preload script exposes `window.todoApi`. Examples:

```js
await window.todoApi.auth.register({
  username: 'alice',
  email: 'alice@example.com',
  password: 'a-long-password'
});

const user = await window.todoApi.auth.login({
  email: 'alice@example.com',
  password: 'a-long-password'
});

const work = await window.todoApi.folders.create({ name: 'Work' });
const project = await window.todoApi.folders.create({
  name: 'Project A',
  parent: work.id
});

const todo = await window.todoApi.todos.create({
  title: 'Prepare release',
  content: 'Build and verify release artifacts',
  status: 'in_progress',
  archived: false,
  folder: project.id,
  parents: [],
  tags: ['release', 'work']
});

const results = await window.todoApi.todos.search({
  q: 'release',
  folder: project.id,
  status: 'in_progress',
  date_from: '2026-06-01',
  sort: 'date',
  order: 'desc'
});

await window.todoApi.todos.update(todo.id, { status: 'completed' });
await window.todoApi.auth.logout();
```

Every API failure rejects with an error containing `message`, HTTP `status`, and optional `details` fields. Handle it with `try`/`catch` in the renderer.
