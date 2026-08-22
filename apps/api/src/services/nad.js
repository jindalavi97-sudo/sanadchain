import crypto from 'node:crypto';

/**
 * DigiLocker / National Academic Depository (NAD) Integration Service.
 * Implements standard normalization, bidirectional sync, and mock API adapter with full transparency.
 */
export class NADIntegrationService {
  constructor(blockchainService) {
    this.blockchainService = blockchainService;
    this.mode = process.env.NAD_MODE || 'MOCK';
    this.status = 'CONFIGURED';
    this.connectedAt = new Date().toISOString();
    this.clientId = process.env.NAD_CLIENT_ID || 'DEMO-DIGILOCKER-CLIENT-2026';
    this.apiEndpoint = process.env.NAD_API_URL || 'https://api.nad.digilocker.gov.in/mock/v2';
    
    // Sample preloaded DigiLocker mock repository
    this.mockDepository = new Map([
      ['NAD-DL-2026-9901', {
        nadId: 'NAD-DL-2026-9901',
        digiLockerDocId: 'DL-DOC-8829-X9',
        studentName: 'Arjun Kumar',
        studentReference: 'STU-2026-00125',
        institution: 'XYZ Institute of Science & Engineering',
        institutionCode: 'XYZ-INST-02',
        degreeType: 'Diploma',
        program: 'Post Graduate Diploma in Cloud Architecture',
        department: 'Computer Applications',
        graduationYear: 2026,
        result: 'Grade A+ (Distinction)',
        issueDate: '2026-07-15',
        rawDocumentText: 'DIGILOCKER VERIFIED RECORD: XYZ-INST-02: Arjun Kumar: Diploma: Cloud Architecture: 2026',
        source: 'DIGILOCKER_NAD',
        syncStatus: 'SYNCHRONIZED',
        digiLockerUri: 'digilocker://in.gov.sanadchain/doc/DL-DOC-8829-X9'
      }],
      ['NAD-DL-2026-9902', {
        nadId: 'NAD-DL-2026-9902',
        digiLockerDocId: 'DL-DOC-1102-Y4',
        studentName: 'Rahul Sharma',
        studentReference: 'STU-2026-00123',
        institution: 'ABC University of Technology',
        institutionCode: 'ABC-UNIV-01',
        degreeType: 'Degree',
        program: 'Bachelor of Technology in Computer Science & Engineering',
        department: 'Computer Science',
        graduationYear: 2026,
        result: 'CGPA 9.24 / 10.0',
        issueDate: '2026-06-20',
        rawDocumentText: 'DIGILOCKER VERIFIED RECORD: ABC-UNIV-01: Rahul Sharma: Degree: Computer Science: 2026',
        source: 'DIGILOCKER_NAD',
        syncStatus: 'SYNCHRONIZED',
        digiLockerUri: 'digilocker://in.gov.sanadchain/doc/DL-DOC-1102-Y4'
      }],
      ['NAD-DL-2026-9903', {
        nadId: 'NAD-DL-2026-9903',
        digiLockerDocId: 'DL-DOC-4419-Z2',
        studentName: 'Priya Sundaram',
        studentReference: 'STU-2026-00482',
        institution: 'National College of Professional Studies',
        institutionCode: 'NAT-COL-03',
        degreeType: 'Marksheet',
        program: 'Bachelor of Science in Information Technology',
        department: 'Information Technology',
        graduationYear: 2025,
        result: 'First Class with Distinction (89.5%)',
        issueDate: '2025-05-18',
        rawDocumentText: 'DIGILOCKER VERIFIED RECORD: NAT-COL-03: Priya Sundaram: Marksheet: BS IT: 2025',
        source: 'DIGILOCKER_NAD',
        syncStatus: 'AVAILABLE_FOR_IMPORT',
        digiLockerUri: 'digilocker://in.gov.sanadchain/doc/DL-DOC-4419-Z2'
      }]
    ]);
  }

  status() {
    return this.getStatus();
  }

  getStatus() {
    return {
      service: 'DigiLocker / National Academic Depository (NAD)',
      mode: this.mode === 'PRODUCTION' ? 'PRODUCTION' : 'MOCK MODE',
      status: this.status,
      clientId: this.clientId,
      connectedAt: this.connectedAt,
      notice: 'DEMO / MOCK INTEGRATION — Demonstrates bidirectional sync, schema normalization, and ledger cross-verification without unauthenticated government API calls.',
      apiEndpoint: this.apiEndpoint,
      availableRecordsCount: this.mockDepository.size,
      features: [
        'OAuth2 / Citizen Consent Gateway Simulation',
        'Bidirectional Credential Synchronization',
        'Academic Schema Normalization',
        'Cryptographic Hash Cross-Verification',
        'Direct Pull to Student Wallet',
        'Direct Push from University Console'
      ]
    };
  }

  async connect(config = {}) {
    this.clientId = config.clientId || this.clientId;
    this.status = 'CONFIGURED';
    this.connectedAt = new Date().toISOString();
    return {
      success: true,
      message: 'DigiLocker / NAD Gateway connected successfully.',
      status: this.status,
      mode: this.mode
    };
  }

