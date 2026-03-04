import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateVideo } from "@/lib/veo";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id, sceneId } = await context.params;

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, storyId: id },
  });

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  if (!scene.imageUrl) {
    return NextResponse.json(
      { error: "Scene has no image to generate video from" },
      { status: 400 },
    );
  }

  try {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { videoStatus: "generating" },
    });

    const result = await generateVideo(scene.imageUrl, id, scene.sceneNumber);

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: { videoUrl: result.publicUrl, videoStatus: "done" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Video generation failed";

    await prisma.scene.update({
      where: { id: sceneId },
      data: { videoStatus: "error" },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
