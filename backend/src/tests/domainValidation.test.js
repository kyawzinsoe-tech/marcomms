const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

const supplierController = require('../controllers/supplierController');
const productionOrderController = require('../controllers/productionOrderController');
const subscriptionController = require('../controllers/subscriptionController');
const { ROLES } = require('../config/rbac');

// Helper to create mock response object
function createMockRes() {
  const res = {
    statusCode: 200,
    jsonData: null,
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(data) {
      this.jsonData = data;
      return this;
    }
  };
  return res;
}

describe('Backend Domain Controller Validation Suite', () => {
  describe('Supplier Controller Validation', () => {
    it('rejects unauthenticated or unauthorized access with 403', async () => {
      const req = {
        user: { role: ROLES.VIEWER },
        body: { name: 'Test Supplier' }
      };
      const res = createMockRes();

      await supplierController.createSupplier(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /Access denied/);
    });

    it('rejects supplier creation when name is missing or empty with 400', async () => {
      const req = {
        user: { _id: 'admin_1', role: ROLES.ADMIN },
        body: { name: '   ', categories: ['POSM'] }
      };
      const res = createMockRes();

      await supplierController.createSupplier(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.error, 'Supplier name is required.');
    });

    it('rejects invalid supplier ObjectId format with 400', async () => {
      const req = {
        user: { role: ROLES.ADMIN },
        params: { id: 'invalid-hex-id' }
      };
      const res = createMockRes();

      await supplierController.getSupplierById(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.error, 'Invalid supplier ID format.');
    });
  });

  describe('Production Order Controller Validation', () => {
    it('rejects unauthorized access by Viewer with 403', async () => {
      const req = {
        user: { role: ROLES.VIEWER },
        body: { campaignName: 'Summer Campaign' }
      };
      const res = createMockRes();

      await productionOrderController.createProductionOrder(req, res, () => {});

      assert.equal(res.statusCode, 403);
      assert.match(res.jsonData.error, /Access denied/);
    });

    it('rejects production order creation when campaign name is missing with 400', async () => {
      const req = {
        user: { _id: 'proc_1', role: ROLES.PROCUREMENT_OFFICER },
        body: {
          campaignName: '',
          supplier: '507f1f77bcf86cd799439011',
          itemDescription: 'Brochures'
        }
      };
      const res = createMockRes();

      await productionOrderController.createProductionOrder(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.error, 'Campaign / project name is required.');
    });

    it('rejects production order creation when supplier ID is invalid with 400', async () => {
      const req = {
        user: { _id: 'proc_1', role: ROLES.PROCUREMENT_OFFICER },
        body: {
          campaignName: 'KBZ Year End',
          supplier: 'not-a-valid-object-id',
          itemDescription: 'Brochures'
        }
      };
      const res = createMockRes();

      await productionOrderController.createProductionOrder(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.error, 'Valid supplier reference is required.');
    });

    it('rejects production order creation when item description is missing with 400', async () => {
      const req = {
        user: { _id: 'proc_1', role: ROLES.PROCUREMENT_OFFICER },
        body: {
          campaignName: 'KBZ Year End',
          supplier: '507f1f77bcf86cd799439011',
          itemDescription: '   '
        }
      };
      const res = createMockRes();

      // Mock supplier lookup if it gets past supplier ID check
      const Supplier = require('../models/Supplier');
      const originalFindById = Supplier.findById;
      Supplier.findById = async () => ({ _id: '507f1f77bcf86cd799439011' });

      try {
        await productionOrderController.createProductionOrder(req, res, () => {});
        assert.equal(res.statusCode, 400);
        assert.equal(res.jsonData.error, 'Item description is required.');
      } finally {
        Supplier.findById = originalFindById;
      }
    });

    it('rejects invalid production order ID format with 400', async () => {
      const req = {
        user: { role: ROLES.ADMIN },
        params: { id: 'invalid-id' }
      };
      const res = createMockRes();

      await productionOrderController.getProductionOrderById(req, res, () => {});

      assert.equal(res.statusCode, 400);
      assert.equal(res.jsonData.error, 'Invalid production order ID format.');
    });
  });

  describe('Subscription Controller Data Retrieval', () => {
    it('retrieves subscription list and formats output correctly', async () => {
      const Subscription = require('../models/Subscription');
      const originalFind = Subscription.find;

      Subscription.find = () => ({
        sort: async () => [
          {
            _id: 'sub_1',
            product: 'ChatGPT Plus',
            tool: 'AI',
            plan: 'Monthly',
            status: 'Active',
            archived: false,
            createdAt: new Date('2026-08-01')
          }
        ]
      });

      const req = { query: { archived: 'false' } };
      const res = createMockRes();

      try {
        await subscriptionController.getSubscriptions(req, res, () => {});
        assert.equal(res.statusCode, 200);
        assert.equal(res.jsonData.count, 1);
        assert.equal(res.jsonData.subscriptions[0].product, 'ChatGPT Plus');
      } finally {
        Subscription.find = originalFind;
      }
    });
  });
});
