"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface Scene {
  id: string;
  sceneNumber: number;
  narration: string | null;
  subtitle: string | null;
  imagePrompt: string | null;
  imageUrl: string | null;
  imageStatus: string;
  videoUrl: string | null;
  videoStatus: string;
  motionFlag: string;
  duration: number;
}

interface Story {
  id: string;
  title: string;
  status: string;
  scenes: Scene[];
}

export default function EditorPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [story, setStory] = useState<Story | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rendering, setRendering] = useState(false);

  const fetchStory = useCallback(async () => {
    try {
      const res = await fetch(`/api/stories/${params.id}`);
      if (!res.ok) throw new Error("Failed to load story");
      const data = await res.json();
      setStory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStory();
  }, [fetchStory]);

  const selectedScene = story?.scenes[selectedIndex] ?? null;

  const updateScene = async (field: "narration" | "subtitle", value: string) => {
    if (!selectedScene || !story) return;

    const updated = {
      ...story,
      scenes: story.scenes.map((s, i) =>
        i === selectedIndex ? { ...s, [field]: value } : s
      ),
    };
    setStory(updated);
  };

  const saveScene = async () => {
    if (!selectedScene || !story) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scenes: story.scenes.map((s) => ({
            id: s.id,
            narration: s.narration,
            subtitle: s.subtitle,
          })),
        }),
      });
      if (!res.ok) throw new Error("Failed to save");
    } catch {
      setError("Failed to save scene");
    } finally {
      setSaving(false);
    }
  };

  const handleRender = async () => {
    if (!story) return;
    setRendering(true);
    try {
      const res = await fetch(`/api/stories/${story.id}/render`, {
        method: "POST",
      });
      if (!res.ok) throw new Error("Render failed");
      router.push(`/story/${story.id}`);
    } catch {
      setError("Render failed");
      setRendering(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <p className="text-zinc-400">Loading editor...</p>
      </div>
    );
  }

  if (error || !story) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950">
        <div className="text-center">
          <p className="text-red-400">{error ?? "Story not found"}</p>
          <Link
            href={`/story/${params.id}`}
            className="mt-4 inline-block text-sm text-zinc-400 hover:text-zinc-200"
          >
            &larr; Back to story
          </Link>
        </div>
      </div>
    );
  }

  const previewSrc = selectedScene?.videoUrl ?? selectedScene?.imageUrl ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      {/* Top: Header */}
      <header className="flex items-center justify-between border-b border-zinc-800 px-4 py-3">
        <Link
          href={`/story/${story.id}`}
          className="text-sm text-zinc-400 hover:text-zinc-200"
        >
          &larr; Back
        </Link>
        <h1 className="truncate px-3 text-sm font-semibold">{story.title}</h1>
        <button
          onClick={saveScene}
          disabled={saving}
          className="rounded-md bg-zinc-800 px-3 py-1.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </header>

      {/* Video Preview Area - 16:9 */}
      <div className="relative w-full bg-black">
        <div className="relative aspect-video w-full">
          {previewSrc ? (
            selectedScene?.videoUrl ? (
              <video
                key={selectedScene.id}
                controls
                className="absolute inset-0 h-full w-full object-contain"
                src={selectedScene.videoUrl}
              />
            ) : (
              <>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewSrc}
                  alt={`Scene ${selectedScene?.sceneNumber}`}
                  className="absolute inset-0 h-full w-full object-contain"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-black/50 text-white/80">
                    <svg
                      className="ml-1 h-7 w-7"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  </div>
                </div>
              </>
            )
          ) : (
            <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
              <p className="text-sm text-zinc-600">No preview available</p>
            </div>
          )}
        </div>
      </div>

      {/* Scene Strip - Horizontal scrollable */}
      <div className="border-y border-zinc-800 bg-zinc-900">
        <div className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none">
          {story.scenes.map((scene, index) => (
            <button
              key={scene.id}
              onClick={() => setSelectedIndex(index)}
              className={`relative flex-shrink-0 overflow-hidden rounded-lg border-2 transition-colors ${
                index === selectedIndex
                  ? "border-blue-500"
                  : "border-zinc-700 hover:border-zinc-500"
              }`}
              style={{ width: 72, height: 48 }}
            >
              {scene.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={scene.imageUrl}
                  alt={`Scene ${scene.sceneNumber}`}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center bg-zinc-800">
                  <span className="text-xs text-zinc-500">
                    {scene.sceneNumber}
                  </span>
                </div>
              )}
              <span className="absolute bottom-0 left-0 bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-zinc-300">
                {scene.sceneNumber}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Selected Scene Panel */}
      <div className="flex-1 overflow-y-auto px-4 pb-24 pt-4">
        {selectedScene ? (
          <div className="space-y-4">
            {/* Scene header */}
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-zinc-200">
                Scene {selectedScene.sceneNumber}
              </h2>
              {selectedScene.motionFlag === "video" && (
                <span className="rounded-full bg-emerald-900 px-2 py-0.5 text-[10px] font-medium text-emerald-300">
                  video
                </span>
              )}
              <span className="rounded-full bg-zinc-800 px-2 py-0.5 text-[10px] font-medium text-zinc-400">
                {selectedScene.duration}s
              </span>
            </div>

            {/* Image thumbnail */}
            {selectedScene.imageUrl && (
              <div className="overflow-hidden rounded-lg">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedScene.imageUrl}
                  alt={`Scene ${selectedScene.sceneNumber}`}
                  className="w-full rounded-lg"
                />
              </div>
            )}

            {/* Narration textarea */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Narration
              </label>
              <textarea
                value={selectedScene.narration ?? ""}
                onChange={(e) => updateScene("narration", e.target.value)}
                rows={4}
                className="w-full resize-none rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter narration text..."
              />
            </div>

            {/* Subtitle field */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                Subtitle
              </label>
              <input
                type="text"
                value={selectedScene.subtitle ?? ""}
                onChange={(e) => updateScene("subtitle", e.target.value)}
                className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 placeholder-zinc-600 focus:border-blue-500 focus:outline-none"
                placeholder="Enter subtitle text..."
              />
            </div>

            {/* Image prompt (read-only) */}
            {selectedScene.imagePrompt && (
              <div>
                <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                  Image Prompt
                </label>
                <p className="rounded-lg bg-zinc-900 px-3 py-2.5 text-xs text-zinc-500">
                  {selectedScene.imagePrompt}
                </p>
              </div>
            )}
          </div>
        ) : (
          <p className="text-center text-sm text-zinc-500">
            No scenes available
          </p>
        )}
      </div>

      {/* Fixed Footer */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
        <button
          onClick={handleRender}
          disabled={rendering || story.scenes.length === 0}
          className="w-full rounded-lg bg-blue-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {rendering ? "Starting Render..." : "Render Final Video"}
        </button>
      </div>
    </div>
  );
}
