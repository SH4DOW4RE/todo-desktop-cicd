const { resourceId } = require('./api-client');

function createTodosApi(client) {
  return {
    // Filters: page, limit, status, archived, folder, tag, search.
    list(filters = {}) {
      return client.request('/todos', { query: filters });
    },

    // Filters: q, title, content, status, archived, folder, tag, date_from,
    // date_to, page, limit, sort, order.
    search(filters = {}) {
      return client.request('/todos/search', { query: filters });
    },

    create(todo) {
      return client.request('/todos', { method: 'POST', body: todo });
    },

    get(id) {
      return client.request(`/todos/${resourceId(id)}`);
    },

    replace(id, todo) {
      return client.request(`/todos/${resourceId(id)}`, { method: 'PUT', body: todo });
    },

    update(id, changes) {
      return client.request(`/todos/${resourceId(id)}`, { method: 'PATCH', body: changes });
    },

    delete(id) {
      return client.request(`/todos/${resourceId(id)}`, { method: 'DELETE' });
    }
  };
}

module.exports = { createTodosApi };
