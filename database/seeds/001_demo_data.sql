-- ==========================================================
-- SANADCHAIN - Initial Demo Seed Data (001_demo_data.sql)
-- Multi-role identities, institutions, credentials & audit history
-- ==========================================================

-- 1. SEED ROLES
INSERT INTO roles (id, name, description) VALUES
('SUPER_ADMIN', 'Super Administrator', 'National authority administrator overseeing the platform, network nodes, and institution onboarding'),
('INSTITUTION_ADMIN', 'Institution Administrator', 'University/college dean or registrar managing issuing officers, institution settings, and credential lifecycles'),
('ISSUING_OFFICER', 'Issuing Officer', 'Authorized academic office personnel creating, hashing, and submitting credentials for issuance'),
('STUDENT', 'Student / Graduate', 'Credential recipient viewing, downloading, and sharing digital academic proofs'),
('EMPLOYER_VERIFIER', 'Public / Employer Verifier', 'Third-party verifier querying credential authenticity without login')
ON CONFLICT (id) DO NOTHING;

-- 2. SEED INSTITUTIONS (4 Benchmark Organizations)
INSERT INTO institutions (id, name, institution_type, code, accreditation_ref, official_email, website, address, state, status, fabric_msp_id, approved_at) VALUES
('inst_authority', 'SanadChain National Academic Authority', 'Authority', 'SANAD-AUTH', 'NAAC-A-GOV-01', 'admin@sanadchain.gov', 'https://sanadchain.gov.in', 'Tech Hub, Cyber City, New Delhi', 'Delhi', 'APPROVED', 'SanadAuthorityMSP', '2026-01-01 00:00:00+00'),
('inst_abc', 'ABC University of Technology', 'University', 'ABC-UNIV-01', 'NAAC-A++-2024', 'registrar@abc.edu', 'https://abc.edu', '104 Academic Avenue, Bangalore', 'Karnataka', 'APPROVED', 'ABCUniversityMSP', '2026-01-15 10:00:00+00'),
('inst_xyz', 'XYZ Institute of Science & Engineering', 'Institute', 'XYZ-INST-02', 'NBA-TIER-1-89', 'admin@xyz.ac.in', 'https://xyz.ac.in', '42 Innovation Road, Pune', 'Maharashtra', 'APPROVED', 'XYZInstituteMSP', '2026-02-01 09:30:00+00'),
('inst_nat', 'National College of Professional Studies', 'College', 'NAT-COL-03', 'UGC-REC-2023', 'contact@nationalcollege.edu', 'https://nationalcollege.edu', '12 Heritage Boulevard, Hyderabad', 'Telangana', 'APPROVED', 'NationalCollegeMSP', '2026-02-10 14:00:00+00'),
('inst_pending_demo', 'Apex Global University (Pending Review)', 'University', 'APEX-UNIV-04', 'APEX-APP-992', 'vc@apexuniv.org', 'https://apexuniv.org', 'Sector 62, Noida', 'Uttar Pradesh', 'PENDING', NULL, NULL)
ON CONFLICT (id) DO NOTHING;

