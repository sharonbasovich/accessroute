import React, { useEffect, useRef, useState } from "react";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  Route,
  ShieldCheck,
  SlidersHorizontal,
  FileText,
  MapPin,
  MessageCircle,
  Volume2,
  Accessibility,
  RotateCcw,
  Download,
  Printer,
  X,
  AlertCircle,
  ChevronRight,
} from "lucide-react";
import {
  KEY,
  seed,
  stages,
  labels,
  load,
  conflicts,
  updateRequest,
  validateRecord,
  shareText,
  noteText,
} from "./model";
function readState() {
  try {
    return load(window.localStorage);
  } catch {
    return seed();
  }
}
const icons = {
  Communication: MessageCircle,
  Sensory: Volume2,
  Mobility: Accessibility,
};
export function Status({ value }) {
  return (
    <span className={"status " + value}>
      <span className="status-dot" />
      {labels[value]}
    </span>
  );
}
function Preferences({ state, setState, onDone }) {
  return (
    <section className="preferences">
      <div className="section-head">
        <div>
          <span className="eyebrow">Your starting point</span>
          <h2>What would help you?</h2>
        </div>
        <p>
          Use this fictional example. Keep personal or medical information out
          of this demo.
        </p>
      </div>
      <div className="preference-grid">
        {state.requests.map((r) => {
          const Icon = icons[r.category];
          return (
            <article className="preference" key={r.id}>
              <Icon size={24} />
              <h3>{r.category}</h3>
              <label htmlFor={r.id}>My request</label>
              <textarea
                id={r.id}
                maxLength={180}
                value={r.text}
                onChange={(e) =>
                  setState((s) =>
                    updateRequest(s, r.id, { text: e.target.value }),
                  )
                }
              />
              <small>
                {r.text.length}/180 · Changes clear this record and reset
                related rehearsal stops.
              </small>
              <Status value={r.status} />
            </article>
          );
        })}
      </div>
      <div className="actions">
        <button className="primary" onClick={onDone}>
          Rehearse this visit <ArrowRight size={18} />
        </button>
        <p>Every request stays yours to edit.</p>
      </div>
    </section>
  );
}
function Ledger({ state, setState }) {
  const [editing, setEditing] = useState(null);
  const [status, setStatus] = useState("unconfirmed");
  const [source, setSource] = useState("");
  const [scope, setScope] = useState("");
  const [error, setError] = useState("");
  function start(r) {
    setEditing(r.id);
    setStatus(r.status);
    setSource(r.source);
    setScope(r.scope);
    setError("");
  }
  function save(e) {
    e.preventDefault();
    if (!validateRecord(status, source, scope)) {
      setError("Add both a source and the visit or area this record covers.");
      return;
    }
    setState((s) =>
      updateRequest(s, editing, {
        status,
        source: ["confirmed", "unavailable"].includes(status)
          ? source.trim()
          : "",
        scope: ["confirmed", "unavailable"].includes(status)
          ? scope.trim()
          : "",
      }),
    );
    setEditing(null);
  }
  return (
    <section className="ledger">
      <div className="section-head">
        <div>
          <span className="eyebrow">Keep the distinction</span>
          <h2>Ask. Check. Record.</h2>
        </div>
        <p>
          This ledger records what you enter. AccessRoute does not contact or
          verify any clinic.
        </p>
      </div>
      {state.requests.map((r) => (
        <article className="ledger-row" key={r.id}>
          <div>
            <span className="category">{r.category}</span>
            <h3>{r.text || "No request entered"}</h3>
            <Status value={r.status} />
            {r.source ? (
              <p className="record">
                Source: {r.source}
                <br />
                Scope: {r.scope}
              </p>
            ) : null}
          </div>
          <button
            className="secondary"
            disabled={!noteText(r.text)}
            onClick={() => start(r)}
          >
            Update record <ChevronRight size={16} />
          </button>
          {editing === r.id ? (
            <form onSubmit={save} className="record-form">
              <label>
                Status
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  {Object.entries(labels).map(([v, l]) => (
                    <option value={v} key={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              {["confirmed", "unavailable"].includes(status) ? (
                <>
                  <p>
                    For this demo, use a fictional source. A record applies only
                    to the scope you enter.
                  </p>
                  <label>
                    Source of the record
                    <input
                      maxLength={100}
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      placeholder="Example: simulated reception email, 27 Oct"
                    />
                  </label>
                  <label>
                    Visit or area covered
                    <input
                      maxLength={140}
                      value={scope}
                      onChange={(e) => setScope(e.target.value)}
                      placeholder="Example: side entrance only, demo visit"
                    />
                  </label>
                </>
              ) : null}
              {error ? (
                <p role="alert" className="error">
                  {error}
                </p>
              ) : null}
              <div className="actions">
                <button className="primary" type="submit">
                  Save record
                </button>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => setEditing(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          ) : null}
        </article>
      ))}
    </section>
  );
}
function Rehearsal({ state, setState, onLedger }) {
  const st = stages.find((x) => x.id === state.active);
  const stageHeading = useRef(null);
  const previousStage = useRef(st.id);
  useEffect(() => {
    if (previousStage.current !== st.id) stageHeading.current?.focus();
    previousStage.current = st.id;
  }, [st.id]);
  const i = stages.indexOf(st);
  const choice = state.choices[st.id];
  function complete() {
    setState((s) => ({
      ...s,
      visited: [...new Set([...s.visited, st.id])],
      active: stages[Math.min(i + 1, 2)].id,
    }));
    if (i === 2) onLedger();
  }
  return (
    <>
      <div className="rehearsal-grid">
        <section className="rehearsal">
          <div className="scene">
            <div className="scene-top">
              <span>
                <MapPin size={15} /> Fictional visit
              </span>
              <span>Stop {i + 1} of 3</span>
            </div>
            <RouteIllustration stage={i} />
            <div className="scene-caption">
              <span>{st.name}</span>
              <strong>{st.description}</strong>
            </div>
          </div>
          <div className="scenario">
            <span className="eyebrow">Example situation</span>
            <h2 ref={stageHeading} tabIndex={-1}>
              {st.title}
            </h2>
            <p>{st.question}</p>
            <fieldset>
              <legend>What would you like to practice?</legend>
              {st.options.map((opt) => (
                <label
                  className={"choice " + (choice === opt ? "selected" : "")}
                  key={opt}
                >
                  <input
                    type="radio"
                    name="response"
                    value={opt}
                    checked={choice === opt}
                    onChange={() =>
                      setState((s) => ({
                        ...s,
                        choices: { ...s.choices, [st.id]: opt },
                      }))
                    }
                  />
                  <span>{opt}</span>
                  {choice === opt ? <Check size={18} /> : null}
                </label>
              ))}
            </fieldset>
            {choice ? (
              <div className="practice">
                <MessageCircle size={19} />
                <div>
                  <strong>A phrase to try</strong>
                  <p>
                    “
                    {st.options.indexOf(choice) === 0
                      ? st.prompt
                      : st.id === "arrival"
                        ? "Could someone help me find the entrance and reception?"
                        : st.id === "waiting"
                          ? "Could my companion listen for my name while I wait somewhere quieter?"
                          : "Could we review one point at a time?"}
                    ”
                  </p>
                  <small>
                    Practice choice saved privately; excluded from your share
                    note.
                  </small>
                </div>
              </div>
            ) : null}
            <div className="scenario-actions">
              <button
                className="text-button"
                disabled={i === 0}
                onClick={() =>
                  setState((s) => ({ ...s, active: stages[i - 1].id }))
                }
              >
                <ArrowLeft size={17} /> Previous
              </button>
              <button className="primary" disabled={!choice} onClick={complete}>
                {i === 2 ? "Finish rehearsal" : "Save & continue"}
                <ArrowRight size={17} />
              </button>
            </div>
          </div>
        </section>
        <aside className="side-notes">
          <div className="note-heading">
            <span className="small-symbol">
              <ShieldCheck size={21} />
            </span>
            <h2>Your visit, your terms.</h2>
            <p>A little preparation can make the next conversation clearer.</p>
          </div>
          <div className="request-summary">
            <h3>Your requests</h3>
            {state.requests.map((r) => (
              <div key={r.id}>
                <span>{r.category}</span>
                <p>{r.text || "No request entered"}</p>
                <Status value={r.status} />
              </div>
            ))}
            <button className="text-button" onClick={onLedger}>
              Open confirmation ledger <ArrowRight size={16} />
            </button>
          </div>
        </aside>
      </div>
      <ConflictNotes state={state} />
    </>
  );
}
function ConflictNotes({ state }) {
  const list = conflicts(state);
  return (
    <section className="conflicts">
      <div>
        <AlertCircle size={22} />
        <h2>Things to work through</h2>
        <p>Illustrative tensions to discuss, not facts about your clinic.</p>
      </div>
      {list.length ? (
        list.map((c) => (
          <article key={c.title}>
            <span>{stages.find((s) => s.id === c.stage).name}</span>
            <h3>{c.title}</h3>
            <p>{c.text}</p>
          </article>
        ))
      ) : (
        <p>
          No illustrative conflict is currently flagged. This is not an
          accessibility assessment.
        </p>
      )}
    </section>
  );
}
function RouteIllustration({ stage }) {
  return (
    <svg
      className="route-art"
      viewBox="0 0 650 190"
      role="img"
      aria-label={
        "Illustrated three-stop visit route; current stop " + stages[stage].name
      }
    >
      <defs>
        <pattern id="dots" width="20" height="20" patternUnits="userSpaceOnUse">
          <circle cx="1" cy="1" r="1" fill="#c8d8e7" />
        </pattern>
      </defs>
      <rect width="650" height="190" fill="url(#dots)" />
      <path
        d="M75 125H190Q220 125 220 95V85Q220 55 250 55H410Q440 55 440 85V95Q440 125 470 125H575"
        fill="none"
        stroke="#b5c9df"
        strokeWidth="8"
      />
      <path
        d={
          stage === 0
            ? "M75 125H110"
            : stage === 1
              ? "M75 125H190Q220 125 220 95V85Q220 55 250 55H325"
              : "M75 125H190Q220 125 220 95V85Q220 55 250 55H410Q440 55 440 85V95Q440 125 470 125H540"
        }
        fill="none"
        stroke="#2d5c99"
        strokeWidth="3"
        strokeDasharray="7 7"
      />
      {[110, 325, 540].map((x, i) => (
        <g key={x} transform={`translate(${x} ${i === 1 ? 55 : 125})`}>
          <circle
            r={stage === i ? 32 : 23}
            fill={stage === i ? "#203e66" : "#f9fcff"}
            stroke={stage === i ? "#203e66" : "#a9bfd5"}
            strokeWidth="2"
          />
          <text
            textAnchor="middle"
            y="6"
            fill={stage === i ? "#fff" : "#365779"}
            fontSize="18"
            fontFamily="sans-serif"
          >
            {i + 1}
          </text>
        </g>
      ))}
      <path
        d="M55 72V35h48v37M65 72V50h13v22M88 45h6M88 56h6"
        fill="none"
        stroke="#7894b4"
        strokeWidth="2"
      />
      <path
        d="M495 55h62v32h-62zM505 87v12M547 87v12M516 65h20"
        fill="none"
        stroke="#7894b4"
        strokeWidth="2"
      />
    </svg>
  );
}
function ResetDialog({ onCancel, onReset }) {
  const ref = useRef(null);
  useEffect(() => {
    ref.current.showModal();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={onCancel}
      onKeyDown={(e) => {
        if (e.key !== "Tab") return;
        const b = ref.current.querySelectorAll("button");
        if (e.shiftKey && document.activeElement === b[0]) {
          e.preventDefault();
          b[b.length - 1].focus();
        } else if (!e.shiftKey && document.activeElement === b[b.length - 1]) {
          e.preventDefault();
          b[0].focus();
        }
      }}
      aria-labelledby="reset-title"
    >
      <h2 id="reset-title">Reset this demo?</h2>
      <p>
        This replaces saved preferences, records and rehearsal progress with the
        synthetic starting example. Downloaded copies will remain.
      </p>
      <div className="actions">
        <button autoFocus className="secondary" onClick={onCancel}>
          Keep my work
        </button>
        <button className="primary" onClick={onReset}>
          Reset demo data
        </button>
      </div>
    </dialog>
  );
}
function Share({ state }) {
  const [ids, setIds] = useState([]);
  const [preview, setPreview] = useState(false);
  const [notice, setNotice] = useState("");
  const text = shareText(state, ids);
  function toggle(id) {
    setPreview(false);
    setIds((a) => (a.includes(id) ? a.filter((x) => x !== id) : [...a, id]));
    setNotice("");
  }
  function download() {
    const url = URL.createObjectURL(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "accessroute-selected-note.txt";
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Selected note downloaded. Only the preview text is included.");
  }
  return (
    <section className="share">
      <div className="section-head">
        <div>
          <span className="eyebrow">Disclosure is a choice</span>
          <h2>A small note. Only what you choose.</h2>
        </div>
        <p>
          Nothing is selected automatically. Check request wording for details
          you want to keep private. Rehearsal responses and progress never
          appear in the note.
        </p>
      </div>
      <div className="share-grid">
        <div>
          <h3>Choose what to include</h3>
          {state.requests.map((r) => (
            <label className="share-choice" key={r.id}>
              <input
                type="checkbox"
                checked={ids.includes(r.id)}
                disabled={!noteText(r.text)}
                onChange={() => toggle(r.id)}
              />
              <span>
                <strong>{r.category}</strong>
                <span>{r.text || "No request entered"}</span>
                <Status value={r.status} />
                {r.source ? (
                  <small>Includes recorded source and scope.</small>
                ) : null}
              </span>
            </label>
          ))}
          <p className="privacy">
            <ShieldCheck size={18} /> No account, recipient, public link, or
            automatic sending.
          </p>
          <button
            className="primary"
            disabled={!ids.length}
            onClick={() => {
              setPreview(true);
              setNotice("");
            }}
          >
            Preview selected note <FileText size={18} />
          </button>
        </div>
        <div
          data-print-ready={preview ? "true" : "false"}
          className={"paper " + (!preview ? "empty-paper" : "")}
          aria-live="polite"
        >
          {preview ? (
            <>
              <div className="paper-top">
                <Route size={22} />
                <span>Selected visit note</span>
              </div>
              <pre id="export-note">{text}</pre>
              <div className="export-actions">
                <button className="secondary" onClick={download}>
                  <Download size={16} /> Download text
                </button>
                <button className="secondary" onClick={() => window.print()}>
                  <Printer size={16} /> Print / save PDF
                </button>
              </div>
            </>
          ) : (
            <>
              <FileText size={40} />
              <h3>Your preview will appear here</h3>
              <p>
                Select the requests you want to share, then review the exact
                note before exporting.
              </p>
            </>
          )}
        </div>
      </div>
      <p role="status">{notice}</p>
    </section>
  );
}
export default function App() {
  const [state, setState] = useState(readState);
  const [view, setView] = useState("rehearsal");
  const [saveError, setSaveError] = useState(false);
  const [reset, setReset] = useState(false);
  const heading = useRef(null);
  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state));
      setSaveError(false);
    } catch {
      setSaveError(true);
    }
  }, [state]);
  function navigate(v) {
    setView(v);
    setTimeout(() => heading.current?.focus(), 0);
  }
  const progress = state.visited.length;
  return (
    <>
      <a className="skip" href="#main">
        Skip to rehearsal
      </a>
      <header>
        <a className="brand" href="#main" onClick={() => navigate("rehearsal")}>
          <span className="brand-mark">
            <Route size={25} />
          </span>
          AccessRoute<span className="beta">Prototype</span>
        </a>
        <div className="local">
          <span /> {saveError ? "Session only" : "Saved on this browser"}
        </div>
        <button className="text-button reset" onClick={() => setReset(true)}>
          <RotateCcw size={16} /> Reset demo
        </button>
      </header>
      <div className="demo-banner">
        Synthetic example · Rehearsal, not medical advice. No clinic details are
        verified.
      </div>
      <main id="main">
        <div className="page-heading">
          <div>
            <h1 ref={heading} tabIndex={-1}>
              {view === "preferences"
                ? "Start with what helps."
                : view === "ledger"
                  ? "Make the unknowns visible."
                  : view === "share"
                    ? "Share on your terms."
                    : "Walk through your next visit."}
            </h1>
            <p>
              {view === "rehearsal"
                ? "Practice the moments. Find the questions. Decide what to share."
                : "Your preferences guide the conversation. You stay in control."}
            </p>
          </div>
          <div className="progress-summary">
            <span className="progress-ring">{progress}/3</span>
            <span>
              Stops rehearsed
              <br />
              <small>
                {progress === 3
                  ? "Ready to review your requests"
                  : "Go at your own pace"}
              </small>
            </span>
          </div>
        </div>
        <nav className="workspace-nav" aria-label="Visit workspace">
          {[
            ["preferences", "Preferences", SlidersHorizontal],
            ["rehearsal", "Rehearse visit", Route],
            ["ledger", "Confirmation ledger", ShieldCheck],
            ["share", "Select & share", FileText],
          ].map(([id, label, Icon]) => (
            <button
              key={id}
              aria-current={view === id ? "page" : undefined}
              className={view === id ? "active" : ""}
              onClick={() => navigate(id)}
            >
              <Icon size={18} />
              {label}
            </button>
          ))}
        </nav>
        {view === "rehearsal" ? (
          <nav className="stage-nav" aria-label="Rehearsal stages">
            {stages.map((s, i) => (
              <button
                key={s.id}
                className={state.active === s.id ? "current" : ""}
                aria-current={state.active === s.id ? "step" : undefined}
                onClick={() => setState((v) => ({ ...v, active: s.id }))}
              >
                <span>
                  {state.visited.includes(s.id) ? <Check size={16} /> : i + 1}
                </span>
                <div>
                  {s.name}
                  <small>
                    {state.visited.includes(s.id)
                      ? "Rehearsed"
                      : state.active === s.id
                        ? "You are here"
                        : "Explore this stop"}
                  </small>
                </div>
                {i < 2 ? <div className="stage-line" /> : null}
              </button>
            ))}
          </nav>
        ) : null}
        {saveError ? (
          <p role="alert" className="error">
            Browser storage is unavailable. Changes last only for this session.
          </p>
        ) : null}
        {view === "preferences" ? (
          <Preferences
            state={state}
            setState={setState}
            onDone={() => navigate("rehearsal")}
          />
        ) : view === "ledger" ? (
          <>
            <Ledger state={state} setState={setState} />
            <ConflictNotes state={state} />
            <div className="actions">
              <button className="primary" onClick={() => navigate("share")}>
                Choose what to share <ArrowRight size={18} />
              </button>
            </div>
          </>
        ) : view === "share" ? (
          <Share state={state} />
        ) : (
          <Rehearsal
            state={state}
            setState={setState}
            onLedger={() => navigate("ledger")}
          />
        )}
        <footer>
          <span>
            <ShieldCheck size={16} /> Local-first, by design.
          </span>
          <p>
            Anyone using this browser profile can read saved demo data. Clearing
            site data erases it. Exported copies remain. Use synthetic details
            only.
          </p>
          <span>AccessRoute / DSH Hacks V2</span>
        </footer>
      </main>
      {reset ? (
        <ResetDialog
          onCancel={() => setReset(false)}
          onReset={() => {
            setState(seed());
            setReset(false);
            navigate("rehearsal");
          }}
        />
      ) : null}
    </>
  );
}
