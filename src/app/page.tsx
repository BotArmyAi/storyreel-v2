"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface Story {
  id: string;
  title: string;
  text: string;
  status: string;
  storyStyle: string;
  createdAt: string;
  _count: { scenes: number; renders: number };
}

export default function Home() {
  const [stories, setStories] = useState<Story[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      const res = await fetch("/api/stories");
      if (!res.ok) throw new Error("Failed to fetch stories");
      const data: Story[] = await res.json();
      setStories(data);
    } catch {
      setError("Failed to load stories");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStories();
  }, [fetchStories]);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), text: text.trim() }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create story");
      }

      setTitle("");
      setText("");
      setShowForm(false);
      await fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            StoryReel
          </h1>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {showForm ? "Cancel" : "Create Story"}
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-400">
            {error}
          </div>
        )}

        {showForm && (
          <form onSubmit={handleCreate} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="title"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Title
              </label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="My Story"
              />
            </div>
            <div>
              <label
                htmlFor="text"
                className="block text-sm font-medium text-zinc-700 dark:text-zinc-300"
              >
                Story Text
              </label>
              <textarea
                id="text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                required
                rows={5}
                className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
                placeholder="Once upon a time..."
              />
            </div>
            <button
              type="submit"
              disabled={creating}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        <div className="mt-8">
          {loading ? (
            <p className="text-sm text-zinc-500">Loading stories...</p>
          ) : stories.length === 0 ? (
            <p className="text-sm text-zinc-500">
              No stories yet. Create your first one!
            </p>
          ) : (
            <ul className="space-y-3">
              {stories.map((story) => (
                <li key={story.id}>
                  <Link
                    href={`/story/${story.id}`}
                    className="block rounded-lg border border-zinc-200 p-4 transition-colors hover:border-zinc-400 dark:border-zinc-800 dark:hover:border-zinc-600"
                  >
                    <div className="flex items-center justify-between">
                      <h2 className="font-semibold text-zinc-900 dark:text-zinc-50">
                        {story.title}
                      </h2>
                      <span className="rounded-full bg-zinc-200 px-2.5 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
                        {story.status}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-sm text-zinc-600 dark:text-zinc-400">
                      {story.text}
                    </p>
                    <div className="mt-2 flex gap-4 text-xs text-zinc-500">
                      <span>{story._count.scenes} scenes</span>
                      <span>{story._count.renders} renders</span>
                      <span>{story.storyStyle}</span>
                      <span>
                        {new Date(story.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
