# Authentication Decision

## Current Project State

*   **Next.js Version:** `16.3.2` (Next.js 16 App Router)
*   **React Version:** `19.2.8` (React 19)
*   **TypeScript Version:** `^5`
*   **Database Engine:** PostgreSQL hosted on Alibaba Cloud RDS (ApsaraDB RDS).
*   **Existing Code:** Greenfield template with pages in the root `/app` directory. No pre-existing middleware, session verification handlers, or authentication configurations exist.

---

## Options Considered

### Option 1: NextAuth.js / Auth.js (v5)
*   **Fit for Project:** Standard framework for Next.js App Router.
*   **Analysis:** While it simplifies basic social login flow, configuring custom DB adapters for opaque tokens and checking session hooks inside edge runtimes introduces configuration friction for a hackathon. We would still need to build all application-level authorization (RBAC, pet ownership, vet consent) ourselves.

### Option 2: Alibaba Cloud Identity Service (IDaaS)
*   **Fit for Project:** Enterprise-managed OIDC provider.
*   **Analysis:** Highly secure but represents substantial setup complexity for a rapid MVP. The lack of standard Next.js App Router SDKs makes it high-risk for the hackathon timeline.

### Option 3: Third-Party Managed Auth (e.g. Clerk / Kinde)
*   **Fit for Project:** Third-party SaaS authentication.
*   **Analysis:** Quick setup but introduces external network calls during session validation, webhook synchronization overhead for custom roles, and external vendor dependencies.

### Option 4: Database-Backed Custom Session Management (Recommended)
*   **Fit for Project:** Self-contained, secure system where a cryptographically secure random session token is issued in an HttpOnly cookie, and only its SHA-256 hash is stored in the database (`Session.tokenHash`).
*   **Analysis:** Provides immediate session revocation, protects against token theft via database leaks, has zero dependency version conflicts with React 19/Next.js 16, and integrates cleanly with our RDS PostgreSQL database.

---

## Comparison

| Criteria | Option 1: Auth.js (v5) | Option 2: Alibaba IDaaS | Option 3: Managed (Clerk) | Option 4: Db-Backed Opaque (Rec) |
| :--- | :--- | :--- | :--- | :--- |
| **Next.js 16 Compatibility** | Medium-High (Beta) | High (Standard OIDC) | High | **Excellent (Zero version locks)** |
| **Session Revocation** | Delayed (if JWT) | Delayed (Token-based) | Webhook Sync | **Instant (Database delete)** |
| **Database Compromise Protection** | Varies | High | High | **Excellent (Hashed tokens)** |
| **Timeline Fit** | Medium (Setup overhead) | Poor (OIDC complexity) | Good | **Excellent (Predictable, direct)** |
| **Alibaba Cloud RDS Integration** | Good (Adapter tables) | Manual | Webhook | **Direct query & joint indexes** |
| **Local Dev Experience** | Standard | High config overhead | Requires internet | **Excellent (Offline-capable)** |

---

## Recommended Approach

We recommend **DATABASE-BACKED CUSTOM SESSION MANAGEMENT** using cryptographically secure opaque session tokens, storing only the secure SHA-256 hash in the database.

---

## Why It Fits This Project

1.  **Strict Security Posture:** Storing only a secure hash of the token (`tokenHash`) ensures that even in the event of a database read compromise, attackers cannot reconstruct active session tokens to hijack user accounts.
2.  **Immediate Control over Session State:** Critical actions—such as suspending a user, editing veterinarian verification flags, or updating permission scopes—instantly block access because the database session is queried and verified on every sensitive request.
3.  **100% Native Next.js 16/React 19 Parity:** Eliminates runtime dependency issues by using Node's native `crypto` library and standard PostgreSQL queries.

---

## Required Dependencies

