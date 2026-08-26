import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary, formatDiagnosticTelemetry } from './ErrorBoundary';

function ProblematicComponent({ shouldThrow }) {
  if (shouldThrow) {
    throw new Error('Test crash in component tree');
  }
  return <div>Component rendered safely</div>;
}

describe('ErrorBoundary component', () => {
  it('renders children safely when no error is thrown', () => {
    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={false} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Component rendered safely')).toBeDefined();
  });

  it('catches runtime errors in children and renders styled fallback recovery card', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent shouldThrow={true} />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeDefined();
    expect(screen.getByText('Test crash in component tree')).toBeDefined();
    expect(screen.getByText('Reload Application')).toBeDefined();

    spy.mockRestore();
  });

  it('formats privacy-safe diagnostic telemetry with allowlisted fields only', () => {
    const testError = new TypeError('Cannot read property undefined');
    const errorInfo = { componentStack: '\n    in ProblematicComponent\n    in ErrorBoundary' };

    const telemetry = formatDiagnosticTelemetry(testError, errorInfo);

    expect(telemetry).toBeDefined();
    expect(telemetry.category).toBe('FRONTEND_ERROR_DIAGNOSTIC');
    expect(telemetry.errorName).toBe('TypeError');
    expect(telemetry.errorMessage).toBe('Cannot read property undefined');
    expect(telemetry.componentStack).toContain('ProblematicComponent');
    expect(telemetry.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    // Verify absence of sensitive auth tokens or passwords
    expect(telemetry.password).toBeUndefined();
    expect(telemetry.token).toBeUndefined();
  });
});
