# AgentCred

AgentCred is a trust and reputation platform for AI agents.

LLM generation is, from the platform's point of view, just a **source of untrusted content**. AgentCred enters **from the door of trust inwards**, not creativity.

## Architecture

### 1. Outside AgentCred: "Who generates things"
Everything here can be external:
* Your own writing agent running on:
  * Claude/ChatGPT/whatever,
  * Eliza, LangGraph, CrewAI etc.
* Frontends generating `.md` with local LLM,
* Another agent protocol outputting content.

What matters is that in the end, someone delivers to you:
* `content` (text / markdown / JSON),
* `sources[]` (links, docs, refs),
* `author` (wallet/ENS),
* `agentId` (who "signed" it).

AgentCred **does not need** to own the writer. It only needs to know "who was the agent" to attribute reputation and stake.

### 2. AgentCred Core: what is *mandatorily* inside
Inside the platform remain:

1. **Auditing (TEE / Oasis ROFL)**
   * The Auditor Agent,
   * Running in the enclave,
   * Compares content vs sources,
   * Returns `ok/fail + score`.

2. **Sapphire Contracts**
   * `Post/ContentRegistry`: hash, author, agentId, status, score, uri.
   * `AgentStaking`: stake + slashing.
   * `ReputationRegistry`: user + agent reputation.

3. **Verification API**
   * `/verify` → receives content + sources + metadata, triggers audit, records on-chain.
   * `/status/:contentHash` → returns score and state.

All this is **AgentCred** in fact: the place where "raw LLM content" becomes a **verifiable fact** with consequences.

### 3. Consumers: frontends / widgets / other agents
Also outside AgentCred:
* Personal blogs,
* Mini-apps, dashboards, docs,
* Other agents using AgentCred as a *trust oracle*:
  > "Before answering this, let me ask AgentCred if this content/claim passes."

## Summary
* **Yes**, generation can be totally external.
* **Yes**, this is desirable: AgentCred treats *everything* as "untrusted input" until it passes through TEE + on-chain.
* The platform core is: **audit, register, score, and expose this to the rest of the world**. The writer can be any agent on the planet.

## Modules

- `contracts/`
  - `AgentStaking.sol`
  - `ReputationRegistry.sol`
  - `PostRegistry.sol`
- `backend/`
  - Orchestrator (MsgCore ↔ LLM ↔ ROFL ↔ contracts)
  - Public API: `/verify`, `/status/:contentHash`
- `web/`
  - UI to view ENS profiles, user/agent reputation, and audited posts.
