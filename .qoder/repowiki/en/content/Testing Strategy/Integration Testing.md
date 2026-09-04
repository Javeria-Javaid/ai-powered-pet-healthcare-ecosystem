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
- [clinic profile route.ts](file://app/api/clinic/profile/route.ts)
- [seed.js](file://prisma/seed.js)
- [test_booking.ts](file://test_booking.ts)
</cite>

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
This document provides comprehensive integration testing guidance for the PETIVA application. It focuses on validating REST API endpoints, database operations with Prisma and PostgreSQL, and external service integrations such as Google OAuth and AI providers (Groq, Gemini, Qwen). It also covers end-to-end workflows like user registration via OAuth, pet profile creation with medical records, and appointment booking with availability checks. Guidance is included for test environment setup, mocking strategies, authentication and authorization testing, and best practices for isolation, cleanup, and performance.

## Project Structure
The application uses Next.js API routes under app/api, a Prisma schema defining the data model, shared libraries for database access and authentication, and an AI orchestration layer that integrates multiple LLM providers. A seed script populates realistic test data, and a small helper script demonstrates direct database interactions useful for integration tests.

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
R8["/api/clinic/profile"]
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
R1 --> L1
R2 --> L1
R3 --> L1
R4 --> L1
R5 --> L1
R6 --> L1
R7 --> L1
R8 --> L1
L1 --> L2
L2 --> PRISMA
PRISMA --> DB
R3 --> G
L3 --> A1
L3 --> A2
L3 --> A3
```

**Diagram sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [me route.ts:1-33](file://app/api/auth/me/route.ts#L1-L33)
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

**Section sources**
- [package.json:1-35](file://package.json#L1-L35)
- [schema.prisma:1-312](file://prisma/schema.prisma#L1-L312)

## Core Components
- Authentication and session management: password hashing, session token lifecycle, cookie handling, role-based access control helpers.
- Database layer: Prisma client with pg adapter, connection pooling, and environment-aware initialization.
- AI orchestration: provider selection, tool execution, and fallback strategy across Groq, Gemini, and Qwen.
- API routes: REST endpoints for auth, pets, appointments, and clinic management with consistent error handling and authorization.

Key responsibilities and relationships are implemented across lib/auth.ts, lib/db.ts, lib/ai.ts, and the API routes listed above.

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
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)

## Architecture Overview
Integration tests should validate the full request/response cycle including authentication, authorization, database transactions, and external calls. The following diagram maps the primary flows used by integration tests.

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
```

**Diagram sources**
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [pets route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
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
- Ownership checks must return 403 when accessing another user’s pet.
- Validation errors must return 400 with appropriate messages.
- Successful operations must return expected entities and status codes.

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
- List appointments: role-based filtering (PET_OWNER, VETERINARIAN, CLINIC_ADMIN).
- Create appointment: requires authentication, validates ownership, prevents double booking within a transaction, persists appointment.

Testing strategies:
- Role-based visibility: ensure each role sees only permitted appointments.
- Double booking prevention: assert 409 conflict when attempting to book an already requested or confirmed slot.
- Transactional integrity: confirm atomicity of conflict check and creation.

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

**Section sources**
- [appointments route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)

### Clinic Management Endpoints
- Clinic profile: requires CLINIC_ADMIN role and associated clinicId; supports GET and PUT updates.

Testing strategies:
- Enforce role-based access: non-admin users receive 403.
- Validate missing associations: return 400 if no clinic linked to admin.
- Update operations: assert persisted changes and correct responses.

**Section sources**
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)

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

### End-to-End Workflows

#### User Registration with OAuth
- Steps: call Google OAuth callback with credential (real or mock), verify user upsert, assert session cookie, retrieve current user via /api/auth/me.
- Assertions: 200 success, user fields present, cookie set, subsequent authenticated requests succeed.

#### Pet Profile Creation with Medical Records
- Steps: register/login user, create pet via /api/pets, optionally create related records (vaccinations, medications, allergies, conditions, metrics) through AI tool flows or direct DB seeding.
- Assertions: pet created with correct ownerId, related records exist, timeline queries return expected data.

#### Appointment Booking with Availability Checking
- Steps: authenticate as pet owner, call /api/appointments POST with valid data, assert 201 created; attempt duplicate booking to assert 409 conflict; list appointments to verify inclusion.
- Assertions: conflict detection works, role-based listing returns correct subsets, timestamps and statuses are correct.

[No sources needed since this section synthesizes previously analyzed components]

## Dependency Analysis
The application’s integration surface depends on:
- Next.js API routes for HTTP entry points.
- Shared libraries for authentication and database access.
- Prisma client configured with PostgreSQL adapter and connection pooling.
- External services for OAuth and AI providers.

```mermaid
graph LR
Routes["API Routes"] --> Auth["lib/auth.ts"]
Routes --> DB["lib/db.ts"]
Routes --> AI["lib/ai.ts"]
Auth --> DB
DB --> PG["PostgreSQL"]
AI --> Ext["External AI Providers"]
```

**Diagram sources**
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

**Section sources**
- [package.json:1-35](file://package.json#L1-L35)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

## Performance Considerations
- Use a dedicated test database per test suite run to avoid contention and enable parallelism where safe.
- Prefer transactional rollback or deterministic cleanup to reset state quickly between tests.
- Minimize external calls by mocking AI providers and OAuth verification in tests to reduce flakiness and latency.
- Reuse authenticated sessions within a test scenario to reduce overhead.
- Batch operations where possible (e.g., seeding related entities) to reduce round trips.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and how to address them in integration tests:
- Missing DATABASE_URL or misconfigured connection pool: ensure environment variables are set and the test runner can connect to PostgreSQL.
- Duplicate key collisions during seeding: use idempotent upserts and delete dependent rows before re-inserting to support reruns.
- Flaky OAuth verification: rely on the mock flow in development/test environments to avoid network dependencies.
- AI provider failures: implement retries or fallbacks in tests; assert graceful degradation when providers are unavailable.
- Authorization errors: verify cookies/tokens are correctly passed and sessions are validated; assert 401/403 responses for unauthorized/forbidden scenarios.

**Section sources**
- [seed.js:1-430](file://prisma/seed.js#L1-L430)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [ai.ts:1-467](file://lib/ai.ts#L1-L467)

## Conclusion
Robust integration tests for PETIVA should cover authentication, authorization, database transactions, and external service interactions. By leveraging the provided API routes, shared libraries, Prisma schema, and seed data, you can build reliable tests that validate critical workflows such as OAuth login, pet management, and appointment booking with availability checks. Mocking external services and isolating test databases will improve stability and speed while ensuring correctness across the system.

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
  - For additional ad-hoc data, reference patterns in test_booking.ts to create minimal fixtures.

**Section sources**
- [seed.js:1-430](file://prisma/seed.js#L1-L430)
- [test_booking.ts:1-61](file://test_booking.ts#L1-L61)
- [google callback route.ts:1-98](file://app/api/auth/google/callback/route.ts#L1-L98)

### Authentication and Authorization Testing Checklist
- Unauthenticated requests return 401.
- Invalid credentials return 401.
- Valid login/registration sets session cookie and allows subsequent authenticated requests.
- Role-based endpoints enforce restrictions (e.g., clinic profile requires CLINIC_ADMIN).
- Ownership checks prevent cross-user access (e.g., pet detail/update/delete).

**Section sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [register route.ts:1-78](file://app/api/auth/register/route.ts#L1-L78)
- [login route.ts:1-58](file://app/api/auth/login/route.ts#L1-L58)
- [clinic profile route.ts:1-95](file://app/api/clinic/profile/route.ts#L1-L95)
- [pet detail route.ts:1-141](file://app/api/pets/[petId]/route.ts#L1-L141)

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

[No sources needed since this section provides general guidance]