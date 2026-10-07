const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Feedback = require('../models/Feedback');
const Job = require('../models/Job');
const User = require('../models/User');
const ScreeningResult = require('../models/ScreeningResult');

/**
 * @desc    Hiring funnel metrics
 * @route   GET /api/reports/hiring-funnel
 * @access  Private (Recruiter)
 */
const getHiringFunnel = async (req, res, next) => {
  try {
    const [
      totalApplications,
      totalScreened,
      shortlisted,
      interviewScheduled,
      interviewCompleted,
      selected,
      rejected,
      hold,
    ] = await Promise.all([
      Application.countDocuments(),
      ScreeningResult.countDocuments(),
      Application.countDocuments({ applicationStatus: 'Shortlisted' }),
      Interview.countDocuments({ status: { $in: ['Scheduled', 'Rescheduled'] } }),
      Interview.countDocuments({ status: 'Completed' }),
      Application.countDocuments({ applicationStatus: 'Selected' }),
      Application.countDocuments({ applicationStatus: 'Rejected' }),
      Application.countDocuments({ applicationStatus: 'Hold' }),
    ]);

    const funnel = [
      { stage: 'Applications', count: totalApplications, dropoffPct: 0 },
      {
        stage: 'Screened',
        count: totalScreened,
        dropoffPct: totalApplications > 0 ? Math.round(((totalApplications - totalScreened) / totalApplications) * 100) : 0,
      },
      {
        stage: 'Shortlisted',
        count: shortlisted,
        dropoffPct: totalScreened > 0 ? Math.round(((totalScreened - shortlisted) / totalScreened) * 100) : 0,
      },
      {
        stage: 'Interview Scheduled',
        count: interviewScheduled,
        dropoffPct: 0,
      },
      {
        stage: 'Interview Completed',
        count: interviewCompleted,
        dropoffPct: 0,
      },
      {
        stage: 'Selected',
        count: selected,
        dropoffPct: 0,
      },
      {
        stage: 'Hold',
        count: hold,
        dropoffPct: 0,
      },
      {
        stage: 'Rejected',
        count: rejected,
        dropoffPct: 0,
      },
    ];

    res.status(200).json({
      success: true,
      data: funnel,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Selection ratios and conversion metrics
 * @route   GET /api/reports/selection-ratio
 * @access  Private (Recruiter)
 */
const getSelectionRatio = async (req, res, next) => {
  try {
    const [totalApps, selectedApps, shortlistedApps, interviewedCount] = await Promise.all([
      Application.countDocuments(),
      Application.countDocuments({ applicationStatus: 'Selected' }),
      Application.countDocuments({ applicationStatus: 'Shortlisted' }),
      Interview.countDocuments({ status: 'Completed' }),
    ]);

    const selectionRatio = totalApps > 0 ? Math.round((selectedApps / totalApps) * 100) : 0;
    const shortlistingRatio = totalApps > 0 ? Math.round((shortlistedApps / totalApps) * 100) : 0;
    const interviewConversion = interviewedCount > 0 ? Math.round((selectedApps / interviewedCount) * 100) : 0;

    res.status(200).json({
      success: true,
      data: {
        totalApplications: totalApps,
        selectedCandidates: selectedApps,
        shortlistedCandidates: shortlistedApps,
        interviewedCandidates: interviewedCount,
        selectionRatio, // Selected / Total Applications * 100
        shortlistingRatio, // Shortlisted / Total Applications * 100
        interviewConversion, // Selected / Interviewed * 100
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Job-wise hiring performance report
 * @route   GET /api/reports/job-performance
 * @access  Private (Recruiter)
 */
const getJobPerformance = async (req, res, next) => {
  try {
    const jobs = await Job.find().select('title location status requiredSkills');

    const jobReports = await Promise.all(
      jobs.map(async (job) => {
        const [totalApps, shortlisted, interviews, selected, rejected] = await Promise.all([
          Application.countDocuments({ jobId: job._id }),
          Application.countDocuments({ jobId: job._id, applicationStatus: 'Shortlisted' }),
          Interview.countDocuments({ jobId: job._id }),
          Application.countDocuments({ jobId: job._id, applicationStatus: 'Selected' }),
          Application.countDocuments({ jobId: job._id, applicationStatus: 'Rejected' }),
        ]);

        const selectionPct = totalApps > 0 ? Math.round((selected / totalApps) * 100) : 0;

        return {
          jobId: job._id,
          jobTitle: job.title,
          location: job.location,
          status: job.status,
          applications: totalApps,
          shortlisted,
          interviews,
          selected,
          rejected,
          selectionPercentage: selectionPct,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: jobReports,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Interviewer performance report
 * @route   GET /api/reports/interviewer-performance
 * @access  Private (Recruiter)
 */
const getInterviewerPerformance = async (req, res, next) => {
  try {
    const interviewers = await User.find({ role: 'interviewer' }).select('name email skills');

    const performanceData = await Promise.all(
      interviewers.map(async (interviewer) => {
        const [assignedCount, completedCount, feedbacks] = await Promise.all([
          Interview.countDocuments({ interviewerId: interviewer._id }),
          Interview.countDocuments({ interviewerId: interviewer._id, status: 'Completed' }),
          Feedback.find({ interviewerId: interviewer._id }),
        ]);

        let avgTech = 0;
        let avgComm = 0;
        let avgOverall = 0;
        let hireRecommendations = 0;

        if (feedbacks.length > 0) {
          const sumTech = feedbacks.reduce((acc, f) => acc + f.technicalRating, 0);
          const sumComm = feedbacks.reduce((acc, f) => acc + f.communicationRating, 0);
          const sumOverall = feedbacks.reduce((acc, f) => acc + f.overallRating, 0);
          hireRecommendations = feedbacks.filter((f) => f.recommendation === 'Hire').length;

          avgTech = parseFloat((sumTech / feedbacks.length).toFixed(1));
          avgComm = parseFloat((sumComm / feedbacks.length).toFixed(1));
          avgOverall = parseFloat((sumOverall / feedbacks.length).toFixed(1));
        }

        const hireRate = feedbacks.length > 0
          ? Math.round((hireRecommendations / feedbacks.length) * 100)
          : 0;

        return {
          interviewerId: interviewer._id,
          name: interviewer.name,
          email: interviewer.email,
          skills: interviewer.skills,
          interviewsAssigned: assignedCount,
          interviewsCompleted: completedCount,
          feedbackSubmitted: feedbacks.length,
          avgTechnicalRating: avgTech,
          avgCommunicationRating: avgComm,
          avgOverallRating: avgOverall,
          hireRecommendationPercentage: hireRate,
        };
      })
    );

    res.status(200).json({
      success: true,
      data: performanceData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Candidate ranking report based on screening scores
 * @route   GET /api/reports/candidate-ranking
 * @access  Private (Recruiter)
 */
const getCandidateRanking = async (req, res, next) => {
  try {
    const { jobId, limit = 20 } = req.query;
    const query = {};
    if (jobId) query.jobId = jobId;

    const rankings = await ScreeningResult.find(query)
      .populate('candidateId', 'name email phone location skills experience')
      .populate('jobId', 'title')
      .populate('applicationId', 'applicationStatus appliedDate')
      .sort('-overallMatchScore')
      .limit(parseInt(limit, 10) || 20);

    res.status(200).json({
      success: true,
      data: rankings,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHiringFunnel,
  getSelectionRatio,
  getJobPerformance,
  getInterviewerPerformance,
  getCandidateRanking,
};
