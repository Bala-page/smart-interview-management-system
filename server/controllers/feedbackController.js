const Feedback = require('../models/Feedback');
const Interview = require('../models/Interview');
const Application = require('../models/Application');
const Job = require('../models/Job');
const User = require('../models/User');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { transitionApplicationStatus } = require('../services/workflowEngineService');

/**
 * @desc    Submit interview feedback
 * @route   POST /api/feedback
 * @access  Private (Assigned Interviewer)
 */
const submitFeedback = async (req, res, next) => {
  try {
    const {
      interviewId,
      technicalRating,
      communicationRating,
      problemSolvingRating,
      roleKnowledgeRating,
      overallRating,
      recommendation,
      comments,
    } = req.body;

    const interview = await Interview.findById(interviewId);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
        errors: ['Invalid interview ID'],
      });
    }

    // Authorization: only assigned interviewer can submit feedback
    if (interview.interviewerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not the assigned interviewer for this interview session.',
        errors: ['Assigned interviewer permission required'],
      });
    }

    // Check if feedback already submitted
    let feedback = await Feedback.findOne({ interviewId, interviewerId: req.user._id });
    if (feedback) {
      return res.status(400).json({
        success: false,
        message: 'Feedback has already been submitted for this interview. Please update the existing feedback instead.',
        errors: ['Duplicate feedback prevented'],
      });
    }

    feedback = await Feedback.create({
      interviewId,
      candidateId: interview.candidateId,
      jobId: interview.jobId,
      interviewerId: req.user._id,
      technicalRating: Number(technicalRating),
      communicationRating: Number(communicationRating),
      problemSolvingRating: Number(problemSolvingRating),
      roleKnowledgeRating: Number(roleKnowledgeRating),
      overallRating: Number(overallRating),
      recommendation,
      comments,
    });

    // Mark interview as completed
    interview.status = 'Completed';
    await interview.save();

    // Transition application to Interview Completed
    try {
      await transitionApplicationStatus(interview.applicationId, 'Interview Completed', req.user);
    } catch (transErr) {
      console.warn('[Feedback] Application transition note:', transErr.message);
    }

    const [candidate, job] = await Promise.all([
      User.findById(interview.candidateId),
      Job.findById(interview.jobId),
    ]);

    // Notify Recruiter
    if (job && job.recruiterId) {
      await createNotification({
        recipientUserId: job.recruiterId,
        type: 'FEEDBACK_SUBMITTED',
        title: 'Interview Feedback Submitted',
        message: `${req.user.name} submitted interview feedback for ${candidate ? candidate.name : 'Candidate'} on "${job.title}". Recommendation: ${recommendation}. Overall Rating: ${overallRating}/5.`,
        relatedEntityType: 'Feedback',
        relatedEntityId: feedback._id,
      });
    }

    await logAudit({
      actorUserId: req.user._id,
      action: 'FEEDBACK_SUBMITTED',
      entityType: 'Feedback',
      entityId: feedback._id,
      metadata: {
        recommendation,
        overallRating,
        candidateName: candidate ? candidate.name : 'Candidate',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Interview feedback submitted successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get feedback for an interview
 * @route   GET /api/feedback/:interviewId
 * @access  Private (Recruiter or Assigned Interviewer)
 */
const getFeedbackByInterview = async (req, res, next) => {
  try {
    const { interviewId } = req.params;

    // Candidates must NEVER access internal interviewer feedback
    if (req.user.role === 'candidate') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: Interviewer feedback is confidential and not accessible to candidates.',
        errors: ['Confidential resource'],
      });
    }

    const feedback = await Feedback.find({ interviewId })
      .populate('interviewerId', 'name email skills')
      .populate('candidateId', 'name email')
      .populate('jobId', 'title');

    res.status(200).json({
      success: true,
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update feedback
 * @route   PUT /api/feedback/:id
 * @access  Private (Interviewer who authored it)
 */
const updateFeedback = async (req, res, next) => {
  try {
    const feedback = await Feedback.findById(req.params.id);
    if (!feedback) {
      return res.status(404).json({
        success: false,
        message: 'Feedback not found',
        errors: ['Invalid feedback ID'],
      });
    }

    if (feedback.interviewerId.toString() !== req.user._id.toString() && req.user.role !== 'recruiter') {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You can only edit your own feedback.',
        errors: ['Unauthorized feedback modification'],
      });
    }

    const updatable = [
      'technicalRating',
      'communicationRating',
      'problemSolvingRating',
      'roleKnowledgeRating',
      'overallRating',
      'recommendation',
      'comments',
    ];

    updatable.forEach((field) => {
      if (req.body[field] !== undefined) {
        feedback[field] = req.body[field];
      }
    });

    await feedback.save();

    await logAudit({
      actorUserId: req.user._id,
      action: 'FEEDBACK_UPDATED',
      entityType: 'Feedback',
      entityId: feedback._id,
      metadata: { recommendation: feedback.recommendation, overallRating: feedback.overallRating },
    });

    res.status(200).json({
      success: true,
      message: 'Feedback updated successfully',
      data: feedback,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByInterview,
  updateFeedback,
};
