# Public saved-status acceptance preparation

This is the public-host smoke for the PR 9 saved-status fix. It was prepared inactive; scripts/public-status-expected.json controls whether it may execute. A successful run report, not this documentation or activation alone, establishes acceptance. It is an additive overlay, not a replacement for the repository, prior exit-warning smoke, aggregate tests, or deployment workflow. Copy its five files into the reviewed repository only through the authorized review/publication process. No existing file is changed by this overlay.

## Scope and fixtures

The independent static JSON fixture records the reviewed synthetic seed, a valid confirmed record, and literal expected selected-note text. It was prepared from candidate model.js at draft head `71a7bb75231923bfa43bff09ff43566d62dfd5fb`, source tree `96cec3ef9b7065762f4e40a7b4bea0b592e4e2f0`. The smoke imports no application source at execution time. Review fixture text against requirements rather than treating its origin as independent proof of correctness.

Prepared cases:

1. Array `['confirmed']` and nested `[['unavailable']]` statuses fall back to the synthetic seed. Stored bytes must equal the exact compact JSON serialization of that seed, including after reload. The ledger must show the legitimate request rather than malformed request/evidence.
2. Each case obtains an actual Chromium download via the app's Download text control. The preview must equal literal expected text; the saved file must equal its exact UTF-8 bytes, not merely a simulated Blob or a locator substring.
3. Nested confirmation plus injected localStorage write failure must show Session only and preserve original indented malformed JSON bytes exactly, including after export. Restoring writes and making a legitimate edit must save exactly the expected repaired state. Reload deliberately reinstates write failure: legitimate saved content survives, raw bytes remain unchanged and the badge remains Session only.
4. Valid self-recorded confirmation, source and scope survive restore/save/reload and appear in the exact selected-note download. This does not establish the truth of recorded evidence.

## Activation procedure

- First complete review and required aggregate gates for the final source, then merge/deploy through the separately authorized process. Preparation does not authorize publication, merge or deployment.
- Independently verify the final source commit/tree and exact Pages deployment commit/run. The old main `d80c8c7d0444c8ae9bf103e9f05878a09ce8a285` and old deployment `61a0dcabcc833ae6a785c8d3ee521293d42c5dde` are explicitly rejected.
- Populate scripts/public-status-expected.json with final `sourceCommit`, `sourceTree`, `deploymentCommit`, and file pins. Include index.html, every runtime JS/CSS/asset referenced by the deployed build, provenance.json and artifact-manifest.json. Each file pin is `{ "size": <positive integer>, "sha256": "<64 lowercase hexadecimal characters>", "mime": ["<exact lower-case MIME without parameters>"] }`.
- Derive each pin from the independently reviewed final deployment artifact bytes after verifying the exact Pages deployment commit/run. No extra browser session or independent public-download route is needed to populate pins. Verify artifact provenance `source_commit`, `source_tree`, and `deployment_base` against the final approved revision, and independently review artifact-manifest.json contents and the deployment commit linkage. On execution, the smoke HTTP preflight must obtain successful, nonredirected public responses under `https://sharonbasovich.github.io/accessroute/` and verify their exact bytes against these pins before browser execution. Browser requests are then independently verified before unmodified fulfillment. The runtime does not infer a Git commit from HTTP alone.
- Review pins, fixture and smoke together, then set `ready: true` only when the deployed bytes are final. `reviewedCandidate` is historical context, not the final deployment identity. Never copy the old exit-smoke manifest or pin a locally produced build that has not been independently tied to the verified final deployment artifact and Pages commit/run.
- Publish/run only if separately authorized, on `test/public-status-smoke-20261111-1507`. The dedicated workflow is branch-scoped; no dispatch or deployment job is added. Existing general repository push workflows may also run when a branch is eventually published.
- An inactive workflow skips install and browser steps. Its green workflow result is **not** acceptance. A real pass requires an activated manifest and a report with `success: true` and all four status stages present, plus public identity and exact saved-file hashes. Inspect logs for early-manifest failures, which intentionally produce no artifact directory.

## Safety and limits

The smoke hardcodes the actual HTTPS public origin and path. It checks ready and manifest shape before Playwright import, HTTP, or browser launch. It refuses the known old source/deployment. HTTP pin checks forbid redirects. Browser routes allow only GETs to exact manifest-listed paths with no query and the same public origin, refuse redirects, verify status/MIME/size/SHA256, and fulfill with the unmodified verified public bytes **before they can execute**. Unknown requests, route failures or page exceptions fail the run.

Contexts are fresh and nonpersistent; service workers are blocked. Synthetic fixtures are injected once per new tab using a session marker, so reload cannot re-seed corrupt input. The temporary Storage.setItem override targets only the synthetic application storage key. No real account, native or held browser, persistent profile, existing origin, localhost, physical printer or external write is used. Public hosting still receives ordinary GET request metadata. The script does not visit other sites or upload input.

All browser downloads, fixed-name download copies, screenshots and JSON reports reside in a new mkdtemp directory under RUNNER_TEMP (or OS temp outside CI). The only upload in the prepared workflow is its QA artifact, retained seven days; no repository write token is requested and checkout credentials are not persisted. No dependency installation or browser launch was performed during preparation.

Routing intentionally disables ordinary browser cache and uses verified route fulfillment. These are real public response bytes, but results do not cover normal-cache/service-worker behavior, old open tabs, mobile browsers, other Chromium versions, or authenticated environments. Official Playwright image version is pinned to v1.56.1-noble, matching package-lock, but the image tag and upload-artifact major action are not immutable digest/SHA pins. This follows the existing exit-smoke workflow and does not claim supply-chain attestation.

This targeted smoke does not replace the separate native exit-warning smoke, print/privacy checks, aggregate regression matrix, physical print validation, submission/platform acceptance, or independent security analysis. No exploit-impact claim is made.
