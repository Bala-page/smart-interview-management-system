const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const ScreeningResult = require('../models/ScreeningResult');
const Interview = require('../models/Interview');
const { evaluateCandidate } = require('../services/screeningEngineService');
const { getFileBuffer } = require('../services/gridfsService');
const { parseResumeBuffer } = require('../services/resumeParserService');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { transitionApplicationStatus } = require('../services/workflowEngineService');

/**
 * @desc    Apply for a job
 * @route   POST /api/applications
 * @access  Private (Candidate)
 */
const apply = async (req, res, next) => {
  try {
    const { jobId, resumeFileId } = req.body;
    const candidateId = req.user._id;

    if (!jobId) {
      return res.status(400).json({
        success: false,
        message: 'Job ID is required to submit an application',
        errors: ['Missing jobId'],
      });
    }

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({
        success: false,
        message: 'Job posting not found',
        errors: ['Job ID does not exist'],
      });
    }

    if (job.status !== 'Open') {
      return res.status(400).json({
        success: false,
        message: 'This job posting is closed or no longer accepting applications.',
        errors: ['Job is not Open'],
      });
    }

    // Check duplicate application
    const existingApp = await Application.findOne({ candidateId, jobId });
    if (existingApp) {
      return res.status(400).json({
        success: false,
        message: 'You have already applied for this job position.',
        errors: ['Duplicate application prevented'],
      });
    }

    const candidate = await User.findById(candidateId);
    const finalResumeFileId = resumeFileId || candidate.resumeFileId;

    // Create the application
    const application = await Application.create({
      candidateId,
      jobId,
      resumeFileId: finalResumeFileId,
      applicationStatus: 'Applied',
      appliedDate: new Date(),
    });

    // Run deterministic resume screening
    let resumeSkills = [];
    let detectedExp = null;

    if (finalResumeFileId) {
      try {
        const buffer = await getFileBuffer(finalResumeFileId);
        const parsed = await parseResumeBuffer(buffer);
        resumeSkills = parsed.extractedSkills || [];
        detectedExp = parsed.detectedExperience;
      } catch (parseErr) {
        console.warn('[Screening] Resume parse during application had warning:', parseErr.message);
      }
    }

    const screeningOutput = evaluateCandidate(job, candidate, resumeSkills, detectedExp);

    // Save ScreeningResult
    const screeningResult = await ScreeningResult.create({
      applicationId: application._id,
      candidateId,
      jobId,
      skillsFound: screeningOutput.skillsFound,
      matchedSkills: screeningOutput.matchedSkills,
      missingSkills: screeningOutput.missingSkills,
      skillMatchPercentage: screeningOutput.skillMatchPercentage,
      experienceScore: screeningOutput.experienceScore,
      overallMatchScore: screeningOutput.overallMatchScore,
      scoreBreakdown: screeningOutput.scoreBreakdown,
      screeningStatus: screeningOutput.screeningStatus,
    });

    application.screeningScore = screeningOutput.overallMatchScore;
    await application.save();

    // Log audit
    await logAudit({
      actorUserId: candidateId,
      action: 'APPLICATION_SUBMITTED',
      entityType: 'Application',
      entityId: application._id,
      metadata: { jobTitle: job.title, initialScore: screeningOutput.overallMatchScore },
    });

    // Notify Candidate
    await createNotification({
      recipientUserId: candidateId,
      type: 'APPLICATION_SUBMITTED',
      title: 'Application Received',
      message: `Your application for "${job.title}" has been submitted successfully. Screening score: ${screeningOutput.overallMatchScore}%.`,
      relatedEntityType: 'Application',
      relatedEntityId: application._id,
    });

    // Notify Recruiter
    if (job.recruiterId) {
      await createNotification({
        recipientUserId: job.recruiterId,
        type: 'APPLICATION_SUBMITTED',
        title: 'New Candidate Application',
        message: `${candidate.name} applied for "${job.title}". Screening score: ${screeningOutput.overallMatchScore}%.`,
        relatedEntityType: 'Application',
        relatedEntityId: application._id,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Application submitted and screened successfully',
      data: {
        application,
        screeningResult,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get applications with filters and pagination
 * @route   GET /api/applications
 * @access  Private
 */
const getApplications = async (req, res, next) => {
  try {
    const {
      jobId,
      candidateId,
      status,
      minScore,
      maxScore,
      page = 1,
      limit = 10,
      sort = '-appliedDate',
    } = req.query;

    const query = {};

    // Role-based scoping
    if (req.user.role === 'candidate') {
      query.candidateId = req.user._id;
    } else if (req.user.role === 'interviewer') {
      // Find interviews assigned to this interviewer
      const interviews = await Interview.find({ interviewerId: req.user._id });
      const applicationIds = interviews.map((i) => i.applicationId);
      query._id = { $in: applicationIds };
    } else {
      // Recruiter scoping
      if (candidateId) query.candidateId = candidateId;
      if (jobId) query.jobId = jobId;
    }

    if (status) {
      query.applicationStatus = status;
    }

    if (minScore !== undefined && minScore !== '') {
      query.screeningScore = { $gte: Number(minScore) };
    }

    if (maxScore !== undefined && maxScore !== '') {
      query.screeningScore = {
        ...query.screeningScore,
        $lte: Number(maxScore),
      };
    }

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [applications, total] = await Promise.all([
      Application.find(query)
        .populate('candidateId', 'name email phone location skills experience resumeFileId')
        .populate('jobId', 'title location employmentType status requiredSkills minimumExperience')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Application.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: applications,
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
 * @desc    Get application details by ID
 * @route   GET /api/applications/:id
 * @access  Private
 */
const getApplicationById = async (req, res, next) => {
  try {
    const application = await Application.findById(req.params.id)
      .populate('candidateId', 'name email phone location skills experience bio resumeFileId')
      .populate('jobId', 'title description requiredSkills minimumExperience location employmentType status recruiterId');

    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        errors: ['Application ID does not exist'],
      });
    }

    // Role ownership check
    if (
      req.user.role === 'candidate' &&
      application.candidateId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot access other candidates\' applications.',
        errors: ['Ownership check failed'],
      });
    }

    if (req.user.role === 'interviewer') {
      const assigned = await Interview.findOne({
        applicationId: application._id,
        interviewerId: req.user._id,
      });
      if (!assigned) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You are not assigned to interview this candidate.',
          errors: ['Interviewer assignment required'],
        });
      }
    }

    // Retrieve associated screening result and interviews
    const [screeningResult, interviews] = await Promise.all([
      ScreeningResult.findOne({ applicationId: application._id }),
      Interview.find({ applicationId: application._id })
        .populate('interviewerId', 'name email skills')
        .sort('-createdAt'),
    ]);

    res.status(200).json({
      success: true,
      data: {
        application,
        screeningResult,
        interviews,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update application status / hiring decision
 * @route   PUT /api/applications/:id/status
 * @access  Private (Recruiter)
 */
const updateApplicationStatus = async (req, res, next) => {
  try {
    const { status, rejectionReason, decision } = req.body;
    const targetStatus = status || decision;

    if (!targetStatus) {
      return res.status(400).json({
        success: false,
        message: 'Status or decision is required',
        errors: ['Missing status field'],
      });
    }

    const updated = await transitionApplicationStatus(
      req.params.id,
      targetStatus,
      req.user,
      { rejectionReason }
    );

    res.status(200).json({
      success: true,
      message: `Application transitioned to ${targetStatus} successfully`,
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  apply,
  getApplications,
  getApplicationById,
  updateApplicationStatus,
};
