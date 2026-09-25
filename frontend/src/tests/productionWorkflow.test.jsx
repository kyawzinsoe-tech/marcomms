import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProductionWorkflow } from '../components/production-orders/ProductionWorkflow';

describe('ProductionWorkflow production order milestone', () => {
  it('keeps Bulk Production and links it to the current production order', () => {
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

    expect(screen.getByText('Bulk Production')).toBeTruthy();
    screen.getByRole('button', { name: /PO-20260925-1042/ }).click();
    expect(onViewOrder).toHaveBeenCalledOnce();
    expect(screen.getByRole('button', { name: 'Complete production & continue' })).toBeTruthy();
  });
});
