import client from './client';

export const applicationsAPI = {
  getAll: async (params = {}) => {
    const response = await client.get('/applications/', { params });
    return response.data;
  },

  getById: async (id) => {
    const response = await client.get(`/applications/${id}/`);
    return response.data;
  },

  create: async (data) => {
    const response = await client.post('/applications/', data);
    return response.data;
  },

  update: async (id, data) => {
    const response = await client.put(`/applications/${id}/`, data);
    return response.data;
  },

  patch: async (id, data) => {
    const response = await client.patch(`/applications/${id}/`, data);
    return response.data;
  },

  delete: async (id) => {
    const response = await client.delete(`/applications/${id}/`);
    return response.data;
  },

  getStats: async () => {
    const response = await client.get('/applications/stats/');
    return response.data;
  },

  getFollowUps: async () => {
    const response = await client.get('/applications/follow-ups/');
    return response.data;
  },
};
