
"use client";

import { useState, useEffect } from "react";
import { useAccount } from "wagmi";
import { AgentDashboardCard } from "~~/components/agentcred/AgentDashboardCard";
import { SlashingTimeline } from "~~/components/agentcred/SlashingTimeline";
import { ContentSubmitForm } from "~~/components/agentcred/ContentSubmitForm";
import { ContentFeed } from "~~/components/agentcred/ContentFeed";
import { StatsPanel } from "~~/components/agentcred/StatsPanel";
import { useUserProfile } from "~~/hooks/agentcred/useUserProfile";
import { useAgentEvents } from "~~/hooks/agentcred/useAgentEvents";
import { useStakeActions } from "~~/hooks/agentcred/useStakeActions";
import { formatEther } from "viem";

export default function DemoPage() {
  const { address } = useAccount();
  const { profile, isLoading: profileLoading } = useUserProfile(address);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get events for the first agent
  const agentId = profile?.agents[0]?.agentId;
  const { events: agentEvents, isLoading: eventsLoading } = useAgentEvents(agentId);

  const handleSubmitContent = async (content: string) => {
    if (!address || !agentId) return;

    try {
      setIsSubmitting(true);

      const response = await fetch("/api/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content,
          author: address,
          agentId: agentId,
        }),
      });

      await response.json();

      // Reload to show updates
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error submitting content:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <span className="loading loading-spinner loading-lg"></span>
      </div>
    );
  }

  if (!profile || profile.agents.length === 0) {
    return (
      <div className="flex items-center flex-col flex-grow pt-10">
        <div className="max-w-3xl mx-auto text-center p-12">
          <div className="text-6xl mb-4">🤖</div>
          <h1 className="text-4xl font-bold mb-4">AgentCred Demo</h1>
          <p className="text-lg opacity-70 mb-8">
            You need an agent to start. Visit your profile to register one.
          </p>
          <a href={`/ profile / ${address} `} className="btn btn-primary btn-lg">
            Go to Profile
          </a>
        </div>
      </div>
    );
  }

  const agent = profile.agents[0];

  // Process events for UI
  const publishedEvents = agentEvents.filter(e => e.type === "published");
  const auditedEvents = agentEvents.filter(e => e.type === "audited");
  const slashedEvents = agentEvents.filter(e => e.type === "slashed");

  const totalContents = publishedEvents.length;
  const failedContents = auditedEvents.filter(e => !e.data.ok).length;
  const successRate = totalContents > 0
    ? ((totalContents - failedContents) / totalContents * 100).toFixed(0)
    : 100;

  const totalSlashed = slashedEvents.reduce((acc, e) => acc + BigInt(e.data.amount), 0n);

  // Build timeline events
  const timelineEvents = auditedEvents.map(audit => {
    const slashed = slashedEvents.find(s =>
      Math.abs(s.timestamp - audit.timestamp) < 5 // Match events close in time
    );
    const rep = agentEvents.find(e =>
      e.type === "reputation" && Math.abs(e.timestamp - audit.timestamp) < 5
    );

    // Reconstruct state (approximate for demo)
    const stakeAfter = agent.stake; // Current stake
    const stakeBefore = slashed ? stakeAfter + BigInt(slashed.data.amount) : stakeAfter;

    const repAfter = agent.reputation;
    const repBefore = rep ? repAfter - Number(rep.data.delta) : repAfter;

    return {
      contentHash: audit.data.contentHash,
      timestamp: audit.timestamp,
      ok: audit.data.ok,
      score: Number(audit.data.score),
      stakeBefore,
      stakeAfter,
      repBefore,
      repAfter,
      roflVerified: false,
    };
  });

  return (
    <div className="flex items-center flex-col flex-grow pt-10">
      <div className="px-5 w-full max-w-7xl">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            AgentCred Live Demo
          </h1>
          <p className="text-lg opacity-70 mt-2">
            Watch automatic slashing in action
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Main */}
          <div className="lg:col-span-2 space-y-6">
            <AgentDashboardCard
              agentId={agent.agentId}
              reputation={agent.reputation}
              stake={agent.stake}
              totalContents={totalContents}
              failedContents={failedContents}
            />

            <ContentSubmitForm
              agentId={agent.agentId}
              onSubmit={handleSubmitContent}
              isLoading={isSubmitting}
            />

            <SlashingTimeline
              agentId={agent.agentId}
              events={timelineEvents}
            />
          </div>

          {/* Right Column - Feed & Stats */}
          <div className="space-y-6">
            <StatsPanel
              totalAudits={totalContents}
              successRate={Number(successRate)}
              totalSlashed={totalSlashed}
            />

            <ContentFeed
              items={auditedEvents.map(e => ({
                contentHash: e.data.contentHash,
                timestamp: e.timestamp,
                ok: e.data.ok,
                score: Number(e.data.score),
                roflVerified: false,
              }))}
              isLoading={eventsLoading}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

