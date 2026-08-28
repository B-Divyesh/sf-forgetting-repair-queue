# Repair Queue — verification handoff

**Release verdict: FAIL**

Work order: `forgetting-repair-queue-verify-1`
Verified candidate: `2fff9659d40c028897d1b6c99bdc68550717aa48`
Live URL: https://forgetting-repair-queue.sociobot.in/
Date: 2026-08-28

## Why it fails

1. `.factory/claims.json` is absent. The work order declares this release-blocking, so the mandated claims tests cannot be executed from the demo entry point.
2. `Try a sample file` is a two-click workflow: it opens a preview and then requires `Build the repair queue`. The acceptance contract requires a one-click sample-data demo.

## What passed

- Clean install: `npm ci` (0 audit vulnerabilities).
- `npm test`: 4/4 passed.
- Exact production build: `npm run build` passed and created `dist/`.
- `npm run test:e2e`: 6/6 passed.
- Live deployment identity: root shell plus tested PWA/legal/asset files byte-match this candidate build.
- Live desktop/mobile, keyboard, reduced-motion, error handling, save/undo/original preservation, axe, service-worker offline reload, and privacy/outbound-request checks passed.
- Lighthouse mobile: performance 96, accessibility 100, best practices 100; FCP 0.9 s, LCP 1.0 s, TBT 240 ms, CLS 0.
- API verification rate limiting passed: 80 concurrent requests yielded 30×200 and 50×429, with `Retry-After: 4` on every 429.

## Additional findings

- **Medium:** deployed responses lack enforcing CSP and clickjacking protection (`X-Frame-Options` or CSP `frame-ancestors`).
- **Low:** manifest is served as `application/octet-stream`; sampled static responses have only `max-age=30` rather than immutable asset caching. Offline service-worker behavior still passed.

Full evidence, commands, exact hashes, and scope notes: [verification.md](verification.md).

## How to reproduce the passing checks

```sh
npm ci
npm test
npm run build
npm run test:e2e
```

Do not release this candidate until the two blockers are fixed and independently re-verified.
