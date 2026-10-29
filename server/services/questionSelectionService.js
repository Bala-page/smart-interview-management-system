const AssessmentQuestion = require('../models/AssessmentQuestion');
const { getCanonicalSkill } = require('../config/skillsDictionary');

/**
 * Fisher-Yates array shuffle utility
 */
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

/**
 * Expands a required skill into related matching terms and aliases
 */
const getExpandedSkillTerms = (skillName) => {
  const canonical = getCanonicalSkill(skillName).trim();
  const lower = canonical.toLowerCase();
  const terms = new Set([canonical, skillName.trim()]);

  if (lower.includes('spring')) {
    terms.add('Spring');
    terms.add('Spring Boot');
  }
  if (lower.includes('microservice')) {
    terms.add('Microservices');
    terms.add('REST API');
  }
  if (lower.includes('java') && !lower.includes('javascript')) {
    terms.add('Java');
  }
  if (lower.includes('react')) {
    terms.add('React');
    terms.add('React.js');
  }
  if (lower.includes('node')) {
    terms.add('Node.js');
    terms.add('Express');
  }
  if (lower.includes('sql') || lower.includes('database') || lower.includes('dbms')) {
    terms.add('SQL');
    terms.add('MongoDB');
  }
  if (lower.includes('docker') || lower.includes('container') || lower.includes('k8s')) {
    terms.add('Docker');
    terms.add('Kubernetes');
  }

  return Array.from(terms);
};

/**
 * Selects exactly 10 balanced questions matching job required skills and target difficulty distribution.
 *
 * @param {Array<string>} requiredSkills - Array of skill strings from the Job
 * @param {Object} distribution - { easy: 3, medium: 5, hard: 2 }
 * @param {Object} [options] - Configuration options
 * @returns {Promise<Array<Object>>} - Array of 10 question snapshot objects with shuffled options
 */
