import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorBoundary } from './ErrorBoundary';

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
    // Prevent React error boundary console.error output during intentional test error
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
});
