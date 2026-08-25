# API Specification

This document defines the HTTP API contract for the Pet Healthcare Ecosystem MVP, highlighting authentication, role-based authorization, request structures, and input validations.

---

## 1. Global Specifications

*   **Prefix:** `/api`
*   **Format:** Request bodies must use standard `application/json`. Responses return `application/json`.
*   **Authentication:** Indicated by HTTP Cookies or Bearer headers. Session context exposes `userId` and `role`.
*   **Error Responses:** Standard JSON envelope:
    ```json
    {
      "success": false,
      "error": {
        "code": "ERROR_CODE",
        "message": "Human-readable description of error",
        "details": {}
      }
    }
    ```

---

## 2. Authentication APIs

### 2.1 Register User
*   **Method & Route:** `POST /api/auth/register`
*   **Authentication:** None.
*   **Authorization:** None.
*   **Request Body & Validation:**
    ```json
    {
      "email": "owner@example.com", // Valid email
      "password": "strongPassword123", // Min 8 chars
      "role": "PET_OWNER", // "PET_OWNER" | "VETERINARIAN" | "CLINIC_ADMIN"
      "firstName": "John",
      "lastName": "Doe"
    }
    ```
*   **Response Structure (201 Created):**
    ```json
    {
      "success": true,
      "user": {
        "id": "user-uuid",
        "email": "owner@example.com",
        "role": "PET_OWNER"
      }
    }
    ```
*   **Relevant Entities:** `User`

### 2.2 Login User
*   **Method & Route:** `POST /api/auth/login`
*   **Authentication:** None.
*   **Response (200 OK):** Standard session token setting a secure HttpOnly cookie.

---

## 3. Pet Management APIs

### 3.1 Create Pet
*   **Method & Route:** `POST /api/pets`
*   **Authentication:** Required.
*   **Authorization:** `PET_OWNER` only.
*   **Request Body & Validation:**
    ```json
    {
      "name": "Luna", // Required, string
      "species": "Dog", // Required, string
      "breed": "Golden Retriever", // Optional, string
      "gender": "Female", // Optional, string
      "dateOfBirth": "2024-01-15T00:00:00.000Z", // Optional ISO date
      "weight": 12.5 // Optional, number
    }
    ```
*   **Response (201 Created):** Contains created pet UUID.
*   **Relevant Entities:** `Pet`

### 3.2 List Pets
*   **Method & Route:** `GET /api/pets`
*   **Authentication:** Required.
*   **Authorization:**
    *   `PET_OWNER`: Lists pets owned by the caller.
    *   `PLATFORM_ADMIN`: Lists all pets.

---

## 4. Medical Record APIs

### 4.1 Create Medical Record
*   **Method & Route:** `POST /api/pets/[petId]/records`
*   **Authentication:** Required.
*   **Authorization:** `VETERINARIAN` only. The caller must have a confirmed appointment with the pet to access this API.
*   **Request Body & Validation:**
    ```json
    {
      "clinicId": "clinic-uuid", // Optional, string
      "symptoms": "Vomiting and lethargy", // Required, string
      "diagnosis": "Mild food poisoning", // Required, string
      "treatmentPlan": "Bland diet for 3 days", // Required, string
      "notes": "Follow up if symptoms persist" // Optional, string
    }
    ```
*   **Response (201 Created):** Created `recordId` and `versionId`.
*   **Relevant Entities:** `MedicalRecord`, `MedicalRecordVersion`

### 4.2 Add Addendum / Correction
*   **Method & Route:** `POST /api/records/[recordId]/revisions`
*   **Authentication:** Required.
*   **Authorization:** `VETERINARIAN` only. The caller must be the authoring vet of the record or have active consent.
*   **Request Body & Validation:**
    ```json
    {
      "symptoms": "Updated symptoms description...",
      "diagnosis": "Gastritis (corrected from food poisoning)",
      "treatmentPlan": "Antacids + bland diet",
      "notes": "Corrected diagnosis following follow-up."
    }
    ```
