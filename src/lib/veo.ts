import fs from "fs";
import path from "path";

const VEO_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/veo-3.1-fast-generate-preview:predictLongRunning";

const POLL_INTERVAL_MS = 5_000;
const MAX_POLL_ATTEMPTS = 120; // 10 minutes max

export interface VeoResult {
  filePath: string;
  publicUrl: string;
}

/**
 * Convert a base64 data URL image to a Veo image-to-video request,
 * poll for completion, and save the resulting MP4.
 */
export async function generateVideo(
  imageUrl: string,
  storyId: string,
  sceneNumber: number,
): Promise<VeoResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  // Extract base64 and mimeType from data URL
  const match = imageUrl.match(/^data:(.+?);base64,(.+)$/);
  if (!match) {
    throw new Error("imageUrl must be a base64 data URL");
  }
  const [, mimeType, base64Data] = match;

  const body = {
    instances: [
      {
        image: {
          bytesBase64Encoded: base64Data,
          mimeType,
        },
      },
    ],
    parameters: {
      aspectRatio: "9:16",
      sampleCount: 1,
    },
  };

  // Start the long-running operation
  const res = await fetch(`${VEO_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Veo API error ${res.status}: ${text}`);
  }

  const operation = await res.json();
  const operationName: string = operation.name;

  if (!operationName) {
    throw new Error("Veo API did not return an operation name");
  }

  // Poll for completion
  const pollUrl = `https://generativelanguage.googleapis.com/v1beta/${operationName}?key=${apiKey}`;

  for (let attempt = 0; attempt < MAX_POLL_ATTEMPTS; attempt++) {
    await sleep(POLL_INTERVAL_MS);

    const pollRes = await fetch(pollUrl);
    if (!pollRes.ok) {
      const text = await pollRes.text();
      throw new Error(`Veo poll error ${pollRes.status}: ${text}`);
    }

    const pollData = await pollRes.json();

    if (pollData.error) {
      throw new Error(
        `Veo generation failed: ${pollData.error.message ?? JSON.stringify(pollData.error)}`,
      );
    }

    if (pollData.done) {
      const videoData =
        pollData.response?.generateVideoResponse?.generatedSamples?.[0]?.video
          ?.bytesBase64Encoded;

      if (!videoData) {
        throw new Error("Veo returned no video data");
      }

      // Save to public/videos/[storyId]/scene-[number].mp4
      const dir = path.join(process.cwd(), "public", "videos", storyId);
      fs.mkdirSync(dir, { recursive: true });

      const fileName = `scene-${sceneNumber}.mp4`;
      const filePath = path.join(dir, fileName);
      fs.writeFileSync(filePath, Buffer.from(videoData, "base64"));

      return {
        filePath,
        publicUrl: `/videos/${storyId}/${fileName}`,
      };
    }
  }

  throw new Error("Veo generation timed out");
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
