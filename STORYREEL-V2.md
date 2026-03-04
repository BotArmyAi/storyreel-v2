# StoryReel v2 — Complete Project Documentation

## What Is StoryReel?

StoryReel is an AI-powered story-to-video platform. You give it a text story (or pick from preset topics), and it generates:
1. **Scenes** — AI breaks the story into 8-12 visual scenes with narration, image prompts, and motion flags
2. **Images** — AI generates a cinematic image for each scene
3. **Narration** — AI generates continuous spoken narration (Google TTS)
4. **Video clips** — AI generates short video clips for motion-flagged scenes (Veo 3.1)
5. **Final render** — FFmpeg stitches everything into a 1080x1920 vertical MP4 (shorts/reels format)

The editor lets you preview, edit narration, swap voices, regenerate images, and customize before rendering.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router, TypeScript, Turbopack) |
| Database | PostgreSQL via Prisma 7 (`@prisma/adapter-pg`) |
| AI - Scenes | Google Gemini 2.5 Flash (structured JSON output) |
| AI - Images | Gemini 2.0 Flash Exp (multimodal image generation, aka "Nano Banana 2") |
| AI - TTS | Google Cloud Text-to-Speech (Chirp 3 HD, 8 voices) |
| AI - Video | Google Veo 3.1 Fast (image-to-video) |
| Rendering | FFmpeg (H.264 + AAC, Ken Burns zoom, cross-dissolve) |
| Styling | Tailwind CSS (dark theme, zinc palette) |
| Hosting | PM2 process on a DigitalOcean VPS, Caddy reverse proxy |

---

## Repository Structure

```
storyreel-v2/
├── prisma/
│   ├── schema.prisma          # Database schema (Story, Scene, Render)
│   └── migrations/            # Prisma migration files
├── prisma.config.ts           # Prisma 7 config (DATABASE_URL from env)
├── src/
│   ├── app/
│   │   ├── page.tsx           # Homepage — story list + 10 preset topics
│   │   ├── layout.tsx         # Root layout (Geist fonts, dark mode)
│   │   ├── globals.css        # Tailwind base styles
│   │   ├── story/[id]/
│   │   │   ├── page.tsx       # Story detail — shows all scenes, generation buttons
│   │   │   ├── editor/page.tsx # Full editor — two-column desktop, mobile-first
│   │   │   ├── generate-button.tsx
│   │   │   ├── generate-images-button.tsx
│   │   │   ├── generate-audio-button.tsx
│   │   │   ├── generate-video-button.tsx
│   │   │   ├── render-button.tsx
│   │   │   └── scene-actions.tsx  # Per-scene regenerate/video buttons
│   │   └── api/
│   │       ├── stories/
│   │       │   ├── route.ts              # GET (list) + POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts          # GET (detail) + PATCH (update) + DELETE
│   │       │       ├── generate-scenes/route.ts   # POST — Gemini scene generation
│   │       │       ├── generate-images/route.ts   # POST — bulk image generation
│   │       │       ├── generate-audio/route.ts    # POST — TTS narration
│   │       │       ├── generate-video/route.ts    # POST — Veo video for all scenes
│   │       │       ├── render/route.ts            # POST — FFmpeg final render
│   │       │       ├── upload-music/route.ts      # POST — music file upload
│   │       │       └── scenes/[sceneId]/
│   │       │           ├── regenerate-image/route.ts  # POST — regen single scene image
│   │       │           └── generate-video/route.ts    # POST — Veo for single scene
│   │       └── preview-voice/route.ts    # POST — TTS voice sample preview
│   ├── lib/
│   │   ├── ai.ts              # Gemini scene generation (structured output)
│   │   ├── imagen.ts          # Gemini image generation (Nano Banana 2)
│   │   ├── tts.ts             # Google Cloud TTS (Chirp 3 HD, SSML)
│   │   ├── veo.ts             # Veo 3.1 Fast image-to-video
│   │   ├── render.ts          # FFmpeg composition pipeline
│   │   └── prisma.ts          # Prisma client singleton
│   └── generated/prisma/      # Prisma generated client (auto-generated, in .gitignore)
├── public/
│   ├── audio/[storyId]/       # Generated narration MP3s
│   ├── videos/[storyId]/      # Generated Veo video clips
│   ├── renders/[storyId]/     # Final rendered MP4s
│   └── music/[storyId]/       # Uploaded music files
├── next.config.ts
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env                       # Environment variables (not in git)
```

