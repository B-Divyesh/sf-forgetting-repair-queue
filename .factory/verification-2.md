# Repair weak flashcard prompts — independent verification 2

**Verdict: FAIL**

- Findings: **6** — 1 high, 4 medium, 1 low.
- Untested public claims: **1**.
- Live URL: <https://forgetting-repair-queue.sociobot.in>
- Implementation candidate: `056be8afa9da8e0eda29ac285b32f45a3860a4ed`
- Documentation candidate: `939f6ff7a70b51dcb432d6c45303eb4ad512dae8`
- Verified: 2026-09-05 UTC.

The two commits after the implementation candidate change only `.factory/handoff.md` and `.factory/verification.md`. The live root is therefore compared with implementation `056be8a`. Its SHA-256 is `33af928afd5097577078f62861c8f62aa50704315e3195ed2104e28fa32ac408`, exactly matching the locally built `dist/index.html`.

## Findings

### High — the paid-unlock claim test does not prove the promised outcome

`.factory/claims.json` says a $12 USD one-time purchase provides unlimited queue depth. Its declared test only checks visible price copy, feature copy, and the checkout link. It never supplies a valid entitlement and never proves that all 18 sample cards become available instead of the free 15.

The live product checkout endpoint returned the expected hosted-checkout redirect, and an invalid license returned `{valid:false, reason:"invalid"}` with a clear product message. No valid purchase or entitlement was available. The related valid, revoked, refund, and cached-verdict paths remain unproved. This is the report's one untested public claim and cannot be waived as an external dependency under the work order.

### Medium — the phone first screen hides the audience and first action

In a fresh Playwright iPhone 13 context, the CSS viewport was 390×664. The job headline ended at 587 px, the audience sentence ended at 694 px, and **Try it with sample data** ended at 778 px. The audience and action therefore required scrolling. A custom 390×844 viewport fits them, but the required fresh-phone first screen does not.

Evidence: [live phone first screen](/work/.evidence/live-phone-landing.png).

### Medium — SPA route changes do not move or announce focus

After the sample action finished opening `/demo`, `document.activeElement` was `BODY`; the new `h1` was not focused. Back navigation to `/demo` also left focus on `BODY`. The only polite live region is the empty toast, and the route title or heading is not announced. This fails the attached site-structure and screen-reader focus contract.

### Medium — several phone controls are below the 44 px target size

Measured in the fresh iPhone context:

- **Reset demo**: 97.4×37.7 px.
- Queue filter: 109×36 px.
- **See unlock**: 73.6×32 px.
- Header **Demo** and **Terms** links: about 35×44 px.
- Footer privacy link: 44×14 px.

The controls work, but the attached accessibility baseline requires targets of at least 44×44 CSS px.

### Medium — the landing page does not contain the required site skeleton

The live landing page has the first screen, importer, score explanation, and footer. It lacks the required three-step **How it works** section, a plain limits/privacy section, and the $12 paid-tier section. The app footer also lacks the required Terms link, and header/footer navigation is not consistent across the app, legal pages, and 404 page.

### Low — public behavior is missing from the recurring claims registry

The public UI promises TSV input, JSON backup export/restore, local deletion, editable saved decisions, latest-20 scoring, a four-second response threshold, and missing-time handling. These do not have their own entries and exactly one tagged outcome test in `.factory/claims.json`.

This verification independently exercised TSV input, missing-time handling, backup export/restore, invalid-backup recovery, delete cancel/confirm, and editing a saved decision. The latest-20 behavior passed its unit test. The behaviors worked, but the claims contract requires them to be declared so future builds keep proving them.

## Cold first read

Desktop passed before scrolling:

- Job: **Repair weak flashcard prompts.**
- Audience: **For self-learners with Anki decks. Find prompts that fail often or take too long to answer.**
- First action: **Try it with sample data**; the adjacent line says it opens a ranked sample queue.

The wording is plain, uses no mood heading, and the title names the job. The phone placement fails as recorded above.

## Declared claim commands

The documented clean setup was `npm ci`, which installed 59 packages with 0 reported vulnerabilities. Every exact command in `.factory/claims.json` then passed independently and selected exactly one tagged test.

| Claim | Result | Observable check |
| --- | --- | --- |
| `demo-one-click` | PASS | One click opened `/demo`, 15 free cards, 3 more ranked cards, and the persistent demo label. |
| `demo-isolation` | PASS | A one-card real queue survived sample editing and leaving the demo. |
| `score-explanation` | PASS | Failure, time, and repeat components appeared for the first sample card. |
| `local-browser-only` | PASS | All requests during the sample repair were same-origin. |
| `original-download` | PASS | Download retained the original prompt and all 18 source rows. |
| `csv-export` | PASS | One saved repair produced the CSV header and one repair row. |
| `one-time-unlock` | **INCOMPLETE** | The command passes, but asserts only copy and the checkout destination; see the high finding. |
| `offline-reload` | PASS | A dedicated context reloaded the saved `/demo` queue offline. |

