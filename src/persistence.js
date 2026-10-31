import { KEY, load, seed } from "./model.js";

export const STORAGE_LOCK = `${KEY}.write`;

export function readDemoSession(storage) {
  try {
    const snapshot = storage.getItem(KEY);
    return {
      state: load({ getItem: () => snapshot }),
      snapshot,
      readable: true,
    };
  } catch {
    return { state: seed(), snapshot: null, readable: false };
  }
}

// The lock callback is synchronous and short: no network, UI or user prompts.
// Without cross-tab serialization, keep edits in memory rather than risk a
// stale tab silently overwriting a reset or newer records.
export async function persistDemo({
  storage,
  locks,
  expected,
  state,
  signal,
  isCurrent,
  onSaved,
}) {
  if (!locks?.request) return { kind: "session" };
  try {
    return await locks.request(STORAGE_LOCK, { signal }, () => {
      if (!isCurrent()) return { kind: "cancelled" };
      if (storage.getItem(KEY) !== expected()) return { kind: "conflict" };
      const snapshot = JSON.stringify(state);
      storage.setItem(KEY, snapshot);
      onSaved(snapshot);
      return { kind: "saved", snapshot };
    });
  } catch {
    return { kind: isCurrent() ? "session" : "cancelled" };
  }
}
