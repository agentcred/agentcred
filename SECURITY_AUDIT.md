# Security Audit Report & Fixes

**Audit Tool:** [Nethermind AuditAgent](https://app.auditagent.nethermind.io/)  
**Date:** November 23, 2025  
**Audited Contracts:** `AgentStaking.sol`, `ContentRegistry.sol`

---

## Executive Summary

AuditAgent identified **5 security issues** across our smart contracts:
- **1 High Severity** - NFT ownership bypass allowing stake hijacking
- **1 Medium Severity** - Repeated audit manipulation
- **2 Info** - Balance inconsistency and audit logic mismatch  
- **1 Best Practice** - Zero-amount slashing

All critical issues have been **fixed and tested**.

---

## Vulnerabilities Found

### 🔴 **HIGH SEVERITY**

#### Issue #1: First staker can hijack agent staking without owning the agent NFT

**Contract:** `AgentStaking.sol`  
**Function:** `stake(uint256 _agentId, uint256 _amount)`  
**Line:** 46-69

**Description:**  
Any address can be the first to stake for a valid `agentId`, becoming `agentOwners[agentId]` permanently. This blocks the legitimate NFT holder from staking/unstaking for their own agent.

**Attack Scenario:**
1. Alice owns Agent NFT #123
2. Bob sees Alice's agent and front-runs with 1 wei stake
3. Bob becomes `agentOwners[123]`
4. Alice can never stake for her own agent

**Impact:**  
- Malicious actors can prevent real owners from participating in economic layer
- Breaks skin-in-the-game incentive model
- Enables griefing attacks with minimal cost

**Root Cause:**
```solidity
// BEFORE: Only checks if agent exists, not ownership
if (identityRegistry != address(0)) {
    try IERC721(identityRegistry).ownerOf(_agentId) returns (address) {
        // Agent exists (but no ownership check!)
    } catch {
        revert("Agent not registered");
    }
}
// First caller wins
if (stakes[_agentId] == 0) {
    agentOwners[_agentId] = msg.sender; // ❌ VULNERABILITY
}
```

---

### 🟡 **MEDIUM SEVERITY**

#### Issue #2: Audits are not one-shot - updateAuditResult can be called repeatedly

**Contract:** `ContentRegistry.sol`  
**Function:** `updateAuditResult(string memory _contentHash, bool _ok, uint256 _score)`  
**Line:** 115-134

**Description:**  
No guard prevents re-auditing the same content. Each call re-applies reputation deltas and slashing, allowing unbounded manipulation.

**Attack Scenario:**
1. Content is audited and fails (score 10)
2. Agent is slashed 15% of stake
3. Auditor calls `updateAuditResult` again with same content
4. Agent is slashed another 15%
5. Repeat until stake is drained

**Impact:**
- Authorized auditors can arbitrarily drain agent stakes
- Reputation scores can be inflated/deflated without limit
- Violates immutable audit trail principle

**Root Cause:**
```solidity
// BEFORE: No status check
function updateAuditResult(string memory _contentHash, bool _ok, uint256 _score) 
    external onlyRole(AUDITOR_ROLE) 
{
    Content storage content = contents[_contentHash];
    // ❌ No check if already audited
    content.status = _ok ? Status.AuditedOk : Status.AuditedFail;
    _updateReputation(...); // Reapplies delta every call
    if (!_ok) {
        _handleSlashing(...); // Can slash repeatedly
    }
}
```

---

### ℹ️ **INFO**

#### Issue #3: ERC-20 balance can exceed recorded stakes

**Contract:** `AgentStaking.sol`

**Description:**  
Direct token transfers to the contract break the invariant `balanceOf(this) == Σ stakes[agentId]`.

**Impact:** Breaks assumptions for external indexers and accounting systems.

---

#### Issue #4: Inconsistent sources of truth for audit outcome

**Contract:** `ContentRegistry.sol`

**Description:**  
Slashing is gated by `_ok` boolean while reputation depends on `score`, allowing contradictory states.

**Example:**
- `_ok = true, score = 0` → Status: AuditedOk, Reputation: -2 (user), -4 (agent), No slashing
- `_ok = false, score = 90` → Status: AuditedFail, Reputation: +1 (user), +2 (agent), No slashing

**Impact:** Records can end in logically inconsistent combinations.

---

### ✅ **BEST PRACTICE**

#### Issue #5: Slashing with zero amount is possible

**Contract:** `AgentStaking.sol`  
**Function:** `slash(uint256 _agentId, uint256 _amount, string memory _reason)`  
**Line:** 106-112

**Description:**  
No validation that `_amount > 0`. While `ContentRegistry._handleSlashing` checks this, direct calls by `AUDITOR_ROLE` can emit misleading `Slashed` events with zero value.

**Impact:** Confusing event history for off-chain monitoring and indexers.

---

## Fixes Applied

### Fix #1: Enforce NFT Ownership in stake()

**File:** `packages/hardhat/contracts/AgentStaking.sol`

**Changes:**
```diff
  function stake(uint256 _agentId, uint256 _amount) external {
      require(_amount > 0, "Amount must be greater than 0");

-     // Verify agent existence if registry is set
+     // Verify agent ownership if registry is set
      if (identityRegistry != address(0)) {
-         try IERC721(identityRegistry).ownerOf(_agentId) returns (address) {
-             // Agent exists
-         } catch {
-             revert("Agent not registered");
-         }
+         address nftOwner = IERC721(identityRegistry).ownerOf(_agentId);
+         require(nftOwner == msg.sender, "Only agent NFT owner can stake");
+         
+         if (stakes[_agentId] == 0) {
+             agentOwners[_agentId] = msg.sender;
+         } else {
+             require(agentOwners[_agentId] == msg.sender, "Only agent owner can stake");
+         }
+     } else {
+         // Fallback for when registry is not set
+         if (stakes[_agentId] == 0) {
+             agentOwners[_agentId] = msg.sender;
+         } else {
+             require(agentOwners[_agentId] == msg.sender, "Only agent owner can stake");
+         }
      }
-     
-     if (stakes[_agentId] == 0) {
-         agentOwners[_agentId] = msg.sender;
-     } else {
-         require(agentOwners[_agentId] == msg.sender, "Only the agent owner can stake");
-     }
```

**Result:** ✅ Only NFT owners can stake for their agents

---

### Fix #2: Prevent Re-auditing

**File:** `packages/hardhat/contracts/ContentRegistry.sol`

**Changes:**
```diff
  function updateAuditResult(string memory _contentHash, bool _ok, uint256 _score) 
      external onlyRole(AUDITOR_ROLE) 
  {
      require(contents[_contentHash].timestamp != 0, "Content does not exist");
      require(_score <= 100, "Score must be between 0 and 100");

      Content storage content = contents[_contentHash];
+     require(content.status == Status.Published, "Content already audited");
+     
      content.status = _ok ? Status.AuditedOk : Status.AuditedFail;
      content.auditScore = _score;
```

**Result:** ✅ Content can only be audited once (one-shot enforcement)

---

### Fix #3: Validate Non-Zero Slashing Amount

**File:** `packages/hardhat/contracts/AgentStaking.sol`

**Changes:**
```diff
  function slash(uint256 _agentId, uint256 _amount, string memory _reason) 
      external onlyRole(AUDITOR_ROLE) 
  {
+     require(_amount > 0, "Slash amount must be greater than 0");
      require(stakes[_agentId] >= _amount, "Insufficient stake to slash");
```

**Result:** ✅ All slashing events represent real penalties

---

## Test Coverage

### New Test Cases

**File:** `packages/hardhat/test/AgentStaking.ts`

1. ✅ **Test: Non-owner cannot hijack staking**
   - Scenario: Address B tries to stake for agent owned by Address A
   - Expected: Reverts with "Only agent NFT owner can stake"

2. ✅ **Test: Owner can stake successfully**
   - Scenario: NFT owner stakes for their agent
   - Expected: Stake recorded, tokens transferred

3. ✅ **Test: Cannot slash with zero amount**
   - Scenario: Auditor tries to slash 0 tokens
   - Expected: Reverts with "Slash amount must be greater than 0"

**File:** `packages/hardhat/test/ContentRegistry.ts`

4. ✅ **Test: Cannot re-audit content**
   - Scenario: Audit content once, then try again
   - Expected: Second audit reverts with "Content already audited"

5. ✅ **Test: Audit status transitions are one-way**
   - Scenario: Published → AuditedOk → attempt to change
   - Expected: Cannot change status after first audit

---

## Verification

### Compilation
```bash
yarn hardhat:compile
```
**Status:** ✅ Compiled 2 Solidity files successfully

### Tests
```bash
yarn hardhat:test
```
**Status:** ✅ All tests passing (including new security tests)

### Gas Impact
- `stake()`: +~2,000 gas (NFT ownership check)
- `updateAuditResult()`: +~500 gas (status check)
- `slash()`: +~200 gas (amount validation)

**Total impact:** Negligible (~1-2% increase)

---

## Before/After Summary

| Issue | Severity | Before | After | Status |
|-------|----------|--------|-------|--------|
| NFT ownership bypass | HIGH | ❌ Anyone can hijack | ✅ Only NFT owner can stake | FIXED |
| Repeated audits | MEDIUM | ❌ Unlimited re-audits | ✅ One-shot enforcement | FIXED |
| Zero-amount slashing | Best Practice | ❌ Misleading events | ✅ Validated amounts | FIXED |
| Balance inconsistency | Info | ⚠️ Known limitation | ⚠️ Documented | NOTED |
| Audit logic mismatch | Info | ⚠️ Possible inconsistency | ⚠️ Documented | NOTED |

---

## References

- **Audit Tool:** https://app.auditagent.nethermind.io/
- **Commit:** [To be added after final commit]
- **Test Results:** See `test/` directory
