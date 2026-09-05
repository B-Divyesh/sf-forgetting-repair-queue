# Repair Queue

Repair Queue helps self-learners repair weak flashcard prompts from local Anki exports. It shows why a card is flagged, then records a revise, split, suspend, or archive decision. It does not replace Anki scheduling or diagnose memory or learning conditions.

Live app: <https://forgetting-repair-queue.sociobot.in>

## First action

Open <https://forgetting-repair-queue.sociobot.in/demo> or select **Try it with sample data**. One click opens a ranked 18-card queue with a persistent demo label. The demo uses its own IndexedDB key and never replaces the real workspace. **Reset demo** replaces the sample workspace. **Start for real** discards it.

## What is proven

- Study files stay in the browser during a sample repair; the browser test records only same-origin requests.
- The original import can be downloaded unchanged after a repair.
- A saved repair plan can be exported as CSV.
- The sample queue reopens offline after the first visit.
- Workbench Plus is a $12 USD one-time purchase for unlimited queue depth. The free queue, downloads, backups, and accessibility features stay available.

The corresponding outcome checks are documented in [`.factory/claims.json`](.factory/claims.json). The demo storage boundary and sample contents are documented in [`.factory/demo.md`](.factory/demo.md).

## Run locally

Requires Node.js 20 or newer.

```sh
npm ci
npm run dev
```

Open the URL printed by Vite. Use `/demo` for the isolated sample queue.

## Verify and build

```sh
npm test
npm run build
npm run test:e2e
npm run test:all
```

Run every public claim from a clean checkout after `npm ci`:

```sh
npm run test:claims -- --grep @claim:demo-one-click
npm run test:claims -- --grep @claim:demo-isolation
npm run test:claims -- --grep @claim:score-explanation
npm run test:claims -- --grep @claim:local-browser-only
npm run test:claims -- --grep @claim:original-download
npm run test:claims -- --grep @claim:csv-export
npm run test:claims -- --grep @claim:one-time-unlock
npm run test:claims -- --grep @claim:offline-reload
```

`npm run build` produces the deployable static PWA in `dist/`. Deploy its contents with `dist/index.html` at the root. The included `staticwebapp.config.json` sets the response policy, demo route, 404 page, MIME type, and cache headers.

## Privacy and terms

Study exports and repair decisions are stored in IndexedDB on the device. An optional Workbench Plus license token is checked with Sociobot and cached locally. Read the [privacy policy](https://forgetting-repair-queue.sociobot.in/privacy/) and [terms](https://forgetting-repair-queue.sociobot.in/terms/).

## Product references

- [Research brief](.factory/brief.json)
- [Visual system and artwork provenance](.factory/design.md)
- [Build handoff](.factory/handoff.md)

Licensed under the [MIT License](LICENSE).
