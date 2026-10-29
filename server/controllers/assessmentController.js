const Assessment = require('../models/Assessment');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const Job = require('../models/Job');
const Application = require('../models/Application');
const { selectAssessmentQuestions } = require('../services/questionSelectionService');
const { evaluateAttempt } = require('../services/assessmentEvaluationService');
const { createNotification } = require('../services/notificationService');
const { logAudit } = require('../services/auditService');

/**
 * Strips correctAnswer and explanation from question snapshot for candidate security
 */
const sanitizeQuestionsForCandidate = (snapshot = []) => {
  return snapshot.map((q) => ({
    questionId: q.questionId,
    questionText: q.questionText,
    skill: q.skill,
    difficulty: q.difficulty,
    marks: q.marks,
    options: q.options.map((opt) => ({ id: opt.id, text: opt.text })),
  }));
};

/**
 * Assign an assessment to a candidate for an application (Recruiter only)
 */
const assignAssessment = async (req, res, next) => {
  try {
    const {
      jobId,
      candidateId,
      applicationId,
      title,
      description,
      durationMinutes = 15,
      passingPercentage = 60,
      resultVisibility = 'Immediate',
      questionDistribution = { easy: 3, medium: 5, hard: 2 },
    } = req.body;

    if (!jobId || !candidateId || !applicationId) {
      return res.status(400).json({
        success: false,
        message: 'jobId, candidateId, and applicationId are required',
      });
    }

    const [job, application] = await Promise.all([
      Job.findById(jobId),
      Application.findById(applicationId).populate('candidateId', 'name email'),
    ]);

    if (!job) {
      return res.status(404).json({ success: false, message: 'Job not found' });
    }

    if (!application) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    // Check if there is an active (Assigned or In Progress) attempt already
    const existingActiveAttempt = await AssessmentAttempt.findOne({
      applicationId,
      status: { $in: ['Assigned', 'In Progress'] },
    });

    if (existingActiveAttempt) {
      return res.status(400).json({
        success: false,
        message: 'An active assessment is already assigned to this candidate for this application.',
        data: { attemptId: existingActiveAttempt._id, status: existingActiveAttempt.status },
      });
    }

    // Check skills
    const requiredSkills = (job.requiredSkills && job.requiredSkills.length > 0)
      ? job.requiredSkills
      : ['JavaScript', 'React', 'Node.js'];

    // Select 10 questions using the selection service
    let snapshot;
    try {
      snapshot = await selectAssessmentQuestions(requiredSkills, questionDistribution);
    } catch (selectionErr) {
      return res.status(400).json({
        success: false,
        message: selectionErr.message,
      });
    }

    // Create or find Assessment definition
    let assessment = await Assessment.findOne({ jobId, isActive: true });
    if (!assessment) {
      assessment = await Assessment.create({
        jobId,
        title: title || `${job.title} Online Technical Assessment`,
        description: description || `10-question MCQ assessment evaluating ${requiredSkills.join(', ')}.`,
        durationMinutes: Number(durationMinutes) || 15,
        totalQuestions: 10,
        totalMarks: 10,
        questionDistribution,
        requiredSkills,
        passingPercentage: Number(passingPercentage) || 60,
        resultVisibility,
        createdBy: req.user._id,
      });
    }

    // Create Attempt
    const attempt = await AssessmentAttempt.create({
      assessmentId: assessment._id,
      applicationId,
      candidateId,
      jobId,
      questionsSnapshot: snapshot,
      answers: [],
      status: 'Assigned',
      totalMarks: snapshot.reduce((sum, q) => sum + (q.marks || 1), 0),
      resultVisibility,
    });

    // Update Application status
    application.applicationStatus = 'Assessment Assigned';
    application.assessmentAttemptId = attempt._id;
    await application.save();

    // Send notification to candidate
    try {
      await createNotification({
        recipientUserId: candidateId,
        type: 'ASSESSMENT_ASSIGNED',
        title: 'Online Assessment Assigned',
        message: `You have been invited to complete the 15-minute technical assessment for "${job.title}".`,
        relatedEntityType: 'AssessmentAttempt',
        relatedEntityId: attempt._id,
      });
    } catch (e) {
      console.warn('Failed to send assessment assigned notification:', e.message);
    }

    // Audit log
    await logAudit({
      actorUserId: req.user._id,
      action: 'ASSESSMENT_ASSIGNED',
      entityType: 'AssessmentAttempt',
      entityId: attempt._id,
      metadata: { jobId, candidateId, applicationId },
    });

    return res.status(201).json({
      success: true,
      message: 'Assessment successfully assigned to candidate',
      data: {
        attemptId: attempt._id,
        status: attempt.status,
        durationMinutes: assessment.durationMinutes,
        totalQuestions: attempt.questionsSnapshot.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all attempts for recruiter with comprehensive filters and search
 */
const getRecruiterAttempts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      jobId = '',
      status = '',
      passed,
      minScore,
      maxScore,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    if (jobId) {
      query.jobId = jobId;
    }

    if (status) {
      query.status = status;
    }

    if (passed !== undefined && passed !== '') {
      query.passed = passed === 'true' || passed === true;
    }

    if (minScore !== undefined && minScore !== '') {
      query.score = { ...query.score, $gte: Number(minScore) };
    }

    if (maxScore !== undefined && maxScore !== '') {
      query.score = { ...query.score, $lte: Number(maxScore) };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    // First fetch candidate attempts with population
    let attemptsQuery = AssessmentAttempt.find(query)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title department')
      .populate('applicationId', 'screeningScore appliedDate applicationStatus')
      .sort(sortOptions);

    let attempts = await attemptsQuery.lean();

    // If search text provided, filter in memory across candidate name, email, or job title
    if (search && search.trim()) {
      const s = search.trim().toLowerCase();
      attempts = attempts.filter((att) => {
        const cName = att.candidateId?.name?.toLowerCase() || '';
        const cEmail = att.candidateId?.email?.toLowerCase() || '';
        const jTitle = att.jobId?.title?.toLowerCase() || '';
        return cName.includes(s) || cEmail.includes(s) || jTitle.includes(s);
      });
    }

    const total = attempts.length;
    const paginatedAttempts = attempts.slice(skip, skip + limitNum);

    // Compute KPI stats for Recruiter Overview
    const allAttempts = await AssessmentAttempt.find(jobId ? { jobId } : {}).lean();
    const stats = {
      total: allAttempts.length,
      assigned: allAttempts.filter((a) => a.status === 'Assigned').length,
      inProgress: allAttempts.filter((a) => a.status === 'In Progress').length,
      submitted: allAttempts.filter((a) => a.status === 'Submitted').length,
      autoSubmitted: allAttempts.filter((a) => a.status === 'Auto Submitted').length,
      terminated: allAttempts.filter((a) => a.status === 'Terminated').length,
      evaluated: allAttempts.filter((a) => a.status === 'Evaluated').length,
      passed: allAttempts.filter((a) => a.passed === true).length,
      failed: allAttempts.filter((a) => a.status === 'Evaluated' && a.passed === false).length,
      avgScore: allAttempts.filter((a) => a.status === 'Evaluated').length > 0
        ? Math.round(
            (allAttempts
              .filter((a) => a.status === 'Evaluated')
              .reduce((sum, a) => sum + (a.percentage || 0), 0) /
              allAttempts.filter((a) => a.status === 'Evaluated').length) * 10
          ) / 10
        : 0,
    };

    return res.status(200).json({
      success: true,
      data: {
        attempts: paginatedAttempts,
        stats,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum) || 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get candidate's assigned assessments (Candidate only)
 */
const getMyAssessments = async (req, res, next) => {
  try {
    const attempts = await AssessmentAttempt.find({ candidateId: req.user._id })
      .populate('jobId', 'title department location requiredSkills')
      .populate('assessmentId', 'durationMinutes passingPercentage title description')
      .populate('applicationId', 'applicationStatus')
      .sort({ createdAt: -1 })
      .lean();

    // Map attempts, masking sensitive fields if test is still active
    const sanitized = attempts.map((att) => {
      const isFinalized = ['Submitted', 'Auto Submitted', 'Terminated', 'Evaluated'].includes(att.status);
      return {
        _id: att._id,
        assessmentId: att.assessmentId,
        jobId: att.jobId,
        applicationId: att.applicationId,
        status: att.status,
        startedAt: att.startedAt,
        expiresAt: att.expiresAt,
        submittedAt: att.submittedAt,
        durationSeconds: att.durationSeconds,
        totalQuestions: att.questionsSnapshot?.length || 10,
        totalMarks: att.totalMarks || 10,
        score: isFinalized ? att.score : undefined,
        percentage: isFinalized ? att.percentage : undefined,
        passed: isFinalized ? att.passed : undefined,
        skillWiseResults: isFinalized ? att.skillWiseResults : undefined,
        violationCount: att.violationCount,
        submissionReason: att.submissionReason,
        resultVisibility: att.resultVisibility,
        createdAt: att.createdAt,
      };
    });

    return res.status(200).json({
      success: true,
      data: sanitized,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Start assessment attempt (Candidate only)
 */
const startAttempt = async (req, res, next) => {
  try {
    const attempt = await AssessmentAttempt.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
    }).populate('assessmentId').populate('jobId', 'title');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    if (['Submitted', 'Auto Submitted', 'Terminated', 'Evaluated'].includes(attempt.status)) {
      return res.status(400).json({
        success: false,
        message: `This assessment has already been finalized with status "${attempt.status}".`,
      });
    }

    const durationMinutes = attempt.assessmentId?.durationMinutes || 15;
    const now = new Date();

    if (attempt.status === 'Assigned') {
      attempt.startedAt = now;
      attempt.expiresAt = new Date(now.getTime() + durationMinutes * 60 * 1000);
      attempt.status = 'In Progress';
      await attempt.save();

      await logAudit({
        actorUserId: req.user._id,
        action: 'ASSESSMENT_STARTED',
        entityType: 'AssessmentAttempt',
        entityId: attempt._id,
        metadata: { startedAt: attempt.startedAt, expiresAt: attempt.expiresAt },
      });
    }

    // Check if time expired while In Progress
    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      // Auto submit immediately
      const evaluated = await evaluateAttempt(attempt._id, {
        submissionReason: 'Time Expired',
        actorUser: req.user,
      });
      return res.status(200).json({
        success: true,
        expired: true,
        message: 'Assessment time has expired.',
        data: {
          attemptId: evaluated._id,
          status: evaluated.status,
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Assessment started successfully',
      data: {
        attemptId: attempt._id,
        jobTitle: attempt.jobId?.title,
        assessmentTitle: attempt.assessmentId?.title,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        durationMinutes,
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
        questions: sanitizeQuestionsForCandidate(attempt.questionsSnapshot),
        answers: attempt.answers || [],
        violationCount: attempt.violationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get active assessment test state (recovery or refresh)
 */
const getAttemptForTaking = async (req, res, next) => {
  try {
    const attempt = await AssessmentAttempt.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
    }).populate('assessmentId').populate('jobId', 'title');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    // If finalized, notify candidate
    if (['Submitted', 'Auto Submitted', 'Terminated', 'Evaluated'].includes(attempt.status)) {
      return res.status(200).json({
        success: true,
        finalized: true,
        message: `Assessment is already finalized (${attempt.status})`,
        data: {
          attemptId: attempt._id,
          status: attempt.status,
          submissionReason: attempt.submissionReason,
        },
      });
    }

    if (attempt.status === 'Assigned') {
      return res.status(200).json({
        success: true,
        notStarted: true,
        data: {
          attemptId: attempt._id,
          jobTitle: attempt.jobId?.title,
          durationMinutes: attempt.assessmentId?.durationMinutes || 15,
          totalQuestions: attempt.questionsSnapshot.length,
          status: 'Assigned',
        },
      });
    }

    // Check expiry
    const remainingMs = new Date(attempt.expiresAt).getTime() - Date.now();
    if (remainingMs <= 0) {
      const evaluated = await evaluateAttempt(attempt._id, {
        submissionReason: 'Time Expired',
        actorUser: req.user,
      });
      return res.status(200).json({
        success: true,
        finalized: true,
        expired: true,
        message: 'Assessment time has expired.',
        data: {
          attemptId: evaluated._id,
          status: evaluated.status,
        },
      });
    }

    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        jobTitle: attempt.jobId?.title,
        assessmentTitle: attempt.assessmentId?.title,
        status: attempt.status,
        startedAt: attempt.startedAt,
        expiresAt: attempt.expiresAt,
        remainingSeconds: Math.max(0, Math.floor(remainingMs / 1000)),
        questions: sanitizeQuestionsForCandidate(attempt.questionsSnapshot),
        answers: attempt.answers || [],
        violationCount: attempt.violationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Save candidate answers (Autosave every 30s & debounced on selection change)
 */
const saveAnswers = async (req, res, next) => {
  try {
    const { answers } = req.body;
    const attempt = await AssessmentAttempt.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    if (attempt.status !== 'In Progress') {
      return res.status(400).json({
        success: false,
        message: `Cannot save answers. Attempt status is "${attempt.status}".`,
      });
    }

    // Verify deadline (+5s grace period for in-flight requests)
    const gracePeriodMs = 5000;
    if (Date.now() > new Date(attempt.expiresAt).getTime() + gracePeriodMs) {
      // Deadline has passed: finalize attempt
      await evaluateAttempt(attempt._id, {
        submissionReason: 'Time Expired',
        actorUser: req.user,
      });
      return res.status(400).json({
        success: false,
        expired: true,
        message: 'Assessment time has expired. Answers rejected and test finalized.',
      });
    }

    if (Array.isArray(answers)) {
      // Merge or replace answers cleanly
      const existingAnswerMap = new Map();
      (attempt.answers || []).forEach((a) => {
        existingAnswerMap.set(a.questionId.toString(), a);
      });

      const now = new Date();
      answers.forEach((ans) => {
        if (ans.questionId) {
          const qIdStr = ans.questionId.toString();
          existingAnswerMap.set(qIdStr, {
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId || null,
            savedAt: now,
          });
        }
      });

      attempt.answers = Array.from(existingAnswerMap.values());
      await attempt.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Answers persisted successfully',
      savedAt: new Date().toISOString(),
      answersCount: (attempt.answers || []).filter((a) => Boolean(a.selectedOptionId)).length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Record a fullscreen exit or tab blur violation event
 */
const recordViolation = async (req, res, next) => {
  try {
    const { eventType = 'visibilitychange', description = '' } = req.body;

    const attempt = await AssessmentAttempt.findOne({
      _id: req.params.id,
      candidateId: req.user._id,
    });

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    if (attempt.status !== 'In Progress') {
      return res.status(200).json({
        success: true,
        message: 'Assessment is not active; violation ignored',
        terminated: attempt.status === 'Terminated',
      });
    }

    // Deduplicate rapid duplicate events (within 1.5 seconds)
    const now = new Date();
    const lastEvent = attempt.violationEvents[attempt.violationEvents.length - 1];
    if (lastEvent && now.getTime() - new Date(lastEvent.timestamp).getTime() < 1500) {
      return res.status(200).json({
        success: true,
        deduplicated: true,
        violationCount: attempt.violationCount,
        terminated: false,
      });
    }

    attempt.violationCount = (attempt.violationCount || 0) + 1;
    const currentViolationNum = attempt.violationCount;

    attempt.violationEvents.push({
      eventType: ['visibilitychange', 'blur', 'fullscreen_exit'].includes(eventType)
        ? eventType
        : 'suspicious_activity',
      timestamp: now,
      violationNumber: currentViolationNum,
      description: description || `Violation #${currentViolationNum}: ${eventType}`,
    });

    // Check 3rd violation threshold
    if (attempt.violationCount >= 3) {
      attempt.status = 'Terminated';
      attempt.submissionReason = 'Maximum Tab Violations';
      attempt.submittedAt = now;
      await attempt.save();

      // Instantly evaluate attempt
      await evaluateAttempt(attempt._id, {
        submissionReason: 'Maximum Tab Violations',
        actorUser: req.user,
      });

      return res.status(200).json({
        success: true,
        terminated: true,
        violationCount: attempt.violationCount,
        message: 'Assessment terminated due to exceeding maximum allowed violations (3).',
      });
    }

    await attempt.save();

    return res.status(200).json({
      success: true,
      terminated: false,
      violationCount: attempt.violationCount,
      message: `Violation recorded (${attempt.violationCount}/3). Warning issued.`,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Submit assessment (Manual or Time Expired)
 */
const submitAssessment = async (req, res, next) => {
  try {
    const { submissionReason = 'Manual Submission', answers } = req.body;

    const attempt = await AssessmentAttempt.findById(req.params.id);

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    // Role check: Only the candidate or a recruiter can submit
    if (req.user.role === 'candidate' && attempt.candidateId.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized to submit this attempt' });
    }

    // If already finalized, return evaluated attempt directly (idempotent)
    if (['Submitted', 'Auto Submitted', 'Terminated', 'Evaluated'].includes(attempt.status)) {
      return res.status(200).json({
        success: true,
        message: 'Assessment was already submitted',
        data: attempt,
      });
    }

    // Save final answers if provided in submission payload
    if (Array.isArray(answers) && answers.length > 0) {
      const existingMap = new Map();
      (attempt.answers || []).forEach((a) => existingMap.set(a.questionId.toString(), a));
      answers.forEach((ans) => {
        if (ans.questionId) {
          existingMap.set(ans.questionId.toString(), {
            questionId: ans.questionId,
            selectedOptionId: ans.selectedOptionId || null,
            savedAt: new Date(),
          });
        }
      });
      attempt.answers = Array.from(existingMap.values());
    }

    const finalReason = submissionReason === 'Time Expired'
      ? 'Time Expired'
      : submissionReason === 'Maximum Tab Violations'
      ? 'Maximum Tab Violations'
      : submissionReason === 'Recruiter Termination'
      ? 'Recruiter Termination'
      : 'Manual Submission';

    attempt.status = finalReason === 'Time Expired' ? 'Auto Submitted' : 'Submitted';
    attempt.submissionReason = finalReason;
    attempt.submittedAt = new Date();
    await attempt.save();

    // Trigger instant server-side evaluation
    const evaluatedAttempt = await evaluateAttempt(attempt._id, {
      submissionReason: finalReason,
      actorUser: req.user,
    });

    return res.status(200).json({
      success: true,
      message: 'Assessment submitted and evaluated successfully',
      data: evaluatedAttempt,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get assessment result with role-based visibility enforcement
 */
const getAttemptResult = async (req, res, next) => {
  try {
    const attempt = await AssessmentAttempt.findById(req.params.id)
      .populate('candidateId', 'name email')
      .populate('jobId', 'title department requiredSkills')
      .populate('assessmentId', 'title durationMinutes passingPercentage resultVisibility')
      .populate('applicationId', 'screeningScore appliedDate applicationStatus');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    const isRecruiter = req.user.role === 'recruiter';
    const isInterviewer = req.user.role === 'interviewer';
    const isCandidate = req.user.role === 'candidate';

    // Candidate authorization check
    if (isCandidate && attempt.candidateId._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Forbidden: Access to another candidate result is denied' });
    }

    // Recruiters and Interviewers have full access to complete breakdown
    if (isRecruiter || isInterviewer) {
      // Build question-by-question review with candidate answer vs correct answer
      const answerMap = new Map();
      (attempt.answers || []).forEach((a) => answerMap.set(a.questionId.toString(), a.selectedOptionId));

      const detailedQuestions = (attempt.questionsSnapshot || []).map((q) => {
        const qIdStr = q.questionId.toString();
        const candidateSelected = answerMap.get(qIdStr) || null;
        return {
          questionId: q.questionId,
          questionText: q.questionText,
          skill: q.skill,
          difficulty: q.difficulty,
          marks: q.marks,
          options: q.options,
          correctAnswer: q.correctAnswer,
          candidateAnswer: candidateSelected,
          isCorrect: candidateSelected === q.correctAnswer,
          explanation: q.explanation,
        };
      });

      return res.status(200).json({
        success: true,
        data: {
          attempt: {
            ...attempt.toObject(),
            questionsReview: detailedQuestions,
          },
        },
      });
    }

    // Candidate view: check result visibility policy
    const visibility = attempt.resultVisibility || attempt.assessmentId?.resultVisibility || 'Immediate';

    if (visibility === 'Hidden') {
      return res.status(200).json({
        success: true,
        data: {
          attemptId: attempt._id,
          status: attempt.status,
          visibility: 'Hidden',
          message: 'Your assessment has been submitted successfully. Scores are retained by the hiring team.',
        },
      });
    }

    if (visibility === 'After Review') {
      const appStatus = attempt.applicationId?.applicationStatus;
      const isReviewed = ['Shortlisted', 'Interview Scheduled', 'Interview Completed', 'Selected', 'Rejected'].includes(appStatus);

      if (!isReviewed) {
        return res.status(200).json({
          success: true,
          data: {
            attemptId: attempt._id,
            status: attempt.status,
            visibility: 'After Review',
            message: 'Your assessment has been received. Detailed results will be visible after recruiter review.',
          },
        });
      }
    }

    // Immediate visibility for candidate
    return res.status(200).json({
      success: true,
      data: {
        attemptId: attempt._id,
        jobTitle: attempt.jobId?.title,
        assessmentTitle: attempt.assessmentId?.title,
        status: attempt.status,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        passed: attempt.passed,
        passingPercentage: attempt.assessmentId?.passingPercentage || 60,
        skillWiseResults: attempt.skillWiseResults,
        durationSeconds: attempt.durationSeconds,
        submittedAt: attempt.submittedAt,
        violationCount: attempt.violationCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Authorize retake for candidate (Recruiter only)
 */
const authorizeRetake = async (req, res, next) => {
  try {
    const attempt = await AssessmentAttempt.findById(req.params.id)
      .populate('assessmentId')
      .populate('jobId');

    if (!attempt) {
      return res.status(404).json({ success: false, message: 'Assessment attempt not found' });
    }

    const job = attempt.jobId;
    const requiredSkills = (job.requiredSkills && job.requiredSkills.length > 0)
      ? job.requiredSkills
      : ['JavaScript', 'React', 'Node.js'];

    // Generate new snapshot of 10 questions
    const newSnapshot = await selectAssessmentQuestions(
      requiredSkills,
      attempt.assessmentId?.questionDistribution || { easy: 3, medium: 5, hard: 2 }
    );

    // Reset attempt
    attempt.questionsSnapshot = newSnapshot;
    attempt.answers = [];
    attempt.startedAt = null;
    attempt.expiresAt = null;
    attempt.submittedAt = null;
    attempt.durationSeconds = 0;
    attempt.status = 'Assigned';
    attempt.score = 0;
    attempt.percentage = 0;
    attempt.passed = false;
    attempt.skillWiseResults = [];
    attempt.violationCount = 0;
    attempt.violationEvents = [];
    attempt.submissionReason = null;
    attempt.evaluationStatus = 'Pending';
    await attempt.save();

    // Update Application status
    await Application.findByIdAndUpdate(attempt.applicationId, {
      applicationStatus: 'Assessment Assigned',
      assessmentScore: null,
      assessmentPercentage: null,
      assessmentPassed: null,
    });

    // Notify candidate
    try {
      await createNotification({
        recipientUserId: attempt.candidateId,
        type: 'ASSESSMENT_ASSIGNED',
        title: 'Assessment Retake Authorized',
        message: `A retake has been authorized for your assessment on "${job.title}". You may now start your new attempt.`,
        relatedEntityType: 'AssessmentAttempt',
        relatedEntityId: attempt._id,
      });
    } catch (e) {
      console.warn('Failed to send retake notification:', e.message);
    }

    await logAudit({
      actorUserId: req.user._id,
      action: 'ASSESSMENT_RETAKE_AUTHORIZED',
      entityType: 'AssessmentAttempt',
      entityId: attempt._id,
      metadata: { applicationId: attempt.applicationId, candidateId: attempt.candidateId },
    });

    return res.status(200).json({
      success: true,
      message: 'Retake authorized. Assessment attempt reset for candidate.',
      data: { attemptId: attempt._id, status: attempt.status },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  assignAssessment,
  getRecruiterAttempts,
  getMyAssessments,
  startAttempt,
  getAttemptForTaking,
  saveAnswers,
  recordViolation,
  submitAssessment,
  getAttemptResult,
  authorizeRetake,
};
