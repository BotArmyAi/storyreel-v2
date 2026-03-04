import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const story = await prisma.story.findUnique({
    where: { id },
    include: {
      scenes: { orderBy: { sceneNumber: "asc" } },
      renders: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  return NextResponse.json(story);
}

export async function PATCH(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;
  const body: unknown = await request.json();

  if (typeof body !== "object" || body === null) {
    return NextResponse.json(
      { error: "Request body must be an object" },
      { status: 400 },
    );
  }

  const allowedFields = new Set([
    "title",
    "text",
    "status",
    "storyStyle",
    "voiceId",
    "voiceVolume",
    "musicUrl",
    "musicVolume",
    "subtitleStyle",
    "subtitleColor",
    "subtitleHighlight",
    "subtitlePosition",
    "subtitleSize",
    "styleGuide",
    "error",
  ]);

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (allowedFields.has(key)) {
      data[key] = value;
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "No valid fields to update" },
      { status: 400 },
    );
  }

  const existing = await prisma.story.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const story = await prisma.story.update({
    where: { id },
    data,
  });

  return NextResponse.json(story);
}

export async function DELETE(
  _request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const existing = await prisma.story.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  await prisma.story.delete({ where: { id } });

  return NextResponse.json({ deleted: true });
}
