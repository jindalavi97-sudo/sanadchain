import crypto from 'node:crypto';

/**
 * Interface contract implemented by both MockBlockchainService (Development Simulator)
 * and FabricBlockchainService (Hyperledger Fabric Gateway).
 */
export class MockBlockchainService {
  constructor() {
    this.records = new Map();
    this.history = new Map();
    this.blocks = [];
    this.blockNumber = 1842;
    this.channelId = 'sanadchannel';
    this.genesisHash = '00000000000000000007a82b91c0e9821a7d65ef4920ab1289cf81902847a1bc';
    this.lastBlockHash = this.genesisHash;

    this.initGenesis();
  }

  initGenesis() {
    // Generate initial benchmark blocks
    this.addBlock('GENESIS', { network: 'SanadChain Fabric Network', channel: this.channelId, consensus: 'Raft' }, 'SanadAuthorityMSP');
  }

  addBlock(txType, payload, mspId = 'ABCUniversityMSP') {
    this.blockNumber += 1;
    const txId = `tx_fabric_${crypto.randomBytes(16).toString('hex')}`;
    const payloadStr = JSON.stringify(payload);
    const payloadHash = crypto.createHash('sha256').update(payloadStr).digest('hex');
    const blockHash = crypto.createHash('sha256').update(this.lastBlockHash + payloadHash + this.blockNumber).digest('hex');

    const tx = {
      transactionId: txId,
      blockNumber: this.blockNumber,
      blockHash,
      previousHash: this.lastBlockHash,
      channelId: this.channelId,
      txType,
      organization: mspId,
      payloadHash,
      endorsement: 'CONFIRMED',
      endorsementCount: 4,
      endorsers: ['peer0.sanadauthority.gov', 'peer0.abcuniv.edu', 'peer0.xyzinstitute.ac.in', 'peer0.nationalcollege.edu'],
      timestamp: new Date().toISOString()
    };

    this.lastBlockHash = blockHash;
    this.blocks.unshift(tx);
    if (this.blocks.length > 100) this.blocks.pop();

    return tx;
  }

