const test = require('node:test');
const assert = require('node:assert/strict');
const { DateTime } = require('luxon');

const { getEditingWindowState } = require('../src/utils/editingWindow');
const { findConflicts, assertNoOverlaps, validateTaskShape, normalizeNewTask } = require('../src/services/taskHelpers');
const { occursOn } = require('../src/services/recurrenceService');
const { quietHoursEnd, eventBlockReason, channelBlockReason } = require('../src/notifications/preferences');
const { computeAutoStatus } = require('../src/services/taskStatusService');
const { render } = require('../src/notifications/templates');
const { buildPayload } = require('../src/notifications/channels/whatsappProvider');
const { localToUtc, formatTime12 } = require('../src/utils/time');

const TZ = 'Asia/Kolkata';
const at = (iso) => DateTime.fromISO(iso, { zone: TZ }).toJSDate(); // local wall time -> Date
const windowSettings = { editingEnabled: true, startTime: '06:00', endTime: '09:00', applicableDays: [1, 2, 3, 4, 5, 6, 7] };

test('editing window: open inside 06:00-09:00, locked after', () => {
  const open = getEditingWindowState(windowSettings, TZ, at('2026-11-02T07:30'));
  assert.equal(open.isOpen, true);
  assert.equal(open.secondsRemaining, 90 * 60);

  const locked = getEditingWindowState(windowSettings, TZ, at('2026-11-02T09:00'));
  assert.equal(locked.isLocked, true);
  assert.equal(locked.secondsUntilOpen, 21 * 3600);
  assert.equal(locked.nextWindow.opensAt, DateTime.fromISO('2026-11-03T06:00', { zone: TZ }).toUTC().toISO());
});

test('editing window: disabled restriction is always open', () => {
  const s = getEditingWindowState({ ...windowSettings, editingEnabled: false }, TZ, at('2026-11-02T23:00'));
  assert.equal(s.isOpen, true);
  assert.equal(s.enabled, false);
});

test('editing window: only applicable days unlock', () => {
  // 2026-11-02 is a Monday (1). Only Wednesday allowed.
  const s = getEditingWindowState({ ...windowSettings, applicableDays: [3] }, TZ, at('2026-11-02T07:00'));
  assert.equal(s.isLocked, true);
  assert.equal(DateTime.fromISO(s.nextWindow.opensAt).setZone(TZ).toISODate(), '2026-11-04');
});

test('editing window: overnight window 22:00-02:00 spans midnight', () => {
  const s = { ...windowSettings, startTime: '22:00', endTime: '02:00', applicableDays: [1] }; // Monday night
  assert.equal(getEditingWindowState(s, TZ, at('2026-11-03T01:00')).isOpen, true); // Tue 01:00 belongs to Mon window
  assert.equal(getEditingWindowState(s, TZ, at('2026-11-03T03:00')).isOpen, false);
});

test('overlap detection respects allowOverlap and skipped tasks', () => {
  const existing = [
    { id: 1, title: 'DSA', startTime: '09:00', endTime: '11:00', status: 'UPCOMING', allowOverlap: false },
    { id: 2, title: 'Nap', startTime: '13:00', endTime: '14:00', status: 'SKIPPED', allowOverlap: false },
  ];
  assert.equal(findConflicts({ title: 'X', startTime: '10:00', endTime: '10:30' }, existing).length, 1);
  assert.equal(findConflicts({ title: 'X', startTime: '11:00', endTime: '12:00' }, existing).length, 0); // touching is fine
  assert.equal(findConflicts({ title: 'X', startTime: '10:00', endTime: '10:30', allowOverlap: true }, existing).length, 0);
  assert.equal(findConflicts({ title: 'X', startTime: '13:00', endTime: '13:30' }, existing).length, 0);
  assert.equal(findConflicts({ id: 1, title: 'DSA', startTime: '09:30', endTime: '11:00' }, existing).length, 0); // itself
  assert.throws(
    () => assertNoOverlaps([{ title: 'A', startTime: '08:00', endTime: '09:00' }, { title: 'B', startTime: '08:30', endTime: '10:00' }]),
    (err) => err.statusCode === 409 && err.code === 'TASK_OVERLAP' && err.extra.conflicts[0].title === 'B'
  );
});

test('task validation: end must be after start, custom repeat needs days', () => {
  assert.throws(() => validateTaskShape(normalizeNewTask({ title: 'A', startTime: '10:00', endTime: '09:00' }), '2026-11-02'), /end time/);
  assert.throws(
    () => validateTaskShape(normalizeNewTask({ title: 'A', startTime: '09:00', endTime: '10:00', repeatType: 'CUSTOM' }), '2026-11-02'),
    /at least one day/
  );
  const n = normalizeNewTask({ title: 'A', startTime: '09:00:00', endTime: '10:00', repeatType: 'DAILY', repeatDays: [1] });
  assert.equal(n.startTime, '09:00');
  assert.equal(n.repeatDays, null);
});

