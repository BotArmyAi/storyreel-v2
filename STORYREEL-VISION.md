# StoryReel v2 — Product Vision & Quality Standards

## What StoryReel IS

StoryReel turns text stories into polished short-form videos — think YouTube Shorts, TikTok, Instagram Reels. You type a story (or pick a preset), and the app generates a cinematic video with AI images, narration, music, and subtitles. No editing skills needed. One click, done.

This is NOT a toy demo. This is a product people should want to pay for. Every screen, every interaction, every generated video needs to feel premium.

---

## The User Experience — How It Should FEEL

### Homepage
- Clean, dark, cinematic. Think Netflix meets a creative tool.
- 10 preset story topics displayed as visually rich cards — each with a mood image, title, and short teaser. Not a boring list. Cards you WANT to click.
- "Write Your Own" option front and center — a clean text input that feels inviting, not intimidating.
- Your existing stories shown below as a dashboard — thumbnail from first scene, title, status badges (draft, generating, rendered), last edited date.
- Everything loads fast. No spinners that last more than 1 second. Skeleton loaders for anything async.

### Story Creation Flow
- Pick a preset OR write your own text. One click to start.
- After creating: immediate redirect to the story page where generation begins.
- The whole pipeline should feel like ONE action to the user. Not 5 separate buttons (generate scenes, generate images, generate audio, generate video, render). There should be a single **"Generate Video"** button that kicks off the entire pipeline automatically: scenes → images → audio → video → render.
- Show real-time progress as it generates. A timeline that fills in scene by scene. Each scene card transitions from "pending" → "generating" → showing the actual image. The user watches their story come to life in real time.
- This is the WOW moment. Make it magical.

### The Editor
The editor is where power users fine-tune before final render. It should feel like a lightweight video editor — not a form with inputs.

