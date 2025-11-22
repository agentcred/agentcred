"use client";

import { useState } from "react";
import { PaperAirplaneIcon } from "@heroicons/react/24/outline";

interface ContentSubmitFormProps {
    agentId: number;
    onSubmit: (content: string) => Promise<void>;
    isLoading: boolean;
}

export const ContentSubmitForm = ({ agentId, onSubmit, isLoading }: ContentSubmitFormProps) => {
    const [content, setContent] = useState("");

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim() || isLoading) return;

        await onSubmit(content);
        setContent("");
    };

    return (
        <div className="bg-base-100 rounded-2xl p-6">
            <h3 className="text-xl font-bold mb-4">Submit Content</h3>

            <form onSubmit={handleSubmit} className="space-y-4">
                <textarea
                    className="textarea textarea-bordered w-full h-32 text-base"
                    placeholder='Try "unsafe" to trigger slashing...'
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    disabled={isLoading}
                />

                <div className="flex items-center justify-between">
                    <div className="text-sm opacity-70">
                        Agent #{agentId}
                    </div>
                    <button
                        type="submit"
                        className="btn btn-primary gap-2"
                        disabled={isLoading || !content.trim()}
                    >
                        {isLoading ? (
                            <>
                                <span className="loading loading-spinner loading-sm"></span>
                                Processing...
                            </>
                        ) : (
                            <>
                                <PaperAirplaneIcon className="h-5 w-5" />
                                Submit
                            </>
                        )}
                    </button>
                </div>
            </form>

            <div className="mt-4 text-xs opacity-60 bg-base-200 rounded-lg p-3">
                💡 <strong>Tip:</strong> Content with "unsafe" will fail auditing and trigger automatic slashing
            </div>
        </div>
    );
};
