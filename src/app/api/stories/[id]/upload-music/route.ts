import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(
  request: NextRequest,
  context: RouteContext,
): Promise<NextResponse> {
  const { id } = await context.params;

  const story = await prisma.story.findUnique({ where: { id } });
  if (!story) {
    return NextResponse.json({ error: "Story not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg", "audio/aac", "audio/m4a"];
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(mp3|wav|ogg|aac|m4a)$/i)) {
    return NextResponse.json(
      { error: "Invalid file type. Allowed: mp3, wav, ogg, aac, m4a" },
      { status: 400 },
    );
  }

  const dir = path.join(process.cwd(), "public", "music", id);
  await mkdir(dir, { recursive: true });

  const ext = path.extname(file.name) || ".mp3";
  const safeFilename = `music${ext}`;
  const filePath = path.join(dir, safeFilename);

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(filePath, buffer);

  const musicUrl = `/music/${id}/${safeFilename}`;

  await prisma.story.update({
    where: { id },
    data: { musicUrl },
  });

  return NextResponse.json({ musicUrl });
}