The full `npm run test:all` gate also passed: 4 unit tests and 12 Chromium tests.

## Live product checks

### Demo, real data, normal use, boundaries, and recovery

- The one-click sample opened a realistic ranked 18-card source with 15 free rows and 3 locked rows.
- The demo label remained visible after repair, reload, and reset.
- Saving and reloading a demo repair persisted it. **Reset demo** returned to 0 repairs. **Start for real** restored the unchanged one-card real queue.
- Revise, split, suspend, and archive paths saved. Undo restored the prior state.
- Empty and unrecognized imports gave specific recovery instructions.
- Required split fields and archive confirmation blocked incomplete saves.
- CSV and TSV imports worked. A missing response time showed **Not scored; response time missing**.
- JSON backup export/restore worked. A malformed backup left the current queue intact and showed a specific error.
- Local deletion was cancelable; confirmation removed the real queue.
- An invalid license was rejected with **That license is not active for this product.**

### Accessibility and responsive behavior

- Axe reported zero violations of any impact on `/`, `/demo`, `/privacy/`, `/terms/`, `/offline.html`, and the styled 404.
- `html lang`, route titles, one `h1`, one `main`, labels, image alt text, skip links, and visible focus styling were present.
- The worker `verify-url.sh` passed with no console errors and no missing title, language, main landmark, alt text, or button name.
- Desktop and phone layouts had no horizontal overflow.
- Reduced motion changed scroll behavior to `auto` and animation/transition durations to `0.01ms`.
- The route-focus and target-size exceptions are findings above.

### Privacy, PWA, links, routes, and response policy

- A fresh live sample repair made four same-origin requests and no cross-origin request.
- `/demo` installed a controlling service worker. A dedicated offline context reloaded it with the 15-card queue, demo label, and **Offline · changes save locally**, without console errors.
- Root, demo, privacy, terms, manifest, robots, sitemap, and offline pages returned 200. The unknown route intentionally returned HTTP 404 with the designed page and a working return link.
- Same-origin links resolved. Mail links were explicit. The product checkout endpoint returned HTTP 303 to hosted checkout.
- The live response has enforcing CSP, `frame-ancestors 'none'`, `X-Frame-Options: DENY`, `nosniff`, referrer policy, and permissions policy.
- `/manifest.json` is `application/json`. The hashed JS is served with `max-age=31536000, immutable`.
- The manifest declares standalone display, versioned start URL, 192/512 icons, and a maskable icon. The social image is 1200×630.
- No application backend exists, so tenant isolation, restart persistence, health, and product API rate-limit checks do not apply. The Sociobot billing system is external to this static product.

### Performance and design

- Lighthouse 12.8.2 live mobile: Performance 100, Accessibility 100, Best Practices 100; FCP 1.0 s, LCP 1.0 s, TBT 0 ms, CLS 0, and 49 KiB total transfer. INP was not measured in the synthetic run.
- Build output: JS 34.95 KB raw / 12.61 KB gzip; CSS 19.28 KB raw / 5.13 KB gzip; mobile hero WebP 28,168 bytes.
- The single nocturne theme, paper-card artwork, copper repair marks, system type, spacing, and reduced-motion policy match `.factory/design.md`. Artwork provenance is recorded. No runtime AI feature is needed for this local scoring and editing job.

## Earlier findings and current disposition

| Earlier finding | Current evidence |
| --- | --- |
| Missing claims file | The file now has eight commands and all run, but the paid outcome is incomplete and other public behaviors are missing from the registry. New findings remain. |
| Sample required a second build click | Fixed. The first click opens the populated queue. |
| Missing CSP and clickjacking policy | Fixed live. |
| Manifest had the wrong MIME type | Fixed live as `application/json`. |
| Static assets lacked immutable caching | Fixed live for the hashed application asset. |
| Service-worker installation failed after hardening | Fixed. A fresh live offline `/demo` reload passed. |

## Evidence

- [Phone first screen](/work/.evidence/live-phone-landing.png)
- [Phone demo](/work/.evidence/live-phone-demo.png)
- [Desktop landing](/work/.evidence/live-desktop-landing.png)
- [Worker URL verification](/work/.evidence/verify-url/verify.json)
- [Lighthouse JSON](/work/.evidence/lighthouse.json)

The required release state is **FAIL**. Product code was not modified.
