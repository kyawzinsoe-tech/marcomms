import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductionWorkflow } from '../components/production-orders/ProductionWorkflow';

describe('ProductionWorkflow production order milestone', () => {
  it('links the bulk-production step to the production order details', () => {
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
      />
    );

    expect(screen.getByText('Production Order / Bulk Production')).toBeTruthy();
    expect(screen.getByText('PO-20260925-1042')).toBeTruthy();
    expect(screen.getByText('Media Kabar')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Complete production & continue' })).toBeTruthy();
  });
});
