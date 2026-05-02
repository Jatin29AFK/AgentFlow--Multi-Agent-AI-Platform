import { useEffect, useState } from "react";
import "./index.css";

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

const surfaceClass =
  "rounded-3xl border border-slate-800/80 bg-slate-900/65 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl";

const mutedSurfaceClass =
  "rounded-2xl border border-slate-800/70 bg-slate-950/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur";

const inputClass =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20";

const textareaClass =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-950/90 p-4 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20";

const primaryButtonClass =
  "rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-5 py-2.5 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const secondaryButtonClass =
  "rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

const tabs = [
  { id: "run", label: "Run Agent" },
  { id: "history", label: "Run History" },
  { id: "reviews", label: "Human Reviews" },
  { id: "memory", label: "Memory" },
  { id: "chat", label: "Chat Playground" },
];

const taskSuggestions = [
  "Summarize this topic in clear bullet points.",
  "Draft a concise professional email reply.",
  "Explain a technical concept in simple language.",
  "Create a step-by-step action plan for this task.",
];

const demoWorkflows = [
  {
    title: "Summaries",
    prompt: "Summarize this article in 5 short bullet points.",
  },
  {
    title: "Writing",
    prompt: "Draft a polite follow-up email after an interview.",
  },
  {
    title: "Planning",
    prompt: "Break this project into a clear weekly action plan.",
  },
];

const demoChats = [
  {
    title: "Explainer",
    prompt: "Explain REST APIs like I am a beginner developer.",
  },
  {
    title: "Refinement",
    prompt: "Rewrite this paragraph to sound more confident and concise.",
  },
  {
    title: "Brainstorm",
    prompt: "Give me 5 practical feature ideas for a productivity app.",
  },
];

function isSubmitShortcut(event) {
  return (event.metaKey || event.ctrlKey) && event.key === "Enter";
}

function getWorkspaceId() {
  if (typeof window === "undefined") {
    return "default-workspace";
  }

  const key = "agentflow_workspace_id";
  const existing = window.localStorage.getItem(key);

  if (existing) {
    return existing;
  }

  const created =
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `workspace-${Date.now()}`;

  window.localStorage.setItem(key, created);
  return created;
}