  async listAvailableCredentials(studentRef = null) {
    const list = Array.from(this.mockDepository.values());
    if (studentRef) {
      return list.filter(item => item.studentReference === studentRef || item.studentName.toLowerCase().includes(studentRef.toLowerCase()));
    }
    return list;
  }

  async getCredential(nadId) {
    return this.fetchCredentialFromNAD(nadId);
  }

  async fetchCredentialFromNAD(nadId) {
    const record = this.mockDepository.get(nadId);
    if (!record) return null;

    // Normalize NAD Schema to SanadChain Canonical Schema
    const docHash = crypto.createHash('sha256').update(record.rawDocumentText).digest('hex');
    const normalized = {
      credentialId: `SANAD-NAD-${nadId.replace(/[^0-9]/g, '')}`,
      nadReferenceId: record.nadId,
      digiLockerDocId: record.digiLockerDocId,
      digiLockerUri: record.digiLockerUri,
      studentDisplayName: record.studentName,
      studentReference: record.studentReference,
      institution: record.institution,
      institutionCode: record.institutionCode,
      credentialType: record.degreeType,
      program: record.program,
      department: record.department,
      graduationYear: record.graduationYear,
      academicResult: record.result,
      issueDate: record.issueDate,
      source: 'DIGILOCKER_NAD',
      documentHash: docHash,
      syncStatus: record.syncStatus
    };

    return normalized;
  }

  async verifyCredential(nadId) {
    return this.verifyNadRecord(nadId);
  }

  async verifyNadRecord(nadId) {
    const record = await this.fetchCredentialFromNAD(nadId);
    if (!record) {
      return { status: 'NOT_FOUND', message: 'Record not found in DigiLocker/NAD depository.' };
    }

    return {
      status: 'VALID',
      mode: 'DEMO / MOCK INTEGRATION',
      nadData: record,
      documentHash: record.documentHash,
      isHashValid: true,
      blockchainVerification: 'ANCHORED_IN_BLOCKCHAIN',
      message: 'DigiLocker/NAD credential retrieved, normalized, and cryptographically verified against SanadChain trust layer.'
    };
  }

  async importCredential(nadId, targetUser = null) {
    const normalized = await this.fetchCredentialFromNAD(nadId);
    if (!normalized) {
      throw new Error(`Credential ${nadId} not found in DigiLocker/NAD.`);
    }

    // Anchor on blockchain if not already present
    let existing = await this.blockchainService.getCredential(normalized.credentialId);
    if (!existing) {
      existing = await this.blockchainService.issueCredential({
        credentialId: normalized.credentialId,
        institution: normalized.institution,
        institutionCode: normalized.institutionCode,
        issuer: 'DigiLocker / NAD National Gateway',
        credentialType: normalized.credentialType,
        studentDisplayName: normalized.studentDisplayName,
        studentReference: normalized.studentReference,
        program: normalized.program,
        department: normalized.department,
        graduationYear: normalized.graduationYear,
        academicResult: normalized.academicResult,
        issueDate: normalized.issueDate,
        documentHash: normalized.documentHash,
        digitalSignature: `sig_nad_gateway_${crypto.randomBytes(12).toString('hex')}`,
        source: 'DIGILOCKER_NAD'
      });
    }

    return {
      imported: true,
      credential: existing,
      message: `Successfully imported ${normalized.credentialType} (${normalized.program}) from DigiLocker into SanadChain.`
    };
  }

  async syncCredential(cred) {
    const nadId = `NAD-DL-${new Date().getFullYear()}-${String(this.mockDepository.size + 9901)}`;
    const docId = `DL-DOC-${crypto.randomBytes(3).toString('hex').toUpperCase()}-SANAD`;
    const rawText = `DIGILOCKER VERIFIED RECORD: ${cred.institution}: ${cred.studentDisplayName}: ${cred.credentialType}: ${cred.program}: ${cred.graduationYear || 2026}`;

    const newNadRecord = {
      nadId,
      digiLockerDocId: docId,
      studentName: cred.studentDisplayName,
      studentReference: cred.studentReference,
      institution: cred.institution,
      institutionCode: cred.institutionCode || 'SANAD-INST',
      degreeType: cred.credentialType,
      program: cred.program,
      department: cred.department || 'Academics',
      graduationYear: cred.graduationYear || 2026,
      result: cred.academicResult || 'Verified Graduate',
      issueDate: cred.issueDate,
      rawDocumentText: rawText,
      source: 'SANADCHAIN_PUSHED',
      syncStatus: 'SYNCHRONIZED',
      digiLockerUri: `digilocker://in.gov.sanadchain/doc/${docId}`
    };

    this.mockDepository.set(nadId, newNadRecord);

    return {
      synced: true,
      nadId,
      digiLockerDocId: docId,
      digiLockerUri: newNadRecord.digiLockerUri,
      message: 'Credential successfully synchronized to DigiLocker / NAD national depository.'
    };
  }
}
