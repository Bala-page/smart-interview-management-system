const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema(
  {
    id: {
      type: String,
      required: true,
      trim: true,
    },
    text: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const assessmentQuestionSchema = new mongoose.Schema(
  {
    questionText: {
      type: String,
      required: [true, 'Question text is required'],
      trim: true,
    },
    questionType: {
      type: String,
      enum: ['MCQ'],
      default: 'MCQ',
    },
    options: {
      type: [optionSchema],
      validate: [
        (opts) => Array.isArray(opts) && opts.length >= 2,
        'Question must have at least 2 options',
      ],
      required: true,
    },
    correctAnswer: {
      type: String,
      required: [true, 'Correct answer option ID is required'],
      trim: true,
    },
    explanation: {
      type: String,
      default: '',
      trim: true,
    },
    skill: {
      type: String,
      required: [true, 'Technical skill is required'],
      trim: true,
      index: true,
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      required: [true, 'Difficulty level is required'],
      default: 'Medium',
      index: true,
    },
    jobCategories: {
      type: [String],
      default: [],
    },
    tags: {
      type: [String],
      default: [],
    },
    marks: {
      type: Number,
      default: 1,
      min: 1,
    },
    negativeMarks: {
      type: Number,
      default: 0,
      min: 0,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

assessmentQuestionSchema.index({ skill: 1, difficulty: 1, isActive: 1 });
assessmentQuestionSchema.index({ skill: 1, isActive: 1 });
assessmentQuestionSchema.index({ questionText: 'text' });

module.exports = mongoose.model('AssessmentQuestion', assessmentQuestionSchema);
