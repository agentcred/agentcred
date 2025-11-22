# AgentCred CLI

A standalone CLI tool to interact with your deployed AgentCred contracts locally.

## Setup

1. Install dependencies:
   ```bash
   yarn install
   ```

2. Ensure your local Hardhat node is running (`yarn chain` in root).

## Usage

Run the CLI using `ts-node`:

```bash
# Interactive mode (Recommended)
yarn start interactive

# List contracts
yarn start list

# Read a contract
yarn start read ContentRegistry contents "QmHash..."

# Write to a contract
yarn start write ContentRegistry publishContent "QmHash..." "0xAuthor..." 1 "uri"
```

## Configuration

The CLI connects to `http://127.0.0.1:8545` by default and uses the first Hardhat account (Account #0).
To use a different private key, create a `.env` file in `packages/cli`:

```
PRIVATE_KEY=0x...
```
