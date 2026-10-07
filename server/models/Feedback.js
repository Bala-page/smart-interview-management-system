const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    interviewId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Interview',
      required: [true, 'Feedback must be associated with an interview'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Feedback must reference the candidate'],
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Feedback must reference the job'],
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Feedback must reference the interviewer'],
    },
    technicalRating: {
      type: Number,
      required: [true, 'Technical rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    communicationRating: {
      type: Number,
      required: [true, 'Communication rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    problemSolvingRating: {
      type: Number,
      required: [true, 'Problem solving rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    roleKnowledgeRating: {
      type: Number,
      required: [true, 'Role knowledge rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    overallRating: {
      type: Number,
      required: [true, 'Overall rating is required'],
      min: [1, 'Minimum rating is 1'],
      max: [5, 'Maximum rating is 5'],
    },
    recommendation: {
      type: String,
      enum: {
        values: ['Hire', 'Reject', 'Hold'],
        message: '{VALUE} is not a valid recommendation (Hire, Reject, Hold)',
      },
      required: [true, 'Please provide a recommendation (Hire, Reject, Hold)'],
    },
    comments: {
      type: String,
      required: [true, 'Please provide qualitative feedback and comments'],
      trim: true,
      minlength: [10, 'Comments should be at least 10 characters long'],
    },
  },
  {
    timestamps: true,
  }
);

// One feedback per interviewer per interview
feedbackSchema.index({ interviewId: 1, interviewerId: 1 }, { unique: true });
feedbackSchema.index({ candidateId: 1 });
feedbackSchema.index({ jobId: 1 });

module.exports = mongoose.model('Feedback', feedbackSchema);
