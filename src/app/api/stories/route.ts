import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(): Promise<NextResponse> {
  const stories = await prisma.story.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { scenes: true, renders: true } },
    },
  });

  return NextResponse.json(stories);
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  const body: unknown = await request.json();

  if (
    typeof body !== "object" ||
    body === null ||
    !("title" in body) ||
    !("text" in body)
  ) {
    return NextResponse.json(
      { error: "title and text are required" },
      { status: 400 },
    );
  }

  const { title, text } = body as { title: string; text: string };

  if (typeof title !== "string" || title.trim().length === 0) {
    return NextResponse.json(
      { error: "title must be a non-empty string" },
      { status: 400 },
    );
  }

  if (typeof text !== "string" || text.trim().length === 0) {
    return NextResponse.json(
      { error: "text must be a non-empty string" },
      { status: 400 },
    );
  }

  const story = await prisma.story.create({
    data: {
      title: title.trim(),
      text: text.trim(),
    },
  });

  return NextResponse.json(story, { status: 201 });
}
