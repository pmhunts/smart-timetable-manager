import { useAuth } from '../context/AuthContext.jsx';
import { browserTimezone, todayInTz } from '../utils/date.js';

/** The signed-in user's timezone and today's date in it. */
export default function useUserTimezone() {
  const { user } = useAuth();
  const tz = user?.timezone || browserTimezone();
  return { tz, today: todayInTz(tz) };
}
