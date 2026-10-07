# Database Schema Reference: Smart Interview Management System

## 1. Schema Relationships

```
User (Candidate / Interviewer / Recruiter)
 ├── Jobs (created by Recruiter)
 ├── Applications (submitted by Candidate)
 ├── Interviews (conducted by Interviewer, for Candidate)
 ├── Feedback (authored by Interviewer)
 └── Notifications (delivered to User)

Job
 └── Applications

Application
 ├── ScreeningResult (1-to-1)
 ├── Interview (1-to-Many)
 └── HiringDecision

Interview
 └── Feedback (1-to-1 per interviewer)
```

---

## 2. Collections Specification

### 2.1 `users`
Represents system actors (Candidates, Interviewers, Recruiters).

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique user identifier |
| `name` | String | Yes | Full user name |
| `email` | String | Yes | Lowercase unique email address |
| `password` | String | Yes | Bcrypt-hashed password (hidden from queries) |
| `role` | String | Yes | Enum: `'candidate'`, `'interviewer'`, `'recruiter'` |
| `phone` | String | No | Contact phone number |
| `location` | String | No | Geographical location or Remote |
| `skills` | [String] | No | Array of technical skills |
| `experience` | Number | No | Total years of experience |
| `bio` | String | No | Professional summary |
| `resumeFileId`| ObjectId | No | Reference to GridFS file document |
| `profilePhoto`| String | No | Profile photo path |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

**Indexes:**
- `{ email: 1 }` (unique)
- `{ role: 1 }`

---

### 2.2 `jobs`
Represents open or draft requisitions.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique job identifier |
| `title` | String | Yes | Position title |
| `description` | String | Yes | Job description |
| `requiredSkills`| [String] | Yes | Required skills matched by screening engine |
| `minimumExperience`| Number | Yes | Min years required |
| `maximumExperience`| Number | No | Max experience cap |
| `location` | String | Yes | Job location |
| `employmentType` | String | Yes | Enum: `Full-time`, `Part-time`, `Contract`, `Internship` |
| `status` | String | Yes | Enum: `Draft`, `Open`, `Closed` |
| `recruiterId` | ObjectId | Yes | Reference to User who created job |
| `publishedAt` | Date | No | Timestamp when published |
| `closedAt` | Date | No | Timestamp when closed |

**Indexes:**
- `{ status: 1 }`
- `{ recruiterId: 1 }`
- `{ requiredSkills: 1 }`
- `{ location: 1 }`
- `{ createdAt: -1 }`

---

### 2.3 `applications`
Represents a candidate's application for an open requisition.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique application ID |
| `candidateId` | ObjectId | Yes | Ref to User (candidate) |
| `jobId` | ObjectId | Yes | Ref to Job |
| `resumeFileId` | ObjectId | No | Ref to GridFS resume file |
| `applicationStatus`| String | Yes | Enum: `Applied`, `Shortlisted`, `Interview Scheduled`, `Interview Completed`, `Selected`, `Rejected`, `Hold` |
| `appliedDate` | Date | Yes | Application date |
| `screeningScore` | Number | Yes | Cached overall match score (0-100) |
| `shortlistedAt` | Date | No | Timestamp when shortlisted |
| `rejectionReason`| String | No | Recruiter feedback on rejection |
| `decision` | String | Yes | Enum: `Pending`, `Selected`, `Rejected`, `Hold` |

**Indexes:**
- `{ candidateId: 1, jobId: 1 }` (unique compound index to prevent duplicate applications)
- `{ applicationStatus: 1 }`
- `{ appliedDate: -1 }`

---

