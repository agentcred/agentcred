# AgentCred

> **The Trust & Slashing Layer for the Agent Economy**
>
> *“This agent follows the rules for real, and if it doesn't, it hurts.”*

AgentCred is a decentralized platform designed to bring **accountability** to AI agents. It provides a framework where agents have on-chain identity, stake real value, and subject their output to rigorous verification inside Trusted Execution Environments (TEEs).

When an agent breaks the rules, it’s not just a log error—it’s a **reputation hit** and an **economic penalty** (slashing), recorded immutably on-chain.

---

## 1. The Essence: Why AgentCred?

We are building the **"Trust & Slashing Layer"** for the emerging agent economy.

Currently, AI agents are black boxes. They can hallucinate, lie, or manipulate without consequence.
AgentCred changes this by enforcing a simple loop:

1.  **Identity**: Agents have a verifiable on-chain identity (ERC-8004 aligned).
2.  **Skin in the Game**: Agents must stake funds (e.g., USDC) to operate.
3.  **TEE Verification**: Every critical output is verified by an auditor running inside an **Oasis ROFL** enclave (TEE).
4.  **Consequences**: If the TEE auditor detects a violation, the agent is **automatically slashed** and their reputation score is downgraded on **Oasis Sapphire**.

---

## 2. Current Focus: The Proof of Concept

Our immediate focus is a concrete, high-stakes use case: **Governance Summaries**.

*   **The Scenario**: An agent publishes a summary of a governance proposal or financial report.
*   **The Rule**: The summary must strictly align with the source data (numbers, recipients, dates).
*   **The Enforcement**:
    *   **Pass**: Reputation increases.
    *   **Fail**: Immediate slashing (e.g., 5% for minor errors, 30% for critical lies).

### The Infrastructure
*   **Contracts**: Deployed on **Oasis Sapphire** (privacy-preserving EVM) to manage state, reputation, and private logic.
*   **Verifier**: An **Oasis ROFL** application acting as the "Judge" inside a TEE. This auditor is itself verifiable via the ERC-8004 ecosystem.
*   **Frontend**: A "Command Center" dashboard showing the content, the TEE verdict, and the resulting reputation/stake changes in near real-time.

---

## 3. Future Vision: A Universal Trust Module

AgentCred is not just a dashboard; it is a **generic trust module** for the ecosystem.

*   **Oracle for Trust**: Wallets, DAOs, and protocols can query AgentCred to ask: *"What is the trust score of this agent?"* before interacting with it.
*   **Firewall**: Systems can block agents that don't meet a minimum reputation or stake threshold.
*   **Pluggable Verifiers**: In the future, anyone can register specialized TEE verifiers (e.g., for DeFi logic, Code Audits, Fact Checking) and define custom slashing policies.
*   **Ecosystem Integration**: We aim to be the standard risk/reputation layer for the ERC-8004 / Oasis ecosystem, integrating with other sources of truth like Verisage.

---

## 4. Technical Architecture

The platform core lives in two places: **TEE** and **Oasis Sapphire**.

### 4.1 Auditing (TEE / Oasis ROFL)

- An **Auditor Agent** runs inside an Oasis ROFL enclave (TEE).
- It receives `(content, sources[], metadata)` and:
  - compares content vs sources,
  - checks for hallucinations / contradictions,
  - returns `ok/fail + score` (e.g. 0–100),
  - optionally emits a short audit report.

This is the “brain of trust”: the logic that decides how good a piece of content is.

### 4.2 Sapphire Contracts (On-Chain Trust Ledger)

On **Oasis Sapphire**, AgentCred keeps the public history and state:

#### **`ContentRegistry`**
- **Purpose**: Anchors content and audit results.
- **Key Events**:
  - `ContentPublished(contentHash, author, agentId, uri)`
  - `ContentAudited(contentHash, ok, score)`
- **Automatic Score-Based Slashing**:
  - When audit fails (`ok = false`), the contract automatically calculates and applies slashing based on score:
    - **Score 51-100**: 0% slash (pass)
    - **Score 21-50**: 5% slash (mild fail)
    - **Score 1-20**: 15% slash (bad fail)
    - **Score 0**: 30% slash (critical failure)
  - Formula is **on-chain and transparent** — no backend discretion.

#### **`AgentStaking`**
- **Purpose**: Economic enforcement.
- **Mechanics**:
  - Agents lock **USDC** (or stable ERC-20) as collateral.
  - `slash(agentId, amount, reason)`: Called automatically by `ContentRegistry` when audit fails.
  - Slashed funds are transferred to a **protocol treasury** (safety pool).
- **ERC-8004 Integration**: Points to `IdentityRegistry` to verify agent existence before allowing stake.

#### **`TrustScoreRegistry`**
- **Purpose**: Tracks opinionated trust scores.
- **Entities**: Tracks scores for both **users** (wallet/ENS) and **agents** (`agentId`).
- **Updates**: Only `AUDITOR_ROLE` (the TEE) can adjust scores based on audit outcomes.

### 4.3 Verification API

The backend/orchestrator exposes a minimal public API for integration:

- `POST /verify`
  - Input: `content`, `sources[]`, `author`, `agentId`.
  - Behavior: Triggers ROFL audit, writes result to Sapphire, returns status.
- `GET /status/:contentHash`
  - Returns: Current status (`Published`, `AuditedOk`, `AuditedFail`), score, and on-chain proofs.

---

## 5. Repository Structure

This project is built on top of **Scaffold‑ETH 2**.

### Modules

- `packages/hardhat/`
  - **Core Contracts** (AgentCred application layer):
    - `ContentRegistry.sol` - Content audits with automatic score-based slashing
    - `AgentStaking.sol` - Economic enforcement via USDC staking/slashing with treasury
    - `TrustScoreRegistry.sol` - Internal reputation scores (auditor-driven)
  - **ERC-8004 Registries** (ecosystem compatibility):
    - `IdentityRegistry.sol` - Agent identity as ERC-721 NFTs
    - `ReputationRegistry.sol` - Public feedback bus for agents
    - `ValidationRegistry.sol` - Validation hooks for TEEs/zkML
  - **Test Utilities**:
    - `MockToken.sol` - ERC-20 token for testing staking

- `packages/backend/`
  - Orchestrator:
    - MsgCore ↔ LLM writers ↔ Oasis ROFL ↔ Sapphire contracts.
  - Public verification API.

- `packages/nextjs/`
  - Frontend UI:
    - **Command Center**: Unified dashboard for agent management and monitoring.
    - **Visuals**: Dark mode, glassmorphism, and holographic effects.

---

## 6. Quickstart

To run the AgentCred stack locally:

1.  **Install Dependencies**:
    ```bash
    yarn install
    ```

2.  **Start Local Chain**:
    ```bash
    yarn chain
    ```

3.  **Deploy Contracts**:
    ```bash
    yarn deploy
    ```

4.  **Start Frontend**:
    ```bash
    yarn start
    ```

Visit `http://localhost:3000` to access the Agent Command Center.

---

> **AgentCred**: Building the social trust layer for humans + agents with real economic skin in the game.
