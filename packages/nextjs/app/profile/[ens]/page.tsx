"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { normalize } from "viem/ens";
import { useEnsAddress, useAccount } from "wagmi";
import { ProfileStats } from "~~/components/agentcred/ProfileStats";
import { AgentCard } from "~~/components/agentcred/AgentCard";
import { ContentsList } from "~~/components/agentcred/ContentsList";
import { SubmitContentForm } from "~~/components/agentcred/SubmitContentForm";
import { RegisterAgentForm } from "~~/components/agentcred/RegisterAgentForm";
import { StakingPanel } from "~~/components/agentcred/StakingPanel";
import { useUserProfile } from "~~/hooks/agentcred/useUserProfile";
import { useUserContents } from "~~/hooks/agentcred/useUserContents";
import { useUserAgents } from "~~/hooks/agentcred/useUserAgents";

export default function ProfilePage() {
    const params = useParams();
    const ensName = params?.ens as string;
    const { address: connectedAddress } = useAccount();

    // Resolve ENS to address
    const { data: ensAddress, isLoading: isResolvingENS } = useEnsAddress({
        name: ensName ? normalize(ensName) : undefined,
    });

    // For local testing, if no ENS resolution, use the param as address
    const [resolvedAddress, setResolvedAddress] = useState<string | undefined>();

    useEffect(() => {
        if (ensAddress) {
            setResolvedAddress(ensAddress);
        } else if (ensName && ensName.startsWith("0x")) {
            // If it looks like an address, use it directly
            setResolvedAddress(ensName);
        }
    }, [ensAddress, ensName]);

    const { profile, isLoading: isLoadingProfile } = useUserProfile(resolvedAddress);
    const { contents, isLoading: isLoadingContents } = useUserContents(resolvedAddress);
    const { agents, refetch: refetchAgents } = useUserAgents(resolvedAddress);

    const [refreshKey, setRefreshKey] = useState(0);
    const [showRegisterForm, setShowRegisterForm] = useState(false);
    const [showStakingPanel, setShowStakingPanel] = useState(false);
    const [selectedAgent, setSelectedAgent] = useState<number | null>(null);

    const isOwnProfile = connectedAddress && resolvedAddress &&
        connectedAddress.toLowerCase() === resolvedAddress.toLowerCase();

    const handleContentSubmitted = () => {
        window.location.reload();
    };

    const handleAgentRegistered = () => {
        setShowRegisterForm(false);
        setShowStakingPanel(true);
    };

    const handleStakeSuccess = () => {
        window.location.reload();
    };

    if (isResolvingENS || isLoadingProfile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-center">
                    <span className="loading loading-spinner loading-lg"></span>
                    <p className="mt-4">Loading profile...</p>
                </div>
            </div>
        );
    }

    if (!resolvedAddress) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="alert alert-error max-w-lg">
                    <span>Could not resolve ENS name: {ensName}</span>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="alert alert-warning max-w-lg">
                    <span>No profile data found for {ensName}</span>
                </div>
            </div>
        );
    }

    const totalStake = profile.agents.reduce((sum, agent) => sum + agent.stake, 0n);

    return (
        <div className="flex items-center flex-col flex-grow pt-10">
            <div className="px-5 w-full max-w-7xl">
                <div className="flex flex-col gap-y-6 lg:gap-y-8 py-8 lg:py-12">
                    {/* Profile Stats */}
                    <ProfileStats
                        ensName={ensName}
                        address={resolvedAddress}
                        reputation={profile.reputation}
                        agentCount={profile.agents.length}
                        totalStake={totalStake}
                    />

                    {/* Onboarding Flow for New Users */}
                    {isOwnProfile && profile.agents.length === 0 && (
                        <div className="flex flex-col gap-6">
                            {/* Step 1: Register */}
                            {!showRegisterForm && !showStakingPanel && (
                                <div className="flex flex-col items-center gap-4 bg-base-100 rounded-3xl p-12 text-center">
                                    <div className="text-6xl">🤖</div>
                                    <h2 className="text-3xl font-bold">Welcome to AgentCred!</h2>
                                    <p className="text-lg opacity-70 max-w-lg">
                                        Register your first AI agent to start publishing verified content with economic stakes.
                                    </p>
                                    <button
                                        className="btn btn-primary btn-lg mt-4"
                                        onClick={() => setShowRegisterForm(true)}
                                    >
                                        Get Started →
                                    </button>
                                </div>
                            )}

                            {/* Step 2: Register Form */}
                            {showRegisterForm && !showStakingPanel && (
                                <RegisterAgentForm onSuccess={handleAgentRegistered} />
                            )}

                            {/* Step 3: Stake Collateral */}
                            {showStakingPanel && (
                                <StakingPanel
                                    agentId={1} // First agent is always ID 1
                                    currentStake={0n}
                                    onStakeSuccess={handleStakeSuccess}
                                />
                            )}
                        </div>
                    )}

                    {/* Agents Section */}
                    {profile.agents.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <div className="flex justify-between items-center">
                                <h2 className="text-3xl font-bold m-0">Your Agents</h2>
                                {isOwnProfile && (
                                    <button
                                        className="btn btn-sm btn-primary gap-2"
                                        onClick={() => setShowRegisterForm(true)}
                                    >
                                        + Register Agent
                                    </button>
                                )}
                            </div>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                {profile.agents.map((agent) => (
                                    <div key={agent.agentId} className="flex flex-col gap-3">
                                        <AgentCard {...agent} />
                                        {isOwnProfile && (
                                            <button
                                                className="btn btn-sm btn-outline"
                                                onClick={() => {
                                                    setSelectedAgent(agent.agentId);
                                                    setShowStakingPanel(!showStakingPanel || selectedAgent !== agent.agentId);
                                                }}
                                            >
                                                {showStakingPanel && selectedAgent === agent.agentId
                                                    ? "Hide Staking"
                                                    : "Manage Stake"}
                                            </button>
                                        )}
                                        {showStakingPanel && selectedAgent === agent.agentId && (
                                            <StakingPanel
                                                agentId={agent.agentId}
                                                currentStake={agent.stake}
                                                onStakeSuccess={handleStakeSuccess}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Submit Content Form */}
                    {profile.agents.length > 0 && (
                        <div className="flex flex-col gap-4">
                            <h2 className="text-3xl font-bold m-0">Submit Content</h2>
                            <SubmitContentForm
                                availableAgents={profile.agents.map(a => ({ agentId: a.agentId, reputation: a.reputation }))}
                                onSuccess={handleContentSubmitted}
                            />
                        </div>
                    )}

                    {/* Contents List */}
                    <div className="flex flex-col gap-4">
                        <h2 className="text-3xl font-bold m-0">Content History</h2>
                        <ContentsList contents={contents} isLoading={isLoadingContents} />
                    </div>
                </div>
            </div>
        </div>
    );
}
