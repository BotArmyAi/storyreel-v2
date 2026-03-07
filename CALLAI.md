# CallAI — Real-Time AI Call Intelligence
### Live transcription + AI suggestions on your iPhone during any phone call

---

## What This Does

You take a call on your normal iPhone. An app on your screen shows:
- Live transcript of the full conversation as it happens (~300ms delay)
- AI suggestions firing in real-time when relevant
- Action items flagged automatically
- Post-call summary + follow-up email drafted the second you hang up

No speaker mode required. No call app. You use your normal Phone.app.

---

## How It Works (Simple)

```
Caller dials your number
        ↓
Carrier forwards to Telnyx number (silent — you still answer normally)
        ↓
Telnyx streams call audio via WebSocket to your backend
        ↓
Backend → Deepgram (transcription, ~300ms latency)
        ↓
Transcript → AI (GPT-4o / Claude) → suggestions fired when relevant
        ↓
iOS app (React Native, TestFlight) shows live transcript + AI panel
```

You're on your normal iPhone call. The app is open on your screen showing everything in real-time.

---

## Architecture

### Components

| Layer | Tool | Purpose |
|---|---|---|
| Call Interception | Telnyx | Receive/fork call audio to cloud |
| Audio Streaming | Telnyx WebSocket Media Stream | PCMU 8kHz audio to backend |
| Transcription | Deepgram Nova-2 | Real-time speech-to-text (~300ms) |
| AI Engine | GPT-4o or Claude | Analysis, suggestions, actions |
| Backend | Node.js | Orchestrates everything |
| iOS App | React Native (TestFlight) | Live display client |
| Bot Integration | Your existing bot | Actions, lookups, automations |

### Data Flow Detail

```
[Call Comes In]
Telnyx receives inbound call
  → POST webhook to backend: call.initiated
  → Backend answers call via Telnyx Call Control API
  → Backend bridges call to your real phone number (you answer on iPhone)
  → Backend starts WebSocket media stream (both_tracks)

[Audio Streaming]
Telnyx WebSocket → backend receives PCMU 8kHz audio chunks
  → Backend pipes chunks to Deepgram WebSocket
  → Deepgram returns: { transcript, is_final, speaker, confidence }

[AI Analysis]
Every ~3-5 final transcript segments → sent to AI with rolling context
AI evaluates: should I fire a suggestion right now?
  → YES: push suggestion to iOS app instantly
  → NO: continue accumulating context

[iOS App]
App holds persistent WebSocket to backend
Receives events:
  - call.started (caller ID, time)
  - transcript.update (new text, speaker label)
  - ai.suggestion (text, type: info/action/response)
  - call.ended (triggers post-call summary generation)
```

---

## Number Setup (Keep Your Number)

No porting required.

**Step 1**: Get a Telnyx number (~$1/month)

**Step 2**: Enable carrier forwarding from your real number to Telnyx:

```
AT&T:     *21*+1TELNYXNUMBER# (dial to activate)
Verizon:  *71TELNYXNUMBER (10 digits)
T-Mobile: Settings → More → Call forwarding → Always forward
```

**Step 3**: Telnyx receives all inbound calls, bridges back to your real iPhone

**Step 4**: You answer on your normal Phone.app. Invisible to callers.

> ⚠️ Forwarding adds ~$0.014/min (2 call legs). Your carrier may also charge forwarding minutes — check your plan.

---

## Cost Breakdown

| Component | Cost/min |
|---|---|
| Telnyx inbound leg | ~$0.006 |
| Telnyx outbound bridge to your phone | ~$0.008 |
| Telnyx WebSocket media streaming | ~$0.004 |
| Deepgram Nova-2 transcription | ~$0.004 |
| GPT-4o (real-time analysis) | ~$0.005 |
| **Total** | **~$0.027/min** |

**Real-world cost:**
- 30 min call: ~$0.81
- 1 hr of calls/day: ~$1.60
- 20 hrs/month of calls: ~$32/month

---

## AI Suggestion Types

The AI listens to the live transcript and fires suggestions in these categories:

