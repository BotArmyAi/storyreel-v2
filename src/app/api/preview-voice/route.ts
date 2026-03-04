import { NextResponse } from "next/server";
import textToSpeech from "@google-cloud/text-to-speech";

export async function POST(request: Request) {
  try {
    const { voiceId } = await request.json();

    if (!voiceId || typeof voiceId !== "string") {
      return NextResponse.json({ error: "voiceId is required" }, { status: 400 });
    }

    const sampleText = "This is how your story will sound with this voice.";

    const client = new textToSpeech.TextToSpeechClient();

    const [response] = await client.synthesizeSpeech({
      input: { text: sampleText },
      voice: {
        languageCode: "en-US",
        name: voiceId,
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

    return new Response(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audioBuffer.length),
      },
    });
  } catch (err) {
    console.error("Preview voice error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to generate voice preview" },
      { status: 500 },
    );
  }
}
