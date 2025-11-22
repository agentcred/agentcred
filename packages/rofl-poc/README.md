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

## Building ROFL Images

### Using Docker (macOS/Windows/Linux)

The easiest way to build ROFL images is using the official Docker image:

```bash
cd packages/rofl-poc
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build
```

This runs the build inside a Linux container with all required dependencies (`veritysetup`, `dm-verity`, etc.).

### Native Linux Build

If you're on Linux, you can install dependencies and build natively:
```bash
# Install dependencies (Ubuntu/Debian)
sudo apt-get install squashfs-tools fakeroot cryptsetup-bin

# Build
oasis rofl build --force
```

## 🚀 Deployment (Sapphire Testnet)

### 1. Prerequisites
- Oasis CLI installed
- Wallet funded with TEST tokens (`oasis wallet create`, then faucet)

### 2. Register App Identity
Create the app on-chain. This generates the App ID and updates `rofl.yaml`.
```bash
cd packages/rofl-poc
oasis rofl create --network testnet --paratime sapphire --account <YOUR_ACCOUNT_NAME>
```

### 3. Set Secrets
Encrypt your API keys and store them on-chain.
```bash
# Set OpenAI Key
echo -n "sk-..." | oasis rofl secret set OPENAI_API_KEY -

# Set RPC URL (for ERC-8004 registration)
echo -n "https://sepolia.infura.io/v3/..." | oasis rofl secret set RPC_URL -

# Set Pinata JWT (for IPFS metadata)
echo -n "your-pinata-jwt" | oasis rofl secret set PINATA_JWT -

# Update secrets on-chain
oasis rofl update
```

### 4. Build & Deploy
```bash
# Build the ROFL bundle (using Docker)
docker run --platform linux/amd64 --volume .:/src -it ghcr.io/oasisprotocol/rofl-dev:main oasis rofl build

# Deploy to the network
oasis rofl deploy --account <YOUR_ACCOUNT_NAME>
```

### 5. Verify
Check the status of your deployed agent:
```bash
oasis rofl machine show
oasis rofl machine logs
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
