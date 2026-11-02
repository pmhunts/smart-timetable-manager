import {
  BookOpen,
  Briefcase,
  CheckCircle2,
  CircleDashed,
  Dumbbell,
  GraduationCap,
  HeartPulse,
  Loader,
  SkipForward,
  User,
  Utensils,
  XCircle,
  Tag,
} from 'lucide-react';

export const CATEGORIES = ['Study', 'Work', 'Exercise', 'Personal', 'Reading', 'Health', 'Meal', 'Other'];
export const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH'];
export const REPEAT_TYPES = [
  { value: 'NONE', label: 'Does not repeat' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'WEEKLY', label: 'Weekly (same weekday)' },
  { value: 'CUSTOM', label: 'Custom days' },
];
export const TASK_STATUSES = ['UPCOMING', 'ONGOING', 'COMPLETED', 'SKIPPED', 'MISSED'];

// Tailwind classes must appear as full literals so the JIT compiler keeps them.
const CATEGORY_STYLES = {
  Study: { dot: 'bg-violet-500', soft: 'bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300', bar: 'border-l-violet-500', block: 'bg-violet-100/80 dark:bg-violet-500/15', icon: GraduationCap },
  Work: { dot: 'bg-sky-500', soft: 'bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300', bar: 'border-l-sky-500', block: 'bg-sky-100/80 dark:bg-sky-500/15', icon: Briefcase },
  Exercise: { dot: 'bg-orange-500', soft: 'bg-orange-50 text-orange-700 dark:bg-orange-500/10 dark:text-orange-300', bar: 'border-l-orange-500', block: 'bg-orange-100/80 dark:bg-orange-500/15', icon: Dumbbell },
  Personal: { dot: 'bg-pink-500', soft: 'bg-pink-50 text-pink-700 dark:bg-pink-500/10 dark:text-pink-300', bar: 'border-l-pink-500', block: 'bg-pink-100/80 dark:bg-pink-500/15', icon: User },
  Reading: { dot: 'bg-amber-500', soft: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300', bar: 'border-l-amber-500', block: 'bg-amber-100/80 dark:bg-amber-500/15', icon: BookOpen },
  Health: { dot: 'bg-emerald-500', soft: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300', bar: 'border-l-emerald-500', block: 'bg-emerald-100/80 dark:bg-emerald-500/15', icon: HeartPulse },
  Meal: { dot: 'bg-lime-500', soft: 'bg-lime-50 text-lime-700 dark:bg-lime-500/10 dark:text-lime-300', bar: 'border-l-lime-500', block: 'bg-lime-100/80 dark:bg-lime-500/15', icon: Utensils },
  Other: { dot: 'bg-zinc-400', soft: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-500/10 dark:text-zinc-300', bar: 'border-l-zinc-400', block: 'bg-zinc-100 dark:bg-zinc-500/15', icon: Tag },
};

export function categoryStyle(category) {
  if (!category) return CATEGORY_STYLES.Other;
  const key = Object.keys(CATEGORY_STYLES).find((k) => k.toLowerCase() === String(category).toLowerCase());
  return CATEGORY_STYLES[key] || CATEGORY_STYLES.Other;
}

export const STATUS_META = {
  UPCOMING: { label: 'Upcoming', badge: 'indigo', icon: CircleDashed, ring: 'ring-accent-400', text: 'text-accent-600 dark:text-accent-400' },
  ONGOING: { label: 'Ongoing', badge: 'blue', icon: Loader, ring: 'ring-sky-400', text: 'text-sky-600 dark:text-sky-400' },
  COMPLETED: { label: 'Completed', badge: 'green', icon: CheckCircle2, ring: 'ring-emerald-400', text: 'text-emerald-600 dark:text-emerald-400' },
  SKIPPED: { label: 'Skipped', badge: 'zinc', icon: SkipForward, ring: 'ring-zinc-400', text: 'text-zinc-500' },
  MISSED: { label: 'Missed', badge: 'red', icon: XCircle, ring: 'ring-rose-400', text: 'text-rose-600 dark:text-rose-400' },
};

export const PRIORITY_META = {
  LOW: { label: 'Low', badge: 'zinc' },
  MEDIUM: { label: 'Medium', badge: 'amber' },
  HIGH: { label: 'High', badge: 'red' },
};

export const DELIVERY_META = {
  SENT: { label: 'Sent', badge: 'green' },
  FAILED: { label: 'Failed', badge: 'red' },
  PENDING: { label: 'Pending', badge: 'amber' },
  CANCELLED: { label: 'Cancelled', badge: 'zinc' },
};

export const EVENT_LABELS = {
  ADVANCE_REMINDER: 'Advance reminder',
  TASK_START: 'Task start',
  INCOMPLETE_REMINDER: 'Incomplete reminder',
  TASK_CREATED: 'Task created',
  TASK_UPDATED: 'Task updated',
  TASK_DELETED: 'Task deleted',
  TIMETABLE_CREATED: 'Timetable created',
  TIMETABLE_UPDATED: 'Timetable updated',
  TIMETABLE_DELETED: 'Timetable deleted',
  DAILY_SUMMARY: 'Daily summary',
  TEST: 'Test message',
};

export const COUNTRY_CODES = [
  { code: '+91', label: 'India (+91)' },
  { code: '+1', label: 'US / Canada (+1)' },
  { code: '+44', label: 'United Kingdom (+44)' },
  { code: '+61', label: 'Australia (+61)' },
  { code: '+971', label: 'UAE (+971)' },
  { code: '+966', label: 'Saudi Arabia (+966)' },
  { code: '+65', label: 'Singapore (+65)' },
  { code: '+60', label: 'Malaysia (+60)' },
  { code: '+49', label: 'Germany (+49)' },
  { code: '+33', label: 'France (+33)' },
  { code: '+34', label: 'Spain (+34)' },
  { code: '+39', label: 'Italy (+39)' },
  { code: '+31', label: 'Netherlands (+31)' },
  { code: '+81', label: 'Japan (+81)' },
  { code: '+82', label: 'South Korea (+82)' },
  { code: '+86', label: 'China (+86)' },
  { code: '+62', label: 'Indonesia (+62)' },
  { code: '+63', label: 'Philippines (+63)' },
  { code: '+92', label: 'Pakistan (+92)' },
  { code: '+880', label: 'Bangladesh (+880)' },
  { code: '+94', label: 'Sri Lanka (+94)' },
  { code: '+977', label: 'Nepal (+977)' },
  { code: '+234', label: 'Nigeria (+234)' },
  { code: '+27', label: 'South Africa (+27)' },
  { code: '+254', label: 'Kenya (+254)' },
  { code: '+55', label: 'Brazil (+55)' },
  { code: '+52', label: 'Mexico (+52)' },
];

const FALLBACK_TIMEZONES = [
  'UTC', 'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore', 'Asia/Tokyo', 'Asia/Shanghai', 'Asia/Karachi',
  'Asia/Dhaka', 'Asia/Jakarta', 'Europe/London', 'Europe/Berlin', 'Europe/Paris', 'Europe/Madrid',
  'Africa/Lagos', 'Africa/Johannesburg', 'America/New_York', 'America/Chicago', 'America/Denver',
  'America/Los_Angeles', 'America/Sao_Paulo', 'Australia/Sydney', 'Pacific/Auckland',
];

export function getTimezones() {
  try {
    if (typeof Intl.supportedValuesOf === 'function') {
      const list = Intl.supportedValuesOf('timeZone');
      return list.includes('UTC') ? list : ['UTC', ...list];
    }
  } catch {
    /* ignore */
  }
  return FALLBACK_TIMEZONES;
}
