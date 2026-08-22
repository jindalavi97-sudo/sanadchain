package main

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/hyperledger/fabric-contract-api-go/contractapi"
)

// SmartContract provides functions for managing Academic Credentials on Hyperledger Fabric
type SmartContract struct {
	contractapi.Contract
}

// Credential represents the on-chain metadata and cryptographic proof for an academic certificate
type Credential struct {
	CredentialID       string `json:"credentialId"`
	InstitutionID      string `json:"institutionId"`
	IssuerID           string `json:"issuerId"`
	StudentReference   string `json:"studentReference"`
	CredentialType     string `json:"credentialType"`
	Program            string `json:"program"`
	DocumentHash       string `json:"documentHash"` // SHA-256 Hash
	DigitalSignature   string `json:"digitalSignature"`
	IssueDate          string `json:"issueDate"`
	ExpiryDate         string `json:"expiryDate,omitempty"`
	Status             string `json:"status"` // ACTIVE, REVOKED, REISSUED
	RevocationReason   string `json:"revocationReason,omitempty"`
	RevokedAt          string `json:"revokedAt,omitempty"`
	RevokedBy          string `json:"revokedBy,omitempty"`
	ReissuedFromID     string `json:"reissuedFromId,omitempty"`
	ReissuedToID       string `json:"reissuedToId,omitempty"`
	TransactionID      string `json:"transactionId"`
	BlockNumber        uint64 `json:"blockNumber,omitempty"`
	CreatedAt          string `json:"createdAt"`
	UpdatedAt          string `json:"updatedAt"`
}

// CredentialHistoryEntry records the ledger state transitions for a credential
type CredentialHistoryEntry struct {
	TxID      string      `json:"txId"`
	Timestamp string      `json:"timestamp"`
	IsDelete  bool        `json:"isDelete"`
	Value     *Credential `json:"value"`
}

// InitLedger adds base genesis records if needed
func (s *SmartContract) InitLedger(ctx contractapi.TransactionContextInterface) error {
	fmt.Println("SanadChain Academic Credential Chaincode Initialized Successfully")
	return nil
}

// CreateCredential issues a new tamper-proof academic credential proof to the ledger
func (s *SmartContract) CreateCredential(
	ctx contractapi.TransactionContextInterface,
	credentialID string,
	institutionID string,
	issuerID string,
	studentRef string,
	credentialType string,
	program string,
	documentHash string,
	digitalSignature string,
	issueDate string,
) (*Credential, error) {
	// 1. Check if credential already exists
	exists, err := s.CredentialExists(ctx, credentialID)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("credential with ID %s already exists on ledger", credentialID)
	}

	// 2. Validate cryptographic hash length (SHA-256 must be 64 hex characters)
	if len(documentHash) != 64 {
		return nil, fmt.Errorf("invalid documentHash: must be a 64-character SHA-256 hex string")
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	now := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)

	cred := Credential{
		CredentialID:     credentialID,
		InstitutionID:    institutionID,
		IssuerID:         issuerID,
		StudentReference: studentRef,
		CredentialType:   credentialType,
		Program:          program,
		DocumentHash:     documentHash,
		DigitalSignature: digitalSignature,
		IssueDate:        issueDate,
		Status:           "ACTIVE",
		TransactionID:    txID,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	credJSON, err := json.Marshal(cred)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(credentialID, credJSON)
	if err != nil {
		return nil, fmt.Errorf("failed to put credential on ledger: %v", err)
	}

	// Set event for listeners
	_ = ctx.GetStub().SetEvent("CredentialIssued", credJSON)

	return &cred, nil
}

// GetCredential retrieves a credential record from the ledger
func (s *SmartContract) GetCredential(ctx contractapi.TransactionContextInterface, credentialID string) (*Credential, error) {
	credJSON, err := ctx.GetStub().GetState(credentialID)
	if err != nil {
		return nil, fmt.Errorf("failed to read from world state: %v", err)
	}
	if credJSON == nil {
		return nil, fmt.Errorf("credential %s does not exist", credentialID)
	}

	var cred Credential
	err = json.Unmarshal(credJSON, &cred)
	if err != nil {
		return nil, err
	}

	return &cred, nil
}

// VerifyCredential verifies credential authenticity, comparing documentHash and checking revocation
func (s *SmartContract) VerifyCredential(
	ctx contractapi.TransactionContextInterface,
	credentialID string,
	suppliedHash string,
) (map[string]interface{}, error) {
	cred, err := s.GetCredential(ctx, credentialID)
	if err != nil {
		return map[string]interface{}{
			"status":  "NOT_FOUND",
			"message": fmt.Sprintf("Credential %s not found on SanadChain ledger", credentialID),
		}, nil
	}

	isHashMatched := (suppliedHash == "" || cred.DocumentHash == suppliedHash)
	
	result := map[string]interface{}{
		"credentialId":     cred.CredentialID,
		"institutionId":    cred.InstitutionID,
		"issuerId":         cred.IssuerID,
		"credentialType":   cred.CredentialType,
		"program":          cred.Program,
		"issueDate":        cred.IssueDate,
		"ledgerStatus":     cred.Status,
		"transactionId":    cred.TransactionID,
		"hashMatched":      isHashMatched,
		"revocationReason": cred.RevocationReason,
		"revokedAt":        cred.RevokedAt,
	}

	if cred.Status == "REVOKED" {
		result["status"] = "REVOKED"
		result["message"] = "Credential has been formally revoked by issuing authority."
		return result, nil
	}

	if !isHashMatched {
		result["status"] = "TAMPERED"
		result["message"] = "Cryptographic hash mismatch. Document contents have been altered."
		return result, nil
	}

	result["status"] = "VALID"
	result["message"] = "Credential is authentic, verified, and active on SanadChain ledger."
	return result, nil
}

