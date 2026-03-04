const GEMINI_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-exp:generateContent";

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

/**
 * Generate an image using Gemini 2.0 Flash Exp via the REST API.
 * Returns the raw base64-encoded image and its MIME type.
 */
export async function generateImage(
  prompt: string,
  styleGuide?: string,
): Promise<ImageGenerationResult> {
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_API_KEY is not set");
  }

  const fullPrompt = styleGuide
    ? `${styleGuide}\n\nGenerate an image for: ${prompt}`
    : `Generate an image for: ${prompt}`;

  const body = {
    contents: [{ parts: [{ text: fullPrompt }] }],
    generationConfig: {
      responseModalities: ["TEXT", "IMAGE"],
    },
  };

  const res = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const parts: Array<{ inlineData?: { mimeType: string; data: string } }> =
    data?.candidates?.[0]?.content?.parts ?? [];

  const imagePart = parts.find((p) => p.inlineData?.mimeType?.startsWith("image/"));
  if (!imagePart?.inlineData) {
    throw new Error("No image returned from Gemini");
  }

  return {
    base64: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType,
  };
}
