const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logAudit } = require('../services/auditService');

// Helper to generate JWT token
const generateToken = (userId, role) => {
  return jwt.sign(
    { id: userId, role },
    process.env.JWT_SECRET || 'super_secret_local_jwt_key_smart_interview_management_2026_xyz',
    { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
  );
};

/**
 * @desc    Register a new user (Candidate by default)
 * @route   POST /api/auth/register
 * @access  Public
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role = 'candidate', phone, location, skills, experience, bio } = req.body;

    // Security check: Unrestricted registration cannot claim recruiter role
    if (role === 'recruiter') {
      return res.status(403).json({
        success: false,
        message: 'Direct registration as Recruiter/Admin is restricted. Please contact the administrator or use the seed script.',
        errors: ['Privileged role assignment forbidden via public registration'],
      });
    }

    const assignedRole = role === 'interviewer' ? 'interviewer' : 'candidate';

    // Check duplicate email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
        errors: ['Email already registered'],
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: assignedRole,
      phone: phone || '',
      location: location || '',
      skills: Array.isArray(skills) ? skills : [],
      experience: Number(experience) || 0,
      bio: bio || '',
    });

    const token = generateToken(user._id, user.role);

    await logAudit({
      actorUserId: user._id,
      action: 'USER_REGISTERED',
      entityType: 'User',
      entityId: user._id,
      metadata: { role: user.role, email: user.email },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          skills: user.skills,
          experience: user.experience,
          bio: user.bio,
          resumeFileId: user.resumeFileId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate user & get token
 * @route   POST /api/auth/login
 * @access  Public
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
        errors: ['Missing credentials'],
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User not found.',
        errors: ['Invalid email or password'],
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Incorrect password.',
        errors: ['Invalid email or password'],
      });
    }

    const token = generateToken(user._id, user.role);

    await logAudit({
      actorUserId: user._id,
      action: 'USER_LOGGED_IN',
      entityType: 'User',
      entityId: user._id,
      metadata: { role: user.role },
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          skills: user.skills,
          experience: user.experience,
          bio: user.bio,
          resumeFileId: user.resumeFileId,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get current logged in user details
 * @route   GET /api/auth/me
 * @access  Private
 */
const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found',
        errors: ['User not found'],
      });
    }

    res.status(200).json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        location: user.location,
        skills: user.skills,
        experience: user.experience,
        bio: user.bio,
        resumeFileId: user.resumeFileId,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update current user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
const updateProfile = async (req, res, next) => {
  try {
    const allowedFields = ['name', 'phone', 'location', 'skills', 'experience', 'bio'];
    const updates = {};

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    });

    if (updates.experience !== undefined) {
      updates.experience = Number(updates.experience) || 0;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        phone: updatedUser.phone,
        location: updatedUser.location,
        skills: updatedUser.skills,
        experience: updatedUser.experience,
        bio: updatedUser.bio,
        resumeFileId: updatedUser.resumeFileId,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  getMe,
  updateProfile,
};
