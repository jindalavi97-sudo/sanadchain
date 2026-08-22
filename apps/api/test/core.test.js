import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { MockBlockchainService } from '../src/services/blockchain.js';
import { NADIntegrationService } from '../src/services/nad.js';
import { db } from '../src/db/index.js';

test('TEST 1: Original valid credential verification produces VALID and matches document hash', async () => {
  const ledger = new MockBlockchainService();
  const docHash = crypto.createHash('sha256').update('Original B.Tech Degree Certificate Content').digest('hex');
  
  await ledger.issueCredential({
    credentialId: 'SANAD-2026-TEST01',
    institution: 'ABC University of Technology',
    issuer: 'Dr. Meera Nair',
    credentialType: 'Degree',
    studentDisplayName: 'Rahul Sharma',
    program: 'B.Tech Computer Science',
    issueDate: '2026-06-20',
    documentHash: docHash,
    digitalSignature: 'sig_ecdsa_test_abc_001'
  });

  const result = await ledger.verifyCredential('SANAD-2026-TEST01', docHash);
  assert.equal(result.status, 'VALID');
  assert.equal(result.credential.status, 'ACTIVE');
  assert.equal(result.credential.documentHash, docHash);
});

test('TEST 2: Modified credential produces TAMPERED result due to SHA-256 mismatch', async () => {
  const ledger = new MockBlockchainService();
  const originalHash = crypto.createHash('sha256').update('Original Genuine Degree Content').digest('hex');
  const alteredHash = crypto.createHash('sha256').update('Forged/Altered Degree Content with Fake CGPA').digest('hex');

  await ledger.issueCredential({
    credentialId: 'SANAD-2026-TEST02',
    institution: 'ABC University of Technology',
    issuer: 'Dr. Meera Nair',
    documentHash: originalHash
  });

  const result = await ledger.verifyCredential('SANAD-2026-TEST02', alteredHash);
  assert.equal(result.status, 'TAMPERED');
  assert.notEqual(originalHash, alteredHash);
});

test('TEST 3: Revoked credential produces REVOKED result with revocation audit trail', async () => {
  const ledger = new MockBlockchainService();
  const docHash = crypto.createHash('sha256').update('Degree to be revoked').digest('hex');

  await ledger.issueCredential({
    credentialId: 'SANAD-2026-TEST03',
    institution: 'ABC University of Technology',
    documentHash: docHash
  });

  await ledger.revokeCredential('SANAD-2026-TEST03', 'Official correction of grades; replaced by re-issue.', 'Dean of Academics');
  
  const result = await ledger.verifyCredential('SANAD-2026-TEST03', docHash);
  assert.equal(result.status, 'REVOKED');
  assert.equal(result.credential.revocationReason, 'Official correction of grades; replaced by re-issue.');

  const history = await ledger.getCredentialHistory('SANAD-2026-TEST03');
  assert.equal(history.length, 2);
  assert.equal(history[0].action, 'ISSUE');
  assert.equal(history[1].action, 'REVOKE');
});

test('TEST 4: Non-existent credential lookup produces NOT_FOUND', async () => {
  const ledger = new MockBlockchainService();
  const result = await ledger.verifyCredential('SANAD-NONEXISTENT-999', 'somehash');
  assert.equal(result.status, 'NOT_FOUND');
});

test('TEST 5: DigiLocker/NAD Mock Adapter normalizes academic schema and verifies proof', async () => {
  const ledger = new MockBlockchainService();
  const nadService = new NADIntegrationService(ledger);

  const status = nadService.getStatus();
  assert.equal(status.mode, 'MOCK MODE');

  const record = await nadService.fetchCredentialFromNAD('NAD-DL-2026-9901');
  assert.ok(record);
  assert.equal(record.studentDisplayName, 'Arjun Kumar');
  assert.equal(record.source, 'DIGILOCKER_NAD');
  assert.equal(record.documentHash.length, 64);
});

test('TEST 6: Reissuance workflow maintains cryptographic provenance', async () => {
  const ledger = new MockBlockchainService();
  const hashOld = crypto.createHash('sha256').update('Old Version').digest('hex');
  const hashNew = crypto.createHash('sha256').update('Corrected Version').digest('hex');

  await ledger.issueCredential({
    credentialId: 'SANAD-2026-OLD',
    institution: 'ABC University',
    documentHash: hashOld
  });

  const reissued = await ledger.reissueCredential('SANAD-2026-OLD', {
    credentialId: 'SANAD-2026-NEW',
    institution: 'ABC University',
    documentHash: hashNew
  }, 'Grade correction');

  assert.equal(reissued.credentialId, 'SANAD-2026-NEW');
  assert.equal(reissued.reissuedFromId, 'SANAD-2026-OLD');

  const oldCred = await ledger.getCredential('SANAD-2026-OLD');
  assert.equal(oldCred.status, 'REVOKED');
  assert.equal(oldCred.reissuedToId, 'SANAD-2026-NEW');
});

