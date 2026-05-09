# Firebase Setup

This app uses Firebase only for Cloud Firestore.

It does not currently need Firebase Auth, Storage, Functions, Realtime Database, or Analytics for the code in this repo.

## 1. Create the Firebase project

1. Go to the Firebase console and create a project.
2. Add a Web App to the project.
3. Copy the Firebase config values from the Web App settings.
4. Enable Cloud Firestore in production mode.

## 2. Add local environment variables

Create `.env.local` in the repo root and paste your Web App values:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id
```

Restart `npm run dev` after changing `.env.local`.

## 3. Add Gemini and server-side Firebase variables

The final personalized summary is generated on the server. Add a Gemini key from Google AI Studio:

```bash
GEMINI_API_KEY=your-gemini-api-key
GEMINI_MODEL=gemini-2.5-flash
```

The app still uses local scoring to decide the result. Gemini only receives structured result data and writes the short “What may be happening” summary.

For the summary route to read the saved `userResults` document from Firestore, also configure Firebase Admin credentials:

```bash
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_SERVICE_ACCOUNT_KEY=./service-account.json
```

You can use `FIREBASE_SERVICE_ACCOUNT_JSON` instead of `FIREBASE_SERVICE_ACCOUNT_KEY` in hosted environments.

## 4. Deploy Firestore rules

Install/login to the Firebase CLI if needed:

```bash
npm install -g firebase-tools
firebase login
```

Set the project id:

```bash
cp .firebaserc.example .firebaserc
```

Then edit `.firebaserc` and replace `your-firebase-project-id`.

Deploy rules:

```bash
firebase deploy --only firestore:rules,firestore:indexes
```

## 5. Seed quiz content

Firestore starts empty. Seed the quiz content collections from `lib/quiet-signals/scenarios.ts`:

```bash
npm run seed:firestore
```

The seed script uses Firebase Admin credentials, so it can write content documents while the public app rules stay locked down. It supports any of these auth setups:

```bash
# Recommended: point to a service account JSON file.
# Firebase console > Project settings > Service accounts > Generate new private key.
FIREBASE_SERVICE_ACCOUNT_KEY=./service-account.json npm run seed:firestore

# Or provide the service account JSON as an environment variable
FIREBASE_SERVICE_ACCOUNT_JSON='{"type":"service_account",...}' npm run seed:firestore

# Or use Google application-default credentials
gcloud auth application-default login
npm run seed:firestore
```

Do not commit service account JSON files. `service-account*.json` and `firebase-service-account*.json` are ignored by git.

## 6. Firestore collections

The app reads optional content from this collection:

- `resources`

Scoring questions and score bands are bundled in `lib/quiet-signals/scenarios.ts` so stale Firestore content cannot override the scoring matrix.

If `resources` is empty, the app uses the bundled resources in `lib/quiet-signals/scenarios.ts`, so the quiz still works.

The app writes completed sessions to:

- `userResults`

The included security rules allow public reads for quiz content, public creates for `userResults` and `userContacts`, and block public reads of saved user data.

`userResults` stores completed real reflection results with the required name, email, consent flag, score summary, and raw answer choices. Demo profiles do not create Firestore documents.

## 7. Optional content documents

Only add these documents if you want to manage result resources from Firestore instead of the bundled code.

### `resources`

Document id example: `low-check-in`

```json
{
  "order": 1,
  "title": "Weekly capacity check-in",
  "description": "Set aside a few minutes each week to notice energy, focus, emotional steadiness, and recovery.",
  "signal": "Low"
}
```

### `resultMappings`

Document id example: `low`

```json
{
  "signal": "Low",
  "minScore": 0,
  "maxScore": 8,
  "title": "Low burnout signal",
  "description": "Your responses suggest lower burnout pressure across these scenarios.",
  "recommendation": "Keep protecting the routines and recovery practices that help you stay steady."
}
```

## 7. Quick test

1. Run `npm run dev`.
2. Complete the quiz.
3. Enter the required name/email/consent details.
4. In Firestore, check that a new document appears in `userResults`.

If no document appears, check the browser console for Firebase permission or env-var errors.

## 8. Privacy notes

- Treat `userResults` as personal data because it includes name, email, and score data. Limit Firebase console access to people who need it.
- Publish a plain-language privacy policy before collecting real user contact details.
- Consider Firebase App Check or a server-side API route before launch if spam or abuse becomes a concern.
