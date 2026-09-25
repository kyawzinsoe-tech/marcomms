const Subscription = require('../models/Subscription');
const TokenEntry = require('../models/TokenEntry');
const ProductionOrder = require('../models/ProductionOrder');
const Supplier = require('../models/Supplier');
const Asset = require('../models/Asset');
const Setting = require('../models/Setting');

exports.getExecutiveSummary = async (req, res, next) => {
  try {
    const setting = await Setting.findOne({ key: 'dashboard_config' });
    const reportMonth = setting?.reportMonth || new Date().toISOString().slice(0, 7);
    const [subscriptions, tokenEntries, orderCounts, supplierCount, assetCount] = await Promise.all([
      Subscription.find({ archived: false }).select('status plan cost expiry'),
      TokenEntry.find({ archived: false, date: { $regex: `^${reportMonth.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&')}` } }).select('tokens cost'),
      ProductionOrder.aggregate([{ $match: { archived: false } }, { $group: { _id: '$status', count: { $sum: 1 }, spend: { $sum: '$totalCost' } } }]),
      Supplier.countDocuments({ archived: false }),
      Asset.countDocuments({ archived: false, uploadStatus: { $ne: 'rejected' } })
    ]);
    const production = Object.fromEntries(orderCounts.map((row) => [row._id, { count: row.count, spend: row.spend }]));
    res.status(200).json({
      source: 'database', reportMonth,
      subscriptions: { total: subscriptions.length, active: subscriptions.filter((item) => item.status === 'Active').length },
      tokens: { used: tokenEntries.reduce((sum, item) => sum + Number(item.tokens || 0), 0), cost: tokenEntries.reduce((sum, item) => sum + Number(item.cost || 0), 0) },
      production: {
        total: orderCounts.reduce((sum, row) => sum + row.count, 0),
        completed: production.Completed?.count || 0,
        inProgress: (production['In Production']?.count || 0) + (production['Sample Proofing']?.count || 0) + (production.Submitted?.count || 0),
        spend: orderCounts.filter((row) => row._id !== 'Cancelled').reduce((sum, row) => sum + Number(row.spend || 0), 0)
      },
      suppliers: supplierCount,
      assets: assetCount,
      generatedAt: new Date().toISOString()
    });
  } catch (error) { next(error); }
};
