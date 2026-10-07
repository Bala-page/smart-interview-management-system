const Job = require('../models/Job');
const { logAudit } = require('../services/auditService');

/**
 * @desc    Create a new job
 * @route   POST /api/jobs
 * @access  Private (Recruiter)
 */
const createJob = async (req, res, next) => {
  try {
    const {
      title,
      description,
      requiredSkills,
      minimumExperience = 0,
      maximumExperience = null,
      location = 'Remote',
      employmentType = 'Full-time',
      status = 'Draft',
    } = req.body;

    const job = await Job.create({
      title,
      description,
      requiredSkills: Array.isArray(requiredSkills)
        ? requiredSkills
        : (requiredSkills || '').split(',').map((s) => s.trim()).filter(Boolean),
      minimumExperience: Number(minimumExperience) || 0,
      maximumExperience: maximumExperience ? Number(maximumExperience) : null,
      location,
      employmentType,
      status: status || 'Draft',
      recruiterId: req.user._id,
      publishedAt: status === 'Open' ? new Date() : null,
    });

    await logAudit({
      actorUserId: req.user._id,
      action: 'JOB_CREATED',
      entityType: 'Job',
      entityId: job._id,
      metadata: { title: job.title, status: job.status },
    });

    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get jobs list with search and filters
 * @route   GET /api/jobs
 * @access  Public / Private (Candidates only see Open; Recruiters see all)
 */
const getJobs = async (req, res, next) => {
  try {
    const {
      search,
      skill,
      location,
      employmentType,
      minExp,
      maxExp,
      status,
      page = 1,
      limit = 10,
      sort = '-createdAt',
    } = req.query;

    const query = {};

    // Candidate or non-authenticated user can ONLY view Open jobs
    if (!req.user || req.user.role === 'candidate') {
      query.status = 'Open';
    } else if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { location: { $regex: search, $options: 'i' } },
        { requiredSkills: { $regex: search, $options: 'i' } },
      ];
    }

    if (skill) {
      query.requiredSkills = { $in: [new RegExp(skill, 'i')] };
    }

    if (location) {
      query.location = { $regex: location, $options: 'i' };
    }

    if (employmentType) {
      query.employmentType = employmentType;
    }

    if (minExp !== undefined && minExp !== '') {
      query.minimumExperience = { $lte: Number(minExp) };
    }

    if (maxExp !== undefined && maxExp !== '') {
      query.minimumExperience = {
        ...query.minimumExperience,
        $gte: Number(maxExp),
      };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [jobs, total] = await Promise.all([
      Job.find(query).populate('recruiterId', 'name email').sort(sort).skip(skip).limit(limitNum),
      Job.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: jobs,
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
 * @desc    Get job by ID
 * @route   GET /api/jobs/:id
 * @access  Public / Private
 */
const getJobById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate('recruiterId', 'name email');

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
        errors: ['Job ID does not exist'],
      });
    }

    // Role check: Candidates cannot view Draft or Closed jobs
    if ((!req.user || req.user.role === 'candidate') && job.status !== 'Open') {
      return res.status(403).json({
        success: false,
        message: 'This job posting is not open for applications.',
        errors: ['Job is not Open'],
      });
    }

    res.status(200).json({
      success: true,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update job details
 * @route   PUT /api/jobs/:id
 * @access  Private (Recruiter)
 */
const updateJob = async (req, res, next) => {
  try {
    let job = await Job.findById(req.params.id);

    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
        errors: ['Job ID does not exist'],
      });
    }

    const updates = { ...req.body };
    if (updates.requiredSkills && typeof updates.requiredSkills === 'string') {
      updates.requiredSkills = updates.requiredSkills.split(',').map((s) => s.trim()).filter(Boolean);
    }

    job = await Job.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    });

    await logAudit({
      actorUserId: req.user._id,
      action: 'JOB_UPDATED',
      entityType: 'Job',
      entityId: job._id,
      metadata: { title: job.title },
    });

    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update job status (Draft/Open/Closed)
 * @route   PUT /api/jobs/:id/status
 * @access  Private (Recruiter)
 */
const updateJobStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Draft', 'Open', 'Closed'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Draft, Open, or Closed',
        errors: ['Invalid status enum'],
      });
    }

    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
        errors: ['Job ID does not exist'],
      });
    }

    job.status = status;
    if (status === 'Open' && !job.publishedAt) {
      job.publishedAt = new Date();
    } else if (status === 'Closed') {
      job.closedAt = new Date();
    }

    await job.save();

    await logAudit({
      actorUserId: req.user._id,
      action: `JOB_STATUS_CHANGED_TO_${status.toUpperCase()}`,
      entityType: 'Job',
      entityId: job._id,
      metadata: { status },
    });

    res.status(200).json({
      success: true,
      message: `Job status changed to ${status}`,
      data: job,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete job
 * @route   DELETE /api/jobs/:id
 * @access  Private (Recruiter)
 */
const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job not found',
        errors: ['Job ID does not exist'],
      });
    }

    await Job.findByIdAndDelete(req.params.id);

    await logAudit({
      actorUserId: req.user._id,
      action: 'JOB_DELETED',
      entityType: 'Job',
      entityId: job._id,
      metadata: { title: job.title },
    });

    res.status(200).json({
      success: true,
      message: 'Job deleted successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createJob,
  getJobs,
  getJobById,
  updateJob,
  updateJobStatus,
  deleteJob,
};
