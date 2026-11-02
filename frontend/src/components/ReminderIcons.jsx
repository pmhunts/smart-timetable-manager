import { BellOff, Mail, MessageCircle, Repeat } from 'lucide-react';
import cn from '../utils/cn.js';

export default function ReminderIcons({ task, className }) {
  const on = task.reminderEnabled !== false;
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-zinc-400', className)}>
      {!on ? (
        <BellOff className="h-3.5 w-3.5" title="Reminders off" />
      ) : (
        <>
          <MessageCircle className={cn('h-3.5 w-3.5', task.whatsappReminder ? 'text-emerald-500' : 'opacity-30')} title={`WhatsApp ${task.whatsappReminder ? 'on' : 'off'}`} />
          <Mail className={cn('h-3.5 w-3.5', task.emailReminder ? 'text-sky-500' : 'opacity-30')} title={`Email ${task.emailReminder ? 'on' : 'off'}`} />
        </>
      )}
      {(task.repeatType && task.repeatType !== 'NONE') || task.sourceTaskId ? (
        <Repeat className="h-3.5 w-3.5 text-accent-500" title="Recurring" />
      ) : null}
    </span>
  );
}
