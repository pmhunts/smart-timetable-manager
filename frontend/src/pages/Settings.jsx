import { TimerReset } from 'lucide-react';
import Card from '../components/ui/Card.jsx';
import ProfileForm from '../components/settings/ProfileForm.jsx';
import PasswordForm from '../components/settings/PasswordForm.jsx';
import EditingWindowForm from '../components/EditingWindowForm.jsx';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="page-title">Profile &amp; Settings</h2>
        <p className="text-sm text-zinc-500">Manage your account, contact details and timetable editing window.</p>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <div className="space-y-6 xl:col-span-3">
          <ProfileForm />
          <PasswordForm />
        </div>
        <div className="xl:col-span-2">
          <Card
            title="Timetable Configuration Window"
            description="Choose when your timetable can be created, edited or deleted. Outside the window it is locked (read-only)."
            icon={TimerReset}
            className="xl:sticky xl:top-20"
          >
            <EditingWindowForm />
          </Card>
        </div>
      </div>
    </div>
  );
}
