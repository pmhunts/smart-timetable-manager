import Badge from './ui/Badge.jsx';
import { PRIORITY_META, STATUS_META, categoryStyle } from '../utils/constants.js';
import cn from '../utils/cn.js';

export function StatusBadge({ status }) {
  const meta = STATUS_META[status] || STATUS_META.UPCOMING;
  return (
    <Badge color={meta.badge} icon={meta.icon}>
      {meta.label}
    </Badge>
  );
}

export function PriorityBadge({ priority }) {
  const meta = PRIORITY_META[priority] || PRIORITY_META.MEDIUM;
  return <Badge color={meta.badge}>{meta.label}</Badge>;
}

export function CategoryTag({ category, className }) {
  const style = categoryStyle(category);
  const Icon = style.icon;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-medium', style.soft, className)}>
      <Icon className="h-3 w-3" />
      {category || 'Other'}
    </span>
  );
}
