import textToSpeech from "@google-cloud/text-to-speech";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

const AVAILABLE_VOICES = [
  "Aoede",
  "Charon",
  "Fenrir",
  "Kore",
  "Leda",
  "Orus",
  "Puck",
  "Zephyr",
] as const;

export type ChirpVoice = (typeof AVAILABLE_VOICES)[number];

const DEFAULT_VOICE: ChirpVoice = "Aoede";

/** Scene boundary info for building SSML */
interface SceneSegment {
  sceneNumber: number;
  narration: string;
}

/**
 * Build SSML from an array of scene narrations.
 * Inserts <break> tags between scenes and <mark> tags at scene boundaries
 * so downstream consumers can align audio timing to scenes.
 */
export function buildSSML(scenes: SceneSegment[]): string {
  const parts: string[] = [];

  for (let i = 0; i < scenes.length; i++) {
    const scene = scenes[i];
    parts.push(`<mark name="scene-${scene.sceneNumber}"/>`);
    parts.push(escapeSSML(scene.narration));

    if (i < scenes.length - 1) {
      parts.push(`<break time="750ms"/>`);
    }
  }

  return `<speak>${parts.join("\n")}</speak>`;
}

/** Escape characters that are special in SSML/XML */
function escapeSSML(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Resolve the full voice name from a short name like "Aoede" */
function resolveVoiceName(voice?: string): string {
  if (!voice) return `en-US-Chirp3-HD-${DEFAULT_VOICE}`;

  // Already fully qualified
  if (voice.startsWith("en-US-Chirp3-HD-")) return voice;

  // Short name — validate and qualify
  const match = AVAILABLE_VOICES.find(
    (v) => v.toLowerCase() === voice.toLowerCase(),
  );
  return `en-US-Chirp3-HD-${match ?? DEFAULT_VOICE}`;
}

export interface TTSResult {
  filePath: string;
  publicUrl: string;
}

/**
 * Generate narration audio from scene texts using Google Cloud TTS (Chirp 3 HD).
 * Produces a single continuous MP3 file with SSML break/mark tags between scenes.
 */
export async function generateNarration(
  storyId: string,
  scenes: SceneSegment[],
  voiceId?: string,
): Promise<TTSResult> {
  const ssml = buildSSML(scenes);
  const voiceName = resolveVoiceName(voiceId);

  const client = new textToSpeech.TextToSpeechClient();

  const [response] = await client.synthesizeSpeech({
    input: { ssml },
    voice: {
      languageCode: "en-US",
      name: voiceName,
    },
    audioConfig: {
      audioEncoding: "MP3",
      speakingRate: 1.0,
      pitch: 0,
      effectsProfileId: ["large-home-entertainment-class-device"],
    },
  });

  if (!response.audioContent) {
    throw new Error("No audio content returned from TTS");
  }

  const audioBuffer = Buffer.from(response.audioContent as Uint8Array);

  // Save to public/audio/[storyId]/narration.mp3
  const dir = path.join(process.cwd(), "public", "audio", storyId);
  await mkdir(dir, { recursive: true });

  const filePath = path.join(dir, "narration.mp3");
  await writeFile(filePath, audioBuffer);

  const publicUrl = `/audio/${storyId}/narration.mp3`;

  return { filePath, publicUrl };
}
