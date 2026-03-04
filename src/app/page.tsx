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

const STORY_TOPICS = [
  {
    title: "The Last Signal from Titan",
    text: "A deep-space relay station on Saturn's moon Titan picks up an impossible signal — a human voice speaking a language that won't exist for another 200 years. The lone operator must decide whether to respond, knowing it could rewrite the future of humanity.",
    emoji: "🛸",
  },
  {
    title: "The Painter Who Stole Colors",
    text: "A street artist in Tokyo discovers she can literally pull colors from the real world into her paintings — but every color she takes leaves the original object permanently gray. When she accidentally drains the color from a child's eyes, she must find a way to reverse it before the void spreads.",
    emoji: "🎨",
  },
  {
    title: "Beneath the Antarctic Ice",
    text: "A research team drilling through 3 miles of Antarctic ice breaks into a massive underground ocean that shouldn't exist. Inside, they find a perfectly preserved ancient city — still inhabited by something that has been waiting millions of years to be found.",
    emoji: "🧊",
  },
  {
    title: "The Memory Merchant",
    text: "In a neon-drenched cyberpunk city, a black-market dealer sells stolen memories to the highest bidder. When she accidentally absorbs the memory of her own murder — set to happen in 48 hours — she must unravel who ordered the hit using only fragments of a future she hasn't lived yet.",
    emoji: "🧠",
  },
  {
    title: "When the Ocean Went Silent",
    text: "Every whale on Earth stops singing on the same day. A marine biologist tracking the phenomenon discovers they're all swimming toward the same point in the deep Pacific — a location that doesn't appear on any map, where the ocean floor has begun to glow.",
    emoji: "🐋",
  },
  {
    title: "The Last Bookshop on Earth",
    text: "In 2089, after AI has replaced all human creativity, one defiant old woman runs the last physical bookshop. When a child walks in who has never seen a paper book, she reads him a story that triggers something the AI overlords thought they had erased from humanity forever — imagination.",
    emoji: "📚",
  },
  {
    title: "The Train That Never Stops",
    text: "A mysterious train appears at midnight in abandoned stations across the world. Those who board find each car contains a different era of history, fully alive and interactive. But the train is accelerating, and the last car holds a door to somewhere no passenger has ever returned from.",
    emoji: "🚂",
  },
  {
    title: "The Girl Who Grew Lightning",
    text: "A 12-year-old girl in rural Kenya discovers that during thunderstorms, flowers bloom wherever she walks and electricity arcs from her fingertips. As a massive superstorm approaches, she realizes she isn't just conducting the lightning — she IS the storm, and she must choose between unleashing her full power or losing herself forever.",
    emoji: "⚡",
  },
  {
    title: "The Architect of Dreams",
    text: "A brilliant architect realizes the buildings he designs in his sleep are appearing in real cities overnight — impossible structures that defy physics. When governments start weaponizing his dreams, he must find a way to stop dreaming before his nightmares become reality.",
    emoji: "🏗️",
  },
  {
    title: "First Contact at the Louvre",
    text: "An alien spacecraft doesn't land at the White House or the UN — it parks directly above the Louvre in Paris. The aliens have one request: they want to see the Mona Lisa. A terrified museum curator must figure out why beings who crossed galaxies care about a 500-year-old painting, before humanity's first impression becomes its last.",
    emoji: "👽",
  },
];

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

  async function handleTopicSelect(topic: typeof STORY_TOPICS[number]) {
    setCreating(true);
    setError(null);

    try {
      const res = await fetch("/api/stories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: topic.title, text: topic.text }),
      });

      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        throw new Error(data.error ?? "Failed to create story");
      }

      await fetchStories();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create story");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-4xl px-6 py-12">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
            StoryReel
          </h1>
          <button
            type="button"
            onClick={() => setShowForm(!showForm)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            {showForm ? "Cancel" : "Write Your Own"}
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
              <label htmlFor="title" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Title</label>
              <input id="title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="My Story" />
            </div>
            <div>
              <label htmlFor="text" className="block text-sm font-medium text-zinc-700 dark:text-zinc-300">Story Text</label>
              <textarea id="text" value={text} onChange={(e) => setText(e.target.value)} required rows={5} className="mt-1 w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100" placeholder="Once upon a time..." />
            </div>
            <button type="submit" disabled={creating} className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300">
              {creating ? "Creating..." : "Create"}
            </button>
          </form>
        )}

        {/* Story Topics */}
        {!showForm && (
          <div className="mt-8">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
              Pick a Story
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Select a topic and AI will generate scenes, images, narration, and video.
            </p>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {STORY_TOPICS.map((topic) => (
                <button
                  key={topic.title}
                  type="button"
                  disabled={creating}
                  onClick={() => void handleTopicSelect(topic)}
                  className="group rounded-xl border border-zinc-200 p-4 text-left transition-all hover:border-zinc-400 hover:shadow-md disabled:opacity-50 dark:border-zinc-800 dark:hover:border-zinc-600"
                >
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">{topic.emoji}</span>
                    <div className="min-w-0">
                      <h3 className="font-semibold text-zinc-900 group-hover:text-zinc-700 dark:text-zinc-100 dark:group-hover:text-white">
                        {topic.title}
                      </h3>
                      <p className="mt-1 line-clamp-2 text-xs text-zinc-500 dark:text-zinc-400">
                        {topic.text}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Existing Stories */}
        <div className="mt-10">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Your Stories
          </h2>
          <div className="mt-4">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading stories...</p>
            ) : stories.length === 0 ? (
              <p className="text-sm text-zinc-500">
                No stories yet. Pick a topic above to get started!
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
                        <span>{new Date(story.createdAt).toLocaleDateString()}</span>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