---

## Database Schema

### Story
The main entity. Contains the story text, generation settings, and status.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| title | String | Story title |
| text | String | Full story text (user input) |
| status | String | `draft` → `generating` → `scenes_ready` → `images_ready` → `audio_ready` → `rendered` |
| error | String? | Last error message |
| styleGuide | String? | AI-generated visual consistency guide |
| storyStyle | String | `cinematic` (default), `documentary`, `anime`, etc. |
| voiceId | String | TTS voice (default: `en-US-Chirp3-HD-Aoede`) |
| voiceVolume | Float | 0.0 to 1.0 |
| audioUrl | String? | Path to generated narration MP3 |
| audioStatus | String | `none` → `generating` → `done` → `error` |
| musicUrl | String? | Path to uploaded background music |
| musicVolume | Float | 0.0 to 1.0 (default: 0.15) |
| subtitleStyle | String | `karaoke`, `static`, `none` |
| subtitleColor | String | Hex color (default: `#FFFFFF`) |
| subtitleHighlight | String | Highlight color for karaoke (default: `#2563EB`) |
| subtitlePosition | String | `top`, `center`, `bottom` |
| subtitleSize | String | `small`, `medium`, `large` |

### Scene
Individual scenes within a story. Each has narration, an image, and optionally a video clip.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| storyId | UUID | FK → Story |
| sceneNumber | Int | Order (1-based) |
| narration | String? | Scene narration text (spoken in TTS) |
| subtitle | String? | Short on-screen subtitle (5-10 words) |
| imagePrompt | String? | Detailed image generation prompt |
| imageUrl | String? | Generated image (base64 data URL) |
| imageStatus | String | `pending` → `generating` → `done` → `error` |
| videoUrl | String? | Path to Veo-generated video clip |
| videoStatus | String | `none` → `generating` → `done` → `error` |
| motionFlag | String | `still` or `video` — AI decides which scenes need motion |
| duration | Float | Scene duration in seconds (default: 5.0) |
| transition | String | `crossfade` (default), `cut`, `fade` |
| sfxSuggestion | String? | AI-suggested sound effect |

### Render
Tracks final video render jobs.

| Field | Type | Description |
|-------|------|-------------|
| id | UUID | Primary key |
| storyId | UUID | FK → Story |
| type | String | `preview` or `final` |
| status | String | `pending` → `rendering` → `done` → `error` |
| videoUrl | String? | Path to rendered MP4 |
| duration | Float? | Video duration in seconds |
| fileSize | Int? | File size in bytes |
| renderTimeMs | Int? | How long the render took |
| error | String? | Error message if failed |

---

## API Endpoints

### Stories CRUD
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/stories` | List all stories with scene/render counts |
| POST | `/api/stories` | Create new story `{ title, text }` |
| GET | `/api/stories/[id]` | Get story with all scenes |
| PATCH | `/api/stories/[id]` | Update story fields (title, text, voice, subtitles, etc.) |
| DELETE | `/api/stories/[id]` | Delete story and all scenes/renders |

### Generation Pipeline
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stories/[id]/generate-scenes` | Gemini 2.5 Flash → 8-12 scenes with style guide |
| POST | `/api/stories/[id]/generate-images` | Generate images for ALL scenes (sequential) |
| POST | `/api/stories/[id]/generate-audio` | Google TTS → continuous narration MP3 |
| POST | `/api/stories/[id]/generate-video` | Veo 3.1 → video clips for motion-flagged scenes (3s delay between) |
| POST | `/api/stories/[id]/render` | FFmpeg → final 1080x1920 MP4 |

