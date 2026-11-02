import { useState } from 'react';
import toast from 'react-hot-toast';
import { KeyRound } from 'lucide-react';
import Card from '../ui/Card.jsx';
import Button from '../ui/Button.jsx';
import PasswordInput from '../PasswordInput.jsx';
import { userService } from '../../services/userService.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { passwordError } from '../../utils/validation.js';

const EMPTY = { currentPassword: '', newPassword: '', confirmPassword: '' };

export default function PasswordForm() {
  const [form, setForm] = useState(EMPTY);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    const v = {};
    if (!form.currentPassword) v.currentPassword = 'Enter your current password';
    const pe = passwordError(form.newPassword);
    if (pe) v.newPassword = pe;
    else if (form.newPassword === form.currentPassword) v.newPassword = 'New password must differ from the current one';
    if (form.newPassword !== form.confirmPassword) v.confirmPassword = 'Passwords do not match';
    setErrors(v);
    if (Object.keys(v).length) return;

    setSaving(true);
    try {
      await userService.changePassword(form);
      setForm(EMPTY);
      toast.success('Password changed');
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'Could not change password'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card title="Password" description="Use at least 8 characters with a letter and a number." icon={KeyRound}>
      <form onSubmit={submit} className="space-y-4" noValidate>
        <PasswordInput label="Current password" autoComplete="current-password" value={form.currentPassword} onChange={set('currentPassword')} error={errors.currentPassword} />
        <div className="grid gap-4 sm:grid-cols-2">
          <PasswordInput label="New password" autoComplete="new-password" value={form.newPassword} onChange={set('newPassword')} error={errors.newPassword} />
          <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        </div>
        <div className="flex justify-end">
          <Button type="submit" loading={saving}>
            Update password
          </Button>
        </div>
      </form>
    </Card>
  );
}
