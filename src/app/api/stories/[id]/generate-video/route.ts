import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVideo } from "@/lib/veo";

type RouteContext = { params: Promise<{ id: string }> };

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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

  const videoScenes = story.scenes.filter(
    (s) => s.motionFlag === "video" && s.imageUrl,
  );

  if (videoScenes.length === 0) {
    return NextResponse.json(
      { error: "No scenes with motionFlag 'video' and an image found" },
      { status: 400 },
    );
  }

  try {
    for (let i = 0; i < videoScenes.length; i++) {
      const scene = videoScenes[i];

      // 3 second delay between requests to avoid rate limits
      if (i > 0) {
        await sleep(3000);
      }

      await prisma.scene.update({
        where: { id: scene.id },
        data: { videoStatus: "generating" },
      });

      try {
        const result = await generateVideo(
          scene.imageUrl!,
          story.id,
          scene.sceneNumber,
        );

        await prisma.scene.update({
          where: { id: scene.id },
          data: { videoUrl: result.publicUrl, videoStatus: "done" },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Video generation failed";

        await prisma.scene.update({
          where: { id: scene.id },
          data: { videoStatus: "error" },
        });

        console.error(`Scene ${scene.sceneNumber} video error:`, message);
      }
    }

    const updated = await prisma.story.findUnique({
      where: { id },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Video generation failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
