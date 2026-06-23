const { resourceId } = require('./api-client');

function createFoldersApi(client) {
  return {
    // parent may be undefined (all folders), "root", or a folder ID.
    list({ parent } = {}) {
      return client.request('/folders', { query: { parent } });
    },

    create({ name, parent = null }) {
      return client.request('/folders', { method: 'POST', body: { name, parent } });
    },

    get(id) {
      return client.request(`/folders/${resourceId(id)}`);
    },

    replace(id, { name, parent = null }) {
      return client.request(`/folders/${resourceId(id)}`, { method: 'PUT', body: { name, parent } });
    },

    update(id, changes) {
      return client.request(`/folders/${resourceId(id)}`, { method: 'PATCH', body: changes });
    },

    delete(id) {
      return client.request(`/folders/${resourceId(id)}`, { method: 'DELETE' });
    }
  };
}

module.exports = { createFoldersApi };
