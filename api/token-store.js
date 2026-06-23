const fs = require('node:fs/promises');
const path = require('node:path');
const { app, safeStorage } = require('electron');

class TokenStore {
  constructor(filename = 'todo-api-token') {
    if (!app.isReady()) throw new Error('Create TokenStore after Electron app.whenReady()');
    this.file = path.join(app.getPath('userData'), filename);
    this.memoryToken = null;
    this.loaded = false;
  }

  async get() {
    if (this.loaded) return this.memoryToken;
    this.loaded = true;
    if (!safeStorage.isEncryptionAvailable()) return null;

    try {
      const encoded = await fs.readFile(this.file, 'utf8');
      this.memoryToken = safeStorage.decryptString(Buffer.from(encoded, 'base64'));
    } catch (error) {
      if (error.code !== 'ENOENT') await this.clear();
    }
    return this.memoryToken;
  }

  async set(token) {
    this.loaded = true;
    this.memoryToken = token;
    if (!safeStorage.isEncryptionAvailable()) return;

    const encrypted = safeStorage.encryptString(token).toString('base64');
    await fs.writeFile(this.file, encrypted, { mode: 0o600 });
  }

  async clear() {
    this.loaded = true;
    this.memoryToken = null;
    await fs.rm(this.file, { force: true });
  }
}

module.exports = { TokenStore };
