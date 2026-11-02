import { Compass, Home } from 'lucide-react';
import EmptyState from '../components/ui/EmptyState.jsx';
import Button from '../components/ui/Button.jsx';

export default function NotFound() {
  return (
    <div className="card">
      <EmptyState
        icon={Compass}
        title="Page not found"
        description="The page you're looking for doesn't exist or was moved."
        action={
          <Button to="/dashboard" icon={Home}>
            Go to dashboard
          </Button>
        }
      />
    </div>
  );
}
