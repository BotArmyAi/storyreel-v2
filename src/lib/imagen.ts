import { GoogleGenerativeAI } from "@google/generative-ai";

export interface ImageGenerationResult {
  base64: string;
  mimeType: string;
}

/**
 * Generate an image using Nano Banana 2 (Gemini 3.1 Flash Image) via the Gemini API.
 * Falls back to Nano Banana Pro if needed.
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

  const genAI = new GoogleGenerativeAI(apiKey);

  // Try Nano Banana 2 first, fall back to Pro
  const models = [
    "gemini-3.1-flash-image-preview",
    "gemini-3-pro-image-preview",
  ];

  const fullPrompt = styleGuide
    ? `${styleGuide}\n\nGenerate a cinematic 9:16 vertical image for: ${prompt}`
    : `Generate a cinematic 9:16 vertical image for: ${prompt}`;

  for (const modelName of models) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        generationConfig: {
          // @ts-expect-error - responseModalities not in types yet
          responseModalities: ["TEXT", "IMAGE"],
          // @ts-expect-error - imageConfig not in types yet
          imageConfig: {
            aspectRatio: "9:16",
            imageSize: "2K",
          },
        },
      });

      const result = await model.generateContent(fullPrompt);
      const response = result.response;
      const parts = response.candidates?.[0]?.content?.parts ?? [];

      const imagePart = parts.find(
        (p) => p.inlineData?.mimeType?.startsWith("image/"),
      );

      if (imagePart?.inlineData) {
        return {
          base64: imagePart.inlineData.data!,
          mimeType: imagePart.inlineData.mimeType!,
        };
      }
    } catch (err) {
      console.error(`Image gen with ${modelName} failed:`, err);
      continue;
    }
  }

  throw new Error("No image model available — all attempts failed");
}
