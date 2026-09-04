# Environment Configuration

<cite>
**Referenced Files in This Document**
- [db.ts](file://lib/db.ts)
- [auth.ts](file://lib/auth.ts)
- [ai.ts](file://lib/ai.ts)
- [groq.ts](file://lib/ai/providers/groq.ts)
- [gemini.ts](file://lib/ai/providers/gemini.ts)
- [route.ts (Google config)](file://app/api/auth/google/config/route.ts)
- [route.ts (Google callback)](file://app/api/auth/google/callback/route.ts)
- [prisma.config.ts](file://prisma.config.ts)
- [seed.js](file://prisma/seed.js)
- [package.json](file://package.json)
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

## Introduction
This document explains how to configure the PETIVA application environment, focusing on required environment variables for database connectivity, Google OAuth, AI provider integrations, and session security. It also provides guidance for development, staging, and production setups, along with best practices for managing secrets, validating configuration, and testing your environment locally.

## Project Structure
The application reads configuration from environment variables at runtime. Key areas that consume environment variables include:
- Database connection via Prisma and a PostgreSQL pool
- Google OAuth client configuration and token verification
- AI providers (Groq, Gemini, OpenRouter) and model selection
- Session cookie security flags based on environment

```mermaid
graph TB
A["Environment Variables"] --> B["Database Layer<br/>lib/db.ts"]
A --> C["Auth Layer<br/>lib/auth.ts"]
A --> D["AI Providers<br/>lib/ai.ts + providers"]
A --> E["Google OAuth Routes<br/>app/api/auth/google/*"]
B --> F["PostgreSQL"]
D --> G["OpenRouter API"]
D --> H["Groq API"]
D --> I["Gemini API"]
```

**Diagram sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [route.ts (Google callback):21-41](file://app/api/auth/google/callback/route.ts#L21-L41)

**Section sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [route.ts (Google callback):21-41](file://app/api/auth/google/callback/route.ts#L21-L41)

## Core Components
This section enumerates all environment variables used by the application, their purpose, expected format, and where they are consumed.

- DATABASE_URL
  - Purpose: PostgreSQL connection string for Prisma and the pg pool.
  - Format: Standard PostgreSQL connection URL (e.g., postgresql://user:password@host:port/dbname).
  - Consumed by: lib/db.ts, prisma.config.ts, prisma/seed.js.
  - Notes: In development, the code reuses a global pool/client to avoid hot-reload issues.

- GOOGLE_CLIENT_ID
  - Purpose: Google OAuth client identifier used to verify ID tokens during login.
  - Format: Client ID string from Google Cloud Console.
  - Consumed by: app/api/auth/google/callback/route.ts, app/api/auth/google/config/route.ts.
  - Notes: Required for non-mock flows; mock flow is available in development.

- OPENROUTER_API_KEY
  - Purpose: API key for OpenRouter provider when selected or as a fallback path.
  - Format: Provider-specific API key string.
  - Consumed by: lib/ai.ts (OpenRouterProvider).
  - Notes: If missing, requests using this provider will fail fast with an error.

- GROQ_API_KEY
  - Purpose: API key for Groq provider (default booking assistant provider).
  - Format: Provider-specific API key string.
  - Consumed by: lib/ai/providers/groq.ts.
  - Notes: If missing, Groq calls will fail fast with an error.

- GEMINI_API_KEY
  - Purpose: API key for Gemini provider (used as fallback or explicit provider).
  - Format: Provider-specific API key string.
  - Consumed by: lib/ai/providers/gemini.ts.
  - Notes: Used when BOOKING_ASSISTANT_PROVIDER is set to gemini or as fallback.

- BOOKING_ASSISTANT_PROVIDER
  - Purpose: Selects which AI provider handles booking assistant requests.
  - Values: groq (default), gemini, qwen.
  - Consumed by: lib/ai.ts.
  - Notes: Determines which provider class is instantiated.

- OPENROUTER_MODEL
  - Purpose: Model name used by OpenRouter provider.
  - Default: google/gemini-2.5-flash.
  - Consumed by: lib/ai.ts.

- NODE_ENV
  - Purpose: Runtime environment flag used to adjust behavior (e.g., secure cookies, mock flows).
  - Values: development, production (others may be treated as non-production).
  - Consumed by: lib/auth.ts (cookie secure flag), Google callback route (mock flow).

- SESSION_COOKIE_NAME and related cookie settings
  - Purpose: Cookie name and attributes for session management.
  - Behavior: Secure flag enabled in production; SameSite=Lax; HttpOnly=true.
  - Consumed by: lib/auth.ts.

- JWT_SECRET and SESSION_SECRET
  - Purpose: Not currently used by the application’s authentication implementation.
  - Notes: The app uses database-backed opaque sessions and does not sign JWTs. Do not rely on these for auth unless you add custom logic.

**Section sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)
- [route.ts (Google callback):21-41](file://app/api/auth/google/callback/route.ts#L21-L41)
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)

## Architecture Overview
The environment drives three primary subsystems:
- Database connectivity via Prisma and pg pool
- Authentication via Google OAuth and database-backed sessions
- AI-assisted booking via configurable providers

```mermaid
sequenceDiagram
participant Client as "Client"
participant AuthRoute as "Google Callback Route"
participant DB as "Prisma/Pg Pool"
participant AuthLib as "Auth Library"
participant AI as "AI Provider"
Client->>AuthRoute : POST /api/auth/google/callback
AuthRoute->>AuthRoute : Verify credential (mock or Google)
AuthRoute->>DB : Upsert user by email
AuthRoute->>AuthLib : Create session and set cookie
AuthRoute-->>Client : { success, user }
Client->>AI : Booking assistant request
AI->>AI : Select provider (BOOKING_ASSISTANT_PROVIDER)
AI->>AI : Validate API key present
AI-->>Client : Response or tool calls
```

**Diagram sources**
- [route.ts (Google callback):21-77](file://app/api/auth/google/callback/route.ts#L21-L77)
- [auth.ts:33-91](file://lib/auth.ts#L33-L91)
- [ai.ts:109-139](file://lib/ai.ts#L109-L139)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)

## Detailed Component Analysis

### Database Configuration
- Reads DATABASE_URL at startup and initializes a pg pool and Prisma client.
- In production, creates a new pool per instance; in development, caches globally to prevent duplicate pools on hot reload.
- Prisma CLI and seed scripts also read DATABASE_URL via dotenv integration.

```mermaid
flowchart TD
Start(["Process start"]) --> ReadEnv["Read DATABASE_URL"]
ReadEnv --> EnvCheck{"NODE_ENV == 'production'?"}
EnvCheck --> |Yes| NewPool["Create new pg pool"]
EnvCheck --> |No| GlobalCache["Use global pool/client cache"]
NewPool --> InitPrisma["Init Prisma with adapter"]
GlobalCache --> InitPrisma
InitPrisma --> Ready(["Ready for queries"])
```

**Diagram sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)

**Section sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)

### Google OAuth Configuration
- Client ID is exposed to the frontend via a dedicated config route for UI initialization.
- During callback, credentials are verified either via mock flow (development) or Google’s OAuth2 client using GOOGLE_CLIENT_ID.
- On success, a session is created and a secure cookie is set.

```mermaid
sequenceDiagram
participant FE as "Frontend"
participant Config as "/api/auth/google/config"
participant CB as "/api/auth/google/callback"
participant Google as "Google OAuth"
participant DB as "Database"
participant Auth as "Auth Library"
FE->>Config : GET clientId
Config-->>FE : { clientId }
FE->>CB : POST { credential }
alt Development mock
CB->>CB : Parse mock token
else Production
CB->>Google : Verify idToken with GOOGLE_CLIENT_ID
Google-->>CB : Payload
end
CB->>DB : Upsert user
CB->>Auth : createSession + setSessionCookie
CB-->>FE : { success, user }
```

**Diagram sources**
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [route.ts (Google callback):21-77](file://app/api/auth/google/callback/route.ts#L21-L77)
- [auth.ts:33-91](file://lib/auth.ts#L33-L91)

**Section sources**
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [route.ts (Google callback):21-77](file://app/api/auth/google/callback/route.ts#L21-L77)
- [auth.ts:33-91](file://lib/auth.ts#L33-L91)

### AI Provider Configuration
- Provider selection is controlled by BOOKING_ASSISTANT_PROVIDER (defaults to groq).
- Each provider requires its own API key; missing keys cause immediate errors.
- OpenRouter can be configured with a specific model via OPENROUTER_MODEL.

```mermaid
classDiagram
class AIManager {
+getAIProvider()
+BOOKING_ASSISTANT_PROVIDER
}
class GroqProvider {
+generateResponse(messages, tools)
-apiKey
}
class GeminiProvider {
+generateResponse(messages, tools)
-apiKey
}
class OpenRouterProvider {
+generateResponse(messages, tools)
-apiKey
-model
}
AIManager --> GroqProvider : "select if 'groq'"
AIManager --> GeminiProvider : "select if 'gemini'"
AIManager --> OpenRouterProvider : "fallback or direct use"
```

**Diagram sources**
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [ai.ts:109-139](file://lib/ai.ts#L109-L139)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)

**Section sources**
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [ai.ts:109-139](file://lib/ai.ts#L109-L139)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)

### Session Security and Cookies
- Sessions are stored as hashed tokens in the database; plaintext tokens are only sent in HttpOnly cookies.
- In production, cookies are marked Secure; SameSite=Lax; Path=/.
- No JWT signing is used; therefore, JWT_SECRET is not applicable here.

```mermaid
flowchart TD
Login["Login Success"] --> GenToken["Generate random token"]
GenToken --> HashToken["Hash token (SHA-256)"]
HashToken --> StoreSession["Store hash in DB with expiry"]
StoreSession --> SetCookie["Set HttpOnly, Secure (prod), SameSite=Lax cookie"]
SetCookie --> NextRequest["Subsequent requests send cookie"]
NextRequest --> Validate["Validate by hashing and querying DB"]
```

**Diagram sources**
- [auth.ts:23-91](file://lib/auth.ts#L23-L91)

**Section sources**
- [auth.ts:23-91](file://lib/auth.ts#L23-L91)

## Dependency Analysis
- Environment variables are consumed across multiple modules without a centralized loader.
- Prisma CLI and seed script load .env via dotenv integration.
- Application runtime relies on Node’s process.env directly.

```mermaid
graph LR
Env["process.env"] --> DB["lib/db.ts"]
Env --> Auth["lib/auth.ts"]
Env --> AI["lib/ai.ts + providers"]
Env --> Routes["Google OAuth routes"]
PrismaCLI["prisma.config.ts"] --> Env
Seed["prisma/seed.js"] --> Env
```

**Diagram sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)

**Section sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)

## Performance Considerations
- Database pooling: Production uses a fresh pool per instance; development caches globally to reduce overhead during hot reloads.
- AI provider calls: Ensure API keys are present to avoid early failures; consider caching provider selection and model names at module load time.
- Session validation: Indexed lookups on tokenHash keep session checks efficient.

[No sources needed since this section provides general guidance]

## Troubleshooting Guide
Common issues and resolutions:
- Missing DATABASE_URL
  - Symptom: Prisma or pg pool fails to connect.
  - Resolution: Ensure DATABASE_URL is set in the environment before starting the server or running Prisma commands.
  - References: [db.ts:8-29](file://lib/db.ts#L8-L29), [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14), [seed.js:5-8](file://prisma/seed.js#L5-L8)

- Missing GOOGLE_CLIENT_ID
  - Symptom: Google OAuth callback returns an internal error indicating client ID is not configured.
  - Resolution: Set GOOGLE_CLIENT_ID in the environment; ensure it matches the Google Cloud project.
  - References: [route.ts (Google callback):21-41](file://app/api/auth/google/callback/route.ts#L21-L41), [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)

- Missing AI API Keys
  - Symptom: Requests to Groq/Gemini/OpenRouter fail with “not configured” errors.
  - Resolution: Set the corresponding API key (GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY).
  - References: [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22), [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22), [ai.ts:32-102](file://lib/ai.ts#L32-L102)

- Incorrect NODE_ENV affecting behavior
  - Symptom: Cookie security differs between environments; mock flows only active in development.
  - Resolution: Ensure NODE_ENV is set appropriately for each environment.
  - References: [auth.ts:83-91](file://lib/auth.ts#L83-L91), [route.ts (Google callback):21-28](file://app/api/auth/google/callback/route.ts#L21-L28)

**Section sources**
- [db.ts:8-29](file://lib/db.ts#L8-L29)
- [prisma.config.ts:12-14](file://prisma.config.ts#L12-L14)
- [seed.js:5-8](file://prisma/seed.js#L5-L8)
- [route.ts (Google callback):21-41](file://app/api/auth/google/callback/route.ts#L21-L41)
- [route.ts (Google config):3-7](file://app/api/auth/google/config/route.ts#L3-L7)
- [groq.ts:9-22](file://lib/ai/providers/groq.ts#L9-L22)
- [gemini.ts:9-22](file://lib/ai/providers/gemini.ts#L9-L22)
- [ai.ts:32-102](file://lib/ai.ts#L32-L102)
- [auth.ts:83-91](file://lib/auth.ts#L83-L91)

## Conclusion
To run PETIVA successfully, ensure the following environment variables are correctly set:
- DATABASE_URL for database connectivity
- GOOGLE_CLIENT_ID for Google OAuth
- AI provider keys (GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY) and optionally OPENROUTER_MODEL
- BOOKING_ASSISTANT_PROVIDER to select the active AI provider
- NODE_ENV to control environment-specific behaviors

Avoid committing secrets to version control. Use your platform’s secret management to inject environment variables at runtime. Validate configuration at startup and test critical paths (database connectivity, OAuth callback, AI provider calls) before deploying.

[No sources needed since this section summarizes without analyzing specific files]