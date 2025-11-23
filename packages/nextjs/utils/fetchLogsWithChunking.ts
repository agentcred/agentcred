import { Log, PublicClient } from "viem";

export const fetchLogsWithChunking = async (
  publicClient: PublicClient,
  params: {
    address: `0x${string}`;
    event: any;
    args: any;
    fromBlock: bigint;
    toBlock: bigint | "latest";
  },
  chunkSize = 50, // Safe default for Sapphire
): Promise<any[]> => {
  let currentFromBlock = params.fromBlock;
  let currentToBlock: bigint;

  // Resolve "latest" to current block number
  let finalBlock: bigint;
  if (params.toBlock === "latest") {
    finalBlock = await publicClient.getBlockNumber();
  } else {
    finalBlock = params.toBlock;
  }

  const allLogs: Log[] = [];

  while (currentFromBlock <= finalBlock) {
    currentToBlock = currentFromBlock + BigInt(chunkSize) - 1n;
    if (currentToBlock > finalBlock) {
      currentToBlock = finalBlock;
    }

    try {
      const logs = await publicClient.getLogs({
        address: params.address,
        event: params.event,
        args: params.args,
        fromBlock: currentFromBlock,
        toBlock: currentToBlock,
      });
      allLogs.push(...logs);
    } catch (error) {
      console.error(`Error fetching logs from ${currentFromBlock} to ${currentToBlock}:`, error);
      // Optional: could try reducing chunk size here if it fails
    }

    currentFromBlock = currentToBlock + 1n;
  }

  return allLogs;
};
