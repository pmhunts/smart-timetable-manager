const express = require('express');
const { requireAuth } = require('../middleware/auth');
const { requireEditingWindowOpen } = require('../middleware/editingWindow');
const { validate } = require('../middleware/validate');
const { authLimiter, passwordResetLimiter, testNotificationLimiter } = require('../middleware/rateLimiters');
const { avatarUpload } = require('../middleware/upload');

const auth = require('../controllers/authController');
const users = require('../controllers/userController');
const timetables = require('../controllers/timetableController');
const tasks = require('../controllers/taskController');
const settings = require('../controllers/settingsController');
const notifications = require('../controllers/notificationController');
const dashboard = require('../controllers/dashboardController');
const webhooks = require('../controllers/webhookController');

const authV = require('../validators/authValidators');
const userV = require('../validators/userValidators');
const timetableV = require('../validators/timetableValidators');
const taskV = require('../validators/taskValidators');
const settingsV = require('../validators/settingsValidators');

const router = express.Router();
// Every create/update/delete of timetables and tasks goes through this guard (server clock).
const editable = [requireAuth, requireEditingWindowOpen];

router.get('/health', (req, res) => res.json({ success: true, data: { status: 'ok', time: new Date().toISOString() } }));

// ---- Auth
router.post('/auth/register', authLimiter, validate(authV.register), auth.register);
router.post('/auth/login', authLimiter, validate(authV.login), auth.login);
router.post('/auth/logout', auth.logout);
router.get('/auth/me', requireAuth, auth.me);
router.post('/auth/forgot-password', passwordResetLimiter, validate(authV.forgotPassword), auth.forgotPassword);
router.post('/auth/reset-password', authLimiter, validate(authV.resetPassword), auth.resetPassword);

// ---- Users
router.get('/users/profile', requireAuth, users.getProfile);
router.put('/users/profile', requireAuth, validate(userV.updateProfile), users.updateProfile);
router.put('/users/password', requireAuth, authLimiter, validate(userV.changePassword), users.changePassword);
router.post('/users/avatar', requireAuth, avatarUpload, users.uploadAvatar);
router.delete('/users/avatar', requireAuth, users.deleteAvatar);

// ---- Dashboard
router.get('/dashboard', requireAuth, dashboard.getDashboard);

// ---- Timetables
router.get('/timetable', requireAuth, validate(timetableV.list), timetables.list);
router.get('/timetable/date/:date', requireAuth, validate(timetableV.byDate), timetables.getByDate);
router.get('/timetable/:id', requireAuth, validate([timetableV.idParam()]), timetables.getById);
router.post('/timetable', ...editable, validate(timetableV.create), timetables.create);
router.put('/timetable/:id', ...editable, validate(timetableV.update), timetables.update);
router.delete('/timetable/:id', ...editable, validate([timetableV.idParam()]), timetables.remove);
router.post('/timetable/:id/duplicate', ...editable, validate(timetableV.duplicate), timetables.duplicate);

// ---- Tasks
router.get('/tasks', requireAuth, validate(taskV.list), tasks.list);
router.get('/tasks/stats', requireAuth, validate(taskV.stats), tasks.stats);
router.get('/tasks/:id', requireAuth, validate([taskV.idParam()]), tasks.getOne);
router.post('/tasks', ...editable, validate(taskV.create), tasks.create);
router.put('/tasks/:id', ...editable, validate(taskV.update), tasks.update);
// Marking tasks done/skipped is not timetable editing, so it is allowed while locked.
router.patch('/tasks/:id/status', requireAuth, validate(taskV.updateStatus), tasks.updateStatus);
router.delete('/tasks/:id', ...editable, validate([taskV.idParam()]), tasks.remove);

// ---- Settings
router.get('/settings/notifications', requireAuth, settings.getNotificationSettings);
router.put('/settings/notifications', requireAuth, validate(settingsV.notificationSettings), settings.updateNotificationSettings);
router.get('/settings/editing-window', requireAuth, settings.getEditingWindow);
// The service itself rejects changes while the window is closed (same 403 as the editable guard).
router.put('/settings/editing-window', requireAuth, validate(settingsV.editingWindow), settings.updateEditingWindow);

// ---- Notifications
router.get('/notifications/history', requireAuth, validate(settingsV.history), notifications.history);
router.post('/notifications/test-whatsapp', requireAuth, testNotificationLimiter, notifications.testWhatsapp);
router.post('/notifications/test-email', requireAuth, testNotificationLimiter, notifications.testEmail);

// ---- Webhooks (public, signature-verified)
router.get('/webhooks/whatsapp', webhooks.verify);
router.post('/webhooks/whatsapp', webhooks.receive);

module.exports = router;
