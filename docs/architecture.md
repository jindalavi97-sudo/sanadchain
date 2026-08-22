# SanadChain — Architecture & System Design Documentation

## 1. System Architecture Overview

SanadChain is an enterprise-grade, permissioned blockchain academic credential trust platform designed to eliminate degree fraud. Sensitive student records remain off-chain, while cryptographic SHA-256 fingerprints, digital signatures, and lifecycle states are anchored on Hyperledger Fabric.

```mermaid
graph TD
    Client["Client Web Application (Vanilla JS / Modern CSS / Theme System)"]
    API["SanadChain Core API (Express.js + RBAC + Audit Engine)"]
    DB["PostgreSQL / Hybrid Storage Adapter (Users, Metadata, Audits)"]
    DocVault["Off-Chain Document Storage (Encrypted AES-256 Vault)"]
    BC_Seam["Blockchain Gateway Adapter Interface"]
    MockLedger["Development Blockchain Simulator (Blocks, TXs, Merkle Proofs)"]
    FabricGateway["Hyperledger Fabric Network (Raft Ordering, 4 Org Peers)"]
    NADService["DigiLocker / NAD Bi-Directional Gateway Adapter"]

    Client --> API
    API --> DB
    API --> DocVault
    API --> BC_Seam
    API --> NADService
    BC_Seam --> MockLedger
    BC_Seam --> FabricGateway
```

---

## 2. Federated Multi-Institution Mesh vs Isolated Portals

```
                       ┌────────────────────────────────────────┐
                       │ SANADCHAIN FEDERATED TRUST NETWORK     │
                       │ (Hyperledger Fabric Multi-Org Channel) │
                       └───────────────────┬────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│ National Auth   ││ University A    ││ University B    ││ Autonomous Coll │
│ (Governance)    ││ (Peer Node)     ││ (Peer Node)     ││ (No-Code Issuing│
└─────────────────┘└─────────────────┘└─────────────────┘└─────────────────┘
```

Unlike single-university portals (which require employers to visit different verification websites for every college), SanadChain provides a **single, universal public verifier** that instantly identifies the issuing institution, verifies the cryptographic signature, checks revocation, and displays authenticity.

---

## 3. Data Privacy: On-Chain vs Off-Chain Separation

To comply with global privacy standards (GDPR / Indian DPDP Act), sensitive personal identifiable information (PII) is strictly stored off-chain.

```mermaid
graph LR
    subgraph OffChain["Off-Chain (PostgreSQL + Encrypted Storage)"]
        StudentData["Student Name, Roll No, CGPA, Detailed Transcript"]
        DocFile["Official Degree PDF / Marksheet Image"]
    end

    subgraph Crypto["Cryptographic Processing"]
        Hasher["SHA-256 Hash Function"]
        Signer["Issuer Digital Signature (ECDSA)"]
    end

    subgraph OnChain["On-Chain (Hyperledger Fabric Ledger)"]
        CredID["Credential ID (SANAD-2026-000123)"]
        HashDigest["Document Hash: 4a8b79f83c11d293..."]
        Signature["Digital Signature: sig_ecdsa_..."]
        BlockState["Status: ACTIVE / REVOKED"]
    end

    StudentData --> Hasher
    DocFile --> Hasher
    Hasher --> HashDigest
    HashDigest --> Signer
    Signer --> Signature
    HashDigest --> OnChain
    Signature --> OnChain
```

---

## 4. Credential Issuance Lifecycle Flow

```mermaid
sequenceDiagram
    autonumber
    actor Officer as Authorized Issuing Officer
    participant API as SanadChain API
    participant Vault as Off-Chain Document Vault
    participant Ledger as Hyperledger Fabric
    participant NAD as DigiLocker / NAD Gateway
    actor Student as Student / Graduate

    Officer->>API: Submit student details & academic result
    API->>Vault: Store document payload & compute SHA-256 hash
    API->>API: Generate ECDSA / HMAC digital signature
    API->>Ledger: Invoke CreateCredential(id, hash, signature, mspId)
    Ledger-->>API: Confirm block commitment & transaction ID
    API->>NAD: Synchronize credential metadata to DigiLocker depository
    API->>API: Generate QR code pointing to /verify/{credentialId}
    API-->>Officer: Return Credential ID, QR code, and Printable Certificate
    API-->>Student: Deliver verifiable credential to student dashboard
```

---

## 5. Public Verification Flow (&lt; 1 Second)

```mermaid
sequenceDiagram
    autonumber
    actor Verifier as Employer / Public Verifier
    participant Web as SanadChain Public Portal
    participant API as Verification Service
    participant Ledger as Permissioned Ledger

    Verifier->>Web: Scan QR or enter Credential ID
    Web->>API: GET /api/verify/{credentialId}
    API->>Ledger: Query GetCredential(credentialId)
    Ledger-->>API: Return state: ACTIVE / REVOKED / NOT_FOUND
    API->>API: Validate issuer signature & ledger confirmation
    API-->>Web: Return JSON payload with measured latency
    Web-->>Verifier: Display status: VALID / REVOKED with block proof
```

---

## 6. Cryptographic Tamper Detection Model

```mermaid
graph LR
    OriginalDoc["Original Certificate Bytes"] --> HashOrig["SHA-256 Digest A"]
    AlteredDoc["Modified Certificate (1 bit changed)"] --> HashAltered["SHA-256 Digest B (Avalanche)"]
    
    HashOrig --> Ledger["Blockchain Anchored Hash A"]
    HashAltered -.-> Compare{"Compare with Ledger"}
    Ledger --> Compare
    Compare -->|Hash Mismatch| Alert["✕ TAMPER DETECTED Alert"]
```

---

## 7. Credential Lifecycle State Transitions

```mermaid
stateDiagram-v2
    [*] --> ISSUED: Institution Officer creates & signs credential
    ISSUED --> ACTIVE: Anchored on Hyperledger Fabric ledger
    ACTIVE --> SUSPENDED: Temporary administrative hold
    SUSPENDED --> ACTIVE: Reinstated after review
    ACTIVE --> REVOKED: Formal revocation (error, fraud, replacement)
    REVOKED --> REISSUED: Linked new credential generated (SANAD-00123-R1)
    REVOKED --> [*]
```

---

## 8. DigiLocker / NAD Interoperability Architecture

```mermaid
graph TD
    NAD["DigiLocker / National Academic Depository (NAD)"] --> Fetch["NADIntegrationService Adapter"]
    Fetch --> Normalize["Normalize to SanadChain Canonical Schema"]
    Normalize --> ComputeHash["Generate Canonical SHA-256 Digest"]
    ComputeHash --> CrossVerify["Cross-Verify with SanadChain Ledger"]
    CrossVerify --> Result["Unified Verification Certificate"]
    
    SanadIssued["SanadChain Issued Credential"] --> Push["NAD Sync Service"]
    Push --> Depository["DigiLocker Student Vault (digilocker://doc/...)"]
```
