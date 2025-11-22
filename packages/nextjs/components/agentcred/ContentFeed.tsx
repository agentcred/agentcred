"use client";

import { CheckCircleIcon, XCircleIcon, ClockIcon } from "@heroicons/react/24/outline";

interface ContentItem {
    contentHash: string;
    timestamp: number;
    ok: boolean;
    score: number;
    roflVerified?: boolean;
}

interface ContentFeedProps {
    items: ContentItem[];
    isLoading: boolean;
}

export const ContentFeed = ({ items, isLoading }: ContentFeedProps) => {
    const sortedItems = [...items].sort((a, b) => b.timestamp - a.timestamp);

    return (
        <div className="bg-base-100 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Live Feed</h3>

            {isLoading && items.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                    <span className="loading loading-spinner loading-lg"></span>
                </div>
            ) : items.length === 0 ? (
                <div className="text-center py-8 opacity-60">
                    <ClockIcon className="h-12 w-12 mx-auto mb-2 opacity-30" />
                    <p className="text-sm">No content submitted yet</p>
                </div>
            ) : (
                <div className="space-y-3 max-h-96 overflow-y-auto">
                    {sortedItems.map((item, idx) => (
                        <div
                            key={`${item.contentHash}-${idx}`}
                            className={`rounded-lg p-4 border-2 ${item.ok
                                    ? 'bg-success/10 border-success/30'
                                    : 'bg-error/10 border-error/30'
                                }`}
                        >
                            <div className="flex items-center justify-between mb-2">
                                <div className="flex items-center gap-2">
                                    {item.ok ? (
                                        <CheckCircleIcon className="h-5 w-5 text-success" />
                                    ) : (
                                        <XCircleIcon className="h-5 w-5 text-error" />
                                    )}
                                    <span className="font-semibold text-sm">
                                        {item.ok ? 'Approved' : 'Failed'}
                                    </span>
                                </div>
                                <span className="badge badge-sm">{item.score}</span>
                            </div>

                            <div className="flex items-center gap-2 text-xs">
                                <span className="opacity-60">
                                    {new Date(item.timestamp * 1000).toLocaleTimeString()}
                                </span>
                                {item.roflVerified && (
                                    <span className="badge badge-xs gap-1">
                                        🔒 ROFL
                                    </span>
                                )}
                            </div>

                            <div className="text-xs opacity-40 mt-2 font-mono truncate">
                                {item.contentHash}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};
