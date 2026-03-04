import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Scene, Render } from "@/generated/prisma/client";
import GenerateScenesButton from "./generate-button";
import GenerateAudioButton from "./generate-audio-button";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

export default async function StoryPage({ params }: StoryPageProps) {
  const { id } = await params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { sceneNumber: "asc" } },
      renders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!story) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 font-sans dark:bg-black">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <Link
          href="/"
          className="text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-200"
        >
          &larr; Back to stories
        </Link>

        <div className="mt-6">
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
              {story.title}
            </h1>
            <span className="rounded-full bg-zinc-200 px-3 py-0.5 text-xs font-medium text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300">
              {story.status}
            </span>
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Created {new Date(story.createdAt).toLocaleDateString()}
          </p>
        </div>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Story Text
          </h2>
          <p className="mt-2 whitespace-pre-wrap text-zinc-700 dark:text-zinc-300">
            {story.text}
          </p>
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Configuration
          </h2>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
            <div>
              <dt className="text-zinc-500">Style</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {story.storyStyle}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Voice</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {story.voiceId}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Subtitles</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {story.subtitleStyle}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Music Volume</dt>
              <dd className="font-medium text-zinc-900 dark:text-zinc-100">
                {Math.round(story.musicVolume * 100)}%
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-8">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
              Scenes ({story.scenes.length})
            </h2>
            <GenerateScenesButton storyId={story.id} />
          </div>
          {story.scenes.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">
              No scenes generated yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-3">
              {story.scenes.map((scene: Scene) => (
                <li
                  key={scene.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      Scene {scene.sceneNumber}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {scene.imageStatus}
                    </span>
                  </div>
                  {scene.narration && (
                    <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                      {scene.narration}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Narration Audio
          </h2>
          <GenerateAudioButton
            storyId={story.id}
            audioUrl={story.audioUrl}
            audioStatus={story.audioStatus}
          />
        </section>

        <section className="mt-8">
          <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Renders ({story.renders.length})
          </h2>
          {story.renders.length === 0 ? (
            <p className="mt-2 text-sm text-zinc-500">No renders yet.</p>
          ) : (
            <ul className="mt-3 space-y-3">
              {story.renders.map((render: Render) => (
                <li
                  key={render.id}
                  className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-zinc-900 dark:text-zinc-100">
                      {render.type}
                    </span>
                    <span className="text-xs text-zinc-500">
                      {render.status}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
