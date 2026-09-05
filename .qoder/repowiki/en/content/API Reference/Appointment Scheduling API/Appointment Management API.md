# Appointment Management API

<cite>
**Referenced Files in This Document**
- [route.ts](file://app/api/appointments/[appointmentId]/route.ts)
- [route.ts](file://app/api/appointments/route.ts)
- [route.ts](file://app/api/clinic/appointments/route.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [auth.ts](file://lib/auth.ts)
- [db.ts](file://lib/db.ts)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive appointment rescheduling functionality via PUT endpoint with action='RESCHEDULE'
- Implemented validation logic for reschedule requests including date/time validation and conflict detection
- Added role-based authorization specifically for rescheduling (PET_OWNER only)
- Implemented automatic status reset to REQUESTED when rescheduling, requiring vet confirmation
- Enhanced error handling for reschedule-specific scenarios
- Updated workflow documentation to include rescheduling processes

## Table of Contents
1. [Introduction](#introduction)
2. [Project Structure](#project-structure)
3. [Core Components](#core-components)
4. [Architecture Overview](#architecture-overview)
5. [Detailed Component Analysis](#detailed-component-analysis)
6. [Dependency Analysis](#dependency-analysis)
7. [Performance Considerations](#performance-considerations)
8. [Troubleshooting Guide](#troubleshooting-guide)
9. [Conclusion](#conclusion)
10. [Appendices](#appendices)

## Introduction
This document provides detailed API documentation for individual appointment management endpoints under /api/appointments/[appointmentId]. It covers:
- GET to retrieve a specific appointment's details
- PUT/PATCH to update an appointment's status and information, including comprehensive rescheduling functionality
- DELETE to cancel an appointment (via status transition)
It also documents the allowed appointment status transitions, role-based permissions, validation rules, business logic for modifications, cascade effects on related records, common workflows, error responses, and concurrency handling.

## Project Structure
The appointment management functionality is implemented as Next.js Route Handlers with Prisma data access and session-based authentication.

```mermaid
graph TB
Client["Client"] --> API["Next.js API Routes"]
subgraph "API"
A1["GET /api/appointments/[id]"]
A2["PUT /api/appointments/[id] - Status Updates"]
A3["PUT /api/appointments/[id] - Reschedule"]
A4["DELETE /api/appointments/[id]"]
end
Auth["requireAuth()"]
DB["Prisma Client"]
Schema["Prisma Schema"]
Client --> A1
Client --> A2
Client --> A3
Client --> A4
A1 --> Auth
A2 --> Auth
A3 --> Auth
A4 --> Auth
A1 --> DB
A2 --> DB
A3 --> DB
A4 --> DB
DB --> Schema
```

**Diagram sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [route.ts:1-158](file://app/api/appointments/route.ts#L1-L158)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)
- [db.ts:1-33](file://lib/db.ts#L1-L33)

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [route.ts:1-158](file://app/api/appointments/route.ts#L1-L158)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)
- [db.ts:1-33](file://lib/db.ts#L1-L33)

## Core Components
- Authentication middleware: requireAuth enforces session-based login and returns user context or throws UNAUTHENTICATED.
- Data layer: Prisma client configured via db.ts connects to PostgreSQL; schema defines entities including Appointment, User, Veterinarian, Clinic, Pet, and AuditLog.
- Endpoints:
  - GET /api/appointments/[appointmentId]: Retrieve a single appointment by ID.
  - PUT /api/appointments/[appointmentId]: Update appointment status with role checks and conflict detection.
  - PUT /api/appointments/[appointmentId] with action='RESCHEDULE': Comprehensive rescheduling functionality with validation, authorization, and automatic status reset.
  - DELETE /api/appointments/[appointmentId]: Not implemented in this route file; cancellation is performed via PUT with status CANCELLED.

Key behaviors:
- Role-based authorization per action.
- Double-booking prevention when confirming appointments.
- Comprehensive rescheduling validation including date/time checks and conflict detection.
- Automatic status reset to REQUESTED when rescheduling, requiring vet confirmation.
- Audit logging for status changes and rescheduling actions.
- Consistent error response shape.

**Section sources**
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)

## Architecture Overview
The endpoint flow ensures secure, validated updates to appointment status while preventing conflicts and recording audit trails. The new rescheduling functionality adds comprehensive validation and automatic status management.

```mermaid
sequenceDiagram
participant C as "Client"
participant R as "Route Handler"
participant A as "requireAuth"
participant P as "Prisma Client"
participant S as "Schema"
C->>R : PUT /api/appointments/{id} {action : 'RESCHEDULE', dateTime}
R->>A : requireAuth()
A-->>R : User
R->>R : Check action === 'RESCHEDULE'
alt Reschedule Request
R->>R : Validate PET_OWNER role
R->>P : Find appointment by id
P-->>R : Appointment
R->>R : Validate appointment ownership & status
R->>R : Validate new dateTime (future, not past)
R->>P : Check double-booking conflict
P-->>R : Conflict?
alt Conflict
R-->>C : 409 Conflict
else No conflict
R->>P : Update dateTime + Reset status to REQUESTED
P-->>R : Updated appointment
R->>P : Create audit log (APPOINTMENT_RESCHEDULED)
R-->>C : 200 Success
end
else Status Update
R->>P : Find appointment by id
P-->>R : Appointment
R->>R : Validate status enum
R->>R : Role-based authorization check
alt Confirming
R->>P : Check double-booking conflict
P-->>R : Conflict?
alt Conflict
R-->>C : 409 Conflict
else No conflict
R->>P : Update status
P-->>R : Updated appointment
R->>P : Create audit log
R-->>C : 200 Success
end
else Other statuses
R->>P : Update status
P-->>R : Updated appointment
R->>P : Create audit log
R-->>C : 200 Success
end
end
```

**Diagram sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)

## Detailed Component Analysis

### Endpoint: GET /api/appointments/[appointmentId]
- Purpose: Retrieve details for a specific appointment by its ID.
- Authorization: Requires authenticated user via requireAuth.
- Behavior: Fetches the appointment record using Prisma. If not found, returns 404.
- Response: Returns appointment details with related pet, vet, and clinic included.

Notes:
- The current implementation focuses on PUT for status updates and includes retrieval within that handler. A dedicated GET for a single appointment can be added similarly to the list endpoint patterns.

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)

### Endpoint: PUT /api/appointments/[appointmentId] - Status Updates
- Purpose: Update appointment status (e.g., confirm, cancel, complete).
- Authorization:
  - PET_OWNER: Can only cancel their own upcoming appointments.
  - VETERINARIAN: Can manage appointments assigned to them (confirm, cancel, complete).
  - CLINIC_ADMIN: Can manage appointments at their clinic.
  - PLATFORM_ADMIN: Full access.
- Validation:
  - Status must be a valid enum value from AppointmentStatus.
  - On CONFIRMED, double-booking check prevents conflicts with another confirmed appointment for the same vet at the same time.
- Business Logic:
  - Updates the appointment status atomically.
  - Creates an audit log entry capturing previous and new status.
- Response:
  - 200 OK with updated appointment on success.
  - 400 BAD_REQUEST if status is invalid.
  - 401 UNAUTHORIZED if not logged in.
  - 403 FORBIDDEN if unauthorized for the requested transition.
  - 404 NOT_FOUND if appointment does not exist.
  - 409 CONFLICT if double-booking detected during confirmation.
  - 500 INTERNAL_SERVER_ERROR for unexpected errors.

```mermaid
flowchart TD
Start(["Request Received"]) --> Auth["Authenticate User"]
Auth --> Parse["Parse Request Body"]
Parse --> ActionCheck{"action === 'RESCHEDULE'?"}
ActionCheck --> |Yes| RescheduleFlow["Reschedule Flow"]
ActionCheck --> |No| StatusFlow["Status Update Flow"]
RescheduleFlow --> RoleCheck["Validate PET_OWNER role"]
RoleCheck --> LoadAppt["Load Appointment"]
LoadAppt --> OwnershipCheck["Validate ownership & status"]
OwnershipCheck --> DateTimeValidation["Validate new dateTime"]
DateTimeValidation --> ConflictCheck["Check double-booking"]
ConflictCheck --> HasConflict{"Conflict?"}
HasConflict --> |Yes| Err409["Return 409 Conflict"]
HasConflict --> |No| UpdateAppt["Update dateTime + Reset status to REQUESTED"]
UpdateAppt --> AuditLog["Create APPOINTMENT_RESCHEDULED audit log"]
AuditLog --> Success["Return 200 Success"]
StatusFlow --> ValidateStatus["Validate status enum"]
ValidateStatus --> LoadAppt2["Load Appointment"]
LoadAppt2 --> RoleAuth["Role-based authorization"]
RoleAuth --> ConfirmedCheck{"Status == CONFIRMED?"}
ConfirmedCheck --> |Yes| DoubleBooking["Check double-booking"]
DoubleBooking --> Conflict2{"Conflict?"}
Conflict2 --> |Yes| Err409_2["Return 409 Conflict"]
Conflict2 --> |No| UpdateStatus["Update status"]
ConfirmedCheck --> |No| UpdateStatus
UpdateStatus --> AuditLog2["Create APPOINTMENT_UPDATED audit log"]
AuditLog2 --> Success
Err409 --> End(["Done"])
Err409_2 --> End
Success --> End
```

**Diagram sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)

### Endpoint: PUT /api/appointments/[appointmentId] - Rescheduling Functionality
- Purpose: Allow pet owners to reschedule their upcoming appointments to a new future time slot.
- Authorization: Restricted to PET_OWNER role only.
- Validation Rules:
  - Must be a PET_OWNER requesting reschedule.
  - Appointment must belong to the requesting user.
  - Only REQUESTED or CONFIRMED appointments can be rescheduled.
  - New dateTime must be provided and valid.
  - New dateTime must be in the future (not past).
  - New dateTime cannot be the same as current appointment time.
  - Double-booking prevention: vet cannot have another appointment at the new time.
- Business Logic:
  - Updates the appointment dateTime to the new time.
  - Automatically resets status to REQUESTED, requiring vet confirmation.
  - Creates comprehensive audit log with previous and new dateTime, plus status changes.
- Response:
  - 200 OK with updated appointment on success.
  - 400 BAD_REQUEST for validation failures (invalid date, missing fields, etc.).
  - 401 UNAUTHORIZED if not logged in.
  - 403 FORBIDDEN if not PET_OWNER or not owner of appointment.
  - 404 NOT_FOUND if appointment does not exist.
  - 409 CONFLICT if double-booking detected for new time slot.

**Updated** Added comprehensive rescheduling functionality with full validation and automatic status reset.

**Section sources**
- [route.ts:17-125](file://app/api/appointments/[appointmentId]/route.ts#L17-L125)

### Endpoint: DELETE /api/appointments/[appointmentId]
- Current state: Not implemented in this route file.
- Recommended approach: Implement DELETE to set status to CANCELLED with the same authorization and validation as PUT. This aligns with the existing cancellation workflow via status transition.

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)

### Related Endpoints for Context
- GET /api/appointments: Lists appointments filtered by role (pet owner, veterinarian, clinic admin).
- POST /api/appointments: Creates a new appointment with REQUESTED status, enforcing pet ownership and double-booking prevention.
- GET /api/clinic/appointments: Filters clinic-wide appointments by date/status for clinic admins.

These provide context for how appointments are created and viewed across roles.

**Section sources**
- [route.ts:1-158](file://app/api/appointments/route.ts#L1-L158)
- [route.ts:1-98](file://app/api/clinic/appointments/route.ts#L1-L98)

## Dependency Analysis
- Authentication dependency: All endpoints call requireAuth to ensure a valid session and user context.
- Database dependency: Prisma client interacts with PostgreSQL; schema defines relationships and constraints.
- Role model: UserRole enum governs access control decisions.
- Appointment model: AppointmentStatus enum constrains allowed values and drives validation.

```mermaid
graph LR
Auth["requireAuth"] --> Route["Route Handlers"]
Route --> Prisma["Prisma Client"]
Prisma --> Schema["Prisma Schema"]
Schema --> Enums["Enums: UserRole, AppointmentStatus"]
```

**Diagram sources**
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [schema.prisma:9-28](file://prisma/schema.prisma#L9-L28)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)

**Section sources**
- [auth.ts:109-115](file://lib/auth.ts#L109-L115)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [schema.prisma:9-28](file://prisma/schema.prisma#L9-L28)
- [schema.prisma:168-187](file://prisma/schema.prisma#L168-L187)

## Performance Considerations
- Index usage: Appointments are indexed on vetId+dateTime and ownerId to optimize conflict checks and filtering.
- Transactional safety: Creation uses a transaction to prevent race conditions during booking; similar transactions should be used for updates where necessary.
- N+1 queries: Include relations in queries to reduce round trips; avoid unnecessary joins.
- Concurrency: For high-concurrency scenarios, consider database-level constraints or advisory locks to enforce unique time slots per vet.
- Rescheduling optimization: The rescheduling flow includes efficient conflict detection using existing indexes.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common errors and causes:
- 401 UNAUTHORIZED: Missing or expired session token. Ensure the client sends a valid session cookie.
- 400 BAD_REQUEST: Invalid status value, missing required fields, or invalid date/time for rescheduling. Verify payload matches expected enums and fields.
- 403 FORBIDDEN: Unauthorized role or resource mismatch (e.g., non-PET_OWNER trying to reschedule, or pet owner trying to modify another's appointment).
- 404 NOT_FOUND: Appointment ID does not exist.
- 409 CONFLICT: Double-booking detected when confirming an appointment or rescheduling to an already booked time slot.
- 500 INTERNAL_SERVER_ERROR: Unexpected server-side issues; check logs and database connectivity.

Operational tips:
- Always include audit logs to trace who changed what and when.
- Use consistent error shapes with code and message fields for client handling.
- Validate inputs early to fail fast and reduce database load.
- For rescheduling errors, check both authorization and date/time validation before database queries.

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [route.ts:1-158](file://app/api/appointments/route.ts#L1-L158)

## Conclusion
The appointment management API provides robust, role-aware status updates with strong validation and conflict prevention. The new comprehensive rescheduling functionality allows pet owners to move their appointments to new time slots while maintaining data integrity through validation and automatic status management. While GET for a single appointment is not explicitly implemented in the provided route, the pattern is clear and can be added consistently. DELETE is recommended to map to cancellation via status transition to maintain consistency. Audit logging and standardized error responses support reliability and observability.

[No sources needed since this section summarizes without analyzing specific files]

## Appendices

### Appointment Status Transitions and Roles
Allowed transitions based on current implementation:
- REQUESTED -> CONFIRMED: Veterinarian or Clinic Admin (with appropriate scope).
- REQUESTED -> CANCELLED: Pet Owner (own appointment), Veterinarian (assigned), Clinic Admin (clinic scope), Platform Admin.
- CONFIRMED -> COMPLETED: Veterinarian or Clinic Admin (with appropriate scope).
- Any -> CANCELLED: As above depending on role and scope.
- REQUESTED/CONFIRMED -> REQUESTED: Via rescheduling (automatic status reset).
- NO_SHOW: Not enforced in the current route; could be added for administrative marking.

Constraints:
- Double-booking prevention on CONFIRMED transitions.
- Role-based authorization boundaries enforced per request.
- Rescheduling restricted to PET_OWNER role only.
- Rescheduled appointments automatically reset to REQUESTED status requiring vet confirmation.

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [schema.prisma:22-28](file://prisma/schema.prisma#L22-L28)

### Common Workflows

#### Confirming an Appointment
- Actor: Veterinarian or Clinic Admin.
- Steps:
  - Authenticate.
  - Send PUT with status CONFIRMED.
  - System checks double-booking; if conflict, returns 409.
  - On success, returns updated appointment and creates audit log.

**Section sources**
- [route.ts:176-193](file://app/api/appointments/[appointmentId]/route.ts#L176-L193)

#### Rescheduling an Appointment
- Actor: PET_OWNER only.
- Steps:
  - Authenticate as PET_OWNER.
  - Send PUT with action='RESCHEDULE' and new dateTime.
  - System validates ownership, appointment status, and date/time validity.
  - Checks for double-booking conflicts at the new time slot.
  - Updates dateTime and automatically resets status to REQUESTED.
  - Creates comprehensive audit log with all changes.
  - Returns updated appointment requiring vet confirmation.

**Updated** Added comprehensive rescheduling workflow with full validation and automatic status management.

**Section sources**
- [route.ts:17-125](file://app/api/appointments/[appointmentId]/route.ts#L17-L125)

#### Canceling an Appointment
- Actors:
  - Pet Owner: Only their own upcoming appointments.
  - Veterinarian: Assigned appointments.
  - Clinic Admin: Appointments at their clinic.
  - Platform Admin: Any appointment.
- Steps:
  - Authenticate.
  - Send PUT with status CANCELLED.
  - System validates role and updates status; creates audit log.

**Section sources**
- [route.ts:148-174](file://app/api/appointments/[appointmentId]/route.ts#L148-L174)

#### Handling Concurrent Modifications
- Use database transactions around critical sections (as done in creation).
- Consider optimistic locking or versioned records if concurrent edits to non-status fields are introduced.
- Enforce unique constraints at the database level for vet+dateTime combinations to guard against race conditions.
- Rescheduling includes built-in conflict detection to handle concurrent booking attempts.

**Section sources**
- [route.ts:108-125](file://app/api/appointments/route.ts#L108-L125)
- [route.ts:81-96](file://app/api/appointments/[appointmentId]/route.ts#L81-L96)

### Error Responses Reference
- 400 BAD_REQUEST: Invalid status, missing fields, or invalid date/time for rescheduling.
- 401 UNAUTHORIZED: Not logged in.
- 403 FORBIDDEN: Unauthorized role/resource (including non-PET_OWNER attempting reschedule).
- 404 NOT_FOUND: Appointment not found.
- 409 CONFLICT: Double-booking during confirmation or rescheduling to occupied time slot.
- 500 INTERNAL_SERVER_ERROR: Server error.

**Updated** Added rescheduling-specific error scenarios.

**Section sources**
- [route.ts:1-230](file://app/api/appointments/[appointmentId]/route.ts#L1-L230)
- [route.ts:1-158](file://app/api/appointments/route.ts#L1-L158)

### Rescheduling Validation Rules
Comprehensive validation for appointment rescheduling:
- **Authorization**: Must be PET_OWNER role
- **Ownership**: Appointment must belong to requesting user
- **Status**: Only REQUESTED or CONFIRMED appointments can be rescheduled
- **Date/Time**: Must be provided, valid, and in the future
- **Uniqueness**: Cannot reschedule to the same time as current appointment
- **Conflict Detection**: Vet cannot have another appointment at the new time slot
- **Automatic Status Reset**: Rescheduled appointments reset to REQUESTED requiring vet confirmation

**New Section** Added comprehensive rescheduling validation rules.

**Section sources**
- [route.ts:17-79](file://app/api/appointments/[appointmentId]/route.ts#L17-L79)