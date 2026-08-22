-- ==========================================================
-- SANADCHAIN - PostgreSQL Database Schema Migration (001_initial_schema.sql)
-- Architecture: Multi-tenant, Permissioned Academic Trust Layer
-- ==========================================================

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ROLES TABLE
CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. INSTITUTIONS TABLE
CREATE TABLE IF NOT EXISTS institutions (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    institution_type VARCHAR(100) NOT NULL, -- University, College, Institute, Authority
    code VARCHAR(50) UNIQUE NOT NULL,
    accreditation_ref VARCHAR(100),
    official_email VARCHAR(255) UNIQUE NOT NULL,
    website VARCHAR(255),
    address TEXT,
    state VARCHAR(100),
    country VARCHAR(100) DEFAULT 'India',
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED, SUSPENDED
    fabric_msp_id VARCHAR(100),
    public_key TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    approved_by VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. USERS TABLE
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL REFERENCES roles(id),
    institution_id VARCHAR(64) REFERENCES institutions(id) ON DELETE SET NULL,
    student_reference VARCHAR(100),
    phone VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ACTIVE',
    two_factor_enabled BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. INSTITUTION USERS (Mapping & Staff)
CREATE TABLE IF NOT EXISTS institution_users (
    id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id) ON DELETE CASCADE,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(100),
    department VARCHAR(100),
    can_issue BOOLEAN DEFAULT FALSE,
    can_revoke BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(institution_id, user_id)
);

