import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderVideo } from "@/lib/render";
import { v4 as uuid } from "uuid";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: { scenes: { orderBy: { sceneNumber: "asc" } } },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  if (story.scenes.length === 0) {
    return NextResponse.json(
      { error: "No scenes to render" },
      { status: 400 },
    );
  }

  // Check that scenes have at least images
  const readyScenes = story.scenes.filter(
    (s) => s.imageUrl || s.videoUrl,
  );

  if (readyScenes.length === 0) {
    return NextResponse.json(
      { error: "No scenes with images or videos to render" },
      { status: 400 },
    );
  }

  // Create render record
  const render = await prisma.render.create({
    data: {
      id: uuid(),
      storyId: id,
      type: "final",
      status: "rendering",
    },
  });

  try {
    const result = await renderVideo({
      storyId: story.id,
      scenes: story.scenes.map((s) => ({
        sceneNumber: s.sceneNumber,
        imageUrl: s.imageUrl,
        videoUrl: s.videoUrl,
        duration: s.duration,
      })),
      audioUrl: story.audioUrl,
    });

    const updated = await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "completed",
        videoUrl: result.publicUrl,
        duration: result.durationSec,
        fileSize: result.fileSize,
        renderTimeMs: result.renderTimeMs,
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Render failed";

    await prisma.render.update({
      where: { id: render.id },
      data: {
        status: "error",
        error: message,
      },
    });

    console.error(`Render error for story ${id}:`, message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
