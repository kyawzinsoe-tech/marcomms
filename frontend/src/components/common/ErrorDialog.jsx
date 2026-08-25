import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

/**
 * Formats raw/technical error strings into user-friendly error messages
 */
export function formatErrorMessage(rawError, fallback = 'An unexpected error occurred. Please try again.') {
  if (!rawError) return fallback;
  const msg = typeof rawError === 'string' ? rawError : rawError.message || String(rawError);

  const lower = msg.toLowerCase();
  if (lower.includes('failed to fetch') || lower.includes('networkerror') || lower.includes('econnrefused')) {
    return 'Unable to connect to the server. Please check your network connection and try again.';
  }
  if (lower.includes('jwt') || lower.includes('session') || lower.includes('401') || lower.includes('unauthorized') || lower.includes('sign in')) {
    return 'Your session has expired or is invalid. Please sign in again.';
  }
  if (lower.includes('403') || lower.includes('permission') || lower.includes('access denied') || lower.includes('forbidden')) {
    return 'You do not have permission to perform this action.';
  }
  if (lower.includes('failed to load assets') || lower.includes('failed to fetch assets')) {
    return 'Unable to load assets from the server. Please try again.';
  }
  if (lower.includes('failed to load suppliers') || lower.includes('failed to fetch suppliers')) {
    return 'Unable to load suppliers from the server. Please try again.';
  }
  if (lower.includes('failed to load production orders') || lower.includes('failed to fetch production orders')) {
    return 'Unable to load production orders from the server. Please try again.';
  }

  return msg;
}

export function ErrorDialog({
  isOpen,
  title = 'Unable to Complete Request',
  message,
  onClose
}) {
  // Escape key handler
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        onClose?.();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !message) return null;

  const displayMessage = formatErrorMessage(message);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.65)',
        backdropFilter: 'blur(3px)',
        zIndex: 10000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        animation: 'fadeIn 0.15s ease-out'
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: '#ffffff',
          borderRadius: '14px',
          padding: '24px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2), 0 10px 10px -5px rgba(0, 0, 0, 0.1)',
          border: '1px solid #fee2e2',
          textAlign: 'center',
          position: 'relative'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button top-right */}
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '14px',
            right: '14px',
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            padding: '4px',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          title="Close error alert"
        >
          <X size={18} />
        </button>

        {/* Warning Icon Badge */}
        <div
          style={{
            width: '52px',
            height: '52px',
            borderRadius: '50%',
            background: '#fef2f2',
            color: '#ef4444',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 14px',
            border: '1px solid #fecaca'
          }}
        >
          <AlertTriangle size={26} />
        </div>

        {/* Title */}
        <h3
          style={{
            margin: '0 0 8px',
            fontSize: '18px',
            fontWeight: 700,
            color: '#0f172a'
          }}
        >
          {title}
        </h3>

        {/* Message Body */}
        <p
          style={{
            margin: '0 0 20px',
            fontSize: '13.5px',
            color: '#475569',
            lineHeight: '1.5'
          }}
        >
          {displayMessage}
        </p>

        {/* OK / Close Action Button */}
        <div>
          <button
            type="button"
            className="btn btn-primary"
            style={{
              width: '100%',
              padding: '10px',
              fontWeight: 600,
              fontSize: '14px',
              borderRadius: '8px'
            }}
            onClick={onClose}
            autoFocus
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}
