import { test } from "node:test";
import assert from "node:assert/strict";
import {
  seed,
  updateRequest,
  shareText,
  load,
  validateRecord,
  conflicts,
  affectedStagesByRequestId,
} from "../src/model.js";
test("changed request invalidates only its confirmation and only related rehearsal progress", () => {
  let s = seed();
  s.requests[0] = {
    ...s.requests[0],
    status: "confirmed",
    source: "Fictional email",
    scope: "Demo visit",
  };
  s.visited = ["arrival", "waiting", "consultation"];
  s.choices = {
    arrival: "arrival private",
    waiting: "waiting private",
    consultation: "consultation private",
  };
  s = updateRequest(s, "communication", { text: "A different request" });
  assert.equal(s.requests[0].status, "requested");
  assert.equal(s.requests[0].source, "");
  assert.deepEqual(s.visited, ["arrival"]);
  assert.deepEqual(s.choices, { arrival: "arrival private" });
});
test("confirmation requires both source and scope", () => {
  assert.equal(validateRecord("confirmed", "", "room"), false);
  assert.equal(validateRecord("unavailable", "email", "  "), false);
  assert.equal(validateRecord("confirmed", "email", "side entrance"), true);
});
test("selection is an allowlist; private choices and unselected fields never export", () => {
  const s = seed();
  s.choices.waiting = "PRIVATE_MARKER";
  s.requests[1].source = "HIDDEN_SOURCE";
  const t = shareText(s, ["communication"]);
  assert.match(t, /key information in writing/);
  assert.doesNotMatch(t, /PRIVATE_MARKER|HIDDEN_SOURCE|quieter|step-free/);
});
test("export retains confirmation limits and unverified qualifier", () => {
  const s = seed();
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "Synthetic source",
    scope: "Side entrance only",
  });
  const t = shareText(s, ["communication"]);
  assert.match(t, /unverified/);
  assert.match(t, /Side entrance only/);
});
test("malformed or incompatible persisted data safely resets", () => {
  for (const v of [
    "{",
    "null",
    '{"version":2}',
    JSON.stringify({ ...seed(), requests: [{ id: "bad" }] }),
  ])
    assert.deepEqual(load({ getItem: () => v }), seed());
});
test("persistence rejects invalid confirmation and strips unknown fields", () => {
  const s = seed();
  s.requests[0].status = "confirmed";
  assert.deepEqual(load({ getItem: () => JSON.stringify(s) }), seed());
  const good = seed();
  good.secret = "never";
  assert.equal(load({ getItem: () => JSON.stringify(good) }).secret, undefined);
});
test("recorded limited scope never hides whole-route tension", () => {
  const s = seed();
  Object.assign(s.requests[2], {
    status: "confirmed",
    source: "example",
    scope: "entrance only",
  });
  assert.equal(conflicts(s).length, 2);
});
test("export collapses multiline input to preserve bounded page length", () => {
  const s = seed();
  s.requests[0].text = "First\n\n\nsecond";
  assert.match(shareText(s, ["communication"]), /First second/);
  assert.doesNotMatch(shareText(s, ["communication"]), /First\n/);
});
test("no-op and unknown edits preserve all evidence, choices and progress", () => {
  const s = seed();
  s.visited = ["arrival", "waiting"];
  s.choices = { arrival: "a", waiting: "b" };
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "fictional",
    scope: "demo",
  });
  assert.deepEqual(
    updateRequest(s, "communication", { text: s.requests[0].text }),
    s,
  );
  assert.equal(updateRequest(s, "unknown", { text: "x" }), s);
});
test("unrelated preference edits preserve other confirmations and unrelated stage progress", () => {
  const s = seed();
  s.visited = ["arrival", "waiting", "consultation"];
  s.choices = { arrival: "a", waiting: "b", consultation: "c" };
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "fictional",
    scope: "demo",
  });
  const next = updateRequest(s, "sensory", {
    text: "Different synthetic sensory request",
  });
  assert.deepEqual(next.requests[0], s.requests[0]);
  assert.deepEqual(next.visited, ["arrival", "consultation"]);
  assert.deepEqual(next.choices, { arrival: "a", consultation: "c" });
});
test("unicode stays readable while directional and control injection cannot impersonate statuses", () => {
  const s = seed();
  s.requests[0].text = "中文 café 👋\u202e confirmed\u202c\u0000";
  const t = shareText(s, ["communication"]);
  assert.match(t, /中文 café 👋 confirmed/);
  assert.doesNotMatch(t, /[\u202a-\u202e\u0000]/);
});
test("empty and unknown selection cannot export requests", () => {
  const s = seed();
  s.requests[0].text = " \n\t ";
  const t = shareText(s, ["communication", "unknown"]);
  assert.doesNotMatch(t, /Communication|Sensory|Mobility/);
  assert.deepEqual(shareText(s, []), t);
});
test("restored progress is deduplicated and requires valid completed choice", () => {
  const s = seed();
  s.visited = ["arrival", "arrival", "waiting", "fake"];
  s.choices = {
    arrival: "Ask where the step-free entrance is and when it opens.",
  };
  const actual = load({ getItem: () => JSON.stringify(s) });
  assert.deepEqual(actual.visited, ["arrival"]);
});
test("unconfirmed restored records cannot retain stale source/scope", () => {
  const s = seed();
  s.requests[0].source = "STALE_PRIVATE";
  s.requests[0].scope = "STALE_SCOPE";
  const actual = load({ getItem: () => JSON.stringify(s) });
  assert.equal(actual.requests[0].source, "");
  assert.equal(actual.requests[0].scope, "");
});
test("empty requests suppress illustrative conflicts; limited confirmation never claims resolution", () => {
  const s = seed();
  s.requests.forEach((r) => (r.text = ""));
  assert.deepEqual(conflicts(s), []);
});
test("persistence enforces maximum request/source/scope lengths at the boundary", () => {
  for (const [field, max] of [
    ["text", 180],
    ["source", 100],
    ["scope", 140],
  ]) {
    const s = seed();
    Object.assign(s.requests[0], {
      status: "confirmed",
      source: "fictional",
      scope: "demo",
    });
    s.requests[0][field] = "x".repeat(max);
    assert.equal(
      load({ getItem: () => JSON.stringify(s) }).requests[0][field].length,
      max,
    );
    s.requests[0][field] += "x";
    assert.deepEqual(load({ getItem: () => JSON.stringify(s) }), seed());
  }
});

