# Repair Queue

Repair Queue is a private, offline-capable workbench for self-learners with established Anki decks. It turns card-summary or review-log exports into an explainable list of prompts worth revising, splitting, suspending, or archiving. It does not schedule reviews or judge a learner's memory.

Live: <https://forgetting-repair-queue.sociobot.in>

## What it does

- Reads UTF-8 CSV, TSV, or semicolon-separated card summaries and Anki-style review logs.
- Recognizes common columns such as `Front`, `Back`, `cid`, `ease`, `time`, `Reviews`, and `Lapses`.
- Groups review logs by card and scores the latest 20 entries: 75% failure ratio, 20% response time, 5% repeat burden.
- Saves repair decisions and notes in IndexedDB, preserves the original export, and produces CSV and JSON downloads.
- Installs as a PWA and reopens the saved queue offline.
- Gives everyone a complete 15-card repair session. A $12 one-time Workbench Plus license unlocks unlimited queue depth through Sociobot billing.

Study data never leaves the browser. Only an optional license token is sent to the Sociobot verification endpoint. See [`/privacy`](https://forgetting-repair-queue.sociobot.in/privacy/) and [`/terms`](https://forgetting-repair-queue.sociobot.in/terms/).

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Then open the URL printed by Vite. The app includes a sample export for a quick end-to-end check.

## Test and build

```sh
npm test            # parser and scoring unit tests
npm run build       # reproducible static output in ./dist
npm run test:e2e    # Chromium workflow, axe, 390px, legal, and offline checks
npm run test:all    # all of the above
```

The exact deployment build command is `npm run build`. Deploy the contents of `dist/`; `dist/index.html` is the entry point. No server, environment variable, product ID, or secret is required at runtime.

## Supported exports

A card-summary file needs a prompt column such as `Front`, `Question`, or `Prompt`. Review and failure columns improve the score; a response-time column is optional. A review log needs a card identifier (`cid` or `card_id`) and rating (`ease`, `rating`, or `button`). Prompts absent from an Anki revlog can be filled in during repair.

The original export is retained byte-for-byte in IndexedDB. Starting a new analysis replaces the active local workspace, so download a backup first if it should be kept.

## Product references

- [Research brief](.factory/brief.json)
- [Visual system and artwork provenance](.factory/design.md)
- [Build handoff](.factory/handoff.md)

Licensed under the [MIT License](LICENSE).
