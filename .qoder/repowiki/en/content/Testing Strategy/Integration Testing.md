# Integration Testing

<cite>
**Referenced Files in This Document**
- [package.json](file://package.json)
- [schema.prisma](file://prisma/schema.prisma)
- [db.ts](file://lib/db.ts)
- [auth.ts](file://lib/auth.ts)
- [ai.ts](file://lib/ai.ts)
- [register route.ts](file://app/api/auth/register/route.ts)
- [login route.ts](file://app/api/auth/login/route.ts)
- [google callback route.ts](file://app/api/auth/google/callback/route.ts)
- [me route.ts](file://app/api/auth/me/route.ts)
- [pets route.ts](file://app/api/pets/route.ts)
- [pet detail route.ts](file://app/api/pets/[petId]/route.ts)
- [appointments route.ts](file://app/api/appointments/route.ts)
- [appointment detail route.ts](file://app/api/appointments/[appointmentId]/route.ts)
- [appointment slots route.ts](file://app/api/appointments/[appointmentId]/slots/route.ts)
- [clinic profile route.ts](file://app/api/clinic/profile/route.ts)
- [health summary route.ts](file://app/api/pets/[petId]/health-summary/route.ts)
- [veterinarian discovery route.ts](file://app/api/vet/discovery/route.ts)
- [vaccinations route.ts](file://app/api/pets/[petId]/vaccinations/route.ts)
- [medications route.ts](file://app/api/pets/[petId]/medications/route.ts)
- [seed.js](file://prisma/seed.js)
- [verify_handoff.js](file://verify_handoff.js)
- [verify_dashboard_data.js](file://verify_dashboard_data.js)
- [seed_tracking_demo.js](file://seed_tracking_demo.js)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive verification suite covering 577 lines of automated testing including UTF-8 emoji persistence, past-date booking rejection, appointment cancellation flows, upcoming appointment queries, vaccination and medication tracking with automatic reminders, authorization controls, and validation of new health summary and veterinarian discovery features
- Enhanced testing strategies for pet health endpoints with vaccination and medication tracking
- Updated API endpoint documentation to include new health summary and veterinarian discovery routes
- Expanded authentication and authorization testing coverage for cross-user access scenarios
- Added detailed testing guidance for AI-powered health summary generation and veterinarian availability checking

## Table of Contents
1. Introduction
2. Project Structure
3. Core Components
4. Architecture Overview
5. Detailed Component Analysis
6. Dependency Analysis
7. Performance Considerations
8. Troubleshooting Guide
9. Conclusion
10. Appendices

## Introduction
This document provides comprehensive integration testing guidance for the PETIVA application. It focuses on validating REST API endpoints, database operations with Prisma and PostgreSQL, and external service integrations such as Google OAuth and AI providers (Groq, Gemini, Qwen). It also covers end-to-end workflows like user registration via OAuth, pet profile creation with medical records, and appointment booking with availability checks. **Updated** to include comprehensive verification suites covering UTF-8 emoji persistence, past-date booking rejection, appointment cancellation flows, upcoming appointment queries, vaccination and medication tracking with automatic reminders, authorization controls, and validation of new health summary and veterinarian discovery features. Guidance is included for test environment setup, mocking strategies, authentication and authorization testing, and best practices for isolation, cleanup, and performance.

## Project Structure
The application uses Next.js API routes under app/api, a Prisma schema defining the data model, shared libraries for database access and authentication, and an AI orchestration layer that integrates multiple LLM providers. A seed script populates realistic test data, and comprehensive verification scripts demonstrate direct API interactions useful for integration tests.

```mermaid
graph TB
subgraph "API Routes"
R1["/api/auth/register"]
R2["/api/auth/login"]
R3["/api/auth/google/callback"]
R4["/api/auth/me"]
R5["/api/pets"]
R6["/api/pets/[petId]"]
R7["/api/appointments"]
R8["/api/appointments/[id]"]
R9["/api/appointments/[id]/slots"]
R10["/api/clinic/profile"]
R11["/api/pets/[petId]/health-summary"]
R12["/api/vet/discovery"]
R13["/api/pets/[petId]/vaccinations"]
R14["/api/pets/[petId]/medications"]
end
subgraph "Libraries"
L1["lib/auth.ts"]
L2["lib/db.ts"]
L3["lib/ai.ts"]
end
subgraph "Database"
DB["PostgreSQL"]
PRISMA["Prisma Client"]
end
subgraph "External Services"
G["Google OAuth"]
A1["Groq"]
A2["Gemini"]
A3["Qwen"]
end
subgraph "Verification Scripts"
V1["verify_handoff.js"]
V2["verify_dashboard_data.js"]
V3["seed_tracking_demo.js"]
end
R1 --> L1
R2 --> L1
R3 --> L1
R4 --> L1
R5 --> L1
R6 --> L1
R7 --> L1
R8 --> L1
R9 --> L1
R10 --> L1
R11 --> L1
R12 --> L1
R13 --> L1
R14 --> L1
L1 --> L2
L2 --> PRISMA
PRISMA --> DB
R3 --> G
L3 --> A1
L3 --> A2
L3 --> A3
V1 --> R7
V1 --> R8
V1 --> R9
V1 --> R11
V1 --> R12
V1 --> R13
V1 --> R14
V2 --> R7
V3 --> R13
V3 --> R14
```

**Diagram sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [me route.ts:1-33](file://app/api/auth/me/route.ts#L1-L33)
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [appointment detail route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [appointment slots route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)
- [vaccinations route.ts:1-156](file://app/api/pets/[petId]/vaccinations/route.ts#L1-L156)
- [medications route.ts:1-158](file://app/api/pets/[petId]/medications/route.ts#L1-L158)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)
- [seed_tracking_demo.js:1-74](file://seed_tracking_demo.js#L1-L74)

**Section sources**
- [package.json:1-35](file://package.json#L1-L35)
- [schema.prisma:1-312](file://prisma/schema.prisma#L1-L312)

## Core Components
- Authentication and session management: password hashing, session token lifecycle, cookie handling, role-based access control helpers.
- Database layer: Prisma client with pg adapter, connection pooling, and environment-aware initialization.
- AI orchestration: provider selection, tool execution, and fallback strategy across Groq, Gemini, and Qwen.
- API routes: REST endpoints for auth, pets, appointments, clinic management, health summaries, and veterinarian discovery with consistent error handling and authorization.
- **Enhanced Verification Scripts**: Comprehensive test suites covering 577 lines of automated testing including UTF-8 emoji persistence, past-date booking rejection, appointment cancellation flows, upcoming appointment queries, vaccination and medication tracking with automatic reminders, authorization controls, and validation of new health summary and veterinarian discovery features.

Key responsibilities and relationships are implemented across lib/auth.ts, lib/db.ts, lib/ai.ts, the API routes listed above, and the verification scripts.

**Section sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [me route.ts:1-33](file://app/api/auth/me/route.ts#L1-L33)
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [appointment detail route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [appointment slots route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)
- [vaccinations route.ts:1-156](file://app/api/pets/[petId]/vaccinations/route.ts#L1-L156)
- [medications route.ts:1-158](file://app/api/pets/[petId]/medications/route.ts#L1-L158)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)

## Architecture Overview
Integration tests should validate the full request/response cycle including authentication, authorization, database transactions, and external calls. The following diagram maps the primary flows used by integration tests, **including the enhanced verification suite covering health summaries, veterinarian discovery, and comprehensive appointment workflows**.

```mermaid
sequenceDiagram
participant T as "Test Runner"
participant API as "Next.js API Routes"
participant AUTH as "lib/auth.ts"
participant DB as "Prisma + PostgreSQL"
participant G as "Google OAuth"
participant AI as "AI Providers (Groq/Gemini/Qwen)"
T->>API : POST /api/auth/register or /api/auth/login
API->>AUTH : hashPassword/verifyPassword, createSession, setSessionCookie
AUTH->>DB : create Session, read User
DB-->>AUTH : User/Session
AUTH-->>API : Token and Cookie
API-->>T : Authenticated response
T->>API : GET /api/pets or POST /api/pets
API->>AUTH : requireAuth()
AUTH->>DB : validate Session
DB-->>AUTH : User
API->>DB : CRUD on Pet
DB-->>API : Pet data
API-->>T : Success/Failure
T->>API : POST /api/appointments
API->>DB : $transaction to check conflicts and create Appointment
DB-->>API : Conflict or Created
API-->>T : 201 or 409
T->>API : POST /api/auth/google/callback
API->>G : verifyIdToken (or mock flow)
G-->>API : Payload
API->>DB : Upsert User, create Session
API-->>T : Authenticated response
T->>API : /api/ai/chat (via ai.ts tools)
API->>AI : getAIProvider().generateResponse()
AI-->>API : Tool calls or content
API->>DB : executeTool queries (e.g., check_slots, create_booking)
DB-->>API : Results
API-->>T : Final response
T->>API : GET /api/pets/[petId]/health-summary
API->>AUTH : requireAuth(), ownership check
API->>DB : Fetch pet health data
DB-->>API : Health records
API->>AI : Generate summary from health data
AI-->>API : AI-generated summary
API-->>T : Health summary with facts
T->>API : GET /api/vet/discovery?date=YYYY-MM-DD
API->>AUTH : requireAuth()
API->>DB : Query vets with availability
DB-->>API : Vet availability data
API-->>T : Veterinarian discovery results
```

**Diagram sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [appointment detail route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [appointment slots route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

## Detailed Component Analysis

### Authentication Endpoints
- Registration: validates input, hashes password, creates user, issues session, sets cookie.
- Login: verifies credentials, creates session, sets cookie.
- Me: returns current user from session.
- Google OAuth callback: verifies token (or uses mock), upserts user, creates session, sets cookie.

Testing strategies:
- Validate status codes and response shapes for success and failure cases (missing fields, invalid roles, duplicate email, wrong password).
- Assert cookie presence and expiration behavior.
- For Google OAuth, test both real verification path and development mock path using a special token prefix.

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Reg as "/api/auth/register"
participant Log as "/api/auth/login"
participant Me as "/api/auth/me"
participant GCB as "/api/auth/google/callback"
participant Auth as "lib/auth.ts"
participant DB as "Prisma + PostgreSQL"
Test->>Reg : POST {email,password,role,...}
Reg->>Auth : hashPassword, createSession, setSessionCookie
Auth->>DB : create User, create Session
DB-->>Auth : User, Session
Auth-->>Reg : Cookie
Reg-->>Test : 201 with user
Test->>Log : POST {email,password}
Log->>Auth : verifyPassword, createSession, setSessionCookie
Auth->>DB : find User, create Session
DB-->>Auth : User, Session
Auth-->>Log : Cookie
Log-->>Test : 200 with user
Test->>Me : GET (with cookie)
Me->>Auth : getCurrentUser
Auth->>DB : validate Session
DB-->>Auth : User
Auth-->>Me : User
Me-->>Test : 200 with user
Test->>GCB : POST {credential}
GCB->>GCB : verifyIdToken or mock parse
GCB->>DB : upsert User, create Session
DB-->>GCB : User, Session
GCB-->>Test : 200 with user
```

**Diagram sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [me route.ts:1-33](file://app/api/auth/me/route.ts#L1-L33)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)

**Section sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [me route.ts:1-33](file://app/api/auth/me/route.ts#L1-L33)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)

### Pets Endpoints
- List pets: requires authentication, filters by owner.
- Create pet: requires authentication, validates required fields, persists pet.
- Detail/update/delete pet: requires authentication, enforces ownership, performs CRUD.

Testing strategies:
- Unauthenticated requests must return 401.
- Ownership checks must return 403 when accessing another user's pet.
- Validation errors must return 400 with appropriate messages.
- Successful operations must return expected entities and status codes.
- **UTF-8 Emoji Persistence**: Verify that pet names with emojis (like "Löna 🐕") are properly stored and retrieved without encoding issues.

```mermaid
flowchart TD
Start(["Request to /api/pets or /api/pets/:id"]) --> Auth["requireAuth()"]
Auth --> |Missing token| Unauthorized["Return 401 UNAUTHORIZED"]
Auth --> |Valid token| CheckOwner{"Ownership check"}
CheckOwner --> |No| Forbidden["Return 403 FORBIDDEN"]
CheckOwner --> |Yes| Validate["Validate inputs"]
Validate --> |Invalid| BadRequest["Return 400 BAD_REQUEST"]
Validate --> |Valid| Persist["Persist via Prisma"]
Persist --> Success["Return 201/200 with entity"]
```

**Diagram sources**
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)

**Section sources**
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)

### Appointments Endpoints

#### Basic Appointment Operations
- List appointments: role-based filtering (PET_OWNER, VETERINARIAN, CLINIC_ADMIN).
- Create appointment: requires authentication, validates ownership, prevents double booking within a transaction, persists appointment.

Testing strategies:
- Role-based visibility: ensure each role sees only permitted appointments.
- Double booking prevention: assert 409 conflict when attempting to book an already requested or confirmed slot.
- Transactional integrity: confirm atomicity of conflict check and creation.
- **Past Date Rejection**: Ensure appointments cannot be created for past dates.
- **Cancellation Flow**: Verify soft-cancel functionality where appointments can be cancelled but remain in the database.

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Appt as "/api/appointments"
participant DB as "Prisma + PostgreSQL"
Test->>Appt : POST {petId, vetId, clinicId, dateTime, reason}
Appt->>DB : $transaction { findFirst conflict }
DB-->>Appt : conflict? true/false
alt Conflict
Appt-->>Test : 409 CONFLICT
else No Conflict
Appt->>DB : create Appointment
DB-->>Appt : Appointment
Appt-->>Test : 201 CREATED
end
```

**Diagram sources**
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)

#### Enhanced Rescheduling Workflow
**Updated** The rescheduling functionality includes comprehensive validation and permission checks:

- **Permission Enforcement**: Only PET_OWNER role can reschedule their own appointments
- **Slot Validation**: Validates date format, rejects past dates, ensures future dates only
- **Working Hours Enforcement**: Restricts rescheduling to 9 AM - 5 PM Karachi time (UTC+5)
- **Conflict Detection**: Prevents double booking during reschedule
- **Status Management**: Resets appointment status to REQUESTED after successful reschedule
- **Audit Logging**: Records all reschedule actions for security tracking

Testing strategies for rescheduling:
- Verify owner-only access: non-owners receive 403 FORBIDDEN
- Test working hours validation: off-hours requests return OUTSIDE_WORKING_HOURS error
- Validate same-time rejection: cannot reschedule to the same time
- Confirm conflict detection: overlapping appointments are rejected
- Verify status reset: successful reschedules reset status to REQUESTED
- Test audit logging: ensure reschedule actions are recorded

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Owner as "Pet Owner"
participant Slots as "/api/appointments/ : id/slots"
participant Resched as "/api/appointments/ : id"
participant DB as "Prisma + PostgreSQL"
Test->>Owner : Login as PET_OWNER
Owner->>Slots : GET ?date=YYYY-MM-DD
Slots->>DB : Query busy appointments
DB-->>Slots : Busy times
Slots-->>Owner : Available slots (9AM-5PM)
Owner->>Resched : PUT {action : RESCHEDULE, dateTime : selectedSlot}
Resched->>DB : Validate ownership & permissions
DB-->>Resched : Authorization result
Resched->>DB : Check working hours (Karachi timezone)
DB-->>Resched : Working hours validation
Resched->>DB : Check for conflicts
DB-->>Resched : Conflict status
alt Valid reschedule
Resched->>DB : Update appointment (new time, REQUESTED status)
DB-->>Resched : Updated appointment
Resched->>DB : Create audit log
DB-->>Resched : Audit logged
Resched-->>Owner : 200 SUCCESS with updated appointment
else Invalid reschedule
Resched-->>Owner : 400/403/409 ERROR
end
```

**Diagram sources**
- [appointment detail route.ts:17-137](file://app/api/appointments/[appointmentId]/route.ts#L17-L137)
- [appointment slots route.ts:15-103](file://app/api/appointments/[appointmentId]/slots/route.ts#L15-L103)

**Section sources**
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [appointment detail route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [appointment slots route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)

### Clinic Management Endpoints
- Clinic profile: requires CLINIC_ADMIN role and associated clinicId; supports GET and PUT updates.

Testing strategies:
- Enforce role-based access: non-admin users receive 403.
- Validate missing associations: return 400 if no clinic linked to admin.
- Update operations: assert persisted changes and correct responses.

**Section sources**
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)

### Health Summary Endpoint
**New** The health summary endpoint provides AI-powered analysis of pet health data:

- **Authentication Required**: Requires authenticated user with proper ownership
- **Health Data Aggregation**: Combines medical records, vaccinations, medications, allergies, conditions, metrics, and appointments
- **AI-Powered Analysis**: Generates concise health overview, recurring concerns, observations, and topics for veterinary discussion
- **Graceful Fallback**: Returns stored facts even if AI processing fails
- **Emoji Safety**: Ensures AI-generated content contains no emojis or special symbols

Testing strategies:
- Verify unauthenticated access returns 401
- Test ownership validation returns 403 for non-owners
- Validate NOT_FOUND for non-existent pets
- Assert AI summary structure includes overview, topicsForVet, recurringConcerns, and observations
- Verify stored facts contain counts and structured health data
- Test graceful degradation when AI provider is unavailable

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant HS as "/api/pets/[petId]/health-summary"
participant Auth as "requireAuth()"
participant DB as "Prisma + PostgreSQL"
participant AI as "AI Provider"
Test->>HS : GET (with auth)
HS->>Auth : Validate user
Auth->>DB : Find pet and verify ownership
DB-->>Auth : Pet data
Auth-->>HS : Authorized user
HS->>DB : Fetch health records (medical, vaccinations, medications, etc.)
DB-->>HS : Health data
HS->>AI : Generate summary from health facts
AI-->>HS : AI summary or error
HS-->>Test : Health summary with facts and metadata
```

**Diagram sources**
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)

**Section sources**
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)

### Veterinarian Discovery Endpoint
**New** The veterinarian discovery endpoint enables pet owners to find available veterinarians:

- **Authentication Required**: Requires authenticated user
- **Advanced Filtering**: Supports name, specialization, clinic, and location searches
- **Availability Checking**: Provides free slots for specific dates based on working hours (9 AM - 5 PM Karachi time)
- **Rich Metadata**: Returns distinct specializations and clinics for stable filter dropdowns
- **Date Validation**: Rejects invalid or past dates with proper error codes

Testing strategies:
- Verify unauthenticated access returns 401
- Test various search combinations (name, specialization, clinic, location)
- Validate availability calculation excludes booked REQUESTED/CONFIRMED appointments
- Assert working hours enforcement (9 AM - 5 PM Karachi timezone)
- Test date validation rejects invalid formats and past dates
- Verify meta information includes distinct specializations and clinics

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Disc as "/api/vet/discovery"
participant Auth as "requireAuth()"
participant DB as "Prisma + PostgreSQL"
Test->>Disc : GET ?name=&specialization=&clinic=&location=&date=
Disc->>Auth : Validate user
Auth-->>Disc : Authorized user
Disc->>DB : Query vets with filters
DB-->>Disc : Matching veterinarians
alt With availability date
Disc->>DB : Check booked appointments for date
DB-->>Disc : Busy slots
Disc->>DB : Calculate free slots (9AM-5PM)
DB-->>Disc : Available slots
end
Disc-->>Test : Veterinarians with availability and metadata
```

**Diagram sources**
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)

**Section sources**
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)

### Vaccination and Medication Tracking
**New** Enhanced pet health tracking with automatic reminder generation:

- **Vaccination Records**: Track vaccine names, administered dates, due dates, and veterinarians
- **Medication Courses**: Record medication names, dosages, frequencies, start/end dates, and status
- **Automatic Reminders**: Generate reminders for upcoming vaccinations and medication end dates
- **Authorization Controls**: Owner-only access with strict ownership validation
- **Validation Rules**: Enforce date constraints, required fields, and business logic

Testing strategies:
- Verify owner-only access for creating vaccination and medication records
- Test date validation (future dates rejected, due dates after administered dates)
- Assert automatic reminder creation when due dates or end dates are specified
- Validate cross-user authorization prevents access to other users' pets
- Test reminder listing and deletion functionality
- Verify proper error responses for invalid data

```mermaid
sequenceDiagram
participant Test as "Integration Test"
participant Vac as "/api/pets/[petId]/vaccinations"
participant Med as "/api/pets/[petId]/medications"
participant Auth as "requireAuth()"
participant DB as "Prisma + PostgreSQL"
Test->>Vac : POST vaccination record
Vac->>Auth : Validate owner
Auth->>DB : Verify pet ownership
DB-->>Auth : Ownership confirmed
Vac->>DB : Create vaccination record
alt Due date provided
Vac->>DB : Create reminder for due date
end
Vac-->>Test : Vaccination with reminder
Test->>Med : POST medication course
Med->>Auth : Validate owner
Auth->>DB : Verify pet ownership
DB-->>Auth : Ownership confirmed
Med->>DB : Create medication record
alt End date provided
Med->>DB : Create reminder for end date
end
Med-->>Test : Medication with reminder
```

**Diagram sources**
- [vaccinations route.ts:1-156](file://app/api/pets/[petId]/vaccinations/route.ts#L1-L156)
- [medications route.ts:1-158](file://app/api/pets/[petId]/medications/route.ts#L1-L158)

**Section sources**
- [vaccinations route.ts:1-156](file://app/api/pets/[petId]/vaccinations/route.ts#L1-L156)
- [medications route.ts:1-158](file://app/api/pets/[petId]/medications/route.ts#L1-L158)

### External Service Integrations

#### Google OAuth Flow
- Callback endpoint verifies Google ID tokens in production and supports a mock flow in development/testing environments using a special token prefix.
- On success, upserts user and creates a session with cookie.

Testing strategies:
- Production path: configure GOOGLE_CLIENT_ID and use valid tokens; assert session creation and user existence.
- Development/mock path: send credential starting with the recognized prefix; assert same outcomes without network calls.

**Section sources**
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)

#### AI Provider Calls (Groq, Gemini, Qwen)
- AI orchestration selects provider based on environment configuration and executes tool functions that interact with the database (e.g., getMyPets, check_slots, create_booking).
- Fallback strategy switches between providers on failure.

Testing strategies:
- Mock external HTTP calls to AI providers to avoid flaky network dependencies.
- Validate tool execution paths: ensure proper parameter validation, ownership checks, working hours constraints, past date checks, and double booking prevention.
- Assert database state changes after tool-driven bookings.

```mermaid
flowchart TD
Start(["AI Tool Execution"]) --> Select["Select Provider (Groq/Gemini/Qwen)"]
Select --> Call["Call generateResponse(messages, tools)"]
Call --> Tools{"Tool calls?"}
Tools --> |Yes| Execute["executeTool(name, args, userId)"]
Execute --> DBOps["Database operations (queries/create)"]
DBOps --> Result["Return JSON result"]
Tools --> |No| Content["Return assistant content"]
Result --> End(["End"])
Content --> End
```

**Diagram sources**
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

**Section sources**
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

### Enhanced Verification Scripts

#### Comprehensive Test Suite (577 Lines)
**New** The `verify_handoff.js` script provides comprehensive testing covering all major application features:

- **UTF-8 Emoji Persistence**: Tests that pet names with emojis (like "Löna 🐕") are properly stored and retrieved
- **Past Date Booking Rejection**: Ensures appointments cannot be created for past dates
- **Appointment Cancellation Flow**: Validates soft-cancel functionality where appointments remain in database
- **Upcoming Appointment Queries**: Verifies REQUESTED and CONFIRMED appointments appear in owner lists
- **Vaccination Tracking**: Tests vaccination record creation with automatic reminder generation
- **Medication Tracking**: Validates medication course recording with end date reminders
- **Authorization Controls**: Confirms cross-user access is properly blocked (403 FORBIDDEN)
- **Health Summary Validation**: Tests AI-powered health summary generation with proper error handling
- **Veterinarian Discovery**: Validates search, filtering, and availability checking functionality
- **Rescheduling Workflows**: Comprehensive testing of appointment rescheduling with slot validation, permission checks, and working hours enforcement

#### Dashboard Data Verification
**New** The `verify_dashboard_data.js` script validates that seeded data is correctly served through APIs for different user roles.

#### Tracking Demo Script
**New** The `seed_tracking_demo.js` script provides one-time demo data seeding for vaccination and medication tracking.

Testing strategies:
- Run against live development server to validate end-to-end workflows
- Test cross-user authorization boundaries
- Verify timezone handling for working hours validation (Karachi UTC+5)
- Validate appointment status transitions and data consistency
- Test AI provider fallback when health summary generation fails

**Section sources**
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)
- [seed_tracking_demo.js:1-74](file://seed_tracking_demo.js#L1-L74)

### End-to-End Workflows

#### User Registration with OAuth
- Steps: call Google OAuth callback with credential (real or mock), verify user upsert, assert session cookie, retrieve current user via /api/auth/me.
- Assertions: 200 success, user fields present, cookie set, subsequent authenticated requests succeed.

#### Pet Profile Creation with Medical Records
- Steps: register/login user, create pet via /api/pets, optionally create related records (vaccinations, medications, allergies, conditions, metrics) through AI tool flows or direct DB seeding.
- Assertions: pet created with correct ownerId, related records exist, timeline queries return expected data.
- **Enhanced**: Test UTF-8 emoji persistence in pet names and verify proper character encoding throughout the system.

#### Enhanced Appointment Booking and Rescheduling with Availability Checking
**Updated** Steps: authenticate as pet owner, call /api/appointments POST with valid data, assert 201 created; attempt duplicate booking to assert 409 conflict; list appointments to verify inclusion; **test rescheduling workflow with slot validation, permission checks, and working hours enforcement**; **validate past-date booking rejection and cancellation flows**.
- Assertions: conflict detection works, role-based listing returns correct subsets, timestamps and statuses are correct; **rescheduling validates permissions, working hours, and availability**; **past dates are properly rejected**.

#### Health Summary and Veterinarian Discovery Workflows
**New** Steps: authenticate as pet owner, create vaccination and medication records, call /api/pets/[petId]/health-summary to generate AI-powered summary, use /api/vet/discovery to find available veterinarians with date-specific availability.
- Assertions: health summary includes structured facts and AI-generated content; veterinarian discovery returns filtered results with availability data; proper authorization controls prevent unauthorized access.

[No sources needed since this section synthesizes previously analyzed components]

## Dependency Analysis
The application's integration surface depends on:
- Next.js API routes for HTTP entry points.
- Shared libraries for authentication and database access.
- Prisma client configured with PostgreSQL adapter and connection pooling.
- External services for OAuth and AI providers.
- **Enhanced verification scripts for comprehensive testing coverage including 577 lines of automated testing**.

```mermaid
graph LR
Routes["API Routes"] --> Auth["lib/auth.ts"]
Routes --> DB["lib/db.ts"]
Routes --> AI["lib/ai.ts"]
Auth --> DB
DB --> PG["PostgreSQL"]
AI --> Ext["External AI Providers"]
Scripts["Verification Scripts"] --> Routes
Scripts --> DB
```

**Diagram sources**
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)
- [seed_tracking_demo.js:1-74](file://seed_tracking_demo.js#L1-L74)

**Section sources**
- [package.json:1-35](file://package.json#L1-L35)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)
- [seed_tracking_demo.js:1-74](file://seed_tracking_demo.js#L1-L74)

## Performance Considerations
- Use a dedicated test database per test suite run to avoid contention and enable parallelism where safe.
- Prefer transactional rollback or deterministic cleanup to reset state quickly between tests.
- Minimize external calls by mocking AI providers and OAuth verification in tests to reduce flakiness and latency.
- Reuse authenticated sessions within a test scenario to reduce overhead.
- Batch operations where possible (e.g., seeding related entities) to reduce round trips.
- **Optimize comprehensive test suites**: Cache slot availability data and minimize repeated API calls during the 577-line verification suite.
- **Efficient AI testing**: Mock AI provider calls for health summary and veterinarian discovery endpoints to avoid network dependencies.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and how to address them in integration tests:
- Missing DATABASE_URL or misconfigured connection pool: ensure environment variables are set and the test runner can connect to PostgreSQL.
- Duplicate key collisions during seeding: use idempotent upserts and delete dependent rows before re-inserting to support reruns.
- Flaky OAuth verification: rely on the mock flow in development/test environments to avoid network dependencies.
- AI provider failures: implement retries or fallbacks in tests; assert graceful degradation when providers are unavailable.
- Authorization errors: verify cookies/tokens are correctly passed and sessions are validated; assert 401/403 responses for unauthorized/forbidden scenarios.
- **Rescheduling test failures**: Verify timezone handling for Karachi (UTC+5), ensure working hours validation matches business rules, and confirm proper error codes for different failure scenarios.
- **Health summary test failures**: Handle AI provider unavailability gracefully and verify stored facts are still returned when AI processing fails.
- **Veterinarian discovery issues**: Ensure proper timezone handling for availability calculations and verify date validation for past dates.
- **Emoji encoding problems**: Verify UTF-8 database configuration and proper character encoding throughout the request/response pipeline.

**Section sources**
- [seed.js:1-430](file://prisma/seed.js#L1-L430)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [health summary route.ts:1-206](file://app/api/pets/[petId]/health-summary/route.ts#L1-L206)
- [veterinarian discovery route.ts:1-206](file://app/api/vet/discovery/route.ts#L1-L206)

## Conclusion
Robust integration tests for PETIVA should cover authentication, authorization, database transactions, and external service interactions. By leveraging the provided API routes, shared libraries, Prisma schema, seed data, **and comprehensive verification scripts covering 577 lines of automated testing**, you can build reliable tests that validate critical workflows such as OAuth login, pet management, appointment booking with availability checks, health summary generation, and veterinarian discovery. **The enhanced verification suite ensures thorough validation of UTF-8 emoji persistence, past-date booking rejection, appointment cancellation flows, upcoming appointment queries, vaccination and medication tracking with automatic reminders, authorization controls, and validation of new health summary and veterinarian discovery features.** Mocking external services and isolating test databases will improve stability and speed while ensuring correctness across the system.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Test Environment Setup
- Database:
  - Configure DATABASE_URL pointing to a test PostgreSQL instance.
  - Run migrations and seed data before tests using prisma migrate and seed.js.
- Mock Services:
  - Use the Google OAuth mock flow by sending credentials with the recognized prefix to bypass network calls.
  - Mock AI provider HTTP calls to avoid external dependencies; assert tool execution paths and database effects.
- Test Data Seeding:
  - Use seed.js to populate clinics, users, veterinarians, pets, appointments, medical records, and related entities.
  - For additional ad-hoc data, reference patterns in verification scripts to create minimal fixtures.
- **Enhanced Verification Scripts**:
  - Run `verify_handoff.js` against live development server for comprehensive testing covering 577 lines of automated scenarios.
  - Use `verify_dashboard_data.js` to validate dashboard data presentation across different user roles.
  - Utilize `seed_tracking_demo.js` to seed vaccination and medication tracking data for demonstration purposes.

**Section sources**
- [seed.js:1-430](file://prisma/seed.js#L1-L430)
- [verify_handoff.js:1-577](file://verify_handoff.js#L1-L577)
- [verify_dashboard_data.js:1-39](file://verify_dashboard_data.js#L1-L39)
- [seed_tracking_demo.js:1-74](file://seed_tracking_demo.js#L1-L74)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)

### Authentication and Authorization Testing Checklist
- Unauthenticated requests return 401.
- Invalid credentials return 401.
- Valid login/registration sets session cookie and allows subsequent authenticated requests.
- Role-based endpoints enforce restrictions (e.g., clinic profile requires CLINIC_ADMIN).
- Ownership checks prevent cross-user access (e.g., pet detail/update/delete).
- **Enhanced Authorization Coverage**:
  - Health summary endpoint requires proper ownership validation
  - Veterinarian discovery requires authentication
  - Vaccination and medication endpoints enforce owner-only access
  - Cross-user access attempts return 403 FORBIDDEN
  - Appointment rescheduling restricted to pet owners only

**Section sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointment detail route.ts:17-42](file://app/api/appointments/[appointmentId]/route.ts#L17-L42)
- [health summary route.ts:37-52](file://app/api/pets/[petId]/health-summary/route.ts#L37-L52)
- [veterinarian discovery route.ts:24-26](file://app/api/vet/discovery/route.ts#L24-L26)
- [vaccinations route.ts:59-78](file://app/api/pets/[petId]/vaccinations/route.ts#L59-L78)
- [medications route.ts:59-78](file://app/api/pets/[petId]/medications/route.ts#L59-L78)

### Best Practices for Integration Tests
- Isolation:
  - Use separate test databases or schemas per test suite.
  - Wrap test steps in transactions when feasible and roll back at the end.
- Cleanup:
  - Delete created entities or reset state deterministically after each test.
  - Use idempotent seeding to support repeated runs.
- Performance:
  - Avoid unnecessary external calls; mock third-party APIs.
  - Reuse authenticated contexts within a single scenario.
- Reliability:
  - Assert both success and failure paths.
  - Include timeouts and retries for external services when necessary.
- **Enhanced Testing Coverage**:
  - Test timezone handling for working hours validation (Karachi UTC+5)
  - Validate all error codes and messages for rescheduling operations
  - Ensure comprehensive coverage of permission and authorization scenarios
  - Test edge cases like same-time reschedule attempts and cancelled appointment rescheduling
  - Verify UTF-8 emoji persistence throughout the system
  - Test AI provider fallback mechanisms for health summary generation
  - Validate veterinarian discovery availability calculations with proper timezone handling

[No sources needed since this section provides general guidance]