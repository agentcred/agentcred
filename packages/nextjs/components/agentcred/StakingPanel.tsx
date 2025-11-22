"use client";

import { useState } from "react";
import { formatEther, parseEther } from "viem";
import { useTokenBalance } from "~~/hooks/agentcred/useTokenBalance";
import { useStakeActions } from "~~/hooks/agentcred/useStakeActions";

interface StakingPanelProps {
    agentId: number;
    currentStake?: bigint;
    onSuccess?: () => void;
}

export const StakingPanel = ({ agentId, currentStake = 0n, onSuccess }: StakingPanelProps) => {
    const { balance, refetch: refetchBalance } = useTokenBalance();
    const { mintTokens, approveAndStake, isLoading, error } = useStakeActions();

    const [amount, setAmount] = useState("1000");

    const handleGetTokensAndStake = async () => {
        // Step 1: Mint tokens
        const minted = await mintTokens();
        if (!minted) return;

        await refetchBalance();

        // Step 2: Stake
        const stakeAmount = parseEther(amount);
        const staked = await approveAndStake(agentId, stakeAmount);

        if (staked) {
            setTimeout(() => {
                if (onSuccess) {
                    onSuccess();
                } else {
                    window.location.reload();
                }
            }, 2000);
        }
    };

    return (
        <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm text-gray-500 uppercase tracking-wider">Collateral Management</h3>
                <div className="text-xs font-mono text-cyan-500">USDC_TESTNET</div>
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Wallet Balance</div>
                    <div className="font-mono text-lg text-white">{formatEther(balance)}</div>
                </div>
                <div className="bg-white/5 rounded-lg p-3 border border-white/5">
                    <div className="text-xs text-gray-500 mb-1">Staked</div>
                    <div className="font-mono text-lg text-cyan-400">{formatEther(currentStake)}</div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="relative">
                    <input
                        type="number"
                        className="block w-full p-3 bg-black border border-white/10 rounded-lg focus:ring-1 focus:ring-cyan-500 focus:border-cyan-500 text-white font-mono text-right pr-16"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        disabled={isLoading}
                    />
                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-500 font-mono text-sm">
                        USDC
                    </div>
                </div>

                <button
                    className="w-full p-3 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/50 rounded-lg text-cyan-400 font-mono text-sm uppercase tracking-wider transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    onClick={handleGetTokensAndStake}
                    disabled={isLoading}
                >
                    {isLoading ? "PROCESSING_TRANSACTION..." : "MINT_AND_STAKE"}
                </button>

                {error && (
                    <div className="text-xs text-red-400 font-mono border border-red-500/20 bg-red-500/10 p-2 rounded">
                        ERROR: {error}
                    </div>
                )}
            </div>
        </div>
    );
};
