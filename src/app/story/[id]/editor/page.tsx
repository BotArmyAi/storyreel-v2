"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  voiceId: string;
  voiceVolume: number;
  musicUrl: string | null;
  musicVolume: number;
  subtitleStyle: string;
  subtitleColor: string;
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
  const [regeneratingImage, setRegeneratingImage] = useState(false);
  const [generatingVideo, setGeneratingVideo] = useState(false);

  // Global controls state
  const [voiceId, setVoiceId] = useState("en-US-Chirp3-HD-Aoede");
  const [voiceVolume, setVoiceVolume] = useState(100);
  const [musicVolume, setMusicVolume] = useState(15);
  const [subtitleStyle, setSubtitleStyle] = useState("karaoke");
  const [subtitleColor, setSubtitleColor] = useState("#FFFFFF");
  const [uploadingMusic, setUploadingMusic] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);
  const [previewingVoice, setPreviewingVoice] = useState(false);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const sceneStripRef = useRef<HTMLDivElement>(null);
  const [showScrollHint, setShowScrollHint] = useState(false);

  const fetchStory = useCallback(async () => {
    setLoading(true);
    setTimedOut(false);
    setError(null);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setTimedOut(true), 10000);
    try {
      const res = await fetch(`/api/stories/${params.id}`);
      if (!res.ok) throw new Error("Failed to load story");
      const data = await res.json();
      setStory(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStory();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchStory]);

  // Sync global controls when story loads
  useEffect(() => {
    if (!story) return;
    setVoiceId(story.voiceId);
    setVoiceVolume(Math.round(story.voiceVolume * 100));
    setMusicVolume(Math.round(story.musicVolume * 100));
    setSubtitleStyle(story.subtitleStyle);
    setSubtitleColor(story.subtitleColor);
  }, [story?.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Check if scene strip is scrollable for fade hint
  useEffect(() => {
    const el = sceneStripRef.current;
    if (!el) return;
    const check = () => setShowScrollHint(el.scrollWidth > el.clientWidth);
    check();
    const observer = new ResizeObserver(check);
    observer.observe(el);
    return () => observer.disconnect();
  }, [story?.scenes.length]);

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

  const handleRegenerateImage = async () => {
    if (!selectedScene || !story) return;
    setRegeneratingImage(true);
    try {
      const res = await fetch(
        `/api/stories/${story.id}/scenes/${selectedScene.id}/regenerate-image`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to regenerate image");
      }
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to regenerate image");
    } finally {
      setRegeneratingImage(false);
    }
  };

  const handleGenerateVideo = async () => {
    if (!selectedScene || !story) return;
    setGeneratingVideo(true);
    try {
      const res = await fetch(
        `/api/stories/${story.id}/scenes/${selectedScene.id}/generate-video`,
        { method: "POST" },
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to generate video");
      }
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate video");
    } finally {
      setGeneratingVideo(false);
    }
  };

  const handleMusicUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !story) return;
    setUploadingMusic(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch(`/api/stories/${story.id}/upload-music`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to upload music");
      }
      await fetchStory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload music");
    } finally {
      setUploadingMusic(false);
    }
  };

  const handleSaveSettings = async () => {
    if (!story) return;
    setSavingSettings(true);
    try {
      const res = await fetch(`/api/stories/${story.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          voiceId,
          voiceVolume: voiceVolume / 100,
          musicVolume: musicVolume / 100,
          subtitleStyle,
          subtitleColor,
        }),
      });
      if (!res.ok) throw new Error("Failed to save settings");
      await fetchStory();
    } catch {
      setError("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handlePreviewVoice = async () => {
    setPreviewingVoice(true);
    try {
      // Revoke old blob URL
      if (voiceAudioUrl) URL.revokeObjectURL(voiceAudioUrl);

      const res = await fetch("/api/preview-voice", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ voiceId }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? "Failed to preview voice");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      setVoiceAudioUrl(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to preview voice");
    } finally {
      setPreviewingVoice(false);
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
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-zinc-950">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-blue-500" />
        <p className="text-sm text-zinc-400">Loading editor...</p>
        {timedOut && (
          <div className="flex flex-col items-center gap-3">
            <p className="text-xs text-zinc-500">
              Taking longer than expected.
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => fetchStory()}
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-500"
              >
                Retry
              </button>
              <Link
                href={`/story/${params.id}`}
                className="text-sm text-zinc-400 hover:text-zinc-200"
              >
                &larr; Back to story
              </Link>
            </div>
          </div>
        )}
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

      {/* Desktop: Two-column layout / Mobile: Stacked */}
      <div className="flex flex-1 flex-col lg:flex-row lg:overflow-hidden">
        {/* Left Column: Video Preview (desktop 60%) */}
        <div className="flex items-center justify-center bg-black lg:w-[60%]">
          <div className="relative w-full max-w-[400px] lg:mx-auto">
            <div className="relative aspect-[9/16] max-h-[300px] w-full lg:max-h-[500px]">
              {previewSrc ? (
                selectedScene?.videoUrl ? (
                  <video
                    key={selectedScene.id + "-video"}
                    controls
                    playsInline
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
                  </>
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-zinc-900">
                  <p className="text-sm text-zinc-600">Select a scene to preview</p>
                </div>
              )}

              {/* Subtitle overlay */}
              {subtitleStyle !== "none" && selectedScene?.subtitle && (
                <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center px-4">
                  <span
                    className="rounded px-3 py-1.5 text-center text-sm font-semibold"
                    style={{
                      color: subtitleColor,
                      backgroundColor: "rgba(0, 0, 0, 0.6)",
                      textShadow: "0 1px 3px rgba(0,0,0,0.8)",
                    }}
                  >
                    {selectedScene.subtitle}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Scene strip + Scene details + Global controls (desktop 40%) */}
        <div className="flex flex-1 flex-col overflow-hidden lg:w-[40%]">
          {/* Scene Strip - Horizontal scrollable */}
          <div className="relative border-y border-zinc-800 bg-zinc-900">
            <div
              ref={sceneStripRef}
              className="flex gap-2 overflow-x-auto px-3 py-3 scrollbar-none"
            >
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
            {/* Scroll fade hint on mobile */}
            {showScrollHint && (
              <div className="pointer-events-none absolute bottom-0 right-0 top-0 w-8 bg-gradient-to-l from-zinc-900 to-transparent lg:hidden" />
            )}
          </div>

          {/* Scrollable panel: Scene details + Global controls */}
          <div className="flex-1 overflow-y-auto pb-20">
            {/* Selected Scene Panel */}
            <div className="px-4 pt-4">
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

                  {/* Scene action buttons */}
                  <div className="flex gap-2">
                    <button
                      onClick={handleRegenerateImage}
                      disabled={regeneratingImage || !selectedScene.imagePrompt}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {regeneratingImage ? "Regenerating..." : "Regenerate Image"}
                    </button>
                    <button
                      onClick={handleGenerateVideo}
                      disabled={generatingVideo || !selectedScene.imageUrl}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {generatingVideo ? "Generating..." : "Make Video"}
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-center text-sm text-zinc-500">
                  No scenes available
                </p>
              )}
            </div>

            {/* Global Controls */}
            <div className="border-t border-zinc-800 bg-zinc-900 mt-4 px-4 pb-4 pt-4">
              <h2 className="mb-4 text-sm font-semibold text-zinc-200">
                Global Controls
              </h2>
              <div className="space-y-4">
                {/* Voice selector */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Voice
                  </label>
                  <div className="flex gap-2">
                    <select
                      value={voiceId}
                      onChange={(e) => setVoiceId(e.target.value)}
                      className="flex-1 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                    >
                      {[
                        "Aoede",
                        "Charon",
                        "Fenrir",
                        "Kore",
                        "Leda",
                        "Orus",
                        "Puck",
                        "Zephyr",
                      ].map((name) => (
                        <option
                          key={name}
                          value={`en-US-Chirp3-HD-${name}`}
                        >
                          {name}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={handlePreviewVoice}
                      disabled={previewingVoice}
                      className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700 disabled:opacity-50"
                    >
                      {previewingVoice ? "Loading..." : "Preview"}
                    </button>
                  </div>
                  {voiceAudioUrl && (
                    <audio
                      key={voiceAudioUrl}
                      controls
                      playsInline
                      autoPlay
                      className="mt-2 w-full"
                      src={voiceAudioUrl}
                    />
                  )}
                </div>

                {/* Voice volume */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Voice Volume — {voiceVolume}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={voiceVolume}
                    onChange={(e) => setVoiceVolume(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Music upload */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Background Music
                  </label>
                  {story?.musicUrl && (
                    <p className="mb-1.5 truncate text-xs text-zinc-500">
                      Current: {story.musicUrl.split("/").pop()}
                    </p>
                  )}
                  <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-xs font-medium text-zinc-200 transition-colors hover:bg-zinc-700">
                    {uploadingMusic ? "Uploading..." : "Upload Music"}
                    <input
                      type="file"
                      accept=".mp3,.wav,.ogg,.aac,.m4a"
                      onChange={handleMusicUpload}
                      disabled={uploadingMusic}
                      className="hidden"
                    />
                  </label>
                </div>

                {/* Music volume */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Music Volume — {musicVolume}%
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={100}
                    value={musicVolume}
                    onChange={(e) => setMusicVolume(Number(e.target.value))}
                    className="w-full accent-blue-500"
                  />
                </div>

                {/* Subtitle style */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Subtitle Style
                  </label>
                  <select
                    value={subtitleStyle}
                    onChange={(e) => setSubtitleStyle(e.target.value)}
                    className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2.5 text-sm text-zinc-100 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="karaoke">Karaoke</option>
                    <option value="static">Static</option>
                    <option value="none">None</option>
                  </select>
                </div>

                {/* Subtitle color */}
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-400">
                    Subtitle Color
                  </label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={subtitleColor}
                      onChange={(e) => setSubtitleColor(e.target.value)}
                      className="h-10 w-10 cursor-pointer rounded border border-zinc-700 bg-zinc-800"
                    />
                    <div
                      className="h-6 w-6 rounded border border-zinc-600"
                      style={{ backgroundColor: subtitleColor }}
                    />
                    <span className="text-xs text-zinc-400">{subtitleColor}</span>
                  </div>
                </div>

                {/* Save Settings */}
                <button
                  onClick={handleSaveSettings}
                  disabled={savingSettings}
                  className="w-full rounded-lg bg-zinc-700 py-2.5 text-sm font-medium text-zinc-100 transition-colors hover:bg-zinc-600 disabled:opacity-50"
                >
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Sticky Footer - Render Button */}
      <div className="sticky bottom-0 border-t border-zinc-800 bg-zinc-950 px-4 py-3">
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
