const mongoose = require('mongoose');

const screeningResultSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: true,
      unique: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: true,
    },
    skillsFound: {
      type: [String],
      default: [],
    },
    matchedSkills: {
      type: [String],
      default: [],
    },
    missingSkills: {
      type: [String],
      default: [],
    },
    skillMatchPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    experienceScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    overallMatchScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    scoreBreakdown: {
      skillsWeight: { type: Number, default: 60 },
      experienceWeight: { type: Number, default: 25 },
      profileWeight: { type: Number, default: 15 },
      notes: { type: String, default: '' },
    },
    screeningStatus: {
      type: String,
      enum: ['Pending', 'Shortlisted', 'Rejected'],
      default: 'Pending',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

screeningResultSchema.index({ candidateId: 1 });
screeningResultSchema.index({ jobId: 1 });
screeningResultSchema.index({ overallMatchScore: -1 });

module.exports = mongoose.model('ScreeningResult', screeningResultSchema);
