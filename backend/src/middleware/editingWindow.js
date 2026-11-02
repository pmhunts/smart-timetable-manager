const ApiError = require('../utils/ApiError');
const { EDITING_WINDOW_CLOSED_MESSAGE } = require('../utils/editingWindow');
const editingWindowService = require('../services/editingWindowService');

/**
 * Server-side enforcement of the timetable editing window.
 * Must run after requireAuth on every create/update/delete timetable or task route.
 * Uses the server clock only, so the restriction cannot be bypassed from the client.
 */
const requireEditingWindowOpen = async (req, res, next) => {
  try {
    const state = await editingWindowService.getStateForUser(req.user);
    if (!state.isOpen) {
      throw ApiError.forbidden(EDITING_WINDOW_CLOSED_MESSAGE, 'EDITING_WINDOW_CLOSED', { editingWindow: state });
    }
    req.editingWindow = state;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { requireEditingWindowOpen };