### Per-Scene Actions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stories/[id]/scenes/[sceneId]/regenerate-image` | Regenerate image for one scene |
| POST | `/api/stories/[id]/scenes/[sceneId]/generate-video` | Generate Veo video for one scene |

### Other
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/stories/[id]/upload-music` | Upload background music (mp3/wav/ogg/aac/m4a) |
| POST | `/api/preview-voice` | Preview a TTS voice `{ text, voiceId }` → returns MP3 |

---

## Generation Pipeline Flow

```
User creates story (title + text)
        │
        ▼
POST /generate-scenes
  → Gemini 2.5 Flash generates:
    - styleGuide (visual consistency rules)
    - 8-12 scenes with narration, imagePrompt, motionFlag, subtitle, sfxSuggestion
  → Saves scenes to DB, status → "scenes_ready"
        │
        ▼
POST /generate-images
  → For each scene: Gemini 2.0 Flash Exp generates image
  → Images saved as base64 data URLs in scene.imageUrl
  → Sequential generation (no parallelism to avoid rate limits)
        │
        ▼
POST /generate-audio
  → Concatenates all scene narrations into SSML with <break> tags
  → Google Cloud TTS (Chirp 3 HD) → MP3
  → Saved to public/audio/[storyId]/narration.mp3
        │
        ▼
POST /generate-video
  → For scenes with motionFlag === "video":
    - Sends scene image to Veo 3.1 Fast (image-to-video)
    - Polls for completion
    - Downloads MP4 to public/videos/[storyId]/scene-[n].mp4
  → 3-second delay between requests (rate limit protection)
        │
        ▼
POST /render
  → FFmpeg composes final video:
    - Still scenes: Ken Burns zoom effect (5-10% zoom)
    - Video scenes: use Veo clip
    - Cross-dissolve transitions between scenes
    - Narration audio overlay
    - Output: 1080x1920 H.264 + AAC MP4
  → Saved to public/renders/[storyId]/final.mp4
```

---

## AI Models Used

### Scene Generation: Gemini 2.5 Flash
- **Model ID:** `gemini-2.5-flash`
- **Input:** Story text + style preference
- **Output:** Structured JSON (schema-enforced) with scenes, narration, image prompts, motion flags
- **SDK:** `@google/generative-ai` with `responseMimeType: "application/json"` and `responseSchema`

### Image Generation: Gemini 2.0 Flash Exp (Nano Banana 2)
- **Model ID:** `gemini-2.0-flash-exp`
- **Input:** Image prompt + style guide
- **Output:** Base64 image via `responseModalities: ["TEXT", "IMAGE"]`
- **Note:** This is multimodal Gemini generating images, not Imagen. Referred to as "Nano Banana 2" in the community.

### TTS Narration: Google Cloud Chirp 3 HD
- **Voice format:** `en-US-Chirp3-HD-{VoiceName}`
- **Available voices:** Aoede (default), Charon, Fenrir, Kore, Leda, Orus, Puck, Zephyr
- **Format:** SSML with `<break>` tags between scenes, `<mark>` tags for timing
- **Output:** Linear16 → MP3 encoding
- **Auth:** Google Cloud service account key file (GOOGLE_TTS_KEY_FILE env var)

### Video Generation: Veo 3.1 Fast
- **Model ID:** `veo-3.1-fast-generate-preview`
- **Endpoint:** `predictLongRunning` (async — returns operation, poll for completion)
- **Input:** Base64 image from scene
- **Output:** MP4 video clip (5 seconds)
- **Rate limits:** ~10 videos before 429 on free tier. 3-second delay between requests.

---

## Editor Features

The editor is at `/story/[id]/editor` and provides:

### Layout
- **Mobile (< 1024px):** Single column — preview → scene strip → scene details → global controls
- **Desktop (≥ 1024px):** Two columns — left (preview + scene strip), right (scene editor + controls)

### Preview Area
- 9:16 aspect ratio container (max 400px wide on desktop)
- Shows scene video (HTML5 `<video>` with controls, playsInline) if available
- Falls back to scene image
- Subtitle overlay with configurable color and style

### Scene Strip
- Horizontal scrollable thumbnail row
- Numbered thumbnails with scene images as backgrounds (when available)
- Blue border on selected scene
- Mobile: gradient fade on right edge to hint more scenes

### Scene Editor (per-scene)
- Editable narration textarea
- Editable subtitle field
- Collapsible image prompt display
- "Regenerate Image" button
- "Make Video" button (Veo)

### Global Controls
- Voice selector dropdown (8 Chirp 3 HD voices)
- Voice preview button (plays 5-sec TTS sample)
- Voice volume slider (0-100%)
- Music upload button
- Music volume slider (0-100%)
- Subtitle style dropdown (karaoke / static / none)
- Subtitle color picker with hex display
- Save Settings button

### Actions
- Sticky "Render Final Video" button at bottom
- Save button in header (saves scene edits)

---

## Environment Variables

Create a `.env` file in the project root:

```env
# PostgreSQL connection
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/DATABASE_NAME

