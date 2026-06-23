function createAuthApi(client, tokenStore) {
  return {
    register({ username, email, password }) {
      return client.request('/auth/register', {
        method: 'POST',
        body: { username, email, password },
        authenticated: false
      });
    },

    async login({ email, password }) {
      const result = await client.request('/auth/login', {
        method: 'POST',
        body: { email, password },
        authenticated: false
      });
      await tokenStore.set(result.token);
      return result.user;
    },

    async logout() {
      await tokenStore.clear();
    },

    async isLoggedIn() {
      return Boolean(await tokenStore.get());
    }
  };
}

module.exports = { createAuthApi };
