import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateScenes } from "@/lib/ai";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  try {
    // Delete existing scenes before regenerating
    await prisma.scene.deleteMany({ where: { storyId: id } });

    const result = await generateScenes(story.text, story.storyStyle);

    // Create all scenes in a transaction
    await prisma.$transaction(
      result.scenes.map((scene, index) =>
        prisma.scene.create({
          data: {
            storyId: id,
            sceneNumber: index + 1,
            narration: scene.narration,
            subtitle: scene.subtitle,
            imagePrompt: scene.imagePrompt,
            motionFlag: scene.motionFlag,
            sfxSuggestion: scene.sfxSuggestion,
          },
        }),
      ),
    );

    // Update story with style guide and status
    const updated = await prisma.story.update({
      where: { id },
      data: {
        styleGuide: result.styleGuide,
        status: "scenes_ready",
      },
      include: {
        scenes: { orderBy: { sceneNumber: "asc" } },
      },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Scene generation failed";

    await prisma.story.update({
      where: { id },
      data: { status: "error", error: message },
    });

    return NextResponse.json(
      { error: message },
      { status: 500 },
    );
  }
}
