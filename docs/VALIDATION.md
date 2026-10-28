# Prototype validation

Local release-candidate checks on 28 October 2026 passed with locked dependency installation, production build, 18 model tests and 21 browser tests. The browser suite includes interrupted/repeated flows, relevant-only stale resets, empty/Unicode input, storage failure/corruption, keyboard and touch activation, transient preview interruption, explicit note preview/download/print boundaries, eight workspace axe scans and five responsive selected-state scans at 320, 375, 768, 1024 and 1440 pixels. Ten nested selected/hover/focus/error text states passed contrast checks; the lowest measured ratio was at least 5.42:1 in this local run.

Six adversarial PDFs are inspected for excluded markers in text, metadata and decoded representations, one-page bounds and attachments. Two additional note exports are checked as one-page documents. Empty/non-preview workspaces print blank. Optional PDF checks after the browser suite: `python -m pip install -r scripts/requirements-pdf.txt`, `python scripts/check-adversarial-pdfs.py`, and `python scripts/inspect-pdf.py`.

The app source and production runtime are compared byte-for-byte with the reviewed UI revision. Only public documentation, portable test configuration, version metadata and CI packaging differ. Dependency package identities/licenses remain unchanged.

These checks are software evidence, not clinical validation, a formal security assessment or complete WCAG certification. Mobile/touch are emulated. Physical devices, screen-reader speech, physical printing and native 200% zoom are not verified. Local timings do not imply device or FPS guarantees. Browser storage remains unencrypted. There is no user-study evidence.

The CI workflow has read-only repository permissions and runs model/build/browser/PDF checks. Local results do not establish remote CI success; inspect the workflow for the exact published commit. Private review correspondence, machine/session files, owner paths and unauditioned media are excluded.

