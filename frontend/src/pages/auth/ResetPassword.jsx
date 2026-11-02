import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { ArrowLeft, ShieldAlert } from 'lucide-react';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';
import { authService } from '../../services/authService.js';
import { getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { passwordError } from '../../utils/validation.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [form, setForm] = useState({ password: '', confirmPassword: '' });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  if (!token) {
    return (
      <div className="text-center">
        <div className="mx-auto mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-600 dark:bg-rose-500/10">
          <ShieldAlert className="h-6 w-6" />
        </div>
        <h1 className="text-2xl font-semibold tracking-tight">Invalid reset link</h1>
        <p className="mt-2 text-sm text-zinc-500">This link is missing its token. Request a new one to continue.</p>
        <Link to="/forgot-password" className="mt-6 inline-block text-sm font-medium text-accent-600 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = {};
    const pwe = passwordError(form.password);
    if (pwe) next.password = pwe;
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      await authService.resetPassword({ token, ...form });
      toast.success('Password updated. Please sign in.');
      navigate('/login', { replace: true });
    } catch (err) {
      setErrors(getFieldErrors(err));
      toast.error(getErrorMessage(err, 'The reset link is invalid or has expired'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Set a new password</h1>
      <p className="mt-1 text-sm text-zinc-500">Choose a strong password you haven&apos;t used before.</p>
      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <PasswordInput label="New password" autoComplete="new-password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} error={errors.password} autoFocus />
        <PasswordInput label="Confirm new password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setForm((f) => ({ ...f, confirmPassword: e.target.value }))} error={errors.confirmPassword} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Reset password
        </Button>
      </form>
      <Link to="/login" className="mt-6 flex items-center justify-center gap-1.5 text-sm font-medium text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200">
        <ArrowLeft className="h-4 w-4" /> Back to sign in
      </Link>
    </div>
  );
}
