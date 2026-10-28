# Run the included build

Use Node 20.19+ or 22.12+. Extract the prototype ZIP, open a terminal in its folder, and run `node serve.mjs`. Open http://127.0.0.1:4173. No npm install is required for the included production build. Ctrl+C stops the loopback-only server.

Use synthetic data. Browser storage is unencrypted. Exports remain after reset. This prototype does not verify clinic arrangements or provide medical advice.

Rebuild: `npm ci` then `npm run build`. Development: `npm run dev`. Model checks: `npm test`. Browser checks: `npm run test:e2e`.
