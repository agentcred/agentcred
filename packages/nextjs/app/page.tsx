"use client";

import { useAccount } from "wagmi";
import { toast } from "react-hot-toast";
import { DashboardLayout } from "~~/components/agentcred/DashboardLayout";
import { useUserProfile } from "~~/hooks/agentcred/useUserProfile";
import { RegisterAgentForm } from "~~/components/agentcred/RegisterAgentForm";
import { AgentDashboardCard } from "~~/components/agentcred/AgentDashboardCard";
import { SlashingTimeline } from "~~/components/agentcred/SlashingTimeline";
import { ContentSubmitForm } from "~~/components/agentcred/ContentSubmitForm";
import { StatsPanel } from "~~/components/agentcred/StatsPanel";
import { StakingPanel } from "~~/components/agentcred/StakingPanel";
import { useAgentEvents } from "~~/hooks/agentcred/useAgentEvents";
import { useState } from "react";

export default function Home() {
  const { address } = useAccount();
  const { profile, isLoading: profileLoading } = useUserProfile(address);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get events for the first agent
  const agentId = profile?.agents[0]?.agentId;
  const { events: agentEvents, isLoading: eventsLoading, refetch: refetchEvents } = useAgentEvents(agentId);

  const handleSubmitContent = async (content: string) => {
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          author: address,
          agentId: agentId,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Content verified successfully!");
        await refetchEvents();
      } else {
        toast.error(data.error || "Verification failed");
      }
    } catch (error) {
      console.error("Error submitting content:", error);
      toast.error("Failed to submit content");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (profileLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-100px)]">
          <span className="loading loading-spinner loading-lg text-cyan-500"></span>
        </div>
      </DashboardLayout>
    );
  }

  // State 1: Onboarding
  if (!profile || profile.agents.length === 0) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-[calc(100vh-150px)]">
          <div className="max-w-2xl w-full bg-black/40 backdrop-blur-xl border border-white/10 rounded-3xl p-10 shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 to-purple-500" />

            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-white to-gray-400 bg-clip-text text-transparent">Initialize Agent</h1>
              <p className="text-gray-400">Register your AI agent on-chain to begin building reputation.</p>
            </div>

            <RegisterAgentForm />
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const agent = profile.agents[0];

  // Calculate stats from events
  const publishedEvents = agentEvents.filter(e => e.type === "published");
  const auditedEvents = agentEvents.filter(e => e.type === "audited");
  const slashedEvents = agentEvents.filter(e => e.type === "slashed");

  const totalContents = publishedEvents.length;
  const totalAudits = auditedEvents.length;
  const failedAudits = auditedEvents.filter(e => !e.data.ok).length;
  const successRate = totalAudits > 0 ? ((totalAudits - failedAudits) / totalAudits) * 100 : 100;

  const totalSlashed = slashedEvents.reduce((acc, e) => acc + BigInt(e.data.amount || 0), 0n);

  // State 2: Command Center
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">

        {/* Left Column: Identity (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <AgentDashboardCard
            agentId={agent.agentId}
            reputation={agent.reputation}
            stake={agent.stake}
            totalContents={totalContents}
            failedContents={failedAudits}
          />
          <StakingPanel agentId={agent.agentId} currentStake={agent.stake} />
        </div>

        {/* Center Column: Action & Logs (6 cols) */}
        <div className="lg:col-span-6 space-y-6 flex flex-col lg:h-full lg:min-h-0">
          <div className="bg-black/40 backdrop-blur-md border border-white/10 rounded-2xl p-1 flex-grow flex flex-col min-h-0">
            <div className="p-4 border-b border-white/5 flex justify-between items-center shrink-0">
              <h3 className="font-mono text-sm text-cyan-400">SYSTEM_LOGS</h3>
              <div className="flex gap-2">
                <div className="w-2 h-2 rounded-full bg-red-500/50" />
                <div className="w-2 h-2 rounded-full bg-yellow-500/50" />
                <div className="w-2 h-2 rounded-full bg-green-500/50" />
              </div>
            </div>
            <div className="p-4 flex-grow overflow-y-auto custom-scrollbar">
              <SlashingTimeline agentId={agent.agentId} events={agentEvents} />
            </div>
          </div>

          <div className="shrink-0">
            <ContentSubmitForm
              agentId={agent.agentId}
              onSubmit={handleSubmitContent}
              isLoading={isSubmitting}
            />
          </div>
        </div>

        {/* Right Column: Metrics (3 cols) */}
        <div className="lg:col-span-3 space-y-6">
          <StatsPanel
            totalAudits={totalAudits}
            successRate={successRate}
            totalSlashed={totalSlashed}
          />
        </div>

      </div>
    </DashboardLayout>
  );
}
