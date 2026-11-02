import { normalizeTime, timeToMinutes } from './date.js';

export function emptyTask(overrides = {}) {
  return {
    _key: Math.random().toString(36).slice(2),
    title: '',
    description: '',
    startTime: '09:00',
    endTime: '10:00',
    category: 'Study',
    priority: 'MEDIUM',
    repeatType: 'NONE',
    repeatDays: [],
    repeatUntil: '',
    allowOverlap: false,
    reminderEnabled: true,
    whatsappReminder: true,
    emailReminder: true,
    ...overrides,
  };
}

/** Server Task -> editable form value. Keeps `id` so PUT /timetable can match rows. */
export function taskToForm(task, { keepId = true } = {}) {
  return emptyTask({
    ...(keepId && task.id ? { id: task.id } : {}),
    title: task.title || '',
    description: task.description || '',
    startTime: normalizeTime(task.startTime),
    endTime: normalizeTime(task.endTime),
    category: task.category || 'Other',
    priority: task.priority || 'MEDIUM',
    repeatType: task.repeatType || 'NONE',
    repeatDays: task.repeatDays || [],
    repeatUntil: task.repeatUntil || '',
    allowOverlap: Boolean(task.allowOverlap),
    reminderEnabled: task.reminderEnabled !== false,
    whatsappReminder: task.whatsappReminder !== false,
    emailReminder: task.emailReminder !== false,
    ...(task.scheduleDate ? { scheduleDate: task.scheduleDate } : {}),
  });
}

/** Form value -> TaskInput payload for the API. */
export function formToPayload(form, { includeDate = false, includeId = true } = {}) {
  const payload = {
    title: form.title.trim(),
    description: form.description?.trim() || '',
    startTime: form.startTime,
    endTime: form.endTime,
    category: form.category?.trim() || 'Other',
    priority: form.priority,
    repeatType: form.repeatType,
    repeatDays: form.repeatType === 'CUSTOM' ? [...form.repeatDays].sort() : null,
    repeatUntil: form.repeatType !== 'NONE' && form.repeatUntil ? form.repeatUntil : null,
    allowOverlap: Boolean(form.allowOverlap),
    reminderEnabled: Boolean(form.reminderEnabled),
    whatsappReminder: Boolean(form.whatsappReminder),
    emailReminder: Boolean(form.emailReminder),
  };
  if (includeId && form.id) payload.id = form.id;
  if (includeDate) payload.scheduleDate = form.scheduleDate;
  return payload;
}

/** Client-side validation; returns {} when valid. The backend re-validates everything. */
export function validateTask(form, { requireDate = false } = {}) {
  const errors = {};
  if (!form.title?.trim()) errors.title = 'Title is required';
  else if (form.title.trim().length > 255) errors.title = 'Title is too long';
  if (!form.startTime) errors.startTime = 'Required';
  if (!form.endTime) errors.endTime = 'Required';
  if (form.startTime && form.endTime && timeToMinutes(form.endTime) <= timeToMinutes(form.startTime)) {
    errors.endTime = 'End must be after start';
  }
  if (form.repeatType === 'CUSTOM' && !form.repeatDays?.length) errors.repeatDays = 'Pick at least one day';
  if (requireDate && !form.scheduleDate) errors.scheduleDate = 'Date is required';
  return errors;
}

/** Finds pairs of overlapping rows (ignoring rows that allow overlap). */
export function findLocalOverlaps(rows) {
  const conflicts = new Set();
  const list = rows
    .map((r, i) => ({ i, s: timeToMinutes(r.startTime), e: timeToMinutes(r.endTime), allow: r.allowOverlap }))
    .filter((r) => r.e > r.s);
  for (let a = 0; a < list.length; a += 1) {
    for (let b = a + 1; b < list.length; b += 1) {
      const x = list[a];
      const y = list[b];
      if (x.allow || y.allow) continue;
      if (x.s < y.e && y.s < x.e) {
        conflicts.add(x.i);
        conflicts.add(y.i);
      }
    }
  }
  return conflicts;
}

export const sortByStart = (tasks) =>
  [...tasks].sort((a, b) => (a.scheduleDate || '').localeCompare(b.scheduleDate || '') || timeToMinutes(a.startTime) - timeToMinutes(b.startTime));
