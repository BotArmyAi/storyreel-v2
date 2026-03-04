import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateNarration } from "@/lib/tts";

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

  const scenesWithNarration = story.scenes.filter((s) => s.narration);
  if (scenesWithNarration.length === 0) {
    return NextResponse.json(
      { error: "No scenes with narration text found. Generate scenes first." },
      { status: 400 },
    );
  }

  try {
    await prisma.story.update({
      where: { id },
      data: { audioStatus: "generating" },
    });

    const result = await generateNarration(
      id,
      scenesWithNarration.map((s) => ({
        sceneNumber: s.sceneNumber,
        narration: s.narration!,
      })),
      story.voiceId,
    );

    const updated = await prisma.story.update({
      where: { id },
      data: {
        audioUrl: result.publicUrl,
        audioStatus: "done",
      },
      include: { scenes: { orderBy: { sceneNumber: "asc" } } },
    });

    return NextResponse.json(updated);
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Audio generation failed";

    await prisma.story.update({
      where: { id },
      data: { audioStatus: "error" },
    });

    console.error("Audio generation error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
