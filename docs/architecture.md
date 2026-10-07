# Architecture Specification: Smart Interview Management System (SIMS)

## 1. Overview
The **Smart Interview Management System (SIMS)** is an enterprise-grade, locally runnable recruitment and candidate evaluation platform developed on the **MERN** (MongoDB, Express, React, Node.js) stack. It operates completely disconnected from cloud dependencies, external AI providers, and external authentication services.

---

## 2. System Architecture Diagram

```
+------------------------------------------------------------------------+
|                          CLIENT APPLICATION                            |
|             (React 18 + Vite + Redux Toolkit + Pure CSS)               |
|                                                                        |
|   +-------------------+  +--------------------+  +------------------+  |
|   | Candidate Portal  |  | Interviewer Portal |  | Recruiter Portal |  |
|   +-------------------+  +--------------------+  +------------------+  |
+------------------------------------------------------------------------+
                                    |
                          REST API / JSON / SSE
                                    v
+------------------------------------------------------------------------+
|                          BACKEND APPLICATION                           |
|                      (Express.js + Node.js 24)                         |
|                                                                        |
|   +----------------------------------------------------------------+   |
|   | Middleware Layer (JWT Auth, RBAC Role Checks, Multer, Errors)  |   |
|   +----------------------------------------------------------------+   |
|                                   |                                    |
|   +----------------------------------------------------------------+   |
|   | Controller Layer (Auth, Jobs, Apps, Interviews, Reports, etc.) |   |
|   +----------------------------------------------------------------+   |
|                                   |                                    |
|   +----------------------------------------------------------------+   |
|   | Service Layer                                                  |   |
|   |  * WorkflowEngineService (Lifecycle state machine)             |   |
|   |  * ScreeningEngineService (Deterministic skill matcher)        |   |
|   |  * ResumeParserService (Local pdf-parse + dictionary)          |   |
|   |  * GridFSService (Streaming PDF storage)                       |   |
|   |  * NotificationService (Local SSE / event emitter)             |   |
|   |  * AuditService (Lifecycle compliance logs)                    |   |
|   +----------------------------------------------------------------+   |
+------------------------------------------------------------------------+
                                    |
                            Mongoose Models
                                    v
+------------------------------------------------------------------------+
|                        DATA PERSISTENCE LAYER                          |
|                     (MongoDB Community Edition)                        |
|                                                                        |
|  * users              * jobs              * applications               |
|  * screeningresults   * interviews        * feedbacks                  |
|  * notifications      * auditlogs         * fs.files / fs.chunks       |
+------------------------------------------------------------------------+
```

---

## 3. Resume Ingestion & Parsing Pipeline

The system uses a 100% deterministic local pipeline:

```
[Candidate PDF Resume Upload]
            |
            v
   [Multer Memory Buffer]
            |
            +------------------------------------+
            |                                    |
            v                                    v
[MongoDB GridFS Storage]            [pdf-parse Local Extractor]
 (Chunked PDF Document)                          |
                                                 v
                                        [Normalized Text]
                                                 |
                                                 v
                                   [Skills Dictionary Matcher]
                                   (Matches alias and tokens)
                                                 |
                                                 v
                                    [Candidate Skills Array]
```

---

## 4. Deterministic Screening Engine Formula

Screening scores are computed transparently without black-box AI:

$$\text{Skill Match \%} = \left( \frac{|\text{Matched Required Skills}|}{|\text{Total Job Required Skills}|} \right) \times 100$$

$$\text{Overall Score} = (\text{Skill Match} \times 0.60) + (\text{Experience Score} \times 0.25) + (\text{Profile Completeness} \times 0.15)$$

- Candidates with score $\ge 70\%$ are qualified for `Shortlisted` status.
- Candidates with score $< 40\%$ are evaluated as `Rejected` recommendation.
- Candidates in range $40\% - 69\%$ remain `Pending` recruiter manual review.

---

## 5. Controlled Application Lifecycle State Machine

Application state transitions are strictly governed by `workflowEngineService`:

```
Applied
   |
   +--------------------------> Shortlisted
   |                                 |
   |                                 v
   |                        Interview Scheduled
   |                                 |
   |                                 v
   |                        Interview Completed
   |                                 |
   |                                 v
   +--------------------------> Recruiter Decision
                                 /     |     \
                                v      v      v
                           Selected   Hold   Rejected
```

---

## 6. Interview Conflict Detection Mechanism

Before scheduling an interview, the backend performs overlapping time validation:

$$\text{Overlap} \iff (\text{Start}_A < \text{End}_B) \land (\text{End}_A > \text{Start}_B)$$

Checks are performed against both:
1. The **Interviewer's** schedule on that date.
2. The **Candidate's** existing scheduled interviews on that date.
Conflicts immediately return HTTP 409 Conflict with detailed error messages.
