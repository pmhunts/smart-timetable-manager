import { useEffect, useMemo, useRef, useState } from 'react';
import toast from 'react-hot-toast';
import { Camera, Globe, Mail, Phone, Trash2, User } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Input from '../ui/Input.jsx';
import Select from '../ui/Select.jsx';
import Button from '../ui/Button.jsx';
import Avatar from '../Avatar.jsx';
import { userService } from '../../services/userService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { useEditingWindow } from '../../context/EditingWindowContext.jsx';
import { COUNTRY_CODES, getTimezones } from '../../utils/constants.js';
import { browserTimezone } from '../../utils/date.js';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { EMAIL_RE, phoneError } from '../../utils/validation.js';

const MAX_AVATAR = 2 * 1024 * 1024;

export default function ProfileForm() {
  const { user, setUser } = useAuth();
  const { refresh: refreshWindow } = useEditingWindow();
  const fileRef = useRef(null);
  const timezones = useMemo(getTimezones, []);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || '',
        email: user.email || '',
        countryCode: user.countryCode || '+91',
        phoneNumber: user.phoneNumber || '',
        timezone: user.timezone || browserTimezone(),
      });
    }
  }, [user]);

  if (!form) return null;

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const countryOptions = COUNTRY_CODES.some((c) => c.code === form.countryCode)
    ? COUNTRY_CODES
    : [{ code: form.countryCode, label: form.countryCode }, ...COUNTRY_CODES];
  const tzOptions = timezones.includes(form.timezone) ? timezones : [form.timezone, ...timezones];

  const save = async (e) => {
    e.preventDefault();
    const v = {};
    if (form.name.trim().length < 2) v.name = 'Please enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) v.email = 'Enter a valid email';
    const pe = phoneError(form.phoneNumber.trim());
    if (pe) v.phoneNumber = pe;
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    try {
      const tzChanged = form.timezone !== user.timezone;
      const data = await userService.updateProfile({
        name: form.name.trim(),
        email: form.email.trim(),
        countryCode: form.countryCode,
        phoneNumber: form.phoneNumber.trim(),
        timezone: form.timezone,
      });
      setUser(data.user);
      if (tzChanged) refreshWindow();
      toast.success(tzChanged ? 'Profile saved — upcoming reminders were rescheduled for your new timezone' : 'Profile saved');
    } catch (err) {
      const fe = getFieldErrors(err);
      if (getErrorCode(err) === 'EMAIL_TAKEN') fe.email = 'This email is already in use';
      setErrors(fe);
      toast.error(getErrorMessage(err, 'Could not save profile'));
    } finally {
      setSaving(false);
    }
  };

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) {
      toast.error('Use a PNG, JPG or WebP image');
      return;
    }
    if (file.size > MAX_AVATAR) {
      toast.error('Image must be 2 MB or smaller');
      return;
    }
    setUploading(true);
    try {
      const data = await userService.uploadAvatar(file);
      setUser(data.user);
      toast.success('Profile picture updated');
    } catch (err) {
      toast.error(getErrorMessage(err, 'Upload failed'));
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    setUploading(true);
    try {
      const data = await userService.removeAvatar();
      setUser(data.user);
      toast.success('Profile picture removed');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card title="Profile" description="Your contact details are used to deliver reminders." icon={User}>
      <div className="mb-6 flex items-center gap-4">
        <Avatar user={user} size="lg" />
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2">
            <Button variant="secondary" size="sm" icon={Camera} loading={uploading} onClick={() => fileRef.current?.click()}>
              {user.profileImage ? 'Change photo' : 'Upload photo'}
            </Button>
            {user.profileImage && (
              <Button variant="ghost" size="sm" icon={Trash2} onClick={removeAvatar} disabled={uploading}>
                Remove
              </Button>
            )}
          </div>
          <p className="text-xs text-zinc-500">PNG, JPG or WebP · up to 2 MB</p>
          <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={onFile} />
        </div>
      </div>

      <form onSubmit={save} className="grid gap-4 sm:grid-cols-2" noValidate>
        <Input label="Full name" icon={User} value={form.name} onChange={set('name')} error={errors.name} />
        <Input label="Email address" type="email" icon={Mail} value={form.email} onChange={set('email')} error={errors.email} />
        <div className="sm:col-span-2">
          <span className="label">WhatsApp / mobile number</span>
          <div className="flex gap-2">
            <Select
              className="w-36 shrink-0"
              aria-label="Country code"
              value={form.countryCode}
              onChange={set('countryCode')}
              options={countryOptions.map((c) => ({ value: c.code, label: c.label }))}
            />
            <Input
              className="flex-1"
              type="tel"
              inputMode="numeric"
              icon={Phone}
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/[^\d]/g, '') }))}
              error={errors.phoneNumber}
            />
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            WhatsApp messages are sent to <span className="font-mono">{form.countryCode}{form.phoneNumber || '…'}</span>
          </p>
        </div>
        <div className="sm:col-span-2">
          <Select label="Time zone" value={form.timezone} onChange={set('timezone')} options={tzOptions} error={errors.timezone} />
          <div className="mt-1 flex items-center gap-1.5 text-xs text-zinc-500">
            <Globe className="h-3.5 w-3.5" />
            Your browser is in {browserTimezone()}.
            {browserTimezone() !== form.timezone && (
              <button type="button" className="font-medium text-accent-600 hover:underline" onClick={() => setForm((f) => ({ ...f, timezone: browserTimezone() }))}>
                Use it
              </button>
            )}
          </div>
        </div>
        <div className="flex justify-end sm:col-span-2">
          <Button type="submit" loading={saving}>
            Save profile
          </Button>
        </div>
      </form>
    </Card>
  );
}
