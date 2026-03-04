-- CreateTable
CREATE TABLE "Story" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "error" TEXT,
    "styleGuide" TEXT,
    "storyStyle" TEXT NOT NULL DEFAULT 'cinematic',
    "voiceId" TEXT NOT NULL DEFAULT 'en-US-Chirp3-HD-Aoede',
    "voiceVolume" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "musicUrl" TEXT,
    "musicVolume" DOUBLE PRECISION NOT NULL DEFAULT 0.15,
    "subtitleStyle" TEXT NOT NULL DEFAULT 'karaoke',
    "subtitleColor" TEXT NOT NULL DEFAULT '#FFFFFF',
    "subtitleHighlight" TEXT NOT NULL DEFAULT '#2563EB',
    "subtitlePosition" TEXT NOT NULL DEFAULT 'center',
    "subtitleSize" TEXT NOT NULL DEFAULT 'medium',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Story_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Scene" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "sceneNumber" INTEGER NOT NULL,
    "narration" TEXT,
    "subtitle" TEXT,
    "imagePrompt" TEXT,
    "imageUrl" TEXT,
    "imageStatus" TEXT NOT NULL DEFAULT 'pending',
    "videoUrl" TEXT,
    "videoStatus" TEXT NOT NULL DEFAULT 'none',
    "motionFlag" TEXT NOT NULL DEFAULT 'still',
    "duration" DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "transition" TEXT NOT NULL DEFAULT 'crossfade',
    "sfxSuggestion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Scene_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Render" (
    "id" TEXT NOT NULL,
    "storyId" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'preview',
    "status" TEXT NOT NULL DEFAULT 'pending',
    "videoUrl" TEXT,
    "duration" DOUBLE PRECISION,
    "fileSize" INTEGER,
    "renderTimeMs" INTEGER,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Render_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Scene" ADD CONSTRAINT "Scene_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Render" ADD CONSTRAINT "Render_storyId_fkey" FOREIGN KEY ("storyId") REFERENCES "Story"("id") ON DELETE CASCADE ON UPDATE CASCADE;
