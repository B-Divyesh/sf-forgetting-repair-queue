# Repair Queue — build handoff

Work order: `forgetting-repair-queue-build-1`

Completed: 2026-08-28

Deploy type: static PWA; publish `dist/`

## Delivered

- A complete local workflow for CSV/TSV card summaries and Anki-style review logs: select or paste → preview recognized columns → rank → inspect evidence → revise, split, suspend, or archive → export.
- Flexible quoted-field parser and common Anki aliases. Review logs group by card and use the latest 20 rows. Card summaries use the counts provided.
- Explainable 100-point scoring: failure ratio 75, response time 20 (4–16 seconds), repeated failures 5. Missing response time contributes zero and produces a visible warning.
- IndexedDB persistence for the untouched source file and repair records; CSV repair-plan export, original download, JSON backup/restore, and specific confirmed local deletion.
- Free 15-card session and a non-blocking $12 one-time Workbench Plus unlock. It captures returned licenses, strips tokens from the URL, verifies through the product-slug Sociobot endpoint, caches valid verdicts for 24 hours, works optimistically offline, and supports paste-to-restore. No product ID or payment provider is embedded.
- Installable PWA manifest with 192, 512, and maskable icons. The versioned service worker precaches the self-contained app shell, imagery, legal pages, and offline fallback; a saved queue reopens with network disabled.
- Product-specific midnight card orchard visual system, responsive 390px workbench, designed focus states, reduced-motion fallback, semantic landmarks, live announcements, and undo after saved repair decisions.
- Original hero generated through the factory image model, reviewed, optimized to 28 KB / 112 KB WebP variants, and documented with source and prompt in `assets/src/`.
- Standalone `/privacy/` and `/terms/` pages, MIT license, and full README.

## Verification

Run from a clean checkout with Node.js 20+:

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Results recorded on 2026-08-28:

- `npm test`: 4/4 parser and scoring tests passed.
- `npm run build`: passed; `dist/index.html` produced at the required root.
- `npm run test:e2e`: 6/6 Chromium tests passed, covering import/repair, malformed input, axe, 390px overflow, offline reopen, privacy, and terms.
- Factory `verify-url.sh`: HTTP 200, title present, `lang=en`, exactly one `h1`, main landmark present, all images have alt text, and no console/page errors.
- Playwright axe: no serious or critical issues on landing or workbench.
- Lighthouse mobile: performance 99, accessibility 100, best practices 100; FCP 0.8 s, LCP 1.1 s, total blocking time 150 ms, CLS 0.
- Production asset sizes: app JavaScript 32.97 KB (12.13 KB gzip), CSS 18.71 KB (5.04 KB gzip), mobile hero WebP 28 KB. No runtime font, CDN, analytics, or tracking requests.
- `npm audit`: 0 vulnerabilities.

## Known gaps and next steps

- A bare Anki revlog usually has card IDs but no prompt text. Those cards remain usable and editable, but importing a joined export with `Front` / `Back` provides a better repair experience.
- Four-week before/after comparison is the logical next feature once pilot exports establish reliable matching conventions; v1 intentionally reports one imported snapshot at a time.
- Browsers can evict site storage under device pressure. The UI therefore exposes original, CSV, and JSON downloads; users should keep a backup before clearing browser data.
- The factory still needs to register the paid product/price and deploy. No infrastructure, DNS, billing configuration, or secret was changed from this repository.
