import {
  inputClass,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
  textareaClass,
} from "../lib/constants";
import { isSubmitShortcut } from "../lib/utils";
import { Badge, EmptyState, Panel, RunSummary } from "./shared";

export function HumanReviewsTab({
  pendingReviews,
  selectedRun,
  fetchReviewDetail,
  humanAction,
  setHumanAction,
  humanFeedback,
  setHumanFeedback,
  submitHumanReview,
  loading,
  reuseTask,
  copyToClipboard,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Pending Human Reviews</h2>
        <p className="mt-2 text-sm text-slate-400">
          These are agent runs where reviewer score was below the configured
          threshold.
        </p>

        <div className="mt-4 space-y-3">
          {pendingReviews.length === 0 ? (
            <EmptyState
              title="No reviews waiting"
              description="When a workflow scores below the confidence threshold, it will appear here for approval, revision, or rejection."
            />
          ) : null}

          {pendingReviews.map((run) => (
            <div
              key={run.id}
              className={`rounded-2xl border border-amber-800/70 bg-slate-950/80 p-4 shadow-[0_16px_40px_rgba(120,53,15,0.18)] transition duration-200 hover:-translate-y-0.5 hover:border-amber-500/70 ${
                selectedRun &&
                (selectedRun.run_id === run.id || selectedRun.id === run.id)
                  ? "border-amber-400/80 shadow-[0_0_0_1px_rgba(251,191,36,0.28)]"
                  : ""
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge>{run.selected_agent}</Badge>
                <span className="text-xs text-amber-300">
                  Needs Review • {run.score}/10
                </span>
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-300">{run.task}</p>

              <button
                onClick={() => fetchReviewDetail(run.id)}
                className="mt-3 rounded-xl border border-amber-700/80 px-3 py-1.5 text-xs font-semibold text-amber-200 transition hover:border-amber-400"
              >
                Review This Run
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Human Review Action</h2>

        {!selectedRun ? (
          <EmptyState
            title="Choose a run to review"
            description="Select a low-confidence run from the left to approve it, request changes, or reject it."
          />
        ) : (
          <div className="mt-4 space-y-4">
            <RunSummary run={selectedRun} />

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => reuseTask(selectedRun.task)}
                className={secondaryButtonClass}
              >
                Reuse Task
              </button>
              <button
                type="button"
                onClick={() =>
                  copyToClipboard(selectedRun.final_answer, "Final answer")
                }
                className={secondaryButtonClass}
              >
                Copy Final Answer
              </button>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Action
              </label>
              <select
                value={humanAction}
                onChange={(event) => setHumanAction(event.target.value)}
                className={`${inputClass} mt-2`}
              >
                <option value="approve">Approve</option>
                <option value="revise">Revise</option>
                <option value="reject">Reject</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Human Feedback
              </label>
              <textarea
                value={humanFeedback}
                onChange={(event) => setHumanFeedback(event.target.value)}
                onKeyDown={(event) => {
                  if (isSubmitShortcut(event) && !loading) {
                    event.preventDefault();
                    submitHumanReview();
                  }
                }}
                rows={4}
                className={`${textareaClass} mt-2`}
                placeholder="Example: Make it shorter, more professional, and less generic."
              />
              <p className="mt-2 text-xs text-slate-500">
                Shortcut: `Ctrl/Cmd + Enter` to submit review.
              </p>
            </div>

            <button
              onClick={submitHumanReview}
              disabled={loading}
              className={primaryButtonClass}
            >
              {loading ? "Submitting..." : "Submit Human Review"}
            </button>

            <Panel title="Current Final Answer">
              <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
                {selectedRun.final_answer}
              </pre>
            </Panel>
          </div>
        )}
      </section>
    </div>
  );
}