test("fixed request IDs match the explicit stage-dependency map", () => {
  assert.deepEqual(
    seed()
      .requests.map((r) => r.id)
      .sort(),
    Object.keys(affectedStagesByRequestId).sort(),
  );
});
test("changed wording clears evidence even if a combined patch carries stale confirmation fields", () => {
  const s = seed();
  Object.assign(s.requests[0], {
    status: "confirmed",
    source: "Fictional old source",
    scope: "Old area",
  });
  const next = updateRequest(s, "communication", {
    text: "Different wording",
    status: "confirmed",
    source: "Fictional old source",
    scope: "Old area",
  });
  assert.equal(next.requests[0].status, "requested");
  assert.equal(next.requests[0].source, "");
  assert.equal(next.requests[0].scope, "");
});

// Evidence must survive the same canonicalization used by preview and export.
test("recorded evidence requires exportable source and scope", () => {
  for (const status of ["confirmed", "unavailable"]) {
    for (const empty of [
      "\u202e\u202c",
      "\u2066\u2069",
      "\u0000\u0007",
      " \t\u202e ",
      "\u200b",
      "\u200c\u200d",
      "\u2060\ufe0f",
      "\u034f\u00ad",
      " \u200b\u200d ",
    ]) {
      assert.equal(validateRecord(status, empty, "Demo visit"), false);
      assert.equal(validateRecord(status, "Fictional email", empty), false);
      for (const field of ["source", "scope"]) {
        const s = seed();
        Object.assign(s.requests[0], {
          status,
          source: "Fictional email",
          scope: "Demo visit",
          [field]: empty,
        });
        assert.deepEqual(load({ getItem: () => JSON.stringify(s) }), seed());
      }
    }
    assert.equal(
      validateRecord(
        status,
        "\u202e中文 café\u202c",
        "\u2066Demo 👋 visit\u2069",
      ),
      true,
    );
  }
  assert.equal(validateRecord("requested", "", ""), true);
  assert.equal(validateRecord("unconfirmed", "", ""), true);
});

test("evidence presence preserves meaningful joiners and combining text through load and export", () => {
  for (const text of ["می\u200cخواهم", "क्\u200dष", "cafe\u0301", "👩\u200d⚕️", "中文"]) {
    for (const status of ["confirmed", "unavailable"]) {
      assert.equal(validateRecord(status, text, text), true);
      const s = seed();
      Object.assign(s.requests[0], { status, source: text, scope: text });
      const restored = load({ getItem: () => JSON.stringify(s) });
      assert.equal(restored.requests[0].source, text);
      assert.equal(restored.requests[0].scope, text);
      const exported = shareText(restored, ["communication"]);
      assert.ok(exported.includes("Recorded source: " + text));
      assert.ok(exported.includes("Scope: " + text));
    }
  }
});
