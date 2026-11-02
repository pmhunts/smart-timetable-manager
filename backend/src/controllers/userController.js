const userService = require('../services/userService');
const authService = require('../services/authService');
const { setAuthCookie } = require('./authController');
const { asyncHandler, ok } = require('../utils/http');

const getProfile = (req, res) => ok(res, { user: req.user });

const updateProfile = asyncHandler(async (req, res) => {
  const user = await userService.updateProfile(req.user, req.body);
  ok(res, { user }, 'Profile updated');
});

const changePassword = asyncHandler(async (req, res) => {
  const { token } = await authService.changePassword(req.user, req.body.currentPassword, req.body.newPassword);
  setAuthCookie(res, token); // keep this session signed in, other sessions are revoked
  ok(res, null, 'Password changed. Other sessions have been signed out.');
});

const uploadAvatar = asyncHandler(async (req, res) => {
  const user = await userService.setAvatar(req.user, req.file);
  ok(res, { user }, 'Profile picture updated');
});

const deleteAvatar = asyncHandler(async (req, res) => {
  const user = await userService.removeAvatar(req.user);
  ok(res, { user }, 'Profile picture removed');
});

module.exports = { getProfile, updateProfile, changePassword, uploadAvatar, deleteAvatar };
