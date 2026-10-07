const mongoose = require('mongoose');

const interviewSchema = new mongoose.Schema(
  {
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Interview must be tied to an application'],
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Interview must be tied to a candidate'],
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Interview must be tied to a job'],
    },
    interviewerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Interview must have an assigned interviewer'],
    },
    interviewDate: {
      type: String, // Format: YYYY-MM-DD
      required: [true, 'Please provide an interview date (YYYY-MM-DD)'],
    },
    startTime: {
      type: String, // Format: HH:mm (24-hour)
      required: [true, 'Please provide interview start time (HH:mm)'],
    },
    endTime: {
      type: String, // Format: HH:mm (24-hour)
      required: [true, 'Please provide interview end time (HH:mm)'],
    },
    interviewType: {
      type: String,
      enum: ['Technical', 'HR', 'Managerial', 'Behavioral', 'System Design'],
      default: 'Technical',
    },
    locationOrMeetingInfo: {
      type: String,
      required: [true, 'Please provide meeting link, room number, or location'],
      trim: true,
    },
    notes: {
      type: String,
      default: '',
      trim: true,
    },
    status: {
      type: String,
      enum: ['Scheduled', 'Completed', 'Cancelled', 'Rescheduled'],
      default: 'Scheduled',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for scheduling lookups and conflict detection
interviewSchema.index({ interviewerId: 1, interviewDate: 1, status: 1 });
interviewSchema.index({ candidateId: 1, interviewDate: 1, status: 1 });
interviewSchema.index({ applicationId: 1 });
interviewSchema.index({ jobId: 1 });
interviewSchema.index({ status: 1 });

module.exports = mongoose.model('Interview', interviewSchema);
