# Pet Owner Dashboard

<cite>
**Referenced Files in This Document**
- [app/dashboard/page.tsx](file://app/dashboard/page.tsx)
- [app/api/appointments/[appointmentId]/slots/route.ts](file://app/api/appointments/[appointmentId]/slots/route.ts)
- [app/api/appointments/[appointmentId]/route.ts](file://app/api/appointments/[appointmentId]/route.ts)
- [app/components/ChatWidget.tsx](file://app/components/ChatWidget.tsx)
- [app/components/VetChatInterface.tsx](file://app/components/VetChatInterface.tsx)
- [app/api/pets/route.ts](file://app/api/pets/route.ts)
- [app/api/appointments/route.ts](file://app/api/appointments/route.ts)
- [app/api/profile/route.ts](file://app/api/profile/route.ts)
- [app/api/ai/chat/route.ts](file://app/api/ai/chat/route.ts)
- [app/api/pets/[petId]/timeline/route.ts](file://app/api/pets/[petId]/timeline/route.ts)
- [app/api/appointments/[appointmentId]/conversation/route.ts](file://app/api/appointments/[appointmentId]/conversation/route.ts)
- [app/api/conversations/route.ts](file://app/api/conversations/route.ts)
- [app/api/conversations/[conversationId]/messages/route.ts](file://app/api/conversations/[conversationId]/messages/route.ts)
- [app/api/conversations/[conversationId]/read/route.ts](file://app/api/conversations/[conversationId]/read/route.ts)
- [app/api/reminders/route.ts](file://app/api/reminders/route.ts)
- [app/api/reminders/[reminderId]/route.ts](file://app/api/reminders/[reminderId]/route.ts)
- [lib/auth.ts](file://lib/auth.ts)
- [prisma/schema.prisma](file://prisma/schema.prisma)
- [app/layout.tsx](file://app/layout.tsx)
- [app/globals.css](file://app/globals.css)
</cite>

## Update Summary
**Changes Made**
- Added comprehensive health reminders section with due date tracking and clearance functionality
- Implemented vaccination and medication forms with automatic reminder generation
- Enhanced pet selection improvements with better visual indicators and status management
- Updated timeline display with health activities including vaccinations, medications, and appointments
- Integrated real-time reminder refresh system that updates after vaccination and medication additions
- Added due date calculation helpers for consistent badge styling across all health tracking features

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

## Introduction
This document explains the Pet Owner Dashboard in PETIVA, focusing on the main dashboard interface, pet portfolio management, appointment booking and rescheduling workflow, integrated AI health assistant chat, profile management, responsive design patterns, data fetching strategies, state management, and error handling. It is designed for both technical and non-technical readers to understand how the dashboard works end-to-end.

**Updated** The dashboard now features an enhanced health reminders system with comprehensive vaccination and medication tracking, providing users with proactive health management capabilities through automated reminder generation and due date monitoring.

## Project Structure
The dashboard is implemented as a Next.js client component with server-side API routes for data operations. The root layout sets global styles and metadata. Tailwind CSS provides responsive utilities across devices.

```mermaid
graph TB
subgraph "Client"
D["Dashboard Page<br/>app/dashboard/page.tsx"]
W["Chat Widget<br/>app/components/ChatWidget.tsx"]
VC["Vet Chat Interface<br/>app/components/VetChatInterface.tsx"]
end
subgraph "API Routes"
PETS["Pets API<br/>app/api/pets/route.ts"]
APPTS["Appointments API<br/>app/api/appointments/route.ts"]
APPT_UPDATE["Appointment Update API<br/>app/api/appointments/[appointmentId]/route.ts"]
APPT_SLOTS["Appointment Slots API<br/>app/api/appointments/[appointmentId]/slots/route.ts"]
PROFILE["Profile API<br/>app/api/profile/route.ts"]
TIMELINE["Pet Timeline API<br/>app/api/pets/[petId]/timeline/route.ts"]
AICHAT["AI Chat API<br/>app/api/ai/chat/route.ts"]
CONV["Conversation API<br/>app/api/conversations/route.ts"]
APPT_CONV["Appointment Conversation API<br/>app/api/appointments/[appointmentId]/conversation/route.ts"]
MSG_API["Messages API<br/>app/api/conversations/[conversationId]/messages/route.ts"]
READ_API["Read Status API<br/>app/api/conversations/[conversationId]/read/route.ts"]
REMINDERS["Reminders API<br/>app/api/reminders/route.ts"]
REMINDER_DELETE["Reminder Delete API<br/>app/api/reminders/[reminderId]/route.ts"]
end
subgraph "Auth & Data"
AUTH["Auth Utilities<br/>lib/auth.ts"]
SCHEMA["Database Schema<br/>prisma/schema.prisma"]
end
D --> PETS
D --> APPTS
D --> APPT_UPDATE
D --> APPT_SLOTS
D --> PROFILE
D --> TIMELINE
D --> AICHAT
D --> CONV
D --> APPT_CONV
D --> MSG_API
D --> READ_API
D --> REMINDERS
D --> REMINDER_DELETE
W --> AICHAT
VC --> MSG_API
VC --> READ_API
PETS --> AUTH
APPTS --> AUTH
APPT_UPDATE --> AUTH
APPT_SLOTS --> AUTH
PROFILE --> AUTH
TIMELINE --> AUTH
AICHAT --> AUTH
CONV --> AUTH
APPT_CONV --> AUTH
MSG_API --> AUTH
READ_API --> AUTH
REMINDERS --> AUTH
REMINDER_DELETE --> AUTH
PETS --> SCHEMA
APPTS --> SCHEMA
APPT_UPDATE --> SCHEMA
APPT_SLOTS --> SCHEMA
PROFILE --> SCHEMA
TIMELINE --> SCHEMA
AICHAT --> SCHEMA
CONV --> SCHEMA
APPT_CONV --> SCHEMA
MSG_API --> SCHEMA
READ_API --> SCHEMA
REMINDERS --> SCHEMA
REMINDER_DELETE --> SCHEMA
```

**Diagram sources**
- [app/dashboard/page.tsx:1-1985](file://app/dashboard/page.tsx#L1-L1985)
- [app/components/ChatWidget.tsx:1-149](file://app/components/ChatWidget.tsx#L1-L149)
- [app/components/VetChatInterface.tsx:1-222](file://app/components/VetChatInterface.tsx#L1-L222)
- [app/api/pets/route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [app/api/appointments/route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [app/api/appointments/[appointmentId]/route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [app/api/appointments/[appointmentId]/slots/route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [app/api/profile/route.ts:1-82](file://app/api/profile/route.ts#L1-L82)
- [app/api/pets/[petId]/timeline/route.ts:1-149](file://app/api/pets/[petId]/timeline/route.ts#L1-L149)
- [app/api/ai/chat/route.ts:1-120](file://app/api/ai/chat/route.ts#L1-L120)
- [app/api/appointments/[appointmentId]/conversation/route.ts:1-65](file://app/api/appointments/[appointmentId]/conversation/route.ts#L1-L65)
- [app/api/conversations/route.ts:1-90](file://app/api/conversations/route.ts#L1-L90)
- [app/api/conversations/[conversationId]/messages/route.ts:1-104](file://app/api/conversations/[conversationId]/messages/route.ts#L1-L104)
- [app/api/conversations/[conversationId]/read/route.ts:1-49](file://app/api/conversations/[conversationId]/read/route.ts#L1-L49)
- [app/api/reminders/route.ts:1-30](file://app/api/reminders/route.ts#L1-L30)
- [app/api/reminders/[reminderId]/route.ts:1-46](file://app/api/reminders/[reminderId]/route.ts#L1-L46)
- [lib/auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [prisma/schema.prisma:1-312](file://prisma/schema.prisma#L1-L312)

**Section sources**
- [app/layout.tsx:1-16](file://app/layout.tsx#L1-L16)
- [app/globals.css:1-20](file://app/globals.css#L1-L20)

## Core Components
- Dashboard page: Central UI for health overview, upcoming appointments, pet profiles, quick actions, and navigation between tabs (dashboard, pets, appointments, AI assistant, chat, profile).
- Chat widget: Floating assistant for general platform help; separate from the pet-specific AI assistant in the dashboard.
- VetChatInterface: Dedicated component for real-time conversation between pet owners and veterinarians with message polling and read status tracking.
- API routes: Secure endpoints for pets, appointments, profile updates, pet timeline aggregation, AI chat with streaming responses, comprehensive conversation management, and health reminders.
- Auth middleware: Ensures all requests are authenticated and enforces ownership checks.
- Database schema: Defines entities like User, Pet, Appointment, MedicalRecord, Vaccination, Medication, Allergy, HealthCondition, HealthMetric, AIConversation, AIMessage, Conversation, Message, Reminder.

Key responsibilities:
- Dashboard orchestrates data fetching, local state, and user interactions across multiple tabs.
- API routes enforce authentication, authorization, validation, and business rules for all features.
- Auth utilities provide session management and role-based guards.
- Schema models ensure consistent data structure and relationships including new reminder entities.

**Section sources**
- [app/dashboard/page.tsx:1-1985](file://app/dashboard/page.tsx#L1-L1985)
- [app/components/ChatWidget.tsx:1-149](file://app/components/ChatWidget.tsx#L1-L149)
- [app/components/VetChatInterface.tsx:1-222](file://app/components/VetChatInterface.tsx#L1-L222)
- [app/api/pets/route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [app/api/appointments/route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [app/api/appointments/[appointmentId]/route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [app/api/appointments/[appointmentId]/slots/route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [app/api/profile/route.ts:1-82](file://app/api/profile/route.ts#L1-L82)
- [app/api/pets/[petId]/timeline/route.ts:1-149](file://app/api/pets/[petId]/timeline/route.ts#L1-L149)
- [app/api/ai/chat/route.ts:1-120](file://app/api/ai/chat/route.ts#L1-L120)
- [app/api/appointments/[appointmentId]/conversation/route.ts:1-65](file://app/api/appointments/[appointmentId]/conversation/route.ts#L1-L65)
- [app/api/conversations/route.ts:1-90](file://app/api/conversations/route.ts#L1-L90)
- [app/api/conversations/[conversationId]/messages/route.ts:1-104](file://app/api/conversations/[conversationId]/messages/route.ts#L1-L104)
- [app/api/conversations/[conversationId]/read/route.ts:1-49](file://app/api/conversations/[conversationId]/read/route.ts#L1-L49)
- [app/api/reminders/route.ts:1-30](file://app/api/reminders/route.ts#L1-L30)
- [app/api/reminders/[reminderId]/route.ts:1-46](file://app/api/reminders/[reminderId]/route.ts#L1-L46)
- [lib/auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [prisma/schema.prisma:1-312](file://prisma/schema.prisma#L1-L312)

## Architecture Overview
The dashboard follows a client-server architecture with enhanced conversation management, slot-based appointment rescheduling, and comprehensive health reminders capabilities:
- Client: React components manage UI state and call APIs for multiple tabs including the new chat functionality, slot-based rescheduling features, and health reminders management.
- Server: Next.js API routes handle authentication, authorization, database queries, business logic, real-time conversation updates, and reminder management.
- Data: Prisma ORM interacts with PostgreSQL based on the defined schema including new reminder tables for health tracking.
- AI: Streaming NDJSON responses enable real-time status updates and results during AI processing.
- Real-time Messaging: Polling-based messaging system with automatic read status updates.

```mermaid
sequenceDiagram
participant U as "User"
participant D as "Dashboard Page"
participant VC as "VetChatInterface"
participant AC as "AI Chat API"
participant CC as "Conversation API"
participant AR as "Appointment Reschedule API"
participant AS as "Slots API"
participant RM as "Reminders API"
participant DB as "Database"
U->>D : Navigate to Dashboard
U->>D : View Health Reminders
D->>RM : GET /api/reminders
RM-->>D : Return pending reminders
U->>D : Add Vaccination/Medication
D->>RM : Refresh reminders after update
RM-->>D : Return updated reminders
U->>D : Click Reschedule Button
D->>AS : GET /api/appointments/{id}/slots?date=YYYY-MM-DD
AS->>DB : Check vet availability & working hours
AS-->>D : Return available time slots
U->>D : Select time slot from grid
D->>AR : PUT /api/appointments/{id} with RESCHEDULE action
AR->>DB : Validate appointment status & check conflicts
AR-->>D : Return updated appointment
U->>D : Open Chat for Appointment
D->>AC : Load AI Chat History
AC-->>D : Return AI Messages
U->>VC : Open Appointment Chat
VC->>CC : GET /api/appointments/{id}/conversation
CC->>DB : Check Authorization & Create Conversation
CC-->>VC : Return Conversation Context
VC->>CC : GET /api/conversations/{id}/messages
CC-->>VC : Return Messages
VC->>CC : POST /api/conversations/{id}/messages
CC->>DB : Store Message
VC->>CC : POST /api/conversations/{id}/read
CC->>DB : Mark Other Messages as Read
VC-->>U : Display Real-time Messages
```

**Diagram sources**
- [app/dashboard/page.tsx:66-132](file://app/dashboard/page.tsx#L66-L132)
- [app/dashboard/page.tsx:226-249](file://app/dashboard/page.tsx#L226-L249)
- [app/dashboard/page.tsx:474-535](file://app/dashboard/page.tsx#L474-L535)
- [app/components/VetChatInterface.tsx:56-85](file://app/components/VetChatInterface.tsx#L56-L85)
- [app/api/appointments/[appointmentId]/route.ts:17-125](file://app/api/appointments/[appointmentId]/route.ts#L17-L125)
- [app/api/appointments/[appointmentId]/slots/route.ts:15-103](file://app/api/appointments/[appointmentId]/slots/route.ts#L15-L103)
- [app/api/appointments/[appointmentId]/conversation/route.ts:10-55](file://app/api/appointments/[appointmentId]/conversation/route.ts#L10-L55)
- [app/api/conversations/[conversationId]/messages/route.ts:5-38](file://app/api/conversations/[conversationId]/messages/route.ts#L5-L38)
- [app/api/conversations/[conversationId]/read/route.ts:5-41](file://app/api/conversations/[conversationId]/read/route.ts#L5-L41)
- [app/api/reminders/route.ts:7-16](file://app/api/reminders/route.ts#L7-L16)

## Detailed Component Analysis

### Dashboard Interface
- Navigation sidebar with tabs: Dashboard, My Pets, Appointments, AI Assistant, Profile.
- Health overview panels: Counts for vaccinations, medications, allergies, last visit date derived from timeline.
- Upcoming appointment card: Shows next future appointment details with both Reschedule and Cancel options.
- Recent health activity timeline: Aggregated events from medical records, vaccinations, medications, allergies, conditions, metrics, and appointments.
- **Enhanced**: Health reminders section displaying pending tasks with due date badges and clearance functionality.
- Quick actions: Add new pet and book appointment buttons.

Data flow:
- On mount, fetch profile, pets, appointments, discovery vets, initial timeline, and reminders for the first pet.
- Selecting a pet updates selected pet, AI pet context, reloads timeline, vaccinations, and medications.
- Booking an appointment posts to API and refreshes list.
- **Updated**: Reschedule functionality uses slot-based selection with dynamic time slot grid instead of datetime picker.
- **Updated**: Health reminders automatically refresh when vaccinations or medications are added.

Error handling:
- Displays error or success banners for user feedback.
- Redirects to home if profile fetch fails (unauthenticated).

Responsive behavior:
- Uses Tailwind grid and flex layouts to adapt across screen sizes.

**Section sources**
- [app/dashboard/page.tsx:66-132](file://app/dashboard/page.tsx#L66-L132)
- [app/dashboard/page.tsx:760-1067](file://app/dashboard/page.tsx#L760-L1067)
- [app/dashboard/page.tsx:996-1026](file://app/dashboard/page.tsx#L996-L1026)

### Pet Portfolio Management
- Lists all pets with selection highlighting and improved visual indicators.
- Provides add/edit/delete operations via forms and API calls.
- Displays detailed pet profile view including health overview and timeline access.

Operations:
- Add pet: POST to /api/pets, then update local state and select newly added pet.
- Edit pet: PUT to /api/pets/{id}, update local state.
- Delete pet: DELETE to /api/pets/{id}, remove from list and reset selection if needed.

Validation and errors:
- Required fields enforced server-side; errors surfaced to UI.

**Section sources**
- [app/dashboard/page.tsx:800-831](file://app/dashboard/page.tsx#L800-L831)
- [app/dashboard/page.tsx:1070-1130](file://app/dashboard/page.tsx#L1070-L1130)
- [app/api/pets/route.ts:30-69](file://app/api/pets/route.ts#L30-L69)

### Health Tracking with Vaccinations and Medications
- **New Feature**: Comprehensive vaccination tracking with due date management and automatic reminder generation.
- **New Feature**: Medication tracking with dosage, frequency, and active/inactive status monitoring.
- **New Feature**: Due date calculation helpers providing consistent badge styling (overdue, due soon, upcoming).
- **New Feature**: Interactive forms for adding vaccinations and medications with validation.

Operations:
- Add vaccination: POST to `/api/pets/{petId}/vaccinations` with vaccine name, administered date, due date, and vet name.
- Add medication: POST to `/api/pets/{petId}/medications` with medication details, dosage, frequency, and date range.
- Automatic reminder creation when due dates are set.
- Real-time refresh of reminders and timeline after additions.

Display features:
- Visual due date badges with color coding (red for overdue, orange for due soon, green for upcoming).
- Active medication status indicators.
- Integration with health reminders system.

**Section sources**
- [app/dashboard/page.tsx:43-52](file://app/dashboard/page.tsx#L43-L52)
- [app/dashboard/page.tsx:209-225](file://app/dashboard/page.tsx#L209-L225)
- [app/dashboard/page.tsx:251-309](file://app/dashboard/page.tsx#L251-L309)
- [app/dashboard/page.tsx:1131-1208](file://app/dashboard/page.tsx#L1131-L1208)

### Health Reminders System
- **New Feature**: Centralized health reminders display showing all pending tasks with due dates.
- **New Feature**: Automatic reminder generation from vaccination due dates and medication end dates.
- **New Feature**: Clear functionality allowing users to dismiss completed reminders.
- **New Feature**: Due date calculation with contextual labels (overdue, due today, due in X days).

Features:
- Grid layout displaying reminders with title, due date, and clearance button.
- Color-coded due date badges matching the health tracking system.
- Empty state guidance encouraging users to record vaccinations or medications.
- Real-time updates when reminders are cleared or new ones are created.

Integration points:
- Automatically refreshed after vaccination and medication additions.
- Fetches from `/api/reminders` endpoint with proper authentication.
- Supports deletion via `/api/reminders/{reminderId}` endpoint.

**Section sources**
- [app/dashboard/page.tsx:114-118](file://app/dashboard/page.tsx#L114-L118)
- [app/dashboard/page.tsx:226-236](file://app/dashboard/page.tsx#L226-L236)
- [app/dashboard/page.tsx:311-321](file://app/dashboard/page.tsx#L311-L321)
- [app/dashboard/page.tsx:996-1026](file://app/dashboard/page.tsx#L996-L1026)
- [app/api/reminders/route.ts:7-16](file://app/api/reminders/route.ts#L7-L16)
- [app/api/reminders/[reminderId]/route.ts:8-32](file://app/api/reminders/[reminderId]/route.ts#L8-L32)

### Pet Timeline and Health Records
- Aggregates multiple data sources into a unified chronological timeline:
  - Medical records (current version), vaccinations, medications, allergies, health conditions, health metrics, and appointments.
- Ownership check ensures users can only access their own pets' timelines.

Complexity:
- Parallel queries using Promise.all for performance.
- Sorting by date descending to present newest events first.

**Section sources**
- [app/api/pets/[petId]/timeline/route.ts:1-149](file://app/api/pets/[petId]/timeline/route.ts#L1-L149)

### Appointment Booking and Slot-Based Rescheduling Workflow
- **Booking**: Inputs include pet, vet, clinic, date/time, reason. Validation checks required fields server-side. Authorization verifies pet ownership before booking. Conflict detection prevents double-booking within transactional scope. Result creates appointment with REQUESTED status and includes related entities.
- **Slot-Based Rescheduling**: **Updated** Comprehensive rescheduling system with dynamic time slot selection grid. Users select a date first, then choose from available time slots displayed in a grid format. System validates appointment eligibility (only REQUESTED or CONFIRMED status), checks for time conflicts, and resets status to REQUESTED for vet approval.

Cancellation:
- Updates appointment status to CANCELLED and refreshes list.

**Section sources**
- [app/dashboard/page.tsx:415-465](file://app/dashboard/page.tsx#L415-L465)
- [app/dashboard/page.tsx:474-535](file://app/dashboard/page.tsx#L474-L535)
- [app/api/appointments/route.ts:69-143](file://app/api/appointments/route.ts#L69-L143)
- [app/api/appointments/[appointmentId]/route.ts:17-125](file://app/api/appointments/[appointmentId]/route.ts#L17-L125)

### Integrated AI Health Assistant Chat
- Conversation persistence per user and pet.
- Streaming NDJSON responses for real-time status and final result.
- Tool usage for retrieving pet info, health timeline, vaccination records, finding vets, checking slots, and creating bookings.
- Explicit confirmation flow for booking to avoid unintended actions.

Flow:
- Load conversation history for selected pet.
- Send message; stream status updates while processing.
- Append assistant message to history and persist.

Error handling:
- Handles connection errors and tool failures gracefully.

**Section sources**
- [app/dashboard/page.tsx:160-179](file://app/dashboard/page.tsx#L160-L179)
- [app/dashboard/page.tsx:537-613](file://app/dashboard/page.tsx#L537-L613)
- [app/api/ai/chat/route.ts:7-66](file://app/api/ai/chat/route.ts#L7-L66)
- [app/api/ai/chat/route.ts:68-349](file://app/api/ai/chat/route.ts#L68-L349)

### Profile Management
- Fetch current profile on load.
- Update personal information (first name, last name, phone).
- Enforce required fields and return updated profile.

**Section sources**
- [app/dashboard/page.tsx:134-153](file://app/dashboard/page.tsx#L134-L153)
- [app/dashboard/page.tsx:323-345](file://app/dashboard/page.tsx#L323-L345)
- [app/api/profile/route.ts:5-82](file://app/api/profile/route.ts#L5-L82)

### Floating Chat Widget (Platform Help)
- Separate from pet-specific AI assistant; used for general platform questions.
- Sends chat history to landing chat endpoint and renders markdown-formatted responses.

**Section sources**
- [app/components/ChatWidget.tsx:1-149](file://app/components/ChatWidget.tsx#L1-L149)

## Dependency Analysis
- Authentication dependency: All API routes use requireAuth to validate sessions and protect resources.
- Data dependencies: Dashboard depends on multiple API routes; timeline aggregates several models.
- AI integration: AI chat route depends on AI provider and tool execution, interacting with database for conversations and messages.
- **Updated**: Rescheduling dependencies include new slots API for availability calculation, appointment validation, conflict detection, and status management.
- **Updated**: Conversation management dependencies include message polling, read status tracking, and real-time updates.
- **Updated**: Health reminders dependencies include reminder CRUD operations with proper ownership validation.

```mermaid
graph LR
D["Dashboard Page"] --> P["Pets API"]
D --> A["Appointments API"]
D --> AR["Appointment Reschedule API"]
D --> AS["Slots API"]
D --> R["Profile API"]
D --> T["Timeline API"]
D --> C["AI Chat API"]
D --> CH["Chat Tab"]
D --> RM["Reminders API"]
CH --> VCI["VetChatInterface"]
VCI --> CA["Conversation API"]
CA --> M["Messages API"]
CA --> RD["Read Status API"]
RM --> RMD["Reminder Delete API"]
P --> AUTH["Auth"]
A --> AUTH
AR --> AUTH
AS --> AUTH
R --> AUTH
T --> AUTH
C --> AUTH
CH --> AUTH
VCI --> AUTH
M --> AUTH
RD --> AUTH
RM --> AUTH
RMD --> AUTH
P --> DB["Prisma + Schema"]
A --> DB
AR --> DB
AS --> DB
R --> DB
T --> DB
C --> DB
CA --> DB
M --> DB
RD --> DB
RM --> DB
RMD --> DB
```

**Diagram sources**
- [app/dashboard/page.tsx:1-1985](file://app/dashboard/page.tsx#L1-L1985)
- [app/components/VetChatInterface.tsx:1-222](file://app/components/VetChatInterface.tsx#L1-L222)
- [app/api/pets/route.ts:1-69](file://app/api/pets/route.ts#L1-L69)
- [app/api/appointments/route.ts:1-143](file://app/api/appointments/route.ts#L1-L143)
- [app/api/appointments/[appointmentId]/route.ts:1-242](file://app/api/appointments/[appointmentId]/route.ts#L1-L242)
- [app/api/appointments/[appointmentId]/slots/route.ts:1-117](file://app/api/appointments/[appointmentId]/slots/route.ts#L1-L117)
- [app/api/profile/route.ts:1-82](file://app/api/profile/route.ts#L1-L82)
- [app/api/pets/[petId]/timeline/route.ts:1-149](file://app/api/pets/[petId]/timeline/route.ts#L1-L149)
- [app/api/ai/chat/route.ts:1-120](file://app/api/ai/chat/route.ts#L1-L120)
- [app/api/appointments/[appointmentId]/conversation/route.ts:1-65](file://app/api/appointments/[appointmentId]/conversation/route.ts#L1-L65)
- [app/api/conversations/route.ts:1-90](file://app/api/conversations/route.ts#L1-L90)
- [app/api/conversations/[conversationId]/messages/route.ts:1-104](file://app/api/conversations/[conversationId]/messages/route.ts#L1-L104)
- [app/api/conversations/[conversationId]/read/route.ts:1-49](file://app/api/conversations/[conversationId]/read/route.ts#L1-L49)
- [app/api/reminders/route.ts:1-30](file://app/api/reminders/route.ts#L1-L30)
- [app/api/reminders/[reminderId]/route.ts:1-46](file://app/api/reminders/[reminderId]/route.ts#L1-L46)
- [lib/auth.ts:1-125](file://lib/auth.ts#L1-L125)
- [prisma/schema.prisma:1-312](file://prisma/schema.prisma#L1-L312)

**Section sources**
- [lib/auth.ts:99-125](file://lib/auth.ts#L99-L125)
- [prisma/schema.prisma:30-312](file://prisma/schema.prisma#L30-L312)

## Performance Considerations
- Parallel data loading: Timeline API uses Promise.all to fetch multiple entities concurrently, reducing latency.
- Streaming AI responses: NDJSON streaming provides immediate feedback and reduces perceived wait time.
- Local state updates: Dashboard updates UI optimistically where appropriate and refetches lists after mutations to keep data consistent.
- Pagination/context limits: AI chat loads recent messages (up to 20) to prevent context bloat and maintain performance.
- **Updated**: Efficient slot-based rescheduling with server-side availability calculation and immediate UI updates.
- **Updated**: Optimized modal rendering with conditional loading to minimize unnecessary re-renders.
- **Updated**: Date validation performed client-side with timezone-aware minimum date setting.
- **Updated**: Dynamic slot loading triggered only on date changes to reduce server round trips.
- **Updated**: Message polling with 3-second intervals to balance real-time updates with server load.
- **Updated**: Message read status optimization to reduce unnecessary database updates.
- **Updated**: Conversation listing with unread count optimization using database-level counting.
- **Updated**: Health reminders refresh only when necessary (after vaccination/medication additions) to minimize API calls.
- **Updated**: Due date calculations performed client-side using efficient mathematical operations.

## Troubleshooting Guide
Common issues and resolutions:
- Unauthenticated access: If profile fetch fails, dashboard redirects to home. Ensure session cookie is valid and not expired.
- Forbidden access: Timeline and AI chat enforce pet ownership; verify that the logged-in user owns the selected pet.
- Double-booking conflicts: Appointment creation checks for existing REQUESTED or CONFIRMED appointments at the same time slot; choose a different time or vet.
- Network errors: Handle connection errors in UI and retry operations; check backend logs for internal server errors.
- **Updated**: Rescheduling errors: Verify appointment status is REQUESTED or CONFIRMED and user has proper authorization.
- **Updated**: Slot availability issues: Check that selected date is in the future and within clinic working hours (9 AM - 5 PM Karachi time).
- **Updated**: Timezone problems: Ensure all date calculations use Asia/Karachi timezone (UTC+5) consistently.
- **Updated**: Modal display problems: Check for proper state management and event handler bindings.
- **Updated**: Chat access issues: Verify appointment status is CONFIRMED or COMPLETED and user has proper authorization.
- **Updated**: Message delivery problems: Check network connectivity and server response times; implement retry logic for failed message sends.
- **Updated**: Reminder clearance issues: Verify reminder ownership and proper authentication before deletion attempts.
- **Updated**: Vaccination/medication form validation: Ensure all required fields are properly filled and formatted before submission.

Error handling patterns:
- Consistent error objects returned by APIs with code and message.
- UI displays error banners and disables actions during loading states.
- **Updated**: Graceful degradation for slot-based rescheduling features when underlying services are unavailable.
- **Updated**: Comprehensive error handling for modal dialogs with user-friendly error messages.
- **Updated**: Fallback UI states for slot loading failures and network interruptions.
- **Updated**: Proper error handling for reminder operations with clear user feedback.

**Section sources**
- [app/dashboard/page.tsx:66-132](file://app/dashboard/page.tsx#L66-L132)
- [app/dashboard/page.tsx:474-535](file://app/dashboard/page.tsx#L474-L535)
- [app/api/pets/[petId]/timeline/route.ts:14-31](file://app/api/pets/[petId]/timeline/route.ts#L14-L31)
- [app/api/ai/chat/route.ts:20-27](file://app/api/ai/chat/route.ts#L20-L27)
- [app/api/appointments/route.ts:84-110](file://app/api/appointments/route.ts#L84-L110)
- [app/api/appointments/[appointmentId]/route.ts:44-79](file://app/api/appointments/[appointmentId]/route.ts#L44-L79)
- [app/api/appointments/[appointmentId]/slots/route.ts:68-74](file://app/api/appointments/[appointmentId]/slots/route.ts#L68-L74)
- [app/api/appointments/[appointmentId]/conversation/route.ts:26-38](file://app/api/appointments/[appointmentId]/conversation/route.ts#L26-L38)
- [app/components/VetChatInterface.tsx:69-75](file://app/components/VetChatInterface.tsx#L69-L75)
- [app/api/reminders/route.ts:17-27](file://app/api/reminders/route.ts#L17-L27)
- [app/api/reminders/[reminderId]/route.ts:33-43](file://app/api/reminders/[reminderId]/route.ts#L33-L43)

## Conclusion
The Pet Owner Dashboard integrates comprehensive health overview, pet portfolio management, appointment scheduling and slot-based rescheduling, health reminders and tracking, and an AI-powered assistant with robust authentication, authorization, and error handling. Its responsive design ensures usability across devices, while efficient data fetching and streaming AI responses deliver a smooth user experience. The modular architecture separates concerns between client UI, API routes, and data layer, enabling maintainability and scalability.

**Updated** The addition of comprehensive health reminders, vaccination and medication tracking systems significantly enhances the platform's proactive health management capabilities. The new health reminders section provides users with automated task management based on vaccination due dates and medication schedules, while the enhanced pet selection improvements offer better visual feedback and status indicators. Combined with the dedicated chat tab with complete conversation management and the enhanced slot-based rescheduling workflow, the dashboard now provides a complete health management solution that seamlessly integrates preventive care tracking with appointment scheduling and veterinary communication capabilities. The real-time messaging system, automatic reminder generation, and enhanced health tracking features work together to create a comprehensive pet healthcare management platform that helps pet owners stay organized and proactive about their pets' health needs.

[No sources needed since this section summarizes without analyzing specific files]