import cn from '../utils/cn.js';

export default function Avatar({ user, size = 'md', className }) {
  const dims = { sm: 'h-7 w-7 text-xs', md: 'h-9 w-9 text-sm', lg: 'h-20 w-20 text-2xl' }[size];
  const initials = (user?.name || '?')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0].toUpperCase())
    .join('');

  if (user?.profileImage) {
    return <img src={user.profileImage} alt={user.name} className={cn('shrink-0 rounded-full object-cover', dims, className)} />;
  }
  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-400 to-violet-500 font-semibold text-white',
        dims,
        className
      )}
    >
      {initials}
    </div>
  );
}
