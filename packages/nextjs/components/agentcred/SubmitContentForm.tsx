"use client";

import { useState } from "react";
import { useAccount } from "wagmi";

interface SubmitContentFormProps {
  availableAgents: Array<{ agentId: number; reputation: number }>;
  onSuccess: () => void;
}

export const SubmitContentForm = ({ availableAgents, onSuccess }: SubmitContentFormProps) => {
  const { address } = useAccount();
  const [content, setContent] = useState("");
  const [agentId, setAgentId] = useState(availableAgents[0]?.agentId || 1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
    details?: any;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      setResult({ success: false, message: "Please enter content" });
      return;
    }

    if (!address) {
      setResult({ success: false, message: "Please connect your wallet" });
      return;
    }

    setIsSubmitting(true);
    setResult(null);

    try {
      const response = await fetch("/api/verify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          author: address,
          agentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to verify content");
      }

      setResult({
        success: true,
        message: `Content ${data.ok ? "passed" : "failed"} audit with score ${data.score}`,
        details: data,
      });

      setContent("");

      // Wait a bit for blockchain to update, then refresh
      setTimeout(() => {
        onSuccess();
      }, 2000);
    } catch (error: any) {
      console.error("Error submitting content:", error);
      setResult({
        success: false,
        message: error.message || "Failed to submit content",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="card bg-base-100 shadow-xl">
      <div className="card-body">
        <h3 className="card-title">Submit Content for Verification</h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Content</span>
              <span className="label-text-alt text-xs">💡 Tip: Include "unsafe" to trigger a failure</span>
            </label>
            <textarea
              className="textarea textarea-bordered h-32"
              placeholder="Enter your content here... Try adding 'unsafe' to see slashing in action!"
              value={content}
              onChange={e => setContent(e.target.value)}
              disabled={isSubmitting}
            />
          </div>

          <div className="form-control">
            <label className="label">
              <span className="label-text font-semibold">Select Agent</span>
            </label>
            <select
              className="select select-bordered"
              value={agentId}
              onChange={e => setAgentId(Number(e.target.value))}
              disabled={isSubmitting || availableAgents.length === 0}
            >
              {availableAgents.length === 0 ? (
                <option>No agents available</option>
              ) : (
                availableAgents.map(agent => (
                  <option key={agent.agentId} value={agent.agentId}>
                    Agent #{agent.agentId} (Rep: {agent.reputation})
                  </option>
                ))
              )}
            </select>
          </div>

          {result && (
            <div className={`alert ${result.success ? "alert-success" : "alert-error"}`}>
              <div>
                <span className="font-semibold">{result.message}</span>
                {result.details && (
                  <div className="text-xs mt-2 opacity-80">
                    Status: {result.details.status} | Score: {result.details.score}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="card-actions justify-end">
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting || !content.trim() || availableAgents.length === 0}
            >
              {isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Verifying...
                </>
              ) : (
                "Verify Content"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
