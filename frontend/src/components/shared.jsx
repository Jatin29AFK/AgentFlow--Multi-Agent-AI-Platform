import {
  mutedSurfaceClass,
  secondaryButtonClass,
} from "../lib/constants";
import { formatDateTime } from "../lib/utils";

function cleanMarkdownMarkers(text) {
  return text
    .replace(/^#{1,6}\s*/g, "")
    .replace(/\*\*/g, "")
    .trim();
}

function renderInlineMarkdown(text) {
  const parts = String(text || "").split(/(\*\*[^*]+\*\*)/g).filter(Boolean);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-extrabold text-slate-50">
          {part.slice(2, -2)}
        </strong>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

export function InfoCard({ label, value }) {
  return (
    <div className={`${mutedSurfaceClass} p-4`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-cyan-200">{value || "N/A"}</p>
    </div>
  );
}

export function StatusBadge({ status }) {
  const normalized = status || "UNKNOWN";

  const styles = {
    COMPLETED: "bg-emerald-950 text-emerald-300 border-emerald-800",
    NEEDS_HUMAN_REVIEW: "bg-amber-950 text-amber-300 border-amber-800",
    REJECTED: "bg-red-950 text-red-300 border-red-800",
    RUNNING: "bg-blue-950 text-blue-300 border-blue-800",
    UNKNOWN: "bg-slate-900 text-slate-300 border-slate-700",
  };

  return (
    <span
      className={`rounded-full border px-3 py-1 text-xs ${
        styles[normalized] || styles.UNKNOWN
      }`}
    >
      {normalized}
    </span>
  );
}

export function Badge({ children }) {
  return (
    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
      {children || "agent"}
    </span>
  );
}

export function Panel({ title, children }) {
  return (
    <div className={`${mutedSurfaceClass} p-4`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

export function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <StructuredText content={value || "N/A"} />
    </div>
  );
}

export function EmptyState({ title, description }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/55 px-4 py-5">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-800/70 bg-slate-950/75 p-4">
      <div className="h-3 w-24 rounded bg-slate-800" />
      <div className="mt-4 h-3 w-full rounded bg-slate-800" />
      <div className="mt-2 h-3 w-2/3 rounded bg-slate-800" />
      <div className="mt-4 h-8 w-28 rounded-xl bg-slate-800" />
    </div>
  );
}

export function StructuredText({ content, tone = "default" }) {
  const text = typeof content === "string" ? content.trim() : "";
  const sections = text
    ? text
        .split(/\n\s*\n/)
        .map((section) => section.trim())
        .filter(Boolean)
    : [];

  const textColor = tone === "primary" ? "text-slate-100" : "text-slate-300";

  if (sections.length === 0) {
    return <p className={`text-sm leading-6 ${textColor}`}>N/A</p>;
  }

  return (
    <div className="space-y-3">
      {sections.map((section, sectionIndex) => {
        const lines = section
          .split("\n")
          .map((line) => line.trim())
          .filter(Boolean);

        const cleanedLines = lines.map((line) => cleanMarkdownMarkers(line));

        const isBulletList =
          cleanedLines.length > 0 &&
          cleanedLines.every((line) => /^([-*]|\d+\.)\s+/.test(line));

        if (isBulletList) {
          return (
            <ul
              key={sectionIndex}
              className={`space-y-2 text-sm leading-6 ${textColor}`}
            >
              {cleanedLines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span>{renderInlineMarkdown(line.replace(/^([-*]|\d+\.)\s+/, ""))}</span>
                </li>
              ))}
            </ul>
          );
        }

        const headerMatch = cleanedLines[0].match(
          /^([A-Za-z][A-Za-z0-9\s/&()-]{1,40}):\s*(.*)$/
        );

        if (headerMatch) {
          const [, heading, rest] = headerMatch;
          const body = [rest, ...cleanedLines.slice(1)].filter(Boolean).join(" ");
          return (
            <div
              key={sectionIndex}
              className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-4 py-3"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                {heading}
              </p>
              {body ? (
                <p className={`mt-2 text-sm leading-7 ${textColor}`}>
                  {renderInlineMarkdown(body)}
                </p>
              ) : null}
            </div>
          );
        }

        if (cleanedLines.length === 1 && lines[0].startsWith("**") && lines[0].endsWith("**")) {
          return (
            <h4
              key={sectionIndex}
              className="text-lg font-extrabold tracking-tight text-slate-50"
            >
              {cleanedLines[0]}
            </h4>
          );
        }

        return (
          <p key={sectionIndex} className={`text-sm leading-7 ${textColor}`}>
            {renderInlineMarkdown(lines.join(" "))}
          </p>
        );
      })}
    </div>
  );
}

export function RunSummary({ run }) {
  return (
    <div className={`${mutedSurfaceClass} p-4`}>
      <p className="text-xs uppercase tracking-wide text-slate-500">Task</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{run.task}</p>

      <div className="mt-4 grid gap-3 xl:grid-cols-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Route Reason
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {run.route_reason || "Not available"}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Created At
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {formatDateTime(run.created_at)}
          </p>
        </div>

        <div>
          <p className="text-xs uppercase tracking-wide text-slate-500">
            Human Review
          </p>
          <p className="mt-1 text-sm text-slate-300">
            {run.needs_human_review ? "Required" : "Not required"}
          </p>
          <div>
            <p className="text-xs uppercase tracking-wide text-slate-500">
              Status
            </p>
            <div className="mt-2">
              <StatusBadge status={run.status} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function RunDetail({ run, reuseTask, copyToClipboard, exportRun }) {
  const hasVisibleToolActivity = run.tool_used && run.tool_name && run.tool_name !== "none";

  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 xl:grid-cols-4">
        <InfoCard label="Selected Agent" value={run.selected_agent} />
        <InfoCard label="Tool" value={hasVisibleToolActivity ? run.tool_name : "none"} />
        <InfoCard label="Score" value={`${run.score}/10`} />
        <InfoCard label="Status" value={run.status} />
      </div>

      <RunSummary run={run} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reuseTask(run.task)}
          aria-label="Reuse this run task"
          className={secondaryButtonClass}
        >
          Reuse Task
        </button>
        <button
          type="button"
          onClick={() => copyToClipboard(run.final_answer, "Final answer")}
          aria-label="Copy final answer"
          className={secondaryButtonClass}
        >
          Copy Final Answer
        </button>
        <button
          type="button"
          onClick={() =>
            copyToClipboard(JSON.stringify(run.trace || [], null, 2), "Trace")
          }
          aria-label="Copy trace timeline"
          className={secondaryButtonClass}
        >
          Copy Trace
        </button>
        {exportRun ? (
          <button
            type="button"
            onClick={() => exportRun(run.run_id || run.id, "json")}
            aria-label="Download run as JSON"
            className={secondaryButtonClass}
          >
            Download JSON
          </button>
        ) : null}
      </div>

      <div className="overflow-hidden rounded-[1.75rem] border border-cyan-500/20 bg-[linear-gradient(145deg,rgba(16,185,129,0.10),rgba(34,211,238,0.10),rgba(15,23,42,0.92))] p-[1px] shadow-[0_25px_80px_rgba(8,145,178,0.18)]">
        <div className="rounded-[1.7rem] bg-slate-950/95 px-6 py-6">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.28em] text-cyan-300">
                Final Answer
              </p>
              <p className="mt-1 text-sm text-slate-400">
                Cleaned and structured for easier reading
              </p>
            </div>
            <div className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold text-cyan-200">
              {run.selected_agent} agent
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/6 bg-slate-900/70 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <StructuredText content={run.final_answer} tone="primary" />
          </div>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <Panel title="Execution Plan">
          <StructuredText
            content={run.plan || "No execution plan was captured for this run."}
          />
        </Panel>

        <Panel title="Tool Activity">
          <div className="space-y-4">
            <DetailRow
              label="Tool"
              value={hasVisibleToolActivity ? run.tool_name : "No tool used"}
            />
            <DetailRow
              label="Tool Input"
              value={
                hasVisibleToolActivity
                  ? run.tool_input || "No tool input recorded."
                  : "No tool input recorded."
              }
            />
            <DetailRow
              label="Tool Output"
              value={
                hasVisibleToolActivity
                  ? run.tool_result || "No tool output recorded."
                  : "No tool output recorded."
              }
            />
          </div>
        </Panel>
      </div>

      <Panel title="Memory Used">
        <div className="space-y-4">
          <StructuredText
            content={run.memory_context || "No memory context available."}
          />
          {Array.isArray(run.retrieved_memories) &&
          run.retrieved_memories.length > 0 ? (
            <div>
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Retrieved Memories
              </p>
              <ul className="space-y-2">
                {run.retrieved_memories.map((memory, index) => (
                  <li
                    key={`${memory}-${index}`}
                    className="rounded-xl border border-slate-800/70 bg-slate-950/75 px-3 py-2 text-sm leading-6 text-slate-300"
                  >
                    {memory}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel title="Trace Timeline">
        <ol className="space-y-2 text-sm">
          {(run.trace || []).map((item, index) => (
            <li
              key={`${item}-${index}`}
              className="rounded-xl border border-slate-800/70 bg-slate-950/80 p-3 text-slate-300"
            >
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/12 text-xs font-semibold text-cyan-300">
                  {index + 1}
                </span>
                <span className="leading-6">{item}</span>
              </div>
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Reviewer Feedback">
        <StructuredText content={run.review || "No reviewer feedback available."} />
      </Panel>
    </div>
  );
}

export function MemoryCard({ memory, deleteMemory, showSearchInfo = false }) {
  return (
    <div
      className={`${mutedSurfaceClass} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-500/25`}
    >
      <p className="text-sm leading-6 text-slate-300">{memory.content}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {(memory.tags || []).map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300"
          >
            {tag}
          </span>
        ))}
      </div>

      {showSearchInfo ? (
        <p className="mt-3 text-xs text-slate-500">
          Matched: {(memory.matched_terms || []).join(", ") || "N/A"} • Score:{" "}
          {memory.search_score}
        </p>
      ) : null}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Importance: {memory.importance}/5</span>
        <button
          onClick={() => deleteMemory(memory.id)}
          className="font-medium text-red-300 transition hover:text-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
