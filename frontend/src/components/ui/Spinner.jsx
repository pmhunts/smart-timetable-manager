import { Loader2 } from 'lucide-react';
import cn from '../../utils/cn.js';

export default function Spinner({ className, label }) {
  return (
    <div className="flex items-center justify-center gap-2 py-10 text-sm text-zinc-500">
      <Loader2 className={cn('h-5 w-5 animate-spin text-accent-500', className)} />
      {label}
    </div>
  );
}
