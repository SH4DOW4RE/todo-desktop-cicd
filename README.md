![GitHub Actions Workflow Tests Status](https://img.shields.io/github/actions/workflow/status/SH4DOW4RE/todo-desktop-cicd/ci.yml?style=for-the-badge&logo=github&label=TESTS)
![GitHub Actions Workflow Release Status](https://img.shields.io/github/actions/workflow/status/SH4DOW4RE/todo-desktop-cicd/release.yml?style=for-the-badge&logo=github)

# Todo Desktop CI/CD

Todo Desktop CI/CD is an Electron desktop client for managing todos through the Shadoweb Todo API. It provides a custom desktop interface for folders, notes, tags, parent relationships, authentication, and account maintenance, with automated tests, coverage gates, release builds, and GitHub-based application updates.

## Features

- Create, edit, archive, sort, and delete todos.
- Organize todos by nested folders.
- Add tags with autocomplete support.
- Link todos to multiple existing parent notes while preventing circular dependencies.
- Authenticate against the remote Todo API and keep the JWT in Electron's encrypted storage.
- Clear account-owned folders and todos from the account modal with confirmation.
- Check GitHub Releases for desktop updates in packaged Windows and macOS builds.

## Technology Stack

- Electron 42
- Electron Forge 7
- Node.js 24 in GitHub Actions
- CommonJS JavaScript
- Native `node:test` test runner
- Electron Forge makers:
  - Windows: Squirrel installer
  - Linux: Debian and RPM packages
  - macOS: ZIP application archive

## Requirements

- Node.js 24 recommended for CI parity.
- npm.
- A reachable Todo API:
  - Production: `https://todo-api.shadoweb.fr`
  - Debug mode: `http://127.0.0.1:4040`

## Setup

```bash
npm ci
```

For local API development, start the API on `127.0.0.1:4040` and launch the app with:

```bash
SHADOWEB_DEBUG=1 npm start
```

On Windows PowerShell:

```powershell
$env:SHADOWEB_DEBUG = "1"
npm start
```

## Development

Start the Electron app:

```bash
npm start
```

Run the test suite:

```bash
npm test
```

Run tests with the enforced 90% coverage gate:

```bash
npm run coverage
```

Build local distributables for the current platform:

```bash
npm run make
```

## CI

The CI workflow runs on Ubuntu only and performs:

1. Dependency installation with `npm ci`.
2. Unit tests with `npm test`.
3. Coverage enforcement with `npm run coverage`.

Coverage is enforced at 90% for lines, branches, and functions over the API modules.

## Release Process

The release workflow is triggered by tags matching `v*`, for example:

```bash
git tag -a v1.0.1 -m "Release v1.0.1"
git push origin v1.0.1
```

The workflow:

1. Runs tests and coverage on Ubuntu.
2. Builds installers on their native operating systems:
   - Windows on `windows-latest`
   - Linux on `ubuntu-latest`
   - macOS on `macos-latest`
3. Uploads all generated installer artifacts.
4. Publishes the artifacts to a GitHub Release.

Manual release dispatch is also available from GitHub Actions and requires an explicit tag input.

## Auto Updates

Packaged Windows and macOS builds use Electron's built-in `autoUpdater` through `update.electronjs.org`.

The installers remain hosted on GitHub Releases. `update.electronjs.org` acts as the update feed adapter that tells Electron which GitHub Release asset should be downloaded for the current platform and version.

Linux auto-updates are intentionally disabled because Electron's built-in updater does not support Linux packages in the same way as Windows Squirrel and macOS archives.

## Project Structure

```text
api/                    API client, IPC registration, and token storage
assets/                 Icons and fonts used by the renderer
test/                   Node test suite
.github/workflows/      CI and release workflows
main.js                 Electron main process
preload.js              Secure renderer bridge
renderer.js             UI behavior and API interactions
forge.config.js         Electron Forge package and maker configuration
```

## Security Notes

- `.env` is ignored and must not be committed.
- API tokens are stored in Electron's `safeStorage` when encryption is available.
- The renderer only accesses backend capabilities through the explicit preload bridge.
- Release publishing uses the GitHub-provided `GITHUB_TOKEN` with `contents: write`.
