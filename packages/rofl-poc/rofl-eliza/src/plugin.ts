import type { Plugin } from '@elizaos/core';
import {
  type Action,
  type ActionResult,
  type Content,
  type GenerateTextParams,
  type HandlerCallback,
  type IAgentRuntime,
  type Memory,
  ModelType,
  type Provider,
  type ProviderResult,
  Service,
  type State,
  logger,
} from '@elizaos/core';
import { z } from 'zod';
import { createPublicClient, createWalletClient, http, defineChain, parseAbiItem, type Hex } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Define Sapphire Testnet
const sapphireTestnet = defineChain({
  id: 23295,
  name: 'Oasis Sapphire Testnet',
  network: 'sapphire-testnet',
  nativeCurrency: { name: 'TEST', symbol: 'TEST', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://testnet.sapphire.oasis.io'] },
    public: { http: ['https://testnet.sapphire.oasis.io'] },
  },
  blockExplorers: {
    default: { name: 'Oasis Explorer', url: 'https://explorer.oasis.io/testnet/sapphire' },
  },
});

const CONTENT_REGISTRY_ADDRESS = process.env.CONTENT_REGISTRY_ADDRESS || '0x45b20c0D519312eF20dD7EB318be2e457DA964CE';

const configSchema = z.object({
  AUDITOR_PRIVATE_KEY: z.string().optional(),
  CONTENT_REGISTRY_ADDRESS: z.string().optional(),
});

const helloWorldAction: Action = {
  name: 'HELLO_WORLD',
  similes: ['GREET', 'SAY_HELLO'],
  description: 'Responds with a simple hello world message',
  validate: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<boolean> => true,
  handler: async (
    _runtime: IAgentRuntime,
    message: Memory,
    _state: State,
    _options: any,
    callback: HandlerCallback,
    _responses: Memory[]
  ): Promise<ActionResult> => {
    const responseContent: Content = {
      text: 'hello world!',
      actions: ['HELLO_WORLD'],
      source: message.content.source,
    };
    await callback(responseContent);
    return { success: true };
  },
  examples: [[{ name: 'user', content: { text: 'hello' } }, { name: 'eliza', content: { text: 'hello world!' } }]],
};

const helloWorldProvider: Provider = {
  name: 'HELLO_WORLD_PROVIDER',
  description: 'A simple example provider',
  get: async (_runtime: IAgentRuntime, _message: Memory, _state: State): Promise<ProviderResult> => ({ text: 'I am a provider' }),
};

export class StarterService extends Service {
  static serviceType = 'starter';
  capabilityDescription = 'This is a starter service which is attached to the agent through the starter plugin.';
  private pollingInterval: NodeJS.Timeout | null = null;
  private isPolling = false;

  constructor(runtime: IAgentRuntime) {
    super(runtime);
  }

  static async start(runtime: IAgentRuntime) {
    logger.info('*** Starting starter service ***');
    const service = new StarterService(runtime);
    service.startPolling();
    return service;
  }

  static async stop(runtime: IAgentRuntime) {
    logger.info('*** Stopping starter service ***');
    const service = runtime.getService(StarterService.serviceType);
    if (service) service.stop();
  }

  async stop() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  private startPolling() {
    if (this.pollingInterval) return;

    logger.info('Starting blockchain polling loop...');
    this.pollingInterval = setInterval(async () => {
      if (this.isPolling) return;
      this.isPolling = true;
      try {
        await this.pollBlockchain();
      } catch (error) {
        logger.error('Error in polling loop:', error);
      } finally {
        this.isPolling = false;
      }
    }, 10000); // Poll every 10 seconds
  }