### 2.4 `screeningresults`
Contains deterministic evaluations and explainable score breakdowns.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique screening record ID |
| `applicationId` | ObjectId | Yes | Ref to Application (unique) |
| `candidateId` | ObjectId | Yes | Ref to Candidate User |
| `jobId` | ObjectId | Yes | Ref to Job |
| `skillsFound` | [String] | Yes | Union of profile and parsed resume skills |
| `matchedSkills` | [String] | Yes | Intersection with job requirements |
| `missingSkills` | [String] | Yes | Unmatched requirements |
| `skillMatchPercentage`| Number | Yes | Calculated skill match percentage (0-100) |
| `experienceScore` | Number | Yes | Candidate exp vs minimum exp score |
| `overallMatchScore`| Number | Yes | Weighted composite score (0-100) |
| `scoreBreakdown` | Object | Yes | Weights and explanation notes |
| `screeningStatus` | String | Yes | Enum: `Pending`, `Shortlisted`, `Rejected` |

---

### 2.5 `interviews`
Represents scheduled and conducted interview sessions.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique interview identifier |
| `applicationId` | ObjectId | Yes | Ref to Application |
| `candidateId` | ObjectId | Yes | Ref to Candidate |
| `jobId` | ObjectId | Yes | Ref to Job |
| `interviewerId` | ObjectId | Yes | Ref to Assigned Interviewer |
| `interviewDate` | String | Yes | ISO date string (`YYYY-MM-DD`) |
| `startTime` | String | Yes | 24-hr start time (`HH:mm`) |
| `endTime` | String | Yes | 24-hr end time (`HH:mm`) |
| `interviewType` | String | Yes | Enum: `Technical`, `HR`, `Managerial`, `Behavioral`, `System Design` |
| `locationOrMeetingInfo` | String | Yes | Meeting link or room location |
| `notes` | String | No | Evaluator preparation notes |
| `status` | String | Yes | Enum: `Scheduled`, `Completed`, `Cancelled`, `Rescheduled` |

**Indexes:**
- `{ interviewerId: 1, interviewDate: 1, status: 1 }` (conflict lookups)
- `{ candidateId: 1, interviewDate: 1, status: 1 }`

---

### 2.6 `feedbacks`
Structured feedback submitted by assigned interviewers.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique feedback identifier |
| `interviewId` | ObjectId | Yes | Ref to Interview |
| `candidateId` | ObjectId | Yes | Ref to Candidate |
| `jobId` | ObjectId | Yes | Ref to Job |
| `interviewerId` | ObjectId | Yes | Ref to Interviewer |
| `technicalRating` | Number | Yes | 1 to 5 scale |
| `communicationRating`| Number | Yes | 1 to 5 scale |
| `problemSolvingRating`| Number | Yes | 1 to 5 scale |
| `roleKnowledgeRating`| Number | Yes | 1 to 5 scale |
| `overallRating` | Number | Yes | 1 to 5 scale |
| `recommendation` | String | Yes | Enum: `Hire`, `Reject`, `Hold` |
| `comments` | String | Yes | Qualitative assessment notes (min 10 chars) |

**Indexes:**
- `{ interviewId: 1, interviewerId: 1 }` (unique compound index)

---

### 2.7 `notifications`
In-app notification messages delivered to recipients.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique notification identifier |
| `recipientUserId` | ObjectId | Yes | Target user |
| `type` | String | Yes | Notification type classification |
| `title` | String | Yes | Notification heading |
| `message` | String | Yes | Notification message text |
| `relatedEntityType`| String | No | Model name (e.g. `Application`, `Interview`) |
| `relatedEntityId` | ObjectId | No | Entity identifier |
| `isRead` | Boolean | Yes | Read / Unread status |

---

### 2.8 `auditlogs`
Immutable traceability log of lifecycle actions.

| Field | Type | Required | Description |
|---|---|---|---|
| `_id` | ObjectId | Yes | Unique audit record ID |
| `actorUserId` | ObjectId | Yes | User who triggered the event |
| `action` | String | Yes | Action code name |
| `entityType` | String | Yes | Target entity type |
| `entityId` | ObjectId | Yes | Target entity identifier |
| `metadata` | Mixed | No | Additional context details |
| `timestamp` | Date | Yes | Exact event occurrence date |
