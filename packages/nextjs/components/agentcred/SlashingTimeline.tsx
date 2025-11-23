"use client";

import { formatEther } from "viem";
import { AgentEvent } from "~~/hooks/agentcred/useAgentEvents";

interface SlashingTimelineProps {
  agentId: number;
  events: AgentEvent[];
}

export const SlashingTimeline = ({ agentId, events }: SlashingTimelineProps) => {
  // Events are already sorted by timestamp desc in the hook
  const sortedEvents = events;

  if (events.length === 0) {
    return (
      <div className="font-mono text-sm text-gray-500 p-4">
        <span className="text-cyan-500">$</span> system_status --check
        <br />
        <span className="text-yellow-500">Waiting for input...</span>
      </div>
    );
  }

  return (
    <div className="font-mono text-sm space-y-1">
      {sortedEvents.map((event, idx) => {
        const time = new Date(event.timestamp * 1000).toLocaleTimeString([], { hour12: false });
        const key = `${event.transactionHash}-${idx}`;

        if (event.type === "published") {
          return (
            <div key={key} className="group hover:bg-white/5 p-1 rounded transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 select-none">[{time}]</span>
                <div className="flex items-center gap-2">
                  <span className="text-blue-400">CONTENT_PUB</span>
                  <span className="text-gray-500">::</span>
                  <span className="text-white">{event.data.contentHash?.slice(0, 12)}...</span>
                </div>
              </div>
            </div>
          );
        }

        if (event.type === "audited") {
          const ok = event.data.ok;
          const score = Number(event.data.score);
          const contentHash = event.data.contentHash || "unknown";

          return (
            <div key={key} className="group hover:bg-white/5 p-1 rounded transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 select-none">[{time}]</span>
                <div className="flex items-center gap-2">
                  <span className={ok ? "text-green-400" : "text-red-400"}>{ok ? "AUDIT_PASS" : "AUDIT_FAIL"}</span>
                  <span className="text-gray-500">::</span>
                  <span className="text-white">{contentHash.slice(0, 12)}...</span>
                  <span className="text-gray-500">::</span>
                  <span className={score >= 50 ? "text-green-400" : score >= 20 ? "text-yellow-400" : "text-red-400"}>
                    SCORE_{score}
                  </span>
                </div>
              </div>
            </div>
          );
        }

        if (event.type === "slashed") {
          const amount = formatEther(BigInt(event.data.amount || 0));
          const reason = event.data.reason || "Unknown";

          return (
            <div key={key} className="group hover:bg-white/5 p-1 rounded transition-colors bg-red-900/10">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 select-none">[{time}]</span>
                <div className="flex flex-col">
                  <div className="flex items-center gap-2">
                    <span className="text-red-500 font-bold">!!! SLASHED !!!</span>
                    <span className="text-gray-500">::</span>
                    <span className="text-red-400">-{amount} CRED</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">REASON: {reason}</div>
                </div>
              </div>
            </div>
          );
        }

        if (event.type === "reputation") {
          const newScore = Number(event.data.newScore || 0);
          const delta = Number(event.data.delta || 0);

          return (
            <div key={key} className="group hover:bg-white/5 p-1 rounded transition-colors">
              <div className="flex items-start gap-3">
                <span className="text-gray-600 select-none">[{time}]</span>
                <div className="flex items-center gap-2">
                  <span className="text-purple-400">REP_UPDATE</span>
                  <span className="text-gray-500">::</span>
                  <span className={delta >= 0 ? "text-green-400" : "text-red-400"}>
                    {delta >= 0 ? "+" : ""}
                    {delta}
                  </span>
                  <span className="text-gray-500">&rarr;</span>
                  <span className="text-white">{newScore}</span>
                </div>
              </div>
            </div>
          );
        }

        return null;
      })}
    </div>
  );
};
