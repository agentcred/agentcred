# AgentCred ROFL PoC

This directory contains the **Oasis ROFL (Runtime Off-Chain Logic)** Proof of Concept for AgentCred.
It demonstrates how the "Auditor Agent" runs inside a Trusted Execution Environment (TEE).

## Structure

- `verifier-app/`: The actual Node.js application that runs inside the TEE.
  - Receives content.
  - Verifies it (mock logic for PoC).
  - Signs the result using the TEE's derived key.
- `rofl.yaml`: The manifest file for the Oasis ROFL network.
- `Dockerfile`: Instructions to containerize the verifier app.

## Prerequisites

You need the **Oasis CLI** installed.
See: [cli.oasis.io](https://cli.oasis.io)

## Usage

### Local Simulation (Recommended for PoC)

Since the ROFL infrastructure requires on-chain registration and network connectivity, the quickest way to test the verifier logic is to run it locally in simulation mode:

```bash
cd verifier-app
npm install
export OPENAI_API_KEY="sk-..."  # Your OpenAI API key
node index.js
```

**What it does:**
- Uses the **OpenAI Agents SDK** to create an AI verifier agent
- Analyzes content for accuracy, safety, and governance compliance
- Returns structured verdicts: `{ ok: boolean, score: 0-100, reason: string }`
- Logs what would be submitted on-chain

**Test scenarios:** The verifier cycles through different content samples every 15 seconds:
- ✅ "Spend 1000 USDC on snacks" → PASS (clear and specific)
- ❌ "This is unsafe content" → FAIL (contains safety flag)
- ✅ "Allocate 50000 USDC to 0x1234..." → PASS (governance proposal)

To connect it to your local Hardhat chain:
```bash
PRIVATE_KEY="0xac0..." CONTRACT_ADDRESS="0x..." RPC_URL="http://localhost:8545" node index.js
```

### ROFL Production Build (Future)

When ready to deploy to Oasis ROFL:

1. **Create Account**: Register an on-chain ROFL app identity
   ```bash
   oasis rofl create
   ```

2. **Build Bundle**: Compile the `.orc` container
   ```bash
   oasis rofl build
   ```

3. **Deploy**: Push to a ROFL node
   ```bash
   oasis rofl deploy
   ```

> **Note**: The ROFL build process requires proper network configuration and on-chain app registration, which is beyond the scope of this local PoC.

## The Verifier Logic

The `verifier-app` implements a **multi-agent architecture** with advanced safety and research capabilities:

### Architecture

1. **Main Verifier Agent** (`GovernanceVerifier`)
   - Analyzes governance content for accuracy and safety
   - Delegates complex fact-checking to the Research Agent
   - Returns structured verdicts with scores and reasoning

2. **Research Agent** (`ResearchAgent`)
   - Specializes in deep fact-checking using web search
   - Verifies specific claims, numbers, and addresses
   - Cross-references information from multiple sources

3. **Guardrails** (Input Safety)
   - Blocks malicious patterns (XSS, SQL injection, etc.)
   - Detects spam and repetitive content
   - Runs before the agent processes the input

4. **Tools**
   - `search_web`: Internet search for fact verification
   - Extensible: Can add more tools (database queries, API calls, etc.)

### Workflow

```
User Content → Input Guardrail → Main Verifier
                                       ↓
                          (If complex) Handoff → Research Agent → Web Search
                                       ↓
                                 Final Verdict → On-chain Submission
```

### Test Scenarios

The verifier cycles through 4 different content types:
1. ✅ **Valid Governance Proposal** → Research agent verifies, PASS (score 90+)
2. ❌ **Malicious Content** (XSS) → Guardrail blocks, FAIL (score 0)
3. ⚠️ **Vague Proposal** → No specifics, FAIL (score 30-40)
4. ❌ **Spam** → Excessive repetition, Guardrail blocks, FAIL (score 0)
