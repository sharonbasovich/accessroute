# AccessRoute

A patient-controlled, nonclinical accessibility visit rehearsal. This prototype uses synthetic fixtures only.

## Try the prototype locally

Download the prototype release, extract it, and run `node serve.mjs` with Node 20.19+ or 22.12+. Open http://127.0.0.1:4173. The release includes a production build, so no dependency installation is needed to run it. The server listens only on loopback; stop it with Ctrl+C.

To build from source:

```sh
npm ci
npm run build
npm start
```

For development: `npm run dev`, then http://127.0.0.1:5173.

## v0.2.1 fix release preparation

The current source rejects self-recorded evidence whose source or scope becomes empty after the same normalization used by preview and export. Meaningful multilingual text remains supported. Vite is pinned to 7.3.7, with refreshed dependency notices, and CI checks both the development server and the production static build. This metadata/docs revision adds no feature or interface change. See [release notes](docs/RELEASE-NOTES.md) and [validation evidence](docs/VALIDATION.md).

The v0.2.1 source is being prepared for a separate free prototype release; this change does not publish its ZIP or tag. The existing v0.1.0 and v0.2.0 releases remain unchanged.

## Rehearsal workspace introduced in v0.2.0

The working rehearsal now has a compact stop overview, transient hover/keyboard previews, current-stop questions, a native mobile question disclosure, persistent workspace navigation and clearer selective-sharing feedback. Previewing a stop never saves a response, changes progress or changes the exported note. Opening a stop still requires click, Enter or tap. Pointer/focus interruption behavior and announcements distinguish a preview from the stop currently open. Controls retain explicit keyboard and touch access, reduced motion and a calm visual hierarchy.

Existing screenshots or demo recordings made with v0.1.0 show the earlier interface. They do not depict v0.2.x, and were not replaced or relabelled as new footage. No video or narration is included in this source update.

See [release notes](docs/RELEASE-NOTES.md) and [validation notes](docs/VALIDATION.md).

## Standalone static demo (planned)

No public AccessRoute demo URL has been verified yet. A standalone static deployment is planned separately from this source update. The design and browser-only workflow are retained: no account, API, runtime secret or patient data is needed.

For a GitHub Pages project path, build separately with `npm run build -- --base=/accessroute/ --outDir ../accessroute-pages-build`. Serve that output at `/accessroute/`; do not upload the root-path local build unchanged there. Keep the normal `npm run build` output for the downloadable loopback prototype. A local subpath build passed the same 22 browser checks and six adversarial PDF cases with test entry URLs adapted to the project path. This is not evidence that a public deployment is live. Actual public assets, interaction and print privacy must be verified after deployment.

Static hosts do not run `serve.mjs` or automatically inherit its response headers. Hosting providers can log ordinary web requests; app inputs remain in the browser. Use synthetic details only. GitHub Pages projects under the same account share an origin and browser storage is unencrypted.

## A complete rehearsal

1. Edit communication, sensory and mobility requests.
2. Practice arrival, waiting and consultation choices. Explore example tensions such as quiet waiting versus hearing an audible call, or an entrance versus the complete step-free route.
3. Keep requests separate from self-recorded, unverified confirmations. Records require a source and scope. Changing a request clears its old evidence and resets only the related rehearsal stops.
4. Start sharing with nothing selected, choose individual requests, preview the exact note, then download text or print/save PDF. Rehearsal answers and unselected requests are excluded.
5. Revisit steps, interrupt and reload, or reset the synthetic example.

Patient passports already exist. AccessRoute's focus is rehearsal, confirmation scope and disclosure control, rather than claiming to invent passports.

## Privacy and limits

No backend, login, analytics, runtime AI, remote fonts or clinic integration. State is versioned in browser localStorage. Browser storage is unencrypted and readable by others using the same browser profile. Clearing site data erases it. Reset replaces the example; saved exports remain on disk. Inspect request text and record details for anything you do not want to share.

This is an unvalidated, nonclinical prototype. It does not diagnose, advise on medical care, assess accessibility, verify accommodation availability, contact clinics or guarantee arrangements. Enter synthetic data only. No measured clinical outcomes or user-study results are claimed.

## Validation and contribution

`npm test` runs model invariants. `npm run test:e2e` runs interrupted/repeated flows, invalidation, selective disclosure, keyboard/reset, print boundaries, mobile layouts and axe accessibility scans. On Windows the test configuration uses installed Chrome when available; otherwise install Playwright Chromium with `npx playwright install chromium`. Optional deeper PDF inspection: install `scripts/requirements-pdf.txt`, then run `python scripts/check-adversarial-pdfs.py` after the browser tests.

Tests write local artifacts into ignored `evidence/` and `output/` folders. Automated checks do not establish complete accessibility or clinical effectiveness. See [validation notes](docs/VALIDATION.md).

React, Vite and Lucide React form the component/tooling foundation. The interface and route illustration are original. AI assisted implementation and bounded code review; no AI processes prototype inputs. MIT project license; dependency notices and inventory are included in `licenses/`. This source update does not deploy the app or change an event entry.
