import cn from '../../utils/cn.js';

export default function Skeleton({ className }) {
  return <div className={cn('animate-pulse rounded-lg bg-zinc-200/70 dark:bg-zinc-800', className)} />;
}

export function SkeletonList({ rows = 4, className }) {
  return (
    <div className={cn('space-y-3', className)}>
      {Array.from({ length: rows }, (_, i) => (
        <Skeleton key={i} className="h-16 w-full" />
      ))}
    </div>
  );
}
