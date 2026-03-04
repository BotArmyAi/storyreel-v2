"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface RenderInfo {
  id: string;
  status: string;
  videoUrl: string | null;
  duration: number | null;
  fileSize: number | null;
  renderTimeMs: number | null;
  error: string | null;
}

interface Props {
  storyId: string;
  hasScenes: boolean;
  latestRender: RenderInfo | null;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = Math.round(sec % 60);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

export default function RenderButton({
  storyId,
  hasScenes,
  latestRender,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleRender() {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/stories/${storyId}/render`, {
        method: "POST",
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Render failed");
      }

      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (!hasScenes) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button
          onClick={handleRender}
          disabled={loading}
          className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Rendering..." : "Render Final Video"}
        </button>
        {loading && (
          <span className="text-sm text-zinc-500">
            This may take a few minutes...
          </span>
        )}
      </div>

      {latestRender && latestRender.status === "completed" && latestRender.videoUrl && (
        <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
              Latest Render
            </span>
            <div className="flex items-center gap-3 text-xs text-zinc-500">
              {latestRender.duration != null && (
                <span>{formatDuration(latestRender.duration)}</span>
              )}
              {latestRender.fileSize != null && (
                <span>{formatBytes(latestRender.fileSize)}</span>
              )}
              {latestRender.renderTimeMs != null && (
                <span>
                  rendered in {(latestRender.renderTimeMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
          </div>
          <video
            controls
            className="w-full rounded-lg"
            src={latestRender.videoUrl}
          >
            Your browser does not support the video element.
          </video>
          <a
            href={latestRender.videoUrl}
            download
            className="mt-2 inline-block text-sm text-rose-600 hover:text-rose-700 dark:text-rose-400"
          >
            Download MP4
          </a>
        </div>
      )}

      {latestRender && latestRender.status === "rendering" && !loading && (
        <p className="text-sm text-zinc-500">Render in progress...</p>
      )}

      {latestRender && latestRender.status === "error" && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Render failed: {latestRender.error ?? "Unknown error"}
        </p>
      )}

      {error && (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
