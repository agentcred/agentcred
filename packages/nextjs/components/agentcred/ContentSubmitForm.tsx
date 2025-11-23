"use client";

import { useState } from "react";

interface ContentSubmitFormProps {
  agentId: number;
  onSubmit: (content: string) => Promise<void>;
  isLoading: boolean;
}

export const ContentSubmitForm = ({ onSubmit, isLoading }: ContentSubmitFormProps) => {
  const [content, setContent] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    await onSubmit(content);
    setContent("");
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="relative group">
        <div className="absolute -inset-0.5 bg-gradient-to-r from-cyan-500 to-purple-600 rounded-xl opacity-30 group-hover:opacity-70 transition duration-500 blur"></div>
        <div className="relative flex items-center bg-black rounded-xl p-2 border border-white/10">
          <div className="pl-3 pr-2 text-cyan-500 font-mono text-lg">{">"}</div>
          <input
            type="text"
            placeholder="Enter content hash or data to verify..."
            className="flex-grow bg-transparent border-none focus:ring-0 text-white placeholder-gray-600 font-mono outline-none"
            value={content}
            onChange={e => setContent(e.target.value)}
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={isLoading || !content.trim()}
            className="btn btn-sm bg-white/10 hover:bg-white/20 border-none text-white disabled:opacity-30"
          >
            {isLoading ? (
              <span className="loading loading-spinner loading-xs"></span>
            ) : (
              <span className="font-mono text-xs">EXECUTE</span>
            )}
          </button>
        </div>
      </form>
      <p className="text-xs text-gray-500 mt-1">Paste your content URL or text to verify it&apos;s &quot;real&quot;</p>
      <div className="text-xs text-gray-500 font-mono pl-2">
        <span className="text-cyan-500">TIP:</span> Type "unsafe" to simulate a slashable offense.
      </div>
    </div>
  );
};
