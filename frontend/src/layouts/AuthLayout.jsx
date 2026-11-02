import { Outlet } from 'react-router-dom';
import { Bell, CalendarCheck2, Lock, Mail, MessageCircle, Moon, Sun } from 'lucide-react';
import Logo from '../components/Logo.jsx';
import { useTheme } from '../context/ThemeContext.jsx';

const FEATURES = [
  { icon: CalendarCheck2, title: 'Plan your day', text: 'Build a timetable with categories, priorities and recurring routines.' },
  { icon: Lock, title: 'Commit to it', text: 'A configurable editing window locks your schedule so you stick to the plan.' },
  { icon: MessageCircle, title: 'WhatsApp reminders', text: 'Get nudged on WhatsApp right when each activity starts.' },
  { icon: Mail, title: 'Email summaries', text: 'Daily digests and change alerts delivered to your inbox.' },
];

export default function AuthLayout() {
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative flex flex-col px-4 py-6 sm:px-10">
        <div className="flex items-center justify-between">
          <Logo />
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
            aria-label="Toggle theme"
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
          </button>
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-sm animate-fade-in">
            <Outlet />
          </div>
        </div>
        <p className="text-center text-xs text-zinc-400">© {new Date().getFullYear()} Smart Timetable Manager</p>
      </div>

      <div className="relative hidden overflow-hidden bg-zinc-900 lg:block">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,.35),transparent_55%),radial-gradient(ellipse_at_bottom_left,rgba(139,92,246,.25),transparent_50%)]" />
        <div className="relative flex h-full flex-col justify-center px-14 text-white">
          <div className="mb-3 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300">
            <Bell className="h-3.5 w-3.5" /> Automated reminders, on time
          </div>
          <h2 className="max-w-md text-3xl font-semibold leading-tight tracking-tight">
            Your day, planned once and followed through.
          </h2>
          <div className="mt-10 grid max-w-lg gap-5">
            {FEATURES.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex gap-4">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
                  <Icon className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-sm font-medium">{title}</p>
                  <p className="text-sm text-zinc-400">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
