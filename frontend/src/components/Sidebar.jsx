import { NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import {
  Bell,
  CalendarDays,
  CalendarRange,
  History,
  LayoutDashboard,
  ListChecks,
  Lock,
  LogOut,
  PlusSquare,
  Settings,
  Table2,
  Unlock,
  X,
} from 'lucide-react';
import Logo from './Logo.jsx';
import cn from '../utils/cn.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useEditingWindow } from '../context/EditingWindowContext.jsx';

export const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/timetable', label: 'My Timetable', icon: Table2, end: true },
  { to: '/calendar', label: 'Calendar', icon: CalendarRange },
  { to: '/timetable/new', label: 'Create Timetable', icon: PlusSquare },
  { to: '/tasks', label: 'Tasks', icon: ListChecks },
  { to: '/notifications', label: 'Notification Center', icon: Bell, end: true },
  { to: '/notifications/history', label: 'Notification History', icon: History },
  { to: '/settings', label: 'Profile & Settings', icon: Settings },
];

export default function Sidebar({ open, onClose }) {
  const { logout } = useAuth();
  const { state } = useEditingWindow();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    toast.success('Signed out');
    navigate('/login', { replace: true });
  };

  return (
    <>
      {/* Mobile backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-30 bg-zinc-950/40 transition-opacity lg:hidden',
          open ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
        onClick={onClose}
      />
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-40 flex w-64 flex-col border-r border-zinc-200 bg-white transition-transform duration-200',
          'dark:border-zinc-800 dark:bg-zinc-900 lg:translate-x-0',
          open ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        <div className="flex h-16 items-center justify-between px-4">
          <Logo />
          <button
            className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800 lg:hidden"
            onClick={onClose}
            aria-label="Close menu"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="scrollbar-thin flex-1 space-y-0.5 overflow-y-auto px-3 py-2">
          {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              onClick={onClose}
              className={({ isActive }) =>
                cn(
                  'group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-accent-50 text-accent-700 dark:bg-accent-500/10 dark:text-accent-300'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-zinc-100'
                )
              }
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </NavLink>
          ))}
        </nav>

        <div className="space-y-2 border-t border-zinc-200 p-3 dark:border-zinc-800">
          {state && (
            <div
              className={cn(
                'flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium',
                state.isLocked
                  ? 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300'
                  : 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300'
              )}
            >
              {state.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
              Timetable {state.isLocked ? 'locked' : state.enabled ? 'editable now' : 'always editable'}
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-zinc-600 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-zinc-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </button>
        </div>
      </aside>
    </>
  );
}

export const PAGE_TITLES = [
  ['/timetable/new', 'Create Timetable', PlusSquare],
  ['/timetable/', 'Timetable', CalendarDays],
  ...NAV_ITEMS.map((n) => [n.to, n.label, n.icon]),
];
