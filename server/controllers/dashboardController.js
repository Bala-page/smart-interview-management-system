const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Feedback = require('../models/Feedback');
const User = require('../models/User');

/**
 * @desc    Get recruiter dashboard aggregated metrics
 * @route   GET /api/dashboard/metrics (or /api/dashboard/recruiter)
 * @access  Private (Recruiter)
 */
const getRecruiterDashboard = async (req, res, next) => {
  try {
    const [
      totalJobs,
      openJobs,
      closedJobs,
      totalApplications,
      shortlistedCount,
      scheduledInterviews,
      selectedCount,
      rejectedCount,
      holdCount,
      appliedCount,
      recentApplications,
      upcomingInterviews,
      pendingFeedbackList,
    ] = await Promise.all([
      Job.countDocuments(),
      Job.countDocuments({ status: 'Open' }),
      Job.countDocuments({ status: 'Closed' }),
      Application.countDocuments(),
      Application.countDocuments({ applicationStatus: 'Shortlisted' }),
      Interview.countDocuments({ status: 'Scheduled' }),
      Application.countDocuments({ applicationStatus: 'Selected' }),
      Application.countDocuments({ applicationStatus: 'Rejected' }),
      Application.countDocuments({ applicationStatus: 'Hold' }),
      Application.countDocuments({ applicationStatus: 'Applied' }),
      Application.find()
        .populate('candidateId', 'name email skills experience')
        .populate('jobId', 'title')
        .sort('-appliedDate')
        .limit(6),
      Interview.find({ status: 'Scheduled' })
        .populate('candidateId', 'name email')
        .populate('interviewerId', 'name')
        .populate('jobId', 'title')
        .sort('interviewDate')
        .limit(5),
      Interview.find({ status: 'Completed' })
        .populate('candidateId', 'name email')
        .populate('interviewerId', 'name email')
        .populate('jobId', 'title')
        .sort('-updatedAt')
        .limit(10),
    ]);

    // Calculate pending feedback: completed interviews that don't have feedback yet
    const completedInterviewIds = pendingFeedbackList.map((i) => i._id);
    const existingFeedback = await Feedback.find({
      interviewId: { $in: completedInterviewIds },
    });
    const feedbackInterviewIdSet = new Set(existingFeedback.map((f) => f.interviewId.toString()));
    const pendingFeedback = pendingFeedbackList.filter(
      (i) => !feedbackInterviewIdSet.has(i._id.toString())
    );

    // Status breakdown distribution
    const statusDistribution = [
      { status: 'Applied', count: appliedCount },
      { status: 'Shortlisted', count: shortlistedCount },
      { status: 'Interview Scheduled', count: scheduledInterviews },
      { status: 'Selected', count: selectedCount },
      { status: 'Rejected', count: rejectedCount },
      { status: 'Hold', count: holdCount },
    ];

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalJobs,
          openJobs,
          closedJobs,
          totalApplications,
          shortlistedCandidates: shortlistedCount,
          scheduledInterviews,
          selectedCandidates: selectedCount,
          rejectedCandidates: rejectedCount,
          holdCandidates: holdCount,
          pendingDecisions: appliedCount + shortlistedCount,
        },
        statusDistribution,
        recentApplications,
        upcomingInterviews,
        pendingFeedback: pendingFeedback.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get interviewer dashboard data
 * @route   GET /api/dashboard/interviewer
 * @access  Private (Interviewer)
 */
const getInterviewerDashboard = async (req, res, next) => {
  try {
    const interviewerId = req.user._id;

    const [allAssigned, feedbacks] = await Promise.all([
      Interview.find({ interviewerId })
        .populate('candidateId', 'name email phone skills experience bio resumeFileId')
        .populate('jobId', 'title description requiredSkills location')
        .sort('-interviewDate'),
      Feedback.find({ interviewerId })
        .populate('candidateId', 'name email')
        .populate('jobId', 'title'),
    ]);

    const scheduled = allAssigned.filter((i) => i.status === 'Scheduled');
    const completed = allAssigned.filter((i) => i.status === 'Completed');

    // Find completed interviews that do not have feedback yet
    const feedbackMap = new Map();
    feedbacks.forEach((f) => feedbackMap.set(f.interviewId.toString(), f));

    const pendingFeedback = completed.filter((i) => !feedbackMap.has(i._id.toString()));

    const todayDateStr = new Date().toISOString().split('T')[0];
    const todayInterviews = scheduled.filter((i) => i.interviewDate === todayDateStr);

    res.status(200).json({
      success: true,
      data: {
        kpis: {
          totalAssigned: allAssigned.length,
          upcomingInterviews: scheduled.length,
          completedInterviews: completed.length,
          pendingFeedbackCount: pendingFeedback.length,
          completedFeedbackCount: feedbacks.length,
        },
        todayInterviews,
        upcomingInterviews: scheduled.slice(0, 5),
        completedInterviews: completed.slice(0, 5),
        pendingFeedback,
        recentFeedback: feedbacks.slice(0, 5),
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get candidate dashboard data
 * @route   GET /api/dashboard/candidate
 * @access  Private (Candidate)
 */
const getCandidateDashboard = async (req, res, next) => {
  try {
    const candidateId = req.user._id;
    const candidate = await User.findById(candidateId);

    const [applications, interviews, openJobs] = await Promise.all([
      Application.find({ candidateId })
        .populate('jobId', 'title location employmentType requiredSkills')
        .sort('-appliedDate'),
      Interview.find({ candidateId, status: { $in: ['Scheduled', 'Rescheduled'] } })
        .populate('jobId', 'title')
        .populate('interviewerId', 'name')
        .sort('interviewDate'),
      Job.find({ status: 'Open' }).sort('-createdAt').limit(6),
    ]);

    // Calculate profile completion score
    let profileScore = 20; // Base for registering
    if (candidate.phone && candidate.phone.trim()) profileScore += 20;
    if (candidate.location && candidate.location.trim()) profileScore += 20;
    if (candidate.resumeFileId) profileScore += 20;
    if (candidate.skills && candidate.skills.length >= 3) profileScore += 20;

    const shortlistedCount = applications.filter((a) => a.applicationStatus === 'Shortlisted').length;
    const selectedCount = applications.filter((a) => a.applicationStatus === 'Selected').length;
    const rejectedCount = applications.filter((a) => a.applicationStatus === 'Rejected').length;

    // Filter recommended jobs matching candidate skills
    const candSkillSet = new Set((candidate.skills || []).map((s) => s.toLowerCase()));
    const recommendedJobs = openJobs.filter((job) => {
      const match = (job.requiredSkills || []).some((s) => candSkillSet.has(s.toLowerCase()));
      return match;
    });

    res.status(200).json({
      success: true,
      data: {
        profileCompletion: Math.min(100, profileScore),
        kpis: {
          totalApplications: applications.length,
          shortlisted: shortlistedCount,
          upcomingInterviews: interviews.length,
          selected: selectedCount,
          rejected: rejectedCount,
        },
        recentApplications: applications.slice(0, 5),
        upcomingInterviews,
        recommendedJobs: (recommendedJobs.length > 0 ? recommendedJobs : openJobs).slice(0, 4),
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRecruiterDashboard,
  getInterviewerDashboard,
  getCandidateDashboard,
};
