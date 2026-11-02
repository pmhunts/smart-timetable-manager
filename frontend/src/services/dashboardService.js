import api, { unwrap } from './api.js';

export const dashboardService = {
  get: () => api.get('/dashboard').then(unwrap),
};
