const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const { connectDB } = require('../config/db');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Assessment = require('../models/Assessment');
const AssessmentQuestion = require('../models/AssessmentQuestion');
const AssessmentAttempt = require('../models/AssessmentAttempt');
const { seedQuestionBank } = require('../scripts/seedQuestions');
const { selectAssessmentQuestions } = require('../services/questionSelectionService');
const { evaluateAttempt } = require('../services/assessmentEvaluationService');

let recruiterToken = '';
let candidateToken = '';
let recruiterUser = null;
let candidateUser = null;
let testJob = null;
let testApplication = null;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await connectDB();
  }

  // Clear previous test records
  await Promise.all([
    User.deleteMany({ email: /@assessment-test\.local$/ }),
    Job.deleteMany({ title: /Assessment Test Job/ }),
    AssessmentQuestion.deleteMany({ skill: 'AssessmentTestSkill' }),
  ]);

  // Seed question bank
  await seedQuestionBank();

  // Create recruiter
  recruiterUser = await User.create({
    name: 'Assessment Recruiter',
    email: 'recruiter@assessment-test.local',
    password: 'Password@123',
    role: 'recruiter',
  });

  // Create candidate
  candidateUser = await User.create({
    name: 'Assessment Candidate',
    email: 'candidate@assessment-test.local',
    password: 'Password@123',
    role: 'candidate',
  });

  // Login recruiter
  const recLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'recruiter@assessment-test.local', password: 'Password@123' });
  recruiterToken = recLogin.body.data.token;

  // Login candidate
  const candLogin = await request(app)
    .post('/api/auth/login')
    .send({ email: 'candidate@assessment-test.local', password: 'Password@123' });
  candidateToken = candLogin.body.data.token;

  // Create test job
  testJob = await Job.create({
    title: 'Assessment Test Job - Full Stack Developer',
    description: 'Requires React, Node.js, and JavaScript.',
    department: 'Engineering',
    location: 'Remote',
    employmentType: 'Full-time',
    requiredSkills: ['React', 'Node.js', 'JavaScript'],
    minimumExperience: 2,
    salaryRange: { min: 70000, max: 95000 },
    recruiterId: recruiterUser._id,
    status: 'Open',
  });

  // Create candidate application
  testApplication = await Application.create({
    candidateId: candidateUser._id,
    jobId: testJob._id,
    applicationStatus: 'Applied',
    screeningScore: 85,
  });
});

afterAll(async () => {
  await Promise.all([
    User.deleteMany({ email: /@assessment-test\.local$/ }),
    Job.deleteMany({ title: /Assessment Test Job/ }),
    Application.deleteMany({ jobId: testJob?._id }),
    Assessment.deleteMany({ jobId: testJob?._id }),
    AssessmentAttempt.deleteMany({ candidateId: candidateUser?._id }),
    AssessmentQuestion.deleteMany({ skill: 'AssessmentTestSkill' }),
  ]);
  await mongoose.disconnect();
});

