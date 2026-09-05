# Repair weak flashcard prompts — verification handoff

**Release verdict: FAIL**

Work order: `forgetting-repair-queue-verify-2`

Date: 2026-09-05 UTC

Live URL: <https://forgetting-repair-queue.sociobot.in>

## Candidate reviewed

- Implementation: `056be8afa9da8e0eda29ac285b32f45a3860a4ed`.
- Documentation candidate: `939f6ff7a70b51dcb432d6c45303eb4ad512dae8`.
- Live `index.html` matches the local build byte for byte: SHA-256 `33af928afd5097577078f62861c8f62aa50704315e3195ed2104e28fa32ac408`.
- The commits after the implementation candidate are report-only.

## What this verification did

- Installed the documented Node setup with `npm ci`.
- Ran every exact command in `.factory/claims.json`; all eight commands exited successfully and each selected one tagged test.
- Ran `npm run test:all`: 4 unit and 12 browser tests passed.
- Opened the live product in fresh desktop, iPhone 13, reduced-motion, privacy-request, and offline browser contexts.
- Exercised demo reset and real-data isolation; all four repair decisions; undo; refresh persistence; CSV/TSV input; empty and invalid input; required-field boundaries; backup export/restore and invalid recovery; delete cancel/confirm; invalid license; legal pages; links; and the deliberate styled 404.
- Ran the worker URL verifier, axe across all public routes, and Lighthouse.
- Changed no product code.

## Why the verdict is FAIL

There are 6 findings and 1 untested public claim:

1. High: the paid-unlock claim test checks copy and a link, not a valid purchase or unlimited queue outcome.
2. Medium: the audience and sample action are below the initial 390×664 iPhone viewport.
3. Medium: SPA route changes neither focus the new `h1` nor announce it.
4. Medium: several mobile controls are smaller than 44×44 CSS px.
5. Medium: the landing page omits required How it works, limits/privacy, and paid-tier sections and has inconsistent footer navigation.
6. Low: several public behaviors work but are absent from the recurring claims registry.

Full evidence and exact measurements are in [verification-2.md](verification-2.md).

## Passing evidence

- One click opens the populated, labeled `/demo` queue.
- Demo state uses `demo:active`; reset and leaving demo preserve real data.
- Live offline `/demo` reload works without console errors.
- Live sample repair makes no cross-origin request.
- CSP, frame blocking, JSON manifest MIME, immutable hashed assets, legal routes, and designed 404 are live.
- Axe found zero violations on every public route.
- Lighthouse: Performance 100, Accessibility 100, Best Practices 100; LCP 1.0 s, TBT 0 ms, CLS 0.

## How to repeat

```sh
npm ci
npm run test:all
```

Then run each command in `.factory/claims.json` separately and verify the live URL with fresh desktop, phone, and offline contexts.

## Next steps

- Add a recorded valid billing fixture or operator-provided entitlement check that proves the unlimited queue outcome and license lifecycle.
- Put the job, audience, and sample action inside the smallest supported phone viewport.
- Focus and announce route headings after push, back, and forward navigation.
- Make every interactive phone target at least 44×44 CSS px.
- Complete the required landing-page structure and consistent footer.
- Add tagged claim entries for the remaining public behaviors.

Do not declare release PASS until every finding is closed and the paid outcome is tested.
