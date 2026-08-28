# Repair Queue — independent verification

**Verdict: FAIL**

Verified on 2026-08-28 against commit `2fff9659d40c028897d1b6c99bdc68550717aa48` and https://forgetting-repair-queue.sociobot.in/.

This is an independent release QA report. Product source was not modified.

## Release blockers

1. **BLOCKER — required claims contract is missing.** `.factory/claims.json` does not exist in the clean checkout. The work order explicitly makes a missing claims file release-blocking; consequently no claims test can be run through the demo entry point.
2. **BLOCKER — the required one-click sample-data demo is not present.** The cold landing-page control is `Try a sample file`. Fresh-browser evidence shows that one click only opens a preview (`18 cards · card summary`) and displays `Build the repair queue`; a second click is needed before the working demo queue appears. This fails the stated first-read/demo-sandbox acceptance rule.

## Cold first read

The live first screen says Repair Queue imports an Anki card summary or review log, ranks cards by recent failures and response time, and is for people repairing stubborn flashcards without self-rating each review. It offers `Analyse an export` and `Try a sample file`; the first useful action is understandable as importing/analyzing an export. The screen otherwise answers what it does and who it is for in plain language. It fails only the required **one-click** sample-demo condition above.

## Local clean-checkout verification

`npm ci` completed with 0 vulnerabilities, then all available product gates passed:

| Command | Result |
| --- | --- |
| `npm test` | PASS — 4/4 Vitest parser/scoring tests |
| `npm run build` | PASS — `tsc --noEmit`, Vite build, inline shell, and service-worker injection; `dist/` created |
| `npm run test:e2e` | PASS — 6/6 Chromium tests |

The browser suite covers sample import/ranking/save, malformed-input recovery, axe landing/workbench checks, 390px overflow, offline saved-queue reload, and standalone privacy/terms pages.

Independent manual/browser checks on the production build additionally confirmed:

- Normal workflow: sample import → queue (18 imported / 15 free) → revise → save produced `1 repaired`; Undo returned it to `0 repaired`.
- The original sample export remained stored byte-for-byte in IndexedDB after editing.
- Invalid CSV with unrecognized headers presents the actionable alert: `No prompt column was recognized. Include a header such as Front, Question, or Prompt.` Quoted CSV, summary scoring, and latest-20 review-log handling are covered by the unit tests.
- Split fields and archive confirmation are required; deletion asks for confirmation and cancellation retains the queue.
- Desktop and 390px mobile had no horizontal overflow. Keyboard tab order starts with the visible skip link; buttons/links are reachable. Reduced-motion rendering reports a near-zero transition duration.
- No console errors or page errors were observed on the live landing, sample preview, workbench, or offline reload.

## Accessibility, PWA, privacy, and performance

- Live axe-core scan: **0 serious/critical violations** on both landing and workbench.
- `html lang`, title, exactly one h1, main landmark, skip link, labels, named controls, alt text, visible focus styling, and reduced-motion CSS are present.
- Live PWA check: manifest has 192, 512, and maskable icons; service worker controller is active with versioned shell/page caches. After saving a queue, a fresh offline reload showed the queue and `Offline · changes save locally` without errors.
- No analytics, third-party scripts, CDNs, or outbound requests occurred during a fresh anonymous browser session. Study data stays in IndexedDB; the only product outbound path is optional Sociobot license verification.
- Bundle budget: generated application JS is 32.97 KB (12.13 KB gzip); CSS is 18.71 KB (5.04 KB gzip); mobile WebP hero is 28,168 bytes. Initial app payload is within the 200 KB static-PWA JS budget.
- Lighthouse 12.8.2 live mobile run: Performance **96**, Accessibility **100**, Best Practices **100**; FCP **0.9 s**, LCP **1.0 s**, TBT **240 ms**, CLS **0**.

## Deployment identity, policies, and API protection

- `dist/index.html` SHA-256 equals the live root HTML: `dc97ceb4340633f1d8b3769a3704db86f8196824e1106c523c707bb15667e6c1`.
- Live `sw.js`, manifest, privacy page, terms page, offline page, legal CSS, and mobile hero also exactly match the locally built files.
- HTTPS responses include HSTS, `nosniff`, and `strict-origin-when-cross-origin`. The live site lacks a Content-Security-Policy and clickjacking policy (`X-Frame-Options` or CSP `frame-ancestors`); see non-blocking finding below.
- The live manifest is served as `application/octet-stream`, and static responses use `max-age=30`, not long-lived immutable cache headers. The service worker provides cache-first asset handling, so offline behavior passed.
- Required rate-limit probe: 80 concurrent requests to `https://api.sociobot.in/api/v1/products/forgetting-repair-queue/verify?license=qa-rate-limit-probe` completed in 712 ms: 30 returned 200 and 50 returned **429**, every 429 carrying `Retry-After: 4`. Threshold observed: approximately 30 accepted requests per burst. This passes the rate-limit requirement.

## Non-blocking defects / hardening gaps

### Medium — missing browser isolation / CSP response policy

The deployed response has no enforcing CSP, no `X-Frame-Options`, and no CSP `frame-ancestors`. Lighthouse reports `No CSP found in enforcement mode`. The app safely escapes its current user-controlled CSV content, but these headers are needed as defense in depth for a local-data application.

### Low — deployment MIME/cache configuration

`/manifest.webmanifest` is `application/octet-stream`, and all sampled static responses use `cache-control: public, must-revalidate, max-age=30`. Serve the manifest as a web-manifest/JSON MIME type and fingerprint static assets with long-lived immutable caching. This did not prevent the tested service-worker offline flow.

## Notes

- No authentication flow is implemented or required, so Microsoft Entra tenant verification is not applicable.
- This is a browser PWA, not a library/CLI or application backend; no pack/install, persistence-concurrency, or health endpoint checks apply.
- The factory `verify-url.sh` referenced in the supplied accessibility instructions is not present in this repository; equivalent title/lang/main/alt/console checks were performed with a fresh live browser session.

