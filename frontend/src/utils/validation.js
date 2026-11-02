export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function passwordError(pw) {
  if (!pw) return 'Password is required';
  if (pw.length < 8) return 'Use at least 8 characters';
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) return 'Include at least one letter and one number';
  return null;
}

export function phoneError(phone) {
  if (!phone) return 'Mobile number is required';
  if (!/^\d{6,14}$/.test(phone)) return 'Enter digits only (6–14), without the country code';
  return null;
}
