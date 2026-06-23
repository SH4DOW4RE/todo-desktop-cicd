function createUsersApi(client, tokenStore) {
  return {
    getCurrent() {
      return client.request('/users/me');
    },

    updateCurrent(changes) {
      return client.request('/users/me', { method: 'PATCH', body: changes });
    },

    async deleteCurrent() {
      await client.request('/users/me', { method: 'DELETE' });
      await tokenStore.clear();
    }
  };
}

module.exports = { createUsersApi };
