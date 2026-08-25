# Requirements Review: Pet Healthcare Ecosystem

This document provides a comprehensive analysis of the product blueprint for the Pet Healthcare Ecosystem, identifying key requirements, potential risks, structural assumptions, ambiguities, and critical questions that must be resolved before proceeding to architecture and database design.

---

## 1. Confirmed Requirements

*   **Target Stack & Deployment:** Next.js with TypeScript for the application framework, targeting Alibaba Cloud infrastructure.
*   **Target Roles:**
    *   `PET_OWNER`: Manages pets, uploads documents, views health records, schedules appointments, interacts with AI.
    *   `VETERINARIAN`: Manages professional profile, writes medical records/prescriptions, views authorized patient data.
    *   `CLINIC_ADMIN`: Manages clinic profile, associated veterinarians, services, and schedules.
    *   `PLATFORM_ADMIN`: Overall platform administration, user management, and practitioner verification.
*   **Core Logic Priorities:** Correctness of business logic, database scalability, API security, and functional depth override visual polish.
*   **AI Integration:** A pet-context-aware AI Health Assistant, AI Medical History Summaries, and AI Preventive Insights using Alibaba Cloud's Model Studio (Qwen LLM).
*   **Ownership & Consent Model:** Authorization to pet records is strictly consent-driven and tied directly to the appointment/relationship lifecycle, ensuring vets only see what is necessary.
*   **Auditability & Versioning:** Health records, vaccinations, and medication entries are non-destructive and versioned. Changes must preserve historical data via an addendum or revision structure rather than standard updates.

---

## 2. Assumptions

### A1: Availability of Alibaba Cloud Credits & Regional Services
It is assumed that the development team has active Alibaba Cloud accounts with sufficient credits and that services like Model Studio (Qwen LLM), ApsaraDB (RDS/PostgreSQL), Object Storage Service (OSS), and compute services are available in the target deployment region.
*   *Why it matters:* Rather than finalizing service offerings upfront, we will inspect the exact credentials and credits provided by the hackathon.

### A2: PostgreSQL Database Model with Prisma ORM
It is assumed that PostgreSQL is the target database engine, managed via Prisma ORM to guarantee strong referential integrity, dynamic schema migrations, and structured relationships.
*   *Why it matters:* PostgreSQL is robust for complex relational models (such as many-to-many associations and versioned audit tables).

### A3: In-App Notifications First
It is assumed that alerts and reminders (vaccinations, medications, appointments) will target in-app banners/notifications first.
*   *Why it matters:* Defers integration with SMS/Email gateways (such as Alibaba Cloud Direct Mail or SMS) until post-MVP to limit setup overhead and external usage costs.

---

## 3. Ambiguities

### AM1: Patient Data Authorization Mechanism (Resolved)
*Resolved by User Proposal:* A veterinarian's access to pet records is limited, temporary, and tied to appointments.
*   *Why it matters:* Designing this workflow directly into the API and database permissions from the start prevents accidental global data exposure.

### AM2: Clinic-Veterinarian Relationship Cardinality (Resolved)
*Resolved by User Proposal:* Many-to-Many capable association model (`VetClinicAssociation`). A vet can practice at multiple clinics.
*   *Why it matters:* The schema must support a join table connecting `Veterinarian` to `Clinic` rather than a direct foreign key, ensuring future scheduling flexibility.

### AM3: Authentication Provider Selection (Left Open)
The exact auth provider (e.g., NextAuth.js/Auth.js vs. Alibaba Cloud Identity services) is left open until the current Next.js structure and hackathon offerings are inspected.
*   *Why it matters:* Ensures we select the option that offers the fastest secure integration path with Next.js App Router.

---

## 4. Potential Conflicts

### C1: Immutability of Medical Records vs. Data Correction (Resolved)
*Resolved by User Proposal:* Implement a versioned/addendum-based model. Instead of SQL `UPDATE`, corrections and addenda are appended as new entries referencing the original.
*   *Why it matters:* Ensures the system remains legally and medically auditable, preventing historical data loss.

