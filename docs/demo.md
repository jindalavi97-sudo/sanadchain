# Evaluator & Hackathon Judge Guide — SanadChain

## 1. Quick-Start Benchmark Verification

| Test Scenario | Credential ID | Expected Status | Key Features to Observe |
| :--- | :--- | :---: | :--- |
| **Valid Benchmark Degree** | `SANAD-NAD-20269901` | **`VALID`** | Block #1848 proof, sub-second latency (`⏱ 0.001s`), AI Trust Score `98.6%`, UGC NAAC A++ accreditation. |
| **Tampered / Altered Degree** | `SANAD-2026-000123` + altered file | **`TAMPER DETECTED`** | Side-by-side SHA-256 hex diffing, instant forgery alert. |
| **Revoked Degree** | `SANAD-2026-000124` | **`REVOKED`** | Formal revocation reason, timestamp, lifecycle provenance. |
| **DigiLocker Synced Record** | `SANAD-2026-000125` | **`VALID`** | Bi-directional DigiLocker synchronization badge and URI. |

---

## 2. Interactive 6-Step Evaluation Tour

Navigate to [http://localhost:3000/judge-demo](http://localhost:3000/judge-demo) for a guided walkthrough:
1. **Verification Speed**: Test sub-second public zero-login queries.
2. **Cryptographic Tamper Detection**: Test the interactive hex diff sandbox at `/security-demo`.
3. **Institutional Onboarding**: Experience the 5-step registration wizard at `/onboarding`.
4. **DigiLocker Bi-directional Link**: Experience `/nad` import and push workflows.
5. **Hyperledger Explorer**: Inspect real blocks, peers, and Raft consensus at `/explorer`.
6. **AI Credential Intelligence**: Test real-time neural anomaly scoring at `/ai-detector`.
