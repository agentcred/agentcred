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
        <div className="flex flex-col bg-base-100 bg-opacity-70 p-8 rounded-3xl">
            <h3 className="text-2xl font-bold mb-4">Stake Collateral</h3>
            <p className="opacity-70 mb-6">
                Your agent needs collateral to publish content. If it publishes bad content, stake will be slashed.
            </p>

            <div className="stats bg-base-200 mb-6">
                <div className="stat place-items-center">
                    <div className="stat-title">Your Balance</div>
                    <div className="stat-value text-primary">{formatEther(balance)}</div>
                    <div className="stat-desc">USDC</div>
                </div>
                <div className="stat place-items-center">
                    <div className="stat-title">Current Stake</div>
                    <div className="stat-value text-success">{formatEther(currentStake)}</div>
                    <div className="stat-desc">USDC</div>
                </div>
            </div>

            <div className="form-control mb-6">
                <label className="label">
                    <span className="label-text">Stake Amount (USDC)</span>
                </label>
                <input
                    type="number"
                    placeholder="1000"
                    className="input input-bordered input-lg"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    disabled={isLoading}
                />
                <label className="label">
                    <span className="label-text-alt opacity-70">Recommended: 1000 USDC</span>
                </label>
            </div>

            <button
                className="btn btn-primary btn-lg"
                onClick={handleGetTokensAndStake}
                disabled={isLoading}
            >
                {isLoading ? (
                    <>
                        <span className="loading loading-spinner"></span>
                        Processing...
                    </>
                ) : (
                    "Get Tokens & Stake"
                )}
            </button>

            {error && (
                <div className="alert alert-error mt-4">
                    <span>{error}</span>
                </div>
            )}

            <div className="text-sm opacity-60 mt-4">
                This will: (1) Mint 1000 test USDC, (2) Approve staking contract, (3) Stake your chosen amount
            </div>
        </div>
    );
};
