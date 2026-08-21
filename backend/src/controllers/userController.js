const User = require('../models/User');

// GET /api/users (Admin only)
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

// POST /api/users (Admin only)
exports.createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(400).json({ error: `A user with email "${email}" already exists.` });
    }

    const newUser = await User.create({
      name: name.trim(),
      email: cleanEmail,
      password,
      role: role === 'admin' ? 'admin' : 'user',
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

// PUT /api/users/:id (Admin only)
exports.updateUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    if (name) user.name = name.trim();
    if (email) user.email = email.toLowerCase().trim();
    if (role) user.role = role === 'admin' ? 'admin' : 'user';
    if (password) user.password = password;

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

// DELETE /api/users/:id (Admin only)
exports.deleteUser = async (req, res, next) => {
  try {
    if (String(req.user._id) === String(req.params.id)) {
      return res.status(400).json({ error: 'You cannot delete your own active account.' });
    }

    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.status(200).json({ message: 'User deleted successfully.', id: req.params.id });
  } catch (error) {
    next(error);
  }
};