### C2: Deep AI Context vs. Cost and Latency (Resolved)
*Resolved by User Proposal:* Implement dynamic relevant-context retrieval rather than a simplistic "last 3 records" rule.
*   *Why it matters:* Selecting context based on the user's specific query ensures the AI assistant gets highly relevant history (even if older) without blowing past context window limitations or raising token costs.

---

## 5. Missing Requirements

### MR1: Medical License Verification Flow for Veterinarians
Platform Administrators are responsible for verifying practitioners, but the blueprint does not detail the verification checklist.
*   *Why it matters:* For the MVP, we should design a simplified verification state (e.g., a boolean flag manually toggled by platform admins) to avoid blocking veterinarian onboarding.

### MR2: Medical Data Portability (Export/Import)
Pets frequently change clinics or owners. A mechanism to export the entire longitudinal health timeline is missing from the core plan.
*   *Why it matters:* Portability is key for real-world longitudinal profiles. We should plan for a simple JSON/PDF export feature.

---

## 6. Technical Questions

1.  **Deployment Platform:** Will the Next.js application run serverless (e.g., Alibaba Cloud Function Compute), or on containerized instances (e.g., ECS/Container Service)?
    *   *Why it matters:* Dictates how Next.js SSR/API routes are executed and how cold starts impact the AI assistant's response latency.
2.  **Local Development Environment:** Does Alibaba Cloud provide local mocks or SDK emulators for testing Model Studio (Qwen) and OSS offline?
    *   *Why it matters:* Critical for local testing and protecting developer keys.

---

## 7. Alibaba Cloud Questions

1.  **Regional Service Access:** Are Alibaba Cloud Model Studio (Qwen) and ApsaraDB RDS fully supported in the target hackathon deployment region?
    *   *Why it matters:* Regional availability varies, which may require cross-region APIs for AI tasks.
2.  **OSS Signature V4 Support:** Can we generate V4 presigned URLs seamlessly using the Alibaba Cloud Node.js SDK within Next.js API routes?
    *   *Why it matters:* Confirms we can easily implement secure, short-lived private document access.

---

## 8. AI Questions

1.  **Model Studio Endpoint Limits:** What are the rate limits (RPM/TPM) and latency expectations for Qwen models via Model Studio?
    *   *Why it matters:* Impacts how we rate-limit chat endpoints and format client-side loading indicators.
2.  **Safety Filters:** Can we use the standard Qwen safety configuration to filter medical liability risks?
    *   *Why it matters:* Guarantees the AI assistant acts only as an educational tool and does not provide formal medical diagnoses.

---

## 9. Security Questions

1.  **Data Minimization & Encryption:** How will we ensure PII (names, contact details) and pet records are encrypted in transit and secure?
    *   *Why it matters:* Establishes standard secure practices appropriate to handled data without chasing unnecessary HIPAA certification for the MVP.
2.  **Audit Logs:** What format will the audit logs follow for sensitive actions like record creation, access delegation, and updates?
    *   *Why it matters:* Standardizes tracking for sensitive medical data operations.

---

## 10. MVP Scope Concerns

*   **AI Feature Prioritization:**
    *   🥇 *Core AI:* Pet-aware AI Health Assistant + AI Health Summary.
    *   🥈 *Secondary AI:* Preventive Insights (partially rule-based + AI assisted).
    *   🔴 *Deferred:* Document OCR/understanding, advanced triage, complex RAG, and predictive models.
    *   *Why it matters:* Ruthless scoping ensures we build a robust, complete end-to-end workflow rather than several half-baked features.
*   **Platform Scope:**
    *   Focus strictly on the flow: Pet Owner profile setup -> booking -> Vet consultation -> record creation -> AI query/summary.
    *   *Why it matters:* Creates a cohesive user path that is easily demonstrable for the hackathon.