describe('Online Assessment & Candidate Shortlisting Module', () => {
  let createdQuestionId = null;
  let activeAttemptId = null;

  // 1. Question Bank Management
  describe('1. Question Bank Management', () => {
    it('recruiter should be able to create an MCQ question with valid options', async () => {
      const res = await request(app)
        .post('/api/question-bank')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          questionText: 'What is the virtual DOM in React?',
          skill: 'React',
          difficulty: 'Easy',
          marks: 1,
          options: [
            { id: 'opt_1', text: 'A lightweight JavaScript representation of the real DOM' },
            { id: 'opt_2', text: 'A direct replacement for the browser engine' },
            { id: 'opt_3', text: 'A CSS preprocessor' },
            { id: 'opt_4', text: 'A MongoDB collection' },
          ],
          correctAnswer: 'opt_1',
          explanation: 'React maintains a virtual DOM tree in memory to calculate minimal diffs.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.questionText).toBe('What is the virtual DOM in React?');
      expect(res.body.data.correctAnswer).toBe('opt_1');
      createdQuestionId = res.body.data._id;
    });

    it('should reject question creation if correctAnswer is not in options', async () => {
      const res = await request(app)
        .post('/api/question-bank')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          questionText: 'Invalid Question Test?',
          skill: 'React',
          difficulty: 'Easy',
          options: [
            { id: 'opt_1', text: 'Choice A' },
            { id: 'opt_2', text: 'Choice B' },
          ],
          correctAnswer: 'opt_non_existent',
        });

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('candidate should be forbidden (403) from accessing question bank', async () => {
      const res = await request(app)
        .get('/api/question-bank')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(403);
      expect(res.body.success).toBe(false);
    });

    it('recruiter should fetch question bank stats per skill and difficulty', async () => {
      const res = await request(app)
        .get('/api/question-bank/stats')
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.totalQuestions).toBeGreaterThanOrEqual(10);
      expect(res.body.data.skills.length).toBeGreaterThan(0);
    });

    it('recruiter should toggle question status (active/deactivate)', async () => {
      const res = await request(app)
        .put(`/api/question-bank/${createdQuestionId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.isActive).toBe(false);

      // Re-activate
      await request(app)
        .put(`/api/question-bank/${createdQuestionId}/status`)
        .set('Authorization', `Bearer ${recruiterToken}`);
    });
  });

  // 2. Job-Based Question Selection Service
  describe('2. Job-Based Question Selection Service', () => {
    it('should select exactly 10 questions satisfying difficulty distribution (3 Easy, 5 Medium, 2 Hard)', async () => {
      const snapshot = await selectAssessmentQuestions(
        ['React', 'Node.js', 'JavaScript'],
        { easy: 3, medium: 5, hard: 2 }
      );

      expect(snapshot).toHaveLength(10);
      const easyCount = snapshot.filter((q) => q.difficulty === 'Easy').length;
      const mediumCount = snapshot.filter((q) => q.difficulty === 'Medium').length;
      const hardCount = snapshot.filter((q) => q.difficulty === 'Hard').length;

      expect(easyCount).toBe(3);
      expect(mediumCount).toBe(5);
      expect(hardCount).toBe(2);

      // Verify options are shuffled but intact
      snapshot.forEach((q) => {
        expect(q.options.length).toBeGreaterThanOrEqual(2);
        expect(q.correctAnswer).toBeDefined();
      });
    });

    it('should throw deficit error when question bank lacks questions for a skill', async () => {
      await expect(
        selectAssessmentQuestions(['NonExistentSkillXYZ'], { easy: 3, medium: 5, hard: 2 })
      ).rejects.toThrow(/Insufficient questions in Question Bank/);
    });
  });

  // 3. Assessment Assignment
  describe('3. Assessment Assignment', () => {
    it('recruiter should assign a 15-minute 10-MCQ assessment to the candidate', async () => {
      const res = await request(app)
        .post('/api/assessments/assign')
        .set('Authorization', `Bearer ${recruiterToken}`)
        .send({
          jobId: testJob._id,
          candidateId: candidateUser._id,
          applicationId: testApplication._id,
          durationMinutes: 15,
          passingPercentage: 60,
          resultVisibility: 'Immediate',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attemptId).toBeDefined();
      expect(res.body.data.totalQuestions).toBe(10);
      expect(res.body.data.durationMinutes).toBe(15);

      activeAttemptId = res.body.data.attemptId;

      // Verify application status updated to 'Assessment Assigned'
      const updatedApp = await Application.findById(testApplication._id);
      expect(updatedApp.applicationStatus).toBe('Assessment Assigned');
      expect(updatedApp.assessmentAttemptId.toString()).toBe(activeAttemptId);
    });

    it('candidate should see the assigned assessment in their assessment list', async () => {
      const res = await request(app)
        .get('/api/assessments/candidate/my-assessments')
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.length).toBeGreaterThanOrEqual(1);

      const assigned = res.body.data.find((a) => a._id.toString() === activeAttemptId);
      expect(assigned).toBeDefined();
      expect(assigned.status).toBe('Assigned');
      expect(assigned.totalQuestions).toBe(10);
    });
  });

  // 4. Candidate Starts Test & Authoritative 15-Minute Countdown
  describe('4. Candidate Starts Test & Security Masking', () => {
    it('candidate starts test: sets startedAt, 15-minute expiresAt, and masks correct answers', async () => {
      const res = await request(app)
        .post(`/api/assessments/attempts/${activeAttemptId}/start`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.startedAt).toBeDefined();
      expect(res.body.data.expiresAt).toBeDefined();
      expect(res.body.data.durationMinutes).toBe(15);
      expect(res.body.data.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.data.questions).toHaveLength(10);

      // CRITICAL SECURITY REQUIREMENT: Verify correctAnswer and explanation are stripped
      res.body.data.questions.forEach((q) => {
        expect(q.correctAnswer).toBeUndefined();
        expect(q.explanation).toBeUndefined();
        expect(q.options.length).toBeGreaterThanOrEqual(2);
      });
    });

    it('candidate can recover active test state without resetting the timer', async () => {
      const res = await request(app)
        .get(`/api/assessments/attempts/${activeAttemptId}/take`)
        .set('Authorization', `Bearer ${candidateToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('In Progress');
      expect(res.body.data.remainingSeconds).toBeGreaterThan(0);
      expect(res.body.data.questions).toHaveLength(10);
      // Still masked
      expect(res.body.data.questions[0].correctAnswer).toBeUndefined();
    });
  });

  // 5. Automatic Answer Saving
  describe('5. Automatic Answer Saving', () => {
    it('candidate saves answers periodically or upon selection', async () => {
      const attempt = await AssessmentAttempt.findById(activeAttemptId);
      const firstQ = attempt.questionsSnapshot[0];
      const secondQ = attempt.questionsSnapshot[1];

      const res = await request(app)
        .put(`/api/assessments/attempts/${activeAttemptId}/save-answers`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({
          answers: [
            { questionId: firstQ.questionId, selectedOptionId: firstQ.correctAnswer },
            { questionId: secondQ.questionId, selectedOptionId: secondQ.options[0].id },
          ],
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.answersCount).toBe(2);

      const refreshed = await AssessmentAttempt.findById(activeAttemptId);
      expect(refreshed.answers.length).toBe(2);
    });
  });

  // 6. Tab Violations & Anti-Cheating (3 Strikes)
  describe('6. Tab Violations & 3-Strike Policy', () => {
    it('strike 1: should record violation and issue warning without terminating', async () => {
      const res = await request(app)
        .post(`/api/assessments/attempts/${activeAttemptId}/record-violation`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ eventType: 'visibilitychange', description: 'Tab switch' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.violationCount).toBe(1);
      expect(res.body.terminated).toBe(false);
    });

    it('strike 2: should record second violation without terminating', async () => {
      // Advance clock slightly for deduplication
      await new Promise((r) => setTimeout(r, 1600));

      const res = await request(app)
        .post(`/api/assessments/attempts/${activeAttemptId}/record-violation`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ eventType: 'blur', description: 'Window blur' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.violationCount).toBe(2);
      expect(res.body.terminated).toBe(false);
    });

    it('strike 3: should immediately terminate assessment and auto-submit', async () => {
      await new Promise((r) => setTimeout(r, 1600));

      const res = await request(app)
        .post(`/api/assessments/attempts/${activeAttemptId}/record-violation`)
        .set('Authorization', `Bearer ${candidateToken}`)
        .send({ eventType: 'fullscreen_exit', description: 'Exited fullscreen' });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.terminated).toBe(true);
      expect(res.body.violationCount).toBe(3);

      const terminatedAttempt = await AssessmentAttempt.findById(activeAttemptId);
      expect(terminatedAttempt.status).toBe('Evaluated');
      expect(terminatedAttempt.submissionReason).toBe('Maximum Tab Violations');
      expect(terminatedAttempt.evaluationStatus).toBe('Completed');
    });
  });

  // 7. Instant Evaluation & Result Review
  describe('7. Instant Evaluation & Result Review', () => {
    it('recruiter and interviewer can review comprehensive question breakdown and violations', async () => {
      const res = await request(app)
        .get(`/api/assessments/attempts/${activeAttemptId}/result`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.attempt.score).toBeDefined();
      expect(res.body.data.attempt.violationCount).toBe(3);
      expect(res.body.data.attempt.questionsReview).toHaveLength(10);
      expect(res.body.data.attempt.skillWiseResults.length).toBeGreaterThan(0);
    });

    it('recruiter can authorize a retake for terminated or failed candidate', async () => {
      const res = await request(app)
        .post(`/api/assessments/attempts/${activeAttemptId}/authorize-retake`)
        .set('Authorization', `Bearer ${recruiterToken}`);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.data.status).toBe('Assigned');

      const resetAttempt = await AssessmentAttempt.findById(activeAttemptId);
      expect(resetAttempt.status).toBe('Assigned');
      expect(resetAttempt.violationCount).toBe(0);
      expect(resetAttempt.score).toBe(0);
    });
  });
});
