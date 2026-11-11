# Run the free local prototype

Download the [published v0.2.1 prototype ZIP and matching SHA256SUMS.txt](https://github.com/sharonbasovich/accessroute/releases/tag/v0.2.1), verify the checksum, and extract the ZIP. This is the fixed October 28, 2026 release; later main-branch and browser-demo fixes do not update it. The v0.1.0 and v0.2.0 downloads remain unchanged. After extracting, open a terminal beside serve.mjs, and run `node serve.mjs` with Node 20.19+ or 22.12+. Open http://127.0.0.1:4173/ . The packaged production build needs no npm install or account. Ctrl+C stops the loopback-only server. An optional free port can be set through ACCESSROUTE_PORT.

To run the current source, use `npm ci`, `npm run build`, then `npm start`. Keep this normal root-path build for the loopback download; a Pages subpath build is a separate artifact as described in README.md.

The server exposes only dist/. Source, notes and test artifacts are not served. Use synthetic details only. No hosting, clinic connection, video or event submission is included. See README.md for privacy and limitations; earlier v0.1.0 recordings show the historical interface.
