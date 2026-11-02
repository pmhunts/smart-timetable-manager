/** Joins truthy class names. */
export default function cn(...classes) {
  return classes.flat().filter(Boolean).join(' ');
}
