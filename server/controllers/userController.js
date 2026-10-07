const User = require('../models/User');
const Interview = require('../models/Interview');

/**
 * @desc    Get all users with filtering and pagination
 * @route   GET /api/users
 * @access  Private (Recruiter)
 */
const getUsers = async (req, res, next) => {
  try {
    const { role, search, page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = {};
    if (role) {
      query.role = role;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { skills: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [users, total] = await Promise.all([
      User.find(query).sort(sort).skip(skip).limit(limitNum),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: users,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details
 * @route   GET /api/users/:id
 * @access  Private (Self or Recruiter)
 */
const getUserById = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Authorization: Candidate can only view own profile
    if (req.user.role === 'candidate' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view other candidate profiles.',
        errors: ['Ownership check failed'],
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: ['User ID does not exist'],
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user details
 * @route   PUT /api/users/:id
 * @access  Private (Self or Recruiter)
 */
const updateUser = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (req.user.role !== 'recruiter' && req.user._id.toString() !== id) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot edit other users.',
        errors: ['Unauthorized edit'],
      });
    }

    const allowedUpdates = ['name', 'phone', 'location', 'skills', 'experience', 'bio'];
    const updateData = {};

    allowedUpdates.forEach((key) => {
      if (req.body[key] !== undefined) {
        updateData[key] = req.body[key];
      }
    });

    const updated = await User.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get list of interviewers with workload stats
 * @route   GET /api/users/interviewers
 * @access  Private (Recruiter)
 */
const getInterviewers = async (req, res, next) => {
  try {
    const interviewers = await User.find({ role: 'interviewer' }).select(
      'name email skills experience location'
    );

    // Calculate workload stats for each interviewer
    const interviewersWithStats = await Promise.all(
      interviewers.map(async (interviewer) => {
        const totalAssigned = await Interview.countDocuments({
          interviewerId: interviewer._id,
        });
        const upcomingCount = await Interview.countDocuments({
          interviewerId: interviewer._id,
          status: 'Scheduled',
        });

        return {
          ...interviewer.toObject(),
          totalAssigned,
          upcomingCount,
          availability: upcomingCount > 5 ? 'Busy' : upcomingCount > 2 ? 'Moderate' : 'Available',
        };
      })
    );

    res.status(200).json({
      success: true,
      data: interviewersWithStats,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  getInterviewers,
};
