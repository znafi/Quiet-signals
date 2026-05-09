# Quiet-signals

This is a [Next.js](https://nextjs.org) project bootstrapped with [v0](https://v0.app).

## Built with v0

This repository is linked to a [v0](https://v0.app) project. You can continue developing by visiting the link below -- start new chats to make changes, and v0 will push commits directly to this repo. Every merge to `main` will automatically deploy.

[Continue working on v0 →](https://v0.app/chat/projects/prj_rG3W4CZwiSIyKGzTy9CGZSAxUdDJ)

## Getting Started

Create a `.env.local` file with your Firebase web app settings:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
```

See [docs/firebase-setup.md](docs/firebase-setup.md) for the full Firebase console setup, Firestore rules, and collection notes.

Firestore collections used by the app:

- `resources`: result resources with `title`, `description`, optional `url`, optional `signal`, and `order`.
- `userResults`: saved completed quiz results.
- `userContacts`: optional opt-in contact records with name, email, consent, and score summary.

Scoring questions and score bands are bundled in `lib/quiet-signals/scenarios.ts` so stale Firestore content cannot override the scoring matrix.

Personal contact details are not required to see results. They are saved only when a user explicitly submits the contact form.

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## Learn More

To learn more, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.
- [v0 Documentation](https://v0.app/docs) - learn about v0 and how to use it.

<a href="https://v0.app/chat/api/kiro/clone/znafi/Quiet-signals" alt="Open in Kiro"><img src="https://pdgvvgmkdvyeydso.public.blob.vercel-storage.com/open%20in%20kiro.svg?sanitize=true" /></a>
