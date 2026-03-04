const IMAGEN_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/imagen-4.0-generate-001:predict";

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

/**
 * Generate an image using Google Imagen 4.0 via the REST API.
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
    ? `${styleGuide}\n\n${prompt}`
    : prompt;

  const body = {
    instances: [{ prompt: fullPrompt }],
    parameters: {
      sampleCount: 1,
      aspectRatio: "9:16",
    },
  };

  const res = await fetch(`${IMAGEN_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Imagen API error ${res.status}: ${text}`);
  }

  const data = await res.json();
  const predictions: Array<{ bytesBase64Encoded?: string; mimeType?: string }> =
    data?.predictions ?? [];

  if (!predictions.length || !predictions[0].bytesBase64Encoded) {
    throw new Error("No image returned from Imagen");
  }

  return {
    base64: predictions[0].bytesBase64Encoded,
    mimeType: predictions[0].mimeType || "image/png",
  };
}
