# AccessRoute

A patient-controlled, nonclinical accessibility visit rehearsal. This prototype uses synthetic fixtures only.

## Try the browser demo

[Open AccessRoute](https://sharonbasovich.github.io/accessroute/) with no account or installation. Use fictional details only. The static host may log ordinary web requests; app inputs stay in your browser.

A short walkthrough:

1. Open **Preferences** and edit a synthetic request.
2. Choose **Rehearse visit**, select a practice response, and continue through the three stops.
3. Open **Confirmation ledger**, choose **Update record**, and select **Self-recorded confirmation - unverified** as the status. Enter a fictional source and visit or area covered, then choose **Save record**.
4. Open **Select & share**, choose only the requests you want included, and inspect the note before downloading or printing. Rehearsal answers are excluded.

The browser demo includes the reviewed cross-tab storage, session-only reset and unsaved-record navigation fixes merged through [PR 6](https://github.com/sharonbasovich/accessroute/pull/6). The downloadable v0.2.1 below is an earlier fixed release and does not include those later fixes. Open draft changes are not part of the demo.

## Try the prototype locally

Download the [v0.2.1 prototype ZIP and checksum](https://github.com/sharonbasovich/accessroute/releases/tag/v0.2.1), verify the checksum, extract it, and run `node serve.mjs` with Node 20.19+ or 22.12+. Open http://127.0.0.1:4173. The release includes a production build, so no dependency installation is needed to run it. The server listens only on loopback; stop it with Ctrl+C.

To build from source:

```sh
npm ci
npm run build
npm start
```

For development: `npm run dev`, then http://127.0.0.1:5173.

## Published v0.2.1 release

The [v0.2.1 release](https://github.com/sharonbasovich/accessroute/releases/tag/v0.2.1) was published on October 28, 2026. It rejects self-recorded evidence whose source or scope becomes empty after the same normalization used by preview and export. Meaningful multilingual text remains supported. Vite is pinned to 7.3.7, with refreshed dependency notices. The release page records the checks run for that exact version; the [release notes](docs/RELEASE-NOTES.md) and [validation evidence](docs/VALIDATION.md) retain earlier preparation details.

The v0.1.0, v0.2.0 and v0.2.1 downloads are preserved. Later main-branch and browser-demo fixes do not update those existing ZIPs.

## Rehearsal workspace introduced in v0.2.0

The working rehearsal now has a compact stop overview, transient hover/keyboard previews, current-stop questions, a native mobile question disclosure, persistent workspace navigation and clearer selective-sharing feedback. Previewing a stop never saves a response, changes progress or changes the exported note. Opening a stop still requires click, Enter or tap. Pointer/focus interruption behavior and announcements distinguish a preview from the stop currently open. Controls retain explicit keyboard and touch access, reduced motion and a calm visual hierarchy.

Existing screenshots or demo recordings made with v0.1.0 show the earlier interface. They do not depict v0.2.x, and were not replaced or relabelled as new footage. No video or narration is included in this source update.

See [release notes](docs/RELEASE-NOTES.md) and [validation notes](docs/VALIDATION.md).

## Standalone static demo

The public demo is available at [sharonbasovich.github.io/accessroute](https://sharonbasovich.github.io/accessroute/). Its [build provenance](https://sharonbasovich.github.io/accessroute/provenance.json) identifies the hosted source separately from the preserved downloadable release. No account, API, runtime secret or patient data is needed.

For a GitHub Pages project path, build separately with `npm run build -- --base=/accessroute/ --outDir ../accessroute-pages-build`. Serve that output at `/accessroute/`; do not upload the root-path local build unchanged there. Keep the normal `npm run build` output for the downloadable loopback prototype. The historical local subpath build passed 22 browser checks and six adversarial PDF cases with test entry URLs adapted to the project path. Those counts apply to that earlier build, not every later revision. Verify public assets, interaction and print privacy after any new deployment.

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

## Cross-tab storage safety

The current source serializes brief storage writes with the browser Web Locks API and checks the saved snapshot before writing. If another tab changes or clears saved data, a stale tab stops saving, keeps its session available and offers an explicit reload that discards that tab’s unsaved changes. It does not silently merge or choose between records. A local reset in a conflicted tab resets only that session. Browsers without Web Locks, failed storage writes or a blocked save use clearly labeled session-only mode and leave prior saved data untouched. This mode still loads readable existing data.

Use only synthetic data. Existing older app tabs do not participate in the new lock and should be closed/reloaded; this is not an encrypted store or protection against other same-origin scripts. Downloads and selective-disclosure rules are unchanged. Baseline Chromium regression reproduced reset resurrection before the fix; new tests cover concurrent edits, cleared storage, explicit reload, unsupported/rejected locks, quota failure and a timed-out lock.

Saving is asynchronous: wait for “Saved on this browser” before closing or reloading. A pending-save reload receives the browser’s leave-page warning where supported; browser or device termination can still discard unsaved session edits.

Unsaved preferences, recorded evidence and rehearsal work also keep the leave-page warning active after saving fails or another tab changes the saved copy. A successful save or a full return to the last saved work clears that warning. Moving between stops alone does not mark work as unsaved. A selective text/PDF export is not a backup of the complete rehearsal and does not clear the warning. Browser warnings are best-effort, not persistence, and can be unavailable on some browsers or during process/device termination.
