Now I have a comprehensive understanding of the changes. Let me update the database design documentation to reflect the new Conversation and Message models for veterinary chat functionality.

# Database Design & Schema

<cite>
**Referenced Files in This Document**
- [schema.prisma](file://prisma/schema.prisma)
- [db.ts](file://lib/db.ts)
- [02-database-design.md](file://docs/03-architecture/02-database-design.md)
- [migration.sql (init)](file://prisma/migrations/20260825091722_init/migration.sql)
- [migration.sql (make_password_hash_optional)](file://prisma/migrations/20260827095530_make_password_hash_optional/migration.sql)
- [migration.sql (add_clinic_admin_relation)](file://prisma/migrations/20260827123510_add_clinic_admin_relation/migration.sql)
- [migration.sql (add_chat_with_vet)](file://prisma/migrations/20260903165239_add_chat_with_vet/migration.sql)
- [route.ts (auth/register)](file://app/api/auth/register/route.ts)
- [route.ts (pets)](file://app/api/pets/route.ts)
- [route.ts (appointments)](file://app/api/appointments/route.ts)
- [route.ts (conversations)](file://app/api/conversations/route.ts)
- [route.ts (appointment conversation)](file://app/api/appointments/[appointmentId]/conversation/route.ts)
- [route.ts (messages)](file://app/api/conversations/[conversationId]/messages/route.ts)
- [route.ts (mark read)](file://app/api/conversations/[conversationId]/read/route.ts)
</cite>

## Update Summary
**Changes Made**
- Added new Conversation and Message models for veterinary chat functionality
- Updated entity relationships to include chat capabilities between pet owners and veterinarians
- Enhanced appointment model with optional conversation linkage
- Added comprehensive API endpoints for conversation management, messaging, and read status tracking
- Updated indexes and constraints for optimal chat performance

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
This document provides comprehensive data model documentation for the PETIVA Pet Healthcare Ecosystem database schema. It details entity relationships, field definitions, constraints, and validation rules implemented via Prisma. It also explains the multi-role user system, data access patterns using Prisma ORM, caching strategies, query optimization techniques, data lifecycle management, and security measures including password hashing, encrypted connections, and role-based access controls. **Updated** to include the new veterinary chat functionality with Conversation and Message models that enable real-time communication between pet owners and veterinarians.

## Project Structure
The database is defined with Prisma and PostgreSQL. The core schema lives in the Prisma configuration file, migrations capture schema evolution, and API routes demonstrate how the models are used at runtime.

```mermaid
graph TB
A["Prisma Schema<br/>schema.prisma"] --> B["PostgreSQL DB"]
C["DB Client<br/>lib/db.ts"] --> B
D["API Routes<br/>app/api/*"] --> C
E["Migrations<br/>prisma/migrations/*"] --> B
F["Chat System<br/>Conversation & Message Models"] --> B
```

**Diagram sources**
- [schema.prisma:1-7](file://prisma/schema.prisma#L1-L7)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [migration.sql (init):1-409](file://prisma/migrations/20260825091722_init/migration.sql#L1-L409)
- [migration.sql (add_chat_with_vet):1-59](file://prisma/migrations/20260903165239_add_chat_with_vet/migration.sql#L1-L59)

**Section sources**
- [schema.prisma:1-350](file://prisma/schema.prisma#L1-L350)
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [migration.sql (init):1-409](file://prisma/migrations/20260825091722_init/migration.sql#L1-L409)

## Core Components
This section summarizes the primary entities and their roles in the ecosystem.

- User: Central identity and authorization entity with a multi-role enum supporting pet owners, veterinarians, clinic administrators, and platform admins. Includes optional session linkage and clinic association for admin scope.
- Pet: Profile and health-related records tied to an owner.
- Veterinarian: Practitioner profile linked to a User, with verification state and license number.
- Clinic: Physical location or organization hosting appointments and medical records.
- VetClinicAssociation: Many-to-many mapping between Veterinarian and Clinic with status tracking.
- MedicalRecord and MedicalRecordVersion: Header and versioned content for auditable medical histories.
- Appointment: Time-bound scheduling linking Pet, Owner, Veterinarian, and Clinic with status transitions and optional chat conversation linkage.
- Prescription, Vaccination, Medication, Allergy, HealthCondition, HealthMetric: Pet health detail entities.
- Document: References to files stored in external object storage with metadata.
- Notification, Reminder: User-facing alerts and scheduled tasks.
- AIConversation and AIMessage: Chat history associated with users and pets.
- **Conversation**: New entity enabling direct communication between pet owners and veterinarians, optionally linked to appointments.
- **Message**: Individual chat messages within conversations with sender tracking and read status.
- AuditLog: Immutable log of significant actions for compliance and traceability.
- Session: Secure token-based sessions with expiration and indexes for performance.

**Section sources**
- [schema.prisma:9-350](file://prisma/schema.prisma#L9-L350)
- [02-database-design.md:45-165](file://docs/03-architecture/02-database-design.md#L45-L165)

## Architecture Overview
The system uses a relational data model managed by Prisma over PostgreSQL. API routes enforce authentication and authorization before issuing Prisma queries that leverage foreign keys, unique constraints, and indexes for integrity and performance. **Updated** to include the new chat architecture that enables real-time communication between pet owners and veterinarians through dedicated conversation and message entities.

```mermaid
erDiagram
USER ||--o{ PET : "owns"
USER ||--o{ APPOINTMENT : "books"
VETERINARIAN ||--o{ APPOINTMENT : "performs"
CLINIC ||--o{ APPOINTMENT : "hosts"
VETERINARIAN ||--o{ VET_CLINIC_ASSOCIATION : "associated_with"
CLINIC ||--o{ VET_CLINIC_ASSOCIATION : "associates"
PET ||--o{ MEDICAL_RECORD : "has"
MEDICAL_RECORD ||--o{ MEDICAL_RECORD_VERSION : "has_versions"
MEDICAL_RECORD ||--o{ PRESCRIPTION : "contains"
VETERINARIAN ||--o{ MEDICAL_RECORD : "authors"
CLINIC ||--o{ MEDICAL_RECORD : "locates"
PET ||--o{ VACCINATION : "has"
PET ||--o{ MEDICATION : "has"
PET ||--o{ ALLERGY : "has"
PET ||--o{ HEALTH_CONDITION : "has"
PET ||--o{ HEALTH_METRIC : "tracks"
PET ||--o{ DOCUMENT : "stores"
USER ||--o{ NOTIFICATION : "receives"
USER ||--o{ REMINDER : "owns"
USER ||--o{ AI_CONVERSATION : "has"
AI_CONVERSATION ||--o{ AI_MESSAGE : "contains"
USER ||--o{ AUDIT_LOG : "triggers"
USER ||--o{ SESSION : "has"
APPOINTMENT ||--o| CONVERSATION : "may_have"
CONVERSATION ||--o{ MESSAGE : "contains"
USER ||--o{ CONVERSATION : "participates_as_owner"
VETERINARIAN ||--o{ CONVERSATION : "participates_as_vet"
USER ||--o{ MESSAGE : "sends"
```

**Diagram sources**
- [schema.prisma:30-350](file://prisma/schema.prisma#L30-L350)
- [02-database-design.md:9-41](file://docs/03-architecture/02-database-design.md#L9-L41)

## Detailed Component Analysis

### Multi-Role User System and Permissions
- Roles: PET_OWNER, VETERINARIAN, CLINIC_ADMIN, PLATFORM_ADMIN.
- Authorization patterns:
  - Pet owners can manage their own pets and book appointments for them.
  - Veterinarians view and update medical records for patients they are assigned to via appointments or clinic associations.
  - Clinic admins scope data to their clinic via a user-level clinicId reference.
- **Updated** Chat permissions: Both pet owners and veterinarians can participate in conversations based on their relationship to appointments or direct conversation assignments.

```mermaid
flowchart TD
Start(["Request"]) --> Auth["Authenticate user"]
Auth --> Role{"User Role?"}
Role --> |PET_OWNER| OwnerOps["Filter by ownerId / pet ownership<br/>Access owner conversations"]
Role --> |VETERINARIAN| VetOps["Find vet profile by userId<br/>Filter by vetId<br/>Access vet conversations"]
Role --> |CLINIC_ADMIN| AdminOps["Filter by user.clinicId"]
Role --> |PLATFORM_ADMIN| PlatformOps["Full access as needed"]
OwnerOps --> End(["Execute Prisma Query"])
VetOps --> End
AdminOps --> End
PlatformOps --> End
```

**Section sources**
- [schema.prisma:9-53](file://prisma/schema.prisma#L9-L53)
- [route.ts (appointments):13-52](file://app/api/appointments/route.ts#L13-L52)

### Entity Relationships and Constraints
- Primary Keys: All entities use UUIDs as primary keys.
- Foreign Keys: Enforced via Prisma relations and migration SQL; cascade behaviors vary per relationship to preserve referential integrity.
- Unique Constraints: Email uniqueness on User, licenseNumber on Veterinarian, composite unique on VetClinicAssociation(vetId, clinicId), tokenHash on Session, appointmentId uniqueness on Conversation.
- Indexes: Strategic indexes on frequently queried columns such as appointment vetId+dateTime, ownerId, petId; medical record versions indexed by recordId and isCurrent; audit logs indexed by userId, entity+entityId, timestamp; documents indexed by petId; sessions indexed by userId and expiresAt; **new indexes for conversations and messages optimized for chat performance**.

```mermaid
classDiagram
class User {
+String id
+String email
+String? passwordHash
+UserRole role
+String firstName
+String lastName
+String? phone
+DateTime createdAt
+DateTime updatedAt
+String? clinicId
}
class Pet {
+String id
+String ownerId
+String name
+String species
+String? breed
+String? gender
+DateTime? dateOfBirth
+Decimal? weight
+DateTime createdAt
+DateTime updatedAt
}
class Veterinarian {
+String id
+String userId
+String? specialization
+String licenseNumber
+Boolean isVerified
+DateTime? verifiedAt
+String? verifiedById
}
class Clinic {
+String id
+String name
+String address
+String? phone
+Boolean isVerified
+DateTime createdAt
+DateTime updatedAt
}
class Appointment {
+String id
+String petId
+String ownerId
+String vetId
+String clinicId
+DateTime dateTime
+String reason
+AppointmentStatus status
+DateTime createdAt
+Conversation? conversation
}
class Conversation {
+String id
+String? appointmentId
+String? petId
+String? ownerId
+String? veterinarianId
+DateTime createdAt
+DateTime updatedAt
}
class Message {
+String id
+String conversationId
+String? senderId
+String content
+DateTime createdAt
+DateTime updatedAt
+DateTime? readAt
}
class MedicalRecord {
+String id
+String petId
+String? vetId
+String? clinicId
+DateTime createdAt
}
class MedicalRecordVersion {
+String id
+String recordId
+String editorId
+String symptoms
+String diagnosis
+String treatmentPlan
+String? notes
+Boolean isCurrent
+DateTime createdAt
}
class Session {
+String id
+String tokenHash
+String userId
+DateTime expiresAt
+DateTime createdAt
+DateTime updatedAt
}
User "1" -- "many" Pet : "ownerId"
User "1" -- "many" Appointment : "ownerId"
Veterinarian "1" -- "many" Appointment : "vetId"
Clinic "1" -- "many" Appointment : "clinicId"
Pet "1" -- "many" MedicalRecord : "petId"
MedicalRecord "1" -- "many" MedicalRecordVersion : "recordId"
User "1" -- "many" Session : "userId"
Appointment "1" -- "0..1" Conversation : "appointmentId"
Conversation "1" -- "many" Message : "conversationId"
User "1" -- "many" Conversation : "ownerId"
Veterinarian "1" -- "many" Conversation : "veterinarianId"
User "1" -- "many" Message : "senderId"
```

**Diagram sources**
- [schema.prisma:30-350](file://prisma/schema.prisma#L30-L350)
- [migration.sql (init):11-409](file://prisma/migrations/20260825091722_init/migration.sql#L11-L409)
- [migration.sql (add_chat_with_vet):1-59](file://prisma/migrations/20260903165239_add_chat_with_vet/migration.sql#L1-L59)

**Section sources**
- [schema.prisma:30-350](file://prisma/schema.prisma#L30-L350)
- [migration.sql (init):278-324](file://prisma/migrations/20260825091722_init/migration.sql#L278-L324)

### Data Lifecycle Management

#### Medical Record Versioning
- MedicalRecord acts as a header; actual content resides in MedicalRecordVersion rows.
- Each edit creates a new version row; isCurrent indicates the active version.
- Compound index on (recordId, isCurrent) optimizes fetching the current version efficiently.

```mermaid
sequenceDiagram
participant Vet as "Veterinarian"
participant API as "Medical Records API"
participant DB as "PostgreSQL"
Vet->>API : Create/Edit Medical Record
API->>DB : Insert MedicalRecordVersion (isCurrent=true)
DB-->>API : Success
API-->>Vet : New version created
Note over Vet,DB : Subsequent edits append new versions<br/>and mark previous as not current
```

**Diagram sources**
- [schema.prisma:133-162](file://prisma/schema.prisma#L133-L162)
- [migration.sql (init):93-116](file://prisma/migrations/20260825091722_init/migration.sql#L93-L116)

**Section sources**
- [schema.prisma:133-162](file://prisma/schema.prisma#L133-L162)
- [02-database-design.md:106-128](file://docs/03-architecture/02-database-design.md#L106-L128)

#### Appointment Status Transitions
- Status enum includes REQUESTED, CONFIRMED, CANCELLED, COMPLETED, NO_SHOW.
- Creation enforces pet ownership and prevents double booking within transactions.
- Queries filter by role and scope (owner, vet, clinic).
- **Updated** Appointments can now be linked to conversations when status is CONFIRMED or COMPLETED.

```mermaid
flowchart TD
Start(["Create Appointment"]) --> Validate["Validate inputs<br/>petId, vetId, clinicId, dateTime, reason"]
Validate --> Ownership{"Pet owned by requester?"}
Ownership --> |No| Error403["Return 403 Forbidden"]
Ownership --> |Yes| CheckConflict["Check vet availability<br/>for requested time slot"]
CheckConflict --> |Conflict| Error409["Return 409 Conflict"]
CheckConflict --> |OK| CreateAppt["Insert Appointment<br/>status=REQUESTED"]
CreateAppt --> Done(["Success"])
Error403 --> Done
Error409 --> Done
```

**Diagram sources**
- [route.ts (appointments):70-129](file://app/api/appointments/route.ts#L70-L129)
- [schema.prisma:164-182](file://prisma/schema.prisma#L164-L182)

**Section sources**
- [route.ts (appointments):70-129](file://app/api/appointments/route.ts#L70-L129)
- [schema.prisma:22-28](file://prisma/schema.prisma#L22-L28)

#### Veterinary Chat System Lifecycle
- **New Feature**: Conversations are created automatically when accessing appointment chat for CONFIRMED or COMPLETED appointments.
- Messages support bidirectional communication between pet owners and veterinarians.
- Read status tracking ensures proper notification and unread message counting.
- Authorization checks ensure only participants can access conversation data.

```mermaid
sequenceDiagram
participant Owner as "Pet Owner"
participant Vet as "Veterinarian"
participant API as "Chat API"
participant DB as "PostgreSQL"
Owner->>API : GET /api/appointments/{id}/conversation
API->>DB : Check appointment status & create conversation if needed
DB-->>API : Return conversation
API-->>Owner : Conversation data
Owner->>API : POST /api/conversations/{id}/messages
API->>DB : Create message with senderId
DB-->>API : Success + updated conversation
API-->>Owner : Message confirmation
Vet->>API : GET /api/conversations/{id}/messages
API->>DB : Fetch messages with pagination
DB-->>API : Latest 50 messages
API-->>Vet : Message history
```

**Diagram sources**
- [route.ts (appointment conversation):1-65](file://app/api/appointments/[appointmentId]/conversation/route.ts#L1-L65)
- [route.ts (messages):1-104](file://app/api/conversations/[conversationId]/messages/route.ts#L1-L104)
- [route.ts (mark read):1-50](file://app/api/conversations/[conversationId]/read/route.ts#L1-L50)

**Section sources**
- [route.ts (appointment conversation):1-65](file://app/api/appointments/[appointmentId]/conversation/route.ts#L1-L65)
- [route.ts (messages):1-104](file://app/api/conversations/[conversationId]/messages/route.ts#L1-L104)
- [route.ts (mark read):1-50](file://app/api/conversations/[conversationId]/read/route.ts#L1-L50)

#### User Session Handling
- Sessions store hashed tokens with expiration timestamps.
- Indexes on userId and expiresAt optimize lookup and cleanup.
- Registration flow creates a session and sets a cookie.

```mermaid
sequenceDiagram
participant Client as "Client"
participant Auth as "Auth API"
participant DB as "PostgreSQL"
Client->>Auth : POST /api/auth/register
Auth->>DB : Create User
Auth->>DB : Create Session (tokenHash, expiresAt)
DB-->>Auth : Success
Auth-->>Client : Set session cookie
```

**Diagram sources**
- [route.ts (auth/register):41-57](file://app/api/auth/register/route.ts#L41-L57)
- [schema.prisma:55-66](file://prisma/schema.prisma#L55-L66)
- [migration.sql (init):26-35](file://prisma/migrations/20260825091722_init/migration.sql#L26-L35)

**Section sources**
- [route.ts (auth/register):41-57](file://app/api/auth/register/route.ts#L41-L57)
- [schema.prisma:55-66](file://prisma/schema.prisma#L55-L66)

### Data Access Patterns Using Prisma ORM
- Authentication and authorization middleware ensures only authorized users access endpoints.
- Role-based filtering:
  - Pet owners: queries scoped by ownerId.
  - Veterinarians: queries scoped by vetId after resolving vet profile from userId.
  - Clinic admins: queries scoped by user.clinicId.
- Include relations to fetch related entities efficiently in single queries.
- **Updated** Chat-specific patterns include conversation participation checks and message pagination.

```mermaid
sequenceDiagram
participant Client as "Client"
participant API as "Pets API"
participant DB as "PostgreSQL"
Client->>API : GET /api/pets
API->>API : requireAuth()
API->>DB : prisma.pet.findMany({ where : { ownerId : user.id } })
DB-->>API : List of pets
API-->>Client : JSON response
```

**Diagram sources**
- [route.ts (pets):6-27](file://app/api/pets/route.ts#L6-L27)
- [schema.prisma:68-88](file://prisma/schema.prisma#L68-L88)

**Section sources**
- [route.ts (pets):6-27](file://app/api/pets/route.ts#L6-L27)
- [route.ts (appointments):7-52](file://app/api/appointments/route.ts#L7-L52)

### Caching Strategies for Frequently Accessed Pet Health Records
- Recommended approaches:
  - In-memory cache (e.g., Redis) keyed by petId for recent medical summaries and current versions.
  - Cache invalidation triggers on write operations to MedicalRecordVersion or related entities.
  - TTL-based expiration aligned with expected update frequency.
  - Read-through pattern: check cache first, fallback to DB, then populate cache.
- **Updated** Chat caching considerations:
  - Cache conversation lists with unread message counts for quick dashboard loading.
  - Implement message pagination caching to reduce database load during chat browsing.
  - Consider WebSocket integration for real-time message updates instead of polling.

[No sources needed since this section provides general guidance]

### Query Optimization Techniques
- Leverage existing indexes:
  - Appointments: vetId+dateTime, ownerId, petId.
  - MedicalRecordVersion: recordId+isCurrent.
  - Documents: petId.
  - AuditLog: userId, entity+entityId, timestamp.
  - Sessions: userId, expiresAt.
  - **New**: Conversations: ownerId, veterinarianId, petId; Messages: conversationId+createdAt.
- Use selective includes to avoid N+1 queries.
- Apply pagination and filtering on large result sets.
- Batch writes where possible to reduce transaction overhead.
- **Updated** Chat-specific optimizations include limiting message retrieval to latest 50 messages and using efficient unread count calculations.

**Section sources**
- [migration.sql (init):278-324](file://prisma/migrations/20260825091722_init/migration.sql#L278-L324)
- [schema.prisma:145-162](file://prisma/schema.prisma#L145-L162)
- [migration.sql (add_chat_with_vet):27-40](file://prisma/migrations/20260903165239_add_chat_with_vet/migration.sql#L27-L40)

### Data Security Measures
- Password Hashing:
  - Registration hashes passwords before storing in User.passwordHash.
  - Optional passwordHash supports OAuth-based accounts without local passwords.
- Encrypted Connections:
  - Production uses a connection pool configured with DATABASE_URL; ensure TLS is enabled at the database level and via environment configuration.
- Role-Based Access Controls:
  - API routes enforce role-based scoping for data visibility and mutations.
  - Clinic admin scope enforced via user.clinicId.
  - **Updated** Chat access control ensures only conversation participants can view or send messages.
- Session Security:
  - Sessions store hashed tokens with expiration; cookies set securely.

**Section sources**
- [route.ts (auth/register):41-57](file://app/api/auth/register/route.ts#L41-L57)
- [db.ts:10-29](file://lib/db.ts#L10-L29)
- [schema.prisma:30-53](file://prisma/schema.prisma#L30-L53)
- [migration.sql (make_password_hash_optional):1-3](file://prisma/migrations/20260827095530_make_password_hash_optional/migration.sql#L1-L3)
- [migration.sql (add_clinic_admin_relation):1-6](file://prisma/migrations/20260827123510_add_clinic_admin_relation/migration.sql#L1-L6)

## Dependency Analysis
The application depends on Prisma client, PostgreSQL, and environment variables for database connectivity. API routes depend on authentication utilities and Prisma models generated from the schema.

```mermaid
graph LR
A["API Routes"] --> B["Prisma Client"]
B --> C["PostgreSQL"]
A --> D["Auth Utilities"]
D --> B
A --> E["Chat APIs"]
E --> F["Conversation & Message Models"]
F --> B
```

**Diagram sources**
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [schema.prisma:1-7](file://prisma/schema.prisma#L1-L7)

**Section sources**
- [db.ts:1-33](file://lib/db.ts#L1-L33)
- [schema.prisma:1-7](file://prisma/schema.prisma#L1-L7)

## Performance Considerations
- Index usage: Ensure queries align with defined indexes to minimize full table scans.
- Transactional integrity: Use transactions for multi-step operations like appointment creation to prevent race conditions.
- Pagination: Implement cursor or offset-based pagination for large datasets (appointments, medical records).
- Connection pooling: Reuse pooled connections in production to reduce overhead.
- Selective fields: Fetch only necessary fields to reduce payload size.
- **Updated** Chat performance considerations include:
  - Limiting message retrieval to reasonable limits (50 messages) to prevent large payloads.
  - Efficient unread message counting using database-level aggregations.
  - Proper indexing on conversation and message tables for fast lookups.
  - Consider implementing WebSocket for real-time updates instead of polling.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Duplicate email registration: Handled by unique constraint on User.email; return conflict error.
- Invalid role provided: Validation rejects non-existent roles; return bad request.
- Double booking conflicts: Detected via transactional check; return conflict error.
- Unauthorized access: Middleware returns unauthorized when session missing or invalid.
- Missing required fields: Input validation returns bad request with descriptive messages.
- **Updated** Chat-specific issues:
  - Conversation not found: Verify appointment exists and has valid status (CONFIRMED/COMPLETED).
  - Message sending failures: Check content validation (non-empty, under 2000 characters).
  - Permission denied: Ensure user is participant in the conversation (owner or vet).
  - Read status not updating: Verify proper authorization and conversation membership.

**Section sources**
- [route.ts (auth/register):10-38](file://app/api/auth/register/route.ts#L10-L38)
- [route.ts (appointments):75-110](file://app/api/appointments/route.ts#L75-L110)
- [route.ts (pets):36-41](file://app/api/pets/route.ts#L36-L41)
- [route.ts (appointment conversation):22-38](file://app/api/appointments/[appointmentId]/conversation/route.ts#L22-L38)
- [route.ts (messages):57-62](file://app/api/conversations/[conversationId]/messages/route.ts#L57-L62)

## Conclusion
The PETIVA database schema provides a robust, secure, and scalable foundation for managing pet healthcare data. With clear entity relationships, strong constraints, and strategic indexing, it supports complex workflows like medical record versioning and appointment scheduling. **Updated** to include comprehensive veterinary chat functionality that enables real-time communication between pet owners and veterinarians through dedicated conversation and message entities. Role-based access control and secure session handling ensure data privacy and integrity. Following the recommended caching and query optimization practices will further enhance performance and reliability.

## Appendices

### Field Definitions and Types Summary
- User: id (UUID PK), email (unique), passwordHash (optional), role (enum), firstName, lastName, phone (optional), timestamps, clinicId (optional FK to Clinic).
- Pet: id (UUID PK), ownerId (FK to User), name, species, breed (optional), gender (optional), dateOfBirth (optional), weight (optional Decimal), timestamps.
- Veterinarian: id (UUID PK), userId (unique FK to User), specialization (optional), licenseNumber (unique), isVerified (default false), verifiedAt (optional), verifiedById (optional FK to User), timestamps.
- Clinic: id (UUID PK), name, address, phone (optional), isVerified (default false), timestamps.
- VetClinicAssociation: id (UUID PK), vetId (FK), clinicId (FK), status (enum default PENDING), createdAt; unique on (vetId, clinicId).
- MedicalRecord: id (UUID PK), petId (FK), vetId (optional FK), clinicId (optional FK), createdAt; index on petId.
- MedicalRecordVersion: id (UUID PK), recordId (FK), editorId (FK), symptoms, diagnosis, treatmentPlan, notes (optional), isCurrent (default true), createdAt; compound index on (recordId, isCurrent).
- Appointment: id (UUID PK), petId (FK), ownerId (FK), vetId (FK), clinicId (FK), dateTime, reason, status (enum default REQUESTED), createdAt; indexes on vetId+dateTime, ownerId, petId.
- **Conversation**: id (UUID PK), appointmentId (optional unique FK to Appointment), petId (optional FK to Pet), ownerId (optional FK to User), veterinarianId (optional FK to Veterinarian), createdAt, updatedAt; indexes on ownerId, veterinarianId, petId.
- **Message**: id (UUID PK), conversationId (FK to Conversation), senderId (optional FK to User), content (string), createdAt, updatedAt, readAt (optional); index on conversationId+createdAt.
- Prescription: id (UUID PK), recordId (FK), medicationName, dosage, frequency, startDate, endDate (optional), instructions (optional).
- Vaccination: id (UUID PK), petId (FK), vaccineName, administeredDate, dueDate (optional), vetName (optional).
- Medication: id (UUID PK), petId (FK), medicationName, dosage, frequency, startDate, endDate (optional), status (default ACTIVE).
- Allergy: id (UUID PK), petId (FK), allergen, severity (optional), createdAt.
- HealthCondition: id (UUID PK), petId (FK), name, onsetDate (optional), status (default ACTIVE).
- HealthMetric: id (UUID PK), petId (FK), metricType, value (Decimal), unit, takenAt (default now).
- Document: id (UUID PK), petId (FK), uploaderId (FK), ossKey, fileName, fileType, createdAt; index on petId.
- Notification: id (UUID PK), userId (FK), title, message, isRead (default false), createdAt.
- Reminder: id (UUID PK), userId (FK), title, dueAt, isCleared (default false), createdAt.
- AIConversation: id (UUID PK), userId (FK), petId, createdAt.
- AIMessage: id (UUID PK), conversationId (FK), role, content, createdAt.
- AuditLog: id (UUID PK), userId (optional FK), action, entity, entityId, payload (JSON string), timestamp; indexes on userId, entity+entityId, timestamp.
- Session: id (UUID PK), tokenHash (unique), userId (FK), expiresAt, createdAt, updatedAt; indexes on userId, expiresAt.

**Section sources**
- [schema.prisma:30-350](file://prisma/schema.prisma#L30-L350)
- [migration.sql (init):11-409](file://prisma/migrations/20260825091722_init/migration.sql#L11-L409)
- [migration.sql (add_chat_with_vet):1-59](file://prisma/migrations/20260903165239_add_chat_with_vet/migration.sql#L1-L59)