function App() {
  const [activeTab, setActiveTab] = useState("run");

  const [task, setTask] = useState(
    "Summarize this topic and suggest the clearest next steps."
  );

  const [runResult, setRunResult] = useState(null);
  const [selectedRun, setSelectedRun] = useState(null);

  const [runs, setRuns] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);

  const [memories, setMemories] = useState([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memorySearchResults, setMemorySearchResults] = useState([]);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [chatInput, setChatInput] = useState(
    "Explain a topic in a simple and practical way."
  );
  const [workspaceId] = useState(() => getWorkspaceId());
  const [chatMessages, setChatMessages] = useState([]);
  const [chatModel, setChatModel] = useState("");
  const [lastUpdated, setLastUpdated] = useState(null);

  const [memoryForm, setMemoryForm] = useState({
    content: "",
    tags: "agentflow,project",
    importance: 3,
  });

  const [humanAction, setHumanAction] = useState("approve");
  const [humanFeedback, setHumanFeedback] = useState("");

  const [loading, setLoading] = useState(false);
  const [secondaryLoading, setSecondaryLoading] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const averageScore =
    runs.length > 0
      ? (runs.reduce((sum, run) => sum + (run.score || 0), 0) / runs.length).toFixed(1)
      : "0.0";

  const completedRuns = runs.filter((run) => run.status === "COMPLETED").length;

  function goHome() {
    clearMessages();
    setActiveTab("run");
    setTask("");
    setRunResult(null);
    setSelectedRun(null);
    setHistoryQuery("");
    setHistoryStatus("all");
    setMemorySearchQuery("");
    setMemorySearchResults([]);
    setChatInput("");
    setChatMessages([]);
    setChatModel("");
    setHumanAction("approve");
    setHumanFeedback("");
    setSuccess("Home view reset.");
  }

  async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": workspaceId,
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
      setLastUpdated(new Date().toISOString());
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
      setLastUpdated(new Date().toISOString());
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
      setLastUpdated(new Date().toISOString());
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
      if (!window.confirm("Delete this memory? This action cannot be undone.")) {
        setSecondaryLoading(false);
        return;
      }

      await apiRequest(`/memory/${memoryId}`, {
        method: "DELETE",
      });

      setSuccess("Memory deleted successfully.");
      await fetchMemories();
      setLastUpdated(new Date().toISOString());

      setMemorySearchResults((prev) =>
        prev.filter((memory) => memory.id !== memoryId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  async function sendChatMessage() {
    clearMessages();

    if (!chatInput.trim()) {
      setError("Enter a message first.");
      return;
    }

    const message = chatInput.trim();
    setChatLoading(true);

    try {
      const data = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ message }),
      });

      setChatMessages((prev) => [
        {
          id: `${Date.now()}-user`,
          role: "user",
          content: message,
        },
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.response,
        },
        ...prev,
      ]);
      setChatModel(data.model || "");
      setChatInput("");
      setSuccess("Chat response generated.");
    } catch (err) {
      setError(err.message);
    } finally {
      setChatLoading(false);
    }
  }

  function clearChat() {
    setChatMessages([]);
    setChatInput("");
    setChatModel("");
    clearMessages();
  }

  async function refreshDashboardData() {
    clearMessages();
    setSecondaryLoading(true);

    try {
      const [runsData, reviewsData, memoriesData] = await Promise.all([
        apiRequest("/agent/runs?limit=20"),
        apiRequest("/agent/reviews/pending?limit=20"),
        apiRequest("/memory?limit=50"),
      ]);

      setRuns(Array.isArray(runsData) ? runsData : []);
      setPendingReviews(Array.isArray(reviewsData) ? reviewsData : []);
      setMemories(Array.isArray(memoriesData) ? memoriesData : []);
      setLastUpdated(new Date().toISOString());
      setSuccess("Dashboard data refreshed.");
    } catch (err) {
      setError(err.message);
    } finally {
      setSecondaryLoading(false);
    }
  }

  async function copyToClipboard(value, label = "Content") {
    try {
      await navigator.clipboard.writeText(value || "");
      setSuccess(`${label} copied to clipboard.`);
    } catch {
      setError(`Unable to copy ${label.toLowerCase()}.`);
    }
  }

  function reuseTask(value) {
    if (!value) {
      return;
    }

    clearMessages();
    setTask(value);
    setActiveTab("run");
    setSelectedRun(null);
    setRunResult(null);
    setSuccess("Task moved to Run Agent.");
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        async function fetchInitial(path) {
          const response = await fetch(`${API_BASE_URL}${path}`, {
            headers: {
              "Content-Type": "application/json",
              "X-Workspace-Id": workspaceId,
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

        const [runsData, reviewsData, memoriesData] = await Promise.all([
          fetchInitial("/agent/runs?limit=20"),
          fetchInitial("/agent/reviews/pending?limit=20"),
          fetchInitial("/memory?limit=50"),
        ]);

        setRuns(Array.isArray(runsData) ? runsData : []);
        setPendingReviews(Array.isArray(reviewsData) ? reviewsData : []);
        setMemories(Array.isArray(memoriesData) ? memoriesData : []);
        setLastUpdated(new Date().toISOString());
      } catch (err) {
        setError(err.message);
      }
    }

    loadInitialData();
  }, [workspaceId]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-24 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_32%),linear-gradient(to_bottom,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />
      </div>

      <header className="relative border-b border-slate-800/70 bg-slate-950/50 px-4 py-5 backdrop-blur sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="w-full">
          <button
            type="button"
            onClick={goHome}
            className="group flex items-center gap-4 rounded-3xl px-1 py-1 text-left transition hover:opacity-95"
          >
            <img
              src="/agentflow-logo.svg"
              alt="AgentFlow logo"
              className="h-14 w-14 shrink-0 rounded-2xl shadow-[0_12px_40px_rgba(34,211,238,0.18)] transition duration-200 group-hover:scale-[1.03]"
            />
            <div>
              <p className="text-sm font-medium tracking-wide text-cyan-300">
                AgentFlow
              </p>
              <h1 className="text-3xl font-bold tracking-tight">
                Multi-Agent AI Orchestration Dashboard
              </h1>
            </div>
          </button>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-400">
            A production-style AI agent platform with supervisor routing,
            specialist agents, tool use, memory, reviewer scoring, human review,
            trace storage, and run history.
          </p>
        </div>
      </header>

      <main className="relative w-full px-4 py-6 sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <section className="mb-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <InfoCard label="Recent Runs" value={runs.length} />
          <InfoCard label="Completed" value={completedRuns} />
          <InfoCard label="Pending Reviews" value={pendingReviews.length} />
          <InfoCard label="Average Score" value={`${averageScore}/10`} />
        </section>

        <div className={`${surfaceClass} mb-6 p-3`}>
          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
            <div className="flex flex-wrap gap-3">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    clearMessages();
                    setActiveTab(tab.id);
                  }}
                  className={`rounded-2xl px-4 py-2.5 text-sm font-semibold transition duration-200 ${
                    activeTab === tab.id
                      ? "bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 text-slate-950 shadow-[0_12px_30px_rgba(56,189,248,0.28)]"
                      : "border border-slate-800/80 bg-slate-900/70 text-slate-300 hover:-translate-y-0.5 hover:border-cyan-400/70 hover:bg-slate-800/70"
                  }`}
                >
                  <span>{tab.label}</span>
                  {tab.id === "reviews" && pendingReviews.length > 0 ? (
                    <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[11px] text-amber-200">
                      {pendingReviews.length}
                    </span>
                  ) : null}
                  {tab.id === "history" && runs.length > 0 ? (
                    <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                      {runs.length}
                    </span>
                  ) : null}
                  {tab.id === "memory" && memories.length > 0 ? (
                    <span className="ml-2 rounded-full bg-slate-800 px-2 py-0.5 text-[11px] text-slate-300">
                      {memories.length}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap gap-3">
              <button
                onClick={refreshDashboardData}
                disabled={secondaryLoading}
                className={secondaryButtonClass}
              >
                {secondaryLoading ? "Refreshing..." : "Refresh Data"}
              </button>
              <button
                onClick={() => copyToClipboard(API_BASE_URL, "API URL")}
                className={secondaryButtonClass}
              >
                Copy API URL
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Last updated: {formatDateTime(lastUpdated)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            Workspace: private browser session
          </div>
        </div>

        {error && (
          <div className="mb-5 rounded-2xl border border-red-800/70 bg-red-950/75 p-4 text-sm text-red-200 shadow-[0_18px_40px_rgba(127,29,29,0.2)]">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-5 rounded-2xl border border-emerald-800/70 bg-emerald-950/75 p-4 text-sm text-emerald-200 shadow-[0_18px_40px_rgba(6,78,59,0.18)]">
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
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab
            runs={runs}
            selectedRun={selectedRun}
            fetchRunDetail={fetchRunDetail}
            secondaryLoading={secondaryLoading}
            historyQuery={historyQuery}
            setHistoryQuery={setHistoryQuery}
            historyStatus={historyStatus}
            setHistoryStatus={setHistoryStatus}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
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
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
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

        {activeTab === "chat" && (
          <ChatPlaygroundTab
            chatInput={chatInput}
            setChatInput={setChatInput}
            chatMessages={chatMessages}
            chatModel={chatModel}
            chatLoading={chatLoading}
            sendChatMessage={sendChatMessage}
            clearChat={clearChat}
            copyToClipboard={copyToClipboard}
            reuseTask={reuseTask}
          />
        )}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-500/15 bg-slate-950/92 px-4 py-3 text-center text-sm text-slate-300 shadow-[0_-12px_30px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <p className="font-extrabold uppercase tracking-[0.2em] text-cyan-200">
          Created by - Jatin Shukla
        </p>
      </footer>
    </div>
  );
}

function RunAgentTab({
  task,
  setTask,
  loading,
  runAgent,
  runResult,
  reuseTask,
  copyToClipboard,
}) {
  return (
    <div className="grid gap-6 xl:grid-cols-[1.05fr_0.95fr]">
      <section className={`${surfaceClass} p-6 transition duration-200 hover:border-cyan-500/30`}>
        <h2 className="text-xl font-semibold">Run Agent Workflow</h2>
        <p className="mt-2 text-sm leading-6 text-slate-400">
          Enter a task. AgentFlow will retrieve memory, select the best
          specialist agent, use tools if needed, review the answer, and either
          finalize it or send it for human review.
        </p>

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
                <p className="text-sm font-semibold text-slate-200">
                  {item.title}
                </p>
                <p className="mt-2 text-xs leading-5 text-slate-500">
                  {item.prompt}
                </p>
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={task}
          onChange={(e) => setTask(e.target.value)}
          onKeyDown={(e) => {
            if (isSubmitShortcut(e) && !loading && task.trim()) {
              e.preventDefault();
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

      <section className={`${surfaceClass} p-6 transition duration-200 hover:border-cyan-500/30`}>
        <h2 className="text-xl font-semibold">Latest Result</h2>

        {!runResult && (
          <p className="mt-4 text-sm leading-6 text-slate-500">
            Run an agent workflow to see the result here.
          </p>
        )}

        {runResult && (
          <RunDetail
            run={runResult}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
          />
        )}
      </section>
    </div>
  );
}

function HistoryTab({
  runs,
  selectedRun,
  fetchRunDetail,
  secondaryLoading,
  historyQuery,
  setHistoryQuery,
  historyStatus,
  setHistoryStatus,
  reuseTask,
  copyToClipboard,
}) {
  const filteredRuns = runs.filter((run) => {
    const matchesQuery =
      !historyQuery.trim() ||
      `${run.task} ${run.selected_agent} ${run.tool_name} ${run.status}`
        .toLowerCase()
        .includes(historyQuery.trim().toLowerCase());

    const matchesStatus =
      historyStatus === "all" || run.status === historyStatus;

    return matchesQuery && matchesStatus;
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Run History</h2>
        <p className="mt-2 text-sm text-slate-400">
          These runs are loaded from SQLite using your FastAPI backend.
        </p>

        <div className="mt-4 grid gap-3 xl:grid-cols-[1fr_180px]">
          <input
            value={historyQuery}
            onChange={(e) => setHistoryQuery(e.target.value)}
            className={inputClass}
            placeholder="Search by task, agent, tool, or status..."
          />
          <select
            value={historyStatus}
            onChange={(e) => setHistoryStatus(e.target.value)}
            className={inputClass}
          >
            <option value="all">All statuses</option>
            <option value="COMPLETED">Completed</option>
            <option value="NEEDS_HUMAN_REVIEW">Needs Review</option>
            <option value="REJECTED">Rejected</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {filteredRuns.length === 0 && (
            <p className="text-sm text-slate-500">
              No runs match the current filters.
            </p>
          )}

          {filteredRuns.map((run) => (
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

              <p className="mt-3 text-sm leading-5 text-slate-300">
                {run.task}
              </p>

              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500">
                <span>{run.status}</span>
                <span>Tool: {run.tool_name}</span>
              </div>

              <button
                onClick={() => fetchRunDetail(run.id)}
                className="mt-3 rounded-xl border border-slate-700/80 px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-cyan-400 hover:text-cyan-300"
              >
                View Details
              </button>
            </div>
          ))}
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Run Detail</h2>

        {secondaryLoading && (
          <p className="mt-3 text-sm text-slate-400">Loading run detail...</p>
        )}

        {!selectedRun && !secondaryLoading && (
          <EmptyState
            title="Pick a run to inspect"
            description="Open any saved workflow to see the answer, tool activity, memory usage, and full trace timeline."
          />
        )}

        {selectedRun && (
          <RunDetail
            run={selectedRun}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
          />
        )}
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
          {pendingReviews.length === 0 && (
            <EmptyState
              title="No reviews waiting"
              description="When a workflow scores below the confidence threshold, it will appear here for approval, revision, or rejection."
            />
          )}

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

              <p className="mt-3 text-sm leading-5 text-slate-300">
                {run.task}
              </p>

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

        {!selectedRun && (
          <EmptyState
            title="Choose a run to review"
            description="Select a low-confidence run from the left to approve it, request changes, or reject it."
          />
        )}

        {selectedRun && (
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
                onChange={(e) => setHumanAction(e.target.value)}
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
                onChange={(e) => setHumanFeedback(e.target.value)}
                onKeyDown={(e) => {
                  if (isSubmitShortcut(e) && !loading) {
                    e.preventDefault();
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
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <div className={`${surfaceClass} p-6`}>
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
            className={`${textareaClass} mt-4`}
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
            className={`${inputClass} mt-3`}
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
              className="mt-2 w-full accent-cyan-400"
            />
          </div>

          <button
            onClick={addMemory}
            disabled={loading}
            className={`${primaryButtonClass} mt-4`}
          >
            {loading ? "Saving..." : "Add Memory"}
          </button>
        </div>

        <div className={`${surfaceClass} p-6`}>
          <h2 className="text-xl font-semibold">Search Memory</h2>

          <div className="mt-4 flex gap-3">
            <input
              value={memorySearchQuery}
              onChange={(e) => setMemorySearchQuery(e.target.value)}
              className={inputClass}
              placeholder="Search memory..."
            />
            <button
              onClick={searchMemory}
              disabled={secondaryLoading}
              className={primaryButtonClass}
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

          {!shownSearchResults && memorySearchQuery.trim() && !secondaryLoading && (
            <p className="mt-4 text-sm text-slate-500">
              Search to see matching memories and relevance scores here.
            </p>
          )}
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Saved Memories</h2>
        <p className="mt-2 text-sm text-slate-400">
          These memories are stored in SQLite and retrieved before each agent
          workflow.
        </p>

        <div className="mt-4 space-y-3">
          {memories.length === 0 && (
            <EmptyState
              title="No memories saved yet"
              description="Add a few stable facts, preferences, or project details so AgentFlow can reuse them in future tasks."
            />
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

function ChatPlaygroundTab({
  chatInput,
  setChatInput,
  chatMessages,
  chatModel,
  chatLoading,
  sendChatMessage,
  clearChat,
  copyToClipboard,
  reuseTask,
}) {
  const chatSuggestions = [
    "Explain this topic in simple language.",
    "Write a short professional summary.",
    "Turn this into clear bullet points.",
    "Suggest a practical plan to approach this task.",
  ];

  return (
    <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
      <section className={`${surfaceClass} p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Chat Playground</h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Talk directly to the configured Groq model through the backend
              chat route. This is useful for quick drafting, explanation, and
              experimentation outside the full agent workflow.
            </p>
          </div>
          {chatModel && (
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              {chatModel}
            </span>
          )}
        </div>

        <div className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Quick Prompts
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {chatSuggestions.map((suggestion) => (
              <button
                key={suggestion}
                type="button"
                onClick={() => setChatInput(suggestion)}
                className="rounded-full border border-slate-700/80 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300 transition hover:border-cyan-400/70 hover:text-cyan-200"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>

        <textarea
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => {
            if (isSubmitShortcut(e) && !chatLoading && chatInput.trim()) {
              e.preventDefault();
              sendChatMessage();
            }
          }}
          rows={8}
          className={`${textareaClass} mt-5 min-h-[14rem]`}
          placeholder="Ask something about your project, architecture, resume bullets, or explanations..."
        />

        <p className="mt-2 text-xs text-slate-500">
          Shortcut: `Ctrl/Cmd + Enter` to send a message.
        </p>

        <div className="mt-4 flex flex-wrap gap-3">
          <button
            onClick={sendChatMessage}
            disabled={chatLoading || !chatInput.trim()}
            className={primaryButtonClass}
          >
            {chatLoading ? "Generating..." : "Send Message"}
          </button>
          <button
            type="button"
            onClick={() => copyToClipboard(chatInput, "Prompt")}
            className={secondaryButtonClass}
          >
            Copy Prompt
          </button>
          <button
            type="button"
            onClick={clearChat}
            className={secondaryButtonClass}
          >
            Clear Session
          </button>
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-xl font-semibold">Conversation</h2>
          <span className="text-xs uppercase tracking-wide text-slate-500">
            {chatMessages.length / 2 || 0} turns
          </span>
        </div>

        {chatMessages.length === 0 && (
          <div className="space-y-4">
            <EmptyState
              title="Start a quick session"
              description="Use this space for fast drafting, clarifying ideas, or trying prompts before turning them into full agent workflows."
            />
            <div className="grid gap-3 md:grid-cols-3">
              {demoChats.map((item) => (
                <button
                  key={item.title}
                  type="button"
                  onClick={() => setChatInput(item.prompt)}
                  className="rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4 text-left transition hover:border-cyan-400/50 hover:bg-slate-900/70"
                >
                  <p className="text-sm font-semibold text-slate-200">
                    {item.title}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {item.prompt}
                  </p>
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="mt-4 space-y-4">
          {chatMessages.map((message) => (
            <div
              key={message.id}
              className={`rounded-2xl border p-4 ${
                message.role === "assistant"
                  ? "border-cyan-500/20 bg-cyan-500/8"
                  : "border-slate-800/70 bg-slate-950/75"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <span
                  className={`text-xs font-semibold uppercase tracking-wide ${
                    message.role === "assistant"
                      ? "text-cyan-300"
                      : "text-slate-400"
                  }`}
                >
                  {message.role === "assistant" ? "Assistant" : "You"}
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      copyToClipboard(
                        message.content,
                        message.role === "assistant" ? "Response" : "Message"
                      )
                    }
                    className="text-xs text-slate-400 transition hover:text-cyan-200"
                  >
                    Copy
                  </button>
                  {message.role === "user" && (
                    <button
                      type="button"
                      onClick={() => reuseTask(message.content)}
                      className="text-xs text-slate-400 transition hover:text-cyan-200"
                    >
                      Use as Task
                    </button>
                  )}
                </div>
              </div>
              <StructuredText
                content={message.content}
                tone={message.role === "assistant" ? "primary" : "default"}
              />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function RunDetail({ run, reuseTask, copyToClipboard }) {
  return (
    <div className="mt-4 space-y-4">
      <div className="grid gap-3 xl:grid-cols-4">
        <InfoCard label="Selected Agent" value={run.selected_agent} />
        <InfoCard label="Tool" value={run.tool_name} />
        <InfoCard label="Score" value={`${run.score}/10`} />
        <InfoCard label="Status" value={run.status} />
      </div>

      <RunSummary run={run} />

      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => reuseTask(run.task)}
          className={secondaryButtonClass}
        >
          Reuse Task
        </button>
        <button
          type="button"
          onClick={() => copyToClipboard(run.final_answer, "Final answer")}
          className={secondaryButtonClass}
        >
          Copy Final Answer
        </button>
        <button
          type="button"
          onClick={() =>
            copyToClipboard(JSON.stringify(run.trace || [], null, 2), "Trace")
          }
          className={secondaryButtonClass}
        >
          Copy Trace
        </button>
      </div>

      <Panel title="Final Answer">
        <StructuredText content={run.final_answer} tone="primary" />
      </Panel>

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
              value={run.tool_used ? run.tool_name || "Tool used" : "No tool used"}
            />
            <DetailRow
              label="Tool Input"
              value={run.tool_input || "No tool input recorded."}
            />
            <DetailRow
              label="Tool Output"
              value={run.tool_result || "No tool output recorded."}
            />
          </div>
        </Panel>
      </div>

      <Panel title="Memory Used">
        <div className="space-y-4">
          <StructuredText
            content={run.memory_context || "No memory context available."}
          />
          {Array.isArray(run.retrieved_memories) && run.retrieved_memories.length > 0 && (
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
          )}
        </div>
      </Panel>

      <Panel title="Trace Timeline">
        <ol className="space-y-2 text-sm">
          {(run.trace || []).map((item, index) => (
            <li
              key={index}
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

function RunSummary({ run }) {
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

function MemoryCard({ memory, deleteMemory, showSearchInfo = false }) {
  return (
    <div className={`${mutedSurfaceClass} p-4 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-500/25`}>
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
          className="font-medium text-red-300 transition hover:text-red-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}

function InfoCard({ label, value }) {
  return (
    <div className={`${mutedSurfaceClass} p-4`}>
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
    <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
      {children || "agent"}
    </span>
  );
}

function Panel({ title, children }) {
  return (
    <div className={`${mutedSurfaceClass} p-4`}>
      <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-slate-200">
        {title}
      </h3>
      {children}
    </div>
  );
}

function DetailRow({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
        {label}
      </p>
      <StructuredText content={value || "N/A"} />
    </div>
  );
}

function EmptyState({ title, description }) {
  return (
    <div className="mt-4 rounded-2xl border border-dashed border-slate-800/80 bg-slate-950/55 px-4 py-5">
      <p className="text-sm font-semibold text-slate-300">{title}</p>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </div>
  );
}

function StructuredText({ content, tone = "default" }) {
  const text = typeof content === "string" ? content.trim() : "";
  const sections = text
    ? text
        .split(/\n\s*\n/)
        .map((section) => section.trim())
        .filter(Boolean)
    : [];

  const textColor =
    tone === "primary" ? "text-slate-100" : "text-slate-300";

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

        const isBulletList =
          lines.length > 1 &&
          lines.every((line) => /^([-*]|\d+\.)\s+/.test(line));

        if (isBulletList) {
          return (
            <ul key={sectionIndex} className={`space-y-2 text-sm leading-6 ${textColor}`}>
              {lines.map((line, lineIndex) => (
                <li key={lineIndex} className="flex gap-2">
                  <span className="mt-[0.55rem] h-1.5 w-1.5 shrink-0 rounded-full bg-cyan-300" />
                  <span>{line.replace(/^([-*]|\d+\.)\s+/, "")}</span>
                </li>
              ))}
            </ul>
          );
        }

        const headerMatch = lines[0].match(/^([A-Za-z][A-Za-z0-9\s/&()-]{1,40}):\s*(.*)$/);

        if (headerMatch) {
          const [, heading, rest] = headerMatch;
          const body = [rest, ...lines.slice(1)].filter(Boolean).join(" ");
          return (
            <div key={sectionIndex} className="rounded-xl border border-slate-800/70 bg-slate-950/70 px-3 py-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300">
                {heading}
              </p>
              {body ? (
                <p className={`mt-2 text-sm leading-6 ${textColor}`}>{body}</p>
              ) : null}
            </div>
          );
        }

        return (
          <p key={sectionIndex} className={`text-sm leading-6 ${textColor}`}>
            {lines.join(" ")}
          </p>
        );
      })}
    </div>
  );
}

function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export default App;
