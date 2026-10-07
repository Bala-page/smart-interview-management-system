const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Notification must have a recipient'],
    },
    type: {
      type: String,
      enum: [
        'APPLICATION_SUBMITTED',
        'CANDIDATE_SHORTLISTED',
        'INTERVIEW_SCHEDULED',
        'INTERVIEW_RESCHEDULED',
        'INTERVIEW_CANCELLED',
        'FEEDBACK_SUBMITTED',
        'FEEDBACK_REMINDER',
        'CANDIDATE_SELECTED',
        'CANDIDATE_REJECTED',
        'CANDIDATE_HOLD',
        'SYSTEM_INFO',
      ],
      default: 'SYSTEM_INFO',
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    message: {
      type: String,
      required: true,
      trim: true,
    },
    relatedEntityType: {
      type: String,
      enum: ['Application', 'Interview', 'Job', 'Feedback', 'User', 'General'],
      default: 'General',
    },
    relatedEntityId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },
    isRead: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for fast unread counts and recent notification retrieval
notificationSchema.index({ recipientUserId: 1, isRead: 1 });
notificationSchema.index({ recipientUserId: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
