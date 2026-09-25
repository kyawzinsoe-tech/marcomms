const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const controller = require('../controllers/dashboardController');
const Subscription = require('../models/Subscription');
const TokenEntry = require('../models/TokenEntry');
const ProductionOrder = require('../models/ProductionOrder');
const Supplier = require('../models/Supplier');
const Asset = require('../models/Asset');
const Setting = require('../models/Setting');

describe('Executive Dashboard Database Summary', () => {
  it('returns live subscription, token and production metrics', async () => {
    const originals = {
      subFind: Subscription.find, tokenFind: TokenEntry.find, aggregate: ProductionOrder.aggregate,
      supplierCount: Supplier.countDocuments, assetCount: Asset.countDocuments, settingFind: Setting.findOne
    };
    Subscription.find = () => ({ select: async () => [{ status: 'Active' }, { status: 'Inactive' }] });
    TokenEntry.find = () => ({ select: async () => [{ tokens: 120, cost: '2.5' }, { tokens: 30, cost: '0.5' }] });
    ProductionOrder.aggregate = async () => [{ _id: 'Completed', count: 2, spend: 5000 }, { _id: 'In Production', count: 1, spend: 2000 }];
    Supplier.countDocuments = async () => 4;
    Asset.countDocuments = async () => 7;
    Setting.findOne = async () => ({ reportMonth: '2026-09' });
    const res = { statusCode: 200, body: null, status(code) { this.statusCode = code; return this; }, json(body) { this.body = body; return this; } };
    try {
      await controller.getExecutiveSummary({}, res, (error) => { throw error; });
      assert.equal(res.body.source, 'database');
      assert.equal(res.body.subscriptions.total, 2);
      assert.equal(res.body.tokens.used, 150);
      assert.equal(res.body.production.completed, 2);
      assert.equal(res.body.production.total, 3);
      assert.equal(res.body.suppliers, 4);
      assert.equal(res.body.assets, 7);
    } finally {
      Subscription.find = originals.subFind; TokenEntry.find = originals.tokenFind;
      ProductionOrder.aggregate = originals.aggregate; Supplier.countDocuments = originals.supplierCount;
      Asset.countDocuments = originals.assetCount; Setting.findOne = originals.settingFind;
    }
  });
});
