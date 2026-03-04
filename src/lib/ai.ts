import {
  GoogleGenerativeAI,
  SchemaType,
  type Schema,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY ?? "");

export interface GeneratedScene {
  narration: string;
  imagePrompt: string;
  motionFlag: "still" | "video";
  subtitle: string;
  sfxSuggestion: string;
}

export interface SceneGenerationResult {
  scenes: GeneratedScene[];
  styleGuide: string;
}

const responseSchema: Schema = {
  type: SchemaType.OBJECT,
  properties: {
    styleGuide: {
      type: SchemaType.STRING,
      description:
        "A unified visual style guide for all scenes ensuring consistency (art style, color palette, lighting, mood, character descriptions)",
    },
    scenes: {
      type: SchemaType.ARRAY,
      items: {
        type: SchemaType.OBJECT,
        properties: {
          narration: {
            type: SchemaType.STRING,
            description:
              "The narration text for this scene that flows naturally as part of the continuous story",
          },
          imagePrompt: {
            type: SchemaType.STRING,
            description:
              "A detailed image generation prompt including subject, composition, lighting, style, and references to the style guide",
          },
          motionFlag: {
            type: SchemaType.STRING,
            format: "enum",
            enum: ["still", "video"],
            description:
              "Whether this scene works best as a still image or short video clip",
          },
          subtitle: {
            type: SchemaType.STRING,
            description: "A short subtitle for this scene, 5-10 words maximum",
          },
          sfxSuggestion: {
            type: SchemaType.STRING,
            description:
              "A suggested sound effect or ambient audio for this scene",
          },
        },
        required: [
          "narration",
          "imagePrompt",
          "motionFlag",
          "subtitle",
          "sfxSuggestion",
        ],
      },
    },
  },
  required: ["styleGuide", "scenes"],
};

export async function generateScenes(
  storyText: string,
  storyStyle: string,
): Promise<SceneGenerationResult> {
  const model = genAI.getGenerativeModel({
    model: "gemini-2.0-flash",
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const prompt = `You are a cinematic story director. Break the following story into 8-12 visual scenes for a short-form video.

STORY STYLE: ${storyStyle}

STORY TEXT:
${storyText}

REQUIREMENTS:
1. **Narration**: Split the story into scene narrations that flow naturally as a continuous narrative. Each scene's narration should be a complete thought, 1-3 sentences.
2. **Image Prompts**: Create detailed, vivid image generation prompts for each scene. Include subject, composition, camera angle, lighting, color palette, and art style. Reference the style guide for visual consistency.
3. **Motion Flag**: Mark scenes as "video" only when motion adds significant value (action sequences, flowing water, movement). Default to "still" for most scenes.
4. **Subtitles**: Write a short, impactful subtitle for each scene (5-10 words max) that captures the key moment.
5. **SFX Suggestions**: Suggest ambient sounds or effects that enhance the scene (e.g., "gentle rain", "crowd murmur", "dramatic orchestral hit").
6. **Style Guide**: Create a unified style guide FIRST that ensures all scenes look visually consistent. Include art style, color palette, lighting mood, and any recurring character/setting descriptions.

Generate between 8 and 12 scenes total. Aim for a natural pace that does justice to the story.`;

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  const parsed: SceneGenerationResult = JSON.parse(text);

  if (
    !parsed.scenes ||
    !Array.isArray(parsed.scenes) ||
    parsed.scenes.length === 0
  ) {
    throw new Error("AI returned no scenes");
  }

  return parsed;
}