  async issueCredential(record) {
    const msp = record.mspId || (record.institution && record.institution.includes('XYZ') ? 'XYZInstituteMSP' : 'ABCUniversityMSP');
    const tx = this.addBlock('ISSUE', { credentialId: record.credentialId, hash: record.documentHash }, msp);

    const fullRecord = {
      ...record,
      status: 'ACTIVE',
      transactionId: tx.transactionId,
      blockNumber: tx.blockNumber,
      blockHash: tx.blockHash,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.records.set(record.credentialId, fullRecord);
    this.history.set(record.credentialId, [{
      action: 'ISSUE',
      transactionId: tx.transactionId,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      documentHash: record.documentHash,
      issuer: record.issuer,
      status: 'ACTIVE'
    }]);

    return fullRecord;
  }

  async getCredential(id) {
    const cred = this.records.get(id);
    return cred ? { ...cred } : null;
  }

  async verifyCredential(id, suppliedHash = null) {
    const cred = await this.getCredential(id);
    if (!cred) {
      return {
        status: 'NOT_FOUND',
        message: 'Credential not found on SanadChain ledger. Please check the Credential ID.'
      };
    }

    const hashMatched = !suppliedHash || cred.documentHash === suppliedHash;

    if (cred.status === 'REVOKED') {
      return {
        status: 'REVOKED',
        credential: cred,
        message: 'This credential has been formally revoked by the issuing authority.'
      };
    }

    if (!hashMatched) {
      return {
        status: 'TAMPERED',
        credential: cred,
        message: 'Verification failed. The document hash does not match the blockchain record.'
      };
    }

    return {
      status: 'VALID',
      credential: cred,
      message: 'Credential is authentic, verified and active on the permissioned ledger.'
    };
  }

  async revokeCredential(id, reason, revokedBy = 'Institution Admin') {
    const item = await this.getCredential(id);
    if (!item) return null;

    const tx = this.addBlock('REVOKE', { credentialId: id, reason }, item.mspId || 'ABCUniversityMSP');

    item.status = 'REVOKED';
    item.revocationReason = reason;
    item.revokedAt = tx.timestamp;
    item.revokedBy = revokedBy;
    item.revocationTransaction = tx.transactionId;
    item.updatedAt = tx.timestamp;

    this.records.set(id, item);

    const hist = this.history.get(id) || [];
    hist.push({
      action: 'REVOKE',
      transactionId: tx.transactionId,
      blockNumber: tx.blockNumber,
      timestamp: tx.timestamp,
      documentHash: item.documentHash,
      reason,
      revokedBy,
      status: 'REVOKED'
    });
    this.history.set(id, hist);

    return item;
  }

  async reissueCredential(oldId, newRecord, reason, reissuedBy = 'Institution Admin') {
    const oldItem = await this.getCredential(oldId);
    if (!oldItem) return null;

    // Revoke previous version
    const revokedOld = await this.revokeCredential(oldId, `Replaced by re-issue ${newRecord.credentialId}: ${reason}`, reissuedBy);

    // Issue new version with linked reference
    const newCred = await this.issueCredential({
      ...newRecord,
      isReissued: true,
      reissuedFromId: oldId
    });

    revokedOld.reissuedToId = newRecord.credentialId;
    this.records.set(oldId, revokedOld);

    return newCred;
  }

  async getCredentialHistory(id) {
    return this.history.get(id) ?? [];
  }

  async getTransaction(id) {
    return this.blocks.find(x => x.transactionId === id) ?? null;
  }

  async getBlocks(limit = 20) {
    return this.blocks.slice(0, limit);
  }

  async getNetworkStatus() {
    return {
      mode: 'DEMO MODE',
      adapter: 'Development Blockchain Simulator',
      channel: this.channelId,
      peers: 4,
      organizations: 4,
      organizationList: [
        { name: 'SanadChain National Authority', msp: 'SanadAuthorityMSP', peer: 'peer0.sanadauthority.gov', status: 'HEALTHY', blockHeight: this.blockNumber },
        { name: 'ABC University of Technology', msp: 'ABCUniversityMSP', peer: 'peer0.abcuniv.edu', status: 'HEALTHY', blockHeight: this.blockNumber },
        { name: 'XYZ Institute of Science & Eng', msp: 'XYZInstituteMSP', peer: 'peer0.xyzinstitute.ac.in', status: 'HEALTHY', blockHeight: this.blockNumber },
        { name: 'National College of Studies', msp: 'NationalCollegeMSP', peer: 'peer0.nationalcollege.edu', status: 'HEALTHY', blockHeight: this.blockNumber }
      ],
      orderingService: 'Raft Cluster (3 Nodes)',
      consensusStatus: 'SYNCHRONIZED',
      chaincode: 'Active (v2.4.0)',
      chaincodeName: 'sanad-credential-contract',
      latestBlock: this.blockNumber,
      totalTransactions: this.blocks.length + 1842
    };
  }
}

/**
 * Hyperledger Fabric Gateway Integration Service.
 * Used when running against a live Fabric network (e.g. docker-compose.fabric.yml).
 */
export class FabricBlockchainService {
  constructor(config = {}) {
    this.channelName = config.channelName || process.env.FABRIC_CHANNEL || 'sanadchannel';
    this.chaincodeName = config.chaincodeName || process.env.FABRIC_CHAINCODE || 'sanad-credential-contract';
    this.mspId = config.mspId || process.env.FABRIC_MSP_ID || 'ABCUniversityMSP';
    this.gateway = null;
    this.network = null;
    this.contract = null;
  }

  async connect() {
    // In production, instantiate @hyperledger/fabric-gateway or fabric-network Client
    throw new Error('Fabric Gateway requires valid cryptographic certificates in MSP folder. Switch to Development Blockchain Simulator via MOCK_BLOCKCHAIN=true if running standalone.');
  }

  async issueCredential(record) { return this.connect(); }
  async getCredential(id) { return this.connect(); }
  async verifyCredential(id, hash) { return this.connect(); }
  async revokeCredential(id, reason) { return this.connect(); }
  async getCredentialHistory(id) { return this.connect(); }
  async getNetworkStatus() { return this.connect(); }
}
