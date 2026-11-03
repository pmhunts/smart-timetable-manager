/**
 * Renders every notification event for both channels.
 *
 * render(eventType, ctx) -> {
 *   subject,            // email subject
 *   text,               // plain text (WhatsApp session message body + email text part + history)
 *   html,               // email HTML
 *   whatsappTemplate: { key, params }  // approved WhatsApp template + body parameters
 * }
 *
 * ctx = { user, task, payload, tasks }  (task = plain task snapshot, tasks = list for summaries)
 */
const env = require('../../config/env');
const { formatTime12, formatDateLong } = require('../../utils/time');
const { layout, detailsTable, taskList, p, escapeHtml } = require('./emailLayout');

const firstName = (user) => String(user?.name || 'there').trim().split(/\s+/)[0];
const range = (t) => `${formatTime12(t.startTime)} - ${formatTime12(t.endTime)}`;

const taskDetailsRows = (t) => [
  ['Task', t.title],
  ['Date', t.scheduleDate ? formatDateLong(t.scheduleDate) : undefined],
  ['Start Time', formatTime12(t.startTime)],
  ['End Time', formatTime12(t.endTime)],
  ['Category', t.category],
  ['Priority', t.priority ? t.priority.charAt(0) + t.priority.slice(1).toLowerCase() : undefined],
  ['Description', t.description],
];

const FIELD_LABELS = { title: 'Task', scheduleDate: 'Date', startTime: 'Start Time', endTime: 'End Time' };
const fmtField = (field, value) => {
  if (field === 'startTime' || field === 'endTime') return formatTime12(value);
  if (field === 'scheduleDate') return formatDateLong(value);
  return value;
};

/** Describes a single task change: { title, changes: [{ field, from, to }] } */
const describeChange = (c) => {
  const lines = [];
  const time = c.changes.filter((x) => x.field === 'startTime' || x.field === 'endTime');
  const others = c.changes.filter((x) => x.field !== 'startTime' && x.field !== 'endTime');
  if (time.length) {
    const from = `${formatTime12(c.before.startTime)} - ${formatTime12(c.before.endTime)}`;
    const to = `${formatTime12(c.after.startTime)} - ${formatTime12(c.after.endTime)}`;
    lines.push({ label: 'Time', from, to });
  }
  others.forEach((x) => lines.push({ label: FIELD_LABELS[x.field] || x.field, from: fmtField(x.field, x.from), to: fmtField(x.field, x.to) }));
  return lines;
};

