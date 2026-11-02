import { Bell, Layers, Mail, MessageCircle } from 'lucide-react';
import Input from './ui/Input.jsx';
import Select from './ui/Select.jsx';
import Textarea from './ui/Textarea.jsx';
import Toggle from './ui/Toggle.jsx';
import WeekdayPicker from './WeekdayPicker.jsx';
import { CATEGORIES, PRIORITIES, REPEAT_TYPES } from '../utils/constants.js';

/**
 * All editable fields of a task. Controlled: `value` + `onChange(patch)`.
 * `showDate` adds a schedule date input (single-task forms).
 */
export default function TaskFields({ value, onChange, errors = {}, showDate = false, minDate, disabled = false }) {
  const set = (key) => (e) => onChange({ [key]: e?.target ? e.target.value : e });
  const categoryOptions = CATEGORIES.includes(value.category) || !value.category ? CATEGORIES : [value.category, ...CATEGORIES];

  return (
    <div className="space-y-4">
      <Input label="Task title" placeholder="e.g. Morning Exercise" value={value.title} onChange={set('title')} error={errors.title} disabled={disabled} maxLength={255} />
      <Textarea label="Description" placeholder="Optional details" rows={2} value={value.description} onChange={set('description')} error={errors.description} disabled={disabled} />

      <div className={showDate ? 'grid grid-cols-2 gap-3 sm:grid-cols-3' : 'grid grid-cols-2 gap-3'}>
        {showDate && (
          <Input label="Date" type="date" className="col-span-2 sm:col-span-1" min={minDate} value={value.scheduleDate || ''} onChange={set('scheduleDate')} error={errors.scheduleDate} disabled={disabled} />
        )}
        <Input label="Start time" type="time" value={value.startTime} onChange={set('startTime')} error={errors.startTime} disabled={disabled} />
        <Input label="End time" type="time" value={value.endTime} onChange={set('endTime')} error={errors.endTime} disabled={disabled} />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" value={value.category} onChange={set('category')} options={categoryOptions} disabled={disabled} />
        <Select
          label="Priority"
          value={value.priority}
          onChange={set('priority')}
          options={PRIORITIES.map((p) => ({ value: p, label: p.charAt(0) + p.slice(1).toLowerCase() }))}
          disabled={disabled}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Repeat" value={value.repeatType} onChange={set('repeatType')} options={REPEAT_TYPES} disabled={disabled} />
        {value.repeatType !== 'NONE' && (
          <Input label="Repeat until (optional)" type="date" min={value.scheduleDate || minDate} value={value.repeatUntil || ''} onChange={set('repeatUntil')} disabled={disabled} />
        )}
      </div>
      {value.repeatType === 'CUSTOM' && (
        <div>
          <span className="label">Repeat on</span>
          <WeekdayPicker value={value.repeatDays || []} onChange={(days) => onChange({ repeatDays: days })} error={errors.repeatDays} disabled={disabled} />
        </div>
      )}

      <div className="rounded-xl border border-zinc-200 px-4 py-1 dark:border-zinc-800">
        <Toggle size="sm" icon={Bell} label="Reminders" description="Notify me before and when this task starts" checked={value.reminderEnabled} onChange={(v) => onChange({ reminderEnabled: v })} disabled={disabled} />
        <div className="ml-7 border-l border-zinc-200 pl-3 dark:border-zinc-800">
          <Toggle size="sm" icon={MessageCircle} label="WhatsApp" checked={value.whatsappReminder} onChange={(v) => onChange({ whatsappReminder: v })} disabled={disabled || !value.reminderEnabled} />
          <Toggle size="sm" icon={Mail} label="Email" checked={value.emailReminder} onChange={(v) => onChange({ emailReminder: v })} disabled={disabled || !value.reminderEnabled} />
        </div>
        <div className="border-t border-zinc-100 dark:border-zinc-800">
          <Toggle size="sm" icon={Layers} label="Allow overlap" description="Let this task share time with other tasks" checked={value.allowOverlap} onChange={(v) => onChange({ allowOverlap: v })} disabled={disabled} />
        </div>
      </div>
    </div>
  );
}
