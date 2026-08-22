import test from 'node:test';
import assert from 'node:assert/strict';
import { MockBlockchainService } from '../src/services/blockchain.js';

test('revocation retains immutable-style credential history', async () => {
  const ledger = new MockBlockchainService();
  await ledger.issueCredential({ credentialId: 'SANAD-TEST', institution: 'Test University' });
  await ledger.revokeCredential('SANAD-TEST', 'Administrative error');
  assert.equal((await ledger.getCredential('SANAD-TEST')).status, 'REVOKED');
  assert.equal((await ledger.getCredentialHistory('SANAD-TEST')).length, 2);
});
