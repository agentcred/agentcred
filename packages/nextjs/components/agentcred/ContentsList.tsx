"use client";

import { formatDistanceToNow } from "date-fns";

interface Content {
    contentHash: string;
    author: string;
    agentId: number;
    status: "Pending" | "Published" | "AuditedOk" | "AuditedFail";
    auditScore: number;
    uri: string;
    timestamp: number;
}

interface ContentsListProps {
    contents: Content[];
    isLoading: boolean;
}

export const ContentsList = ({ contents, isLoading }: ContentsListProps) => {
    const getStatusBadge = (status: string) => {
        switch (status) {
            case "AuditedOk":
                return <span className="badge badge-success">✓ OK</span>;
            case "AuditedFail":
                return <span className="badge badge-error">✗ FAIL</span>;
            case "Published":
                return <span className="badge badge-info">Published</span>;
            case "Pending":
                return <span className="badge badge-warning">Pending</span>;
            default:
                return <span className="badge">{status}</span>;
        }
    };

    const getScoreColor = (score: number, status: string) => {
        if (status === "AuditedFail") return "text-error";
        if (score >= 80) return "text-success";
        if (score >= 50) return "text-warning";
        return "text-error";
    };

    if (isLoading) {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h3 className="card-title">Contents</h3>
                    <div className="flex justify-center items-center py-8">
                        <span className="loading loading-spinner loading-lg"></span>
                    </div>
                </div>
            </div>
        );
    }

    if (contents.length === 0) {
        return (
            <div className="card bg-base-100 shadow-xl">
                <div className="card-body">
                    <h3 className="card-title">Contents</h3>
                    <p className="text-center text-base-content/50 py-8">
                        No contents published yet. Submit your first content below!
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="card bg-base-100 shadow-xl">
            <div className="card-body">
                <h3 className="card-title mb-4">Contents ({contents.length})</h3>

                <div className="overflow-x-auto">
                    <table className="table table-zebra">
                        <thead>
                            <tr>
                                <th>Content Hash</th>
                                <th>Agent</th>
                                <th>Status</th>
                                <th>Score</th>
                                <th>Time</th>
                            </tr>
                        </thead>
                        <tbody>
                            {contents.map((content) => (
                                <tr key={content.contentHash}>
                                    <td>
                                        <code className="text-xs">
                                            {content.contentHash.slice(0, 10)}...{content.contentHash.slice(-8)}
                                        </code>
                                    </td>
                                    <td className="font-mono">#{content.agentId}</td>
                                    <td>{getStatusBadge(content.status)}</td>
                                    <td>
                                        <span className={`font-bold ${getScoreColor(content.auditScore, content.status)}`}>
                                            {content.auditScore}
                                        </span>
                                    </td>
                                    <td className="text-sm opacity-70">
                                        {content.timestamp > 0
                                            ? formatDistanceToNow(new Date(content.timestamp * 1000), { addSuffix: true })
                                            : "N/A"
                                        }
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
