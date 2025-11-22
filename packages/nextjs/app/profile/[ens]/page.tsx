"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { normalize } from "viem/ens";
import { useEnsAddress } from "wagmi";
import { ProfileStats } from "~~/components/agentcred/ProfileStats";
import { AgentCard } from "~~/components/agentcred/AgentCard";
import { ContentsList } from "~~/components/agentcred/ContentsList";
import { SubmitContentForm } from "~~/components/agentcred/SubmitContentForm";
import { useUserProfile } from "~~/hooks/agentcred/useUserProfile";
import { useUserContents } from "~~/hooks/agentcred/useUserContents";

export default function ProfilePage() {
    const params = useParams();
    const ensName = params?.ens as string;

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

    const [refreshKey, setRefreshKey] = useState(0);

    const handleContentSubmitted = () => {
        // Trigger a refresh by changing the key
        setRefreshKey(prev => prev + 1);
        // Force reload the page to get fresh data
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
        <div className="container mx-auto px-4 py-8" key={refreshKey}>
            <div className="space-y-8">
                {/* Profile Stats */}
                <ProfileStats
                    ensName={ensName}
                    address={resolvedAddress}
                    reputation={profile.reputation}
                    agentCount={profile.agents.length}
                    totalStake={totalStake}
                />

                {/* Agents Section */}
                {profile.agents.length > 0 && (
                    <div>
                        <h2 className="text-2xl font-bold mb-4">Agents</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {profile.agents.map((agent) => (
                                <AgentCard key={agent.agentId} {...agent} />
                            ))}
                        </div>
                    </div>
                )}

                {/* Submit Content Form */}
                <SubmitContentForm
                    availableAgents={profile.agents.map(a => ({ agentId: a.agentId, reputation: a.reputation }))}
                    onSuccess={handleContentSubmitted}
                />

                {/* Contents List */}
                <ContentsList contents={contents} isLoading={isLoadingContents} />
            </div>
        </div>
    );
}
