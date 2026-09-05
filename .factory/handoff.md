# Repair Queue — repair handoff

**Release verdict: PASS**

Work order: `forgetting-repair-queue-repair-1`
Date: 2026-09-05
Live URL: <https://forgetting-repair-queue.sociobot.in>

## Implementation and deployment

- Final implementation SHA: `056be8afa9da8e0eda29ac285b32f45a3860a4ed`
- Documentation evidence SHA: `84c84713b57bb6dc3c86abe49e416dab6eb61745` (recorded after the implementation commit).
- Deployment: static PWA deployed from `dist/` to the existing one-replica `sf-forgetting-repair-queue` Azure Static Web App. No data service, volume, environment, or replica setting was changed.
- Live root SHA-256: `33af928afd5097577078f62861c8f62aa50704315e3195ed2104e28fa32ac408`, matching `dist/index.html` from the final implementation.

## What changed

- **One-click sample flow:** the landing action now opens `/demo` directly into the ranked sample queue. It no longer stops at a preview or requires **Build the repair queue**.
- **Demo boundary:** demo data uses IndexedDB key `demo:active`; real data continues to use `active`. **Reset demo** replaces only sample data. **Start for real** deletes the demo key and restores only the real workspace.
- **Claims:** added [claims.json](claims.json) with eight independently runnable, outcome-based browser claim checks. Added [demo.md](demo.md), [copy-audit.md](copy-audit.md), and the catalog description.
- **Plain first screen:** it now states the job, audience, and first action before scrolling: repair weak flashcard prompts; for self-learners with Anki decks; try sample data.
- **Response hardening:** added CSP with `frame-ancestors 'none'`, `X-Frame-Options: DENY`, permissions policy, immutable hashed-asset caching, and a designed 404 response.
- **PWA correction:** the manifest now uses `manifest.json` and is served live as `application/json`. The service worker no longer precaches Azure’s deployment-only `staticwebapp.config.json`, which Azure deliberately returns as 404; live offline reload now works.
- **Site metadata:** added canonical, Open Graph/Twitter metadata with a product-specific 1200×630 derivative of the documented generated artwork, robots, sitemap, `/demo`, route titles, and footer build identity.

## Verification

From the documented clean setup (`npm ci`), the following final gates passed:

```sh
npm run test:all
```

- Unit tests: **4/4 passed**.
- Browser tests: **12/12 passed**. They cover the one-click demo, demo isolation, score evidence, privacy request boundary, unchanged original download, CSV output, paid-offer display, dedicated-context offline reload, invalid import recovery, axe, 390 px keyboard/mobile behavior, and legal pages.
- Every command listed in `claims.json` was run in this repair session. Each claim has exactly one tagged outcome test; the final full suite also passed all eight claim tests.
- Production checks: root HTML matches the final build; `/demo`, `/privacy/`, `/terms/`, `robots.txt`, and `sitemap.xml` return 200; an unknown route returns the styled **404** page with HTTP 404.
- Production headers: enforcing CSP and `X-Frame-Options: DENY` are present; `/manifest.json` is `application/json`; hashed JS is immutable-cached.
- Fresh Chromium desktop and iPhone 13 contexts: the landing title, job, audience, and primary action were correct; one click showed the persistent demo label and populated 15-card free queue; 0 serious/critical axe issues; no console/page errors; no cross-origin requests during the sample flow.
- Fresh live PWA context: after the service worker cached the shell, an offline reload of `/demo` showed `Offline · changes save locally` and retained `Demo — sample data, nothing is saved`.

The previous candidate’s local Lighthouse run recorded Performance 96 and Accessibility 100. A new Lighthouse CLI attempt could not complete against the container’s Chrome-for-Testing connection, so no new Lighthouse score is claimed here; the deployed fresh-browser and axe checks above did pass.

## Earlier findings and disposition

| Earlier finding | Disposition |
| --- | --- |
| Missing `.factory/claims.json` | Fixed; eight declared claims and clean commands pass. |
| Sample needed a second build click | Fixed; one click enters the populated `/demo` queue. |
| No CSP / clickjacking policy | Fixed live with CSP `frame-ancestors 'none'` and `X-Frame-Options: DENY`. |
| Manifest sent as octet-stream | Fixed live by serving `manifest.json` as `application/json`. |
| No immutable asset caching | Fixed live for `/assets/*`, `/art/*`, and `/icons/*`. |
| PWA reload after hardening | A deployment-only config file initially caused SW install failure; corrected and live offline reload now passes. |

## Known gap and next step

- Workbench Plus remains a $12 USD one-time offer with its hosted Sociobot checkout link and license verification path. No payment or entitlement was exercised in this work order; billing registration and a real customer entitlement remain the separate billing operator’s dependency. Public metadata is at `/work/.evidence/billing-offer.json`.
- The product still analyzes one imported snapshot. A reliable four-week before/after comparison needs pilot matching conventions and remains a future product enhancement.
