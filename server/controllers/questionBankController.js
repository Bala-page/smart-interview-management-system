const AssessmentQuestion = require('../models/AssessmentQuestion');
const { getCanonicalSkill } = require('../config/skillsDictionary');
const { logAudit } = require('../services/auditService');

/**
 * Get all questions with filters, search, and pagination (Recruiter only)
 */
const getQuestions = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      skill = '',
      difficulty = '',
      isActive,
      sortBy = 'createdAt',
      order = 'desc',
    } = req.query;

    const query = {};

    if (search) {
      query.questionText = { $regex: search.trim(), $options: 'i' };
    }

    if (skill) {
      query.skill = { $regex: `^${skill.trim()}$`, $options: 'i' };
    }

    if (difficulty) {
      query.difficulty = difficulty;
    }

    if (isActive !== undefined && isActive !== '') {
      query.isActive = isActive === 'true' || isActive === true;
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const sortOptions = {};
    sortOptions[sortBy] = order === 'asc' ? 1 : -1;

    const [questions, total] = await Promise.all([
      AssessmentQuestion.find(query)
        .sort(sortOptions)
        .skip(skip)
        .limit(limitNum)
        .populate('createdBy', 'name email')
        .lean(),
      AssessmentQuestion.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: {
        questions,
        pagination: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get question statistics per skill and difficulty (Recruiter only)
 */
const getQuestionStats = async (req, res, next) => {
  try {
    const stats = await AssessmentQuestion.aggregate([
      {
        $group: {
          _id: {
            skill: '$skill',
            difficulty: '$difficulty',
            isActive: '$isActive',
          },
          count: { $sum: 1 },
        },
      },
    ]);

    // Aggregate into a friendly skill-centric map
    const skillMap = {};
    let totalQuestions = 0;
    let totalActive = 0;

    stats.forEach((item) => {
      const { skill, difficulty, isActive } = item._id;
      const count = item.count;
      totalQuestions += count;
      if (isActive) totalActive += count;

      if (!skillMap[skill]) {
        skillMap[skill] = {
          skill,
          total: 0,
          active: 0,
          easy: 0,
          medium: 0,
          hard: 0,
        };
      }

      skillMap[skill].total += count;
      if (isActive) {
        skillMap[skill].active += count;
        if (difficulty === 'Easy') skillMap[skill].easy += count;
        if (difficulty === 'Medium') skillMap[skill].medium += count;
        if (difficulty === 'Hard') skillMap[skill].hard += count;
      }
    });

    const skillList = Object.values(skillMap).sort((a, b) => b.total - a.total);

    return res.status(200).json({
      success: true,
      data: {
        totalQuestions,
        totalActive,
        totalSkills: skillList.length,
        skills: skillList,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get question by ID (Recruiter only)
 */
const getQuestionById = async (req, res, next) => {
  try {
    const question = await AssessmentQuestion.findById(req.params.id)
      .populate('createdBy', 'name email')
      .lean();

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    return res.status(200).json({
      success: true,
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create a new question (Recruiter only)
 */
const createQuestion = async (req, res, next) => {
  try {
    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      skill,
      difficulty,
      jobCategories,
      tags,
      marks,
      negativeMarks,
    } = req.body;

    if (!questionText || !questionText.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Question text is required',
      });
    }

    if (!options || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'At least 2 options are required',
      });
    }

    // Validate options have id and text
    for (const opt of options) {
      if (!opt.id || !opt.text || !opt.text.trim()) {
        return res.status(400).json({
          success: false,
          message: 'All options must have non-empty "id" and "text"',
        });
      }
    }

    // Verify correctAnswer matches one of the option IDs
    const optionIds = options.map((opt) => opt.id);
    if (!optionIds.includes(correctAnswer)) {
      return res.status(400).json({
        success: false,
        message: `Correct answer "${correctAnswer}" must match one of the option IDs: [${optionIds.join(', ')}]`,
      });
    }

    if (!skill || !skill.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Technical skill is required',
      });
    }

    const canonicalSkill = getCanonicalSkill(skill);

    const question = await AssessmentQuestion.create({
      questionText: questionText.trim(),
      questionType: 'MCQ',
      options: options.map((o) => ({ id: o.id.trim(), text: o.text.trim() })),
      correctAnswer: correctAnswer.trim(),
      explanation: (explanation || '').trim(),
      skill: canonicalSkill,
      difficulty: ['Easy', 'Medium', 'Hard'].includes(difficulty) ? difficulty : 'Medium',
      jobCategories: Array.isArray(jobCategories) ? jobCategories : [],
      tags: Array.isArray(tags) ? tags : [],
      marks: Math.max(1, Number(marks) || 1),
      negativeMarks: Math.max(0, Number(negativeMarks) || 0),
      createdBy: req.user._id,
      isActive: true,
    });

    await logAudit({
      actorUserId: req.user._id,
      action: 'QUESTION_CREATED',
      entityType: 'AssessmentQuestion',
      entityId: question._id,
      metadata: { skill: canonicalSkill, difficulty: question.difficulty },
    });

    return res.status(201).json({
      success: true,
      message: 'Question created successfully in Question Bank',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update an existing question (Recruiter only)
 */
const updateQuestion = async (req, res, next) => {
  try {
    const question = await AssessmentQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    const {
      questionText,
      options,
      correctAnswer,
      explanation,
      skill,
      difficulty,
      jobCategories,
      tags,
      marks,
      negativeMarks,
      isActive,
    } = req.body;

    if (questionText) question.questionText = questionText.trim();
    if (explanation !== undefined) question.explanation = (explanation || '').trim();
    if (difficulty && ['Easy', 'Medium', 'Hard'].includes(difficulty)) {
      question.difficulty = difficulty;
    }
    if (skill) question.skill = getCanonicalSkill(skill);
    if (Array.isArray(jobCategories)) question.jobCategories = jobCategories;
    if (Array.isArray(tags)) question.tags = tags;
    if (marks !== undefined) question.marks = Math.max(1, Number(marks) || 1);
    if (negativeMarks !== undefined) question.negativeMarks = Math.max(0, Number(negativeMarks) || 0);
    if (isActive !== undefined) question.isActive = Boolean(isActive);

    if (options && Array.isArray(options)) {
      if (options.length < 2) {
        return res.status(400).json({
          success: false,
          message: 'At least 2 options are required',
        });
      }
      for (const opt of options) {
        if (!opt.id || !opt.text) {
          return res.status(400).json({
            success: false,
            message: 'All options must have non-empty "id" and "text"',
          });
        }
      }
      question.options = options.map((o) => ({ id: o.id.trim(), text: o.text.trim() }));
    }

    if (correctAnswer) {
      const optionIds = question.options.map((opt) => opt.id);
      if (!optionIds.includes(correctAnswer)) {
        return res.status(400).json({
          success: false,
          message: `Correct answer "${correctAnswer}" must match one of the option IDs: [${optionIds.join(', ')}]`,
        });
      }
      question.correctAnswer = correctAnswer.trim();
    }

    await question.save();

    await logAudit({
      actorUserId: req.user._id,
      action: 'QUESTION_UPDATED',
      entityType: 'AssessmentQuestion',
      entityId: question._id,
      metadata: { skill: question.skill, difficulty: question.difficulty },
    });

    return res.status(200).json({
      success: true,
      message: 'Question updated successfully',
      data: question,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle active/inactive status (Soft delete / deactivate)
 */
const toggleQuestionStatus = async (req, res, next) => {
  try {
    const question = await AssessmentQuestion.findById(req.params.id);

    if (!question) {
      return res.status(404).json({
        success: false,
        message: 'Question not found',
      });
    }

    question.isActive = !question.isActive;
    await question.save();

    await logAudit({
      actorUserId: req.user._id,
      action: question.isActive ? 'QUESTION_ACTIVATED' : 'QUESTION_DEACTIVATED',
      entityType: 'AssessmentQuestion',
      entityId: question._id,
      metadata: { isActive: question.isActive },
    });

    return res.status(200).json({
      success: true,
      message: `Question marked as ${question.isActive ? 'Active' : 'Inactive'}`,
      data: { _id: question._id, isActive: question.isActive },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Bulk import validated JSON questions (Recruiter only)
 */
const importQuestions = async (req, res, next) => {
  try {
    const { questions } = req.body;

    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include an array of questions under "questions" key',
      });
    }

    const validQuestions = [];
    const errors = [];

    questions.forEach((q, index) => {
      if (!q.questionText || !q.questionText.trim()) {
        errors.push(`Item ${index + 1}: Missing questionText`);
        return;
      }
      if (!Array.isArray(q.options) || q.options.length < 2) {
        errors.push(`Item ${index + 1}: Must contain at least 2 options`);
        return;
      }
      const optionIds = q.options.map((opt) => opt.id);
      if (!optionIds.includes(q.correctAnswer)) {
        errors.push(`Item ${index + 1}: correctAnswer not found among options`);
        return;
      }
      if (!q.skill || !q.skill.trim()) {
        errors.push(`Item ${index + 1}: Missing skill`);
        return;
      }

      validQuestions.push({
        questionText: q.questionText.trim(),
        questionType: 'MCQ',
        options: q.options.map((opt) => ({ id: String(opt.id).trim(), text: String(opt.text).trim() })),
        correctAnswer: String(q.correctAnswer).trim(),
        explanation: (q.explanation || '').trim(),
        skill: getCanonicalSkill(q.skill),
        difficulty: ['Easy', 'Medium', 'Hard'].includes(q.difficulty) ? q.difficulty : 'Medium',
        jobCategories: Array.isArray(q.jobCategories) ? q.jobCategories : [],
        tags: Array.isArray(q.tags) ? q.tags : [],
        marks: Math.max(1, Number(q.marks) || 1),
        negativeMarks: Math.max(0, Number(q.negativeMarks) || 0),
        isActive: q.isActive !== false,
        createdBy: req.user._id,
      });
    });

    if (validQuestions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No valid questions could be parsed from input',
        errors,
      });
    }

    const inserted = await AssessmentQuestion.insertMany(validQuestions);

    await logAudit({
      actorUserId: req.user._id,
      action: 'QUESTIONS_BULK_IMPORTED',
      entityType: 'AssessmentQuestion',
      entityId: inserted[0]._id,
      metadata: { count: inserted.length, errorsCount: errors.length },
    });

    return res.status(201).json({
      success: true,
      message: `Successfully imported ${inserted.length} questions into Question Bank`,
      data: {
        importedCount: inserted.length,
        errors,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getQuestions,
  getQuestionStats,
  getQuestionById,
  createQuestion,
  updateQuestion,
  toggleQuestionStatus,
  importQuestions,
};
