const mongoose = require('mongoose');
const Supplier = require('../models/Supplier');
const { PERMISSIONS, hasPermission } = require('../config/rbac');

// GET /api/suppliers
exports.getSuppliers = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.SUPPLIER_READ)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to view supplier directory.' });
    }

    const { category, status, search, archived } = req.query;
    const query = {};

    if (archived !== 'true') {
      query.archived = false;
    }

    if (category && category !== 'All') {
      query.categories = category;
    }

    if (status && status !== 'All') {
      query.status = status;
    }

    if (search && search.trim()) {
      const regex = new RegExp(search.trim(), 'i');
      query.$or = [
        { name: regex },
        { contactPerson: regex },
        { email: regex },
        { phone: regex },
        { notes: regex }
      ];
    }

    const suppliers = await Supplier.find(query).sort({ name: 1 });

    res.status(200).json({
      count: suppliers.length,
      suppliers: suppliers.map((s) => ({
        id: String(s._id),
        name: s.name,
        code: s.code,
        categories: s.categories,
        contactPerson: s.contactPerson,
        phone: s.phone,
        email: s.email,
        address: s.address,
        rating: s.rating,
        status: s.status,
        notes: s.notes,
        archived: s.archived,
        createdBy: s.createdBy,
        createdAt: s.createdAt,
        updatedAt: s.updatedAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/suppliers/:id
exports.getSupplierById = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.SUPPLIER_READ)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to view supplier details.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format.' });
    }

    const supplier = await Supplier.findById(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    res.status(200).json({
      supplier: {
        id: String(supplier._id),
        name: supplier.name,
        code: supplier.code,
        categories: supplier.categories,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        rating: supplier.rating,
        status: supplier.status,
        notes: supplier.notes,
        archived: supplier.archived,
        createdBy: supplier.createdBy,
        createdAt: supplier.createdAt,
        updatedAt: supplier.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/suppliers
exports.createSupplier = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.SUPPLIER_CREATE)) {
      return res.status(403).json({ error: 'Access denied. Only Procurement Officers or Administrators can create suppliers.' });
    }

    const { name, code, categories, contactPerson, phone, email, address, rating, status, notes } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Supplier name is required.' });
    }

    const supplier = await Supplier.create({
      name: name.trim(),
      code: (code || '').trim(),
      categories: Array.isArray(categories) ? categories : typeof categories === 'string' ? categories.split(',').map((c) => c.trim()).filter(Boolean) : [],
      contactPerson: (contactPerson || '').trim(),
      phone: (phone || '').trim(),
      email: (email || '').trim().toLowerCase(),
      address: (address || '').trim(),
      rating: rating !== undefined ? Number(rating) : 5,
      status: status || 'Active',
      notes: (notes || '').trim(),
      createdBy: req.user._id
    });

    res.status(201).json({
      supplier: {
        id: String(supplier._id),
        name: supplier.name,
        code: supplier.code,
        categories: supplier.categories,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        rating: supplier.rating,
        status: supplier.status,
        notes: supplier.notes,
        archived: supplier.archived,
        createdBy: supplier.createdBy,
        createdAt: supplier.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/suppliers/:id
exports.updateSupplier = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.SUPPLIER_UPDATE)) {
      return res.status(403).json({ error: 'Access denied. Only Procurement Officers or Administrators can update suppliers.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format.' });
    }

    const supplier = await Supplier.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    res.status(200).json({
      supplier: {
        id: String(supplier._id),
        name: supplier.name,
        code: supplier.code,
        categories: supplier.categories,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        email: supplier.email,
        address: supplier.address,
        rating: supplier.rating,
        status: supplier.status,
        notes: supplier.notes,
        archived: supplier.archived,
        updatedAt: supplier.updatedAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/suppliers/:id
exports.deleteSupplier = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.SUPPLIER_DELETE)) {
      return res.status(403).json({ error: 'Access denied. Only Procurement Officers or Administrators can delete suppliers.' });
    }

    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ error: 'Invalid supplier ID format.' });
    }

    const supplier = await Supplier.findByIdAndDelete(req.params.id);
    if (!supplier) {
      return res.status(404).json({ error: 'Supplier not found.' });
    }

    res.status(200).json({
      message: 'Supplier permanently deleted.',
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
