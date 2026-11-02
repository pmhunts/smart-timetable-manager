import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ChevronDown, History, Mail, MessageCircle, RefreshCw, Search, X } from 'lucide-react';
import Button from '../components/ui/Button.jsx';
import Input from '../components/ui/Input.jsx';
import Select from '../components/ui/Select.jsx';
import Badge from '../components/ui/Badge.jsx';
import EmptyState from '../components/ui/EmptyState.jsx';
import Pagination from '../components/ui/Pagination.jsx';
import { SkeletonList } from '../components/ui/Skeleton.jsx';
import { notificationService } from '../services/notificationService.js';
import useAsync from '../hooks/useAsync.js';
import useDebounce from '../hooks/useDebounce.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import { DELIVERY_META, EVENT_LABELS } from '../utils/constants.js';
import { formatInstant } from '../utils/date.js';
import cn from '../utils/cn.js';

const TYPE_OPTIONS = [
  { value: '', label: 'All channels' },
  { value: 'WHATSAPP', label: 'WhatsApp' },
  { value: 'EMAIL', label: 'Email' },
];
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'SENT', label: 'Sent' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'CANCELLED', label: 'Cancelled' },
];
const EVENT_OPTIONS = [{ value: '', label: 'All events' }, ...Object.entries(EVENT_LABELS).map(([value, label]) => ({ value, label }))];

function TypeIcon({ type }) {
  const wa = type === 'WHATSAPP';
  const Icon = wa ? MessageCircle : Mail;
  return (
    <span
      className={cn(
        'inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
        wa ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-sky-50 text-sky-600 dark:bg-sky-500/10 dark:text-sky-300'
      )}
      title={wa ? 'WhatsApp' : 'Email'}
    >
      <Icon className="h-4 w-4" />
    </span>
  );
}

function StatusCell({ log }) {
  const meta = DELIVERY_META[log.deliveryStatus] || DELIVERY_META.PENDING;
  return (
    <div className="space-y-0.5">
      <Badge color={meta.badge} dot>
        {meta.label}
      </Badge>
      {log.providerStatus && <p className="text-[11px] capitalize text-zinc-500">{log.providerStatus}</p>}
    </div>
  );
}

function LogRow({ log, tz }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <tr className="cursor-pointer align-top transition hover:bg-zinc-50 dark:hover:bg-zinc-800/40" onClick={() => setOpen((o) => !o)}>
        <td className="py-3 pl-4 pr-2">
          <TypeIcon type={log.notificationType} />
        </td>
        <td className="px-2 py-3">
          <p className="text-sm font-medium">{EVENT_LABELS[log.eventType] || log.eventType}</p>
          <p className="max-w-xs truncate text-xs text-zinc-500">{log.subject || log.message}</p>
        </td>
        <td className="px-2 py-3 text-sm">{log.taskTitle || <span className="text-zinc-400">—</span>}</td>
        <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatInstant(log.scheduledAt, tz)}</td>
        <td className="whitespace-nowrap px-2 py-3 text-sm text-zinc-600 dark:text-zinc-400">{formatInstant(log.sentAt, tz)}</td>
        <td className="px-2 py-3">
          <StatusCell log={log} />
        </td>
        <td className="max-w-[14rem] px-2 py-3 text-xs text-rose-600 dark:text-rose-400">
          <span className="line-clamp-2">{log.errorMessage || ''}</span>
        </td>
        <td className="py-3 pl-2 pr-4">
          <ChevronDown className={cn('h-4 w-4 text-zinc-400 transition-transform', open && 'rotate-180')} />
        </td>
      </tr>
      {open && (
        <tr className="bg-zinc-50/70 dark:bg-zinc-900/60">
          <td colSpan={8} className="px-4 py-3">
            <Details log={log} tz={tz} />
          </td>
        </tr>
      )}
    </>
  );
}

