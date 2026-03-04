import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateImage } from "@/lib/imagen";

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

  const scenesWithPrompts = story.scenes.filter((s) => s.imagePrompt);
  if (scenesWithPrompts.length === 0) {
    return NextResponse.json(
      { error: "No scenes with image prompts found" },
      { status: 400 },
    );
  }

  try {
    // Generate images sequentially to avoid rate limits
    for (const scene of scenesWithPrompts) {
      await prisma.scene.update({
        where: { id: scene.id },
        data: { imageStatus: "generating" },
      });

      try {
        const result = await generateImage(
          scene.imagePrompt!,
          story.styleGuide ?? undefined,
        );

        const dataUrl = `data:${result.mimeType};base64,${result.base64}`;

        await prisma.scene.update({
          where: { id: scene.id },
          data: { imageUrl: dataUrl, imageStatus: "done" },
        });
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Image generation failed";

        await prisma.scene.update({
          where: { id: scene.id },
          data: { imageStatus: "error" },
        });

        console.error(`Scene ${scene.sceneNumber} image error:`, message);
      }
    }

    const updated = await prisma.story.findUnique({
      where: { id },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Image generation failed";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
