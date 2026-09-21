import client from './client';

export const authAPI = {
  register: async (data) => {
    const response = await client.post('/auth/register/', data);
    return response.data;
  },

  login: async (credentials) => {
    const response = await client.post('/auth/login/', credentials);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await client.get('/auth/me/');
    return response.data;
  },

  refresh: async (refreshToken) => {
    const response = await client.post('/auth/refresh/', { refresh: refreshToken });
    return response.data;
  },
};
