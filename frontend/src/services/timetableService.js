import api, { unwrap } from './api.js';

export const timetableService = {
  list: (params) => api.get('/timetable', { params }).then(unwrap),
  getByDate: (date) => api.get(`/timetable/date/${date}`).then(unwrap),
  get: (id) => api.get(`/timetable/${id}`).then(unwrap),
  create: (payload) => api.post('/timetable', payload).then(unwrap),
  update: (id, payload) => api.put(`/timetable/${id}`, payload).then(unwrap),
  remove: (id) => api.delete(`/timetable/${id}`).then(unwrap),
  duplicate: (id, payload) => api.post(`/timetable/${id}/duplicate`, payload).then(unwrap),
};
