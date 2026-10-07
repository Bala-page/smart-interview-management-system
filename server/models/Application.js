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
        'Shortlisted',
        'Interview Scheduled',
        'Interview Completed',
        'Selected',
        'Rejected',
        'Hold',
      ],
      default: 'Applied',
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
