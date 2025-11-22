const { ethers } = require("ethers");
const sapphire = require("@oasisprotocol/sapphire-paratime");
const { Agent, run, tool } = require("@openai/agents");
const { z } = require("zod");
const { search } = require("duck-duck-scrape");

// Configuration
const RPC_URL = process.env.RPC_URL || "http://localhost:8545";
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ============================================
// INPUT VALIDATION (Guardrail Pattern)
// ============================================

async function validateInput(content) {
    // Check for malicious patterns
    const maliciousPatterns = [
        /script\s*>/i,
        /eval\s*\(/i,
        /<iframe/i,
        /xss/i,
        /\bsql\s+injection\b/i,
    ];

    const isMalicious = maliciousPatterns.some(pattern => pattern.test(content));

    if (isMalicious) {
        throw new Error("🛡️ BLOCKED: Input contains potentially malicious content");
    }

    // Check for spam (excessive repetition)
    const words = content.split(/\s+/);
    const uniqueWords = new Set(words.map(w => w.toLowerCase()));
    if (words.length > 10 && uniqueWords.size < words.length * 0.3) {
        throw new Error("🛡️ BLOCKED: Input appears to be spam (excessive repetition)");
    }

    console.log("   ✓ Input validation PASSED");
    return true;
}

// ============================================
// TOOLS: Real Web Search (DuckDuckGo)
// ============================================

const webSearchTool = tool({
    name: "search_web",
    description: "Search the live internet to verify facts, claims, or gather context about governance proposals",
    parameters: z.object({
        query: z.string().describe("The search query"),
    }),
    execute: async (input) => {
        console.log(`      🔍 Searching (Real): "${input.query}"`);

        try {
            const searchResults = await search(input.query, {
                safeSearch: "Strict",
            });

            if (!searchResults.results || searchResults.results.length === 0) {
                return "No results found.";
            }

            // Format the top 3 results
            const topResults = searchResults.results.slice(0, 3).map(r =>
                `- Title: ${r.title}\n  URL: ${r.url}\n  Snippet: ${r.description}`
            ).join("\n\n");

            return `Here are the top search results:\n${topResults}`;

        } catch (error) {
            console.error("      ⚠️ Search failed:", error.message);
            return "Search tool failed temporarily. Proceed with available knowledge.";
        }
    },
});

// ============================================
// RESEARCH AGENT: Deep Fact-Checking
// ============================================

const researchAgent = new Agent({
    name: "ResearchAgent",
    instructions: `You are a meticulous research agent specializing in verifying governance proposals and blockchain transactions.

Your role:
1. Use the 'search_web' tool to verify any claims, numbers, or addresses mentioned.
2. Cross-reference information from the search results.
3. Flag any inconsistencies or suspicious patterns (e.g. addresses linked to hacks or exchanges).
4. Return detailed findings based on the REAL search data.

Always return JSON: { "verified": boolean, "confidence": 0-100, "findings": string }`,
    tools: [webSearchTool],
});

// ============================================
// MAIN VERIFIER AGENT
// ============================================

const verifierAgent = Agent.create({
    name: "GovernanceVerifier",
    instructions: `You are the primary governance content verifier for AgentCred.

Your job is to analyze content and determine if it is factually accurate and safe.

WORKFLOW:
1. For complex claims or specific numbers, delegate to the ResearchAgent for fact-checking.
2. Evaluate clarity and specificity of the proposal.
3. Check for red flags (vague language, unrealistic amounts, suspicious addresses).
4. Generate a final verdict.

SCORING RULES:
- Score 90-100: Verified, clear, and specific
- Score 70-89: Generally good but minor concerns
- Score 40-69: Significant issues but not critical
- Score 10-39: Major problems, likely reject
- Score 0-9: Critical failure, immediate reject

Return JSON: { "ok": boolean, "score": number, "reason": string, "researchUsed": boolean }`,

    handoffs: [researchAgent],
});

// ============================================
// VERIFICATION FUNCTION
// ============================================

async function verifyContent(content, sources = []) {
    console.log("   > Running AI verification...");

    // Apply input validation (guardrail pattern)
    try {
        await validateInput(content);
    } catch (error) {
        console.error(`   ${error.message}`);
        return {
            ok: false,
            score: 0,
            reason: error.message,
            researchUsed: false
        };
    }

    const prompt = `Verify this governance content:

Content: "${content}"

${sources.length > 0 ? `Sources: ${sources.join(", ")}` : ""}

If this content mentions specific claims, numbers, or addresses that need verification, delegate to ResearchAgent for fact-checking.
Then provide your final verdict as JSON: { "ok": boolean, "score": number, "reason": string, "researchUsed": boolean }`;

    try {
        const result = await run(verifierAgent, prompt);
        const output = result.finalOutput;

        // Try to parse JSON from the output
        const jsonMatch = output.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const verdict = JSON.parse(jsonMatch[0]);
            return verdict;
        }

        // Fallback if parsing fails
        return {
            ok: false,
            score: 0,
            reason: "Could not parse AI response",
            researchUsed: false
        };
    } catch (error) {
        console.error("   > AI verification error:", error.message);
        return {
            ok: false,
            score: 0,
            reason: `Error: ${error.message}`,
            researchUsed: false
        };
    }
}

