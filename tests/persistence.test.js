import { test } from "node:test";
import assert from "node:assert/strict";
import { KEY, seed } from "../src/model.js";
import {
  readDemoSession,
  persistDemo,
  STORAGE_LOCK,
} from "../src/persistence.js";
const locks = {
  request: async (name, options, fn) => {
    assert.equal(name, STORAGE_LOCK);
    return fn();
  },
};
function fixture() {
  let value = JSON.stringify(seed());
  return {
    getItem: () => value,
    setItem: (key, next) => {
      assert.equal(key, KEY);
      value = next;
    },
  };
}
function args(storage) {
  let snapshot = storage.getItem(KEY);
  return {
    storage,
    locks,
    state: seed(),
    expected: () => snapshot,
    onSaved: (s) => {
      snapshot = s;
    },
    isCurrent: () => true,
    signal: new AbortController().signal,
  };
}
test("initial state and comparison snapshot come from one read", () => {
  let reads = 0;
  const data = seed();
  data.requests[0].text = "Synthetic snapshot";
  const session = readDemoSession({
    getItem: () => {
      reads++;
      return JSON.stringify(data);
    },
  });
  assert.equal(reads, 1);
  assert.equal(session.state.requests[0].text, "Synthetic snapshot");
  assert.equal(session.snapshot, JSON.stringify(data));
});
test("successful serialized save advances expected snapshot synchronously", async () => {
  const storage = fixture(),
    a = args(storage);
  a.state.requests[0].text = "Synthetic update";
  assert.equal((await persistDemo(a)).kind, "saved");
  assert.equal(a.expected(), storage.getItem(KEY));
  assert.equal((await persistDemo(a)).kind, "saved");
});
test("stale snapshot is rejected without replacing newer data", async () => {
  const storage = fixture(),
    a = args(storage);
  storage.setItem(KEY, "newer synthetic value");
  assert.equal((await persistDemo(a)).kind, "conflict");
  assert.equal(storage.getItem(KEY), "newer synthetic value");
});
test("unsupported serialization never writes but retains existing saved state", async () => {
  const storage = fixture(),
    a = args(storage);
  const before = storage.getItem(KEY);
  a.locks = undefined;
  a.state.requests[0].text = "Unsaved";
  assert.equal((await persistDemo(a)).kind, "session");
  assert.equal(storage.getItem(KEY), before);
});
test("cancelled queued work does not write", async () => {
  const storage = fixture(),
    a = args(storage);
  a.isCurrent = () => false;
  storage.setItem = () => {
    throw Error("must not write");
  };
  assert.equal((await persistDemo(a)).kind, "cancelled");
});
test("read, write, and lock failures safely report session mode", async () => {
  for (const failure of ["read", "write", "lock"]) {
    const storage = fixture(),
      a = args(storage);
    if (failure === "read")
      storage.getItem = () => {
        throw Error("blocked");
      };
    if (failure === "write")
      storage.setItem = () => {
        throw Error("quota");
      };
    if (failure === "lock")
      a.locks = { request: () => Promise.reject(Error("unavailable")) };
    assert.equal((await persistDemo(a)).kind, "session");
  }
});
test("initial storage failure is distinguished from valid empty storage", () => {
  assert.equal(
    readDemoSession({
      getItem: () => {
        throw Error("blocked");
      },
    }).readable,
    false,
  );
  assert.equal(readDemoSession({ getItem: () => null }).readable, true);
});
