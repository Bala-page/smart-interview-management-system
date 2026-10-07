const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../app');
const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const Interview = require('../models/Interview');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const ScreeningResult = require('../models/ScreeningResult');

let recruiterToken = '';
let interviewerToken = '';
let candidateToken = '';
let recruiterUser = null;
let interviewerUser = null;
let candidateUser = null;
let testJob = null;
let testApplication = null;
let testInterview = null;

beforeAll(async () => {
  const mongoUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/smart_interview_management';
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(mongoUri);
  }

  // Clear test data
  await Promise.all([
    User.deleteMany({ email: /@test\.local$/ }),
    Job.deleteMany({ title: /Test Job/ }),
  ]);
});

afterAll(async () => {
  // Clean up
  await Promise.all([
    User.deleteMany({ email: /@test\.local$/ }),
    Job.deleteMany({ title: /Test Job/ }),
    Application.deleteMany({}),
    Interview.deleteMany({}),
    Feedback.deleteMany({}),
    ScreeningResult.deleteMany({}),
    Notification.deleteMany({}),
  ]);
  await mongoose.disconnect();
});

describe('1. Authentication & Security API', () => {
  it('should register a candidate successfully', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'John Test Candidate',
      email: 'john.cand@test.local',
      password: 'Password@123',
      role: 'candidate',
      skills: ['React', 'JavaScript', 'Node.js'],
      experience: 3,
    });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
    expect(res.body.data.user.role).toBe('candidate');

    candidateToken = res.body.data.token;
    candidateUser = res.body.data.user;
  });

  it('should reject registering directly as recruiter (unrestricted registration security)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      name: 'Hacker Recruiter',
      email: 'hack@test.local',
      password: 'Password@123',
      role: 'recruiter',
    });

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it('should log in candidate and receive JWT token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'john.cand@test.local',
      password: 'Password@123',
    });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.token).toBeDefined();
  });

  it('should reject login with wrong password', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'john.cand@test.local',
      password: 'WrongPassword',
    });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should return user details on GET /api/auth/me with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('john.cand@test.local');
  });

  it('should reject unauthenticated access', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});

describe('2. Job Management & Access Control', () => {
  beforeAll(async () => {
    // Create recruiter and interviewer accounts directly
    recruiterUser = await User.create({
      name: 'Test Recruiter',
      email: 'recruiter@test.local',
      password: 'Password@123',
      role: 'recruiter',
    });

    interviewerUser = await User.create({
      name: 'Test Interviewer',
      email: 'interviewer@test.local',
      password: 'Password@123',
      role: 'interviewer',
      skills: ['React', 'Node.js', 'System Design'],
    });

    const recLogin = await request(app).post('/api/auth/login').send({
      email: 'recruiter@test.local',
      password: 'Password@123',
    });
    recruiterToken = recLogin.body.data.token;

    const intLogin = await request(app).post('/api/auth/login').send({
      email: 'interviewer@test.local',
      password: 'Password@123',
    });
    interviewerToken = intLogin.body.data.token;
  });

  it('should allow recruiter to create a new job in Draft', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        title: 'Test Job - Senior React Engineer',
        description: 'Build enterprise web applications with React and Node.js',
        requiredSkills: ['React', 'JavaScript', 'Node.js'],
        minimumExperience: 2,
        location: 'Remote',
        employmentType: 'Full-time',
        status: 'Draft',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Draft');
    testJob = res.body.data;
  });

  it('should forbid candidate from creating a job', async () => {
    const res = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        title: 'Hacked Job Posting',
        description: 'Should fail',
        requiredSkills: ['React'],
      });

    expect(res.status).toBe(403);
  });

  it('candidate should NOT see Draft jobs in public job listings', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    const foundDraft = res.body.data.some((j) => j._id === testJob._id);
    expect(foundDraft).toBe(false);
  });

  it('should allow recruiter to publish the job to Open status', async () => {
    const res = await request(app)
      .put(`/api/jobs/${testJob._id}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'Open' });

    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe('Open');
    testJob = res.body.data;
  });

  it('candidate should now see the Open job in job listings', async () => {
    const res = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    const foundJob = res.body.data.some((j) => j._id === testJob._id);
    expect(foundJob).toBe(true);
  });
});

describe('3. Application & Screening Engine', () => {
  it('should allow candidate to apply for the open job and automatically calculate screening score', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        jobId: testJob._id,
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.application.applicationStatus).toBe('Applied');
    expect(res.body.data.screeningResult).toBeDefined();
    expect(res.body.data.screeningResult.overallMatchScore).toBeGreaterThan(0);

    testApplication = res.body.data.application;
  });

  it('should prevent duplicate applications for the same job and candidate', async () => {
    const res = await request(app)
      .post('/api/applications')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        jobId: testJob._id,
      });

    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/already applied/i);
  });

  it('should allow recruiter to transition application status to Shortlisted', async () => {
    const res = await request(app)
      .put(`/api/applications/${testApplication._id}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'Shortlisted' });

    expect(res.status).toBe(200);
    expect(res.body.data.applicationStatus).toBe('Shortlisted');
  });
});

describe('4. Interview Scheduling & Conflict Detection', () => {
  it('should schedule an interview successfully', async () => {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        applicationId: testApplication._id,
        candidateId: candidateUser.id,
        jobId: testJob._id,
        interviewerId: interviewerUser._id,
        interviewDate: '2026-11-15',
        startTime: '10:00',
        endTime: '11:00',
        interviewType: 'Technical',
        locationOrMeetingInfo: 'https://meet.local/room-42',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.status).toBe('Scheduled');
    testInterview = res.body.data;
  });

  it('should detect interviewer double-booking conflict for overlapping time slots', async () => {
    const res = await request(app)
      .post('/api/interviews')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        applicationId: testApplication._id,
        candidateId: candidateUser.id,
        jobId: testJob._id,
        interviewerId: interviewerUser._id,
        interviewDate: '2026-11-15',
        startTime: '10:30', // Overlaps with 10:00 - 11:00
        endTime: '11:30',
        interviewType: 'Technical',
        locationOrMeetingInfo: 'https://meet.local/room-another',
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toMatch(/Conflict detected/i);
  });
});

describe('5. Feedback Management', () => {
  it('assigned interviewer should submit structured feedback', async () => {
    const res = await request(app)
      .post('/api/feedback')
      .set('Authorization', `Bearer ${interviewerToken}`)
      .send({
        interviewId: testInterview._id,
        technicalRating: 5,
        communicationRating: 4,
        problemSolvingRating: 5,
        roleKnowledgeRating: 4,
        overallRating: 5,
        recommendation: 'Hire',
        comments: 'Outstanding demonstration of React principles and Node.js fundamentals.',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.recommendation).toBe('Hire');
  });

  it('candidate should NOT be allowed to view interviewer feedback ratings', async () => {
    const res = await request(app)
      .get(`/api/feedback/${testInterview._id}`)
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(403);
  });
});

describe('6. Hiring Decision & Notifications', () => {
  it('recruiter should finalize hiring decision as Selected', async () => {
    const res = await request(app)
      .put(`/api/applications/${testApplication._id}/status`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ status: 'Selected' });

    expect(res.status).toBe(200);
    expect(res.body.data.applicationStatus).toBe('Selected');
    expect(res.body.data.decision).toBe('Selected');
  });

  it('candidate should have received notification for being selected', async () => {
    const res = await request(app)
      .get('/api/notifications')
      .set('Authorization', `Bearer ${candidateToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const selectedNotif = res.body.data.find((n) => n.type === 'CANDIDATE_SELECTED');
    expect(selectedNotif).toBeDefined();
  });
});
