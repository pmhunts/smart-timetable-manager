const dashboardService = require('../services/dashboardService');
const { asyncHandler, ok } = require('../utils/http');

const getDashboard = asyncHandler(async (req, res) => ok(res, await dashboardService.getDashboard(req.user)));

module.exports = { getDashboard };
