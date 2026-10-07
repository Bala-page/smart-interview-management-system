const Interview = require('../models/Interview');
const Application = require('../models/Application');
const User = require('../models/User');
const Job = require('../models/Job');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');
const { transitionApplicationStatus } = require('../services/workflowEngineService');

// Helper to check time overlap (HH:mm strings)
const timesOverlap = (startA, endA, startB, endB) => {
  return startA < endB && endA > startB;
};

/**
 * Checks for conflicts for an interviewer or candidate on a given date
 */
const checkSchedulingConflict = async ({
  interviewerId,
  candidateId,
  interviewDate,
  startTime,
  endTime,
  excludeInterviewId = null,
}) => {
  // Query active interviews on that date
  const query = {
    interviewDate,
    status: { $in: ['Scheduled', 'Rescheduled'] },
  };

  if (excludeInterviewId) {
    query._id = { $ne: excludeInterviewId };
  }

  const existingInterviews = await Interview.find(query);

  // Check interviewer conflict
  const interviewerConflict = existingInterviews.find(
    (item) =>
      item.interviewerId.toString() === interviewerId.toString() &&
      timesOverlap(startTime, endTime, item.startTime, item.endTime)
  );

  if (interviewerConflict) {
    return {
      hasConflict: true,
      type: 'INTERVIEWER_CONFLICT',
      message: `Conflict detected: The selected interviewer is already scheduled for an interview on ${interviewDate} between ${interviewerConflict.startTime} and ${interviewerConflict.endTime}.`,
    };
  }

  // Check candidate conflict
  const candidateConflict = existingInterviews.find(
    (item) =>
      item.candidateId.toString() === candidateId.toString() &&
      timesOverlap(startTime, endTime, item.startTime, item.endTime)
  );

  if (candidateConflict) {
    return {
      hasConflict: true,
      type: 'CANDIDATE_CONFLICT',
      message: `Conflict detected: The candidate already has an interview scheduled on ${interviewDate} between ${candidateConflict.startTime} and ${candidateConflict.endTime}.`,
    };
  }

  return { hasConflict: false };
};

/**
 * @desc    Schedule a new interview
 * @route   POST /api/interviews
 * @access  Private (Recruiter)
 */
