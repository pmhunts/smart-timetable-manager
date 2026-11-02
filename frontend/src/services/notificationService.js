import api, { unwrap } from './api.js';

export const notificationService = {
  history: (params) => api.get('/notifications/history', { params }).then(unwrap),
  testWhatsapp: () => api.post('/notifications/test-whatsapp').then(unwrap),
  testEmail: () => api.post('/notifications/test-email').then(unwrap),
};
