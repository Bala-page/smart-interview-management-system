const mongoose = require('mongoose');

const applicationSchema = new mongoose.Schema(
  {
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Application must be linked to a candidate'],
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Application must be linked to a job'],
    },
    resumeFileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'fs.files',
      default: null,
    },
    applicationStatus: {
      type: String,
      enum: [
        'Applied',
        'Assessment Assigned',
        'Assessment Completed',
        'Shortlisted',
        'Interview Scheduled',
        'Interview Completed',
        'Selected',
        'Rejected',
        'Hold',
      ],
      default: 'Applied',
    },
    assessmentAttemptId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentAttempt',
      default: null,
    },
    assessmentScore: {
      type: Number,
      default: null,
    },
    assessmentPercentage: {
      type: Number,
      default: null,
    },
    assessmentPassed: {
      type: Boolean,
      default: null,
    },
    appliedDate: {
      type: Date,
      default: Date.now,
    },
    screeningScore: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
    shortlistedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      default: '',
    },
    decision: {
      type: String,
      enum: ['Pending', 'Selected', 'Rejected', 'Hold'],
      default: 'Pending',
    },
  },
  {
    timestamps: true,
  }
);

// Prevent duplicate applications for same candidate and job
applicationSchema.index({ candidateId: 1, jobId: 1 }, { unique: true });
applicationSchema.index({ candidateId: 1 });
applicationSchema.index({ jobId: 1 });
applicationSchema.index({ applicationStatus: 1 });
applicationSchema.index({ appliedDate: -1 });

module.exports = mongoose.model('Application', applicationSchema);
