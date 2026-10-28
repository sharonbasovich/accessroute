# Prototype validation

Release candidate checks on 28 October 2026: clean locked dependency install, production build, 18 model tests and 16 browser tests passed. The browser suite includes eight axe workspace scans at desktop/mobile widths, keyboard/reset behavior, interrupted/repeated flows, control-only and maximum Unicode input, storage failure/corruption, stale-record invalidation and selective text/print disclosure. 6 adversarial PDFs were checked for excluded markers in text, metadata, decoded streams and object representations, one-page bounds and attachments. Empty/non-preview screens print blank.

The release app source and built runtime are byte-identical to the reviewed local prototype. Only publication documentation, portable test configuration and CI packaging differ. The source/release is synthetic and nonclinical; tests do not constitute a full accessibility audit, security certification or clinical validation. Browser-local storage remains unencrypted. The project has no user-study evidence.

The CI workflow runs model/build/browser/PDF checks with read-only repository permissions. Local results do not imply that a remote CI run passed; inspect the workflow status for the exact published commit.

The source release excludes private review correspondence, local tool/session records and unauditioned narration/film. It contains no hosting configuration or event submission artifacts.
