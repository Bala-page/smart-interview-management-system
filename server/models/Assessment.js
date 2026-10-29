const mongoose = require('mongoose');

const assessmentSchema = new mongoose.Schema(
  {
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Assessment must be linked to a job'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Assessment title is required'],
      trim: true,
    },
    description: {
      type: String,
      default: '',
      trim: true,
    },
    durationMinutes: {
      type: Number,
      default: 15,
      required: true,
    },
    totalQuestions: {
      type: Number,
      default: 10,
      required: true,
    },
    totalMarks: {
      type: Number,
      default: 10,
      required: true,
    },
    questionDistribution: {
      easy: {
        type: Number,
        default: 3,
        min: 0,
      },
      medium: {
        type: Number,
        default: 5,
        min: 0,
      },
      hard: {
        type: Number,
        default: 2,
        min: 0,
      },
    },
    requiredSkills: {
      type: [String],
      default: [],
    },
    passingPercentage: {
      type: Number,
      default: 60,
      min: 0,
      max: 100,
    },
    resultVisibility: {
      type: String,
      enum: ['Immediate', 'After Review', 'Hidden'],
      default: 'Immediate',
    },
    retakeAllowed: {
      type: Boolean,
      default: false,
    },
    maxRetakes: {
      type: Number,
      default: 1,
      min: 1,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

assessmentSchema.index({ jobId: 1, isActive: 1 });
assessmentSchema.index({ createdBy: 1 });

module.exports = mongoose.model('Assessment', assessmentSchema);
