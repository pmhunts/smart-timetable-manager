import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { AlarmClockOff, Clock, History, Mail, MessageCircle, MoonStar, ShieldCheck, Volume2 } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import Toggle from '../components/ui/Toggle.jsx';
import Input from '../components/ui/Input.jsx';
import Checkbox from '../components/ui/Checkbox.jsx';
import Button from '../components/ui/Button.jsx';
import SegmentedControl from '../components/ui/SegmentedControl.jsx';
import Skeleton from '../components/ui/Skeleton.jsx';
import ChannelCard from '../components/notifications/ChannelCard.jsx';
import { settingsService } from '../services/settingsService.js';
import { notificationService } from '../services/notificationService.js';
import { useAuth } from '../context/AuthContext.jsx';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { formatInstant, formatTime12, normalizeTime } from '../utils/date.js';
import { getErrorCode, getErrorMessage } from '../utils/errors.js';
import { playChime } from '../utils/sound.js';

/** Time input that commits on blur / Enter so typing doesn't fire a request per keystroke. */
function CommitTimeInput({ value, onCommit, ...props }) {
  const [draft, setDraft] = useState(normalizeTime(value) || '');
  useEffect(() => setDraft(normalizeTime(value) || ''), [value]);
  const commit = () => {
    if (draft && draft !== normalizeTime(value)) onCommit(draft);
  };
  return (
    <Input
      type="time"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => e.key === 'Enter' && commit()}
      {...props}
    />
  );
}

