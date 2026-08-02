const User = require('../models/User');
const { sendTokenResponse } = require('../utils/helpers');
const { writeAuditLog } = require('../utils/auditLogger');

// @desc    Register user (admin only in production)
// @route   POST /api/auth/register
// @access  Public (lock down in production)
const register = async (req, res, next) => {
  try {
    const { name, email, password, role, courtName, district } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'Email already registered' });
    }

    const user = await User.create({ name, email, password, role, courtName, district });

    await writeAuditLog({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_CREATED',
      entityType: 'User',
      entityId: user._id,
      description: `New user registered: ${user.email} (${user.role})`,
      ipAddress: req.ip,
    });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Login
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Please provide email and password' });
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user || !user.isActive) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    user.lastLogin = new Date();
    await user.save();

    await writeAuditLog({
      userId: user._id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      entityType: 'User',
      entityId: user._id,
      description: `User logged in: ${user.email}`,
      ipAddress: req.ip,
    });

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
const getMe = async (req, res) => {
  res.json({ success: true, user: req.user });
};

// @desc    Logout
// @route   POST /api/auth/logout
// @access  Private
const logout = async (req, res) => {
  res.cookie('token', '', { expires: new Date(0), httpOnly: true });
  res.json({ success: true, message: 'Logged out' });
};

module.exports = { register, login, getMe, logout };
