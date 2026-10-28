export const KEY = "accessroute.demo.v1";
export const stages = [
  {
    id: "arrival",
    name: "Arrival",
    title: "Find your way in.",
    description: "Picture reaching the entrance and checking in.",
    question:
      "The main entrance has steps. A side entrance is mentioned, but its opening times are unknown.",
    options: [
      "Ask where the step-free entrance is and when it opens.",
      "Plan to pause and ask reception for directions.",
    ],
    prompt:
      "Could you confirm a step-free route from the entrance to reception, including opening times?",
  },
  {
    id: "waiting",
    name: "Waiting",
    title: "Make room for a calmer wait.",
    description: "Practice what you might ask before your name is called.",
    question:
      "A quieter waiting area is away from reception. Names are called aloud in the main room.",
    options: [
      "Ask for a visual or written call in the quieter space.",
      "Ask whether a companion can listen for the call.",
    ],
    prompt:
      "If I wait somewhere quieter, how will you let me know it is my turn?",
  },
  {
    id: "consultation",
    name: "Consultation",
    title: "Set the pace of the conversation.",
    description: "Rehearse how you want information to be communicated.",
    question:
      "Written instructions are helpful, but a conversation may move faster than you can take notes.",
    options: [
      "Ask for a pause and a written recap.",
      "Ask to review one point at a time.",
    ],
    prompt:
      "Please pause between points and provide the key next steps in writing.",
  },
];
export const categories = ["Communication", "Sensory", "Mobility"];
export function seed() {
  return {
    version: 1,
    active: "arrival",
    visited: [],
    choices: {},
    requests: [
      {
        id: "communication",
        category: "Communication",
        text: "Please give me key information in writing.",
        status: "requested",
        source: "",
        scope: "",
      },
      {
        id: "sensory",
        category: "Sensory",
        text: "I would like a quieter place to wait.",
        status: "unconfirmed",
        source: "",
        scope: "",
      },
      {
        id: "mobility",
        category: "Mobility",
        text: "I need a step-free route to the consultation room.",
        status: "unconfirmed",
        source: "",
        scope: "",
      },
    ],
  };
}
export const labels = {
  requested: "My request",
  unconfirmed: "Not yet confirmed",
  confirmed: "Self-recorded confirmation - unverified",
  unavailable: "Self-recorded unavailable - unverified",
};
export const affectedStagesByRequestId = {
  communication: ["waiting", "consultation"],
  sensory: ["waiting"],
  mobility: ["arrival"],
};
export function updateRequest(state, id, patch) {
  const current = state.requests.find((r) => r.id === id);
  if (!current) return state;
  const changed = patch.text !== undefined && patch.text !== current.text;
  const affected = changed ? affectedStagesByRequestId[id] || [] : [];
  return {
    ...state,
    visited: state.visited.filter((stage) => !affected.includes(stage)),
    choices: Object.fromEntries(
      Object.entries(state.choices).filter(
        ([stage]) => !affected.includes(stage),
      ),
    ),
    requests: state.requests.map((r) =>
      r.id !== id
        ? r
        : changed
          ? { ...r, ...patch, status: "requested", source: "", scope: "" }
          : { ...r, ...patch },
    ),
  };
}
export function validateRecord(status, source, scope) {
  return (
    !["confirmed", "unavailable"].includes(status) ||
    // Presence only: do not strip meaningful joiners/marks from stored or exported text.
    [source, scope].every((text) =>
      /[^\p{White_Space}\p{Default_Ignorable_Code_Point}]/u.test(noteText(text)),
    )
  );
}
export function conflicts(state) {
  const r = state.requests;
  const result = [];
  if (
    r.some((x) => x.category === "Sensory" && x.text.trim()) &&
    r.some((x) => x.category === "Communication" && x.text.trim())
  )
    result.push({
      stage: "waiting",
      title: "Quiet space + being called",
      text: "Moving away from reception could make an audible call harder to notice. Agree on how you will be contacted.",
    });
  if (r.some((x) => x.category === "Mobility" && x.text.trim()))
    result.push({
      stage: "arrival",
      title: "Check the whole route",
      text: "An entrance being step-free does not establish that the whole route is accessible. Ask about the complete journey.",
    });
  return result;
}
// Preserve multilingual text; remove explicit directional/control characters that
// could visually impersonate fixed status labels. Preview and file use the same text.
export const noteText = (text) =>
  text
    .replace(
      /[\u0000-\u0008\u000e-\u001f\u007f\u202a-\u202e\u2066-\u2069]/g,
      "",
    )
    .replace(/\s+/g, " ")
    .trim();
export function shareText(state, ids) {
  const selected = state.requests.filter(
    (r) => ids.includes(r.id) && noteText(r.text),
  );
  return [
    "AccessRoute | Visit preferences",
    "Synthetic rehearsal example. Nonclinical; no clinic availability is verified.",
    "Selected by the person preparing this note. Requests are not guarantees.",
    "",
    ...selected.flatMap((r) => [
      r.category,
      noteText(r.text),
      labels[r.status],
      ...(["confirmed", "unavailable"].includes(r.status)
        ? [
            "Recorded source: " + noteText(r.source),
            "Scope: " + noteText(r.scope),
          ]
        : []),
      "",
    ]),
    "Please discuss what is possible for this visit.",
  ].join("\n");
}
export function load(storage) {
  try {
    const s = JSON.parse(storage.getItem(KEY));
    if (
      s?.version !== 1 ||
      !Array.isArray(s.requests) ||
      s.requests.length !== 3
    )
      return seed();
    const base = seed();
    for (const r of base.requests) {
      const x = s.requests.find((v) => v.id === r.id);
      if (
        !x ||
        typeof x.text !== "string" ||
        x.text.length > 180 ||
        !Object.hasOwn(labels, x.status) ||
        typeof x.source !== "string" ||
        typeof x.scope !== "string" ||
        x.source.length > 100 ||
        x.scope.length > 140 ||
        !validateRecord(x.status, x.source, x.scope)
      )
        return seed();
      Object.assign(r, {
        text: x.text,
        status: x.status,
        source: ["confirmed", "unavailable"].includes(x.status) ? x.source : "",
        scope: ["confirmed", "unavailable"].includes(x.status) ? x.scope : "",
      });
    }
    base.active = stages.some((x) => x.id === s.active) ? s.active : "arrival";
    for (const st of stages)
      if (st.options.includes(s.choices?.[st.id]))
        base.choices[st.id] = s.choices[st.id];
    base.visited = Array.isArray(s.visited)
      ? [
          ...new Set(
            s.visited.filter(
              (id) => stages.some((st) => st.id === id) && base.choices[id],
            ),
          ),
        ]
      : [];
    return base;
  } catch {
    return seed();
  }
}
