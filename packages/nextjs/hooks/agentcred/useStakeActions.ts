import { useState } from "react";
import { useAccount, usePublicClient, useWalletClient } from "wagmi";
import { useTargetNetwork } from "../scaffold-eth";
import { contracts } from "~~/utils/scaffold-eth/contract";
import { parseEther } from "viem";

/**
 * Hook providing actions for token and staking operations
 */
export const useStakeActions = () => {
    const { address } = useAccount();
    const { targetNetwork } = useTargetNetwork();
    const publicClient = usePublicClient({ chainId: targetNetwork.id });
    const { data: walletClient } = useWalletClient({ chainId: targetNetwork.id });

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [txHash, setTxHash] = useState<string | null>(null);

    const mockToken = contracts?.[targetNetwork.id]?.MockToken;
    const agentStaking = contracts?.[targetNetwork.id]?.AgentStaking;

    /**
     * Mint test tokens to user's address (for PoC only)
     */
    const mintTokens = async (amount: bigint = parseEther("1000")) => {
        if (!address || !walletClient || !mockToken || !publicClient) {
            setError("Wallet not connected");
            return false;
        }

        try {
            setIsLoading(true);
            setError(null);

            const hash = await walletClient.writeContract({
                address: mockToken.address as `0x${string}`,
                abi: mockToken.abi,
                functionName: "mint",
                args: [address, amount],
            });

            setTxHash(hash);
            await publicClient.waitForTransactionReceipt({ hash });

            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error("Error minting tokens:", err);
            setError(err.message || "Failed to mint tokens");
            setIsLoading(false);
            return false;
        }
    };

    /**
     * Approve AgentStaking to spend tokens
     */
    const approveStaking = async (amount: bigint) => {
        if (!walletClient || !mockToken || !agentStaking || !publicClient) {
            setError("Wallet not connected");
            return false;
        }

        try {
            setIsLoading(true);
            setError(null);

            const hash = await walletClient.writeContract({
                address: mockToken.address as `0x${string}`,
                abi: mockToken.abi,
                functionName: "approve",
                args: [agentStaking.address as `0x${string}`, amount],
            });

            setTxHash(hash);
            await publicClient.waitForTransactionReceipt({ hash });

            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error("Error approving staking:", err);
            setError(err.message || "Failed to approve staking");
            setIsLoading(false);
            return false;
        }
    };

    /**
     * Stake tokens for an agent
     */
    const stake = async (agentId: number, amount: bigint) => {
        if (!walletClient || !agentStaking || !publicClient) {
            setError("Wallet not connected");
            return false;
        }

        try {
            setIsLoading(true);
            setError(null);

            const hash = await walletClient.writeContract({
                address: agentStaking.address as `0x${string}`,
                abi: agentStaking.abi,
                functionName: "stake",
                args: [BigInt(agentId), amount],
            });

            setTxHash(hash);
            await publicClient.waitForTransactionReceipt({ hash });

            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error("Error staking:", err);
            setError(err.message || "Failed to stake");
            setIsLoading(false);
            return false;
        }
    };

    /**
     * Unstake tokens from an agent
     */
    const unstake = async (agentId: number, amount: bigint) => {
        if (!walletClient || !agentStaking || !publicClient) {
            setError("Wallet not connected");
            return false;
        }

        try {
            setIsLoading(true);
            setError(null);

            const hash = await walletClient.writeContract({
                address: agentStaking.address as `0x${string}`,
                abi: agentStaking.abi,
                functionName: "unstake",
                args: [BigInt(agentId), amount],
            });

            setTxHash(hash);
            await publicClient.waitForTransactionReceipt({ hash });

            setIsLoading(false);
            return true;
        } catch (err: any) {
            console.error("Error unstaking:", err);
            setError(err.message || "Failed to unstake");
            setIsLoading(false);
            return false;
        }
    };

    /**
     * Combined: Approve and stake in one flow
     */
    const approveAndStake = async (agentId: number, amount: bigint) => {
        const approved = await approveStaking(amount);
        if (!approved) return false;

        return await stake(agentId, amount);
    };

    return {
        mintTokens,
        approveStaking,
        stake,
        unstake,
        approveAndStake,
        isLoading,
        error,
        txHash,
    };
};
