# SanadChain

Academic credential infrastructure for secure, rapid and privacy-conscious verification. This prototype demonstrates credential issuance, SHA-256 hashing, signature proofs, QR links, public verification, tamper detection, revocation, audits and institution onboarding.

## Run locally

```bash
npm install
npm run dev
```

Open http://localhost:3000. Use `admin@abc.edu` / `Demo@123` for the institution console. Verify `SANAD-2026-000123` (valid) or `SANAD-2026-000124` (revoked).

## Blockchain modes

The default is clearly marked **DEMO MODE** and uses `MockBlockchainService`, a development blockchain simulator. It does not claim to be Hyperledger Fabric. Its service contract is the seam for a production `FabricBlockchainService`, which must use Fabric Gateway, CA-issued identities, TLS, endorsement policies and the credential chaincode. The frontend never talks to Fabric directly.

## Security and privacy

Documents are intended for object storage; only hash/proof and lifecycle metadata are ledger candidates. Production configuration needs PostgreSQL migrations, secure secret management, CSRF/rate limiting policies and malware scanning at the storage boundary. See [architecture](docs/architecture.md).
