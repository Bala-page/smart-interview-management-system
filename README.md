# Smart Interview Management System (SIMS) — MERN Stack

An enterprise-grade, production-style **Smart Interview Management System** built with the **MERN** stack (MongoDB Community Edition, Express.js, React.js, Node.js) and designed to run **100% locally** without any cloud backend, cloud storage, external authentication, or cloud AI services.

The system manages the complete recruitment lifecycle:

**Job Creation → Job Publishing → Candidate Registration → Job Search → Application → Resume Upload → Resume Parsing → Skill Matching → Screening → Shortlisting → Interview Scheduling → Interviewer Assignment → Interview Feedback → Hiring Decision → Candidate Status Tracking → Notifications → Dashboards → Reports & Analytics**

---

## 1. Key Features

- **100% Offline & Local Operation**: Zero external APIs or cloud dependencies (no Firebase, Supabase, Atlas, AWS, SendGrid, OpenAI, etc.).
- **Deterministic Local Screening Engine**: Transparent skill matching, experience scoring, and explainable breakdowns computed locally using configurable dictionaries and native algorithms without black-box AI.
- **Local PDF Resume Parsing**: Automated text extraction and skill discovery using local `pdf-parse`.
- **MongoDB GridFS Resume Storage**: PDF resumes are securely stored and streamed directly using native MongoDB GridFS buckets.
- **Interview Conflict Detection**: Automated overlapping slot validation preventing interviewer and candidate double-booking.
- **Controlled Application Lifecycle**: State machine governing transitions (`Applied` → `Shortlisted` → `Interview Scheduled` → `Interview Completed` → `Selected` / `Rejected` / `Hold`).
- **In-App Real-Time Notifications**: Unread counts, read markers, and local Server-Sent Events (SSE) notification streaming.
- **Interactive Dashboards & Analytics**: Tailored dashboards for Recruiters, Interviewers, and Candidates, with native SVG charts (Hiring Funnel, Bar charts, Score Gauges, Conversion Ratios).
- **Role-Based Access Control (RBAC)**: JWT authentication, bcrypt password hashing, resource ownership guards, and audit trail logging.

---

## 2. Technology Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend** | React 18, Vite | Single-page application and responsive user interface |
| **State Management** | Redux Toolkit, React-Redux | Client-side auth, notifications, and application state |
| **Styling** | Pure CSS, CSS Variables | Original enterprise design with zero CDN dependencies |
| **Backend** | Node.js (v24), Express.js | Modular REST API server and business logic |
| **Database** | MongoDB Community Edition | Document persistence and aggregation queries |
| **ODM & Storage** | Mongoose, MongoDB GridFS | Data modeling, validations, and PDF chunked storage |
| **Auth & Security** | JWT, bcryptjs | Stateless token authentication and password hashing |
| **File Processing** | Multer, pdf-parse | Local multipart upload handling and PDF text parsing |
| **Testing** | Jest, Supertest | Automated integration test suite |

---

## 3. Project Structure

```text
Inner-Source-Project/
│
├── client/                      # Frontend Application (React 18 + Vite)
│   ├── src/
│   │   ├── components/          # Reusable UI widgets, Modals, SVG Icons & Charts
│   │   │   └── Charts/          # Native SVG Funnel, Bar, and Gauge charts
│   │   ├── pages/               # Role-based pages
│   │   │   ├── auth/            # Login, Register
│   │   │   ├── recruiter/       # Jobs, Apps, Screening, Interviews, Reports
│   │   │   ├── interviewer/     # Dashboard, Assigned interviews, Feedback
│   │   │   └── candidate/       # Dashboard, Job search, Profile, Applications
│   │   ├── layouts/             # MainLayout and AuthLayout shells
│   │   ├── routes/              # ProtectedRoute role guard
│   │   ├── services/            # Centralized API service client
│   │   ├── store/               # Redux Toolkit store (authSlice, notificationSlice)
│   │   └── styles/              # Design tokens (variables.css) & index.css
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── server/                      # Backend REST API (Node.js + Express)
│   ├── config/                  # MongoDB connection & skills dictionary
│   ├── controllers/             # Endpoint controllers for all domain entities
│   ├── middleware/              # JWT auth, RBAC, Multer upload, Error handler
│   ├── models/                  # Mongoose schemas (User, Job, App, Interview, etc.)
│   ├── routes/                  # Express route definitions
│   ├── services/                # Workflow, screening, parser, GridFS & audit services
│   ├── scripts/                 # seed.js (preloads realistic demo data)
│   ├── tests/                   # Automated API integration tests (api.test.js)
│   ├── uploads/                 # Local staging directory
│   ├── app.js                   # Express application setup
│   ├── server.js                # Server entry point
│   └── package.json
│
├── docs/                        # Comprehensive Documentation
│   ├── architecture.md          # Architecture diagrams and pipelines
│   ├── database-schema.md       # Collections, fields, indexes and constraints
│   ├── api-documentation.md     # REST endpoint specs and schemas
│   ├── role-permissions.md      # RBAC authorization matrix
│   └── testing.md               # Test cases and verification runbook
│
├── .env.example                 # Root environment variables template
├── .gitignore
├── README.md
└── package.json                 # Monorepo management scripts
```