| Type | Example Trigger | Example Suggestion |
|---|---|---|
| **Info** | Caller mentions a property address | Pull up property data from your system |
| **Action** | "Send me that over" | Draft email ready to send |
| **Counter** | Price pushback | Suggested response with talking points |
| **Flag** | Legal/compliance term mentioned | ⚠️ Flag for review |
| **Lookup** | Person/company mentioned | Background info surfaced |
| **Reminder** | "I'll call you next week" | Auto-create follow-up reminder |

AI runs on a rolling 5-minute context window. Suggestions only fire when confidence threshold is met — not on every sentence.

---

## Bot Integration

Your existing bot connects to the backend via authenticated WebSocket or webhook.

**What the bot can do during a call:**
- Receive live transcript feed
- Execute lookups on demand (property data, contact info, deal history)
- Push info cards to your iOS app screen
- Queue tasks (drafted emails, follow-up reminders, CRM updates)
- Post-call: auto-log call summary, send follow-up email, update CRM

**Bot trigger format** (your backend pushes to bot):
```json
{
  "event": "call.active",
  "caller_id": "+13125551234",
  "transcript_segment": "...",
  "timestamp": "2026-03-07T20:59:00Z"
}
```

---

## Repo Structure

```
callai/
├── backend/
│   ├── server.js              # Express + WebSocket server
│   ├── telnyx/
│   │   ├── webhook.js         # Handles Telnyx call events
│   │   ├── callControl.js     # Answer, bridge, stream control
│   │   └── mediaStream.js     # WebSocket audio handler
│   ├── transcription/
│   │   └── deepgram.js        # Deepgram WebSocket client
│   ├── ai/
│   │   ├── engine.js          # Rolling context + suggestion logic
│   │   └── prompts.js         # System prompts for call analysis
│   ├── bot/
│   │   └── bridge.js          # Your bot integration
│   └── clients/
│       └── socketServer.js    # WebSocket server → iOS app
│
├── mobile/
│   ├── src/
│   │   ├── screens/
│   │   │   ├── CallScreen.js      # Main live view
│   │   │   ├── HistoryScreen.js   # Past calls
│   │   │   └── SettingsScreen.js
│   │   ├── components/
│   │   │   ├── TranscriptFeed.js  # Live scrolling transcript
│   │   │   ├── SuggestionPanel.js # AI suggestions overlay
│   │   │   └── CallHeader.js      # Caller ID + timer
│   │   ├── services/
│   │   │   └── socket.js          # WebSocket connection to backend
│   │   └── App.js
│   ├── ios/
│   ├── package.json
│   └── .env
│
├── .env.example
└── README.md
```

---

## Backend: Key Code Patterns

### Telnyx Webhook Handler
```javascript
// backend/telnyx/webhook.js
app.post('/telnyx/webhook', async (req, res) => {
  const { data } = req.body;
  
  switch (data.event_type) {
    case 'call.initiated':
      await handleIncomingCall(data.payload);
      break;
    case 'call.answered':
      await startMediaStream(data.payload.call_control_id);
      await bridgeToPhone(data.payload.call_control_id);
      break;
    case 'call.hangup':
      await handleCallEnd(data.payload.call_control_id);
      break;
  }
  res.sendStatus(200);
});
```

### Audio Stream → Deepgram
```javascript
// backend/telnyx/mediaStream.js
wss.on('connection', (telnyxSocket) => {
  const deepgramSocket = deepgram.listen.live({
    model: 'nova-2',
    language: 'en',
    smart_format: true,
    diarize: true,         // Speaker labels
    interim_results: true,
    utterance_end_ms: 1000
  });

  telnyxSocket.on('message', (msg) => {
    const data = JSON.parse(msg);
    if (data.event === 'media') {
      const audio = Buffer.from(data.media.payload, 'base64');
      deepgramSocket.send(audio);
    }
  });

  deepgramSocket.on('Results', (result) => {
    const transcript = result.channel.alternatives[0].transcript;
    if (transcript && result.is_final) {
      handleTranscript(transcript, result.channel.alternatives[0].words);
    }
  });
});
```

### AI Analysis Engine
```javascript
// backend/ai/engine.js
const SUGGESTION_PROMPT = `
You are an AI assistant monitoring a live business call.
Analyze the latest transcript segment in context.
Only respond if there is something genuinely useful to surface RIGHT NOW.
If nothing actionable, respond: null

