import {
  demoWorkflows,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
  taskSuggestions,
  textareaClass,
} from "../lib/constants";
import { isSubmitShortcut } from "../lib/utils";
import { EmptyState, Panel, RunDetail, StructuredText } from "./shared";

function StreamTimeline({ streamState }) {
  const events = streamState.events || [];

  if (!streamState.active && events.length === 0) {
    return (
      <EmptyState
        title="No live workflow yet"
        description="Run a task to watch memory retrieval, supervisor routing, tool execution, and review happen in real time."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-cyan-300">
          {streamState.active ? "Streaming" : "Completed"}
        </span>
      </div>

      {streamState.snapshot ? (
        <div className="grid gap-3 md:grid-cols-4">
          <Panel title="Status">
            <StructuredText content={streamState.snapshot.status || "RUNNING"} />
          </Panel>
          <Panel title="Agent">
            <StructuredText
              content={streamState.snapshot.selected_agent || "Selecting..."}
            />
          </Panel>
          <Panel title="Tool">
            <StructuredText content={streamState.snapshot.tool_name || "none"} />
          </Panel>
          <Panel title="Score">
            <StructuredText content={`${streamState.snapshot.score || 0}/10`} />
          </Panel>
        </div>
      ) : null}

      <Panel title="Workflow Timeline">
        <ol className="space-y-3">
          {events.map((entry, index) => (
            <li
              key={entry.id}
              className="rounded-xl border border-slate-800/70 bg-slate-950/80 p-3"
            >
              <div className="flex gap-3">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-cyan-500/12 text-xs font-semibold text-cyan-300">
                  {index + 1}
                </span>
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                    {entry.event.replaceAll("_", " ")}
                  </p>
                  <p className="text-sm text-slate-300">
                    {entry.data?.node || entry.data?.status || "Workflow event"}
                  </p>
                  {entry.data?.trace ? (
                    <p className="text-sm leading-6 text-slate-400">
                      {entry.data.trace}
                    </p>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </Panel>
    </div>
  );
}

export function RunAgentTab({
  task,
  setTask,
  loading,
  runAgent,
  runResult,
  reuseTask,
  copyToClipboard,
  exportRun,
  streamState,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section
        className={`${surfaceClass} p-6 transition duration-200 hover:border-cyan-500/30`}
      >
        <h2 className="text-xl font-semibold">Run Agent Workflow</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Use this when you want the full AgentFlow system. It retrieves memory,
          plans the task, can use tools, reviews the result, and saves the run
          with trace history.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/8 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-cyan-300">
              Best For
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Important tasks that benefit from planning, memory, tools, review,
              and saved history.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              What Happens
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Memory retrieval, supervisor routing, tool loop, specialist work,
              reviewer scoring, and final answer streaming.
            </p>
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick Prompts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {taskSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setTask(suggestion)}
                className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/70 hover:text-cyan-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Demo Uses
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-3">
            {demoWorkflows.map((item) => (
              <button
                key={item.title}
                type="button"
                onClick={() => setTask(item.prompt)}
                className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-3 text-left transition hover:border-cyan-400/50 hover:bg-slate-900/70"
              >
                <p className="text-sm font-semibold text-slate-200">{item.title}</p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={task}
          onChange={(event) => setTask(event.target.value)}
          onKeyDown={(event) => {
            if (isSubmitShortcut(event) && !loading && task.trim()) {
              event.preventDefault();
              runAgent();
            }
          }}
          rows={7}
          className={`${textareaClass} mt-5 min-h-[13rem]`}
          placeholder="Enter your task..."
        />

        <p className="mt-2 text-xs text-slate-500">
          Shortcut: `Ctrl/Cmd + Enter` to run the workflow.
        </p>

        <button
          onClick={runAgent}
          disabled={loading || !task.trim()}
          className={`${primaryButtonClass} mt-5`}
        >
          {loading ? "Running AgentFlow..." : "Run Agent"}
        </button>

        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setTask("")}
            className={secondaryButtonClass}
          >
            Clear Task
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(task, "Task")}
            className={secondaryButtonClass}
          >
            Copy Task
          </button>
        </div>
      </section>

      <section
        className={`${surfaceClass} p-6 transition duration-200 hover:border-cyan-500/30`}
      >
        <h2 className="text-xl font-semibold">Latest Result</h2>

        {runResult ? (
          <RunDetail
            run={runResult}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
            exportRun={exportRun}
          />
        ) : (
          <div className="mt-4">
            <StreamTimeline streamState={streamState} />
          </div>
        )}
      </section>
    </div>
  );
}