// RevokeCredential marks a credential as REVOKED with an audit reason while maintaining historical state
func (s *SmartContract) RevokeCredential(
	ctx contractapi.TransactionContextInterface,
	credentialID string,
	revocationReason string,
	revokedBy string,
) (*Credential, error) {
	cred, err := s.GetCredential(ctx, credentialID)
	if err != nil {
		return nil, err
	}

	if cred.Status == "REVOKED" {
		return nil, fmt.Errorf("credential %s is already revoked", credentialID)
	}

	txID := ctx.GetStub().GetTxID()
	txTimestamp, _ := ctx.GetStub().GetTxTimestamp()
	now := time.Unix(txTimestamp.Seconds, int64(txTimestamp.Nanos)).UTC().Format(time.RFC3339)

	cred.Status = "REVOKED"
	cred.RevocationReason = revocationReason
	cred.RevokedAt = now
	cred.RevokedBy = revokedBy
	cred.UpdatedAt = now

	credJSON, err := json.Marshal(cred)
	if err != nil {
		return nil, err
	}

	err = ctx.GetStub().PutState(credentialID, credJSON)
	if err != nil {
		return nil, err
	}

	_ = ctx.GetStub().SetEvent("CredentialRevoked", credJSON)

	return cred, nil
}

// ReissueCredential creates a linked revision of a previous credential while archiving the former
func (s *SmartContract) ReissueCredential(
	ctx contractapi.TransactionContextInterface,
	oldCredentialID string,
	newCredentialID string,
	institutionID string,
	issuerID string,
	studentRef string,
	credentialType string,
	program string,
	newDocumentHash string,
	digitalSignature string,
	issueDate string,
	reissueReason string,
) (*Credential, error) {
	// Revoke old credential
	_, err := s.RevokeCredential(ctx, oldCredentialID, fmt.Sprintf("Superseded by reissuance %s: %s", newCredentialID, reissueReason), issuerID)
	if err != nil {
		return nil, fmt.Errorf("failed to revoke superseded credential: %v", err)
	}

	// Create new linked credential
	newCred, err := s.CreateCredential(ctx, newCredentialID, institutionID, issuerID, studentRef, credentialType, program, newDocumentHash, digitalSignature, issueDate)
	if err != nil {
		return nil, err
	}

	newCred.ReissuedFromID = oldCredentialID
	newCredJSON, _ := json.Marshal(newCred)
	_ = ctx.GetStub().PutState(newCredentialID, newCredJSON)

	return newCred, nil
}

// GetCredentialHistory retrieves the full immutable audit trail of states for a credential ID
func (s *SmartContract) GetCredentialHistory(ctx contractapi.TransactionContextInterface, credentialID string) ([]CredentialHistoryEntry, error) {
	resultsIterator, err := ctx.GetStub().GetHistoryForKey(credentialID)
	if err != nil {
		return nil, err
	}
	defer resultsIterator.Close()

	var history []CredentialHistoryEntry
	for resultsIterator.HasNext() {
		response, err := resultsIterator.Next()
		if err != nil {
			return nil, err
		}

		var cred Credential
		if len(response.Value) > 0 {
			_ = json.Unmarshal(response.Value, &cred)
		}

		entry := CredentialHistoryEntry{
			TxID:      response.TxId,
			Timestamp: time.Unix(response.Timestamp.Seconds, int64(response.Timestamp.Nanos)).UTC().Format(time.RFC3339),
			IsDelete:  response.IsDelete,
			Value:     &cred,
		}
		history = append(history, entry)
	}

	return history, nil
}

// CredentialExists checks if a key exists on the ledger
func (s *SmartContract) CredentialExists(ctx contractapi.TransactionContextInterface, credentialID string) (bool, error) {
	credJSON, err := ctx.GetStub().GetState(credentialID)
	if err != nil {
		return false, fmt.Errorf("failed to read world state: %v", err)
	}
	return credJSON != nil, nil
}

func main() {
	chaincode, err := contractapi.NewChaincode(&SmartContract{})
	if err != nil {
		fmt.Printf("Error creating SanadChain chaincode: %s\n", err.Error())
		return
	}

	if err := chaincode.Start(); err != nil {
		fmt.Printf("Error starting SanadChain chaincode: %s\n", err.Error())
	}
}
