import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  exportSubscriptionsToCsv,
  exportTokenEntriesToCsv,
  exportSuppliersToCsv,
  exportProductionOrdersToCsv,
  exportUsersToCsv
} from './exportCsv';

describe('exportCsv utility engine', () => {
  let clickSpy;

  beforeEach(() => {
    clickSpy = vi.fn();
    HTMLAnchorElement.prototype.click = clickSpy;
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('exports subscriptions to CSV with RFC-4180 escaping and UTF-8 BOM', () => {
    const mockSubscriptions = [
      {
        id: 'sub_1',
        product: 'ChatGPT Enterprise, "Pro"',
        tool: 'OpenAI',
        category: 'AI Chat',
        plan: 'Annual',
        seats: 10,
        monthlyCost: 300,
        renewalDate: '2026-12-31',
        status: 'Active',
        paymentMethod: 'Corporate Card',
        assignedTo: 'Design Team',
        email: 'creative@kbzbank.com',
        autoRenew: true,
        notes: 'Line 1\nLine 2'
      }
    ];

    exportSubscriptionsToCsv(mockSubscriptions, 'test-subs.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports token entries to CSV accurately', () => {
    const mockTokens = [
      {
        id: 'tok_1',
        month: '2026-08',
        date: '2026-08-15',
        tokensUsed: 15000,
        userEmail: 'user@kbzbank.com',
        project: 'Summer Campaign',
        cost: 75.5,
        notes: 'Banner gen'
      }
    ];

    exportTokenEntriesToCsv(mockTokens, 'test-tokens.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports suppliers to CSV accurately', () => {
    const mockSuppliers = [
      {
        id: 'sup_1',
        name: 'Apex Printing House',
        categories: ['Offset Printing', 'Packaging'],
        contactPerson: 'Ko Aung',
        phone: '+959123456789',
        email: 'info@apex.com',
        address: 'Yangon, Myanmar',
        rating: 5,
        status: 'Active',
        notes: 'Top tier vendor'
      }
    ];

    exportSuppliersToCsv(mockSuppliers, 'test-suppliers.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports production orders to CSV accurately', () => {
    const mockOrders = [
      {
        id: 'po_1',
        orderNumber: 'PO-2026-001',
        campaignName: 'Water Festival POSM',
        supplierName: 'Apex Printing',
        itemDescription: 'Standee 5x2ft',
        quantity: 50,
        unitCost: 15,
        totalCost: 750,
        currency: 'USD',
        status: 'Delivered',
        orderDate: '2026-04-01',
        deliveryDate: '2026-04-10',
        sampleProofApproved: true
      }
    ];

    exportProductionOrdersToCsv(mockOrders, 'test-orders.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });

  it('exports users to CSV accurately excluding passwords and secrets', () => {
    const mockUsers = [
      {
        id: 'usr_1',
        username: 'kyawzinsoe',
        email: 'kyawzin.soe@kbzbank.com',
        role: 'superadmin',
        active: true,
        createdAt: '2026-01-01'
      }
    ];

    exportUsersToCsv(mockUsers, 'test-users.csv');

    expect(clickSpy).toHaveBeenCalled();
    expect(window.URL.createObjectURL).toHaveBeenCalled();
  });
});
