# REST API Reference & Integration Endpoints — SanadChain

Base URL: `http://localhost:3000/api`

---

## 1. Authentication Endpoints

### `POST /api/auth/login`
Authenticates an institution admin, issuing officer, student, or super admin.
* **Request Body**:
  ```json
  { "email": "admin@abc.edu", "password": "Demo@123" }
  ```
* **Response (200 OK)**:
  ```json
  {
    "token": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": { "id": "usr_002", "email": "admin@abc.edu", "fullName": "Dr. Meera Nair", "role": "INSTITUTION_ADMIN" }
  }
  ```

### `POST /api/auth/google`
Authenticates via Google Workspace Single Sign-On.
* **Request Body**:
  ```json
  { "googleId": "goog_12345", "email": "dr.nair@abc.edu", "fullName": "Dr. Meera Nair", "avatar": "https://..." }
  ```

### `POST /api/auth/otp/send` & `POST /api/auth/otp/verify`
Generates and validates 6-digit Two-Factor Authentication codes.

---

## 2. Public Verification Endpoints (Zero-Login)

### `GET /api/verify/:credentialId`
Instantly verifies a credential against Hyperledger Fabric and computes an AI Trust Score.
* **Response (200 OK)**:
  ```json
  {
    "status": "VALID",
    "credentialId": "SANAD-NAD-20269901",
    "verificationSeconds": 0.001,
    "latencyMs": 0.92,
    "aiReport": {
      "aiTrustScore": "98.6%",
      "riskLevel": "LOW",
      "verdict": "GENUINE_AUTHENTIC",
      "modelAccuracy": "98.8%",
      "institutionAccreditation": { "recognized": true, "type": "Central University", "naacGrade": "A++" },
      "anomalies": []
    },
    "verification": { "verified": true, "issuerVerified": true, "hashMatched": true, "signatureValid": true, "blockchainConfirmed": true },
    "credential": { "studentDisplayName": "Rahul Sharma", "program": "B.Tech CSE", "institution": "ABC University of Technology", "issueDate": "2026-06-20", "status": "ACTIVE" },
    "blockchain": { "network": "SanadChain Permissioned Network", "organization": "ABCUNIVMSP", "blockNumber": 1848, "transactionId": "tx_fabric_4cb9749c..." },
    "hash": { "algorithm": "SHA-256", "value": "2dd213a416bb2f5a6ed5fa8e20dcc7e8a056aab719c45e86bc03c15ef0e3ea38" },
    "timeline": [ { "date": "2026-06-20", "event": "Credential Created", "status": "COMPLETED" } ]
  }
  ```

### `POST /api/verify/document`
Verifies an uploaded certificate/marksheet PDF or image by calculating its SHA-256 digest on-the-fly.
* **Request Body**:
  ```json
  { "documentHash": "2dd213a416bb2f5a6ed5fa8e20dcc7e8a056aab719c45e86bc03c15ef0e3ea38", "fileName": "Rahul_Degree.pdf" }
  ```

---

## 3. Credential Lifecycle Endpoints

* `POST /api/credentials/issue` — Issues new credential (requires `INSTITUTION_ADMIN` or `ISSUING_OFFICER`).
* `POST /api/credentials/revoke` — Revokes credential with formal reason and records audit trail.
* `POST /api/credentials/reissue` — Re-issues credential with `R1` provenance tag.
* `GET /api/credentials/:id/history` — Returns full provenance trail.

---

## 4. DigiLocker / NAD Endpoints

* `GET /api/nad/credentials` — Lists documents available in the national repository.
* `POST /api/nad/import` — Imports a DigiLocker record and anchors it to Hyperledger Fabric.
* `POST /api/nad/sync` — Pushes a SanadChain credential to DigiLocker with official URI.
