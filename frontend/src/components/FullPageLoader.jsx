import Logo from './Logo.jsx';

export default function FullPageLoader() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Logo className="animate-pulse" />
      <div className="h-1 w-32 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div className="h-full w-1/2 animate-[pulse_1s_ease-in-out_infinite] rounded-full bg-accent-500" />
      </div>
    </div>
  );
}