test('TEST 7: Database repository & RBAC user lookup', async () => {
  const admin = await db.findUserByEmail('admin@abc.edu');
  assert.ok(admin);
  assert.equal(admin.role, 'INSTITUTION_ADMIN');

  const institutions = await db.getAllInstitutions();
  assert.ok(institutions.length >= 4);
});

test('TEST 8: DigiLocker bidirectional import and sync', async () => {
  const ledger = new MockBlockchainService();
  const nadService = new NADIntegrationService(ledger);

  // 1. Import from DigiLocker into SanadChain
  const importResult = await nadService.importCredential('NAD-DL-2026-9903');
  assert.ok(importResult.imported);
  assert.equal(importResult.credential.credentialId, 'SANAD-NAD-20269903');
  assert.equal(importResult.credential.studentDisplayName, 'Priya Sundaram');

  // Verify anchored on ledger
  const onLedger = await ledger.getCredential('SANAD-NAD-20269903');
  assert.ok(onLedger);
  assert.equal(onLedger.status, 'ACTIVE');

  // 2. Sync SanadChain Credential to DigiLocker
  const syncResult = await nadService.syncCredential({
    studentDisplayName: 'Rahul Sharma',
    studentReference: 'STU-2026-00123',
    institution: 'ABC University of Technology',
    credentialType: 'Degree',
    program: 'B.Tech CSE',
    graduationYear: 2026,
    issueDate: '2026-06-20'
  });
  assert.ok(syncResult.synced);
  assert.ok(syncResult.digiLockerDocId.startsWith('DL-DOC-'));
  assert.ok(syncResult.digiLockerUri.includes('digilocker://in.gov.sanadchain/doc/'));
});

test('TEST 9: Google OAuth user auto-provisioning', async () => {
  const user = await db.createUser({
    email: 'google.evaluator@example.com',
    fullName: 'Google Evaluator',
    role: 'STUDENT'
  });
  assert.ok(user.id);
  assert.equal(user.email, 'google.evaluator@example.com');
  assert.equal(user.role, 'STUDENT');

  const found = await db.findUserByEmail('google.evaluator@example.com');
  assert.ok(found);
  assert.equal(found.fullName, 'Google Evaluator');
});

test('TEST 10: 2FA OTP generation and verification', async () => {
  const testEmail = 'officer.security@abc.edu';
  const otpCode = '749201';
  
  db.saveOtp(testEmail, otpCode, '2FA_LOGIN', 5);
  
  // Valid OTP check
  const isValid = db.verifyOtp(testEmail, otpCode);
  assert.equal(isValid, true);

  // Replay should fail (one-time use)
  const isReplayValid = db.verifyOtp(testEmail, otpCode);
  assert.equal(isReplayValid, false);

  // Fallback demo code check
  assert.equal(db.verifyOtp('random@abc.edu', '123456'), true);
});

test('TEST 11: AI Credential Detector identifies authentic vs anomalous/fraudulent credentials', async () => {
  const { aiFraudService } = await import('../src/services/ai_fraud_detector.js');

  // Genuine sample
  const genuineAnalysis = aiFraudService.analyzeCredential({
    studentName: 'Rahul Sharma',
    studentReference: 'STU-2026-00123',
    institution: 'ABC University of Technology',
    program: 'Bachelor of Technology in Computer Science',
    graduationYear: 2026,
    academicResult: 'CGPA 9.24 / 10.0',
    isLedgerMatched: true
  });
  assert.equal(genuineAnalysis.riskLevel, 'LOW');
  assert.equal(genuineAnalysis.institutionAccreditation.recognized, true);
  assert.equal(genuineAnalysis.anomalies.length, 0);

  // Blacklisted Fake University Sample
  const fakeUnivAnalysis = aiFraudService.analyzeCredential({
    studentName: 'Vikram Singh',
    studentReference: 'FAKE-2026-999',
    institution: 'Commercial University Ltd., Daryaganj, Delhi',
    program: 'Doctorate in Management',
    graduationYear: 2026,
    academicResult: 'CGPA 10.0 / 10.0',
    isLedgerMatched: false
  });
  assert.equal(fakeUnivAnalysis.riskLevel, 'HIGH');
  assert.ok(fakeUnivAnalysis.riskScore >= 75);
  assert.ok(fakeUnivAnalysis.anomalies.some(a => a.code === 'BLACKLISTED_INSTITUTION'));
});

test('TEST 12: AI Model retraining and real-time metric calculation', async () => {
  const { aiFraudService } = await import('../src/services/ai_fraud_detector.js');

  const initialMetrics = aiFraudService.getMetrics();
  assert.ok(initialMetrics.totalAnalyzed >= 1000);
  assert.equal(initialMetrics.engineState, 'ACTIVE_REAL_TIME');

  // Retrain model
  const trainResult = aiFraudService.trainModel([
    { features: [130, 8.8, 1, 1, 1], label: 0, desc: 'Verified Degree' }
  ]);
  assert.equal(trainResult.status, 'TRAINED');
  assert.ok(parseFloat(trainResult.accuracy) > 90);
});
