const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { User } = require('../models');
const ApiError = require('../utils/ApiError');

const extractToken = (req) => {
  const header = req.headers.authorization;
  if (header && header.startsWith('Bearer ')) return header.slice(7);
  return req.cookies ? req.cookies[env.jwt.cookieName] : null;
};

/** Requires a valid JWT; attaches the user to req.user. */
const requireAuth = async (req, res, next) => {
  try {
    const token = extractToken(req);
    if (!token) throw ApiError.unauthorized();

    let payload;
    try {
      payload = jwt.verify(token, env.jwt.secret);
    } catch {
      throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
    }

    const user = await User.scope('withPassword').findByPk(payload.sub);
    if (!user || !user.isActive || user.tokenVersion !== payload.tv) {
      throw ApiError.unauthorized('Session expired or invalid. Please log in again.');
    }
    req.user = user;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireAuth, extractToken };