test('recurrence rules', () => {
  const base = { scheduleDate: '2026-11-02', repeatUntil: null, repeatExceptions: [] }; // Monday
  assert.equal(occursOn({ ...base, repeatType: 'DAILY' }, '2026-11-03'), true);
  assert.equal(occursOn({ ...base, repeatType: 'DAILY' }, '2026-11-02'), false); // the template day itself
  assert.equal(occursOn({ ...base, repeatType: 'WEEKLY' }, '2026-11-09'), true);
  assert.equal(occursOn({ ...base, repeatType: 'WEEKLY' }, '2026-11-10'), false);
  assert.equal(occursOn({ ...base, repeatType: 'CUSTOM', repeatDays: [3, 5] }, '2026-11-04'), true);
  assert.equal(occursOn({ ...base, repeatType: 'DAILY', repeatUntil: '2026-11-03' }, '2026-11-04'), false);
  assert.equal(occursOn({ ...base, repeatType: 'DAILY', repeatExceptions: ['2026-11-05'] }, '2026-11-05'), false);
});

test('auto status from the clock', () => {
  const s = new Date('2026-11-02T10:00:00Z');
  const e = new Date('2026-11-02T11:00:00Z');
  assert.equal(computeAutoStatus(s, e, new Date('2026-11-02T09:00:00Z')), 'UPCOMING');
  assert.equal(computeAutoStatus(s, e, new Date('2026-11-02T10:30:00Z')), 'ONGOING');
  assert.equal(computeAutoStatus(s, e, new Date('2026-11-02T11:00:00Z')), 'MISSED');
});

test('timezone conversion and formatting', () => {
  assert.equal(localToUtc('2026-11-02', '06:30', TZ).toISOString(), '2026-11-02T01:00:00.000Z');
  assert.equal(formatTime12('06:30'), '6:30 AM');
  assert.equal(formatTime12('00:05'), '12:05 AM');
  assert.equal(formatTime12('12:00'), '12:00 PM');
});

test('quiet hours (overnight) returns the end instant', () => {
  const s = { quietHoursEnabled: true, quietHoursStart: '22:00', quietHoursEnd: '06:00' };
  const end = quietHoursEnd(s, TZ, at('2026-11-02T23:30'));
  assert.equal(end.toISOString(), DateTime.fromISO('2026-11-03T06:00', { zone: TZ }).toUTC().toISO());
  assert.equal(quietHoursEnd(s, TZ, at('2026-11-02T12:00')), null);
});

test('preferences: channels are independent, consent is required for WhatsApp', () => {
  const user = { isActive: true, email: 'a@b.c', phoneNumber: '9876543210' };
  const settings = { emailEnabled: true, whatsappEnabled: true, whatsappOptIn: false, emailTaskStart: true, whatsappTaskStart: true };
  assert.equal(channelBlockReason(user, settings, 'EMAIL'), null);
  assert.match(channelBlockReason(user, settings, 'WHATSAPP'), /opt-in/);
  assert.match(channelBlockReason(user, { ...settings, whatsappOptIn: true, emailEnabled: false }, 'EMAIL'), /turned off/);
  const task = { reminderEnabled: true, whatsappReminder: false, emailReminder: true };
  assert.match(eventBlockReason(settings, 'WHATSAPP', 'TASK_START', task), /WhatsApp reminder disabled/);
  assert.equal(eventBlockReason(settings, 'EMAIL', 'TASK_START', task), null);
});

test('templates render the brief examples and valid WhatsApp template params', () => {
  const user = { name: 'Piyush Sharma' };
  const task = { title: 'Morning Exercise', description: 'Complete your morning workout.', scheduleDate: '2026-11-02', startTime: '06:30', endTime: '07:30', category: 'Exercise', priority: 'HIGH' };
  const start = render('TASK_START', { user, task });
  assert.match(start.text, /Hello Piyush! 👋\n\nIt's 6:30 AM\./);
  assert.match(start.html, /Morning Exercise/);

  const change = {
    before: { title: 'DSA Study', scheduleDate: '2026-11-02', startTime: '09:00', endTime: '11:00' },
    after: { title: 'DSA Study', scheduleDate: '2026-11-02', startTime: '10:00', endTime: '12:00' },
    changes: [{ field: 'startTime', from: '09:00', to: '10:00' }, { field: 'endTime', from: '11:00', to: '12:00' }],
  };
  const upd = render('TASK_UPDATED', { user, payload: { change } });
  assert.match(upd.text, /Previous Time: 9:00 AM - 11:00 AM\nNew Time: 10:00 AM - 12:00 PM/);

  const payload = buildPayload('919876543210', upd);
  assert.equal(payload.type, 'template');
  payload.template.components[0].parameters.forEach((p) => assert.doesNotMatch(p.text, /[\n\t]/));

  const xss = render('TASK_START', { user: { name: '<b>x</b>' }, task: { ...task, title: '<script>alert(1)</script>' } });
  assert.doesNotMatch(xss.html, /<script>/);
});
