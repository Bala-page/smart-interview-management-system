# Automated Testing & Quality Assurance: SIMS

## 1. Testing Strategy

The application includes an automated integration test suite written with **Jest** and **Supertest** targeting the live Express REST API and MongoDB Community database.

Tests cover:
- Candidate registration and input validation
- Security restrictions (preventing public recruiter self-registration)
- Login authentication, password verification, and JWT generation
- Profile querying (`/api/auth/me`) and unauthenticated access rejection
- Recruiter job creation, draft protection, candidate visibility filtering, and status publishing
- Candidate job applications with automated deterministic screening calculation
- Compound unique index prevention for duplicate applications
- Application status transitions and workflow state validation
- Interview scheduling and double-booking conflict detection for overlapping time slots
- Assigned interviewer structured feedback submission with rating bounds (1-5)
- Confidential feedback isolation (blocking candidate inspection)
- Recruiter final hiring decision transition to `Selected`
- Automatic in-app notification dispatching

---

## 2. Running Automated Tests

From the monorepo root:
```bash
npm run test:server
```

Or from the `server` directory:
```bash
cd server
npm test
```

---

## 3. Test Results Summary

```text
PASS tests/api.test.js
  1. Authentication & Security API
    ✓ should register a candidate successfully
    ✓ should reject registering directly as recruiter (unrestricted registration security)
    ✓ should log in candidate and receive JWT token
    ✓ should reject login with wrong password
    ✓ should return user details on GET /api/auth/me with valid token
    ✓ should reject unauthenticated access
  2. Job Management & Access Control
    ✓ should allow recruiter to create a new job in Draft
    ✓ should forbid candidate from creating a job
    ✓ candidate should NOT see Draft jobs in public job listings
    ✓ should allow recruiter to publish the job to Open status
    ✓ candidate should now see the Open job in job listings
  3. Application & Screening Engine
    ✓ should allow candidate to apply for the open job and automatically calculate screening score
    ✓ should prevent duplicate applications for the same job and candidate
    ✓ should allow recruiter to transition application status to Shortlisted
  4. Interview Scheduling & Conflict Detection
    ✓ should schedule an interview successfully
    ✓ should detect interviewer double-booking conflict for overlapping time slots
  5. Feedback Management
    ✓ assigned interviewer should submit structured feedback
    ✓ candidate should NOT be allowed to view interviewer feedback ratings
  6. Hiring Decision & Notifications
    ✓ recruiter should finalize hiring decision as Selected
    ✓ candidate should have received notification for being selected

Test Suites: 1 passed, 1 total
Tests:       20 passed, 20 total
```

---

## 4. End-to-End Verification Runbook

Follow this step-by-step verification checklist to validate the complete business lifecycle:

1. **Recruiter Sign In**:
   - Navigate to `http://localhost:5173/login`.
   - Click the **Recruiter** quick-fill button (`admin@sims.local` / `Admin@123`).
   - Click **Sign In**.
   - Verify KPI cards, Hiring Funnel chart, and Recent Applications load on the Recruiter Dashboard.

2. **Job Creation & Publishing**:
   - Click **Post New Job** (`/recruiter/jobs/create`).
   - Fill Title: "Staff Cloud Engineer", Required Skills: "AWS, Docker, Kubernetes, Python", Min Exp: 3.
   - Set status to `Open` and submit.
   - Verify the job appears in the Jobs Management table.

3. **Candidate Registration & Application**:
   - Log out.
   - Register a new candidate (`/register`) or log in as Alex Mercer (`alex.candidate@sims.local` / `Candidate@123`).
   - Navigate to **Browse Open Jobs** (`/candidate/jobs`).
   - Click **Apply Now** on "Staff Cloud Engineer".
   - Notice the automated screening score generated and application status set to `Applied`.
   - Try clicking Apply again; observe duplicate application is prevented.

4. **Recruiter Shortlisting & Interview Scheduling**:
   - Log in as Recruiter (`admin@sims.local`).
   - Navigate to **Applications & Screening** (`/recruiter/applications`).
   - Click **Review** on the new application.
   - Inspect the candidate profile, resume PDF, and deterministic skill match breakdown.
   - Click **Shortlist Candidate**.
   - Click **Schedule Interview**. Assign Sarah Chen (`sarah.interviewer@sims.local`), pick date and time slot (e.g. 11:00 - 12:00).
   - Attempt to schedule another interview for Sarah Chen at 11:30 - 12:30 on the same date; verify scheduling conflict is flagged!

5. **Interviewer Evaluation**:
   - Log in as Sarah Chen (`sarah.interviewer@sims.local` / `Interviewer@123`).
   - Go to **Assigned Interviews** (`/interviewer/interviews`).
   - Click **Submit Feedback**.
   - Provide ratings (Technical: 5, Communication: 4, Problem Solving: 5, Role Knowledge: 4, Overall: 5), Recommendation: `Hire`, and notes.
   - Submit feedback; verify status transitions to `Completed`.

6. **Recruiter Decision & Notification Verification**:
   - Log in as Recruiter.
   - Go to **Hiring Decisions** (`/recruiter/decisions`) or **Feedback Review** (`/recruiter/feedback`).
   - Review the submitted ratings.
   - Click **Select** to make the final hiring offer.
   - Log in as the candidate; verify the application status says **Selected** and notification appears in the notification panel!
   - Log in as Recruiter and check **Reports & Analytics** (`/recruiter/reports`); verify funnel metrics, selection ratios, and interviewer ratings are updated in real-time.
