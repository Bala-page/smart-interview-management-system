const AssessmentAttempt = require('../models/AssessmentAttempt');
const Assessment = require('../models/Assessment');
const Application = require('../models/Application');
const { createNotification } = require('./notificationService');
const { logAudit } = require('./auditService');
const { transitionApplicationStatus } = require('./workflowEngineService');

/**
 * Idempotently evaluates an assessment attempt and persists results.
 *
 * @param {string|ObjectId} attemptId
 * @param {Object} [options]
 * @param {string} [options.submissionReason]
 * @param {Object} [options.actorUser]
 * @returns {Promise<Object>} evaluated attempt document
 */
const evaluateAttempt = async (attemptId, options = {}) => {
  const attempt = await AssessmentAttempt.findById(attemptId)
    .populate('candidateId', 'name email role')
    .populate('jobId', 'title department recruiterId')
    .populate('assessmentId');

  if (!attempt) {
    throw new Error('Assessment attempt not found');
  }

  // If already evaluated, return existing finalized record (idempotency)
  if (attempt.evaluationStatus === 'Completed' && attempt.status === 'Evaluated') {
    return attempt;
  }

  const assessment = attempt.assessmentId;
  const passingPercentage = assessment?.passingPercentage ?? 60;
  const questionsSnapshot = attempt.questionsSnapshot || [];
  const candidateAnswers = attempt.answers || [];

  // Map candidate answers by questionId string
  const answerMap = new Map();
  candidateAnswers.forEach((ans) => {
    if (ans.questionId) {
      answerMap.set(ans.questionId.toString(), ans.selectedOptionId);
    }
  });

  let totalScore = 0;
  let totalPossibleMarks = 0;
  let correctCount = 0;
  let incorrectCount = 0;
  let unansweredCount = 0;

  // Track skill breakdown
  const skillStats = {};

  questionsSnapshot.forEach((q) => {
    const qMarks = Number(q.marks) || 1;
    totalPossibleMarks += qMarks;

    const skill = q.skill || 'General';
    if (!skillStats[skill]) {
      skillStats[skill] = {
        skill,
        totalQuestions: 0,
        correctCount: 0,
        score: 0,
        totalPossible: 0,
      };
    }
    skillStats[skill].totalQuestions += 1;
    skillStats[skill].totalPossible += qMarks;

    const qIdStr = (q.questionId?._id || q.questionId).toString();
    const candidateSelected = answerMap.get(qIdStr);

    if (!candidateSelected) {
      unansweredCount++;
    } else if (candidateSelected === q.correctAnswer) {
      correctCount++;
      totalScore += qMarks;
      skillStats[skill].correctCount += 1;
      skillStats[skill].score += qMarks;
    } else {
      incorrectCount++;
    }
  });

  const percentage = totalPossibleMarks > 0
    ? Math.round(((totalScore / totalPossibleMarks) * 100) * 100) / 100
    : 0;

  const passed = percentage >= passingPercentage;

  // Format skill-wise results
  const skillWiseResults = Object.values(skillStats).map((st) => ({
    skill: st.skill,
    totalQuestions: st.totalQuestions,
    correctCount: st.correctCount,
    score: st.score,
    percentage: st.totalPossible > 0
      ? Math.round(((st.score / st.totalPossible) * 100) * 100) / 100
      : 0,
  }));

  // Update attempt fields
  attempt.score = totalScore;
  attempt.totalMarks = totalPossibleMarks;
  attempt.percentage = percentage;
  attempt.passed = passed;
  attempt.skillWiseResults = skillWiseResults;
  attempt.evaluationStatus = 'Completed';
  attempt.status = 'Evaluated';

  if (!attempt.submittedAt) {
    attempt.submittedAt = new Date();
  }

  if (attempt.startedAt) {
    attempt.durationSeconds = Math.max(
      0,
      Math.floor((attempt.submittedAt.getTime() - new Date(attempt.startedAt).getTime()) / 1000)
    );
  }

  if (options.submissionReason) {
    attempt.submissionReason = options.submissionReason;
  }

  await attempt.save();

  // Update Application model with assessment results
  const application = await Application.findById(attempt.applicationId);
  if (application) {
    application.assessmentAttemptId = attempt._id;
    application.assessmentScore = totalScore;
    application.assessmentPercentage = percentage;
    application.assessmentPassed = passed;

    // Transition application status if currently 'Assessment Assigned'
    if (application.applicationStatus === 'Assessment Assigned') {
      try {
        await transitionApplicationStatus(
          application._id,
          'Assessment Completed',
          options.actorUser || attempt.candidateId,
          { note: `Assessment evaluated: ${totalScore}/${totalPossibleMarks} (${percentage}%)` }
        );
      } catch (err) {
        // Fallback direct update if workflow transition is bypassed
        application.applicationStatus = 'Assessment Completed';
        await application.save();
      }
    } else {
      await application.save();
    }
  }

  // Send notifications
  try {
    // 1. Notify Candidate
    await createNotification({
      recipientUserId: attempt.candidateId._id || attempt.candidateId,
      type: 'ASSESSMENT_EVALUATED',
      title: 'Assessment Evaluation Completed',
      message: `Your assessment for "${attempt.jobId?.title || 'Job'}" has been completed and evaluated.`,
      relatedEntityType: 'AssessmentAttempt',
      relatedEntityId: attempt._id,
    });

    // 2. Notify Recruiter
    const recruiterId = attempt.jobId?.recruiterId || assessment?.createdBy;
    if (recruiterId) {
      await createNotification({
        recipientUserId: recruiterId,
        type: 'ASSESSMENT_SUBMITTED',
        title: 'Candidate Assessment Completed',
        message: `${attempt.candidateId?.name || 'Candidate'} scored ${totalScore}/${totalPossibleMarks} (${percentage}%) on "${attempt.jobId?.title || 'Job'}". Status: ${passed ? 'PASSED' : 'FAILED'}.`,
        relatedEntityType: 'AssessmentAttempt',
        relatedEntityId: attempt._id,
      });
    }
  } catch (notifErr) {
    console.warn('[AssessmentEvaluation] Notification sending failed:', notifErr.message);
  }

  // Audit log
  try {
    await logAudit({
      actorUserId: options.actorUser?._id || attempt.candidateId?._id || attempt.candidateId,
      action: 'ASSESSMENT_EVALUATED',
      entityType: 'AssessmentAttempt',
      entityId: attempt._id,
      metadata: {
        score: totalScore,
        totalMarks: totalPossibleMarks,
        percentage,
        passed,
        submissionReason: attempt.submissionReason,
      },
    });
  } catch (auditErr) {
    console.warn('[AssessmentEvaluation] Audit log failed:', auditErr.message);
  }

  return attempt;
};

module.exports = {
  evaluateAttempt,
};
