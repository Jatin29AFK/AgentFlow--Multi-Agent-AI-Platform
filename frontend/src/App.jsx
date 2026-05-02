import { useEffect, useState } from "react";
import "./index.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const tabs = [
  { id: "run", label: "Run Agent" },
  { id: "history", label: "Run History" },
  { id: "reviews", label: "Human Reviews" },
  { id: "memory", label: "Memory" },
];

function App() {
  const [activeTab, setActiveTab] = useState("run");

  const [task, setTask] = useState(
    "Create 3 resume bullets for AgentFlow project."
  );

  const [runResult, setRunResult] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  const [runs, setRuns] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  const [memories, setMemories] = useState([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memorySearchResults, setMemorySearchResults] = useState([]);

  const [memoryForm, setMemoryForm] = useState({
    content: "",
    tags: "agentflow,project",
    importance: 3,
  });

  const [humanAction, setHumanAction] = useState("approve");
  const [humanFeedback, setHumanFeedback] = useState("");

  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    let data;

    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = text || null;
    }

    if (!response.ok) {
      const message =
        typeof data === "object" && data?.detail
          ? data.detail
          : "API request failed";

      throw new Error(message);
    }

    return data;
  }

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  async function fetchRuns() {
    const data = await apiRequest("/agent/runs?limit=20");
    setRuns(Array.isArray(data) ? data : []);
  }

  async function fetchPendingReviews() {
    const data = await apiRequest("/agent/reviews/pending?limit=20");
    setPendingReviews(Array.isArray(data) ? data : []);
  }

  async function fetchRunDetail(runId) {
    clearMessages();
    setSecondaryLoading(true);

    try {
      const data = await apiRequest(`/agent/runs/${runId}`);
      setSelectedRun(data);
      setActiveTab("history");
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  async function fetchReviewDetail(runId) {
    clearMessages();
    setSecondaryLoading(true);

    try {
      const data = await apiRequest(`/agent/runs/${runId}`);
      setSelectedRun(data);
      setHumanAction("approve");
      setHumanFeedback("");
      setActiveTab("reviews");
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  async function fetchMemories() {
    const data = await apiRequest("/memory?limit=50");
    setMemories(Array.isArray(data) ? data : []);
  }

  async function runAgent() {
    clearMessages();
    setLoading(true);
    setRunResult(null);
    setSelectedRun(null);

    try {
      const data = await apiRequest("/agent/run", {
        method: "POST",
        body: JSON.stringify({ task }),
      });

      setRunResult(data);
      setSuccess("Agent workflow completed and saved.");

      await fetchRuns();
      await fetchPendingReviews();
      await fetchMemories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function submitHumanReview() {
    clearMessages();

    if (!selectedRun) {
      setError("Please select a pending review first.");
      return;
    }

    if (humanAction === "revise" && !humanFeedback.trim()) {
      setError("Feedback is required when action is revise.");
      return;
    }

    setLoading(true);

    try {
      const runId = selectedRun.run_id || selectedRun.id;

      const data = await apiRequest(`/agent/runs/${runId}/human-review`, {
        method: "POST",
        body: JSON.stringify({
          action: humanAction,
          feedback: humanFeedback,
        }),
      });

      setSelectedRun(data);
      setSuccess(`Human review submitted: ${humanAction}`);

      await fetchRuns();
      await fetchPendingReviews();
      await fetchMemories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function addMemory() {
    clearMessages();

    if (!memoryForm.content.trim()) {
      setError("Memory content is required.");
      return;
    }

    setLoading(true);

    try {
      const tags = memoryForm.tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      await apiRequest("/memory", {
        method: "POST",
        body: JSON.stringify({
          content: memoryForm.content,
          tags,
          importance: Number(memoryForm.importance),
        }),
      });

      setMemoryForm({
        content: "",
        tags: "agentflow,project",
        importance: 3,
      });

      setSuccess("Memory added successfully.");
      await fetchMemories();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function searchMemory() {
    clearMessages();

    if (!memorySearchQuery.trim()) {
      setError("Enter a search query first.");
      return;
    }

    setSecondaryLoading(true);

    try {
      const query = encodeURIComponent(memorySearchQuery);
      const data = await apiRequest(`/memory/search?query=${query}&limit=10`);
      setMemorySearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  async function deleteMemory(memoryId) {
    clearMessages();
    setSecondaryLoading(true);

    try {
      await apiRequest(`/memory/${memoryId}`, {
        method: "DELETE",
      });

      setSuccess("Memory deleted successfully.");
      await fetchMemories();

      setMemorySearchResults((prev) =>
        prev.filter((memory) => memory.id !== memoryId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        const [runsData, reviewsData, memoriesData] = await Promise.all([
          apiRequest("/agent/runs?limit=20"),
          apiRequest("/agent/reviews/pending?limit=20"),
          apiRequest("/memory?limit=50"),
        ]);

        setRuns(Array.isArray(runsData) ? runsData : []);
        setPendingReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setMemories(Array.isArray(memoriesData) ? memoriesData : []);
      } catch (err) {
        setError(err.message);
      }
    }

    loadInitialData();
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <header className="border-b border-slate-800 bg-slate-900/70 px-6 py-5">
        <div className="mx-auto max-w-7xl">
          <p className="text-sm font-medium text-cyan-300">AgentFlow</p>
          <h1 className="text-3xl font-bold">
            Multi-Agent AI Orchestration Dashboard
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            A production-style AI agent platform with supervisor routing,
            specialist agents, tool use, memory, reviewer scoring, human review,
            trace storage, and run history.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-6">
        <div className="mb-6 flex flex-wrap gap-3">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                clearMessages();
                setActiveTab(tab.id);
              }}
              className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                activeTab === tab.id
                  ? "bg-cyan-500 text-slate-950"
                  : "border border-slate-800 bg-slate-900 text-slate-300 hover:border-cyan-400"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-5 rounded-xl border border-red-800 bg-red-950 p-4 text-sm text-red-200">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950 p-4 text-sm text-emerald-200">
            {success}
          </div>
        )}

        {activeTab === "run" && (
          <RunAgentTab
            task={task}
            setTask={setTask}
            loading={loading}
            runAgent={runAgent}
            runResult={runResult}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            runs={runs}
            selectedRun={selectedRun}
            fetchRunDetail={fetchRunDetail}
            secondaryLoading={secondaryLoading}
          />
        )}

        {activeTab === "reviews" && (
          <HumanReviewsTab
            pendingReviews={pendingReviews}
            selectedRun={selectedRun}
            fetchReviewDetail={fetchReviewDetail}
            humanAction={humanAction}
            setHumanAction={setHumanAction}
            humanFeedback={humanFeedback}
            setHumanFeedback={setHumanFeedback}
            submitHumanReview={submitHumanReview}
            loading={loading}
          />
        )}

        {activeTab === "memory" && (
          <MemoryTab
            memories={memories}
            memoryForm={memoryForm}
            setMemoryForm={setMemoryForm}
            addMemory={addMemory}
            memorySearchQuery={memorySearchQuery}
            setMemorySearchQuery={setMemorySearchQuery}
            searchMemory={searchMemory}
            memorySearchResults={memorySearchResults}
            deleteMemory={deleteMemory}
            loading={loading}
            secondaryLoading={secondaryLoading}
          />
        )}
      </main>

      <footer className="border-t border-slate-800 px-6 py-5 text-center text-xs text-slate-500">
        <p>
          Created by Jatin Shukla • AgentFlow AI Orchestration Platform
        </p>
        <p className="mt-1">
          Backend API: {API_BASE_URL}
        </p>
      </footer>
    </div>
  );
}

function RunAgentTab({ task, setTask, loading, runAgent, runResult }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
        <h2 className="text-xl font-semibold">Run Agent Workflow</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Enter a task. AgentFlow will retrieve memory, select the best
          specialist agent, use tools if needed, review the answer, and either
          finalize it or send it for human review.
        </p>

        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          rows={7}
          className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-cyan-400"
          placeholder="Enter your task..."
        />

        <button
          onClick={runAgent}
          disabled={loading || !task.trim()}
          className="mt-4 rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Running AgentFlow..." : "Run Agent"}
        </button>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5 shadow">
        <h2 className="text-xl font-semibold">Latest Result</h2>

        {!runResult && (
          <p className="mt-3 text-sm text-slate-500">
            Run an agent workflow to see the result here.
          </p>
        )}

        {runResult && <RunDetail run={runResult} />}
      </section>
    </div>
  );
}

function HistoryTab({ runs, selectedRun, fetchRunDetail, secondaryLoading }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Run History</h2>
        <p className="mt-2 text-sm text-slate-400">
          These runs are loaded from SQLite using your FastAPI backend.
        </p>

        <div className="mt-4 space-y-3">
          {runs.length === 0 && (
            <p className="text-sm text-slate-500">No runs available yet.</p>
          )}

          {runs.map((run) => (
            <div
              key={run.id}
              className="rounded-xl border border-slate-800 bg-slate-950 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge>{run.selected_agent}</Badge>
                <span className="text-xs text-slate-400">{run.score}/10</span>
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-300">
                {run.task}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{run.status}</span>
                <span>Tool: {run.tool_name}</span>
              </div>

              <button
                onClick={() => fetchRunDetail(run.id)}
                className="mt-3 rounded-lg border border-slate-700 px-3 py-1 text-xs font-semibold text-slate-300 hover:border-cyan-400 hover:text-cyan-300"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Run Detail</h2>

        {secondaryLoading && (
          <p className="mt-3 text-sm text-slate-400">Loading run detail...</p>
        )}

        {!selectedRun && !secondaryLoading && (
          <p className="mt-3 text-sm text-slate-500">
            Select a run from the left side.
          </p>
        )}

        {selectedRun && <RunDetail run={selectedRun} />}
      </section>
    </div>
  );
}

function HumanReviewsTab({
  pendingReviews,
  selectedRun,
  fetchReviewDetail,
  humanAction,
  setHumanAction,
  humanFeedback,
  setHumanFeedback,
  submitHumanReview,
  loading,
}) {
  return (
    <div className="grid gap-6 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Pending Human Reviews</h2>
        <p className="mt-2 text-sm text-slate-400">
          These are agent runs where reviewer score was below the configured
          threshold.
        </p>

        <div className="mt-4 space-y-3">
          {pendingReviews.length === 0 && (
            <p className="text-sm text-slate-500">
              No pending reviews right now.
            </p>
          )}

          {pendingReviews.map((run) => (
            <div
              key={run.id}
              className="rounded-xl border border-amber-900 bg-slate-950 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Badge>{run.selected_agent}</Badge>
                <span className="text-xs text-amber-300">
                  Needs Review • {run.score}/10
                </span>
              </div>

              <p className="mt-3 text-sm leading-5 text-slate-300">
                {run.task}
              </p>

              <button
                onClick={() => fetchReviewDetail(run.id)}
                className="mt-3 rounded-lg border border-amber-700 px-3 py-1 text-xs font-semibold text-amber-200 hover:border-amber-400"
              >
                Review This Run
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Human Review Action</h2>

        {!selectedRun && (
          <p className="mt-3 text-sm text-slate-500">
            Select a pending review first.
          </p>
        )}

        {selectedRun && (
          <div className="mt-4 space-y-4">
            <RunSummary run={selectedRun} />

            <div>
              <label className="text-sm font-semibold text-slate-300">
                Action
              </label>
              <select
                value={humanAction}
                onChange={(e) => setHumanAction(e.target.value)}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400"
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
                onChange={(e) => setHumanFeedback(e.target.value)}
                rows={4}
                className="mt-2 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400"
                placeholder="Example: Make it shorter, more professional, and less generic."
              />
            </div>

            <button
              onClick={submitHumanReview}
              disabled={loading}
              className="rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 disabled:opacity-60"
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

function MemoryTab({
  memories,
  memoryForm,
  setMemoryForm,
  addMemory,
  memorySearchQuery,
  setMemorySearchQuery,
  searchMemory,
  memorySearchResults,
  deleteMemory,
  loading,
  secondaryLoading,
}) {
  const shownSearchResults = memorySearchResults.length > 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Add Memory</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use this to manually teach AgentFlow useful long-term information,
            such as your style preference, project tech stack, or resume
            preferences.
          </p>

          <textarea
            value={memoryForm.content}
            onChange={(e) =>
              setMemoryForm((prev) => ({
                ...prev,
                content: e.target.value,
              }))
            }
            rows={5}
            className="mt-4 w-full rounded-xl border border-slate-700 bg-slate-950 p-4 text-sm outline-none focus:border-cyan-400"
            placeholder="Example: User prefers simple, human-sounding resume bullets with measurable impact."
          />

          <input
            value={memoryForm.tags}
            onChange={(e) =>
              setMemoryForm((prev) => ({
                ...prev,
                tags: e.target.value,
              }))
            }
            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400"
            placeholder="tags comma separated"
          />

          <div className="mt-3">
            <label className="text-sm text-slate-400">
              Importance: {memoryForm.importance}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={memoryForm.importance}
              onChange={(e) =>
                setMemoryForm((prev) => ({
                  ...prev,
                  importance: e.target.value,
                }))
              }
              className="mt-2 w-full"
            />
          </div>

          <button
            onClick={addMemory}
            disabled={loading}
            className="mt-4 rounded-xl bg-cyan-500 px-5 py-2 font-semibold text-slate-950 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Add Memory"}
          </button>
        </div>

        <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
          <h2 className="text-xl font-semibold">Search Memory</h2>

          <div className="mt-4 flex gap-3">
            <input
              value={memorySearchQuery}
              onChange={(e) => setMemorySearchQuery(e.target.value)}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 p-3 text-sm outline-none focus:border-cyan-400"
              placeholder="Search memory..."
            />
            <button
              onClick={searchMemory}
              disabled={secondaryLoading}
              className="rounded-xl bg-cyan-500 px-4 py-2 font-semibold text-slate-950 disabled:opacity-60"
            >
              Search
            </button>
          </div>

          {shownSearchResults && (
            <div className="mt-4 space-y-3">
              {memorySearchResults.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  deleteMemory={deleteMemory}
                  showSearchInfo
                />
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h2 className="text-xl font-semibold">Saved Memories</h2>
        <p className="mt-2 text-sm text-slate-400">
          These memories are stored in SQLite and retrieved before each agent
          workflow.
        </p>

        <div className="mt-4 space-y-3">
          {memories.length === 0 && (
            <p className="text-sm text-slate-500">No memories saved yet.</p>
          )}

          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              deleteMemory={deleteMemory}
            />
          ))}
        </div>
      </section>
    </div>
  );
}

function RunDetail({ run }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 md:grid-cols-4">
        <InfoCard label="Selected Agent" value={run.selected_agent} />
        <InfoCard label="Tool" value={run.tool_name} />
        <InfoCard label="Score" value={`${run.score}/10`} />
        <InfoCard label="Status" value={run.status} />
      </div>

      <RunSummary run={run} />

      <Panel title="Final Answer">
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-200">
          {run.final_answer}
        </pre>
      </Panel>

      <Panel title="Memory Used">
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {run.memory_context || "No memory context available."}
        </pre>
      </Panel>

      <Panel title="Trace Timeline">
        <ol className="space-y-2 text-sm">
          {(run.trace || []).map((item, index) => (
            <li key={index} className="rounded-lg bg-slate-950 p-3">
              <span className="mr-2 text-cyan-300">{index + 1}.</span>
              {item}
            </li>
          ))}
        </ol>
      </Panel>

      <Panel title="Reviewer Feedback">
        <pre className="whitespace-pre-wrap text-sm leading-6 text-slate-300">
          {run.review}
        </pre>
      </Panel>
    </div>
  );
}

function RunSummary({ run }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">Task</p>
      <p className="mt-2 text-sm leading-6 text-slate-300">{run.task}</p>

      <div className="mt-4 grid gap-3 md:grid-cols-3">
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

function MemoryCard({ memory, deleteMemory, showSearchInfo = false }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
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

      {showSearchInfo && (
        <p className="mt-3 text-xs text-slate-500">
          Matched: {(memory.matched_terms || []).join(", ") || "N/A"} • Score:{" "}
          {memory.search_score}
        </p>
      )}

      <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
        <span>Importance: {memory.importance}/5</span>
        <button
          onClick={() => deleteMemory(memory.id)}
          className="text-red-300 hover:text-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 font-semibold text-cyan-200">{value || "N/A"}</p>
    </div>
  );
}

function StatusBadge({ status }) {
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

function Badge({ children }) {
  return (
    <span className="rounded-full bg-slate-800 px-3 py-1 text-xs text-cyan-300">
      {children || "agent"}
    </span>
  );
}

function Panel({ title, children }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <h3 className="mb-3 font-semibold text-slate-100">{title}</h3>
      {children}
    </div>
  );
}

export default App;
