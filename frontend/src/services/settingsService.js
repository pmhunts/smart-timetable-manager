import api, { unwrap } from './api.js';

export const settingsService = {
  getNotifications: () => api.get('/settings/notifications').then(unwrap),
  updateNotifications: (payload) => api.put('/settings/notifications', payload).then(unwrap),
  getEditingWindow: () => api.get('/settings/editing-window').then(unwrap),
  updateEditingWindow: (payload) => api.put('/settings/editing-window', payload).then(unwrap),
};
