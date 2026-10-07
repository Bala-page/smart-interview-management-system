# Role Permissions & Access Control Matrix

## 1. Primary Roles Overview

| Role | Description |
|---|---|
| **Candidate** | Job applicant who manages their profile, uploads resumes, browses open positions, submits applications, and tracks their application/interview progress. |
| **Interviewer** | Technical evaluator who views assigned candidates, inspects resumes, conducts scheduled sessions, and submits structured 1–5 evaluations with recommendations. |
| **Recruiter** | Talent acquisition partner who authors jobs, manages candidates, reviews screening scores, shortlists applicants, schedules interviews, reviews feedback, and executes final hiring decisions. |

---

## 2. Authorization Security Matrix

| Action / Module | Candidate | Interviewer | Recruiter |
|---|:---:|:---:|:---:|
| **Register Account** | Yes | Yes (Seed/Admin) | Seed/Admin Only |
| **Log In / JWT Auth** | Yes | Yes | Yes |
| **View Open Jobs** | Yes | Yes | Yes |
| **View Draft & Closed Jobs** | No | No | Yes |
| **Create / Edit / Delete Jobs** | No | No | Yes |
| **Publish / Close Job Status** | No | No | Yes |
| **Apply for Job** | Yes (Own) | No | No |
| **View Application Roster** | No | Assigned Only | Yes (All) |
| **View Own Applications** | Yes | N/A | N/A |
| **Upload Resume PDF** | Yes (Own) | No | No |
| **Download / Stream Resume** | Own Only | Assigned Only | Yes (All) |
| **View Screening Match Breakdown** | Own Score | No | Yes (All) |
| **Re-run Screening Engine** | No | No | Yes |
| **Shortlist Candidate** | No | No | Yes |
| **Schedule / Reschedule Interview** | No | No | Yes |
| **Detect Scheduling Conflicts** | System Auto | System Auto | System Auto |
| **Mark Interview Completed** | No | Assigned Only | Yes |
| **Submit Structured Feedback** | No | Assigned Only | No |
| **View Interviewer Feedback Ratings** | **Forbidden** | Assigned Only | Yes (All) |
| **Final Hiring Decision (Select/Reject/Hold)** | No | No | Yes |
| **Receive In-App Notifications** | Yes | Yes | Yes |
| **Access Recruiter Dashboard** | No | No | Yes |
| **Access Reports & Analytics** | No | No | Yes |
| **Access Audit Trail Logs** | No | No | Yes |

---

## 3. Data Privacy & Isolation Rules

1. **Candidate Isolation**: A candidate can never view another candidate's profile, application details, screening results, or interview schedules. Attempting to query another candidate's ID returns HTTP 403 Forbidden.
2. **Confidential Feedback**: Candidate profiles are strictly blocked from accessing evaluator feedback and internal ratings.
3. **Interviewer Scoping**: Interviewers can only inspect candidates and resumes for interviews explicitly assigned to them by a recruiter.
4. **Privileged Registration Guard**: Public registration endpoints strictly forbid self-declaring as `recruiter`. Recruiter accounts must be created through initial seeds or administrator procedures.