Categories: INFO | ACTION | COUNTER | FLAG | LOOKUP | REMINDER

Respond in JSON:
{ "type": "ACTION", "text": "Draft email to send the LOI", "urgency": "high" }
Or: null
`;

async function analyzeSegment(transcript, context) {
  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: SUGGESTION_PROMPT },
      { role: 'user', content: `Context:\n${context}\n\nLatest: ${transcript}` }
    ],
    max_tokens: 150,
    response_format: { type: 'json_object' }
  });
  
  const suggestion = JSON.parse(response.choices[0].message.content);
  if (suggestion && suggestion.type) {
    pushToApp({ event: 'ai.suggestion', ...suggestion });
  }
}
```

### iOS WebSocket Push
```javascript
// backend/clients/socketServer.js
function pushToApp(event) {
  appClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(JSON.stringify(event));
    }
  });
}
```

---

## iOS App: Key Screens

### CallScreen (main view during active call)
```
┌─────────────────────────────┐
│  📞 John Smith              │
│  +1 (312) 555-1234  |  4:23 │
├─────────────────────────────┤
│  LIVE TRANSCRIPT            │
│                             │
│  [John]: So the asking      │
│  price on that property     │
│  is 2.4 million and we—     │
│                             │
│  [You]: That's higher than  │
│  what we discussed...       │
│                             │
├─────────────────────────────┤
│  💡 AI SUGGESTION           │
│  ─────────────────          │
│  Comparable sold at $1.9M   │
│  in Jan — use as anchor     │
│                 [Dismiss]   │
└─────────────────────────────┘
```

---

## Environment Variables

```bash
# .env
TELNYX_API_KEY=your_telnyx_api_key
TELNYX_APP_ID=your_telnyx_app_id
TELNYX_PHONE_NUMBER=+1XXXXXXXXXX      # Your Telnyx number
YOUR_REAL_PHONE_NUMBER=+1XXXXXXXXXX   # Your actual iPhone number

DEEPGRAM_API_KEY=your_deepgram_key

OPENAI_API_KEY=your_openai_key
# OR
ANTHROPIC_API_KEY=your_anthropic_key

BACKEND_URL=https://your-backend.com
APP_WS_PORT=8080
BOT_WEBHOOK_URL=https://your-bot.com/callai
```

---

## Deployment

### Backend
- **Host**: Any VPS (DigitalOcean $6/mo, Railway, Render)
- **Needs**: Public HTTPS + WSS endpoints (Telnyx requires it)
- **SSL**: Let's Encrypt / Caddy (free)

### iOS App → TestFlight
```bash
# In /mobile
npx react-native run-ios --configuration Release
# Archive in Xcode → Distribute → TestFlight
```

Requirements:
- Apple Developer account ($99/yr)
- Xcode on Mac
- No App Store review needed for internal TestFlight

---

## Build Order

1. **Telnyx account** → get number, configure webhook URL
2. **Backend** → webhook handler + Telnyx Call Control + Deepgram stream
3. **Test**: make a call, confirm audio streams and transcribes
4. **AI engine** → plug in GPT-4o analysis on transcript feed
5. **iOS app** → build WebSocket display client
6. **Bot bridge** → connect your bot to the backend event stream
7. **TestFlight** → archive + upload

Estimated build time with a focused developer: **3-5 days**

---

## Key Dependencies

```json
// Backend
"dependencies": {
  "@telnyx/node": "^2.x",
  "@deepgram/sdk": "^3.x",
  "openai": "^4.x",
  "express": "^4.x",
  "ws": "^8.x"
}

// Mobile
"dependencies": {
  "react-native": "0.73.x",
  "react-native-config": "^1.x",
  "react-navigation": "^6.x"
}
```

---

## Telnyx Dashboard Setup Checklist

- [ ] Create account at telnyx.com
- [ ] Add payment method
- [ ] Buy a phone number
- [ ] Create a TeXML App or Call Control App
- [ ] Set webhook URL to `https://yourbackend.com/telnyx/webhook`
- [ ] Enable Outbound Voice Profile (for bridging calls to your iPhone)
- [ ] Set call forwarding on your carrier to Telnyx number

---

*Built for speed. No fluff. This is the stack.*
