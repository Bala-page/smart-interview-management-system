const { getCanonicalSkill } = require('../config/skillsDictionary');

// Configurable scoring weights
const SCORING_WEIGHTS = {
  SKILLS: 0.60,
  EXPERIENCE: 0.25,
  PROFILE: 0.15,
};

/**
 * Deterministic, local, explainable screening algorithm.
 * No external AI or cloud APIs used.
 *
 * @param {Object} job - Mongoose Job document
 * @param {Object} candidate - Mongoose User document
 * @param {Array<string>} resumeSkills - Skills extracted from PDF resume
 * @param {number|null} detectedResumeExperience - Experience extracted from PDF
 */
const evaluateCandidate = (job, candidate, resumeSkills = [], detectedResumeExperience = null) => {
  const jobRequiredSkills = (job.requiredSkills || []).map(s => getCanonicalSkill(s));
  const candidateProfileSkills = (candidate.skills || []).map(s => getCanonicalSkill(s));
  const normalizedResumeSkills = (resumeSkills || []).map(s => getCanonicalSkill(s));

  // Combine unique skills found across profile and resume
  const allFoundSkillsSet = new Set([
    ...candidateProfileSkills,
    ...normalizedResumeSkills,
  ]);
  const skillsFound = Array.from(allFoundSkillsSet);

  // Match against required skills
  const matchedSkills = [];
  const missingSkills = [];

  jobRequiredSkills.forEach(reqSkill => {
    const isFound = skillsFound.some(
      found => found.toLowerCase() === reqSkill.toLowerCase()
    );
    if (isFound) {
      matchedSkills.push(reqSkill);
    } else {
      missingSkills.push(reqSkill);
    }
  });

  // 1. Skill Match Percentage
  const skillMatchPercentage = jobRequiredSkills.length > 0
    ? Math.round((matchedSkills.length / jobRequiredSkills.length) * 100)
    : 100;

  // 2. Experience Match Score
  // Take higher of candidate profile experience or detected experience
  const candidateExp = Math.max(
    Number(candidate.experience) || 0,
    Number(detectedResumeExperience) || 0
  );
  const minRequiredExp = Number(job.minimumExperience) || 0;

  let experienceScore = 100;
  if (minRequiredExp > 0) {
    if (candidateExp >= minRequiredExp) {
      experienceScore = 100;
    } else {
      experienceScore = Math.max(0, Math.round((candidateExp / minRequiredExp) * 100));
    }
  }

  // 3. Profile Completeness Score
  let profilePoints = 0;
  if (candidate.phone && candidate.phone.trim()) profilePoints += 25;
  if (candidate.location && candidate.location.trim()) profilePoints += 25;
  if (candidate.bio && candidate.bio.trim().length > 20) profilePoints += 25;
  if (candidate.skills && candidate.skills.length >= 3) profilePoints += 25;
  const profileScore = profilePoints;

  // 4. Overall Weighted Score
  const overallMatchScore = Math.round(
    skillMatchPercentage * SCORING_WEIGHTS.SKILLS +
    experienceScore * SCORING_WEIGHTS.EXPERIENCE +
    profileScore * SCORING_WEIGHTS.PROFILE
  );

  // 5. Screening status determination
  let screeningStatus = 'Pending';
  if (overallMatchScore >= 70) {
    screeningStatus = 'Shortlisted';
  } else if (overallMatchScore < 40) {
    screeningStatus = 'Rejected';
  }

  const scoreBreakdown = {
    skillsWeight: SCORING_WEIGHTS.SKILLS * 100,
    experienceWeight: SCORING_WEIGHTS.EXPERIENCE * 100,
    profileWeight: SCORING_WEIGHTS.PROFILE * 100,
    notes: `Matched ${matchedSkills.length} of ${jobRequiredSkills.length} required skills (${skillMatchPercentage}%). Candidate has ${candidateExp} yrs exp vs ${minRequiredExp} yrs required (${experienceScore}%). Profile completeness: ${profileScore}%.`,
  };

  return {
    skillsFound,
    matchedSkills,
    missingSkills,
    skillMatchPercentage,
    experienceScore,
    overallMatchScore,
    scoreBreakdown,
    screeningStatus,
  };
};

module.exports = {
  SCORING_WEIGHTS,
  evaluateCandidate,
};
