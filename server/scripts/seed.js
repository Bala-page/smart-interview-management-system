const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '../.env') });

const User = require('../models/User');
const Job = require('../models/Job');
const Application = require('../models/Application');
const ScreeningResult = require('../models/ScreeningResult');
const Interview = require('../models/Interview');
const Feedback = require('../models/Feedback');
const Notification = require('../models/Notification');
const AuditLog = require('../models/AuditLog');
const { uploadFileToGridFS } = require('../services/gridfsService');
const { connectDB } = require('../config/db');

// Helper to create a valid minimal PDF buffer with embedded text for pdf-parse
const createSimplePdfBuffer = (textContent) => {
  const sanitized = textContent.replace(/[()\\]/g, ' ');
  const streamContent = `BT /F1 12 Tf 50 700 Td (${sanitized}) Tj ET`;
  const streamLength = Buffer.byteLength(streamContent);

  const pdfString = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>
endobj
4 0 obj
<< /Length ${streamLength} >>
stream
${streamContent}
endstream
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000234 00000 n 
0000000330 00000 n 
trailer
<< /Size 6 /Root 1 0 R >>
startxref
400
%%EOF`;

  return Buffer.from(pdfString, 'utf-8');
};

const seedDatabase = async () => {
  try {
    console.log('[Seed] Connecting to MongoDB...');
    await connectDB();

    console.log('[Seed] Clearing existing collections...');
    await Promise.all([
      User.deleteMany({}),
      Job.deleteMany({}),
      Application.deleteMany({}),
      ScreeningResult.deleteMany({}),
      Interview.deleteMany({}),
      Feedback.deleteMany({}),
      Notification.deleteMany({}),
      AuditLog.deleteMany({}),
    ]);

    console.log('[Seed] Creating Users...');
    // 1 Recruiter
    const recruiter = await User.create({
      name: 'Eleanor Vance (Head of Talent)',
      email: 'admin@sims.local',
      password: 'Admin@123',
      role: 'recruiter',
      phone: '+1-555-0101',
      location: 'San Francisco, CA',
      experience: 8,
      bio: 'Lead technical talent acquisition partner specializing in software engineering hires.',
    });

    // 2 Interviewers
    const interviewer1 = await User.create({
      name: 'Sarah Chen (Staff Engineer)',
      email: 'sarah.interviewer@sims.local',
      password: 'Interviewer@123',
      role: 'interviewer',
      phone: '+1-555-0202',
      location: 'Seattle, WA',
      skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'System Design'],
      experience: 7,
      bio: 'Staff frontend engineer with focus on design systems and high-scale web applications.',
    });

    const interviewer2 = await User.create({
      name: 'David Miller (Principal Backend Engineer)',
      email: 'david.interviewer@sims.local',
      password: 'Interviewer@123',
      role: 'interviewer',
      phone: '+1-555-0203',
      location: 'Austin, TX',
      skills: ['Node.js', 'PostgreSQL', 'Docker', 'Kubernetes', 'AWS', 'Microservices'],
      experience: 9,
      bio: 'Principal backend architect focused on microservices, distributed systems and cloud infrastructure.',
    });

    // 3 Candidates
    const cand1ResumeText = 'Alex Mercer Resume. Skills: React, Node.js, Express, MongoDB, JavaScript, Git, REST API. 4 years of experience building modern web apps.';
    const cand1Pdf = createSimplePdfBuffer(cand1ResumeText);
    const cand1GridFile = await uploadFileToGridFS(cand1Pdf, 'Alex_Mercer_Resume.pdf', 'application/pdf');

    const candidate1 = await User.create({
      name: 'Alex Mercer',
      email: 'alex.candidate@sims.local',
      password: 'Candidate@123',
      role: 'candidate',
      phone: '+1-555-0301',
      location: 'New York, NY',
      skills: ['React', 'Node.js', 'MongoDB', 'JavaScript', 'Express', 'Git', 'REST API'],
      experience: 4,
      bio: 'Full stack developer passionate about scalable JavaScript ecosystems and user experience.',
      resumeFileId: cand1GridFile._id,
    });

    const cand2ResumeText = 'Priya Sharma Resume. Skills: React, JavaScript, HTML, CSS, Redux, Tailwind CSS. 3 years of frontend engineering experience.';
    const cand2Pdf = createSimplePdfBuffer(cand2ResumeText);
    const cand2GridFile = await uploadFileToGridFS(cand2Pdf, 'Priya_Sharma_Resume.pdf', 'application/pdf');

    const candidate2 = await User.create({
      name: 'Priya Sharma',
      email: 'priya.candidate@sims.local',
      password: 'Candidate@123',
      role: 'candidate',
      phone: '+1-555-0302',
      location: 'San Jose, CA',
      skills: ['React', 'JavaScript', 'HTML', 'CSS', 'Redux', 'Tailwind CSS'],
      experience: 3,
      bio: 'Frontend specialist experienced in building responsive, accessible UI applications.',
      resumeFileId: cand2GridFile._id,
    });

    const cand3ResumeText = 'Marcus Brody Resume. Skills: Node.js, Express, PostgreSQL, Docker, AWS, REST API, Python. 5 years of backend engineering experience.';
    const cand3Pdf = createSimplePdfBuffer(cand3ResumeText);
    const cand3GridFile = await uploadFileToGridFS(cand3Pdf, 'Marcus_Brody_Resume.pdf', 'application/pdf');

    const candidate3 = await User.create({
      name: 'Marcus Brody',
      email: 'marcus.candidate@sims.local',
      password: 'Candidate@123',
      role: 'candidate',
      phone: '+1-555-0303',
      location: 'Chicago, IL',
      skills: ['Node.js', 'Express', 'PostgreSQL', 'Docker', 'AWS', 'REST API', 'Python'],
      experience: 5,
      bio: 'Senior backend engineer building resilient cloud-native APIs and database architectures.',
      resumeFileId: cand3GridFile._id,
    });

    console.log('[Seed] Creating Jobs...');
    const job1 = await Job.create({
      title: 'Senior Full Stack Engineer',
      description: 'We are seeking an experienced Full Stack Engineer to build and maintain high-throughput web applications across React and Node.js with MongoDB.',
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
      minimumExperience: 3,
      maximumExperience: 6,
      location: 'Remote',
      employmentType: 'Full-time',
      status: 'Open',
      recruiterId: recruiter._id,
      publishedAt: new Date(Date.now() - 10 * 86400000),
    });

    const job2 = await Job.create({
      title: 'React Frontend Developer',
      description: 'Join our product engineering team to build sleek, responsive and modular enterprise interfaces using React and modern CSS.',
      requiredSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Redux'],
      minimumExperience: 2,
      maximumExperience: 5,
      location: 'Hybrid - San Francisco, CA',
      employmentType: 'Full-time',
      status: 'Open',
      recruiterId: recruiter._id,
      publishedAt: new Date(Date.now() - 7 * 86400000),
    });

    const job3 = await Job.create({
      title: 'Backend Systems Architect',
      description: 'Looking for a seasoned backend engineer to design scalable microservices and database solutions with Node.js and cloud tooling.',
      requiredSkills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS', 'REST API'],
      minimumExperience: 4,
      maximumExperience: 8,
      location: 'Remote',
      employmentType: 'Full-time',
      status: 'Open',
      recruiterId: recruiter._id,
      publishedAt: new Date(Date.now() - 5 * 86400000),
    });

    const job4 = await Job.create({
      title: 'DevOps & Cloud Engineer',
      description: 'Manage our infrastructure pipelines, Kubernetes clusters, and automated deployment pipelines.',
      requiredSkills: ['Docker', 'Kubernetes', 'AWS', 'CI/CD', 'Linux'],
      minimumExperience: 3,
      maximumExperience: 7,
      location: 'Remote',
      employmentType: 'Full-time',
      status: 'Draft',
      recruiterId: recruiter._id,
    });

    const job5 = await Job.create({
      title: 'Mobile Engineer (React Native)',
      description: 'Cross-platform mobile application development for iOS and Android.',
      requiredSkills: ['React', 'JavaScript', 'TypeScript', 'REST API'],
      minimumExperience: 2,
      maximumExperience: 5,
      location: 'Remote',
      employmentType: 'Contract',
      status: 'Closed',
      recruiterId: recruiter._id,
      publishedAt: new Date(Date.now() - 20 * 86400000),
      closedAt: new Date(Date.now() - 2 * 86400000),
    });

    console.log('[Seed] Creating Applications & Screening Results...');
    // Application 1: Alex -> Job 1 (Shortlisted)
    const app1 = await Application.create({
      candidateId: candidate1._id,
      jobId: job1._id,
      resumeFileId: candidate1.resumeFileId,
      applicationStatus: 'Shortlisted',
      screeningScore: 92,
      shortlistedAt: new Date(Date.now() - 3 * 86400000),
      appliedDate: new Date(Date.now() - 5 * 86400000),
    });

    await ScreeningResult.create({
      applicationId: app1._id,
      candidateId: candidate1._id,
      jobId: job1._id,
      skillsFound: candidate1.skills,
      matchedSkills: ['JavaScript', 'React', 'Node.js', 'MongoDB', 'Express'],
      missingSkills: [],
      skillMatchPercentage: 100,
      experienceScore: 100,
      overallMatchScore: 92,
      scoreBreakdown: {
        skillsWeight: 60,
        experienceWeight: 25,
        profileWeight: 15,
        notes: 'Matched 5 of 5 required skills (100%). Candidate has 4 yrs exp vs 3 yrs required (100%). Profile completeness: 100%.',
      },
      screeningStatus: 'Shortlisted',
    });

    // Application 2: Priya -> Job 2 (Interview Scheduled)
    const app2 = await Application.create({
      candidateId: candidate2._id,
      jobId: job2._id,
      resumeFileId: candidate2.resumeFileId,
      applicationStatus: 'Interview Scheduled',
      screeningScore: 88,
      shortlistedAt: new Date(Date.now() - 2 * 86400000),
      appliedDate: new Date(Date.now() - 4 * 86400000),
    });

    await ScreeningResult.create({
      applicationId: app2._id,
      candidateId: candidate2._id,
      jobId: job2._id,
      skillsFound: candidate2.skills,
      matchedSkills: ['React', 'JavaScript', 'HTML', 'CSS', 'Redux'],
      missingSkills: [],
      skillMatchPercentage: 100,
      experienceScore: 100,
      overallMatchScore: 88,
      scoreBreakdown: {
        skillsWeight: 60,
        experienceWeight: 25,
        profileWeight: 15,
        notes: 'Matched 5 of 5 required skills (100%). Candidate has 3 yrs exp vs 2 yrs required (100%).',
      },
      screeningStatus: 'Shortlisted',
    });

    // Application 3: Marcus -> Job 3 (Selected)
    const app3 = await Application.create({
      candidateId: candidate3._id,
      jobId: job3._id,
      resumeFileId: candidate3.resumeFileId,
      applicationStatus: 'Selected',
      decision: 'Selected',
      screeningScore: 95,
      shortlistedAt: new Date(Date.now() - 6 * 86400000),
      appliedDate: new Date(Date.now() - 8 * 86400000),
    });

    await ScreeningResult.create({
      applicationId: app3._id,
      candidateId: candidate3._id,
      jobId: job3._id,
      skillsFound: candidate3.skills,
      matchedSkills: ['Node.js', 'PostgreSQL', 'Docker', 'AWS', 'REST API'],
      missingSkills: [],
      skillMatchPercentage: 100,
      experienceScore: 100,
      overallMatchScore: 95,
      scoreBreakdown: {
        skillsWeight: 60,
        experienceWeight: 25,
        profileWeight: 15,
        notes: 'Exceptional skill and experience match across all requirements.',
      },
      screeningStatus: 'Shortlisted',
    });

    // Application 4: Marcus -> Job 1 (Hold)
    const app4 = await Application.create({
      candidateId: candidate3._id,
      jobId: job1._id,
      resumeFileId: candidate3.resumeFileId,
      applicationStatus: 'Hold',
      decision: 'Hold',
      screeningScore: 68,
      appliedDate: new Date(Date.now() - 3 * 86400000),
    });

    await ScreeningResult.create({
      applicationId: app4._id,
      candidateId: candidate3._id,
      jobId: job1._id,
      skillsFound: candidate3.skills,
      matchedSkills: ['Node.js', 'Express'],
      missingSkills: ['JavaScript', 'React', 'MongoDB'],
      skillMatchPercentage: 40,
      experienceScore: 100,
      overallMatchScore: 68,
      scoreBreakdown: {
        skillsWeight: 60,
        experienceWeight: 25,
        profileWeight: 15,
        notes: 'Strong backend foundation but missing core frontend stack requirements (React, MongoDB).',
      },
      screeningStatus: 'Pending',
    });

    console.log('[Seed] Creating Interviews...');
    // Future Scheduled interview: Priya with Sarah Chen
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];
    const interview1 = await Interview.create({
      applicationId: app2._id,
      candidateId: candidate2._id,
      jobId: job2._id,
      interviewerId: interviewer1._id,
      interviewDate: tomorrowStr,
      startTime: '14:00',
      endTime: '15:00',
      interviewType: 'Technical',
      locationOrMeetingInfo: 'https://meet.local/sims-technical-room-4',
      notes: 'Frontend live coding session focusing on React hooks, state management, and accessibility.',
      status: 'Scheduled',
    });

    // Completed interview: Marcus with David Miller
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const interview2 = await Interview.create({
      applicationId: app3._id,
      candidateId: candidate3._id,
      jobId: job3._id,
      interviewerId: interviewer2._id,
      interviewDate: yesterdayStr,
      startTime: '10:00',
      endTime: '11:00',
      interviewType: 'Technical',
      locationOrMeetingInfo: 'https://meet.local/sims-backend-room-1',
      notes: 'System design and API architecture review.',
      status: 'Completed',
    });

    console.log('[Seed] Creating Feedback...');
    const feedback1 = await Feedback.create({
      interviewId: interview2._id,
      candidateId: candidate3._id,
      jobId: job3._id,
      interviewerId: interviewer2._id,
      technicalRating: 5,
      communicationRating: 4,
      problemSolvingRating: 5,
      roleKnowledgeRating: 5,
      overallRating: 5,
      recommendation: 'Hire',
      comments: 'Marcus demonstrated comprehensive distributed system design skills, deep knowledge of PostgreSQL indexing, and strong Docker optimization strategies. Highly recommended for the Backend Systems Architect role.',
    });

    console.log('[Seed] Creating Notifications...');
    await Notification.create([
      {
        recipientUserId: candidate2._id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Technical Interview Scheduled',
        message: `Your Technical interview for "${job2.title}" has been scheduled on ${tomorrowStr} at 14:00.`,
        relatedEntityType: 'Interview',
        relatedEntityId: interview1._id,
        isRead: false,
      },
      {
        recipientUserId: interviewer1._id,
        type: 'INTERVIEW_SCHEDULED',
        title: 'Interview Assignment: Priya Sharma',
        message: `You are scheduled to interview Priya Sharma on ${tomorrowStr} at 14:00.`,
        relatedEntityType: 'Interview',
        relatedEntityId: interview1._id,
        isRead: false,
      },
      {
        recipientUserId: recruiter._id,
        type: 'FEEDBACK_SUBMITTED',
        title: 'Feedback Submitted for Marcus Brody',
        message: `David Miller submitted feedback with recommendation "Hire" (5/5) for Marcus Brody on "${job3.title}".`,
        relatedEntityType: 'Feedback',
        relatedEntityId: feedback1._id,
        isRead: true,
      },
      {
        recipientUserId: candidate3._id,
        type: 'CANDIDATE_SELECTED',
        title: 'Congratulations! Selected for Backend Systems Architect',
        message: `We are pleased to inform you that you have been selected for the position of "${job3.title}".`,
        relatedEntityType: 'Application',
        relatedEntityId: app3._id,
        isRead: false,
      },
    ]);

    console.log('[Seed] Creating Audit Logs...');
    await AuditLog.create([
      {
        actorUserId: recruiter._id,
        action: 'JOB_CREATED',
        entityType: 'Job',
        entityId: job1._id,
        metadata: { title: job1.title },
      },
      {
        actorUserId: recruiter._id,
        action: 'JOB_PUBLISHED',
        entityType: 'Job',
        entityId: job1._id,
        metadata: { title: job1.title },
      },
      {
        actorUserId: candidate1._id,
        action: 'APPLICATION_SUBMITTED',
        entityType: 'Application',
        entityId: app1._id,
        metadata: { jobTitle: job1.title },
      },
      {
        actorUserId: recruiter._id,
        action: 'INTERVIEW_SCHEDULED',
        entityType: 'Interview',
        entityId: interview1._id,
        metadata: { date: tomorrowStr, time: '14:00-15:00' },
      },
      {
        actorUserId: interviewer2._id,
        action: 'FEEDBACK_SUBMITTED',
        entityType: 'Feedback',
        entityId: feedback1._id,
        metadata: { recommendation: 'Hire', rating: 5 },
      },
      {
        actorUserId: recruiter._id,
        action: 'APPLICATION_STATUS_TRANSITION_TO_SELECTED',
        entityType: 'Application',
        entityId: app3._id,
        metadata: { candidate: 'Marcus Brody', job: job3.title },
      },
    ]);

    console.log('===========================================================');
    console.log(' DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('===========================================================');
    console.log('TEST ACCOUNTS:');
    console.log('  1. Recruiter / Admin:');
    console.log('     Email:    admin@sims.local');
    console.log('     Password: Admin@123');
    console.log('  2. Interviewers:');
    console.log('     Email:    sarah.interviewer@sims.local');
    console.log('     Password: Interviewer@123');
    console.log('     Email:    david.interviewer@sims.local');
    console.log('     Password: Interviewer@123');
    console.log('  3. Candidates:');
    console.log('     Email:    alex.candidate@sims.local');
    console.log('     Password: Candidate@123');
    console.log('     Email:    priya.candidate@sims.local');
    console.log('     Password: Candidate@123');
    console.log('     Email:    marcus.candidate@sims.local');
    console.log('     Password: Candidate@123');
    console.log('===========================================================');

    process.exit(0);
  } catch (err) {
    console.error('[Seed Error] Failed to seed database:', err);
    process.exit(1);
  }
};

seedDatabase();
