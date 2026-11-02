import { BellRing, CalendarClock, FilePenLine, Newspaper, Send, Trash2 } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Toggle from '../ui/Toggle.jsx';
import Button from '../ui/Button.jsx';
import Badge from '../ui/Badge.jsx';

/**
 * One channel (WhatsApp or Email) with its master switch and per-event switches.
 * `prefix` is 'whatsapp' or 'email' — keys follow NotificationSettings naming.
 */
export default function ChannelCard({ title, icon, prefix, settings, onToggle, masterDisabled, masterHint, children, onTest, testing, accent }) {
  const enabled = Boolean(settings[`${prefix}Enabled`]);
  const sub = [
    { key: `${prefix}TaskStart`, label: 'Task start reminders', description: 'When a task’s scheduled time arrives', icon: BellRing },
    { key: `${prefix}AdvanceReminder`, label: 'Advance reminders', description: `${settings.reminderMinutes} minutes before a task starts`, icon: CalendarClock },
    { key: `${prefix}UpdateNotification`, label: 'Timetable update notifications', description: 'When a task’s time, date or title changes', icon: FilePenLine },
    { key: `${prefix}DeletionNotification`, label: 'Timetable deletion notifications', description: 'When a task or timetable is deleted', icon: Trash2 },
    { key: `${prefix}DailySummary`, label: 'Daily summary', description: `Your day’s plan at ${settings.dailySummaryTime || '—'}`, icon: Newspaper },
  ];

  return (
    <Card
      title={title}
      icon={icon}
      actions={
        <Badge color={enabled ? 'green' : 'zinc'} dot>
          {enabled ? 'Active' : 'Off'}
        </Badge>
      }
    >
      {children}
      <div className={`rounded-xl border px-4 py-1 ${enabled ? accent : 'border-zinc-200 dark:border-zinc-800'}`}>
        <Toggle
          label={`Enable ${title} notifications`}
          description={masterHint}
          checked={enabled}
          onChange={(v) => onToggle({ [`${prefix}Enabled`]: v })}
          disabled={masterDisabled}
        />
      </div>
      <div className="mt-2 divide-y divide-zinc-100 dark:divide-zinc-800">
        {sub.map((s) => (
          <Toggle
            key={s.key}
            size="sm"
            icon={s.icon}
            label={s.label}
            description={s.description}
            checked={Boolean(settings[s.key])}
            onChange={(v) => onToggle({ [s.key]: v })}
            disabled={!enabled}
          />
        ))}
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="secondary" size="sm" icon={Send} onClick={onTest} loading={testing} disabled={!enabled}>
          Send test {title === 'Email' ? 'email' : 'WhatsApp'}
        </Button>
      </div>
    </Card>
  );
}
