# Online Assessment & Automated Candidate Shortlisting Module

## 1. Overview
The **Online Assessment Module** extends the Smart Interview Management System (SIMS) with an enterprise-grade, locally executable technical evaluation engine. It enables recruiters to assess shortlisted or applied candidates via timed multiple-choice question (MCQ) tests tailored specifically to the job's required skills before proceeding to technical interview scheduling.

---

## 2. Key Architecture & Features

### 2.1 Fixed 10-Question Balanced Selection
- **Job Skill Alignment**: The engine inspects the job's `requiredSkills` array.
- **Difficulty Balancing**: Selects exactly 10 questions based on a configurable distribution (Default: 3 Easy, 5 Medium, 2 Hard).
- **Skill Round-Robin**: Balances question allocation across required skills to avoid skill over-representation.
- **Deficit Detection**: Automatically verifies question availability; if questions for required skills are lacking, the recruiter receives an actionable deficit report.
- **Question & Option Randomization**: Question order and option ordering are randomized and captured in an immutable snapshot upon assignment.

### 2.2 Authoritative 15-Minute Countdown
- **Backend Enforced**: When the candidate starts the attempt, the server persists `startedAt` and `expiresAt` (`startedAt + 15 minutes`).
- **Resilient to Client Manipulation**: Client refresh or clock changes do not reset the timer.
- **Auto-Submission on Expiry**: When the 15-minute deadline passes, answer submissions are rejected and the test auto-finalizes with `submissionReason: 'Time Expired'`.

### 2.3 Strict Anti-Cheating & Proctoring Deterrence (3-Strike Policy)
- **Fullscreen Enforcement**: Candidates enter browser fullscreen on test initiation. Exiting fullscreen triggers a violation event.
- **Tab Switching & Blur Tracking**: Listens for `visibilitychange` (tab switch) and `window.blur` (minimizing or clicking outside the test window).
- **Event Deduplication**: Rapid simultaneous browser events are throttled to prevent false double-counting.
- **3-Strike Termination**:
  - **Violation 1**: Warning alert issued.
  - **Violation 2**: Critical warning issued.
  - **Violation 3**: Immediate server-side termination (`status: 'Terminated'`, `submissionReason: 'Maximum Tab Violations'`) and instant evaluation of previously saved answers.

### 2.4 Automatic Answer Persistence
- **30-Second Periodic Autosave**: Background interval persists chosen answers every 30 seconds.
- **Debounced Selection Save**: Option changes trigger immediate debounced server saves.
- **Auditable Status**: Visual indicators show "Saved", "Saving...", and last saved timestamp.

### 2.5 Instant Server-Side Evaluation
- **Zero External AI / Cloud Dependency**: Completely local Node.js evaluation engine.
- **Metrics Calculated**:
  - Total score (`score / 10`)
  - Percentage score (`percentage = (score / total) * 100`)
  - Status (`Passed` vs `Not Qualified` vs `Terminated`) based on recruiter-configured threshold (default: 60%)
  - Skill-wise proficiency breakdown
  - Violation audit trail
- **Idempotency**: Repeated submission calls do not re-evaluate or generate duplicate notifications.
- **Application Integration**: Automatically records score on `Application` and transitions status to `'Assessment Completed'`.

### 2.6 Result Visibility Policies
- **`Immediate`**: Candidates immediately view score, percentage, pass/fail result, and skill-wise breakdown.
- **`After Review`**: Candidate view indicates completion; detailed score unlocks after recruiter review.
- **`Hidden`**: Candidates view confirmation of submission; detailed score is retained for recruiters and interviewers only.

---

## 3. Data Models

### 3.1 `AssessmentQuestion`
| Field | Type | Description |
|---|---|---|
| `questionText` | String | The question statement |
| `questionType` | String (`'MCQ'`) | Question format |
| `options` | `[{ id, text }]` | Minimum 2, default 4 options |
| `correctAnswer` | String | Option ID matching the correct answer |
| `explanation` | String | Explanation of correct solution |
| `skill` | String | Technical skill (e.g., React, Node.js, SQL) |
| `difficulty` | String (`'Easy'`, `'Medium'`, `'Hard'`) | Difficulty level |
| `marks` | Number | Points awarded (default: 1) |
| `isActive` | Boolean | Soft active toggle |

### 3.2 `Assessment`
| Field | Type | Description |
|---|---|---|
| `jobId` | ObjectId ref `'Job'` | Linked job opening |
| `title` | String | Assessment title |
| `durationMinutes` | Number | Duration in minutes (15) |
| `totalQuestions` | Number | Total questions (10) |
| `passingPercentage`| Number | Passing threshold percentage (default: 60) |
| `questionDistribution` | Object | `{ easy: 3, medium: 5, hard: 2 }` |
| `resultVisibility` | String | `'Immediate'`, `'After Review'`, `'Hidden'` |

### 3.3 `AssessmentAttempt`
| Field | Type | Description |
|---|---|---|
| `assessmentId` | ObjectId ref `'Assessment'` | Template reference |
| `applicationId` | ObjectId ref `'Application'` | Job application reference |
| `candidateId` | ObjectId ref `'User'` | Candidate reference |
| `questionsSnapshot` | Array | Immutable snapshot of 10 questions with shuffled options |
| `answers` | `[{ questionId, selectedOptionId, savedAt }]` | Persisted candidate choices |
| `startedAt` / `expiresAt` | Date | Timestamps defining authoritative 15-minute countdown |
| `status` | String | `'Assigned'`, `'In Progress'`, `'Submitted'`, `'Auto Submitted'`, `'Terminated'`, `'Evaluated'` |
| `score` / `percentage` / `passed` | Number / Boolean | Instant evaluation metrics |
| `violationCount` / `violationEvents` | Number / Array | Anti-cheating audit trail |

---

## 4. API Endpoints

### Question Bank (`/api/question-bank`)
- `GET /api/question-bank` — Filter & paginate questions (Recruiter only)
- `GET /api/question-bank/stats` — Available questions count per skill & difficulty (Recruiter only)
- `POST /api/question-bank` — Add new MCQ question (Recruiter only)
- `GET /api/question-bank/:id` — Preview question details (Recruiter only)
- `PUT /api/question-bank/:id` — Update question (Recruiter only)
- `PUT /api/question-bank/:id/status` — Toggle active / soft deactivate (Recruiter only)
- `POST /api/question-bank/import` — Bulk import questions via validated JSON (Recruiter only)

### Assessments (`/api/assessments`)
- `POST /api/assessments/assign` — Recruiter assigns 10-MCQ assessment to candidate
- `GET /api/assessments/recruiter/attempts` — Recruiter roster with KPI stats, search, and filters
- `GET /api/assessments/candidate/my-assessments` — Candidate lists assigned assessments
- `POST /api/assessments/attempts/:id/start` — Candidate starts test (sets 15-min timer, masks answers)
- `GET /api/assessments/attempts/:id/take` — Active test recovery (sanitized snapshot without answer key)
- `PUT /api/assessments/attempts/:id/save-answers` — Autosave answers every 30s & on selection
- `POST /api/assessments/attempts/:id/record-violation` — Record tab switch / fullscreen exit (terminates on strike 3)
- `POST /api/assessments/attempts/:id/submit` — Finalize & evaluate test (manual or auto-submit)
- `GET /api/assessments/attempts/:id/result` — Role-based result breakdown
- `POST /api/assessments/attempts/:id/authorize-retake` — Recruiter resets attempt with fresh questions
