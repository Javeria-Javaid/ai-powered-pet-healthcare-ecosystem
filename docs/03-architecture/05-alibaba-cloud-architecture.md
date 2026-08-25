# Alibaba Cloud Architecture

This document details the Alibaba Cloud infrastructure integrations for the Pet Healthcare Ecosystem, separating services into Confirmed, Recommended, and To Verify tiers based on developer feasibility and standard cloud patterns.

---

## 1. Cloud Service Tiers

```
┌────────────────────────────────────────────────────────┐
│                      CONFIRMED                         │
│   • Object Storage Service (OSS)                       │
│   • Model Studio (Qwen LLM)                            │
├────────────────────────────────────────────────────────┤
│                     RECOMMENDED                        │
│   • ApsaraDB RDS for PostgreSQL                        │
│   • ECS / Function Compute (Compute Runtime)           │
├────────────────────────────────────────────────────────┤
│                     TO VERIFY                          │
│   • Direct Mail / SMS (Notifications)                  │
│   • Key Management Service (KMS)                       │
└────────────────────────────────────────────────────────┘
```

---

## 2. Service Specifications

### 2.1 Object Storage Service (OSS)
*   **Tier:** CONFIRMED
*   **Purpose:** Secure, scalable storage for unstructured files (medical PDFs, photos).
*   **Usage Flow:** Next.js backend generates temporary upload signatures. The browser uploads the document directly to the bucket, keeping the server free of file stream handling.
*   **Data In:** File byte streams from direct browser uploads.
*   **Data Out:** Short-lived presigned download URLs (using Signature V4) to authorized users.
*   **Security Implications:** Private bucket mode. ACL is set to private. Public HTTP access is blocked.
*   **Local Development:** Local code runs standard Node.js OSS SDK, pointing to mock folder directories if credentials are empty, or directly to a shared dev-stage bucket.

### 2.2 Model Studio (Qwen LLM / DashScope)
*   **Tier:** CONFIRMED
*   **Purpose:** Powers the AI Assistant and History Summarizer.
*   **Usage Flow:** Server-side API endpoints call DashScope API using credentials kept strictly in server `.env` variables.
*   **Data In:** Text query, system prompts, and filtered pet healthcare record context.
*   **Data Out:** AI-generated assistant text or summaries.
*   **Security Implications:** API credentials must never be exposed to browser clients. Prompt templates are kept on the server to prevent leakage or tampering.
*   **Local Development:** SDK hooks directly into Model Studio API via user credentials or returns simulated offline fallback responses for local offline developer workflows.

### 2.3 ApsaraDB RDS for PostgreSQL
*   **Tier:** RECOMMENDED
*   **Purpose:** Persistent, high-availability relational storage.
*   **Usage Flow:** Intercepted by Prisma Client running in Next.js Server Components and Route Handlers.
*   **Data In:** Relational entity updates (appointments, user registrations, health logs).
*   **Data Out:** Formatted relational JSON responses.
*   **Security Implications:** Accessed only within a VPC or using restricted IP access lists (allowing only Next.js host servers).
*   **Local Development:** Local PostgreSQL container or local file-based database for offline development, ensuring exact model parity via Prisma migrations.

### 2.4 Compute Runtime (Function Compute vs. ECS)
*   **Tier:** RECOMMENDED
*   **Purpose:** Hosts the Next.js App Router server.
*   **Evaluation:**
    *   *Function Compute (Serverless):* Cost-effective for low-traffic hackathon prototypes.
    *   *Elastic Compute Service (ECS):* Standard Virtual Machine option for hosting standard Next.js servers, removing cold-start issues for LLM chats.

### 2.5 SMS & Direct Mail Gateway
*   **Tier:** TO VERIFY
*   **Purpose:** Outbound notification alerts (reminders).
*   **Usage Flow:** Scheduled cron jobs invoke email/SMS triggers to alert owners of upcoming vaccinations.
*   **Verification needed:** Must check hackathon credit applicability and registration delays for sandbox messaging templates in target regions.