-- 5. CREDENTIALS TABLE (Master Registry & Off-chain metadata)
CREATE TABLE IF NOT EXISTS credentials (
    credential_id VARCHAR(64) PRIMARY KEY,
    institution_id VARCHAR(64) NOT NULL REFERENCES institutions(id),
    issuer_id VARCHAR(64) NOT NULL REFERENCES users(id),
    student_id VARCHAR(64) REFERENCES users(id) ON DELETE SET NULL,
    student_name VARCHAR(255) NOT NULL,
    student_reference VARCHAR(100) NOT NULL,
    enrollment_number VARCHAR(100),
    credential_type VARCHAR(100) NOT NULL, -- Degree, Diploma, Marksheet, Transcript, Certificate, Provisional
    program VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    graduation_year INTEGER,
    academic_result VARCHAR(50), -- CGPA 8.9, First Class with Distinction, etc.
    issue_date DATE NOT NULL,
    expiry_date DATE,
    document_hash VARCHAR(64) NOT NULL, -- SHA-256 Hex Hash (32 bytes = 64 hex chars)
    digital_signature TEXT NOT NULL,
    transaction_id VARCHAR(128) NOT NULL,
    block_number BIGINT NOT NULL,
    status VARCHAR(50) DEFAULT 'ACTIVE', -- ACTIVE, REVOKED, REISSUED, EXPIRED
    is_reissued BOOLEAN DEFAULT FALSE,
    reissued_from_id VARCHAR(64) REFERENCES credentials(credential_id),
    reissued_to_id VARCHAR(64),
    source VARCHAR(50) DEFAULT 'SANADCHAIN', -- SANADCHAIN, DIGILOCKER_NAD, MANUAL_IMPORT
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. CREDENTIAL VERSIONS & HISTORY
CREATE TABLE IF NOT EXISTS credential_versions (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) NOT NULL REFERENCES credentials(credential_id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    action VARCHAR(50) NOT NULL, -- ISSUE, REVOKE, REISSUE, UPDATE
    document_hash VARCHAR(64) NOT NULL,
    transaction_id VARCHAR(128) NOT NULL,
    block_number BIGINT NOT NULL,
    performed_by VARCHAR(64) NOT NULL REFERENCES users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. CREDENTIAL DOCUMENTS (Off-chain Document metadata)
CREATE TABLE IF NOT EXISTS credential_documents (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) NOT NULL REFERENCES credentials(credential_id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    file_size_bytes BIGINT NOT NULL,
    mime_type VARCHAR(100) NOT NULL,
    storage_path TEXT NOT NULL,
    sha256_hash VARCHAR(64) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. REVOCATIONS TABLE
CREATE TABLE IF NOT EXISTS revocations (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) NOT NULL REFERENCES credentials(credential_id) ON DELETE CASCADE,
    revoked_by VARCHAR(64) NOT NULL REFERENCES users(id),
    reason TEXT NOT NULL,
    reason_code VARCHAR(50) NOT NULL, -- ADMINISTRATIVE_ERROR, FRAUD, REPLACED, DUPLICATE, OTHER
    revocation_transaction_id VARCHAR(128) NOT NULL,
    block_number BIGINT NOT NULL,
    is_public BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. CREDENTIAL VERIFICATIONS (Analytics & Audit of Public Checks)
CREATE TABLE IF NOT EXISTS credential_verifications (
    id VARCHAR(64) PRIMARY KEY,
    credential_id VARCHAR(64) REFERENCES credentials(credential_id) ON DELETE SET NULL,
    verification_type VARCHAR(50) NOT NULL, -- QR_SCAN, ID_SEARCH, FILE_HASH_CHECK, NAD_SYNC
    verification_result VARCHAR(50) NOT NULL, -- VALID, TAMPERED, REVOKED, NOT_FOUND
    verifier_ip VARCHAR(100),
    user_agent TEXT,
    latency_ms NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. AUDIT LOGS (Immutable System Events)
CREATE TABLE IF NOT EXISTS audit_logs (
    id VARCHAR(64) PRIMARY KEY,
    actor_id VARCHAR(64),
    actor_name VARCHAR(255) NOT NULL,
    actor_role VARCHAR(50) NOT NULL,
    organization VARCHAR(255) NOT NULL,
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(255) NOT NULL,
    ip_address VARCHAR(100),
    transaction_id VARCHAR(128),
    result VARCHAR(50) DEFAULT 'SUCCESS',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. BLOCKCHAIN TRANSACTIONS (Mirror of Ledger Blocks)
CREATE TABLE IF NOT EXISTS blockchain_transactions (
    transaction_id VARCHAR(128) PRIMARY KEY,
    block_number BIGINT NOT NULL,
    organization VARCHAR(100) NOT NULL,
    peer_msp VARCHAR(100) NOT NULL,
    channel_id VARCHAR(100) DEFAULT 'sanadchannel',
    tx_type VARCHAR(50) NOT NULL, -- ISSUE, REVOKE, REISSUE, ONBOARD
    credential_id VARCHAR(64),
    payload_hash VARCHAR(64) NOT NULL,
    endorsement VARCHAR(50) DEFAULT 'CONFIRMED',
    timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. INTEGRATION CONFIGS (DigiLocker / NAD / Storage)
CREATE TABLE IF NOT EXISTS integration_configs (
    id VARCHAR(50) PRIMARY KEY,
    service_name VARCHAR(100) NOT NULL,
    mode VARCHAR(50) DEFAULT 'MOCK', -- MOCK, PRODUCTION, SANDBOX
    status VARCHAR(50) DEFAULT 'CONFIGURED',
    config_data JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. NOTIFICATIONS TABLE
CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    type VARCHAR(50) DEFAULT 'INFO', -- INFO, SUCCESS, WARNING, DANGER
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ==========================================================
-- INDEXES FOR HIGH-THROUGHPUT LOOKUPS & < 2s VERIFICATION
-- ==========================================================
CREATE INDEX IF NOT EXISTS idx_credentials_id ON credentials(credential_id);
CREATE INDEX IF NOT EXISTS idx_credentials_hash ON credentials(document_hash);
CREATE INDEX IF NOT EXISTS idx_credentials_inst ON credentials(institution_id);
CREATE INDEX IF NOT EXISTS idx_credentials_status ON credentials(status);
CREATE INDEX IF NOT EXISTS idx_credentials_tx ON credentials(transaction_id);
CREATE INDEX IF NOT EXISTS idx_credentials_student_ref ON credentials(student_reference);
CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_verifications_cred ON credential_verifications(credential_id);
CREATE INDEX IF NOT EXISTS idx_tx_block ON blockchain_transactions(block_number DESC);
