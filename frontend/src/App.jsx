import "./index.css";

import { ChatPlaygroundTab } from "./components/ChatTab";
import { HistoryTab } from "./components/HistoryTab";
import { HumanReviewsTab } from "./components/HumanReviewsTab";
import { MemoryTab } from "./components/MemoryTab";
import { RunAgentTab } from "./components/RunAgentTab";
import { InfoCard } from "./components/shared";
import {
  secondaryButtonClass,
  surfaceClass,
  tabs,
} from "./lib/constants";
import { formatDateTime } from "./lib/utils";
import { useAgentRun } from "./hooks/useAgentRun";

function App() {
  const {
    activeTab,
    setActiveTab,
    task,
    setTask,
    runResult,
    selectedRun,
    runs,
    pendingReviews,
    memories,
    memorySearchQuery,
    setMemorySearchQuery,
    memorySearchResults,
    historyQuery,
    setHistoryQuery,
    historyStatus,
    setHistoryStatus,
    hasMoreRuns,
    chatInput,
    setChatInput,
    chatMessages,
    chatModel,
    lastUpdated,
    memoryForm,
    setMemoryForm,
    humanAction,
    setHumanAction,
    humanFeedback,
    setHumanFeedback,
    loading,
    secondaryLoading,
    historyLoading,
    runDetailLoading,
    chatLoading,
    error,
    success,
    streamState,
    averageScore,
    completedRuns,
    clearMessages,
    fetchRunDetail,
    fetchReviewDetail,
    runAgent,
    submitHumanReview,
    addMemory,
    searchMemory,
    deleteMemory,
    sendChatMessage,
    clearChat,
    refreshDashboardData,
    copyToClipboard,
    reuseTask,
    loadMoreRuns,
    exportRun,
  } = useAgentRun();

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 pb-24 text-slate-100">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-[-10rem] top-[-8rem] h-80 w-80 rounded-full bg-cyan-500/12 blur-3xl" />
        <div className="absolute right-[-6rem] top-24 h-72 w-72 rounded-full bg-blue-500/12 blur-3xl" />
        <div className="absolute bottom-10 left-1/3 h-64 w-64 rounded-full bg-sky-400/8 blur-3xl" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(14,165,233,0.08),transparent_32%),linear-gradient(to_bottom,rgba(15,23,42,0.92),rgba(2,6,23,1))]" />
      </div>

      <header className="relative border-b border-slate-800/70 bg-slate-950/50 px-4 py-7 backdrop-blur sm:px-6 lg:px-8 xl:px-10 2xl:px-12">
        <div className="w-full text-center">
          <div className="group mx-auto flex items-center justify-center gap-4 rounded-3xl px-4 py-2 text-center">
            <img
              src="/agentflow-logo.svg"
              alt="AgentFlow logo"
              className="h-16 w-16 shrink-0 rounded-2xl shadow-[0_12px_40px_rgba(34,211,238,0.18)] transition duration-200 group-hover:scale-[1.03]"
            />
            <div>
              <p className="text-xl font-black uppercase tracking-[0.34em] text-cyan-300 sm:text-2xl">
                AgentFlow
              </p>
              <h1 className="text-4xl font-black tracking-tight text-slate-50 sm:text-5xl">
                Multi-Agent AI Orchestration Dashboard
              </h1>
            </div>
          </div>
          <p className="mx-auto mt-4 max-w-4xl text-base font-medium leading-7 text-slate-300">
            A production-style AI agent platform with semantic memory, provider
            abstraction, tool loops, reviewer scoring, human review, run
            streaming, and traceable history.
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
                onClick={() => copyToClipboard(window.location.origin, "App URL")}
                className={secondaryButtonClass}
              >
                Copy App URL
              </button>
            </div>
          </div>
          <div className="mt-3 text-xs text-slate-500">
            Last updated: {formatDateTime(lastUpdated)}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {/* Workspace: private browser session */}
          </div>
        </div>

        {error ? (
          <div className="mb-5 rounded-2xl border border-red-800/70 bg-red-950/75 p-4 text-sm text-red-200 shadow-[0_18px_40px_rgba(127,29,29,0.2)]">
            {error}
          </div>
        ) : null}

        {success ? (
          <div className="mb-5 rounded-2xl border border-emerald-800/70 bg-emerald-950/75 p-4 text-sm text-emerald-200 shadow-[0_18px_40px_rgba(6,78,59,0.18)]">
            {success}
          </div>
        ) : null}

        {activeTab === "run" ? (
          <RunAgentTab
            task={task}
            setTask={setTask}
            loading={loading}
            runAgent={runAgent}
            runResult={runResult}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
            exportRun={exportRun}
            streamState={streamState}
          />
        ) : null}

        {activeTab === "history" ? (
          <HistoryTab
            runs={runs}
            selectedRun={selectedRun}
            fetchRunDetail={fetchRunDetail}
            secondaryLoading={secondaryLoading}
            historyLoading={historyLoading}
            runDetailLoading={runDetailLoading}
            historyQuery={historyQuery}
            setHistoryQuery={setHistoryQuery}
            historyStatus={historyStatus}
            setHistoryStatus={setHistoryStatus}
            hasMoreRuns={hasMoreRuns}
            loadMoreRuns={loadMoreRuns}
            reuseTask={reuseTask}
            copyToClipboard={copyToClipboard}
            exportRun={exportRun}
          />
        ) : null}

        {activeTab === "reviews" ? (
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
        ) : null}

        {activeTab === "memory" ? (
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
        ) : null}

        {activeTab === "chat" ? (
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
        ) : null}
      </main>

      <footer className="fixed inset-x-0 bottom-0 z-20 border-t border-cyan-500/15 bg-slate-950/92 px-4 py-3 text-center text-sm text-slate-300 shadow-[0_-12px_30px_rgba(2,6,23,0.45)] backdrop-blur-xl">
        <p className="font-extrabold uppercase tracking-[0.2em] text-cyan-200">
          Created by - Jatin Shukla
        </p>
      </footer>
    </div>
  );
}

export default App;
