import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductionWorkflow } from '../components/production-orders/ProductionWorkflow';

describe('ProductionWorkflow production order milestone', () => {
  it('maps legacy Bulk Production to Final / Bulk Print', () => {
    const onViewOrder = vi.fn();
    render(
      <ProductionWorkflow
        order={{
          orderNumber: 'PO-20260925-1042',
          workflowStep: 'bulk_production',
          supplier: { name: 'Media Kabar' },
          quantity: 1000,
          totalCost: 2500000,
          orderDate: '2026-09-25',
          deliveryDeadline: '2026-10-05',
          workflowHistory: []
        }}
        user={{ role: 'procurement_officer' }}
        advancing={false}
        onAdvance={vi.fn()}
        onComplete={vi.fn()}
        onViewOrder={onViewOrder}
      />
    );

    expect(screen.getByLabelText('Current stage: Final / Bulk Print')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete Final / Bulk Print' })).toBeTruthy();
  });

  it('allows an Admin to skip quotations without form data and keeps the skip auditable', () => {
    const onAdvance = vi.fn();
    const order = {
      id: 'po-1',
      orderNumber: 'PO-20260925-4192',
      workflowStep: 'quotations',
      workflowHistory: []
    };

    render(
      <ProductionWorkflow
        order={order}
        user={{ role: 'admin' }}
        advancing={false}
        onAdvance={onAdvance}
        onComplete={vi.fn()}
      />
    );

    screen.getByRole('button', { name: 'Skip Quotations & Vendor Selection' }).click();
    expect(onAdvance).toHaveBeenCalledWith(order, true, { reason: '', evidenceUrl: '', sampleAction: '' });
  });

  it('shows skipped steps in the warning state and displays saved Drive evidence', () => {
    render(<ProductionWorkflow order={{ id: 'po-2', orderNumber: 'PO-2', workflowStep: 'sample_approval', workflowHistory: [{ step: 'quotations', action: 'SKIPPED', evidenceUrl: 'https://drive.google.com/file/d/test' }] }} user={{ role: 'admin' }} advancing={false} onAdvance={vi.fn()} onComplete={vi.fn()} />);
    expect(document.querySelector('.skipped')).toBeTruthy();
    expect(screen.getByRole('link', { name: 'Open evidence' }).getAttribute('href')).toBe('https://drive.google.com/file/d/test');
  });
});
