import { useEffect, useState } from "react";
import { useTargetNetwork } from "../scaffold-eth";
import { useAccount, usePublicClient } from "wagmi";
import { contracts } from "~~/utils/scaffold-eth/contract";

/**
 * Hook to fetch user's MockToken balance
 */
export const useTokenBalance = () => {
  const { address } = useAccount();
  const { targetNetwork } = useTargetNetwork();
  const publicClient = usePublicClient({ chainId: targetNetwork.id });
  const [balance, setBalance] = useState<bigint>(0n);
  const [isLoading, setIsLoading] = useState(true);

  const refetch = async () => {
    if (!address || !publicClient) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);
      const mockToken = contracts?.[targetNetwork.id]?.MockToken;
      if (!mockToken) {
        console.error("MockToken not found");
        setIsLoading(false);
        return;
      }

      const tokenBalance = (await publicClient.readContract({
        address: mockToken.address as `0x${string}`,
        abi: mockToken.abi,
        functionName: "balanceOf",
        args: [address],
      })) as bigint;

      setBalance(tokenBalance);
    } catch (error) {
      console.error("Error fetching token balance:", error);
      setBalance(0n);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    refetch();
  }, [address, publicClient, targetNetwork.id]);

  return { balance, isLoading, refetch };
};
