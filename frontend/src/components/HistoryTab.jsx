import {
  inputClass,
  mutedSurfaceClass,
  surfaceClass,
} from "../lib/constants";
import { Badge, EmptyState, RunDetail, SkeletonCard } from "./shared";

export function HistoryTab({
  runs,
  selectedRun,
  fetchRunDetail,
  secondaryLoading,
  historyLoading,
  runDetailLoading,
  historyQuery,
  setHistoryQuery,
  historyStatus,
  setHistoryStatus,
  hasMoreRuns,
  loadMoreRuns,
  reuseTask,
  copyToClipboard,
  exportRun,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Run History</h2>
        <p className="mt-2 text-sm text-slate-400">
          {/* These runs are loaded from SQLite using your FastAPI backend. */}
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_180px]">
          <input
            value={historyQuery}
            onChange={(event) => setHistoryQuery(event.target.value)}
            className={inputClass}
            placeholder="Search by task, agent, tool, or status..."
          />
          <select
            value={historyStatus}
            onChange={(event) => setHistoryStatus(event.target.value)}
            className={inputClass}
          >
            <option value="all">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="NEEDS_HUMAN_REVIEW">Needs Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {historyLoading && runs.length === 0 ? (
            <>
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </>
          ) : null}

          {!historyLoading && runs.length === 0 ? (
            <p className="text-sm text-slate-500">
              No runs match the current filters.
            </p>
          ) : null}

          {runs.map((run) => (
            <div
              key={run.id}
              className={`${mutedSurfaceClass} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-500/30 ${
                selectedRun &&
                (selectedRun.run_id === run.id || selectedRun.id === run.id)
                  ? "border-cyan-400/70 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge>{run.selected_agent}</Badge>
                <span className="text-xs text-slate-400">{run.score}/10</span>
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-300">{run.task}</p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{run.status}</span>
                <span>Tool: {run.tool_name}</span>
              </div>

              <button
                onClick={() => fetchRunDetail(run.id)}
                aria-label={`View details for ${run.task}`}
                className="mt-3 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                View Details
              </button>
            </div>
          ))}

          {hasMoreRuns ? (
            <button
              type="button"
              onClick={loadMoreRuns}
              disabled={historyLoading}
              className="w-full rounded-xl border border-slate-700/80 px-3 py-2 text-sm font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300 disabled:opacity-60"
            >
              {historyLoading ? "Loading..." : "Load More Runs"}
            </button>
          ) : null}
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Run Detail</h2>

        {runDetailLoading || secondaryLoading ? (
          <div className="mt-4 space-y-3">
            <SkeletonCard />
            <SkeletonCard />
          </div>
        ) : null}

        {!selectedRun && !secondaryLoading && !runDetailLoading ? (
          <EmptyState
            title="Pick a run to inspect"
            description="Open any saved workflow to see the answer, tool activity, memory usage, and full trace timeline."
          />
        ) : null}

        {selectedRun ? (
          <RunDetail
            run={selectedRun}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
            exportRun={exportRun}
          />
        ) : null}
      </section>
    </div>
  );
}
