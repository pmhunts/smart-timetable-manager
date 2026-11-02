const jwt = require('jsonwebtoken');
const env = require('../config/env');
const authService = require('../services/authService');
const { asyncHandler, ok, created } = require('../utils/http');
const { pick } = require('../utils/object');

const cookieOptions = () => ({
  httpOnly: true,
  secure: env.jwt.cookieSecure,
  sameSite: 'lax',
  path: '/',
});

/** Puts the JWT into an httpOnly cookie that expires together with the token. */
const setAuthCookie = (res, token) => {
  const { exp } = jwt.decode(token);
  res.cookie(env.jwt.cookieName, token, { ...cookieOptions(), expires: new Date(exp * 1000) });
};

const clearAuthCookie = (res) => res.clearCookie(env.jwt.cookieName, cookieOptions());

const register = asyncHandler(async (req, res) => {
  const { user, token } = await authService.register(
    pick(req.body, ['name', 'email', 'countryCode', 'phoneNumber', 'password', 'timezone'])
  );
  setAuthCookie(res, token);
  created(res, { user, token }, 'Account created successfully');
});

const login = asyncHandler(async (req, res) => {
  const { user, token } = await authService.login(pick(req.body, ['email', 'password']));
  setAuthCookie(res, token);
  ok(res, { user, token }, 'Logged in successfully');
});

const logout = (req, res) => {
  clearAuthCookie(res);
  ok(res, null, 'Logged out');
};

const me = (req, res) => ok(res, { user: req.user });

const forgotPassword = asyncHandler(async (req, res) => {
  await authService.forgotPassword(req.body.email);
  ok(res, null, 'If an account exists for this email, a password reset link has been sent.');
});

const resetPassword = asyncHandler(async (req, res) => {
  await authService.resetPassword(req.body.token, req.body.password);
  clearAuthCookie(res);
  ok(res, null, 'Password updated. Please log in with your new password.');
});

module.exports = { register, login, logout, me, forgotPassword, resetPassword, setAuthCookie };
