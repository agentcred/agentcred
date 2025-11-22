"use client";

import { useEffect, useState } from "react";
import { formatEther } from "viem";
import { useAccount } from "wagmi";
import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

interface AuditEvent {
    contentHash: string;
    timestamp: number;
    ok: boolean;
    score: number;
    stakeBefore: bigint;
    stakeAfter: bigint;
    repBefore: number;
    repAfter: number;
    roflVerified?: boolean;
}

interface SlashingTimelineProps {
    agentId: number;
    events: AuditEvent[];
}

export const SlashingTimeline = ({ agentId, events }: SlashingTimelineProps) => {
    const sortedEvents = [...events].sort((a, b) => a.timestamp - b.timestamp);

    if (events.length === 0) {
        return (
            <div className="bg-base-100 rounded-2xl p-6">
                <h3 className="text-xl font-bold mb-4">Activity Timeline</h3>
                <p className="text-sm opacity-60">No audit history yet. Submit content to see results here.</p>
            </div>
        );
    }

    return (
        <div className="bg-base-100 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-6">Activity Timeline</h3>

            <div className="space-y-4">
                {sortedEvents.map((event, idx) => {
                    const stakeChange = Number(event.stakeAfter - event.stakeBefore);
                    const repChange = event.repAfter - event.repBefore;
                    const percentChange = event.stakeBefore > 0n
                        ? (Number(stakeChange) / Number(event.stakeBefore)) * 100
                        : 0;

                    return (
                        <div
                            key={`${event.contentHash}-${idx}`}
                            className={`border-l-4 pl-4 py-3 ${event.ok ? 'border-success' : 'border-error'
                                }`}
                        >
                            <div className="flex items-start justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {event.ok ? (
                                        <CheckCircleIcon className="h-5 w-5 text-success" />
                                    ) : (
                                        <XCircleIcon className="h-5 w-5 text-error" />
                                    )}
                                    <span className="font-semibold">
                                        {event.ok ? 'Content Approved' : 'Content Failed'}
                                    </span>
                                    <span className="badge badge-sm">{event.score}</span>
                                </div>
                                <span className="text-xs opacity-60">
                                    {new Date(event.timestamp * 1000).toLocaleTimeString()}
                                </span>
                            </div>

                            {!event.ok && stakeChange < 0 && (
                                <div className="bg-error bg-opacity-10 rounded-lg p-3 mb-2">
                                    <div className="flex items-center justify-between text-sm">
                                        <span>Stake:</span>
                                        <div className="flex items-center gap-2">
                                            <span className="opacity-70">{formatEther(event.stakeBefore)}</span>
                                            <span>→</span>
                                            <span className="font-bold text-error">
                                                {formatEther(event.stakeAfter)}
                                            </span>
                                            <span className="badge badge-error badge-sm">
                                                {percentChange.toFixed(0)}%
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center gap-4 text-xs opacity-70">
                                <div>
                                    Rep: {event.repBefore} → {event.repAfter}
                                    <span className={repChange > 0 ? 'text-success' : 'text-error'}>
                                        {' '}({repChange > 0 ? '+' : ''}{repChange})
                                    </span>
                                </div>
                                {event.roflVerified && (
                                    <div className="badge badge-sm gap-1">
                                        🔒 ROFL
                                    </div>
                                )}
                            </div>

                            <div className="text-xs opacity-40 mt-1 font-mono">
                                {event.contentHash.slice(0, 16)}...
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
