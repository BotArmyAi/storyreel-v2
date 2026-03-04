"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  storyId: string;
  audioUrl: string | null;
  audioStatus: string;
}

export default function GenerateAudioButton({
  storyId,
  audioUrl,
  audioStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGenerate() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/generate-audio`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Audio generation failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <button
          onClick={handleGenerate}
          disabled={loading}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading
            ? "Generating Audio..."
            : audioUrl
              ? "Regenerate Audio"
              : "Generate Audio"}
        </button>
        {audioStatus === "generating" && !loading && (
          <span className="text-sm text-zinc-500">Generating...</span>
        )}
        {audioStatus === "error" && (
          <span className="text-sm text-red-500">Generation failed</span>
        )}
      </div>

      {audioUrl && (
        <div className="overflow-hidden rounded-lg border border-zinc-200 dark:border-zinc-800">
          <audio controls className="w-full" src={audioUrl}>
            Your browser does not support the audio element.
          </audio>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
