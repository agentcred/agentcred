import { createPublicClient, http } from "viem";
import { sapphireTestnet } from "viem/chains";

const client = createPublicClient({
  chain: sapphireTestnet,
  transport: http(),
});

async function main() {
  const blockNumber = await client.getBlockNumber();
  console.log("Current Block:", blockNumber);
  console.log("Deployed Block: 14505107");
  console.log("Diff:", blockNumber - 14505107n);
}

main();
