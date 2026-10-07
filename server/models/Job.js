const mongoose = require('mongoose');

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a job title'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a job description'],
      trim: true,
    },
    requiredSkills: {
      type: [String],
      required: [true, 'Please specify at least one required skill'],
      validate: {
        validator: function (skills) {
          return Array.isArray(skills) && skills.length > 0;
        },
        message: 'A job must specify at least one required skill',
      },
    },
    minimumExperience: {
      type: Number,
      required: [true, 'Please specify minimum experience'],
      min: [0, 'Minimum experience cannot be negative'],
      default: 0,
    },
    maximumExperience: {
      type: Number,
      default: null,
      validate: {
        validator: function (val) {
          if (val === null || val === undefined) return true;
          return val >= this.minimumExperience;
        },
        message: 'Maximum experience must be greater than or equal to minimum experience',
      },
    },
    location: {
      type: String,
      required: [true, 'Please provide a job location'],
      trim: true,
      default: 'Remote',
    },
    employmentType: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time',
    },
    status: {
      type: String,
      enum: ['Draft', 'Open', 'Closed'],
      default: 'Draft',
    },
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Job must have an associated recruiter'],
    },
    publishedAt: {
      type: Date,
      default: null,
    },
    closedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
jobSchema.index({ status: 1 });
jobSchema.index({ recruiterId: 1 });
jobSchema.index({ requiredSkills: 1 });
jobSchema.index({ location: 1 });
jobSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Job', jobSchema);
