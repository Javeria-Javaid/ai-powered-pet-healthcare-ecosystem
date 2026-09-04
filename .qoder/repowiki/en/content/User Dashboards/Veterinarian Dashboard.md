# Veterinarian Dashboard

<cite>
**Referenced Files in This Document**
- [page.tsx](file://app/vet/dashboard/page.tsx)
- [route.ts (patients)](file://app/api/vet/patients/route.ts)
- [route.ts (patient detail)](file://app/api/vet/patients/[petId]/route.ts)
- [route.ts (history)](file://app/api/vet/patients/[petId]/history/route.ts)
- [route.ts (discovery)](file://app/api/vet/discovery/route.ts)
- [route.ts (profile)](file://app/api/vet/profile/route.ts)
- [route.ts (appointments)](file://app/api/appointments/route.ts)
- [route.ts (clinics)](file://app/api/clinics/route.ts)
- [schema.prisma](file://prisma/schema.prisma)
- [auth.ts](file://lib/auth.ts)
- [chat route.ts](file://app/api/ai/chat/route.ts)
- [ai.ts](file://lib/ai.ts)
</cite>

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
This document explains the Veterinarian Dashboard in PETIVA, focusing on how veterinarians manage patients, view medical histories and vaccination status, create treatment plans, schedule appointments, discover new clients and pets, collaborate with clinic staff, use AI-assisted clinical decision support, and access analytics. It also covers responsive design and accessibility considerations implemented for veterinary professionals.

## Project Structure
The dashboard is a Next.js client component that orchestrates multiple server routes to load vet profile, clinics, patients, and appointments. It provides views for:
- Dashboard overview with stats and quick actions
- Appointments scheduling and management
- Patient index and detailed chart modal
- Health records entry and viewing
- Clinic associations
- Profile settings

```mermaid
graph TB
subgraph "Frontend"
VET_DASH["Vet Dashboard Page<br/>app/vet/dashboard/page.tsx"]
end
subgraph "Backend APIs"
API_VET_PROFILE["/api/vet/profile"]
API_CLINICS["/api/clinics"]
API_VET_PATIENTS["/api/vet/patients"]
API_APPTS["/api/appointments"]
API_HISTORY["/api/vet/patients/:petId/history"]
API_DISCOVERY["/api/vet/discovery"]
end
subgraph "Data Layer"
PRISMA["Prisma Client"]
DB["PostgreSQL"]
end
VET_DASH --> API_VET_PROFILE
VET_DASH --> API_CLINICS
VET_DASH --> API_VET_PATIENTS
VET_DASH --> API_APPTS
VET_DASH --> API_HISTORY
VET_DASH --> API_DISCOVERY
API_VET_PROFILE --> PRISMA
API_CLINICS --> PRISMA
API_VET_PATIENTS --> PRISMA
API_APPTS --> PRISMA
API_HISTORY --> PRISMA
API_DISCOVERY --> PRISMA
PRISMA --> DB
```

**Diagram sources**
- [page.tsx:42-84](file://app/vet/dashboard/page.tsx#L42-L84)
- [route.ts (profile):6-48](file://app/api/vet/profile/route.ts#L6-L48)
- [route.ts (clinics):6-49](file://app/api/clinics/route.ts#L6-L49)
- [route.ts (patients):6-71](file://app/api/vet/patients/route.ts#L6-L71)
- [route.ts (appointments):7-67](file://app/api/appointments/route.ts#L7-L67)
- [route.ts (history):7-69](file://app/api/vet/patients/[petId]/history/route.ts#L7-L69)
- [route.ts (discovery):6-60](file://app/api/vet/discovery/route.ts#L6-L60)

**Section sources**
- [page.tsx:42-84](file://app/vet/dashboard/page.tsx#L42-L84)
- [schema.prisma:30-312](file://prisma/schema.prisma#L30-L312)

## Core Components
- Vet Dashboard UI: Loads profile, clinics, patients, and appointments; renders today’s appointments, patient list, quick actions, and profile editor.
- Patient Management: Lists authorized patients based on confirmed appointments; opens a modal to view full history and add records.
- Appointment Management: Displays all appointments with confirm/cancel actions; enforces role-based filtering.
- Health Records: Creates structured medical record entries with symptoms, diagnosis, treatment plan, and notes; persists as versions with audit logging.
- Discovery: Retrieves available veterinarians and their active clinic associations for discovery workflows.
- Profile Settings: Updates veterinarian personal and professional details.

**Section sources**
- [page.tsx:216-702](file://app/vet/dashboard/page.tsx#L216-L702)
- [route.ts (patients):6-71](file://app/api/vet/patients/route.ts#L6-L71)
- [route.ts (history):7-153](file://app/api/vet/patients/[petId]/history/route.ts#L7-L153)
- [route.ts (appointments):7-143](file://app/api/appointments/route.ts#L7-L143)
- [route.ts (discovery):6-60](file://app/api/vet/discovery/route.ts#L6-L60)
- [route.ts (profile):6-100](file://app/api/vet/profile/route.ts#L6-L100)

## Architecture Overview
The dashboard uses a client-server architecture with Next.js App Router. The frontend calls REST endpoints secured by role-based middleware. Data is modeled with Prisma and stored in PostgreSQL. AI features are integrated via a chat endpoint that streams responses and executes tools to query or modify data.

```mermaid
sequenceDiagram
participant UI as "Vet Dashboard UI"
participant AP as "Auth Middleware"
participant API as "Server Routes"
participant DB as "PostgreSQL"
UI->>AP : GET /api/vet/profile
AP-->>API : requireRole('VETERINARIAN')
API->>DB : Fetch vet + user
DB-->>API : Vet/User data
API-->>UI : Vet profile JSON
UI->>AP : GET /api/vet/patients
AP-->>API : requireRole('VETERINARIAN')
API->>DB : Query confirmed appointments + pets
DB-->>API : Patients list
API-->>UI : Patients JSON
UI->>AP : POST /api/vet/patients/ : petId/history
AP-->>API : requireRole('VETERINARIAN')
API->>DB : Create MedicalRecord + Version + AuditLog
DB-->>API : Created record
API-->>UI : Record response
```

**Diagram sources**
- [route.ts (profile):6-48](file://app/api/vet/profile/route.ts#L6-L48)
- [route.ts (patients):6-71](file://app/api/vet/patients/route.ts#L6-L71)
- [route.ts (history):72-153](file://app/api/vet/patients/[petId]/history/route.ts#L72-L153)
- [auth.ts:109-125](file://lib/auth.ts#L109-L125)

## Detailed Component Analysis

### Patient Management Interface
- Assigned Patients: The dashboard lists patients associated with the logged-in veterinarian through confirmed appointments. The backend de-duplicates pets and includes owner contact details.
- Patient Chart Modal: Selecting a patient opens a modal showing species, breed, gender, weight, and a timeline of clinical records.
- Medical History Access: The history endpoint aggregates medical records, vaccinations, medications, allergies, conditions, and metrics in parallel for performance.
- Treatment Plan Creation: The UI allows adding symptoms, diagnosis, treatment plan, and notes. The backend creates a new medical record header and version within a transaction and logs an audit event.

```mermaid
flowchart TD
Start(["Open Patient Chart"]) --> LoadHistory["Fetch history for pet"]
LoadHistory --> ShowTimeline{"Records exist?"}
ShowTimeline -- "No" --> AddRecord["Add new record entry"]
ShowTimeline -- "Yes" --> ViewRecords["View records timeline"]
AddRecord --> SubmitRecord["POST symptoms/diagnosis/treatmentPlan/notes"]
SubmitRecord --> Persist["Create MedicalRecord + Version + AuditLog"]
Persist --> UpdateUI["Refresh timeline"]
ViewRecords --> End(["Close or Edit"])
UpdateUI --> End
```

**Diagram sources**
- [route.ts (history):7-69](file://app/api/vet/patients/[petId]/history/route.ts#L7-L69)
- [route.ts (history):72-153](file://app/api/vet/patients/[petId]/history/route.ts#L72-L153)
- [page.tsx:86-108](file://app/vet/dashboard/page.tsx#L86-L108)
- [page.tsx:134-160](file://app/vet/dashboard/page.tsx#L134-L160)

**Section sources**
- [route.ts (patients):6-71](file://app/api/vet/patients/route.ts#L6-L71)
- [route.ts (history):7-153](file://app/api/vet/patients/[petId]/history/route.ts#L7-L153)
- [page.tsx:86-108](file://app/vet/dashboard/page.tsx#L86-L108)
- [page.tsx:134-160](file://app/vet/dashboard/page.tsx#L134-L160)
- [schema.prisma:133-162](file://prisma/schema.prisma#L133-L162)

### Discovery System for New Clients and Pets
- Veterinarian Discovery: The discovery endpoint returns verified veterinarians with their active clinic associations, enabling clients to find specialists and locations.
- Filtering Capabilities: While the current implementation returns all vets with optional specialization context via AI tools, future enhancements can add location-based filters using clinic addresses.

```mermaid
sequenceDiagram
participant Client as "Client App"
participant API as "/api/vet/discovery"
participant DB as "PostgreSQL"
Client->>API : GET /api/vet/discovery
API->>DB : Find veterinarians + clinics
DB-->>API : Vets with active clinics
API-->>Client : Formatted vet list
```

**Diagram sources**
- [route.ts (discovery):6-60](file://app/api/vet/discovery/route.ts#L6-L60)
- [schema.prisma:90-131](file://prisma/schema.prisma#L90-L131)

**Section sources**
- [route.ts (discovery):6-60](file://app/api/vet/discovery/route.ts#L6-L60)
- [schema.prisma:90-131](file://prisma/schema.prisma#L90-L131)

### Clinical Tools: Medical Records, Prescriptions, Diagnosis Logging, Treatment Plans
- Medical Record Writing: The dashboard form captures symptoms, diagnosis, treatment plan, and optional notes. The backend validates required fields and persists a new record and version atomically.
- Prescription Management: The schema supports prescriptions linked to medical records with medication name, dosage, frequency, start/end dates, and instructions.
- Diagnosis Logging: Each record version stores diagnosis and timestamps, enabling revision tracking and audit trails.
- Treatment Plan Creation: Stored per record version; visible in the patient chart timeline.

```mermaid
classDiagram
class MedicalRecord {
+id
+petId
+vetId
+clinicId
+createdAt
}
class MedicalRecordVersion {
+id
+recordId
+editorId
+symptoms
+diagnosis
+treatmentPlan
+notes
+isCurrent
+createdAt
}
class Prescription {
+id
+recordId
+medicationName
+dosage
+frequency
+startDate
+endDate
+instructions
}
MedicalRecord "1" --> "many" MedicalRecordVersion : "has versions"
MedicalRecord "1" --> "many" Prescription : "has prescriptions"
```

**Diagram sources**
- [schema.prisma:133-194](file://prisma/schema.prisma#L133-L194)

**Section sources**
- [route.ts (history):72-153](file://app/api/vet/patients/[petId]/history/route.ts#L72-L153)
- [schema.prisma:133-194](file://prisma/schema.prisma#L133-L194)

### Schedule Visualization: Daily Appointments, Time Slots, Availability Management
- Today’s Appointments: The dashboard computes today’s non-cancelled appointments and displays them in a table with time, pet, owner, reason, clinic, and status.
- Appointment Actions: Confirm or cancel actions update appointment status and refresh both appointments and patients lists.
- Availability Management: The AI assistant integrates slot checking and booking logic to prevent double bookings and enforce working hours.

```mermaid
sequenceDiagram
participant UI as "Dashboard UI"
participant API as "/api/appointments"
participant DB as "PostgreSQL"
UI->>API : GET /api/appointments
API->>DB : Fetch appointments by role
DB-->>API : Appointments
API-->>UI : Appointments list
UI->>API : PUT /api/appointments/ : id {status}
API->>DB : Update appointment status
DB-->>API : Updated appointment
API-->>UI : Success
```

**Diagram sources**
- [page.tsx:162-189](file://app/vet/dashboard/page.tsx#L162-L189)
- [route.ts (appointments):7-67](file://app/api/appointments/route.ts#L7-L67)
- [route.ts (appointments):69-143](file://app/api/appointments/route.ts#L69-L143)

**Section sources**
- [page.tsx:211-215](file://app/vet/dashboard/page.tsx#L211-L215)
- [page.tsx:531-566](file://app/vet/dashboard/page.tsx#L531-L566)
- [route.ts (appointments):69-143](file://app/api/appointments/route.ts#L69-L143)

### Patient Search and Filtering, Medical History Access, Collaborative Features
- Patient Index: Lists all patients under care with quick “View Chart” actions.
- Filtering: Current implementation shows all assigned patients; additional filters (e.g., by species or upcoming appointments) can be added at the UI layer.
- Collaborative Features: Medical records include editor tracking and audit logs, supporting multi-staff collaboration and traceability.

**Section sources**
- [page.tsx:568-590](file://app/vet/dashboard/page.tsx#L568-L590)
- [route.ts (history):7-69](file://app/api/vet/patients/[petId]/history/route.ts#L7-L69)
- [schema.prisma:148-162](file://prisma/schema.prisma#L148-L162)
- [schema.prisma:298-311](file://prisma/schema.prisma#L298-L311)

### Performance Metrics and Analytics
- Dashboard Metrics: Displays counts for today’s appointments, upcoming appointments (next 7 days), total patients under care, and pending actions (REQUESTED).
- Analytics Extensibility: The schema supports health metrics and audit logs; future dashboards can aggregate these for practice analytics.

**Section sources**
- [page.tsx:354-386](file://app/vet/dashboard/page.tsx#L354-L386)
- [schema.prisma:236-244](file://prisma/schema.prisma#L236-L244)
- [schema.prisma:298-311](file://prisma/schema.prisma#L298-L311)

### AI Assistant Integration: Clinical Decision Support and Automated Reports
- Chat Endpoint: Streams AI responses, manages conversation context per user and pet, and executes tools to retrieve health timelines, vaccinations, medications, allergies, appointments, and to book visits.
- Tool Execution: Validates ownership, checks availability, prevents double bookings, enforces working hours, and persists results.
- Report Generation: The AI can summarize health timelines and generate understandable summaries based on retrieved data.

```mermaid
sequenceDiagram
participant UI as "Chat Widget"
participant API as "/api/ai/chat"
participant AI as "AI Provider"
participant DB as "PostgreSQL"
UI->>API : POST message with conversationId/petId
API->>DB : Save user message
API->>AI : Generate response with tools
AI-->>API : Tool calls or content
API->>DB : Execute tool queries (health timeline, slots, etc.)
DB-->>API : Results
API-->>UI : Streamed result (content/tool outputs)
```

**Diagram sources**
- [chat route.ts:68-349](file://app/api/ai/chat/route.ts#L68-L349)
- [ai.ts:141-467](file://lib/ai.ts#L141-L467)

**Section sources**
- [chat route.ts:68-349](file://app/api/ai/chat/route.ts#L68-L349)
- [ai.ts:141-467](file://lib/ai.ts#L141-L467)

### Responsive Design and Accessibility Considerations
- Responsive Layout: Uses Tailwind CSS classes for flexible grids and spacing; adapts from mobile to desktop layouts.
- Dark Mode: Supports dark theme toggling via utility classes.
- Accessibility: Buttons and inputs have clear labels; icons are used alongside text for clarity; focus states are styled for keyboard navigation.

**Section sources**
- [page.tsx:216-702](file://app/vet/dashboard/page.tsx#L216-L702)

## Dependency Analysis
- Authentication and Authorization: All protected routes rely on middleware to validate sessions and roles.
- Data Models: Prisma schema defines relationships between User, Pet, Veterinarian, Clinic, Appointment, MedicalRecord, and related entities.
- AI Tools: The AI module defines tool schemas and execution logic that interact with the database to provide clinical insights and scheduling capabilities.

```mermaid
graph LR
AUTH["lib/auth.ts"] --> ROUTES["Server Routes"]
ROUTES --> PRISMA["Prisma Client"]
PRISMA --> SCHEMA["schema.prisma"]
AI["lib/ai.ts"] --> CHAT["/api/ai/chat"]
CHAT --> ROUTES
```

**Diagram sources**
- [auth.ts:109-125](file://lib/auth.ts#L109-L125)
- [schema.prisma:30-312](file://prisma/schema.prisma#L30-L312)
- [ai.ts:141-467](file://lib/ai.ts#L141-L467)
- [chat route.ts:68-349](file://app/api/ai/chat/route.ts#L68-L349)

**Section sources**
- [auth.ts:109-125](file://lib/auth.ts#L109-L125)
- [schema.prisma:30-312](file://prisma/schema.prisma#L30-L312)
- [ai.ts:141-467](file://lib/ai.ts#L141-L467)

## Performance Considerations
- Parallel Queries: The history endpoint uses Promise.all to fetch multiple datasets concurrently, reducing latency.
- De-duplication: Patient lists are de-duplicated to avoid redundant rows.
- Session Expiration: Sliding window session extension improves UX while maintaining security.
- AI Context Limiting: Conversation history is limited to recent messages to control context size and cost.

**Section sources**
- [route.ts (history):23-44](file://app/api/vet/patients/[petId]/history/route.ts#L23-L44)
- [route.ts (patients):43-57](file://app/api/vet/patients/route.ts#L43-L57)
- [auth.ts:65-75](file://lib/auth.ts#L65-L75)
- [chat route.ts:137-143](file://app/api/ai/chat/route.ts#L137-L143)

## Troubleshooting Guide
- Authentication Errors: If a route returns FORBIDDEN or UNAUTHORIZED, verify the session cookie and role requirements.
- Not Found Errors: Ensure the veterinarian profile exists and is linked to the authenticated user.
- Validation Errors: Required fields like symptoms, diagnosis, and treatment plan must be provided when creating records.
- Double Booking Prevention: When booking via AI, ensure the selected slot is not already requested or confirmed.

**Section sources**
- [route.ts (profile):36-48](file://app/api/vet/profile/route.ts#L36-L48)
- [route.ts (patients):58-71](file://app/api/vet/patients/route.ts#L58-L71)
- [route.ts (history):89-94](file://app/api/vet/patients/[petId]/history/route.ts#L89-L94)
- [route.ts (appointments):93-110](file://app/api/appointments/route.ts#L93-L110)

## Conclusion
The Veterinarian Dashboard provides a comprehensive interface for managing patients, viewing medical histories, scheduling appointments, and collaborating with clinic staff. Integrated AI tools enhance clinical decision support and automate reporting tasks. The system emphasizes secure access, efficient data retrieval, and scalable architecture suitable for veterinary practice management.

## Appendices

### Key API Endpoints Summary
- GET /api/vet/profile: Retrieve vet profile
- PUT /api/vet/profile: Update vet profile
- GET /api/vet/patients: List assigned patients
- GET /api/vet/patients/:petId: Get authorized patient details
- GET /api/vet/patients/:petId/history: Fetch full medical history
- POST /api/vet/patients/:petId/history: Create medical record entry
- GET /api/appointments: List appointments by role
- POST /api/appointments: Create appointment request
- GET /api/clinics: List clinics for user or discovery
- GET /api/vet/discovery: Browse available veterinarians

**Section sources**
- [route.ts (profile):6-100](file://app/api/vet/profile/route.ts#L6-L100)
- [route.ts (patients):6-80](file://app/api/vet/patients/route.ts#L6-L80)
- [route.ts (history):7-153](file://app/api/vet/patients/[petId]/history/route.ts#L7-L153)
- [route.ts (appointments):7-143](file://app/api/appointments/route.ts#L7-L143)
- [route.ts (clinics):6-49](file://app/api/clinics/route.ts#L6-L49)
- [route.ts (discovery):6-60](file://app/api/vet/discovery/route.ts#L6-L60)