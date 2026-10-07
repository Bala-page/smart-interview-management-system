# REST API Documentation: Smart Interview Management System

## Base URL
Local Development: `http://localhost:5000/api`

---

## 1. Authentication APIs

### `POST /api/auth/register`
- **Purpose**: Register a new user account (Candidate by default)
- **Authentication**: None (Public)
- **Role**: Open to candidates; privileged `recruiter` role is restricted.
- **Request Body**:
  ```json
  {
    "name": "Jane Doe",
    "email": "jane@example.com",
    "password": "Password@123",
    "role": "candidate",
    "phone": "+1-555-0100",
    "location": "Remote",
    "skills": ["React", "Node.js", "MongoDB"],
    "experience": 3,
    "bio": "Experienced full stack software engineer"
  }
  ```
- **Success Response (201 Created)**:
  ```json
  {
    "success": true,
    "message": "Registration successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "id": "673f4b2a8e1234567890abcd",
        "name": "Jane Doe",
        "email": "jane@example.com",
        "role": "candidate"
      }
    }
  }
  ```
- **Error Cases**:
  - `400`: Duplicate email or validation failure
  - `403`: Attempted unauthorized self-registration as `recruiter`

---

### `POST /api/auth/login`
- **Purpose**: Authenticate user credentials and retrieve JWT
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "admin@sims.local",
    "password": "Admin@123"
  }
  ```
- **Success Response (200 OK)**:
  ```json
  {
    "success": true,
    "message": "Login successful",
    "data": {
      "token": "eyJhbGciOiJIUzI1Ni...",
      "user": {
        "id": "673f4b2a8e1234567890rec1",
        "name": "Eleanor Vance",
        "email": "admin@sims.local",
        "role": "recruiter"
      }
    }
  }
  ```
- **Error Cases**:
  - `401`: Invalid email or incorrect password

---

### `GET /api/auth/me`
- **Purpose**: Fetch current authenticated user profile
- **Authentication**: JWT (`Bearer <token>`)
- **Role**: Any authenticated user

---

## 2. Job Requisition APIs

### `POST /api/jobs`
- **Purpose**: Create a new job requisition
- **Authentication**: JWT
- **Role**: `recruiter`
- **Request Body**:
  ```json
  {
    "title": "Senior React Developer",
    "description": "Leading frontend development using modern React, Redux, and CSS modules.",
    "requiredSkills": ["React", "JavaScript", "HTML", "CSS", "Redux"],
    "minimumExperience": 3,
    "maximumExperience": 6,
    "location": "San Francisco, CA",
    "employmentType": "Full-time",
    "status": "Open"
  }
  ```

---

### `GET /api/jobs`
- **Purpose**: List job requisitions with filters and pagination
- **Authentication**: Optional
- **Role**: Candidates see only `Open` jobs; Recruiters see all statuses.
- **Query Parameters**:
  - `page`: Page number (default: 1)
  - `limit`: Items per page (default: 10)
  - `search`: Keyword search in title/description
  - `skill`: Filter by skill tag
  - `status`: Recruiter filter (`Draft`, `Open`, `Closed`)

---

### `PUT /api/jobs/:id/status`
- **Purpose**: Change job status (`Draft` -> `Open` -> `Closed`)
- **Authentication**: JWT
- **Role**: `recruiter`
- **Request Body**:
  ```json
  { "status": "Open" }
  ```

---

## 3. Application & Screening APIs

### `POST /api/applications`
- **Purpose**: Candidate applies to an open job; automatically calculates deterministic screening match score
- **Authentication**: JWT
- **Role**: `candidate`
- **Request Body**:
  ```json
  {
    "jobId": "673f4b2a8e1234567890job1"
  }
  ```
- **Error Cases**:
  - `400`: Duplicate application prevented
  - `400`: Job is not currently `Open`

---

### `GET /api/applications/:id`
- **Purpose**: Retrieve application details, candidate profile, and screening breakdown
- **Authentication**: JWT
- **Role**: Candidate (own only), Assigned Interviewer, Recruiter

---

### `PUT /api/applications/:id/status`
- **Purpose**: Recruiter advances candidate status or records hiring decision
- **Authentication**: JWT
- **Role**: `recruiter`
- **Request Body**:
  ```json
  {
    "status": "Selected",
    "rejectionReason": ""
  }
  ```

---

## 4. Resume & File Storage APIs

### `POST /api/resume/upload`
- **Purpose**: Upload candidate PDF resume to MongoDB GridFS and parse skills locally with `pdf-parse`
- **Authentication**: JWT
- **Role**: `candidate`
- **Content-Type**: `multipart/form-data`
- **Field**: `resume` (.pdf file, max 10MB)

---

### `GET /api/resume/:id`
- **Purpose**: Stream stored PDF resume from MongoDB GridFS
- **Authentication**: JWT
- **Role**: Candidate (own), Assigned Interviewer, Recruiter

---

## 5. Interview Scheduling APIs

### `POST /api/interviews`
- **Purpose**: Schedule an interview with conflict detection
- **Authentication**: JWT
- **Role**: `recruiter`
- **Request Body**:
  ```json
  {
    "applicationId": "673f4b2a8e1234567890app1",
    "candidateId": "673f4b2a8e1234567890cand1",
    "jobId": "673f4b2a8e1234567890job1",
    "interviewerId": "673f4b2a8e1234567890intv1",
    "interviewDate": "2026-11-20",
    "startTime": "14:00",
    "endTime": "15:00",
    "interviewType": "Technical",
    "locationOrMeetingInfo": "https://meet.local/room-101",
    "notes": "System design and coding session"
  }
  ```
- **Error Cases**:
  - `409 Conflict`: Interviewer or candidate already has an overlapping interview scheduled

---

## 6. Feedback APIs

### `POST /api/feedback`
- **Purpose**: Submit structured interview evaluation
- **Authentication**: JWT
- **Role**: Assigned `interviewer`
- **Request Body**:
  ```json
  {
    "interviewId": "673f4b2a8e1234567890intv1",
    "technicalRating": 5,
    "communicationRating": 4,
    "problemSolvingRating": 5,
    "roleKnowledgeRating": 4,
    "overallRating": 5,
    "recommendation": "Hire",
    "comments": "Strong analytical ability, modular code, and thorough grasp of data structures."
  }
  ```

---

## 7. Reports & Analytics APIs

- `GET /api/reports/hiring-funnel` (Hiring funnel stage dropoffs)
- `GET /api/reports/selection-ratio` (Selection ratio, shortlisting ratio, interview conversion)
- `GET /api/reports/job-performance` (Job-wise applications, offers, and selection percentages)
- `GET /api/reports/interviewer-performance` (Interviewer workloads, average ratings, and recommendation rates)
- `GET /api/reports/candidate-ranking` (Candidate leaderboard by match score)
