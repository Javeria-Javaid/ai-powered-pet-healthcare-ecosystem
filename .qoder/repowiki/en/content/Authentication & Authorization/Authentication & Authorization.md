# Authentication & Authorization

<cite>
**Referenced Files in This Document**
- [auth.ts](file://lib/auth.ts)
- [route.ts (login)](file://app/api/auth/login/route.ts)
- [route.ts (register)](file://app/api/auth/register/route.ts)
- [route.ts (logout)](file://app/api/auth/logout/route.ts)
- [route.ts (me)](file://app/api/auth/me/route.ts)
- [route.ts (google callback)](file://app/api/auth/google/callback/route.ts)
- [route.ts (google config)](file://app/api/auth/google/config/route.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [route.ts (pets)](file://app/api/pets/route.ts)
- [route.ts (clinic appointments)](file://app/api/clinic/appointments/route.ts)
- [route.ts (vet patients)](file://app/api/vet/patients/route.ts)
- [proxy.ts](file://proxy.ts)
- [03-authentication-decision.md](file://docs/02-requirements/03-authentication-decision.md)
- [06-security.md](file://docs/03-architecture/06-security.md)
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
This document explains the PETIVA authentication and authorization system. It covers a multi-layered approach that combines email/password with Argon2 hashing and Google OAuth integration, secure session management via HttpOnly cookies, token generation and validation, automatic session expiration handling, and role-based access control (RBAC) for Pet Owner, Veterinarian, Clinic Admin, and Platform Admin roles. It also documents protected route middleware, request interception, authorization checks, end-to-end flows from login to logout, and security measures against common vulnerabilities such as CSRF and XSS.

## Project Structure
The authentication and authorization features are implemented across:
- Shared auth utilities and helpers
- API routes for registration, login, logout, current user, and Google OAuth
- Protected resource routes demonstrating RBAC enforcement
- Database schema defining users, sessions, and related entities
- A Next.js proxy/middleware for path-level protection

```mermaid
graph TB
subgraph "Auth Utilities"
A["lib/auth.ts"]
end
subgraph "API Routes"
B["app/api/auth/login/route.ts"]
C["app/api/auth/register/route.ts"]
D["app/api/auth/logout/route.ts"]
E["app/api/auth/me/route.ts"]
F["app/api/auth/google/callback/route.ts"]
G["app/api/auth/google/config/route.ts"]
end
subgraph "Protected Resources"
H["app/api/pets/route.ts"]
I["app/api/clinic/appointments/route.ts"]
J["app/api/vet/patients/route.ts"]
end
subgraph "DB Schema"
K["prisma/schema.prisma"]
end
subgraph "Routing Protection"
L["proxy.ts"]
end
B --> A
C --> A
D --> A
E --> A
F --> A
H --> A
I --> A
J --> A
A --> K
L --> A
```

**Diagram sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [route.ts (login):1-58](file://app/api/auth/login/route.ts#L1-L58)
- [route.ts (register):1-78](file://app/api/auth/register/route.ts#L1-L78)
- [route.ts (logout):1-25](file://app/api/auth/logout/route.ts#L1-L25)
- [route.ts (me):1-33](file://app/api/auth/me/route.ts#L1-L33)
- [route.ts (google callback):1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [route.ts (google config):1-8](file://app/api/auth/google/config/route.ts#L1-L8)
- [route.ts (pets):1-69](file://app/api/pets/route.ts#L1-L69)
- [route.ts (clinic appointments):1-98](file://app/api/clinic/appointments/route.ts#L1-L98)
- [route.ts (vet patients):1-71](file://app/api/vet/patients/route.ts#L1-L71)
- [schema.prisma:9-66](file://prisma/schema.prisma#L9-L66)
- [proxy.ts:1-34](file://proxy.ts#L1-L34)

**Section sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [schema.prisma:9-66](file://prisma/schema.prisma#L9-L66)
- [proxy.ts:1-34](file://proxy.ts#L1-L34)

## Core Components
- Password hashing and verification using Argon2id
- Secure session tokens generated server-side and stored in HttpOnly cookies
- Database-backed sessions with SHA-256 hashed tokens and sliding-window expiration
- Role-based access control helpers for asserting identity and permissions
- Google OAuth flow with client ID verification and session creation
- Path-level protection via Next.js middleware/proxy

Key responsibilities:
- lib/auth.ts: Centralized auth primitives, session lifecycle, cookie helpers, and RBAC guards
- API routes: Implement login, register, logout, current user, and Google OAuth callbacks
- Protected routes: Enforce authentication and role checks per resource
- prisma/schema.prisma: Defines User, Session, and related models/enums

**Section sources**
- [auth.ts:10-124](file://lib/auth.ts#L10-L124)
- [route.ts (login):5-48](file://app/api/auth/login/route.ts#L5-L48)
- [route.ts (register):6-68](file://app/api/auth/register/route.ts#L6-L68)
- [route.ts (logout):5-16](file://app/api/auth/logout/route.ts#L5-L16)
- [route.ts (me):4-23](file://app/api/auth/me/route.ts#L4-L23)
- [route.ts (google callback):6-88](file://app/api/auth/google/callback/route.ts#L6-L88)
- [schema.prisma:9-66](file://prisma/schema.prisma#L9-L66)

## Architecture Overview
The system separates authentication (identity verification) from authorization (access control). Authentication is performed at the boundary (middleware/proxy) and enforced authoritatively in each API route. Sessions are stored server-side with hashed tokens and managed via secure cookies.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Proxy as "Next.js Proxy"
participant Login as "POST /api/auth/login"
participant Auth as "lib/auth.ts"
participant DB as "Prisma (Session/User)"
Client->>Proxy : Request to protected path
Proxy->>Proxy : Check session cookie presence
alt No session
Proxy-->>Client : Redirect to login
else Has session
Proxy-->>Client : Continue to route
end
Client->>Login : {email, password}
Login->>Auth : verifyPassword()
Auth-->>Login : boolean
alt Invalid
Login-->>Client : 401 Unauthorized
else Valid
Login->>Auth : generateSessionToken(), createSession(), setSessionCookie()
Auth->>DB : Insert Session(tokenHash, userId, expiresAt)
DB-->>Auth : Session
Auth-->>Login : Success
Login-->>Client : 200 OK + user info
end
```

**Diagram sources**
- [proxy.ts:6-23](file://proxy.ts#L6-L23)
- [route.ts (login):5-48](file://app/api/auth/login/route.ts#L5-L48)
- [auth.ts:23-92](file://lib/auth.ts#L23-L92)
- [schema.prisma:55-66](file://prisma/schema.prisma#L55-L66)

## Detailed Component Analysis

### Email/Password Authentication
- Registration validates required fields, enforces minimum password length, prevents duplicates, hashes passwords with Argon2id, creates user, issues session, and sets secure cookie.
- Login verifies credentials, creates session, and sets secure cookie.
- Current user endpoint reads the session cookie and returns minimal user profile if authenticated.

```mermaid
flowchart TD
Start(["Register/Login Entry"]) --> Validate["Validate Input"]
Validate --> Exists{"User exists?"}
Exists --> |No (Register)| HashPwd["Hash Password (Argon2id)"]
Exists --> |Yes (Login)| Verify["Verify Password"]
HashPwd --> CreateUser["Create User"]
Verify --> Match{"Match?"}
Match --> |No| Err["Return 401"]
Match --> |Yes| CreateSess["Create Session + Set Cookie"]
CreateUser --> CreateSess
CreateSess --> End(["Success Response"])
Err --> End
```

**Diagram sources**
- [route.ts (register):6-68](file://app/api/auth/register/route.ts#L6-L68)
- [route.ts (login):5-48](file://app/api/auth/login/route.ts#L5-L48)
- [auth.ts:10-44](file://lib/auth.ts#L10-L44)

**Section sources**
- [route.ts (register):6-68](file://app/api/auth/register/route.ts#L6-L68)
- [route.ts (login):5-48](file://app/api/auth/login/route.ts#L5-L48)
- [route.ts (me):4-23](file://app/api/auth/me/route.ts#L4-L23)
- [auth.ts:10-44](file://lib/auth.ts#L10-L44)

### Google OAuth Integration
- The callback endpoint accepts a Google credential, verifies it using the configured client ID (with a development mock mode), extracts user identity, creates or finds the user, issues a session, and sets the cookie.
- A configuration endpoint exposes the Google client ID to the frontend.

```mermaid
sequenceDiagram
participant Client as "Client"
participant GC as "Google OAuth Callback"
participant Auth as "lib/auth.ts"
participant DB as "Prisma (User/Session)"
Client->>GC : POST {credential}
GC->>GC : Verify IdToken (or use dev mock)
GC->>DB : Find/Create User by email
DB-->>GC : User
GC->>Auth : generateSessionToken(), createSession(), setSessionCookie()
Auth->>DB : Insert Session
DB-->>Auth : Session
Auth-->>GC : Success
GC-->>Client : 200 OK + user info
```

**Diagram sources**
- [route.ts (google callback):6-88](file://app/api/auth/google/callback/route.ts#L6-L88)
- [route.ts (google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [auth.ts:23-92](file://lib/auth.ts#L23-L92)
- [schema.prisma:30-66](file://prisma/schema.prisma#L30-L66)

**Section sources**
- [route.ts (google callback):6-88](file://app/api/auth/google/callback/route.ts#L6-L88)
- [route.ts (google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)

### Session Management and Expiration
- Tokens are generated securely and hashed before storage; only the hash is persisted.
- Sessions include an expiration timestamp and support sliding-window extension when nearing expiry.
- Cookies are HttpOnly, Secure in production, SameSite=Lax, and scoped to root path.
- Logout invalidates the session and clears the cookie.

```mermaid
classDiagram
class Session {
+string id
+string tokenHash
+string userId
+DateTime expiresAt
+DateTime createdAt
+DateTime updatedAt
}
class User {
+string id
+string email
+UserRole role
+string firstName
+string lastName
}
Session --> User : "belongsTo"
```

**Diagram sources**
- [schema.prisma:30-66](file://prisma/schema.prisma#L30-L66)

**Section sources**
- [auth.ts:23-97](file://lib/auth.ts#L23-L97)
- [route.ts (logout):5-16](file://app/api/auth/logout/route.ts#L5-L16)

### Role-Based Access Control (RBAC)
Roles defined in the schema:
- PET_OWNER
- VETERINARIAN
- CLINIC_ADMIN
- PLATFORM_ADMIN

Authorization patterns:
- requireAuth(): Ensures a valid session exists; throws UNAUTHENTICATED otherwise.
- requireRole(): Asserts the current user’s role matches one of the allowed roles; throws FORBIDDEN otherwise.
- Resource-specific checks: Some endpoints enforce additional conditions beyond role (e.g., clinic association).

Permission matrix (examples derived from implementation):
- Pet Owner: Manage own pets and profile; cannot access vet-only or clinic admin endpoints.
- Veterinarian: Access vet-specific endpoints (e.g., patient lists) after role check; may see clinics associated via VetClinicAssociation.
- Clinic Admin: Access clinic-specific endpoints (e.g., clinic appointments) and must be linked to a clinic.
- Platform Admin: Not explicitly used in shown routes; can be enforced via requireRole('PLATFORM_ADMIN') where needed.

```mermaid
flowchart TD
Req["Incoming Request"] --> AuthCheck["requireAuth()"]
AuthCheck --> |Missing session| Unauth["401 Unauthorized"]
AuthCheck --> |Valid| RoleCheck["requireRole([...])"]
RoleCheck --> |Mismatch| Forbidden["403 Forbidden"]
RoleCheck --> |Match| ResourceCheck["Resource-specific checks<br/>e.g., clinicId ownership"]
ResourceCheck --> |Pass| Allow["Proceed to handler"]
ResourceCheck --> |Fail| Forbidden
```

**Diagram sources**
- [auth.ts:109-124](file://lib/auth.ts#L109-L124)
- [route.ts (clinic appointments):5-21](file://app/api/clinic/appointments/route.ts#L5-L21)
- [route.ts (vet patients):5-19](file://app/api/vet/patients/route.ts#L5-L19)

**Section sources**
- [schema.prisma:9-14](file://prisma/schema.prisma#L9-L14)
- [auth.ts:109-124](file://lib/auth.ts#L109-L124)
- [route.ts (clinic appointments):5-21](file://app/api/clinic/appointments/route.ts#L5-L21)
- [route.ts (vet patients):5-19](file://app/api/vet/patients/route.ts#L5-L19)

### Protected Route Middleware and Request Interception
- Path-level protection: A Next.js proxy/middleware intercepts requests to protected paths and redirects unauthenticated users to login, passing a redirect parameter.
- Authoritative checks: Each API route independently validates sessions and roles, ensuring defense-in-depth even if middleware is bypassed.

```mermaid
sequenceDiagram
participant Browser as "Browser"
participant Proxy as "proxy.ts"
participant API as "Protected API Route"
participant Auth as "lib/auth.ts"
Browser->>Proxy : GET /dashboard/...
Proxy->>Proxy : Check session cookie
alt No cookie
Proxy-->>Browser : Redirect to /?redirect=/dashboard
else Has cookie
Proxy-->>Browser : Continue
Browser->>API : GET /api/...
API->>Auth : requireAuth()/requireRole()
Auth-->>API : User or throw
API-->>Browser : JSON response
end
```

**Diagram sources**
- [proxy.ts:6-23](file://proxy.ts#L6-L23)
- [auth.ts:100-124](file://lib/auth.ts#L100-L124)
- [route.ts (pets):6-27](file://app/api/pets/route.ts#L6-L27)

**Section sources**
- [proxy.ts:6-23](file://proxy.ts#L6-L23)
- [route.ts (pets):6-27](file://app/api/pets/route.ts#L6-L27)

### Logout Flow
- Retrieves the session token from the cookie, invalidates the session in the database, and clears the cookie.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Logout as "POST /api/auth/logout"
participant Auth as "lib/auth.ts"
Client->>Logout : POST (no body)
Logout->>Auth : invalidateSession(token)
Auth->>Auth : clearSessionCookie()
Auth-->>Logout : Done
Logout-->>Client : 200 OK
```

**Diagram sources**
- [route.ts (logout):5-16](file://app/api/auth/logout/route.ts#L5-L16)
- [auth.ts:77-97](file://lib/auth.ts#L77-L97)

**Section sources**
- [route.ts (logout):5-16](file://app/api/auth/logout/route.ts#L5-L16)
- [auth.ts:77-97](file://lib/auth.ts#L77-L97)

## Dependency Analysis
- API routes depend on lib/auth.ts for session and RBAC logic.
- lib/auth.ts depends on Prisma client and Node crypto/argon2 libraries.
- Database schema defines core entities and relationships used by all components.
- Proxy depends on cookie presence to gate routing.

```mermaid
graph LR
PETS["/api/pets"] --> AUTH["lib/auth.ts"]
CLINIC_APPTS["/api/clinic/appointments"] --> AUTH
VET_PATIENTS["/api/vet/patients"] --> AUTH
LOGIN["/api/auth/login"] --> AUTH
REGISTER["/api/auth/register"] --> AUTH
LOGOUT["/api/auth/logout"] --> AUTH
ME["/api/auth/me"] --> AUTH
GOOGLE_CB["/api/auth/google/callback"] --> AUTH
AUTH --> SCHEMA["prisma/schema.prisma"]
PROXY["proxy.ts"] --> AUTH
```

**Diagram sources**
- [route.ts (pets):1-69](file://app/api/pets/route.ts#L1-L69)
- [route.ts (clinic appointments):1-98](file://app/api/clinic/appointments/route.ts#L1-L98)
- [route.ts (vet patients):1-71](file://app/api/vet/patients/route.ts#L1-L71)
- [route.ts (login):1-58](file://app/api/auth/login/route.ts#L1-L58)
- [route.ts (register):1-78](file://app/api/auth/register/route.ts#L1-L78)
- [route.ts (logout):1-25](file://app/api/auth/logout/route.ts#L1-L25)
- [route.ts (me):1-33](file://app/api/auth/me/route.ts#L1-L33)
- [route.ts (google callback):1-98](file://app/api/auth/google/callback/route.ts#L1-L98)
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [schema.prisma:9-66](file://prisma/schema.prisma#L9-L66)
- [proxy.ts:1-34](file://proxy.ts#L1-L34)

**Section sources**
- [auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [schema.prisma:9-66](file://prisma/schema.prisma#L9-L66)

## Performance Considerations
- Session validation performs a single indexed lookup by tokenHash per request; this is efficient but adds DB load on every protected call.
- Sliding-window expiration updates occur only when less than one hour remains, reducing write frequency.
- Consider periodic cleanup of expired sessions via background jobs to keep the Session table lean.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common errors and handling:
- UNAUTHENTICATED: Thrown when no valid session is present; routes should return 401.
- FORBIDDEN: Thrown when role does not match required roles or resource-specific checks fail; routes should return 403.
- BAD_REQUEST: Missing or invalid input; ensure clients send required fields.
- INTERNAL_SERVER_ERROR: Unexpected server errors; log and return 500.

Examples of error mapping in routes:
- Login/Register/Me: Map UNAUTHENTICATED to 401 and internal errors to 500.
- Clinic Appointments: Map UNAUTHENTICATED to 401 and FORBIDDEN to 403.
- Vet Patients: Map both UNAUTHENTICATED and FORBIDDEN to 403.

**Section sources**
- [route.ts (login):49-57](file://app/api/auth/login/route.ts#L49-L57)
- [route.ts (register):70-77](file://app/api/auth/register/route.ts#L70-L77)
- [route.ts (me):25-32](file://app/api/auth/me/route.ts#L25-L32)
- [route.ts (clinic appointments):85-96](file://app/api/clinic/appointments/route.ts#L85-L96)
- [route.ts (vet patients):58-69](file://app/api/vet/patients/route.ts#L58-L69)

## Conclusion
PETIVA implements a robust, layered authentication and authorization system:
- Multi-factor identity options: email/password with Argon2id and Google OAuth
- Secure session management with hashed tokens, HttpOnly cookies, and sliding-window expiration
- Clear RBAC model with reusable guards and resource-specific checks
- Defense-in-depth via middleware gating and authoritative per-route validation
Adhering to these patterns ensures secure, maintainable access control across the application.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Security Considerations
- Password policies: Minimum length enforced during registration; passwords hashed with Argon2id.
- Session security: HttpOnly, Secure (production), SameSite=Lax cookies; token hashing prevents hijack via DB leaks.
- CSRF/XSS protections: HttpOnly cookies mitigate XSS exposure of tokens; SameSite=Lax mitigates CSRF risks. Ensure frontend avoids storing sensitive data in localStorage and uses proper CSP headers.
- Rate limiting: Recommended for auth endpoints to prevent brute-force attacks.

**Section sources**
- [03-authentication-decision.md:125-130](file://docs/02-requirements/03-authentication-decision.md#L125-L130)
- [06-security.md:7-14](file://docs/03-architecture/06-security.md#L7-L14)

### How to Implement Protected Routes and Checks
- Require authentication: Call requireAuth() at the start of any protected route; handle UNAUTHENTICATED as 401.
- Require role: Call requireRole(['VETERINARIAN', 'CLINIC_ADMIN']) where appropriate; handle FORBIDDEN as 403.
- Resource ownership: For owner-scoped resources, ensure user.id matches the resource ownerId; for clinic-scoped resources, validate user.clinicId.

**Section sources**
- [route.ts (pets):6-27](file://app/api/pets/route.ts#L6-L27)
- [route.ts (clinic appointments):5-21](file://app/api/clinic/appointments/route.ts#L5-L21)
- [route.ts (vet patients):5-19](file://app/api/vet/patients/route.ts#L5-L19)
- [auth.ts:109-124](file://lib/auth.ts#L109-L124)