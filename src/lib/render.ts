import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";

const exec = promisify(execFile);

export interface RenderInput {
  storyId: string;
  scenes: {
    sceneNumber: number;
    imageUrl: string | null; // base64 data URL or file path
    videoUrl: string | null; // public URL like /videos/storyId/scene-1.mp4
    duration: number;
  }[];
  audioUrl: string | null; // public URL like /audio/storyId/narration.mp3
}

export interface RenderResult {
  filePath: string;
  publicUrl: string;
  durationSec: number;
  fileSize: number;
  renderTimeMs: number;
}

/**
 * Compose a final vertical (1080x1920) MP4 from scene images/videos
 * with Ken Burns effect on stills, cross-dissolve transitions, and
 * narration audio overlay.
 */
export async function renderVideo(input: RenderInput): Promise<RenderResult> {
  const startTime = Date.now();
  const { storyId, scenes, audioUrl } = input;

  const outDir = path.join(process.cwd(), "public", "renders", storyId);
  fs.mkdirSync(outDir, { recursive: true });

  const tmpDir = path.join(outDir, "tmp");
  fs.mkdirSync(tmpDir, { recursive: true });

  try {
    // Step 1: Prepare each scene as a standardized clip
    const sceneClips: string[] = [];

    for (const scene of scenes) {
      const clipPath = path.join(tmpDir, `scene-${scene.sceneNumber}.mp4`);

      if (scene.videoUrl) {
        // Use existing video clip, scale to 1080x1920
        const videoFile = path.join(process.cwd(), "public", scene.videoUrl);
        await exec("ffmpeg", [
          "-y",
          "-i", videoFile,
          "-vf", "scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2:black,setsar=1",
          "-t", String(scene.duration),
          "-c:v", "libx264",
          "-preset", "fast",
          "-pix_fmt", "yuv420p",
          "-an",
          "-r", "30",
          clipPath,
        ], { timeout: 120_000 });
      } else if (scene.imageUrl) {
        // Create clip from image with Ken Burns zoom effect
        const imagePath = await resolveImagePath(
          scene.imageUrl,
          tmpDir,
          scene.sceneNumber,
        );

        // Ken Burns: zoom from 100% to 107% over the scene duration
        // zoompan: z goes from 1.0 to 1.07, panning slightly toward center
        const fps = 30;
        const totalFrames = Math.ceil(scene.duration * fps);

        await exec("ffmpeg", [
          "-y",
          "-loop", "1",
          "-i", imagePath,
          "-vf", [
            `scale=8000:-1`,
            `zoompan=z='min(zoom+0.0007,1.07)':x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':d=${totalFrames}:s=1080x1920:fps=${fps}`,
            `setsar=1`,
          ].join(","),
          "-t", String(scene.duration),
          "-c:v", "libx264",
          "-preset", "fast",
          "-pix_fmt", "yuv420p",
          "-r", "30",
          clipPath,
        ], { timeout: 120_000 });
      } else {
        // No image or video - create black frame
        await exec("ffmpeg", [
          "-y",
          "-f", "lavfi",
          "-i", `color=c=black:s=1080x1920:d=${scene.duration}:r=30`,
          "-c:v", "libx264",
          "-preset", "fast",
          "-pix_fmt", "yuv420p",
          clipPath,
        ], { timeout: 30_000 });
      }

      sceneClips.push(clipPath);
    }

    // Step 2: Build FFmpeg complex filter for cross-dissolve transitions
    const finalPath = path.join(outDir, "final.mp4");
    const transitionDuration = 0.5; // 0.5s cross-dissolve

    if (sceneClips.length === 1) {
      // Single clip - just copy with audio
      const args = ["-y", "-i", sceneClips[0]];

      if (audioUrl) {
        const audioFile = path.join(process.cwd(), "public", audioUrl);
        args.push("-i", audioFile);
        args.push(
          "-c:v", "libx264",
          "-preset", "fast",
          "-c:a", "aac",
          "-b:a", "192k",
          "-map", "0:v",
          "-map", "1:a",
          "-shortest",
          "-pix_fmt", "yuv420p",
          finalPath,
        );
      } else {
        args.push(
          "-c:v", "libx264",
          "-preset", "fast",
          "-pix_fmt", "yuv420p",
          "-an",
          finalPath,
        );
      }

      await exec("ffmpeg", args, { timeout: 300_000 });
    } else {
      // Multiple clips - use xfade for cross-dissolve transitions
      const args: string[] = ["-y"];

      // Add all input clips
      for (const clip of sceneClips) {
        args.push("-i", clip);
      }

      // Build xfade filter chain
      const filterParts: string[] = [];
      let currentOffset = 0;

      // Calculate offsets based on scene durations
      for (let i = 0; i < sceneClips.length - 1; i++) {
        const prevLabel = i === 0 ? `[0:v]` : `[v${i}]`;
        const nextLabel = `[${i + 1}:v]`;
        const outLabel =
          i === sceneClips.length - 2 ? `[vout]` : `[v${i + 1}]`;

        currentOffset += scenes[i].duration - transitionDuration;

        filterParts.push(
          `${prevLabel}${nextLabel}xfade=transition=fade:duration=${transitionDuration}:offset=${currentOffset.toFixed(2)}${outLabel}`,
        );
      }

      const filterComplex = filterParts.join(";");
      args.push("-filter_complex", filterComplex);
      args.push("-map", "[vout]");

      if (audioUrl) {
        const audioFile = path.join(process.cwd(), "public", audioUrl);
        args.push("-i", audioFile);
        args.push("-map", `${sceneClips.length}:a`);
        args.push("-c:a", "aac", "-b:a", "192k");
        args.push("-shortest");
      } else {
        args.push("-an");
      }

      args.push(
        "-c:v", "libx264",
        "-preset", "fast",
        "-pix_fmt", "yuv420p",
        "-movflags", "+faststart",
        finalPath,
      );

      await exec("ffmpeg", args, { timeout: 600_000 });
    }

    // Step 3: Get output file info
    const stat = fs.statSync(finalPath);
    const durationSec = await getVideoDuration(finalPath);
    const renderTimeMs = Date.now() - startTime;

    return {
      filePath: finalPath,
      publicUrl: `/renders/${storyId}/final.mp4`,
      durationSec,
      fileSize: stat.size,
      renderTimeMs,
    };
  } finally {
    // Clean up temp directory
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

/**
 * Resolve an image source to a file path FFmpeg can read.
 * Base64 data URLs are written to a temp file.
 */
async function resolveImagePath(
  imageUrl: string,
  tmpDir: string,
  sceneNumber: number,
): Promise<string> {
  const match = imageUrl.match(/^data:(.+?);base64,(.+)$/);
  if (match) {
    const [, mimeType, base64Data] = match;
    const ext = mimeType.includes("png") ? "png" : "jpg";
    const imgPath = path.join(tmpDir, `img-${sceneNumber}.${ext}`);
    fs.writeFileSync(imgPath, Buffer.from(base64Data, "base64"));
    return imgPath;
  }

  // Assume it's a public URL path
  if (imageUrl.startsWith("/")) {
    return path.join(process.cwd(), "public", imageUrl);
  }

  return imageUrl;
}

/** Get video duration in seconds using ffprobe */
async function getVideoDuration(filePath: string): Promise<number> {
  try {
    const { stdout } = await exec("ffprobe", [
      "-v", "quiet",
      "-show_entries", "format=duration",
      "-of", "default=noprint_wrappers=1:nokey=1",
      filePath,
    ]);
    return parseFloat(stdout.trim()) || 0;
  } catch {
    return 0;
  }
}
