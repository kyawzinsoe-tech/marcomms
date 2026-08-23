const mongoose = require('mongoose');
const User = require('../models/User');
const { ROLES, PERMISSIONS, normalizeRole, hasPermission } = require('../config/rbac');

// Helper to find user by MongoDB _id or email safely
async function findUserFlexible(idOrEmail) {
  if (!idOrEmail) return null;
  if (mongoose.Types.ObjectId.isValid(idOrEmail)) {
    const user = await User.findById(idOrEmail);
    if (user) return user;
  }
  if (typeof idOrEmail === 'string' && idOrEmail.includes('@')) {
    const userByEmail = await User.findOne({ email: String(idOrEmail).toLowerCase().trim() });
    if (userByEmail) return userByEmail;
  }
  return null;
}

// GET /api/users (Super Admin & Admin)
exports.getUsers = async (req, res, next) => {
  try {
    if (!hasPermission(req.user, PERMISSIONS.USER_VIEW)) {
      return res.status(403).json({ error: 'Access denied. Insufficient permissions to view users.' });
    }

    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      count: users.length,
      users: users.map((u) => ({
        id: String(u._id),
        name: u.name,
        email: u.email,
        role: normalizeRole(u.role),
        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email)}`,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const requester = req.user;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: `A user with email "${email}" already exists.` });
    }

    const requestedRole = normalizeRole(role || ROLES.VIEWER);

    // Permission check based on requested role
    let requiredPerm;
    if (requestedRole === ROLES.SUPER_ADMIN) {
      requiredPerm = PERMISSIONS.USER_CREATE_SUPER_ADMIN;
    } else if (requestedRole === ROLES.ADMIN) {
      requiredPerm = PERMISSIONS.USER_CREATE_ADMIN;
    } else {
      requiredPerm = PERMISSIONS.USER_CREATE_VIEWER;
    }

    if (!hasPermission(requester, requiredPerm)) {
      return res.status(403).json({
        error: `Access denied. You do not have permission to create an account with role "${requestedRole}". Super Administrator privileges are required to create Admin and Super Admin accounts.`
      });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: requestedRole,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`
    });

    res.status(201).json({
      user: {
        id: String(newUser._id),
        name: newUser.name,
        email: newUser.email,
        role: normalizeRole(newUser.role),
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id
exports.updateUser = async (req, res, next) => {
  try {
    const isIdOrEmail = mongoose.Types.ObjectId.isValid(req.params.id) || (typeof req.params.id === 'string' && req.params.id.includes('@'));
    if (!isIdOrEmail) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const { name, email, password, role } = req.body;
    const requester = req.user;

    const user = await findUserFlexible(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const targetCurrentRole = normalizeRole(user.role);

    // Check base edit permission for target's current role
    let editPerm;
    if (targetCurrentRole === ROLES.SUPER_ADMIN) {
      editPerm = PERMISSIONS.USER_UPDATE_SUPER_ADMIN;
    } else if (targetCurrentRole === ROLES.ADMIN) {
      editPerm = PERMISSIONS.USER_UPDATE_ADMIN;
    } else {
      editPerm = PERMISSIONS.USER_UPDATE_VIEWER;
    }

    if (!hasPermission(requester, editPerm, user)) {
      return res.status(403).json({
        error: `Access denied. You do not have permission to edit ${targetCurrentRole.replace('_', ' ')} accounts.`
      });
    }

    // Role elevation / modification check
    if (role) {
      const newRole = normalizeRole(role);
      if (newRole !== targetCurrentRole) {
        // Only Super Admin can change roles
        if (normalizeRole(requester.role) !== ROLES.SUPER_ADMIN) {
          return res.status(403).json({
            error: 'Access denied. Only Super Administrators are authorized to change or assign roles.'
          });
        }

        // Protect last remaining Super Admin from being demoted
        if (targetCurrentRole === ROLES.SUPER_ADMIN && newRole !== ROLES.SUPER_ADMIN) {
          const superAdminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN });
          if (superAdminCount <= 1) {
            return res.status(400).json({
              error: 'Operation blocked. Cannot demote the final remaining Super Administrator account.'
            });
          }
        }

        user.role = newRole;
      }
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (password) user.password = password;

    await user.save();

    res.status(200).json({
      user: {
        id: String(user._id),
        name: user.name,
        email: user.email,
        role: normalizeRole(user.role),
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id
exports.deleteUser = async (req, res, next) => {
  try {
    const isIdOrEmail = mongoose.Types.ObjectId.isValid(req.params.id) || (typeof req.params.id === 'string' && req.params.id.includes('@'));
    if (!isIdOrEmail) {
      return res.status(400).json({ error: 'Invalid user ID format.' });
    }

    const requester = req.user;
    const requesterId = String(requester?._id || requester?.id);

    const user = await findUserFlexible(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const targetId = String(user._id);
    const targetRole = normalizeRole(user.role);
    const requesterRole = normalizeRole(requester.role);
    const isSelf = requesterId === targetId;

    // Count remaining super admins for context
    const superAdminCount = await User.countDocuments({ role: ROLES.SUPER_ADMIN });

    // 1. Role-level permission check for Admin & Viewer (Admin cannot delete Admin/Super Admin -> 403; Viewer cannot delete -> 403)
    if (requesterRole === ROLES.VIEWER) {
      return res.status(403).json({ error: 'Access denied. Viewers do not have permission to delete accounts.' });
    }
    if (requesterRole === ROLES.ADMIN && (targetRole === ROLES.ADMIN || targetRole === ROLES.SUPER_ADMIN)) {
      return res.status(403).json({ error: `Access denied. Administrators cannot delete ${targetRole.replace('_', ' ')} accounts.` });
    }

    // 2. Prevent self-deletion for Super Admin (-> 400)
    if (isSelf && targetRole === ROLES.SUPER_ADMIN) {
      return res.status(400).json({
        error: 'You cannot delete your own active Super Administrator account. Please have another Super Admin manage this account.'
      });
    }

    // 3. Protection for final remaining Super Admin (-> 400)
    if (targetRole === ROLES.SUPER_ADMIN && superAdminCount <= 1) {
      return res.status(400).json({
        error: 'Protection rule: Cannot delete the final remaining Super Administrator account. At least one Super Admin must remain.'
      });
    }

    // 4. Canonical hasPermission evaluation
    let deletePerm;
    if (targetRole === ROLES.SUPER_ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_SUPER_ADMIN;
    } else if (targetRole === ROLES.ADMIN) {
      deletePerm = PERMISSIONS.USER_DELETE_ADMIN;
    } else {
      deletePerm = PERMISSIONS.USER_DELETE_VIEWER;
    }

    if (!hasPermission(requester, deletePerm, user, { superAdminCount })) {
      return res.status(403).json({
        error: `Access denied. You do not have permission to delete ${targetRole.replace('_', ' ')} accounts.`
      });
    }

    await User.findByIdAndDelete(user._id);

    res.status(200).json({
      message: `User account "${user.name}" (${user.email}) deleted successfully.`,
      id: String(user._id)
    });
  } catch (error) {
    next(error);
  }
};
