import api, { unwrap } from './api.js';

export const taskService = {
  list: (params) => api.get('/tasks', { params }).then(unwrap),
  stats: (days = 7) => api.get('/tasks/stats', { params: { days } }).then(unwrap),
  get: (id) => api.get(`/tasks/${id}`).then(unwrap),
  create: (payload) => api.post('/tasks', payload).then(unwrap),
  update: (id, payload) => api.put(`/tasks/${id}`, payload).then(unwrap),
  setStatus: (id, status) => api.patch(`/tasks/${id}/status`, { status }).then(unwrap),
  remove: (id) => api.delete(`/tasks/${id}`).then(unwrap),
};
