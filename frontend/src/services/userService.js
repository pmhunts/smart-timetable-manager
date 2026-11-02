import api, { unwrap } from './api.js';

export const userService = {
  getProfile: () => api.get('/users/profile').then(unwrap),
  updateProfile: (payload) => api.put('/users/profile', payload).then(unwrap),
  changePassword: (payload) => api.put('/users/password', payload).then((r) => r.data),
  uploadAvatar: (file) => {
    const form = new FormData();
    form.append('avatar', file);
    return api
      .post('/users/avatar', form, { headers: { 'Content-Type': 'multipart/form-data' } })
      .then(unwrap);
  },
  removeAvatar: () => api.delete('/users/avatar').then(unwrap),
};
