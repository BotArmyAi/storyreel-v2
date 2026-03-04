"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  storyId: string;
  sceneId: string;
  hasImagePrompt: boolean;
  hasImage: boolean;
  imagePrompt: string | null;
}

export default function SceneActions({
  storyId,
  sceneId,
  hasImagePrompt,
  hasImage,
  imagePrompt,
}: Props) {
  const router = useRouter();
  const [regenerating, setRegenerating] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promptOpen, setPromptOpen] = useState(false);

  async function handleRegenerateImage() {
    setRegenerating(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/scenes/${sceneId}/regenerate-image`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to regenerate image");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setRegenerating(false);
    }
  }

  async function handleGenerateVideo() {
    setGeneratingVideo(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/stories/${storyId}/scenes/${sceneId}/generate-video`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate video");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setGeneratingVideo(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          onClick={handleRegenerateImage}
          disabled={regenerating || !hasImagePrompt}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {regenerating ? "Regenerating..." : "Regenerate Image"}
        </button>
        <button
          onClick={handleGenerateVideo}
          disabled={generatingVideo || !hasImage}
          className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          {generatingVideo ? "Generating..." : "Generate Video"}
        </button>
      </div>

      {imagePrompt && (
        <div>
          <button
            onClick={() => setPromptOpen(!promptOpen)}
            className="text-xs text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
          >
            {promptOpen ? "Hide" : "Show"} image prompt
          </button>
          {promptOpen && (
            <p className="mt-1 rounded-md bg-zinc-100 px-3 py-2 text-xs text-zinc-600 dark:bg-zinc-900 dark:text-zinc-400">
              {imagePrompt}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}