// ============================================
// MAIN LOOP
// ============================================

async function main() {
    console.log("🔒 AgentCred ROFL Verifier Starting...");
    console.log("   - Environment: Oasis Sapphire (Simulated)");
    console.log("   - TEE Status: Active");
    console.log(`   - AI Agent: ${OPENAI_API_KEY ? "Enabled ✓" : "Disabled (set OPENAI_API_KEY)"}`);
    console.log("   - Guardrails: Input Validation ✓");
    console.log("   - Tools: REAL Web Search (DuckDuckGo) ✓");
    console.log("   - Research Agent: Enabled ✓");

    if (!PRIVATE_KEY) {
        console.warn("⚠️  No PRIVATE_KEY provided. Running in simulation mode.");
    }

    if (!OPENAI_API_KEY) {
        console.error("❌ No OPENAI_API_KEY provided. Exiting.");
        process.exit(1);
    }

    console.log("\nWaiting for verification requests...\n");

    // Mock loop - in production, this would listen to on-chain events
    let counter = 0;
    setInterval(async () => {
        counter++;

        // Simulate receiving different types of content
        const mockRequests = [
            {
                content: "Governance Proposal: Allocate 50000 USDC to 0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb for Q1 development.",
                sources: []
            },
            {
                content: "This is unsafe malicious <script>alert('xss')</script> content.",
                sources: []
            },
            {
                content: "Spend money on things. Generic proposal with no specifics.",
                sources: []
            },
            {
                content: "spam spam spam spam spam spam spam spam spam spam",
                sources: []
            },
        ];

        const request = mockRequests[counter % mockRequests.length];
        const mockContent = request.content;
        const mockContentHash = ethers.keccak256(ethers.toUtf8Bytes(mockContent));

        console.log(`[${new Date().toISOString()}] Received verification request:`);
        console.log(`   - Content Hash: ${mockContentHash}`);
        console.log(`   - Content Preview: "${mockContent.substring(0, 80)}${mockContent.length > 80 ? '...' : ''}"`);

        // AI-Powered Verification with Guardrails
        const verdict = await verifyContent(mockContent, request.sources);

        console.log(`   > Verdict: ${verdict.ok ? "✅ PASS" : "❌ FAIL"} (Score: ${verdict.score})`);
        console.log(`   > Reason: ${verdict.reason}`);
        if (verdict.researchUsed) {
            console.log(`   > Research: Fact-checking was performed ✓`);
        }

        // Simulate Transaction Submission
        if (PRIVATE_KEY && CONTRACT_ADDRESS) {
            try {
                const provider = new ethers.JsonRpcProvider(RPC_URL);
                const wallet = new ethers.Wallet(PRIVATE_KEY, provider);
                const signer = sapphire.wrap(wallet);

                console.log("   > Submitting result on-chain...");
                console.log(`   > [Simulation] Would submit tx to updateAuditResult(${mockContentHash.slice(0, 10)}..., ${verdict.ok}, ${verdict.score})`);
            } catch (e) {
                console.error("   > Error submitting tx:", e.message);
            }
        } else {
            console.log(`   > [Simulation] Would submit tx to updateAuditResult(hash, ${verdict.ok}, ${verdict.score})`);
        }

        console.log(""); // Empty line for readability

    }, 20000); // Run every 20 seconds
}

main().catch(console.error);
