import { forwardRef, useState } from 'react';
import { Eye, EyeOff, KeyRound } from 'lucide-react';
import Input from './ui/Input.jsx';

const PasswordInput = forwardRef(function PasswordInput(props, ref) {
  const [visible, setVisible] = useState(false);
  return (
    <Input
      ref={ref}
      type={visible ? 'text' : 'password'}
      icon={KeyRound}
      right={
        <button
          type="button"
          tabIndex={-1}
          onClick={() => setVisible((v) => !v)}
          className="rounded p-1 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200"
          aria-label={visible ? 'Hide password' : 'Show password'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
      {...props}
    />
  );
});

export default PasswordInput;
