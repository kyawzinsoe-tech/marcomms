import React, { useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info } from 'lucide-react';

export function Toast({ message, type = 'success', onClose }) {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const Icon =
    type === 'error' ? AlertCircle : type === 'info' ? Info : CheckCircle2;

  return (
    <div className={`toast toast-${type}`}>
      <Icon size={16} />
      <span>{message}</span>
    </div>
  );
}
