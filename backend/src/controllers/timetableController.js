const timetableService = require('../services/timetableService');
const { asyncHandler, ok, created, parsePagination, paginationMeta } = require('../utils/http');

const list = asyncHandler(async (req, res) => {
  const pagination = parsePagination(req.query);
  const { items, total } = await timetableService.list(req.user, { ...pagination, from: req.query.from, to: req.query.to });
  ok(res, { items, pagination: paginationMeta(pagination, total) });
});

const getByDate = asyncHandler(async (req, res) => ok(res, await timetableService.getByDate(req.user, req.params.date)));

const getById = asyncHandler(async (req, res) => ok(res, await timetableService.getById(req.user, req.params.id)));

const create = asyncHandler(async (req, res) => {
  const { title, scheduleDate, tasks } = req.body;
  created(res, await timetableService.create(req.user, { title, scheduleDate, tasks }), 'Timetable created');
});

const update = asyncHandler(async (req, res) => {
  const { title, tasks } = req.body;
  ok(res, await timetableService.update(req.user, req.params.id, { title, tasks }), 'Timetable updated');
});

const remove = asyncHandler(async (req, res) => {
  await timetableService.remove(req.user, req.params.id);
  ok(res, null, 'Timetable deleted');
});

const duplicate = asyncHandler(async (req, res) => {
  const { targetDate, title } = req.body;
  created(res, await timetableService.duplicate(req.user, req.params.id, { targetDate, title }), 'Timetable duplicated');
});

module.exports = { list, getByDate, getById, create, update, remove, duplicate };
