const User = require('../models/User');

// GET /api/users (Super Admin & Admin)
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.status(200).json({
      count: users.length,
      users: users.map((u) => ({
        id: u._id,
        name: u.name,
        email: u.email,
        role: u.role,
        avatar: u.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(u.email)}`,
        createdAt: u.createdAt
      }))
    });
  } catch (error) {
    next(error);
  }
};

// POST /api/users (Super Admin can create Super Admin, Admin, Viewer; Admin can only create Viewer)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const requesterRole = req.user?.role;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: `A user with email "${email}" already exists.` });
    }

    // Role Assignment & Privilege Escalation Check
    let assignedRole = 'viewer';

    if (requesterRole === 'super_admin') {
      if (role === 'super_admin' || role === 'admin' || role === 'viewer') {
        assignedRole = role;
      }
    } else if (requesterRole === 'admin') {
      if (role === 'super_admin' || role === 'admin') {
        return res.status(403).json({
          error: 'Access denied. Administrators are only permitted to create Viewer accounts. Super Administrator privileges are required to create Admin accounts.'
        });
      }
      assignedRole = 'viewer';
    } else {
      return res.status(403).json({ error: 'Access denied. You do not have permission to create user accounts.' });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: assignedRole,
      avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanEmail)}`
    });

    res.status(201).json({
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        avatar: newUser.avatar,
        createdAt: newUser.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// PUT /api/users/:id (Super Admin can edit all; Admin can only edit Viewers)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const requesterRole = req.user?.role;
    const requesterId = String(req.user?._id);
    const targetUserId = String(req.params.id);

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const isSelf = requesterId === targetUserId;
    const targetRole = user.role;

    // RBAC Permissions Check
    if (requesterRole === 'admin') {
      // Admins cannot edit Super Admin or other Admin accounts
      if (targetRole === 'super_admin') {
        return res.status(403).json({
          error: 'Access denied. Administrators cannot edit Super Administrator accounts.'
        });
      }

      if (targetRole === 'admin' && !isSelf) {
        return res.status(403).json({
          error: 'Access denied. Administrators cannot edit other Administrator accounts.'
        });
      }

      // Admins cannot elevate any user to admin or super_admin
      if (role && (role === 'admin' || role === 'super_admin') && targetRole !== role) {
        return res.status(403).json({
          error: 'Access denied. Administrators cannot promote accounts to Admin or Super Admin.'
        });
      }
    } else if (requesterRole !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to edit accounts.'
      });
    }

    // Protect last remaining Super Admin from role demotion
    if (targetRole === 'super_admin' && role && role !== 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          error: 'Operation blocked. You cannot demote the last remaining Super Administrator account.'
        });
      }
    }

    // Apply updates
    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (password) user.password = password;

    if (role && requesterRole === 'super_admin') {
      if (['super_admin', 'admin', 'viewer'].includes(role)) {
        user.role = role;
      }
    }

    await user.save();

    res.status(200).json({
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(user.email)}`,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

// DELETE /api/users/:id (Super Admin can delete any except last Super Admin; Admin can only delete Viewers)
exports.deleteUser = async (req, res, next) => {
  try {
    const requesterRole = req.user?.role;
    const requesterId = String(req.user?._id);
    const targetUserId = String(req.params.id);

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    const targetRole = user.role;

    // 1. Protection for the last remaining Super Admin account
    if (targetRole === 'super_admin') {
      const superAdminCount = await User.countDocuments({ role: 'super_admin' });
      if (superAdminCount <= 1) {
        return res.status(400).json({
          error: 'Protection active: The last remaining Super Administrator account cannot be deleted.'
        });
      }
    }

    // 2. Prevent self-deletion if requester is Super Admin
    if (requesterId === targetUserId && targetRole === 'super_admin') {
      return res.status(400).json({
        error: 'You cannot delete your own active Super Administrator account. Please have another Super Admin manage this account.'
      });
    }

    // 3. Admin restrictions
    if (requesterRole === 'admin') {
      if (targetRole === 'super_admin') {
        return res.status(403).json({
          error: 'Access denied. Administrators cannot delete Super Administrator accounts.'
        });
      }
      if (targetRole === 'admin') {
        return res.status(403).json({
          error: 'Access denied. Administrators cannot delete other Administrator accounts.'
        });
      }
    } else if (requesterRole !== 'super_admin') {
      return res.status(403).json({
        error: 'Access denied. You do not have permission to delete user accounts.'
      });
    }

    await User.findByIdAndDelete(req.params.id);

    res.status(200).json({
      message: `User account "${user.name}" (${user.email}) deleted successfully.`,
      id: req.params.id
    });
  } catch (error) {
    next(error);
  }
};
