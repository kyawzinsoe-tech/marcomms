import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

/**
 * Formats a privacy-safe diagnostic telemetry object.
 * Strictly allowlisted metadata — excludes credentials, auth tokens, passwords, and sensitive forms.
 */
export function formatDiagnosticTelemetry(error, errorInfo = {}) {
  try {
    return {
      timestamp: new Date().toISOString(),
      category: 'FRONTEND_ERROR_DIAGNOSTIC',
      errorName: String(error?.name || 'Error'),
      errorMessage: String(error?.message || 'Unknown render error'),
      routeHash: typeof window !== 'undefined' ? String(window.location.hash || '#dashboard') : '',
      componentStack: String(errorInfo?.componentStack || '').slice(0, 1000),
      userAgentPlatform: typeof navigator !== 'undefined' ? String(navigator.platform || '') : ''
    };
  } catch {
    return null;
  }
}

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    const diagnostic = formatDiagnosticTelemetry(error, errorInfo);
    if (diagnostic) {
      console.error('[DIAGNOSTIC_TELEMETRY]', JSON.stringify(diagnostic));
    }
    if (this.props.onError) {
      try {
        this.props.onError(error, errorInfo, diagnostic);
      } catch {
        // Prevent recursive error in callback
      }
    }
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: 'var(--bg-canvas, #f8fafc)',
            padding: '24px',
            fontFamily: 'var(--font-body, sans-serif)'
          }}
        >
          <div
            style={{
              maxWidth: '480px',
              width: '100%',
              background: 'var(--bg-surface, #ffffff)',
              borderRadius: '12px',
              padding: '32px',
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              border: '1px solid var(--border-default, #e2e8f0)',
              textAlign: 'center'
            }}
          >
            <div
              style={{
                width: '48px',
                height: '48px',
                borderRadius: '12px',
                background: '#fef2f2',
                color: '#ef4444',
                display: 'grid',
                placeItems: 'center',
                margin: '0 auto 16px'
              }}
            >
              <AlertTriangle size={24} />
            </div>

            <h2
              style={{
                fontSize: '18px',
                fontWeight: '700',
                color: 'var(--text-primary, #0f172a)',
                marginBottom: '8px'
              }}
            >
              Something went wrong
            </h2>

            <p
              style={{
                fontSize: '14px',
                color: 'var(--text-secondary, #64748b)',
                lineHeight: '1.5',
                marginBottom: '20px'
              }}
            >
              An unexpected render error occurred in the workspace. You can refresh the application to restore state safely.
            </p>

            {this.state.error?.message && (
              <div
                style={{
                  background: 'var(--bg-surface-secondary, #f8fafc)',
                  border: '1px solid var(--border-default, #e2e8f0)',
                  borderRadius: '8px',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: 'var(--font-mono, monospace)',
                  color: '#dc2626',
                  textAlign: 'left',
                  overflowX: 'auto',
                  marginBottom: '24px',
                  wordBreak: 'break-word'
                }}
              >
                {this.state.error.message}
              </div>
            )}

            <button
              onClick={this.handleReload}
              type="button"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '10px 16px',
                background: '#6366f1',
                color: '#ffffff',
                border: 'none',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '14px',
                cursor: 'pointer',
                transition: 'background 0.2s ease'
              }}
              onMouseOver={(e) => (e.currentTarget.style.background = '#4f46e5')}
              onMouseOut={(e) => (e.currentTarget.style.background = '#6366f1')}
            >
              <RefreshCw size={16} />
              Reload Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
