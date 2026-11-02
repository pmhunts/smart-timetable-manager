import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Mail, Phone, User } from 'lucide-react';
import Input from '../../components/ui/Input.jsx';
import Select from '../../components/ui/Select.jsx';
import Button from '../../components/ui/Button.jsx';
import PasswordInput from '../../components/PasswordInput.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import { COUNTRY_CODES } from '../../utils/constants.js';
import { browserTimezone } from '../../utils/date.js';
import { getErrorCode, getErrorMessage, getFieldErrors } from '../../utils/errors.js';
import { EMAIL_RE, passwordError, phoneError } from '../../utils/validation.js';

const guessCountryCode = () => (browserTimezone() === 'Asia/Kolkata' || browserTimezone() === 'Asia/Calcutta' ? '+91' : '+1');

export default function Register() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: '',
    email: '',
    countryCode: guessCountryCode(),
    phoneNumber: '',
    password: '',
    confirmPassword: '',
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const validate = () => {
    const next = {};
    if (form.name.trim().length < 2) next.name = 'Please enter your full name';
    if (!EMAIL_RE.test(form.email.trim())) next.email = 'Enter a valid email address';
    const pe = phoneError(form.phoneNumber.trim());
    if (pe) next.phoneNumber = pe;
    const pwe = passwordError(form.password);
    if (pwe) next.password = pwe;
    if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    return next;
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;

    setSubmitting(true);
    try {
      const user = await register({
        name: form.name.trim(),
        email: form.email.trim(),
        countryCode: form.countryCode,
        phoneNumber: form.phoneNumber.trim(),
        password: form.password,
        confirmPassword: form.confirmPassword,
        timezone: browserTimezone(),
      });
      toast.success(`Welcome aboard, ${user.name.split(' ')[0]}!`);
      navigate('/dashboard', { replace: true });
    } catch (err) {
      const fieldErrors = getFieldErrors(err);
      if (getErrorCode(err) === 'EMAIL_TAKEN') fieldErrors.email = 'This email is already registered';
      setErrors(fieldErrors);
      toast.error(getErrorMessage(err, 'Registration failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Create your account</h1>
      <p className="mt-1 text-sm text-zinc-500">Start planning smarter days in under a minute.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4" noValidate>
        <Input label="Full name" icon={User} autoComplete="name" placeholder="Piyush Sharma" value={form.name} onChange={set('name')} error={errors.name} autoFocus />
        <Input label="Email address" type="email" icon={Mail} autoComplete="email" placeholder="you@example.com" value={form.email} onChange={set('email')} error={errors.email} />
        <div>
          <span className="label">Mobile number (WhatsApp)</span>
          <div className="flex gap-2">
            <Select
              className="w-32 shrink-0"
              value={form.countryCode}
              onChange={set('countryCode')}
              options={COUNTRY_CODES.map((c) => ({ value: c.code, label: c.code }))}
              aria-label="Country code"
              error={errors.countryCode}
            />
            <Input
              className="flex-1"
              type="tel"
              inputMode="numeric"
              icon={Phone}
              autoComplete="tel-national"
              placeholder="9876543210"
              value={form.phoneNumber}
              onChange={(e) => setForm((f) => ({ ...f, phoneNumber: e.target.value.replace(/[^\d]/g, '') }))}
              error={errors.phoneNumber}
            />
          </div>
        </div>
        <PasswordInput label="Password" autoComplete="new-password" placeholder="At least 8 characters" value={form.password} onChange={set('password')} error={errors.password} hint="Min 8 characters with a letter and a number." />
        <PasswordInput label="Confirm password" autoComplete="new-password" placeholder="Repeat password" value={form.confirmPassword} onChange={set('confirmPassword')} error={errors.confirmPassword} />
        <Button type="submit" size="lg" className="w-full" loading={submitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-zinc-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-accent-600 hover:underline dark:text-accent-400">
          Sign in
        </Link>
      </p>
    </div>
  );
}
