# Run the free local prototype

Use a published prototype ZIP and its matching SHA256SUMS.txt. The v0.2.1 ZIP is not published by this source change; v0.1.0 and v0.2.0 remain available unchanged. Extract the selected release, open a terminal beside serve.mjs, and run `node serve.mjs` with Node 20.19+ or 22.12+. Open http://127.0.0.1:4173/ . The packaged production build needs no npm install or account. Ctrl+C stops the loopback-only server. An optional free port can be set through ACCESSROUTE_PORT.

To run the current source, use `npm ci`, `npm run build`, then `npm start`. Keep this normal root-path build for the loopback download; a future Pages subpath build is a separate artifact as described in README.md.

The server exposes only dist/. Source, notes and test artifacts are not served. Use synthetic details only. No hosting, clinic connection, video or event submission is included. See README.md for privacy and limitations; earlier v0.1.0 recordings show the historical interface.
