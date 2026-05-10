# Quiet Signals

Quiet Signals is a non-diagnostic leadership pressure reflection tool. The home page headline is:

> Listen before it gets loud

The app helps a user reflect on workplace pressure patterns through scenario-based questions, optional on-device camera and voice signals, and a result page that suggests coaching, therapy, mixed support, or other next steps based on local scoring.

## Current User Flow

1. Home page: user starts the reflection or opens the "How it works" page.
2. Pathway page: user chooses individual support or organizational support.
3. Organizational support: the app says Quiet Signals does not offer organizational support at this time. No email address is shown.
4. Reflection setup: scenario-based assessment is always included.
5. Optional signals: user may add camera, voice, or camera plus voice. They can also continue without selecting either one.
6. Acknowledgements: user can tick each required acknowledgement or use "Agree to all".
7. Scenario assessment: user answers the required workplace scenarios.
8. Contact capture: user provides name/email and consent before results are saved.
9. Results: app shows the Quiet Signals Map, score summary, supportive signal context, suggested support, and PDF download.

## Reflection Modes

- Scenario assessment is required and forms the core scoring path.
- Camera and voice are optional supportive signals only.
- Camera and voice do not diagnose the user.
- Text Only Reflection is available from the accessibility panel and skips camera/voice.
- Camera assessment asks "Does this feel accurate right now?" for every usable read.
- Low camera reads collect user feedback without adding pressure-pattern points.
- Voice assessment includes an alternate typed reflection path for users who do not want to speak.

## Suggested Support Copy

Suggested support uses coaching language where appropriate:

- Low pressure pattern: coaching-focused support.
- Moderate pressure pattern: coaching and therapy blend.
- High pressure pattern: therapy-focused support.

The result mapping and scoring thresholds are unchanged by the support-copy changes.

## Accessibility Features

Accessibility preferences are managed by `hooks/useAccessibility.tsx` and exposed on the reflection setup screen through `components/quiet-signals/AccessibilityPanel.tsx`.

Available options:

- Text Only Reflection: skips camera and voice and uses scenarios only.
- Calm Experience: reduces motion and softens animated effects.
- Larger Text: increases readable text sizing across the app.
- High Contrast: increases contrast and strengthens focus states.

Additional accessibility support:

- App-level `MotionConfig` respects Calm Experience and user reduced-motion preferences.
- Visible focus rings are defined globally.
- Screen changes are announced through a polite live region.
- Processing status uses `aria-live`.
- Results use progressbar roles and shape markers so meaning is not color-only.

## Scoring And Results

Core scoring lives in:

- `lib/quiet-signals/scenarios.ts`: bundled scenarios, answer scoring, result mappings, and fallback resources.
- `lib/quiet-signals/scoring.ts`: session creation, score application, result finalization, demo profiles, PDF helper logic.
- `lib/quiet-signals/face-analysis.ts`: on-device camera feature aggregation and supportive points.
- `lib/quiet-signals/voice-analysis.ts`: on-device voice feature aggregation and supportive points.

Important scoring rules:

- Scenario answers drive the main result.
- Camera and voice only add bounded supportive context.
- If a user says a moderate/elevated camera or voice signal is not accurate, that signal's supportive points are not added.
- Low camera confirmations are collected for reflection quality but do not add pressure-pattern points.
- Gemini does not decide the result.

## Data And Firebase

The app uses Firebase Cloud Firestore for saved content/results. Firebase Auth, Storage, Functions, Realtime Database, and Analytics are not required by the current code.

Firestore collections:

- `resources`: optional result resources with `title`, `description`, optional `url`, optional `signal`, and `order`.
- `userResults`: saved completed real reflection results.
- `userContacts`: optional contact records with name, email, consent, and score summary.

Scoring questions and score bands are bundled locally so stale Firestore content cannot override the scoring matrix.

Personal contact details are saved only when a user explicitly consents.

See [docs/firebase-setup.md](docs/firebase-setup.md) for Firebase console setup, Firestore rules, seeding, and collection details.

## Gemini Summary

The final "What may be happening" summary is generated server-side with Gemini when configured.

Gemini receives structured result data and supportive signal context. It writes a short supportive summary, but scoring and result routing still come from the local scoring code.

## Environment Variables

Create `.env.local` and fill in the values needed for your environment:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=

# Server-only, used by the personalized summary route
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash

# Server-side Firebase Admin read for saved userResults
FIREBASE_PROJECT_ID=
FIREBASE_SERVICE_ACCOUNT_KEY=./service-account.json
```

If Firebase is not configured, the app falls back to bundled quiz content where possible, but saving results and generating Firestore-backed summaries will not work.

## Development

Install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

Other scripts:

```bash
npm run dev:fresh
npm run clean
npm run build
npm run start
npm run seed:firestore
npm exec tsc -- --noEmit
```

Note: `npm run lint` currently calls `eslint .`, but `eslint` is not listed in `package.json`.

## Key Files

- `app/page.tsx`: app entry point.
- `app/layout.tsx`: metadata and global layout.
- `app/api/quiet-signals/summary/route.ts`: Gemini summary route.
- `components/quiet-signals/LandingScreen.tsx`: home page.
- `components/quiet-signals/PathwayScreen.tsx`: individual vs organizational pathway.
- `components/quiet-signals/ConsentScreen.tsx`: reflection mode, accessibility panel, acknowledgements.
- `components/quiet-signals/ScenarioScreen.tsx`: scenario questions.
- `components/quiet-signals/FaceScreen.tsx`: camera reflection.
- `components/quiet-signals/VoiceScreen.tsx`: voice or typed reflection.
- `components/quiet-signals/ResultsScreen.tsx`: Quiet Signals Map and PDF export.
- `hooks/useAccessibility.tsx`: persisted accessibility preferences.
- `app/globals.css`: theme and accessibility modifiers.

## v0 Project

This repository is linked to a [v0](https://v0.app) project. You can continue developing through v0, and merges to `main` deploy automatically.

[Continue working on v0 ->](https://v0.app/chat/projects/prj_rG3W4CZwiSIyKGzTy9CGZSAxUdDJ)

<a href="https://v0.app/chat/api/kiro/clone/znafi/Quiet-signals" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