const builders = {
  ADVANCE_REMINDER: ({ user, task, payload }) => {
    const mins = payload.reminderMinutes;
    return {
      subject: `Timetable Reminder - ${task.title}`,
      text:
        `Hello ${firstName(user)}! 👋\n\n` +
        `⏰ Your activity *${task.title}* starts in ${mins} minutes (${formatTime12(task.startTime)}).\n\n` +
        (task.description ? `Description: ${task.description}\n\n` : '') +
        'Get ready and stay consistent with your daily goals! 💪',
      html: layout({
        title: `Upcoming: ${task.title}`,
        preheader: `${task.title} starts at ${formatTime12(task.startTime)}`,
        body:
          p(`Hello ${firstName(user)},`) +
          p(`This is a reminder that your scheduled activity is about to begin in ${mins} minutes.`) +
          detailsTable(taskDetailsRows(task)) +
          p('Stay consistent with your daily routine!'),
      }),
      whatsappTemplate: {
        key: 'ADVANCE_REMINDER',
        params: [firstName(user), task.title, formatTime12(task.startTime), String(mins), task.description || '-'],
      },
    };
  },

  TASK_START: ({ user, task }) => ({
    subject: `It's time: ${task.title}`,
    text:
      `Hello ${firstName(user)}! 👋\n\n` +
      `It's ${formatTime12(task.startTime)}.\n\n` +
      `⏰ Your scheduled activity:\n${task.title}\n\n` +
      (task.description ? `Description: ${task.description}\n\n` : '') +
      'Your scheduled time is now. Stay consistent with your daily goals! 💪',
    html: layout({
      title: `It's time: ${task.title}`,
      preheader: `Your scheduled activity starts now (${formatTime12(task.startTime)})`,
      body:
        p(`Hello ${firstName(user)},`) +
        p(`It's ${formatTime12(task.startTime)} - your scheduled activity starts now.`) +
        detailsTable(taskDetailsRows(task)) +
        p('Stay consistent with your daily goals!'),
    }),
    whatsappTemplate: {
      key: 'TASK_START',
      params: [firstName(user), formatTime12(task.startTime), task.title, task.description || '-'],
    },
  }),

  INCOMPLETE_REMINDER: ({ user, task }) => ({
    subject: `Not completed yet: ${task.title}`,
    text:
      `Hello ${firstName(user)},\n\n` +
      `Your task *${task.title}* (${range(task)}) has ended but is not marked as completed.\n\n` +
      'If you finished it, mark it as completed in your dashboard. Otherwise, consider rescheduling it. 🙂',
    html: layout({
      title: 'Task not completed',
      preheader: `${task.title} is not marked as completed`,
      body:
        p(`Hello ${firstName(user)},`) +
        p('The following task has ended but is not marked as completed:') +
        detailsTable(taskDetailsRows(task)) +
        p('If you finished it, mark it as completed. Otherwise, consider rescheduling it.'),
    }),
    whatsappTemplate: { key: 'INCOMPLETE_REMINDER', params: [firstName(user), task.title, range(task)] },
  }),

  TASK_CREATED: ({ user, task }) => ({
    subject: `Task added - ${task.title}`,
    text:
      `Hello ${firstName(user)},\n\nA new task was added to your timetable:\n\n` +
      `Task: ${task.title}\nDate: ${formatDateLong(task.scheduleDate)}\nTime: ${range(task)}`,
    html: layout({
      title: 'Task added to your timetable',
      body: p(`Hello ${firstName(user)},`) + p('A new task was added to your timetable:') + detailsTable(taskDetailsRows(task)),
    }),
    whatsappTemplate: {
      key: 'GENERIC',
      params: [firstName(user), `New task added: ${task.title} on ${formatDateLong(task.scheduleDate)}, ${range(task)}.`],
    },
  }),

  TASK_UPDATED: ({ user, payload }) => {
    const change = payload.change;
    const lines = describeChange(change);
    const textLines = lines.map((l) =>
      l.label === 'Time' ? `Previous Time: ${l.from}\nNew Time: ${l.to}` : `Previous ${l.label}: ${l.from}\nNew ${l.label}: ${l.to}`
    );
    return {
      subject: `Timetable updated - ${change.after.title}`,
      text:
        'Your timetable has been updated!\n\n' +
        `Task: ${change.after.title}\n` +
        `Date: ${formatDateLong(change.after.scheduleDate)}\n\n` +
        `${textLines.join('\n\n')}\n\nPlease follow your updated schedule.`,
      html: layout({
        title: 'Your timetable has been updated',
        preheader: `${change.after.title} was changed`,
        body:
          p(`Hello ${firstName(user)},`) +
          p(`The task "${change.after.title}" on ${formatDateLong(change.after.scheduleDate)} was changed:`) +
          detailsTable(lines.flatMap((l) => [[`Previous ${l.label}`, l.from], [`New ${l.label}`, l.to]])) +
          p('Please follow your updated schedule.'),
      }),
      whatsappTemplate: {
        key: 'UPDATE',
        params: [firstName(user), `${change.after.title}: ${lines.map((l) => `${l.label} ${l.from} -> ${l.to}`).join('; ')}`],
      },
    };
  },

  TASK_DELETED: ({ user, payload }) => {
    const t = payload.task;
    return {
      subject: `Task cancelled - ${t.title}`,
      text:
        `Hello ${firstName(user)},\n\nThe following task was removed from your timetable:\n\n` +
        `Task: ${t.title}\nDate: ${formatDateLong(t.scheduleDate)}\nTime: ${range(t)}\n\nYou will not receive reminders for it anymore.`,
      html: layout({
        title: 'Task cancelled',
        preheader: `${t.title} was removed from your timetable`,
        body:
          p(`Hello ${firstName(user)},`) +
          p('The following task was removed from your timetable. You will not receive reminders for it anymore.') +
          detailsTable(taskDetailsRows(t)),
      }),
      whatsappTemplate: { key: 'CANCELLED', params: [firstName(user), `${t.title} on ${formatDateLong(t.scheduleDate)} (${range(t)})`] },
    };
  },

  TIMETABLE_CREATED: ({ user, payload }) => {
    const tasks = payload.tasks || [];
    return {
      subject: `Timetable created - ${formatDateLong(payload.scheduleDate)}`,
      text:
        `Hello ${firstName(user)},\n\nYour timetable "${payload.title}" for ${formatDateLong(payload.scheduleDate)} has been created with ${tasks.length} task(s):\n\n` +
        tasks.map((t) => `• ${formatTime12(t.startTime)} - ${t.title}`).join('\n'),
      html: layout({
        title: 'Timetable created',
        preheader: `${tasks.length} tasks planned for ${formatDateLong(payload.scheduleDate)}`,
        body:
          p(`Hello ${firstName(user)},`) +
          p(`Your timetable "${payload.title}" for ${formatDateLong(payload.scheduleDate)} has been created with ${tasks.length} task(s).`) +
          taskList(tasks.map((t) => ({ time: formatTime12(t.startTime), title: t.title, meta: `${range(t)} · ${t.category}` }))),
      }),
      whatsappTemplate: {
        key: 'GENERIC',
        params: [
          firstName(user),
          `Your timetable for ${formatDateLong(payload.scheduleDate)} was created with ${tasks.length} task(s): ${tasks
            .map((t) => `${formatTime12(t.startTime)} ${t.title}`)
            .join(', ')}`,
        ],
      },
    };
  },

  TIMETABLE_UPDATED: ({ user, payload }) => {
    const { added = [], removed = [], changed = [] } = payload;
    const textParts = [];
    added.forEach((t) => textParts.push(`➕ Added: ${t.title} (${range(t)})`));
    removed.forEach((t) => textParts.push(`➖ Removed: ${t.title} (${range(t)})`));
    changed.forEach((c) =>
      describeChange(c).forEach((l) => textParts.push(`✏️ ${c.after.title} - ${l.label}: ${l.from} → ${l.to}`))
    );
    return {
      subject: `Timetable updated - ${formatDateLong(payload.scheduleDate)}`,
      text:
        `Your timetable has been updated!\n\nDate: ${formatDateLong(payload.scheduleDate)}\n\n${textParts.join('\n')}\n\n` +
        'Please follow your updated schedule.',
      html: layout({
        title: 'Your timetable has been updated',
        preheader: `${textParts.length} change(s) on ${formatDateLong(payload.scheduleDate)}`,
        body:
          p(`Hello ${firstName(user)},`) +
          p(`Your timetable for ${formatDateLong(payload.scheduleDate)} was changed:`) +
          `<ul style="padding-left:18px;margin:12px 0">${textParts
            .map((t) => `<li style="margin:6px 0">${escapeHtml(t)}</li>`)
            .join('')}</ul>` +
          p('Please follow your updated schedule.'),
      }),
      whatsappTemplate: {
        key: 'UPDATE',
        params: [firstName(user), `${formatDateLong(payload.scheduleDate)}: ${textParts.join('; ')}`],
      },
    };
  },

  TIMETABLE_DELETED: ({ user, payload }) => ({
    subject: `Timetable deleted - ${formatDateLong(payload.scheduleDate)}`,
    text:
      `Hello ${firstName(user)},\n\nYour timetable "${payload.title}" for ${formatDateLong(payload.scheduleDate)} ` +
      `was deleted (${payload.taskCount} task(s) removed). Pending reminders for it were cancelled.`,
    html: layout({
      title: 'Timetable deleted',
      body:
        p(`Hello ${firstName(user)},`) +
        p(
          `Your timetable "${payload.title}" for ${formatDateLong(payload.scheduleDate)} was deleted ` +
            `(${payload.taskCount} task(s) removed). Pending reminders for it were cancelled.`
        ),
    }),
    whatsappTemplate: {
      key: 'CANCELLED',
      params: [firstName(user), `Timetable "${payload.title}" for ${formatDateLong(payload.scheduleDate)} (${payload.taskCount} tasks)`],
    },
  }),

  DAILY_SUMMARY: ({ user, payload, tasks = [] }) => {
    const date = formatDateLong(payload.date);
    const lines = tasks.map((t) => `• ${formatTime12(t.startTime)} - ${t.title}`);
    const empty = 'You have no tasks scheduled. Enjoy your day or plan something new!';
    return {
      subject: `Your timetable for ${date}`,
      text: `Good day ${firstName(user)}! ☀️\n\nHere is your plan for ${date} (${tasks.length} task(s)):\n\n${lines.join('\n') || empty}`,
      html: layout({
        title: `Your day: ${date}`,
        preheader: `${tasks.length} task(s) planned today`,
        body:
          p(`Good day ${firstName(user)},`) +
          (tasks.length
            ? p(`Here is your plan for ${date}:`) +
              taskList(tasks.map((t) => ({ time: formatTime12(t.startTime), title: t.title, meta: `${range(t)} · ${t.category} · ${t.priority}` })))
            : p(empty)),
      }),
      whatsappTemplate: {
        key: 'DAILY_SUMMARY',
        params: [firstName(user), date, String(tasks.length), tasks.map((t) => `${formatTime12(t.startTime)} ${t.title}`).join(' • ') || '-'],
      },
    };
  },

  WELCOME: ({ user }) => ({
    subject: 'Welcome to Smart Timetable Manager',
    text:
      `Hello ${firstName(user)}! 🎉\n\n` +
      `Your Smart Timetable Manager account (${user.email}) has been created.\n\n` +
      'Next steps:\n• Create your first timetable\n• Set your timetable editing window\n• Choose your WhatsApp and email reminders in Notification Center\n\n' +
      `Open your dashboard: ${env.frontendUrl}/dashboard`,
    html: layout({
      title: 'Welcome aboard!',
      preheader: 'Your account has been created',
      body:
        p(`Hello ${firstName(user)},`) +
        p(`Your Smart Timetable Manager account (${user.email}) has been created successfully.`) +
        detailsTable([
          ['1. Plan your day', 'Create your first timetable'],
          ['2. Stay disciplined', 'Set your timetable editing window'],
          ['3. Get reminders', 'Choose WhatsApp and email alerts in Notification Center'],
        ]) +
        p('Stay consistent with your daily routine!'),
      ctaLabel: 'Open my dashboard',
    }),
    whatsappTemplate: { key: 'GENERIC', params: [firstName(user), 'your Smart Timetable Manager account has been created.'] },
  }),

  TEST: ({ user, payload }) => ({
    subject: 'Test notification - Smart Timetable Manager',
    text: `Hello ${firstName(user)}! ✅\n\nThis is a test ${payload.channel === 'WHATSAPP' ? 'WhatsApp message' : 'email'} from Smart Timetable Manager. Your notifications are configured correctly.`,
    html: layout({
      title: 'Test notification',
      body: p(`Hello ${firstName(user)},`) + p('This is a test email from Smart Timetable Manager. Your email notifications are configured correctly.'),
      ctaLabel: 'Open Notification Center',
      ctaUrl: `${env.frontendUrl}/notifications`,
    }),
    whatsappTemplate: { key: 'GENERIC', params: [firstName(user), 'This is a test message. Your WhatsApp notifications are configured correctly.'] },
  }),
};

function render(eventType, ctx) {
  const builder = builders[eventType];
  if (!builder) throw new Error(`No template for event ${eventType}`);
  return builder({ ...ctx, payload: ctx.payload || {} });
}

module.exports = { render, EVENT_TYPES: Object.keys(builders) };
