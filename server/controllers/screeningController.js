const Application = require('../models/Application');
const ScreeningResult = require('../models/ScreeningResult');
const User = require('../models/User');
const Job = require('../models/Job');
const { evaluateCandidate } = require('../services/screeningEngineService');
const { getFileBuffer } = require('../services/gridfsService');
const { parseResumeBuffer } = require('../services/resumeParserService');
const { logAudit } = require('../services/auditService');

/**
 * @desc    Run or recalculate screening for an application
 * @route   POST /api/screening/:applicationId
 * @access  Private (Recruiter)
 */
const runScreening = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        errors: ['Invalid application ID'],
      });
    }

    const [candidate, job] = await Promise.all([
      User.findById(application.candidateId),
      Job.findById(application.jobId),
    ]);

    if (!candidate || !job) {
      return res.status(404).json({
        success: false,
        message: 'Candidate or Job record missing',
        errors: ['Corrupted application relations'],
      });
    }

    let resumeSkills = [];
    let detectedExp = null;

    const resumeFileId = application.resumeFileId || candidate.resumeFileId;
    if (resumeFileId) {
      try {
        const buffer = await getFileBuffer(resumeFileId);
        const parsed = await parseResumeBuffer(buffer);
        resumeSkills = parsed.extractedSkills || [];
        detectedExp = parsed.detectedExperience;
      } catch (parseErr) {
        console.warn('[Screening] Warning during resume buffer parsing:', parseErr.message);
      }
    }

    const evaluation = evaluateCandidate(job, candidate, resumeSkills, detectedExp);

    let result = await ScreeningResult.findOne({ applicationId });
    if (!result) {
      result = new ScreeningResult({
        applicationId,
        candidateId: candidate._id,
        jobId: job._id,
      });
    }

    result.skillsFound = evaluation.skillsFound;
    result.matchedSkills = evaluation.matchedSkills;
    result.missingSkills = evaluation.missingSkills;
    result.skillMatchPercentage = evaluation.skillMatchPercentage;
    result.experienceScore = evaluation.experienceScore;
    result.overallMatchScore = evaluation.overallMatchScore;
    result.scoreBreakdown = evaluation.scoreBreakdown;
    result.screeningStatus = evaluation.screeningStatus;
    result.generatedAt = new Date();

    await result.save();

    application.screeningScore = evaluation.overallMatchScore;
    await application.save();

    await logAudit({
      actorUserId: req.user._id,
      action: 'SCREENING_CALCULATED',
      entityType: 'ScreeningResult',
      entityId: result._id,
      metadata: {
        score: evaluation.overallMatchScore,
        skillMatch: evaluation.skillMatchPercentage,
      },
    });

    res.status(200).json({
      success: true,
      message: 'Screening calculation completed successfully',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get screening result for an application
 * @route   GET /api/screening/:applicationId
 * @access  Private (Candidate own, Recruiter any)
 */
const getScreeningResult = async (req, res, next) => {
  try {
    const { applicationId } = req.params;

    const application = await Application.findById(applicationId);
    if (!application) {
      return res.status(404).json({
        success: false,
        message: 'Application not found',
        errors: ['Invalid application ID'],
      });
    }

    if (
      req.user.role === 'candidate' &&
      application.candidateId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view screening details of other candidates.',
        errors: ['Ownership check failed'],
      });
    }

    const screening = await ScreeningResult.findOne({ applicationId })
      .populate('jobId', 'title requiredSkills minimumExperience')
      .populate('candidateId', 'name email experience');

    if (!screening) {
      return res.status(404).json({
        success: false,
        message: 'Screening result not generated yet for this application',
        errors: ['Screening record not found'],
      });
    }

    res.status(200).json({
      success: true,
      data: screening,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  runScreening,
  getScreeningResult,
};
