const Application = require('../models/Application');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');

// Controlled state transition rules
const ALLOWED_TRANSITIONS = {
  Applied: ['Shortlisted', 'Rejected', 'Hold'],
  Shortlisted: ['Interview Scheduled', 'Rejected', 'Hold', 'Applied'],
  'Interview Scheduled': ['Interview Completed', 'Shortlisted', 'Selected', 'Rejected', 'Hold'],
  'Interview Completed': ['Selected', 'Rejected', 'Hold', 'Interview Scheduled'],
  Hold: ['Shortlisted', 'Interview Scheduled', 'Selected', 'Rejected', 'Applied'],
  Selected: ['Hold', 'Rejected'],
  Rejected: ['Applied', 'Shortlisted', 'Hold'],
};

/**
 * Validates if a transition is permissible
 */
const canTransition = (currentStatus, targetStatus) => {
  if (currentStatus === targetStatus) return true;
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  return allowed.includes(targetStatus);
};

/**
 * Executes a controlled application status transition
 */
const transitionApplicationStatus = async (
  applicationId,
  targetStatus,
  actorUser,
  options = {}
) => {
  const application = await Application.findById(applicationId)
    .populate('candidateId', 'name email')
    .populate('jobId', 'title');

  if (!application) {
    throw new Error('Application not found');
  }

  const currentStatus = application.applicationStatus;

  // Validate transition
  if (!canTransition(currentStatus, targetStatus)) {
    throw new Error(
      `Invalid status transition from '${currentStatus}' to '${targetStatus}'. Allowed transitions: [${(
        ALLOWED_TRANSITIONS[currentStatus] || []
      ).join(', ')}]`
    );
  }

  // Update application fields
  application.applicationStatus = targetStatus;

  if (targetStatus === 'Shortlisted') {
    application.shortlistedAt = new Date();
  }

  if (options.rejectionReason) {
    application.rejectionReason = options.rejectionReason;
  }

  if (['Selected', 'Rejected', 'Hold'].includes(targetStatus)) {
    application.decision = targetStatus;
  } else if (targetStatus === 'Applied') {
    application.decision = 'Pending';
  }

  await application.save();

  // Log audit
  await logAudit({
    actorUserId: actorUser._id,
    action: `APPLICATION_STATUS_TRANSITION_TO_${targetStatus.toUpperCase().replace(/\s+/g, '_')}`,
    entityType: 'Application',
    entityId: application._id,
    metadata: {
      fromStatus: currentStatus,
      toStatus: targetStatus,
      jobTitle: application.jobId ? application.jobId.title : 'Unknown',
      candidateName: application.candidateId ? application.candidateId.name : 'Unknown',
      rejectionReason: options.rejectionReason || null,
    },
  });

  // Notify Candidate
  const candidateId = application.candidateId._id || application.candidateId;
  const jobTitle = application.jobId ? application.jobId.title : 'Job';

  let notifTitle = `Application Status Updated: ${targetStatus}`;
  let notifMessage = `Your application for "${jobTitle}" is now ${targetStatus}.`;
  let notifType = 'SYSTEM_INFO';

  if (targetStatus === 'Shortlisted') {
    notifType = 'CANDIDATE_SHORTLISTED';
    notifTitle = 'Congratulations! You have been shortlisted';
    notifMessage = `Great news! You have been shortlisted for "${jobTitle}". Our recruitment team will schedule an interview soon.`;
  } else if (targetStatus === 'Selected') {
    notifType = 'CANDIDATE_SELECTED';
    notifTitle = 'Congratulations! Job Offer / Selected';
    notifMessage = `Congratulations! You have been selected for the position of "${jobTitle}".`;
  } else if (targetStatus === 'Rejected') {
    notifType = 'CANDIDATE_REJECTED';
    notifTitle = 'Application Status: Not Moving Forward';
    notifMessage = `Thank you for your interest in "${jobTitle}". At this time we have decided to pursue other candidates.`;
  } else if (targetStatus === 'Hold') {
    notifType = 'CANDIDATE_HOLD';
    notifTitle = 'Application Status: On Hold';
    notifMessage = `Your application for "${jobTitle}" has been placed on hold for further review.`;
  }

  await createNotification({
    recipientUserId: candidateId,
    type: notifType,
    title: notifTitle,
    message: notifMessage,
    relatedEntityType: 'Application',
    relatedEntityId: application._id,
  });

  return application;
};

module.exports = {
  ALLOWED_TRANSITIONS,
  canTransition,
  transitionApplicationStatus,
};
