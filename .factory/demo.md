# Demo sandbox

Open [https://forgetting-repair-queue.sociobot.in/demo](https://forgetting-repair-queue.sociobot.in/demo), or select **Try it with sample data** on the landing page.

The demo immediately opens a ranked 18-card sample queue from `sample-trouble-cards.csv`. It includes common repair cases: broad history prompts, vague definitions, overloaded lists, slow responses, and repeated failures.

The app stores the demo workspace under the IndexedDB key `demo:active`. Real imports use the separate `active` key. **Reset demo** replaces only `demo:active` with the shipped sample. **Start for real** deletes `demo:active`, returns to `/`, and loads only the real workspace. Demo exports are generated from the sample workspace only.

All browser claim checks use `/demo` from a fresh state. The sample data ships inside the app and is available to the service worker cache for the offline check.