# Google AI API key (Gemini, Imagen, Veo)
GOOGLE_API_KEY=your-google-api-key

# Google Cloud TTS service account key file path
GOOGLE_TTS_KEY_FILE=/path/to/service-account-key.json
# OR set GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

---

## Setup & Running

```bash
# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Development
npm run dev

# Production build
npm run build

# Start production server
npm start
# Or with PM2:
pm2 start npm --name storyreel-v2 -- start
```

### Prerequisites
- Node.js 22+
- PostgreSQL 15+
- FFmpeg (for rendering)
- Google API key with Generative AI access
- Google Cloud service account with Text-to-Speech API enabled

---

## Known Issues & TODOs

### Current Issues
1. **Image generation uses `gemini-2.0-flash-exp`** — this model may be deprecated. Should add fallback to Imagen 4.0 or newer Gemini image models.
2. **Images stored as base64 data URLs in DB** — works but inefficient for large stories. Should save to filesystem and store paths.
3. **No SSML byte-limit check** — Google TTS caps SSML at 5KB per request. Long stories (12+ scenes with detailed narration) could exceed this.
4. **Veo rate limits** — Free tier allows ~10 videos before 429. Need delays between requests and retry logic.
5. **Build requires `NODE_OPTIONS="--max-old-space-size=2048"`** on servers with <4GB RAM (Turbopack memory usage).
6. **SQLite adapter still in dependencies** — `@prisma/adapter-better-sqlite3` and `better-sqlite3` are unused but still in package.json. Should be removed.
7. **No authentication** — anyone with the URL can create/delete stories. Needs auth layer for production.
8. **No error recovery in pipeline** — if image gen fails midway, you have to regenerate all. Should support resuming from last successful scene.

### Desired Improvements
1. **One-click full pipeline** — "Generate Everything" button that runs scenes → images → audio → video → render automatically
2. **Progress tracking** — real-time progress bar during generation (WebSocket or polling)
3. **Scene reordering** — drag-and-drop scene order
4. **Multiple renders** — save different render versions
5. **Background music mixing** — overlay music track at configurable volume
6. **Subtitle burn-in** — render subtitles onto the final video (currently just displayed in editor)
7. **Export to social platforms** — direct upload to YouTube Shorts, TikTok, Instagram Reels
8. **Batch story generation** — queue multiple stories

---

## Quick Reference

| What | Where |
|------|-------|
| Repo | https://github.com/BotArmyAi/storyreel-v2 |
| Live URL | https://storyreel.botarmy.org |
| PM2 process | `storyreel-v2` (port 3007) |
| Database | PostgreSQL `storyreel_v2` on localhost:5432 |
| Caddy config | `/etc/caddy/Caddyfile` |
| Scene gen model | `gemini-2.5-flash` |
| Image gen model | `gemini-2.0-flash-exp` |
| TTS model | Chirp 3 HD (`en-US-Chirp3-HD-*`) |
| Video gen model | `veo-3.1-fast-generate-preview` |
| Render output | 1080x1920 H.264 + AAC MP4 |
