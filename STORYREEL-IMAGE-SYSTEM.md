# StoryReel v2 — Image Generation System

## What We're Building

StoryReel generates AI videos from text stories. The image generation system is the visual backbone — it creates every frame that appears in the final video. Here's how it works and what we want it to do.

---

## Current Architecture

### The Pipeline
```
User writes a story
    → AI breaks it into 8-12 scenes (Gemini 2.5 Flash)
    → Each scene gets a detailed image prompt + style guide
    → Image generator creates a visual for every scene
    → Images become the video frames (Ken Burns zoom for stills, Veo for motion clips)
    → FFmpeg stitches it all into a final MP4 with narration + music + subtitles
```

### Image Generation Flow (Current)
```
For each scene in order:
    1. Take the scene's imagePrompt (AI-written, detailed)
    2. Prepend the story's styleGuide (consistent art direction)
    3. Send to Gemini with responseModalities: ["TEXT", "IMAGE"]
    4. Get back a base64-encoded image
    5. Store as data URL in the database
    6. Move to next scene
```

### Models (Fallback Chain)
The system tries models in order. If one fails (404, rate limit, error), it falls through to the next:

| Priority | Model ID | Name | Quality | Speed | Cost |
|----------|----------|------|---------|-------|------|
| 1st | `gemini-3.1-flash-image-preview` | Nano Banana 2 | Great | Fast | Free tier |
| 2nd | `gemini-3-pro-image-preview` | Nano Banana Pro | Best | Slower | Free tier (limited) |

### Current Config
```typescript
generationConfig: {
  responseModalities: ["TEXT", "IMAGE"],
  imageConfig: {
    aspectRatio: "9:16",   // Vertical (Shorts/Reels/TikTok)
    imageSize: "2K",       // 2K resolution
  },
}
```

---

## What We Want to Add

### 1. User-Selectable Aspect Ratio

Before generating images, the user should be able to pick an aspect ratio based on their target platform:

| Aspect Ratio | Use Case | Dimensions |
|-------------|----------|------------|
| **9:16** (default) | YouTube Shorts, TikTok, Instagram Reels | 1080×1920 |
| **16:9** | YouTube standard, landscape video | 1920×1080 |
| **1:1** | Instagram feed, square format | 1080×1080 |
| **4:5** | Instagram portrait post | 1080×1350 |
| **3:4** | Vertical but not as tall as 9:16 | 1080×1440 |

This should be a **story-level setting** — you pick the aspect ratio once when creating/editing the story, and ALL scenes in that story use it. The setting flows through to:
- Image generation (Gemini `imageConfig.aspectRatio`)
- Video generation (Veo aspect ratio)
- FFmpeg final render (output resolution)
- Editor preview container (matches the chosen ratio)

**Database change needed:** Add `aspectRatio` field to the Story model (default: `"9:16"`).

### 2. User-Selectable Image Quality (Standard vs Pro)

The user should be able to choose between:

| Option | Model | What It Does |
|--------|-------|-------------|
| **Standard** (default) | `gemini-3.1-flash-image-preview` | Fast, good quality, higher rate limits |
| **Pro** | `gemini-3-pro-image-preview` | Best quality, slower, lower rate limits |

This is also a **story-level setting**. Some stories (quick drafts) are fine with Standard. Premium stories that need to look incredible use Pro.

**Database change needed:** Add `imageQuality` field to the Story model (default: `"standard"`).

### 3. Character Consistency (Scene 1 → Scene 2+)

This is the big one. Right now, each scene's image is generated independently. That means if your story has a character named "Elena" — she might look different in every scene. Different hair, different face, different outfit. That kills the video.

**How to fix it using Nano Banana 2's reference image feature:**

```
Generate Scene 1 image (no reference — this establishes the look)
    ↓
Generate Scene 2 image → pass Scene 1's image as inlineData reference
    ↓
Generate Scene 3 image → pass Scene 1's image as reference
    ↓
Generate Scene 4 image → pass Scene 1's image as reference
    ... and so on
```

Nano Banana 2 supports up to **14 reference images** in a single request. The approach:

