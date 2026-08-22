import crypto from 'node:crypto';

/** Contract shared by MockBlockchainService and FabricBlockchainService. */
export class MockBlockchainService {
  constructor() { this.records = new Map(); this.history = new Map(); this.block = 1842; }
  tx(type, credentialId, organization = 'University A') {
    return { transactionId: `mocktx_${crypto.randomBytes(12).toString('hex')}`, blockNumber: ++this.block, type, credentialId, organization, timestamp: new Date().toISOString(), endorsement: 'CONFIRMED' };
  }
  async issueCredential(record) { const tx = this.tx('ISSUE', record.credentialId, record.institution); const next = { ...record, ...tx, status: 'ACTIVE' }; this.records.set(record.credentialId, next); this.history.set(record.credentialId, [tx]); return next; }
  async getCredential(id) { return this.records.get(id) ?? null; }
  async verifyCredential(id) { return this.getCredential(id); }
  async revokeCredential(id, reason) { const item = await this.getCredential(id); if (!item) return null; const tx = this.tx('REVOKE', id, item.institution); Object.assign(item, { status: 'REVOKED', revocationReason: reason, revokedAt: tx.timestamp, revocationTransaction: tx.transactionId }); this.history.get(id).push(tx); return item; }
  async getCredentialHistory(id) { return this.history.get(id) ?? []; }
  async getTransaction(id) { return [...this.history.values()].flat().find(x => x.transactionId === id) ?? null; }
  async getNetworkStatus() { return { mode: 'DEMO MODE', adapter: 'Development Blockchain Simulator', peers: 4, organizations: 4, orderingService: 'Healthy', chaincode: 'Active', latestBlock: this.block }; }
}

/** Production adapter seam. Implement Fabric Gateway calls here; never expose it to the browser. */
export class FabricBlockchainService {
  constructor() { throw new Error('Fabric adapter requires a configured Fabric Gateway connection. Set MOCK_BLOCKCHAIN=false after provisioning network identities.'); }
}
