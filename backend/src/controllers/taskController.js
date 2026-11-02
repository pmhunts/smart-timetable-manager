const taskService = require('../services/taskService');
const { asyncHandler, ok, created } = require('../utils/http');

const list = asyncHandler(async (req, res) => ok(res, { items: await taskService.listTasks(req.user, req.query) }));

const stats = asyncHandler(async (req, res) => ok(res, await taskService.getStats(req.user, req.query.days || 7)));

const getOne = asyncHandler(async (req, res) => ok(res, await taskService.getTask(req.user, req.params.id)));

const create = asyncHandler(async (req, res) => created(res, await taskService.createTask(req.user, req.body), 'Task created'));

const update = asyncHandler(async (req, res) => ok(res, await taskService.updateTask(req.user, req.params.id, req.body), 'Task updated'));

const updateStatus = asyncHandler(async (req, res) =>
  ok(res, await taskService.updateStatus(req.user, req.params.id, req.body.status), 'Task status updated')
);

const remove = asyncHandler(async (req, res) => {
  await taskService.deleteTask(req.user, req.params.id);
  ok(res, null, 'Task deleted');
});

module.exports = { list, stats, getOne, create, update, updateStatus, remove };
