import { Contract } from 'fabric-contract-api';

export class CredentialContract extends Contract {
  constructor() {
    super('SanadChainCredentialContract');
  }

  async initLedger(ctx) {
    console.info('SanadChain Node.js Chaincode Initialized');
  }

  async CreateCredential(ctx, credentialId, institutionId, issuerId, studentRef, credentialType, program, documentHash, digitalSignature, issueDate) {
    const exists = await this.CredentialExists(ctx, credentialId);
    if (exists) {
      throw new Error(`Credential ${credentialId} already exists on ledger.`);
    }

    const txId = ctx.stub.getTxID();
    const timestamp = new Date(ctx.stub.getTxTimestamp().seconds.low * 1000).toISOString();

    const credential = {
      credentialId,
      institutionId,
      issuerId,
      studentReference: studentRef,
      credentialType,
      program,
      documentHash,
      digitalSignature,
      issueDate,
      status: 'ACTIVE',
      transactionId: txId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(credential)));
    ctx.stub.setEvent('CredentialIssued', Buffer.from(JSON.stringify(credential)));
    return JSON.stringify(credential);
  }

  async GetCredential(ctx, credentialId) {
    const data = await ctx.stub.getState(credentialId);
    if (!data || data.length === 0) {
      throw new Error(`Credential ${credentialId} does not exist`);
    }
    return data.toString();
  }

  async VerifyCredential(ctx, credentialId, suppliedHash) {
    const credBytes = await ctx.stub.getState(credentialId);
    if (!credBytes || credBytes.length === 0) {
      return JSON.stringify({ status: 'NOT_FOUND', message: 'Credential not found' });
    }
    const cred = JSON.parse(credBytes.toString());
    const hashMatched = !suppliedHash || cred.documentHash === suppliedHash;

    if (cred.status === 'REVOKED') {
      return JSON.stringify({ status: 'REVOKED', credential: cred, message: 'Credential has been revoked' });
    }
    if (!hashMatched) {
      return JSON.stringify({ status: 'TAMPERED', credential: cred, message: 'SHA-256 hash mismatch' });
    }
    return JSON.stringify({ status: 'VALID', credential: cred, message: 'Credential verified' });
  }

  async RevokeCredential(ctx, credentialId, reason, revokedBy) {
    const credBytes = await ctx.stub.getState(credentialId);
    if (!credBytes || credBytes.length === 0) {
      throw new Error(`Credential ${credentialId} does not exist`);
    }
    const cred = JSON.parse(credBytes.toString());
    cred.status = 'REVOKED';
    cred.revocationReason = reason;
    cred.revokedBy = revokedBy;
    cred.revokedAt = new Date().toISOString();

    await ctx.stub.putState(credentialId, Buffer.from(JSON.stringify(cred)));
    ctx.stub.setEvent('CredentialRevoked', Buffer.from(JSON.stringify(cred)));
    return JSON.stringify(cred);
  }

  async CredentialExists(ctx, credentialId) {
    const data = await ctx.stub.getState(credentialId);
    return data && data.length > 0;
  }
}