export default function NotificationCenter() {
  const { user } = useAuth();
  const { tz } = useUserTimezone();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(null);
  const saveSeq = useRef(0);

  useEffect(() => {
    settingsService
      .getNotifications()
      .then(setSettings)
      .catch((err) => toast.error(getErrorMessage(err, 'Could not load notification settings')))
      .finally(() => setLoading(false));
  }, []);

  /** Optimistic update: apply locally, persist, roll back on failure. */
  const update = async (patch, successMsg = 'Preferences saved') => {
    const previous = settings;
    setSettings((s) => ({ ...s, ...patch }));
    const seq = ++saveSeq.current;
    try {
      const saved = await settingsService.updateNotifications(patch);
      if (seq === saveSeq.current) setSettings(saved);
      toast.success(successMsg, { id: 'notif-save' });
    } catch (err) {
      setSettings(previous);
      if (getErrorCode(err) === 'WHATSAPP_CONSENT_REQUIRED') {
        toast.error('Please give consent to receive WhatsApp messages first.', { id: 'notif-save' });
      } else {
        toast.error(getErrorMessage(err, 'Could not save preferences'), { id: 'notif-save' });
      }
    }
  };

  const onConsent = (checked) => {
    if (checked) update({ whatsappOptIn: true }, 'WhatsApp consent recorded');
    else update({ whatsappOptIn: false, whatsappEnabled: false }, 'WhatsApp consent withdrawn');
  };

  const sendTest = async (channel) => {
    setTesting(channel);
    try {
      const log = channel === 'whatsapp' ? await notificationService.testWhatsapp() : await notificationService.testEmail();
      if (log?.deliveryStatus === 'FAILED') toast.error(`Test failed: ${log.errorMessage || 'unknown error'}`);
      else if (log?.deliveryStatus === 'SENT') toast.success(`Test ${channel === 'whatsapp' ? 'WhatsApp message' : 'email'} sent`);
      else toast.success('Test queued — check Notification History for delivery status');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Could not send test'));
    } finally {
      setTesting(null);
    }
  };

  if (loading || !settings) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
        <Skeleton className="h-64 lg:col-span-2" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title">Notification Center</h2>
          <p className="text-sm text-zinc-500">WhatsApp and email work independently. Changes take effect immediately.</p>
        </div>
        <Button to="/notifications/history" variant="secondary" icon={History}>
          Delivery history
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChannelCard
          title="WhatsApp"
          icon={MessageCircle}
          prefix="whatsapp"
          settings={settings}
          onToggle={update}
          masterDisabled={!settings.whatsappEnabled && (!settings.whatsappOptIn || !user?.whatsappNumber)}
          masterHint={user?.whatsappNumber ? `Messages go to ${user.whatsappNumber}` : 'Add a mobile number in Profile & Settings'}
          onTest={() => sendTest('whatsapp')}
          testing={testing === 'whatsapp'}
          accent="border-emerald-200 bg-emerald-50/40 dark:border-emerald-500/20 dark:bg-emerald-500/5"
        >
          <div className="mb-4 rounded-xl border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-800/40">
            <Checkbox
              checked={settings.whatsappOptIn}
              onChange={onConsent}
              label="I agree to receive WhatsApp messages"
              description="Reminders and timetable updates are sent via the official WhatsApp Business (Meta Cloud) API. Reply STOP on WhatsApp at any time to opt out."
            />
            {settings.whatsappOptIn && settings.whatsappOptInAt && (
              <p className="mt-2 flex items-center gap-1.5 pl-6 text-[11px] text-emerald-700 dark:text-emerald-400">
                <ShieldCheck className="h-3.5 w-3.5" /> Consent given {formatInstant(settings.whatsappOptInAt, tz, { year: 'numeric' })}
              </p>
            )}
            {!user?.whatsappNumber && (
              <p className="mt-2 pl-6 text-[11px] text-amber-700 dark:text-amber-400">
                No WhatsApp number on file. <Link to="/settings" className="underline">Add one</Link>.
              </p>
            )}
          </div>
        </ChannelCard>

        <ChannelCard
          title="Email"
          icon={Mail}
          prefix="email"
          settings={settings}
          onToggle={update}
          masterHint={`Emails go to ${user?.email}`}
          onTest={() => sendTest('email')}
          testing={testing === 'email'}
          accent="border-sky-200 bg-sky-50/40 dark:border-sky-500/20 dark:bg-sky-500/5"
        />
      </div>

      <Card title="Timing & delivery" description="Applies to both channels" icon={Clock}>
        <div className="grid gap-x-10 gap-y-6 lg:grid-cols-2">
          <div className="space-y-5">
            <div>
              <span className="label">Reminder before task</span>
              <SegmentedControl
                value={settings.reminderMinutes}
                onChange={(v) => update({ reminderMinutes: v }, `Advance reminders set to ${v} minutes`)}
                options={[5, 10, 15, 30].map((m) => ({ value: m, label: `${m} min` }))}
              />
            </div>
            <CommitTimeInput
              label="Daily summary time"
              className="max-w-[12rem]"
              value={settings.dailySummaryTime}
              onCommit={(v) => update({ dailySummaryTime: v }, `Daily summary at ${formatTime12(v)}`)}
              hint="Sent on channels with Daily summary enabled"
            />
            <Toggle
              icon={AlarmClockOff}
              label="Incomplete task reminder"
              description="Nudge me when a task ends without being completed"
              checked={settings.incompleteReminder}
              onChange={(v) => update({ incompleteReminder: v })}
            />
          </div>

          <div className="space-y-4">
            <Toggle
              icon={MoonStar}
              label="Quiet hours"
              description="Reminders are suppressed and other notifications wait until quiet hours end"
              checked={settings.quietHoursEnabled}
              onChange={(v) =>
                update(
                  v
                    ? { quietHoursEnabled: true, quietHoursStart: normalizeTime(settings.quietHoursStart) || '22:00', quietHoursEnd: normalizeTime(settings.quietHoursEnd) || '06:00' }
                    : { quietHoursEnabled: false }
                )
              }
            />
            {settings.quietHoursEnabled && (
              <div className="grid grid-cols-2 gap-3 pl-7">
                <CommitTimeInput label="From" value={settings.quietHoursStart} onCommit={(v) => update({ quietHoursStart: v })} />
                <CommitTimeInput label="Until" value={settings.quietHoursEnd} onCommit={(v) => update({ quietHoursEnd: v })} />
              </div>
            )}
            <Toggle
              icon={Volume2}
              label="Notification sound"
              description="Play a sound for in-app alerts"
              checked={settings.notificationSound}
              onChange={(v) => {
                if (v) playChime();
                update({ notificationSound: v });
              }}
            />
          </div>
        </div>
      </Card>
    </div>
  );
}
