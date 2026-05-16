import { startTransition, useEffect, useState } from "react";

import { getWorkspaceId } from "../lib/utils";
import { useApiClient } from "./useApiClient";
import { useChat } from "./useChat";
import { useHumanReview } from "./useHumanReview";
import { useMemory } from "./useMemory";
import { useRunHistory } from "./useRunHistory";
import { useRunWorkflow } from "./useRunWorkflow";

export function useAgentRun() {
  const [activeTab, setActiveTab] = useState("run");
  const [task, setTask] = useState(
    "Summarize this topic and suggest the clearest next steps."
  );
  const [workspaceId] = useState(() => getWorkspaceId());
  const [pendingReviews, setPendingReviews] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const { apiRequest } = useApiClient(workspaceId);

  function clearMessages() {
    setError("");
    setSuccess("");
  }

  const history = useRunHistory({ apiRequest, setError });
  const memory = useMemory({ apiRequest, clearMessages, setError, setSuccess });

  async function fetchPendingReviews() {
    const data = await apiRequest("/agent/reviews/pending?limit=20");
    const normalized = Array.isArray(data) ? data : [];
    setPendingReviews(normalized);
    return normalized;
  }

  async function refreshCollections() {
    const [runsData, reviewsData, memoriesData] = await Promise.all([
      history.fetchRuns({ reset: true }),
      fetchPendingReviews(),
      memory.fetchMemories(),
    ]);

    startTransition(() => {
      history.setRuns(Array.isArray(runsData) ? runsData : []);
      setPendingReviews(Array.isArray(reviewsData) ? reviewsData : []);
      memory.setMemories(Array.isArray(memoriesData) ? memoriesData : []);
      setLastUpdated(new Date().toISOString());
    });
  }

  const workflow = useRunWorkflow({
    workspaceId,
    task,
    refreshCollections,
    clearMessages,
    setError,
    setSuccess,
    setSelectedRun: history.setSelectedRun,
  });

  const chat = useChat({ apiRequest, clearMessages, setError, setSuccess });

  const humanReview = useHumanReview({
    apiRequest,
    selectedRun: history.selectedRun,
    setSelectedRun: history.setSelectedRun,
    refreshCollections,
    clearMessages,
    setError,
    setSuccess,
  });

  const averageScore =
    history.runs.length > 0
      ? (
          history.runs.reduce((sum, run) => sum + (run.score || 0), 0) /
          history.runs.length
        ).toFixed(1)
      : "0.0";

  const completedRuns = history.runs.filter(
    (run) => run.status === "COMPLETED"
  ).length;

  async function fetchRunDetail(runId) {
    clearMessages();
    const run = await history.fetchRunDetail(runId);
    if (run) {
      setActiveTab("history");
    }
  }

  async function fetchReviewDetail(runId) {
    clearMessages();
    const run = await history.fetchRunDetail(runId);
    if (run) {
      humanReview.setHumanAction("approve");
      humanReview.setHumanFeedback("");
      setActiveTab("reviews");
    }
  }

  function goHome() {
    clearMessages();
    setActiveTab("run");
    setTask("");
    workflow.setRunResult(null);
    history.setSelectedRun(null);
    history.setHistoryQuery("");
    history.setHistoryStatus("all");
    memory.setMemorySearchQuery("");
    memory.setMemorySearchResults([]);
    chat.setChatInput("");
    chat.setChatMessages([]);
    chat.setChatModel("");
    humanReview.setHumanAction("approve");
    humanReview.setHumanFeedback("");
    workflow.setStreamState({
      active: false,
      runId: "",
      events: [],
      snapshot: null,
    });
  }

  async function refreshDashboardData() {
    clearMessages();
    try {
      await refreshCollections();
      setSuccess("Dashboard data refreshed.");
    } catch (err) {
      setError(err.message);
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
    history.setSelectedRun(null);
    workflow.setRunResult(null);
    setSuccess("Task moved to Run Agent.");
  }

  useEffect(() => {
    async function loadInitialData() {
      try {
        await refreshCollections();
      } catch (err) {
        setError(err.message);
      }
    }

    loadInitialData();
    // Initial dashboard hydration should run once for the current workspace.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    activeTab,
    setActiveTab,
    task,
    setTask,
    runResult: workflow.runResult,
    setRunResult: workflow.setRunResult,
    selectedRun: history.selectedRun,
    runs: history.runs,
    pendingReviews,
    memories: memory.memories,
    memorySearchQuery: memory.memorySearchQuery,
    setMemorySearchQuery: memory.setMemorySearchQuery,
    memorySearchResults: memory.memorySearchResults,
    historyQuery: history.historyQuery,
    setHistoryQuery: history.setHistoryQuery,
    historyStatus: history.historyStatus,
    setHistoryStatus: history.setHistoryStatus,
    hasMoreRuns: history.hasMoreRuns,
    chatInput: chat.chatInput,
    setChatInput: chat.setChatInput,
    workspaceId,
    chatMessages: chat.chatMessages,
    chatModel: chat.chatModel,
    lastUpdated,
    memoryForm: memory.memoryForm,
    setMemoryForm: memory.setMemoryForm,
    humanAction: humanReview.humanAction,
    setHumanAction: humanReview.setHumanAction,
    humanFeedback: humanReview.humanFeedback,
    setHumanFeedback: humanReview.setHumanFeedback,
    loading:
      workflow.workflowLoading ||
      humanReview.reviewLoading ||
      memory.memoryLoading,
    secondaryLoading:
      history.historyLoading ||
      history.runDetailLoading ||
      memory.memorySecondaryLoading,
    historyLoading: history.historyLoading,
    runDetailLoading: history.runDetailLoading,
    chatLoading: chat.chatLoading,
    error,
    success,
    streamState: workflow.streamState,
    averageScore,
    completedRuns,
    clearMessages,
    goHome,
    fetchRunDetail,
    fetchReviewDetail,
    runAgent: workflow.runAgent,
    submitHumanReview: humanReview.submitHumanReview,
    addMemory: memory.addMemory,
    searchMemory: memory.searchMemory,
    deleteMemory: memory.deleteMemory,
    sendChatMessage: chat.sendChatMessage,
    clearChat: chat.clearChat,
    refreshDashboardData,
    copyToClipboard,
    reuseTask,
    loadMoreRuns: history.loadMoreRuns,
    exportRun: history.exportRun,
  };
}