*   [`argon2`](https://www.npmjs.com/package/argon2): Preferred password hashing library (Argon2id profile).
    *   *Verification requirement:* Compatibility must be verified against the local development runtime and the Alibaba Cloud deployment container. If native compilation dependencies present issues, `bcryptjs` may be selected explicitly as an architectural decision.
*   **Note:** `jose` is not required. Database-backed opaque sessions do not require JWT signing.

---

## Database Implications

We will add a `Session` model to the Prisma schema:

```prisma
model Session {
  id          String   @id @default(uuid())
  tokenHash   String   @unique
  userId      String
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  expiresAt   DateTime
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([tokenHash])
  @@index([userId])
  @@index([expiresAt])
}
```

*   **Token Generation:** Created server-side using Node's native `crypto.randomBytes(32).toString('hex')`.
*   **Token Storage:** The plaintext token is returned to the client in the cookie. The database stores `crypto.createHash('sha256').update(plaintextToken).digest('hex')`.
*   **Session Revocation & Invalidations:** Sign-out deletes the matching `Session` row. Password changes or account suspensions perform a bulk delete on `Session` rows matching the target `userId`.

---

## Authorization Implications

We maintain a strict separation between **Authentication** (identity verification) and **Authorization** (resource access control):

```
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHENTICATION PIPELINE                         │
│ 1. Read plaintext token from secure HttpOnly cookie                   │
│ 2. Hash token using SHA-256                                            │
│ 3. Query DB for matching tokenHash and verify expiresAt > now          │
│ 4. Load User profile (expose ID, Email, Role, isSuspended)             │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                        AUTHORIZATION PIPELINE                          │
│                                                                        │
│  getCurrentUser() ────► Returns authenticated user object or null      │
│  requireAuth()    ────► Asserts user is authenticated (else redirect)  │
│  requireRole()    ────► Checks if user.role matches required RBAC     │
│                                                                        │
│  Pet Owner check  ────► Asserts user.id === pet.ownerId                │
│  Vet Consent check────► Asserts active confirmed Appointment exists    │
└────────────────────────────────────────────────────────────────────────┘
```

*   **Next.js Middleware:** Intercepts path routing (`/middleware.ts`) as standard in Next.js 16 to perform basic path-protection checks (e.g., redirecting users missing a session cookie to `/login`).
*   **Authoritative Validation:** Downstream API routes, server components, and server actions run the verification database query directly to perform secure auth checks.

---

## Security Considerations

*   **Cookie Security:** Plaintext tokens are sent inside cookies flagged as `HttpOnly`, `Secure` (in production), `SameSite=Lax`, and `Path=/`.
*   **Token Hashing:** Hashing opaque tokens with SHA-256 prevents database-leak hijack scenarios.
*   **Sliding-Window Expiration:** Sessions expire 2 hours after the last update and must be cleaned up periodically via cron tasks.

---

## Implementation Plan

1.  **Prisma Updates:** Append the `Session` model with correct indices to `schema.prisma`.
2.  **Session Utilities:** Create `lib/auth/session.ts` containing token generation (`randomBytes`) and hashing (`sha256`) methods.
3.  **Auth Helpers:** Create:
    *   `getCurrentUser()`: Resolves user data from the cookie session.
    *   `requireAuth()`: Asserts session exists.
    *   `requireRole(role)`: Asserts role access.
4.  **Route Integration:** Create registration, login, and logout API handlers. Add `middleware.ts` for routing protection.

---

## Risks

*   **Database Query Load:** Session lookups query RDS on every protected API page load.
    *   *Mitigation:* Single indexed primary queries on `tokenHash` have sub-millisecond execution times on Alibaba Cloud RDS.
*   **Argon2id Native Compile Failure:** Native compilation may fail on Windows dev environments.
    *   *Mitigation:* Verify runtime support during Phase 1. Switch explicitly to `bcryptjs` if compiler dependencies prove blocker.

---

## Decision Status

RECOMMENDED — PENDING HUMAN APPROVAL
