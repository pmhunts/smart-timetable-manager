import { Link, useLocation } from 'react-router-dom';
import { Menu, Moon, Sun } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useTheme } from '../context/ThemeContext.jsx';
import useClock from '../hooks/useClock.js';
import useUserTimezone from '../hooks/useUserTimezone.js';
import Avatar from './Avatar.jsx';
import { PAGE_TITLES } from './Sidebar.jsx';

function titleFor(pathname) {
  const exact = PAGE_TITLES.find(([p]) => p === pathname);
  if (exact) return exact[1];
  const prefix = PAGE_TITLES.find(([p]) => p.endsWith('/') && pathname.startsWith(p));
  return prefix ? prefix[1] : 'Smart Timetable';
}

export default function Topbar({ onMenu }) {
  const { user } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const { tz } = useUserTimezone();
  const now = useClock(1000);
  const { pathname } = useLocation();

  const time = now.toLocaleTimeString('en-US', { timeZone: tz, hour: 'numeric', minute: '2-digit', second: '2-digit' });
  const date = now.toLocaleDateString('en-US', { timeZone: tz, weekday: 'short', month: 'short', day: 'numeric' });

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center gap-3 border-b border-zinc-200 bg-white/80 px-4 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80 sm:px-6">
      <button
        className="rounded-lg p-2 text-zinc-600 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800 lg:hidden"
        onClick={onMenu}
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>
      <h1 className="min-w-0 flex-1 truncate text-base font-semibold tracking-tight">{titleFor(pathname)}</h1>

      <div className="hidden text-right sm:block">
        <p className="font-mono text-sm font-medium tabular-nums text-zinc-800 dark:text-zinc-200">{time}</p>
        <p className="text-[11px] text-zinc-500">
          {date} · {tz}
        </p>
      </div>

      <button
        onClick={toggleTheme}
        className="rounded-lg p-2 text-zinc-500 transition hover:bg-zinc-100 hover:text-zinc-900 dark:hover:bg-zinc-800 dark:hover:text-zinc-100"
        aria-label="Toggle theme"
        title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      <Link to="/settings" className="flex items-center gap-2 rounded-lg p-1 transition hover:bg-zinc-100 dark:hover:bg-zinc-800">
        <Avatar user={user} size="sm" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium md:block">{user?.name}</span>
      </Link>
    </header>
  );
}
