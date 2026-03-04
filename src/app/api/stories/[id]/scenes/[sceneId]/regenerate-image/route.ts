import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/imagen";

type RouteContext = { params: Promise<{ id: string; sceneId: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id, sceneId } = await context.params;

  const scene = await prisma.scene.findFirst({
    where: { id: sceneId, storyId: id },
    include: { story: { select: { styleGuide: true } } },
  });

  if (!scene) {
    return NextResponse.json({ error: "Scene not found" }, { status: 404 });
  }

  if (!scene.imagePrompt) {
    return NextResponse.json(
      { error: "Scene has no image prompt" },
      { status: 400 },
    );
  }

  try {
    await prisma.scene.update({
      where: { id: sceneId },
      data: { imageStatus: "generating" },
    });

    const result = await generateImage(
      scene.imagePrompt,
      scene.story.styleGuide ?? undefined,
    );

    const dataUrl = `data:${result.mimeType};base64,${result.base64}`;

    const updated = await prisma.scene.update({
      where: { id: sceneId },
      data: { imageUrl: dataUrl, imageStatus: "done" },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed";

    await prisma.scene.update({
      where: { id: sceneId },
      data: { imageStatus: "error" },
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