---

## 4. Prerequisites

1. **Node.js**: v18.0.0 or newer (v24 LTS recommended)
2. **npm**: v9.0.0 or newer
3. **MongoDB Community Edition**: Running locally on `mongodb://127.0.0.1:27017`

---

## 5. Quick Startup Guide

### Step 1: Install Dependencies
From the monorepo root:
```bash
npm run install:all
```
*(Or run `npm install` inside both `server/` and `client/` directories.)*

### Step 2: Seed the Database with Realistic Test Data
```bash
npm run seed
```
This populates sample recruiters, interviewers, candidates, jobs, GridFS resumes, screening scores, scheduled interviews, feedback, notifications, and audit logs.

### Step 3: Start the Backend Server (Port 5000)
```bash
npm run server
```
The server will start at `http://localhost:5000` and automatically connect to local MongoDB `mongodb://127.0.0.1:27017/smart_interview_management`.

### Step 4: Start the Frontend Client (Port 5173)
In a second terminal:
```bash
npm run client
```
Open your browser at `http://localhost:5173`.

---

## 6. Default Demo Test Accounts

The seed script creates the following pre-configured credentials:

| Role | Name | Email | Password |
|---|---|---|---|
| **Recruiter / Admin** | Eleanor Vance | `admin@sims.local` | `Admin@123` |
| **Interviewer** | Sarah Chen (Staff Frontend) | `sarah.interviewer@sims.local` | `Interviewer@123` |
| **Interviewer** | David Miller (Principal Backend) | `david.interviewer@sims.local` | `Interviewer@123` |
| **Candidate** | Alex Mercer (Full Stack) | `alex.candidate@sims.local` | `Candidate@123` |
| **Candidate** | Priya Sharma (Frontend) | `priya.candidate@sims.local` | `Candidate@123` |
| **Candidate** | Marcus Brody (Backend Architect) | `marcus.candidate@sims.local` | `Candidate@123` |

*(Tip: The login page includes 1-click test credential fill buttons for fast testing!)*

---

## 7. Running Automated Tests

Run the complete backend integration test suite:
```bash
npm run test:server
```
Runs 20 automated tests validating registration, authentication, draft job hiding, duplicate application prevention, deterministic screening scoring, interview scheduling, double-booking conflicts, feedback submission, and hiring decision workflows.

---

## 8. Environment Variables

### Backend (`server/.env`):
```env
PORT=5000
MONGO_URI=mongodb://127.0.0.1:27017/smart_interview_management
JWT_SECRET=super_secret_local_jwt_key_smart_interview_management_2026_xyz
JWT_EXPIRES_IN=1d
UPLOAD_LIMIT_MB=10
NODE_ENV=development
CLIENT_URL=http://localhost:5173
```

### Frontend (`client/.env`):
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## 9. Security & Architecture Principles

- **No Plaintext Passwords**: All user passwords are automatically hashed with bcrypt (salt rounds: 10) on save. Passwords are never returned in API responses (`select: false`).
- **Role Isolation**: RBAC middleware protects private endpoints. Candidates cannot access recruiter dashboards, other candidates' records, or confidential interviewer feedback.
- **Compound Unique Indexes**: Compound unique indexes prevent duplicate applications (`candidateId + jobId`) and duplicate evaluations (`interviewId + interviewerId`).
- **Local File Security**: Resumes are validated for PDF extension and MIME type before being stored in MongoDB GridFS buckets. Executable files are strictly blocked.
