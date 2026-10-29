const mongoose = require('mongoose');

const snapshotOptionSchema = new mongoose.Schema(
  {
    id: { type: String, required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const questionSnapshotSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'AssessmentQuestion',
      required: true,
    },
    questionText: { type: String, required: true },
    skill: { type: String, required: true },
    difficulty: { type: String, required: true },
    marks: { type: Number, default: 1 },
    options: [snapshotOptionSchema],
    correctAnswer: { type: String, required: true },
    explanation: { type: String, default: '' },
  },
  { _id: false }
);

const answerSchema = new mongoose.Schema(
  {
    questionId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    selectedOptionId: {
      type: String,
      default: null,
    },
    savedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const violationEventSchema = new mongoose.Schema(
  {
    eventType: {
      type: String,
      required: true,
      enum: ['visibilitychange', 'blur', 'fullscreen_exit', 'suspicious_activity'],
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    violationNumber: {
      type: Number,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
  },
  { _id: false }
);

const skillWiseResultSchema = new mongoose.Schema(
  {
    skill: { type: String, required: true },
    totalQuestions: { type: Number, required: true },
    correctCount: { type: Number, required: true },
    score: { type: Number, required: true },
    percentage: { type: Number, required: true },
  },
  { _id: false }
);

const assessmentAttemptSchema = new mongoose.Schema(
  {
    assessmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Assessment',
      required: [true, 'Attempt must link to an assessment template'],
      index: true,
    },
    applicationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Attempt must link to a job application'],
      index: true,
    },
    candidateId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Attempt must link to a candidate'],
      index: true,
    },
    jobId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Attempt must link to a job'],
      index: true,
    },
    questionsSnapshot: {
      type: [questionSnapshotSchema],
      default: [],
    },
    answers: {
      type: [answerSchema],
      default: [],
    },
    startedAt: {
      type: Date,
      default: null,
    },
    expiresAt: {
      type: Date,
      default: null,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
    durationSeconds: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: [
        'Assigned',
        'In Progress',
        'Submitted',
        'Auto Submitted',
        'Terminated',
        'Evaluated',
      ],
      default: 'Assigned',
      index: true,
    },
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 10,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    passed: {
      type: Boolean,
      default: false,
    },
    skillWiseResults: {
      type: [skillWiseResultSchema],
      default: [],
    },
    violationCount: {
      type: Number,
      default: 0,
    },
    violationEvents: {
      type: [violationEventSchema],
      default: [],
    },
    submissionReason: {
      type: String,
      enum: [
        'Manual Submission',
        'Time Expired',
        'Maximum Tab Violations',
        'Recruiter Termination',
        null,
      ],
      default: null,
    },
    evaluationStatus: {
      type: String,
      enum: ['Pending', 'Completed', 'Failed'],
      default: 'Pending',
    },
    resultVisibility: {
      type: String,
      enum: ['Immediate', 'After Review', 'Hidden'],
      default: 'Immediate',
    },
  },
  {
    timestamps: true,
  }
);

assessmentAttemptSchema.index({ candidateId: 1, applicationId: 1 });
assessmentAttemptSchema.index({ jobId: 1, status: 1 });

module.exports = mongoose.model('AssessmentAttempt', assessmentAttemptSchema);
