import { test } from "node:test";
import assert from "node:assert/strict";
import { KEY, seed, shareText } from "../src/model.js";
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
    let saved = 0;
    a.onSaved = () => {
      saved++;
    };
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
    assert.equal(
      saved,
      0,
      "failed persistence must not advance the saved marker",
    );
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

test("work snapshot tracks meaningful work but ignores navigation and ordering", async () => {
  const { workSnapshot } = await import("../src/persistence.js");
  const initial = seed();
  const baseline = workSnapshot(initial);
  assert.equal(workSnapshot({ ...initial, active: "waiting" }), baseline);
  for (const change of [
    (state) => {
      state.requests[0].text = "SYNTHETIC NEW REQUEST";
    },
    (state) => {
      state.requests[0].status = "unconfirmed";
    },
    (state) => {
      state.requests[0].source = "SYNTHETIC SOURCE";
    },
    (state) => {
      state.requests[0].scope = "SYNTHETIC SCOPE";
    },
    (state) => {
      state.choices.arrival = "SYNTHETIC CHOICE";
    },
    (state) => {
      state.visited.push("arrival");
    },
  ]) {
    const changed = structuredClone(initial);
    change(changed);
    assert.notEqual(workSnapshot(changed), baseline);
  }
  const a = {
    ...initial,
    visited: ["waiting", "arrival"],
    choices: { waiting: "B", arrival: "A" },
  };
  const b = {
    ...initial,
    visited: ["arrival", "waiting", "arrival"],
    choices: { arrival: "A", waiting: "B" },
  };
  assert.equal(workSnapshot(a), workSnapshot(b));
});

function malformedStorage() {
  const data = seed();
  data.requests[0] = {
    ...data.requests[0],
    text: "SYNTHETIC MALFORMED REQUEST",
    status: [["confirmed"]],
    source: "SYNTHETIC MALFORMED SOURCE",
    scope: "SYNTHETIC MALFORMED SCOPE",
  };
  const raw = JSON.stringify(data, null, 2);
  const storage = fixture();
  storage.setItem(KEY, raw);
  const session = readDemoSession(storage);
  const options = args(storage);
  options.state = session.state;
  return { storage, session, options, raw };
}

test("malformed restore retains raw comparison bytes but exposes only the full seed", () => {
  const { session, raw } = malformedStorage();
  assert.equal(session.readable, true);
  assert.equal(session.snapshot, raw);
  assert.deepEqual(session.state, seed());
  assert.equal(shareText(session.state, ["communication"]), shareText(seed(), ["communication"]));
});

test("malformed snapshot is repaired only by a successful matching serialized save", async () => {
  const { storage, session, options, raw } = malformedStorage();
  assert.equal(storage.getItem(KEY), raw);
  assert.equal(options.expected(), session.snapshot);
  assert.equal((await persistDemo(options)).kind, "saved");
  assert.equal(storage.getItem(KEY), JSON.stringify(seed()));
  assert.equal(options.expected(), storage.getItem(KEY));
  assert.deepEqual(readDemoSession(storage).state, seed());
});

test("fallback repair cannot overwrite a newer valid saved record", async () => {
  const { storage, options, raw } = malformedStorage();
  const newer = seed();
  Object.assign(newer.requests[0], {
    text: "SYNTHETIC NEWER REQUEST", status: "confirmed",
    source: "SYNTHETIC NEWER SOURCE", scope: "SYNTHETIC NEWER SCOPE",
  });
  const next = JSON.stringify(newer);
  storage.setItem(KEY, next);
  assert.equal((await persistDemo(options)).kind, "conflict");
  assert.equal(storage.getItem(KEY), next);
  assert.equal(options.expected(), raw);
  assert.deepEqual(readDemoSession(storage).state, newer);
});

test("failed fallback repair preserves malformed bytes and later valid work can recover", async () => {
  const { storage, options, raw } = malformedStorage();
  const write = storage.setItem;
  storage.setItem = () => { throw Error("synthetic quota"); };
  assert.equal((await persistDemo(options)).kind, "session");
  assert.equal(storage.getItem(KEY), raw);
  assert.equal(options.expected(), raw);
  assert.deepEqual(readDemoSession(storage).state, seed());
  storage.setItem = write;
  options.state.requests[0].text = "SYNTHETIC RECOVERED WORK";
  assert.equal((await persistDemo(options)).kind, "saved");
  assert.deepEqual(readDemoSession(storage).state, options.state);
});

test("unavailable serialization never rewrites malformed saved bytes", async () => {
  for (const missing of [true, false]) {
    const { storage, options, raw } = malformedStorage();
    options.locks = missing ? undefined : { request: () => Promise.reject(Error("synthetic lock")) };
    assert.equal((await persistDemo(options)).kind, "session");
    assert.equal(storage.getItem(KEY), raw);
    assert.equal(options.expected(), raw);
  }
});
