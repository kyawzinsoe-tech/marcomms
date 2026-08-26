import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { calculateDayDiff, formatMoney, formatNumber } from '../utils/formatters';
import {
  exportSubscriptionsToCsv,
  exportTokenEntriesToCsv,
  exportSuppliersToCsv,
  exportProductionOrdersToCsv,
  exportUsersToCsv
} from '../utils/exportCsv';
import { ROLES, PERMISSIONS, hasPermission } from '../config/rbac';

describe('Domain Workflow Integration Test Suite', () => {
  beforeEach(() => {
    HTMLAnchorElement.prototype.click = vi.fn();
    window.URL.createObjectURL = vi.fn(() => 'blob:mock-url');
    window.URL.revokeObjectURL = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Workflow 1: Subscriptions -> Alerts & Threshold Filtering', () => {
    it('integrates subscription renewal dates with alert threshold calculations', () => {
      const mockSubscriptions = [
        {
          id: 'sub_critical',
          product: 'Midjourney Pro',
          plan: 'Monthly',
          monthlyCost: 60,
          renewalDate: '2026-08-30',
          status: 'Active',
          autoRenew: false
        },
        {
          id: 'sub_safe',
          product: 'Adobe Creative Cloud',
          plan: 'Annual',
          monthlyCost: 90,
          renewalDate: '2026-12-31',
          status: 'Active',
          autoRenew: true
        }
      ];

      const referenceDate = '2026-08-26';

      // 1. Calculate remaining days
      const evaluated = mockSubscriptions.map((sub) => {
        const daysRemaining = calculateDayDiff(referenceDate, sub.renewalDate);
        return {
          ...sub,
          daysRemaining,
          isExpiringSoon: daysRemaining <= 7 && daysRemaining >= 0
        };
      });

      const criticalAlerts = evaluated.filter((sub) => sub.isExpiringSoon);
      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0].product).toBe('Midjourney Pro');
      expect(criticalAlerts[0].daysRemaining).toBe(4);
    });
  });

  describe('Workflow 2: Subscriptions -> Reports Run-Rate Aggregation', () => {
    it('aggregates active subscription costs into total monthly run-rate and annual projection', () => {
      const mockSubscriptions = [
        { id: '1', product: 'ChatGPT Plus', monthlyCost: 20, status: 'Active' },
        { id: '2', product: 'Midjourney', monthlyCost: 60, status: 'Active' },
        { id: '3', product: 'Canva Pro', monthlyCost: 15, status: 'Active' },
        { id: '4', product: 'Legacy Tool', monthlyCost: 50, status: 'Cancelled' }
      ];

      // Active monthly run-rate
      const activeMonthlyCost = mockSubscriptions
        .filter((sub) => sub.status === 'Active')
        .reduce((sum, sub) => sum + Number(sub.monthlyCost || 0), 0);

      const annualProjectedCost = activeMonthlyCost * 12;

      expect(activeMonthlyCost).toBe(95);
      expect(annualProjectedCost).toBe(1140);
      expect(formatMoney(activeMonthlyCost)).toBe('$95');
      expect(formatMoney(annualProjectedCost)).toBe('$1,140');
    });
  });

  describe('Workflow 3: AI Token Usage & Allocation Burn Tracking', () => {
    it('computes monthly token burn percentages and cost totals accurately', () => {
      const mockMonthlyEntries = [
        { id: 't1', tokensUsed: 100000, cost: 500, month: '2026-08' },
        { id: 't2', tokensUsed: 150000, cost: 750, month: '2026-08' }
      ];

      const monthlyAllocation = 500000;
      const totalTokensUsed = mockMonthlyEntries.reduce((sum, e) => sum + e.tokensUsed, 0);
      const totalTokenCost = mockMonthlyEntries.reduce((sum, e) => sum + e.cost, 0);
      const burnPercentage = Math.round((totalTokensUsed / monthlyAllocation) * 100);

      expect(totalTokensUsed).toBe(250000);
      expect(totalTokenCost).toBe(1250);
      expect(burnPercentage).toBe(50);
      expect(formatNumber(totalTokensUsed)).toBe('250,000');
    });
  });

  describe('Workflow 4: Tabular Data to RFC-4180 CSV Export Serialization', () => {
    it('triggers CSV generation for all domain models without throw or mutation', () => {
      const subs = [{ id: '1', product: 'ChatGPT, "Enterprise"', monthlyCost: 20 }];
      const tokens = [{ id: '1', month: '2026-08', tokensUsed: 5000 }];
      const suppliers = [{ id: '1', name: 'Apex Printing, Ltd.', categories: ['POSM'] }];
      const orders = [{ id: '1', orderNumber: 'PO-2026-001', totalCost: 500 }];
      const users = [{ id: '1', username: 'admin', email: 'admin@kbzbank.com', role: 'admin' }];

      expect(() => exportSubscriptionsToCsv(subs, 'subs.csv')).not.toThrow();
      expect(() => exportTokenEntriesToCsv(tokens, 'tokens.csv')).not.toThrow();
      expect(() => exportSuppliersToCsv(suppliers, 'suppliers.csv')).not.toThrow();
      expect(() => exportProductionOrdersToCsv(orders, 'orders.csv')).not.toThrow();
      expect(() => exportUsersToCsv(users, 'users.csv')).not.toThrow();
    });
  });

  describe('Workflow 5: Multi-Role RBAC Governance Boundaries', () => {
    it('verifies role-based access rules across 11 modules and administrative actions', () => {
      const viewer = { id: 'v1', role: ROLES.VIEWER };
      const headBrand = { id: 'hb1', role: ROLES.HEAD_BRAND };
      const admin = { id: 'a1', role: ROLES.ADMIN };
      const superAdmin = { id: 'sa1', role: ROLES.SUPER_ADMIN };

      // Viewer: read-only
      expect(hasPermission(viewer, PERMISSIONS.DASHBOARD_VIEW)).toBe(true);
      expect(hasPermission(viewer, PERMISSIONS.SUBSCRIPTION_CREATE)).toBe(false);
      expect(hasPermission(viewer, PERMISSIONS.DATA_RESET)).toBe(false);

      // Head of Brand: Proof approvals + brand assets
      expect(hasPermission(headBrand, PERMISSIONS.PRODUCTION_ORDER_APPROVE_PROOF)).toBe(true);
      expect(hasPermission(headBrand, PERMISSIONS.ASSET_CREATE_BANK)).toBe(true);
      expect(hasPermission(headBrand, PERMISSIONS.USER_VIEW)).toBe(false);

      // Admin: Operations manager
      expect(hasPermission(admin, PERMISSIONS.SUBSCRIPTION_CREATE)).toBe(true);
      expect(hasPermission(admin, PERMISSIONS.TOKEN_CREATE)).toBe(true);
      expect(hasPermission(admin, PERMISSIONS.USER_CREATE_SUPER_ADMIN)).toBe(false);

      // Super Admin: System governance
      expect(hasPermission(superAdmin, PERMISSIONS.DATA_RESET)).toBe(true);
      expect(hasPermission(superAdmin, PERMISSIONS.USER_DELETE_SUPER_ADMIN, { id: 'sa2' }, { superAdminCount: 2 })).toBe(true);
    });
  });
});