  private async pollBlockchain() {
    const privateKey = process.env.AUDITOR_PRIVATE_KEY;
    if (!privateKey) {
      logger.warn('AUDITOR_PRIVATE_KEY not set, skipping polling');
      return;
    }

    const account = privateKeyToAccount(privateKey as Hex);
    const publicClient = createPublicClient({ chain: sapphireTestnet, transport: http() });
    const walletClient = createWalletClient({ account, chain: sapphireTestnet, transport: http() });

    // 1. Get recent ContentPublished events
    const currentBlock = await publicClient.getBlockNumber();
    const fromBlock = currentBlock - 100n; // Look back 100 blocks

    const logs = await publicClient.getLogs({
      address: (process.env.CONTENT_REGISTRY_ADDRESS || CONTENT_REGISTRY_ADDRESS) as Hex,
      event: parseAbiItem('event ContentPublished(string contentHash, address indexed author, uint256 indexed agentId, string uri)'),
      fromBlock,
      toBlock: currentBlock,
    });

    logger.info(`Found ${logs.length} ContentPublished events in last 100 blocks`);

    for (const log of logs) {
      const { contentHash, uri } = log.args;
      if (!contentHash || !uri) continue;

      // 2. Check if already audited
      const contentData = await publicClient.readContract({
        address: (process.env.CONTENT_REGISTRY_ADDRESS || CONTENT_REGISTRY_ADDRESS) as Hex,
        abi: [parseAbiItem('function contents(string) view returns (uint8 status, string contentHash, address author, uint256 agentId, uint256 score, bool ok, uint256 timestamp)')],
        functionName: 'contents',
        args: [contentHash],
      }) as any;

      // Status 0 = Pending
      if (contentData[0] !== 0) {
        // Already audited or not pending
        continue;
      }

      logger.info(`Found pending content: ${contentHash}`);

      // 3. Decode content from URI (assuming data:text/plain;base64,...)
      let contentText = '';
      if (uri.startsWith('data:text/plain;base64,')) {
        const base64 = uri.split(',')[1];
        contentText = Buffer.from(base64, 'base64').toString('utf-8');
      } else {
        contentText = uri; // Fallback
      }

      logger.info(`Verifying content: "${contentText.substring(0, 50)}..."`);

      // 4. Verify Content (Mock Logic for now, replace with LLM later)
      const isUnsafe = contentText.toLowerCase().includes('unsafe');
      const ok = !isUnsafe;
      const score = isUnsafe ? 20 : 95;

      logger.info(`Verdict: ok=${ok}, score=${score}`);

      // 5. Submit Result
      try {
        const hash = await walletClient.writeContract({
          address: (process.env.CONTENT_REGISTRY_ADDRESS || CONTENT_REGISTRY_ADDRESS) as Hex,
          abi: [parseAbiItem('function updateAuditResult(string contentHash, bool ok, uint256 score)')],
          functionName: 'updateAuditResult',
          args: [contentHash, ok, BigInt(score)],
        });
        logger.info(`Submitted audit result: ${hash}`);
      } catch (txError) {
        logger.error('Failed to submit audit transaction:', txError);
      }
    }
  }
}

const plugin: Plugin = {
  name: 'starter',
  description: 'A starter plugin for Eliza',
  priority: -1000,
  config: {
    AUDITOR_PRIVATE_KEY: process.env.AUDITOR_PRIVATE_KEY,
    CONTENT_REGISTRY_ADDRESS: process.env.CONTENT_REGISTRY_ADDRESS,
  },
  async init(config: Record<string, string>) {
    logger.info('*** Initializing starter plugin ***');
    if (config.AUDITOR_PRIVATE_KEY) process.env.AUDITOR_PRIVATE_KEY = config.AUDITOR_PRIVATE_KEY;
    if (config.CONTENT_REGISTRY_ADDRESS) process.env.CONTENT_REGISTRY_ADDRESS = config.CONTENT_REGISTRY_ADDRESS;
  },
  routes: [
    {
      name: 'helloworld',
      path: '/helloworld',
      type: 'GET',
      handler: async (_req: any, res: any, _runtime: IAgentRuntime) => {
        res.json({ message: 'Hello World!' });
      },
    },
    {
      name: 'verify',
      path: '/verify',
      type: 'POST',
      handler: async (req: any, res: any, _runtime: IAgentRuntime) => {
        const { content } = req.body;
        logger.info(`Manual verification request for: ${content}`);

        // Use the same verification logic as the polling loop
        const isUnsafe = content?.toLowerCase().includes('unsafe');
        const ok = !isUnsafe;
        const score = isUnsafe ? 20 : 95;

        res.json({
          ok,
          score,
          reason: isUnsafe ? 'Flagged as unsafe content' : 'Verified by ROFL Agent (PoC)',
        });
      },
    },
  ],
  services: [StarterService],
  actions: [helloWorldAction],
  providers: [helloWorldProvider],
};

export default plugin;
