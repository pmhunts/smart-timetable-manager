'use strict';

const bcrypt = require('bcryptjs');
const { DateTime } = require('luxon');

const DEMO_EMAIL = 'demo@smarttimetable.app';
const DEMO_PASSWORD = 'Demo@1234';
const TZ = 'Asia/Kolkata';

// The sample day from the product brief.
const DAY_PLAN = [
  ['Wake Up', 'Start the day fresh.', '06:00', '06:30', 'Personal', 'MEDIUM'],
  ['Morning Exercise', 'Complete your morning workout.', '06:30', '07:30', 'Exercise', 'HIGH'],
  ['Breakfast', 'Healthy breakfast.', '08:00', '08:30', 'Meal', 'LOW'],
  ['DSA Study', 'Solve 3 problems on graphs.', '09:00', '11:00', 'Study', 'HIGH'],
  ['Project Work', 'Work on the timetable project.', '11:00', '13:00', 'Work', 'HIGH'],
  ['Reading', 'Read 30 pages.', '14:00', '15:00', 'Reading', 'MEDIUM'],
  ['Exercise', 'Evening run.', '17:00', '18:00', 'Exercise', 'MEDIUM'],
  ['Revision', 'Revise today\'s topics.', '20:00', '21:00', 'Study', 'MEDIUM'],
  ['Sleep', 'Lights out.', '22:00', '22:30', 'Personal', 'LOW'],
];

const utc = (date, time) => DateTime.fromISO(`${date}T${time}`, { zone: TZ }).toUTC().toJSDate();

function autoStatus(start, end, now) {
  if (now >= end) return 'MISSED';
  if (now >= start) return 'ONGOING';
  return 'UPCOMING';
}

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    const now = new Date();
    const today = DateTime.now().setZone(TZ).toISODate();

    await queryInterface.bulkInsert('users', [
      {
        name: 'Piyush Demo',
        email: DEMO_EMAIL,
        country_code: '+91',
        phone_number: '9876543210',
        password: await bcrypt.hash(DEMO_PASSWORD, 12),
        timezone: TZ,
        is_active: true,
        token_version: 0,
        created_at: now,
        updated_at: now,
      },
    ]);
    const [[user]] = await queryInterface.sequelize.query('SELECT id FROM users WHERE email = ?', { replacements: [DEMO_EMAIL] });

    await queryInterface.bulkInsert('timetable_settings', [
      {
        user_id: user.id,
        // Disabled so the demo account can be edited at any time; enable it in Profile & Settings.
        editing_enabled: false,
        start_time: '06:00:00',
        end_time: '09:00:00',
        applicable_days: JSON.stringify([1, 2, 3, 4, 5, 6, 7]),
        created_at: now,
        updated_at: now,
      },
    ]);

    await queryInterface.bulkInsert('notification_settings', [
      {
        user_id: user.id,
        whatsapp_enabled: false,
        whatsapp_opt_in: false,
        whatsapp_task_start: true,
        whatsapp_advance_reminder: true,
        whatsapp_update_notification: true,
        whatsapp_deletion_notification: true,
        whatsapp_daily_summary: false,
        email_enabled: true,
        email_task_start: true,
        email_advance_reminder: true,
        email_update_notification: true,
        email_deletion_notification: true,
        email_daily_summary: true,
        incomplete_reminder: false,
        reminder_minutes: 10,
        daily_summary_time: '07:00:00',
        quiet_hours_enabled: false,
        notification_sound: true,
        created_at: now,
        updated_at: now,
      },
    ]);

    // Today plus the three previous days (the past days give the statistics something to show).
    for (let offset = -3; offset <= 0; offset += 1) {
      const date = DateTime.fromISO(today).plus({ days: offset }).toISODate();
      await queryInterface.bulkInsert('timetables', [
        {
          user_id: user.id,
          title: offset === 0 ? 'My Daily Routine' : `Routine - ${DateTime.fromISO(date).toFormat('ccc d LLL')}`,
          schedule_date: date,
          status: offset < 0 ? 'ARCHIVED' : 'ACTIVE',
          created_at: now,
          updated_at: now,
        },
      ]);
      const [[timetable]] = await queryInterface.sequelize.query(
        'SELECT id FROM timetables WHERE user_id = ? AND schedule_date = ?',
        { replacements: [user.id, date] }
      );

      const rows = DAY_PLAN.map(([title, description, start, end, category, priority], i) => {
        const startAt = utc(date, start);
        const endAt = utc(date, end);
        let status = autoStatus(startAt, endAt, now);
        // Past days: mostly completed, a few missed / skipped.
        if (offset < 0) status = (i + offset) % 4 === 0 ? 'MISSED' : (i + offset) % 7 === 0 ? 'SKIPPED' : 'COMPLETED';
        return {
          timetable_id: timetable.id,
          user_id: user.id,
          title,
          description,
          schedule_date: date,
          start_time: `${start}:00`,
          end_time: `${end}:00`,
          start_at_utc: startAt,
          end_at_utc: endAt,
          category,
          priority,
          status,
          repeat_type: 'NONE',
          allow_overlap: false,
          reminder_enabled: true,
          whatsapp_reminder: true,
          email_reminder: true,
          schedule_version: 1,
          completed_at: status === 'COMPLETED' ? endAt : null,
          created_at: now,
          updated_at: now,
        };
      });
      await queryInterface.bulkInsert('tasks', rows);
    }
  },

  async down(queryInterface) {
    // ON DELETE CASCADE removes settings, timetables, tasks and notification logs.
    await queryInterface.bulkDelete('users', { email: DEMO_EMAIL });
  },
};