function Details({ log, tz }) {
  return (
    <div className="grid gap-3 text-xs sm:grid-cols-3">
      <div className="sm:col-span-2">
        {log.subject && <p className="mb-1 font-medium text-zinc-700 dark:text-zinc-300">Subject: {log.subject}</p>}
        <pre className="whitespace-pre-wrap break-words rounded-lg bg-white p-3 font-sans text-xs text-zinc-700 ring-1 ring-zinc-200 dark:bg-zinc-950 dark:text-zinc-300 dark:ring-zinc-800">
          {log.message}
        </pre>
      </div>
      <dl className="space-y-1.5 text-zinc-600 dark:text-zinc-400">
        <div>
          <dt className="inline font-medium">Attempts: </dt>
          <dd className="inline">{log.attempts ?? 0}</dd>
        </div>
        <div>
          <dt className="inline font-medium">Created: </dt>
          <dd className="inline">{formatInstant(log.createdAt, tz)}</dd>
        </div>
        {log.providerMessageId && (
          <div>
            <dt className="font-medium">Provider message ID</dt>
            <dd className="break-all font-mono text-[11px]">{log.providerMessageId}</dd>
          </div>
        )}
        {log.errorMessage && (
          <div>
            <dt className="font-medium text-rose-600">Failure reason</dt>
            <dd className="text-rose-600 dark:text-rose-400">{log.errorMessage}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function MobileCard({ log, tz }) {
  const [open, setOpen] = useState(false);
  return (
    <button type="button" onClick={() => setOpen((o) => !o)} className="card w-full p-4 text-left">
      <div className="flex items-start gap-3">
        <TypeIcon type={log.notificationType} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium">{EVENT_LABELS[log.eventType] || log.eventType}</p>
            <StatusCell log={log} />
          </div>
          {log.taskTitle && <p className="text-xs text-zinc-500">Task: {log.taskTitle}</p>}
          <p className="mt-1 text-[11px] text-zinc-500">
            Scheduled {formatInstant(log.scheduledAt, tz)} · Delivered {formatInstant(log.sentAt, tz)}
          </p>
          {!open && <p className="mt-1 line-clamp-2 text-xs text-zinc-600 dark:text-zinc-400">{log.message}</p>}
          {log.errorMessage && !open && <p className="mt-1 line-clamp-1 text-xs text-rose-600">{log.errorMessage}</p>}
        </div>
      </div>
      {open && (
        <div className="mt-3">
          <Details log={log} tz={tz} />
        </div>
      )}
    </button>
  );
}

export default function NotificationHistory() {
  const { tz } = useUserTimezone();
  const [params] = useSearchParams();
  const [filters, setFilters] = useState({
    type: params.get('type') || '',
    status: params.get('status') || '',
    eventType: '',
    from: '',
    to: '',
  });
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search.trim());

  const { data, loading, reload } = useAsync(() => {
    const query = { page, limit: 20, search: debouncedSearch || undefined };
    Object.entries(filters).forEach(([k, v]) => {
      if (v) query[k] = v;
    });
    return notificationService.history(query);
  }, [page, filters, debouncedSearch]);

  const set = (key) => (e) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: e.target.value }));
  };
  const hasFilters = Object.values(filters).some(Boolean) || search;
  const items = data?.items || [];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="page-title">Notification History</h2>
          <p className="text-sm text-zinc-500">Every WhatsApp and email attempt with its delivery status.</p>
        </div>
        <Button variant="secondary" icon={RefreshCw} onClick={() => reload()}>
          Refresh
        </Button>
      </div>

      <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
        <Input label="Search" icon={Search} placeholder="Message or task" value={search} onChange={(e) => { setPage(1); setSearch(e.target.value); }} className="lg:col-span-2" />
        <Select label="Channel" value={filters.type} onChange={set('type')} options={TYPE_OPTIONS} />
        <Select label="Status" value={filters.status} onChange={set('status')} options={STATUS_OPTIONS} />
        <Input label="From" type="date" value={filters.from} onChange={set('from')} />
        <Input label="To" type="date" value={filters.to} min={filters.from || undefined} onChange={set('to')} />
        <Select label="Event" value={filters.eventType} onChange={set('eventType')} options={EVENT_OPTIONS} className="lg:col-span-2" />
        {hasFilters && (
          <div className="flex items-end">
            <Button
              variant="ghost"
              icon={X}
              onClick={() => {
                setPage(1);
                setSearch('');
                setFilters({ type: '', status: '', eventType: '', from: '', to: '' });
              }}
            >
              Clear filters
            </Button>
          </div>
        )}
      </div>

      {loading ? (
        <SkeletonList rows={6} />
      ) : items.length === 0 ? (
        <div className="card">
          <EmptyState
            icon={History}
            title={hasFilters ? 'No notifications match these filters' : 'No notifications yet'}
            description="Reminders and updates you receive will show up here with their delivery status."
          />
        </div>
      ) : (
        <>
          <div className="card hidden overflow-x-auto md:block">
            <table className="w-full min-w-[860px] text-left">
              <thead>
                <tr className="border-b border-zinc-200 text-[11px] uppercase tracking-wide text-zinc-500 dark:border-zinc-800">
                  <th className="py-3 pl-4 pr-2 font-medium">Type</th>
                  <th className="px-2 py-3 font-medium">Event / message</th>
                  <th className="px-2 py-3 font-medium">Related task</th>
                  <th className="px-2 py-3 font-medium">Scheduled</th>
                  <th className="px-2 py-3 font-medium">Delivered</th>
                  <th className="px-2 py-3 font-medium">Status</th>
                  <th className="px-2 py-3 font-medium">Failure reason</th>
                  <th className="py-3 pl-2 pr-4" />
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                {items.map((log) => (
                  <LogRow key={log.id} log={log} tz={tz} />
                ))}
              </tbody>
            </table>
          </div>
          <div className="space-y-3 md:hidden">
            {items.map((log) => (
              <MobileCard key={log.id} log={log} tz={tz} />
            ))}
          </div>
          <Pagination pagination={data?.pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