const scheduleInterview = async (req, res, next) => {
  try {
    const {
      applicationId,
      candidateId,
      jobId,
      interviewerId,
      interviewDate,
      startTime,
      endTime,
      interviewType = 'Technical',
      locationOrMeetingInfo,
      notes = '',
    } = req.body;

    if (!applicationId || !candidateId || !jobId || !interviewerId || !interviewDate || !startTime || !endTime) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required scheduling fields (applicationId, candidateId, jobId, interviewerId, interviewDate, startTime, endTime)',
        errors: ['Missing required fields'],
      });
    }

    if (startTime >= endTime) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time',
        errors: ['Invalid time slot'],
      });
    }

    // Check conflict
    const conflict = await checkSchedulingConflict({
      interviewerId,
      candidateId,
      interviewDate,
      startTime,
      endTime,
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        message: conflict.message,
        errors: [conflict.type],
      });
    }

    const interview = await Interview.create({
      applicationId,
      candidateId,
      jobId,
      interviewerId,
      interviewDate,
      startTime,
      endTime,
      interviewType,
      locationOrMeetingInfo,
      notes,
      status: 'Scheduled',
    });

    // Update application status
    try {
      await transitionApplicationStatus(applicationId, 'Interview Scheduled', req.user);
    } catch (err) {
      console.warn('[Interview Scheduling] Application transition note:', err.message);
    }

    const [candidate, interviewer, job] = await Promise.all([
      User.findById(candidateId),
      User.findById(interviewerId),
      Job.findById(jobId),
    ]);

    const jobTitle = job ? job.title : 'Position';

    // Notify Interviewer
    await createNotification({
      recipientUserId: interviewerId,
      type: 'INTERVIEW_SCHEDULED',
      title: 'New Interview Assignment',
      message: `You have been assigned to conduct a ${interviewType} interview with ${candidate ? candidate.name : 'Candidate'} for "${jobTitle}" on ${interviewDate} from ${startTime} to ${endTime}.`,
      relatedEntityType: 'Interview',
      relatedEntityId: interview._id,
    });

    // Notify Candidate
    await createNotification({
      recipientUserId: candidateId,
      type: 'INTERVIEW_SCHEDULED',
      title: 'Interview Scheduled',
      message: `Your ${interviewType} interview for "${jobTitle}" is scheduled on ${interviewDate} from ${startTime} to ${endTime}. Meeting info: ${locationOrMeetingInfo}.`,
      relatedEntityType: 'Interview',
      relatedEntityId: interview._id,
    });

    await logAudit({
      actorUserId: req.user._id,
      action: 'INTERVIEW_SCHEDULED',
      entityType: 'Interview',
      entityId: interview._id,
      metadata: {
        date: interviewDate,
        time: `${startTime}-${endTime}`,
        interviewer: interviewer ? interviewer.name : 'Interviewer',
        candidate: candidate ? candidate.name : 'Candidate',
      },
    });

    res.status(201).json({
      success: true,
      message: 'Interview scheduled successfully',
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get interviews with filters and pagination
 * @route   GET /api/interviews
 * @access  Private
 */
const getInterviews = async (req, res, next) => {
  try {
    const {
      status,
      interviewDate,
      interviewerId,
      candidateId,
      jobId,
      page = 1,
      limit = 10,
      sort = '-interviewDate',
    } = req.query;

    const query = {};

    // Role scoping
    if (req.user.role === 'candidate') {
      query.candidateId = req.user._id;
    } else if (req.user.role === 'interviewer') {
      query.interviewerId = req.user._id;
    } else {
      if (interviewerId) query.interviewerId = interviewerId;
      if (candidateId) query.candidateId = candidateId;
      if (jobId) query.jobId = jobId;
    }

    if (status) query.status = status;
    if (interviewDate) query.interviewDate = interviewDate;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const [interviews, total] = await Promise.all([
      Interview.find(query)
        .populate('candidateId', 'name email phone location skills experience resumeFileId')
        .populate('interviewerId', 'name email skills')
        .populate('jobId', 'title location employmentType requiredSkills')
        .populate('applicationId', 'applicationStatus screeningScore')
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Interview.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      data: interviews,
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
 * @desc    Get interview details by ID
 * @route   GET /api/interviews/:id
 * @access  Private
 */
const getInterviewById = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id)
      .populate('candidateId', 'name email phone location skills experience bio resumeFileId')
      .populate('interviewerId', 'name email skills location')
      .populate('jobId', 'title description location requiredSkills minimumExperience employmentType')
      .populate('applicationId');

    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
        errors: ['Interview ID does not exist'],
      });
    }

    // Role check
    if (
      req.user.role === 'candidate' &&
      interview.candidateId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You cannot view other candidates\' interviews.',
        errors: ['Unauthorized interview access'],
      });
    }

    if (
      req.user.role === 'interviewer' &&
      interview.interviewerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not assigned to this interview.',
        errors: ['Unauthorized interviewer access'],
      });
    }

    res.status(200).json({
      success: true,
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update / Reschedule interview
 * @route   PUT /api/interviews/:id
 * @access  Private (Recruiter)
 */
const updateInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
        errors: ['Interview ID does not exist'],
      });
    }

    const {
      interviewDate,
      startTime,
      endTime,
      interviewerId,
      interviewType,
      locationOrMeetingInfo,
      notes,
    } = req.body;

    const targetDate = interviewDate || interview.interviewDate;
    const targetStart = startTime || interview.startTime;
    const targetEnd = endTime || interview.endTime;
    const targetInterviewer = interviewerId || interview.interviewerId;

    if (targetStart >= targetEnd) {
      return res.status(400).json({
        success: false,
        message: 'Start time must be before end time',
        errors: ['Invalid time slot'],
      });
    }

    // Check conflicts if schedule parameters are changing
    const conflict = await checkSchedulingConflict({
      interviewerId: targetInterviewer,
      candidateId: interview.candidateId,
      interviewDate: targetDate,
      startTime: targetStart,
      endTime: targetEnd,
      excludeInterviewId: interview._id,
    });

    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        message: conflict.message,
        errors: [conflict.type],
      });
    }

    const isRescheduled =
      (interviewDate && interviewDate !== interview.interviewDate) ||
      (startTime && startTime !== interview.startTime) ||
      (endTime && endTime !== interview.endTime);

    interview.interviewDate = targetDate;
    interview.startTime = targetStart;
    interview.endTime = targetEnd;
    interview.interviewerId = targetInterviewer;
    if (interviewType) interview.interviewType = interviewType;
    if (locationOrMeetingInfo) interview.locationOrMeetingInfo = locationOrMeetingInfo;
    if (notes !== undefined) interview.notes = notes;

    if (isRescheduled) {
      interview.status = 'Rescheduled';
    }

    await interview.save();

    if (isRescheduled) {
      // Notify both
      await createNotification({
        recipientUserId: interview.candidateId,
        type: 'INTERVIEW_RESCHEDULED',
        title: 'Interview Rescheduled',
        message: `Your interview has been rescheduled to ${targetDate} from ${targetStart} to ${targetEnd}.`,
        relatedEntityType: 'Interview',
        relatedEntityId: interview._id,
      });

      await createNotification({
        recipientUserId: targetInterviewer,
        type: 'INTERVIEW_RESCHEDULED',
        title: 'Interview Assignment Rescheduled',
        message: `Your assigned interview has been rescheduled to ${targetDate} from ${targetStart} to ${targetEnd}.`,
        relatedEntityType: 'Interview',
        relatedEntityId: interview._id,
      });
    }

    await logAudit({
      actorUserId: req.user._id,
      action: isRescheduled ? 'INTERVIEW_RESCHEDULED' : 'INTERVIEW_UPDATED',
      entityType: 'Interview',
      entityId: interview._id,
      metadata: { targetDate, targetStart, targetEnd },
    });

    res.status(200).json({
      success: true,
      message: 'Interview updated successfully',
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update interview status (Scheduled/Completed/Cancelled)
 * @route   PUT /api/interviews/:id/status
 * @access  Private (Recruiter or Assigned Interviewer)
 */
const updateInterviewStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'].includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status. Must be Scheduled, Completed, Cancelled, or Rescheduled',
        errors: ['Invalid status enum'],
      });
    }

    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
        errors: ['Interview ID does not exist'],
      });
    }

    // Role check: Interviewer can only mark their own assigned interview as Completed
    if (req.user.role === 'interviewer') {
      if (interview.interviewerId.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: 'Forbidden: You can only update status for your assigned interviews.',
          errors: ['Unauthorized interviewer access'],
        });
      }
    }

    interview.status = status;
    await interview.save();

    // If completed, update application status
    if (status === 'Completed') {
      try {
        await transitionApplicationStatus(interview.applicationId, 'Interview Completed', req.user);
      } catch (err) {
        console.warn('[Interview Status] Transition note:', err.message);
      }
    }

    await logAudit({
      actorUserId: req.user._id,
      action: `INTERVIEW_STATUS_UPDATED_TO_${status.toUpperCase()}`,
      entityType: 'Interview',
      entityId: interview._id,
      metadata: { status },
    });

    res.status(200).json({
      success: true,
      message: `Interview status updated to ${status}`,
      data: interview,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete / Cancel interview
 * @route   DELETE /api/interviews/:id
 * @access  Private (Recruiter)
 */
const deleteInterview = async (req, res, next) => {
  try {
    const interview = await Interview.findById(req.params.id);
    if (!interview) {
      return res.status(404).json({
        success: false,
        message: 'Interview not found',
        errors: ['Interview ID does not exist'],
      });
    }

    await Interview.findByIdAndDelete(req.params.id);

    await logAudit({
      actorUserId: req.user._id,
      action: 'INTERVIEW_DELETED',
      entityType: 'Interview',
      entityId: interview._id,
      metadata: { interviewDate: interview.interviewDate },
    });

    res.status(200).json({
      success: true,
      message: 'Interview removed successfully',
      data: { id: req.params.id },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  scheduleInterview,
  getInterviews,
  getInterviewById,
  updateInterview,
  updateInterviewStatus,
  deleteInterview,
};