1. **Scene 1 is the "anchor scene"** — it establishes character appearances, art style, and visual tone. No reference images needed (there aren't any yet).

2. **Scenes 2+ get Scene 1's image as a reference.** The prompt tells the model: "Maintain visual consistency with the reference image — same characters, same art style, same color palette."

3. **Optionally, accumulate references.** For even better consistency, pass the last 2-3 generated images as references (not just Scene 1). This helps with things like "the character is now wearing a different outfit" while keeping the face consistent.

**Implementation:**
```typescript
// Pseudocode for the updated generate-images endpoint
let referenceImages: { mimeType: string; data: string }[] = [];

for (const scene of scenes) {
  const parts = [];
  
  // Add reference images from previous scenes (up to 4)
  for (const ref of referenceImages.slice(-4)) {
    parts.push({ inlineData: ref });
  }
  
  // Add the text prompt
  parts.push({ 
    text: `${styleGuide}\n\nMaintain visual consistency with the reference images — same characters, same art style, same color palette.\n\nGenerate image for: ${scene.imagePrompt}` 
  });
  
  const result = await model.generateContent(parts);
  
  // Save the generated image as a reference for future scenes
  referenceImages.push({
    mimeType: result.mimeType,
    data: result.base64,
  });
  
  // Store in database...
}
```

### 4. First Scene & Last Scene Special Handling

**Scene 1 (Title/Intro):**
- Could auto-generate as a "title card" with the story title overlaid
- Or just be a strong establishing shot that sets the visual tone
- This is the anchor image for character consistency

**Last Scene (Outro/Closing):**
- Could auto-generate as a closing card (e.g., "The End" or story title reprise)
- Or just be the final narrative scene
- Currently no special handling — just treated as any other scene

This is optional but would make the generated videos feel more polished and complete.

---

## How the Style Guide Works

Before generating any images, the scene generation AI (Gemini 2.5 Flash) creates a **style guide** for the entire story. This is a text description that ensures visual consistency:

```
Example style guide:
"Cinematic sci-fi aesthetic. Dark blue and teal color palette with amber highlights. 
Futuristic environments with worn, lived-in textures. Characters rendered in 
semi-realistic style with dramatic rim lighting. Elena: mid-30s woman with short 
dark hair, olive skin, wearing a gray flight suit with orange patches. All scenes 
use shallow depth of field with atmospheric haze."
```

This style guide is prepended to EVERY image prompt, so the model always has the visual direction. Combined with reference images, this gives you:
- **Text consistency** (style guide describes the look)
- **Visual consistency** (reference images show the actual look)

---

## Tech Details

### API Endpoint
`POST /api/stories/[id]/generate-images`

Fetches all scenes with image prompts, generates images sequentially (one at a time to avoid rate limits), stores results as base64 data URLs in the database.

### Rate Limits
- Nano Banana 2 (Standard): ~10-15 images before potential 429 on free tier
- Nano Banana Pro: Lower limits, higher quality
- Built-in retry: if model 1 fails, automatically tries model 2
- Sequential generation with no parallelism to stay under limits

### Storage
Currently images are stored as **base64 data URLs** directly in the PostgreSQL database (in the Scene's `imageUrl` field). This works but is inefficient for large stories. Future improvement: save to filesystem, store file paths.

### Dependencies
- `@google/generative-ai` v0.24.1+ (Google's official SDK)
- Requires `GOOGLE_API_KEY` environment variable

---

## File Locations

| File | Purpose |
|------|---------|
| `src/lib/imagen.ts` | Core image generation function with model fallback |
| `src/app/api/stories/[id]/generate-images/route.ts` | Bulk image generation endpoint |
| `src/app/api/stories/[id]/scenes/[sceneId]/regenerate-image/route.ts` | Single scene re-generation |
| `src/lib/ai.ts` | Scene generation (creates the image prompts + style guide) |
| `prisma/schema.prisma` | Database schema (Scene.imageUrl, Scene.imageStatus) |

---

## Summary of What Needs Building

| Feature | Status | Priority |
|---------|--------|----------|
| Basic image generation | ✅ Done | — |
| Model fallback chain | ✅ Done | — |
| 9:16 aspect + 2K resolution | ✅ Done | — |
| Nano Banana 2 + Pro models | ✅ Done | — |
| User-selectable aspect ratio | ❌ Not built | High |
| User-selectable quality (Standard/Pro) | ❌ Not built | High |
| Character consistency (reference images) | ❌ Not built | High |
| First/last scene special handling | ❌ Not built | Medium |
| Save images to filesystem (not base64 in DB) | ❌ Not built | Medium |
| Progress tracking during generation | ❌ Not built | Medium |