*   **Response (200 OK):** Appends a new revision with `isCurrent: true` and marks previous revision `isCurrent: false`.
*   **Relevant Entities:** `MedicalRecordVersion`

---

## 5. Preventative Care & Metric APIs

### 5.1 Add Vaccination
*   **Method & Route:** `POST /api/pets/[petId]/vaccinations`
*   **Authentication:** Required.
*   **Authorization:** `VETERINARIAN` or authorized `PET_OWNER`.
*   **Request Body:**
    ```json
    {
      "vaccineName": "Rabies Booster",
      "administeredDate": "2026-08-24T12:00:00.000Z",
      "dueDate": "2027-08-24T12:00:00.000Z"
    }
    ```
*   **Relevant Entities:** `Vaccination`

### 5.2 Add Medication
*   **Method & Route:** `POST /api/pets/[petId]/medications`
*   **Authentication:** Required.
*   **Relevant Entities:** `Medication`

### 5.3 Post Health Metric
*   **Method & Route:** `POST /api/pets/[petId]/metrics`
*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "metricType": "WEIGHT",
      "value": 14.2,
      "unit": "kg"
    }
    ```
*   **Relevant Entities:** `HealthMetric`

---

## 6. Veterinary Ecosystem APIs

### 6.1 Register Veterinarian Profile
*   **Method & Route:** `POST /api/vets`
*   **Authentication:** Required.
*   **Authorization:** `VETERINARIAN` only (without active profile).
*   **Request Body:**
    ```json
    {
      "specialization": "Feline Medicine",
      "licenseNumber": "VET-12345"
    }
    ```
*   **Relevant Entities:** `Veterinarian`

### 6.2 Associate Vet with Clinic
*   **Method & Route:** `POST /api/clinics/[clinicId]/vets`
*   **Authentication:** Required.
*   **Authorization:** `CLINIC_ADMIN` or platform admin.
*   **Request Body:**
    ```json
    {
      "vetId": "vet-uuid"
    }
    ```
*   **Relevant Entities:** `VetClinicAssociation`

---

## 7. Appointment Booking & Consent

### 7.1 Book Appointment
*   **Method & Route:** `POST /api/appointments`
*   **Authentication:** Required.
*   **Authorization:** `PET_OWNER` only.
*   **Request Body:**
    ```json
    {
      "petId": "pet-uuid",
      "vetId": "vet-uuid",
      "clinicId": "clinic-uuid",
      "dateTime": "2026-09-01T10:00:00.000Z",
      "reason": "Annual checkup"
    }
    ```
*   **Response (201 Created):** Returns appointment details. Automatically sets up a temporary record-sharing window for the veterinarian upon confirmation.
*   **Relevant Entities:** `Appointment`

---

## 8. File Upload & OSS Document APIs

### 8.1 Request Presigned Upload URL
*   **Method & Route:** `POST /api/documents/upload-intent`
*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "petId": "pet-uuid",
      "fileName": "blood_report.pdf",
      "fileType": "application/pdf"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "uploadUrl": "https://bucket.oss-cn-hangzhou.aliyuncs.com/uploads/guid.pdf?Signature=...",
      "documentId": "doc-uuid"
    }
    ```
*   **Relevant Entities:** `Document`

---

## 9. AI Assistant APIs

### 9.1 Interact with Assistant
*   **Method & Route:** `POST /api/ai/chat`
*   **Authentication:** Required.
*   **Request Body:**
    ```json
    {
      "petId": "pet-uuid",
      "message": "Why is Luna itching so much?"
    }
    ```
*   **Response (200 OK):** Returns streamed chunks or a final AI reply containing customized context-aware suggestions.
*   **Relevant Entities:** `AIConversation`, `AIMessage`

### 9.2 Request AI Medical Summary
*   **Method & Route:** `GET /api/pets/[petId]/ai-summary`
*   **Authentication:** Required.
*   **Authorization:** Owner of pet, or Vet with active consent.
*   **Response (200 OK):** Returns an AI-structured clinical summary of pet history.