const selectAssessmentQuestions = async (
  requiredSkills = [],
  distribution = { easy: 3, medium: 5, hard: 2 },
  options = {}
) => {
  const targetEasy = distribution.easy ?? 3;
  const targetMedium = distribution.medium ?? 5;
  const targetHard = distribution.hard ?? 2;
  const totalRequired = targetEasy + targetMedium + targetHard;

  if (totalRequired !== 10) {
    throw new Error(`Assessment requires exactly 10 questions. Current distribution sums to ${totalRequired}.`);
  }

  // Canonicalize & expand required skills
  const normalizedSkills = requiredSkills.map((s) => getCanonicalSkill(s).trim()).filter(Boolean);

  if (normalizedSkills.length === 0) {
    throw new Error('Job must have at least one required skill specified to generate an assessment.');
  }

  // Collect all search terms across required skills
  const allSearchTerms = new Set();
  normalizedSkills.forEach((s) => {
    getExpandedSkillTerms(s).forEach((term) => allSearchTerms.add(term));
  });

  const skillRegexes = Array.from(allSearchTerms).map(
    (s) => new RegExp(`^${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i')
  );

  // Fetch all active questions matching any of the expanded skill terms
  let matchingQuestions = await AssessmentQuestion.find({
    isActive: true,
    skill: { $in: skillRegexes },
  }).lean();

  // If literally 0 questions matched any of the required skills
  if (matchingQuestions.length === 0) {
    throw new Error(
      `Insufficient questions in Question Bank for required skills [${normalizedSkills.join(', ')}]. ` +
      `No active questions found in the Question Bank matching these skills. Please add questions for these skills in Question Bank.`
    );
  }

  // Pool questions by difficulty
  const poolByDifficulty = {
    Easy: matchingQuestions.filter((q) => q.difficulty === 'Easy'),
    Medium: matchingQuestions.filter((q) => q.difficulty === 'Medium'),
    Hard: matchingQuestions.filter((q) => q.difficulty === 'Hard'),
  };

  // If we have at least 10 matching questions in total across the required skills
  // We can adaptively fulfill the 10 questions from the job's skills
  const selectedQuestionIds = new Set();
  const selectedQuestions = [];

  // Determine target counts per difficulty adaptively if exact target is not fully met
  let allocEasy = Math.min(poolByDifficulty.Easy.length, targetEasy);
  let allocMedium = Math.min(poolByDifficulty.Medium.length, targetMedium);
  let allocHard = Math.min(poolByDifficulty.Hard.length, targetHard);
  let remainingNeeded = totalRequired - (allocEasy + allocMedium + allocHard);

  // Distribute remaining needed to difficulties that have surplus
  while (remainingNeeded > 0) {
    let allocatedAny = false;
    // Prefer Medium, then Easy, then Hard
    if (poolByDifficulty.Medium.length > allocMedium && remainingNeeded > 0) {
      allocMedium++;
      remainingNeeded--;
      allocatedAny = true;
    }
    if (poolByDifficulty.Easy.length > allocEasy && remainingNeeded > 0) {
      allocEasy++;
      remainingNeeded--;
      allocatedAny = true;
    }
    if (poolByDifficulty.Hard.length > allocHard && remainingNeeded > 0) {
      allocHard++;
      remainingNeeded--;
      allocatedAny = true;
    }
    if (!allocatedAny) break;
  }

  // Helper to pick items with skill round-robin balancing
  const pickFromDifficulty = (difficulty, countToPick) => {
    if (countToPick <= 0) return;
    const candidates = poolByDifficulty[difficulty].filter((c) => !selectedQuestionIds.has(c._id.toString()));
    const shuffled = shuffleArray(candidates);

    // Group by skill for round-robin
    const bySkill = {};
    shuffled.forEach((q) => {
      bySkill[q.skill] = bySkill[q.skill] || [];
      bySkill[q.skill].push(q);
    });

    const skillKeys = Object.keys(bySkill);
    let picked = 0;
    let sIdx = 0;

    while (picked < countToPick && candidates.length > picked) {
      let madeProgress = false;
      for (let i = 0; i < skillKeys.length && picked < countToPick; i++) {
        const k = skillKeys[(sIdx + i) % skillKeys.length];
        const list = bySkill[k];
        if (list && list.length > 0) {
          const item = list.pop();
          if (!selectedQuestionIds.has(item._id.toString())) {
            selectedQuestionIds.add(item._id.toString());
            selectedQuestions.push(item);
            picked++;
            madeProgress = true;
          }
        }
      }
      sIdx = (sIdx + 1) % (skillKeys.length || 1);

      if (!madeProgress) {
        // Fallback pick any remaining in candidates
        const remaining = candidates.filter((c) => !selectedQuestionIds.has(c._id.toString()));
        if (remaining.length === 0) break;
        const item = remaining[0];
        selectedQuestionIds.add(item._id.toString());
        selectedQuestions.push(item);
        picked++;
      }
    }
  };

  pickFromDifficulty('Easy', allocEasy);
  pickFromDifficulty('Medium', allocMedium);
  pickFromDifficulty('Hard', allocHard);

  // If still under 10 (e.g. matchingQuestions total was < 10), fill from any remaining matching questions
  if (selectedQuestions.length < 10) {
    const remainingMatching = matchingQuestions.filter((q) => !selectedQuestionIds.has(q._id.toString()));
    const shuffledRemaining = shuffleArray(remainingMatching);
    while (selectedQuestions.length < 10 && shuffledRemaining.length > 0) {
      const q = shuffledRemaining.pop();
      selectedQuestionIds.add(q._id.toString());
      selectedQuestions.push(q);
    }
  }

  // If still under 10 because total matching in question bank for this job was < 10,
  // supplement with foundational engineering topics (Data Structures, REST API, Git, SQL)
  if (selectedQuestions.length < 10) {
    const foundationalQuestions = await AssessmentQuestion.find({
      isActive: true,
      _id: { $nin: Array.from(selectedQuestionIds) },
      skill: { $in: ['REST API', 'Data Structures', 'Git', 'SQL', 'JavaScript'] },
    }).lean();

    const shuffledFoundations = shuffleArray(foundationalQuestions);
    while (selectedQuestions.length < 10 && shuffledFoundations.length > 0) {
      const q = shuffledFoundations.pop();
      selectedQuestionIds.add(q._id.toString());
      selectedQuestions.push(q);
    }
  }

  // Final check: Question bank must have at least 10 active questions overall
  if (selectedQuestions.length < 10) {
    throw new Error(
      `Insufficient questions in Question Bank. Selected ${selectedQuestions.length}/10 questions. ` +
      `Please add more active questions to the Question Bank.`
    );
  }

  // Randomize overall question order
  const finalShuffledQuestions = shuffleArray(selectedQuestions);

  // Generate immutable snapshot with randomized options
  const snapshot = finalShuffledQuestions.map((q) => {
    const shuffledOptions = shuffleArray(
      (q.options || []).map((opt) => ({
        id: opt.id,
        text: opt.text,
      }))
    );

    return {
      questionId: q._id,
      questionText: q.questionText,
      skill: q.skill,
      difficulty: q.difficulty,
      marks: q.marks || 1,
      options: shuffledOptions,
      correctAnswer: q.correctAnswer,
      explanation: q.explanation || '',
    };
  });

  return snapshot;
};

module.exports = {
  selectAssessmentQuestions,
  shuffleArray,
};