**Layout:**
- Desktop: Two columns. Left = video preview (9:16, centered, max 400px wide). Right = editing panel (scene list, controls, settings).
- Mobile: Single column. Preview on top, everything below scrollable. Touch-friendly. 44px minimum tap targets everywhere.
- Dark theme (zinc/slate palette). Accent color: blue (#2563EB) for primary actions.

**Video Preview Panel:**
- 9:16 aspect ratio container — this is vertical video, always.
- When a scene is selected: show the scene's video clip (if generated) or image as fallback.
- Subtitle overlay rendered ON the preview, matching the style settings (color, position, size). The user sees exactly what the final video will look like.
- Play/pause button overlaid on the preview. Click to play the scene with narration audio synced.
- Scrubber bar below the preview to seek through the current scene.
- Scene-to-scene navigation: left/right arrows or swipe to move between scenes.

**Scene Strip:**
- Horizontal scrollable row of scene thumbnails below the preview.
- Each thumbnail shows: the scene image (or a numbered placeholder if no image yet), scene number, and a tiny status icon (checkmark = done, spinner = generating, warning = error).
- Selected scene has a blue border/glow.
- On mobile: gradient fade on the right edge to hint "scroll for more." Users must intuitively know there are more scenes.
- Drag to reorder scenes (future feature, but design for it now — don't use a layout that prevents it).

**Scene Editor (right panel on desktop, below preview on mobile):**
- Scene title/number at top.
- **Narration text** — editable textarea. This is the spoken narration. Users can rewrite it and regenerate audio.
- **Subtitle text** — editable. Short on-screen text (5-10 words). Different from narration.
- **Image prompt** — collapsible/expandable. Shows the AI-generated prompt. Advanced users can edit and regenerate.
- **Action buttons:**
  - "Regenerate Image" — re-runs image generation for this scene.
  - "Generate Video" — sends scene image to Veo for a motion clip.
  - Buttons should be clear, not cramped. On mobile, stack vertically with full width. On desktop, side by side.
- **Duration** — adjustable slider (3-10 seconds per scene).
- **Transition** — dropdown: crossfade, cut, fade to black.

**Global Controls (below scene editor):**
- **Voice:** Dropdown with all 8 Chirp 3 HD voices + a "Preview" button that plays a 5-second sample of the selected voice reading a sentence. Users need to hear the voice before committing.
- **Voice Volume:** Slider 0-100%.
- **Background Music:** Upload button + volume slider. Small audio player showing the uploaded track name.
- **Subtitle Style:** Dropdown — karaoke (word-by-word highlight), static (full subtitle), none.
- **Subtitle Color:** Color picker with hex input. The swatch MUST show the actual selected color. If it says #FFFFFF, the swatch is white. Period.
- **Subtitle Position:** Top / Center / Bottom.
- **Save Settings** button — saves all global settings to the story.

**Sticky Footer:**
- "Render Final Video" button — ALWAYS visible at the bottom of the screen. Full width on mobile. Blue, prominent, unmissable.
- When rendering: show progress bar with percentage and ETA.
- When done: show "Download" button and a "Share" button (future: direct to YouTube/TikTok/Instagram).

### The Generated Video
The final output is what matters. It needs to be GOOD.

- **Resolution:** 1080x1920 (vertical, 9:16).
- **Still scenes:** Ken Burns effect — slow zoom in or pan across the image. NOT static. Static images in a video feel cheap. Every still needs subtle motion.
- **Video scenes:** Veo-generated clips play at full quality.
- **Transitions:** Smooth crossfades between scenes (0.5-1s). Not jarring cuts.
- **Narration:** Continuous, natural-sounding voice. Chirp 3 HD voices are good — use them well. Narration should flow across scene boundaries, not stop/start awkwardly.
- **Subtitles:** Burned into the video. Karaoke-style by default (current word highlighted). Clean font, readable on any background (text shadow or semi-transparent background behind text).
- **Music:** Mixed underneath narration at low volume (15-20% default). Should enhance, not compete with the voice.
- **Pacing:** Scenes should breathe. Not too fast (jarring), not too slow (boring). Default 5 seconds per scene is good for most. Action scenes shorter, atmospheric scenes longer.

---

## Quality Bar

This is the standard. Everything below this is unacceptable:

### UI/UX
- **No dead space.** Every pixel has purpose. If there's a big empty void on screen, something is wrong.
- **No broken states.** Every loading state has a skeleton or spinner. Every error has a clear message and a retry button. Every empty state tells the user what to do next ("Generate scenes to get started").
- **Responsive.** Mobile isn't an afterthought. Mobile is the PRIMARY experience. Most users will be on phones. Test at 375px width first, desktop second.
- **Fast.** Page loads under 2 seconds. Interactions respond in under 200ms. If something takes time, show progress.
- **Consistent.** One button style for primary actions (blue, rounded). One for secondary (outline/ghost). One for destructive (red). Don't mix styles randomly.
- **Touch-friendly.** Buttons, sliders, and interactive elements: minimum 44px height on mobile. No tiny tap targets.
- **Typography.** Clean, readable. Good contrast ratios. Headers clearly differentiated from body text.

### Generated Content
- **Images should be beautiful.** Cinematic, well-composed, consistent style across all scenes in a story. The style guide exists for a reason — every image should feel like it belongs in the same movie.
- **Narration should sound natural.** Not robotic. Chirp 3 HD is capable of this — the prompts and SSML need to support it (appropriate pauses, emphasis, pacing).
- **Videos should be smooth.** No artifacts, no weird AI glitches visible. If a Veo clip looks bad, fall back to Ken Burns on the still image.
- **The final render should be shareable.** Someone should be able to post this on TikTok and not be embarrassed. That's the bar.

### Code Quality
- TypeScript strict mode. No `any` types.
- No placeholder comments like `// TODO: implement this`.
- Proper error handling — try/catch on every API call, meaningful error messages.
- No dead dependencies in package.json.
- Clean component structure — reusable components, not 2000-line monolith files.
- Server components where possible, client components only when needed (interactivity).

---

## The Pipeline — What Happens Under the Hood

```
User clicks "Generate Video"
    │
    ├─→ Scene Generation (Gemini 2.5 Flash)
    │     → Analyzes story text
    │     → Creates style guide for visual consistency
    │     → Breaks into 8-12 scenes with narration, image prompts, motion flags
    │     → UI: Scene cards appear one by one with narration text
    │
    ├─→ Image Generation (Nano Banana 2 / Gemini)
    │     → Each scene image generated sequentially
    │     → UI: Each scene card updates with its generated image in real time
    │
    ├─→ Audio Generation (Chirp 3 HD TTS)
    │     → All narration concatenated into SSML
    │     → One continuous audio file with scene markers
    │     → UI: Audio waveform appears, play button activates
    │
    ├─→ Video Generation (Veo 3.1 Fast) — motion scenes only
    │     → Scenes flagged as "video" get sent to Veo
    │     → 5-second clips generated from the scene image
    │     → UI: Video icon appears on scenes that have clips
    │
    └─→ Final Render (FFmpeg)
          → Stitches everything: images (Ken Burns) + video clips + narration + music + subtitles
          → Output: 1080x1920 H.264 MP4
          → UI: Progress bar fills, download button appears
```

The user should see this progress visually. Not as a log or text status — as their story literally building itself before their eyes. Scene by scene, image by image.

---

## What Makes This PREMIUM

1. **One-click generation.** Not 5 buttons. One button, full video out.
2. **Real-time visual progress.** Watch your story come to life. Each scene fills in with images as they generate.
3. **Professional output.** Ken Burns, crossfades, synced narration, burned subtitles. Not a slideshow — a video.
4. **Voice selection with preview.** Hear the voice before you commit. 8 options, each with character.
5. **Edit anything.** Don't like an image? Regenerate just that one. Want to change the narration? Edit the text, re-gen audio. Full control without complexity.
6. **Mobile-first.** Create a video from your phone in 2 minutes. Share directly.
7. **Consistent visual style.** AI generates a style guide first, then every image follows it. Your video looks like one cohesive piece, not random AI images stitched together.

---

## Current State vs. Target

| Area | Current | Target |
|------|---------|--------|
| Pipeline | Works but 5 separate buttons | One-click "Generate Video" → auto-runs all steps |
| Progress | Status text only | Visual scene-by-scene progress with images appearing in real time |
| Editor layout | Two-column works | Needs polish — preview aspect ratio, swatch colors, gradient hints |
| Scene strip | Basic numbered thumbnails | Image thumbnails, status icons, drag-to-reorder |
| Video preview | Shows video/image | Needs play/pause overlay, scrubber, subtitle preview |
| Final render | FFmpeg works | Needs progress bar, download button, share options |
| Mobile UX | Functional | Needs 44px tap targets, proper stacking, bottom sheet patterns |
| Subtitle burn-in | Editor preview only | Must burn into final rendered MP4 |
| One-click flow | Not implemented | Critical — this is the core UX |

---

## Tech Reference

| Component | Technology |
|-----------|-----------|
| Framework | Next.js 15 (App Router, TypeScript strict) |
| Database | PostgreSQL + Prisma 7 |
| Scene AI | Gemini 2.5 Flash (structured JSON) |
| Image AI | Gemini 2.0 Flash Exp (multimodal image gen) |
| Voice AI | Google Cloud TTS — Chirp 3 HD |
| Video AI | Google Veo 3.1 Fast (image-to-video) |
| Rendering | FFmpeg (H.264 + AAC) |
| Styling | Tailwind CSS (dark theme) |
| Hosting | VPS + PM2 + Caddy |

**Repo:** https://github.com/BotArmyAi/storyreel-v2
**Full technical docs:** See `STORYREEL-V2.md` in repo root.