-- 3. SEED USERS (Passwords are bcrypt hashed 'Demo@123' / 'Admin@123' etc.)
-- Note: bcrypt hash for standard demo passwords
INSERT INTO users (id, email, password_hash, full_name, role, institution_id, student_reference, phone, status) VALUES
('usr_superadmin', 'superadmin@sanadchain.gov', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Dr. Rajesh Verma', 'SUPER_ADMIN', 'inst_authority', NULL, '+91-9876543210', 'ACTIVE'),
('usr_admin_abc', 'admin@abc.edu', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Dr. Meera Nair', 'INSTITUTION_ADMIN', 'inst_abc', NULL, '+91-9876543211', 'ACTIVE'),
('usr_officer_abc', 'officer@abc.edu', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Prof. Arvind Swaminathan', 'ISSUING_OFFICER', 'inst_abc', NULL, '+91-9876543212', 'ACTIVE'),
('usr_student_rahul', 'rahul@student.abc.edu', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Rahul Sharma', 'STUDENT', 'inst_abc', 'STU-2026-00123', '+91-9876543213', 'ACTIVE'),
('usr_student_ananya', 'ananya@student.abc.edu', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Ananya Patel', 'STUDENT', 'inst_abc', 'STU-2026-00124', '+91-9876543214', 'ACTIVE'),
('usr_student_arjun', 'arjun@student.xyz.ac.in', '$2a$10$rQ7wJgVdG7ZqLkWaJzWbceH8QkF.qFmK2mJp9Z1Wd8VlY2X.b6a6m', 'Arjun Kumar', 'STUDENT', 'inst_xyz', 'STU-2026-00125', '+91-9876543215', 'ACTIVE')
ON CONFLICT (id) DO NOTHING;

-- 4. SEED BENCHMARK CREDENTIALS
-- 1 VALID (Rahul), 1 REVOKED (Ananya), 1 REISSUED (Arjun)
INSERT INTO credentials (
    credential_id, institution_id, issuer_id, student_id, student_name, student_reference, 
    enrollment_number, credential_type, program, department, graduation_year, academic_result,
    issue_date, document_hash, digital_signature, transaction_id, block_number, status, is_reissued, source
) VALUES
(
    'SANAD-2026-000123', 'inst_abc', 'usr_admin_abc', 'usr_student_rahul', 'Rahul Sharma', 'STU-2026-00123',
    'ENR-2022-CS-042', 'Degree', 'Bachelor of Technology in Computer Science & Engineering', 'Computer Science', 2026, 'CGPA 9.24 / 10.0 (First Class with Distinction)',
    '2026-06-20', '4a8b79f83c11d29381e4a5bf607183e95bc7291a27e4c9e88d0172bf42589e41', 'sig_ecdsa_abc_77f482a93c4b8109d738f6194a20b', 'tx_fabric_482910fae9281bc830182472', 1842, 'ACTIVE', FALSE, 'SANADCHAIN'
),
(
    'SANAD-2026-000124', 'inst_abc', 'usr_admin_abc', 'usr_student_ananya', 'Ananya Patel', 'STU-2026-00124',
    'ENR-2022-EC-089', 'Degree', 'Bachelor of Technology in Electronics & Communication', 'Electronics & Comm', 2026, 'CGPA 8.85 / 10.0',
    '2026-06-21', '9f83c11d29381e4a5bf607183e95bc7291a27e4c9e88d0172bf42589e414a8b7', 'sig_ecdsa_abc_88a910dc842109e74281f6291a03c', 'tx_fabric_991823abf829029104820194', 1843, 'REVOKED', FALSE, 'SANADCHAIN'
),
(
    'SANAD-2026-000125', 'inst_xyz', 'usr_superadmin', 'usr_student_arjun', 'Arjun Kumar', 'STU-2026-00125',
    'ENR-2023-CA-014', 'Diploma', 'Post Graduate Diploma in Cloud Architecture', 'Computer Applications', 2026, 'Grade A+ (Distinction)',
    '2026-07-15', 'c11d29381e4a5bf607183e95bc7291a27e4c9e88d0172bf42589e414a8b79f83', 'sig_ecdsa_xyz_99f104ab729108c62910f5182a90d', 'tx_fabric_104820194abf829029991823', 1844, 'ACTIVE', FALSE, 'DIGILOCKER_NAD'
)
ON CONFLICT (credential_id) DO NOTHING;

-- 5. SEED REVOCATION RECORD FOR SANAD-2026-000124
INSERT INTO revocations (
    id, credential_id, revoked_by, reason, reason_code, revocation_transaction_id, block_number, is_public
) VALUES (
    'rev_000124', 'SANAD-2026-000124', 'usr_admin_abc', 'Credential revoked due to official correction of department elective credits; superseded by revised re-issue.',
    'REPLACED', 'tx_fabric_rev_991823abf829029104820194', 1845, TRUE
)
ON CONFLICT (id) DO NOTHING;

-- 6. SEED INTEGRATION CONFIGS
INSERT INTO integration_configs (id, service_name, mode, status, config_data) VALUES
('nad_primary', 'DigiLocker / National Academic Depository (NAD)', 'MOCK', 'CONFIGURED', '{"endpoint": "https://api.nad.digilocker.gov.in/mock/v2", "mockMode": true, "organizationCode": "SANAD-NAD-MOCK", "syncInterval": "24h"}'::jsonb),
('storage_s3', 'Encrypted Off-chain Document Vault', 'LOCAL_SECURE', 'ACTIVE', '{"provider": "OffChainVault", "encryption": "AES-256-GCM", "hashAlgorithm": "SHA-256"}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- 7. SEED AUDIT LOGS
INSERT INTO audit_logs (id, actor_name, actor_role, organization, action, resource, transaction_id, result) VALUES
('aud_01', 'System Initializer', 'SUPER_ADMIN', 'SanadChain Authority', 'Network Genesis', 'Fabric Channel [sanadchannel]', 'tx_genesis_0000', 'SUCCESS'),
('aud_02', 'Dr. Rajesh Verma', 'SUPER_ADMIN', 'SanadChain Authority', 'Approved Institution', 'ABC University of Technology (ABC-UNIV-01)', 'tx_fabric_onboard_01', 'SUCCESS'),
('aud_03', 'Dr. Meera Nair', 'INSTITUTION_ADMIN', 'ABC University', 'Issued Credential', 'SANAD-2026-000123 (Rahul Sharma)', 'tx_fabric_482910fae9281bc830182472', 'SUCCESS'),
('aud_04', 'Dr. Meera Nair', 'INSTITUTION_ADMIN', 'ABC University', 'Issued Credential', 'SANAD-2026-000124 (Ananya Patel)', 'tx_fabric_991823abf829029104820194', 'SUCCESS'),
('aud_05', 'Dr. Meera Nair', 'INSTITUTION_ADMIN', 'ABC University', 'Revoked Credential', 'SANAD-2026-000124 (Reason: Credit Correction)', 'tx_fabric_rev_991823abf829029104820194', 'SUCCESS')
ON CONFLICT (id) DO NOTHING;
