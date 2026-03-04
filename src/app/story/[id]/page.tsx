import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Scene } from "@/generated/prisma/client";
import GenerateScenesButton from "./generate-button";
import GenerateImagesButton from "./generate-images-button";
import GenerateAudioButton from "./generate-audio-button";
import GenerateVideoButton from "./generate-video-button";
import RenderButton from "./render-button";
import SceneActions from "./scene-actions";

interface StoryPageProps {
  params: Promise<{ id: string }>;
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  draft: { label: "Draft", color: "bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-400" },
  generating: { label: "Generating", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  scenes_ready: { label: "Scenes Ready", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  audio_ready: { label: "Audio Ready", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  rendering: { label: "Rendering", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  completed: { label: "Completed", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  error: { label: "Error", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
};

const SCENE_STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pending: { label: "Pending", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
  generating: { label: "Generating", color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300" },
  ready: { label: "Ready", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  completed: { label: "Ready", color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300" },
  error: { label: "Error", color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300" },
  none: { label: "None", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" },
};

function formatVoiceName(voiceId: string): string {
  const match = voiceId.match(/Chirp3-HD-(\w+)$/);
  return match ? match[1] : voiceId;
}

function getStatusBadge(status: string, map: Record<string, { label: string; color: string }>) {
  const entry = map[status] ?? { label: status, color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400" };
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${entry.color}`}>
      {entry.label}
    </span>
  );
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
            {getStatusBadge(story.status, STATUS_LABELS)}
          </div>

          <p className="mt-1 text-sm text-zinc-500">
            Created {new Date(story.createdAt).toLocaleDateString()}
          </p>

          {story.scenes.length > 0 && (
            <Link
              href={`/story/${story.id}/editor`}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-500"
            >
              Open Editor
            </Link>
          )}
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
                {formatVoiceName(story.voiceId)}
              </dd>
            </div>
            <div>
              <dt className="text-zinc-500">Subtitles</dt>
              <dd className="font-medium capitalize text-zinc-900 dark:text-zinc-100">
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
            <div className="flex flex-wrap items-center gap-2">
              <GenerateScenesButton storyId={story.id} />
              <GenerateImagesButton
                storyId={story.id}
                hasScenes={story.scenes.length > 0}
              />
              <GenerateVideoButton
                storyId={story.id}
                hasVideoScenes={story.scenes.some(
                  (s) => s.motionFlag === "video" && s.imageUrl,
                )}
              />
            </div>
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
                  <div className="flex gap-4">
                    {/* Scene thumbnail */}
                    <div className="flex-shrink-0">
                      {scene.imageUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={scene.imageUrl}
                          alt={`Scene ${scene.sceneNumber}`}
                          className="h-20 w-28 rounded-md object-cover"
                        />
                      ) : (
                        <div className="flex h-20 w-28 items-center justify-center rounded-md bg-zinc-100 dark:bg-zinc-900">
                          <span className="text-xs text-zinc-400">No image</span>
                        </div>
                      )}
                    </div>

                    {/* Scene content */}
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-zinc-900 dark:text-zinc-100">
                            Scene {scene.sceneNumber}
                          </span>
                          {scene.motionFlag === "video" && (
                            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              video
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {getStatusBadge(scene.imageStatus, SCENE_STATUS_LABELS)}
                          {scene.videoStatus !== "none" && (
                            <span className="flex items-center gap-1">
                              <span className="text-xs text-zinc-400">vid:</span>
                              {getStatusBadge(scene.videoStatus, SCENE_STATUS_LABELS)}
                            </span>
                          )}
                        </div>
                      </div>

                      {scene.narration && (
                        <p className="text-sm text-zinc-600 dark:text-zinc-400">
                          {scene.narration}
                        </p>
                      )}

                      {scene.videoUrl && (
                        <video
                          controls
                          playsInline
                          className="w-full rounded-lg"
                          src={scene.videoUrl}
                        />
                      )}

                      <SceneActions
                        storyId={story.id}
                        sceneId={scene.id}
                        hasImagePrompt={!!scene.imagePrompt}
                        hasImage={!!scene.imageUrl}
                        imagePrompt={scene.imagePrompt}
                      />
                    </div>
                  </div>
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
          <h2 className="mb-3 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
            Render Final Video
          </h2>
          <RenderButton
            storyId={story.id}
            hasScenes={story.scenes.some((s) => s.imageUrl || s.videoUrl)}
            latestRender={
              story.renders.length > 0
                ? {
                    id: story.renders[0].id,
                    status: story.renders[0].status,
                    videoUrl: story.renders[0].videoUrl,
                    duration: story.renders[0].duration,
                    fileSize: story.renders[0].fileSize,
                    renderTimeMs: story.renders[0].renderTimeMs,
                    error: story.renders[0].error,
                  }
                : null
            }
          />
        </section>
      </div>
    </div>
  );
}
