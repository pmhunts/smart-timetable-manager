import { Link } from 'react-router-dom';
import { AlertCircle, ArrowRight, BellRing, Clock3, Mail, MessageCircle } from 'lucide-react';
import Card from './ui/Card.jsx';
import Badge from './ui/Badge.jsx';

function ChannelRow({ icon: Icon, name, enabled, configured, extra }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-zinc-50 px-3 py-2.5 dark:bg-zinc-800/50">
      <div className="flex items-center gap-2.5">
        <Icon className="h-4 w-4 text-zinc-500" />
        <div>
          <p className="text-sm font-medium">{name}</p>
          <p className="text-[11px] text-zinc-500">{configured ? 'Provider configured' : 'Provider not configured (mock/dev mode)'}</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {extra}
        <Badge color={enabled ? 'green' : 'zinc'} dot>
          {enabled ? 'On' : 'Off'}
        </Badge>
      </div>
    </div>
  );
}

export default function NotificationStatusCard({ notifications, loading }) {
  return (
    <Card
      title="Notification Status"
      icon={BellRing}
      actions={
        <Link to="/notifications" className="inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline dark:text-accent-400">
          Manage <ArrowRight className="h-3 w-3" />
        </Link>
      }
    >
      {loading || !notifications ? (
        <div className="space-y-2">
          <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
          <div className="h-12 animate-pulse rounded-lg bg-zinc-100 dark:bg-zinc-800" />
        </div>
      ) : (
        <div className="space-y-2">
          <ChannelRow
            icon={MessageCircle}
            name="WhatsApp"
            enabled={notifications.whatsappEnabled && notifications.whatsappOptIn}
            configured={notifications.whatsappConfigured}
            extra={!notifications.whatsappOptIn && <Badge color="amber">No consent</Badge>}
          />
          <ChannelRow icon={Mail} name="Email" enabled={notifications.emailEnabled} configured={notifications.emailConfigured} />
          <div className="flex items-center justify-between pt-1 text-xs text-zinc-500">
            <span className="inline-flex items-center gap-1.5">
              <Clock3 className="h-3.5 w-3.5" /> {notifications.pendingCount ?? 0} scheduled
            </span>
            <Link
              to="/notifications/history?status=FAILED"
              className={`inline-flex items-center gap-1.5 ${notifications.failedToday ? 'font-medium text-rose-600 hover:underline' : ''}`}
            >
              <AlertCircle className="h-3.5 w-3.5" /> {notifications.failedToday ?? 0} failed today
            </Link>
          </div>
        </div>
      )}
    </Card>
  );
}
