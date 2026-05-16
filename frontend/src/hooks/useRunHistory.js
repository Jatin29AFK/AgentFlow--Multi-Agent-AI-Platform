import { startTransition, useEffect, useState } from "react";

const PAGE_SIZE = 20;

export function useRunHistory({ apiRequest, setError }) {
  const [runs, setRuns] = useState([]);
  const [selectedRun, setSelectedRun] = useState(null);
  const [historyQuery, setHistoryQuery] = useState("");
  const [historyStatus, setHistoryStatus] = useState("all");
  const [historyLoading, setHistoryLoading] = useState(false);
  const [runDetailLoading, setRunDetailLoading] = useState(false);
  const [hasMoreRuns, setHasMoreRuns] = useState(false);

  async function fetchRuns({ reset = true } = {}) {
    const offset = reset ? 0 : runs.length;
    const params = new URLSearchParams({
      limit: String(PAGE_SIZE),
      offset: String(offset),
      query: historyQuery,
      status: historyStatus,
    });
    const data = await apiRequest(`/agent/runs?${params.toString()}`);
    const normalized = Array.isArray(data) ? data : [];

    startTransition(() => {
      setRuns((previous) => (reset ? normalized : [...previous, ...normalized]));
      setHasMoreRuns(normalized.length === PAGE_SIZE);
    });

    return normalized;
  }

  async function loadMoreRuns() {
    setHistoryLoading(true);
    try {
      await fetchRuns({ reset: false });
    } catch (err) {
      setError(err.message);
    } finally {
      setHistoryLoading(false);
    }
  }

  async function fetchRunDetail(runId) {
    setRunDetailLoading(true);

    try {
      const data = await apiRequest(`/agent/runs/${runId}`);
      setSelectedRun(data);
      return data;
    } catch (err) {
      setError(err.message);
      return null;
    } finally {
      setRunDetailLoading(false);
    }
  }

  async function exportRun(runId, format = "json") {
    const data = await apiRequest(`/agent/runs/${runId}/export?format=${format}`);
    const content =
      format === "json" ? JSON.stringify(data.content, null, 2) : data.content;
    const type = format === "json" ? "application/json" : "text/plain";
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = data.filename || `agentflow-run.${format}`;
    link.click();
    URL.revokeObjectURL(url);
  }

  useEffect(() => {
    let ignore = false;

    async function searchRuns() {
      setHistoryLoading(true);
      try {
        const params = new URLSearchParams({
          limit: String(PAGE_SIZE),
          offset: "0",
          query: historyQuery,
          status: historyStatus,
        });
        const data = await apiRequest(`/agent/runs?${params.toString()}`);
        if (!ignore) {
          const normalized = Array.isArray(data) ? data : [];
          setRuns(normalized);
          setHasMoreRuns(normalized.length === PAGE_SIZE);
        }
      } catch (err) {
        if (!ignore) {
          setError(err.message);
        }
      } finally {
        if (!ignore) {
          setHistoryLoading(false);
        }
      }
    }

    const timeoutId = window.setTimeout(searchRuns, 250);

    return () => {
      ignore = true;
      window.clearTimeout(timeoutId);
    };
  }, [apiRequest, historyQuery, historyStatus, setError]);

  return {
    runs,
    setRuns,
    selectedRun,
    setSelectedRun,
    historyQuery,
    setHistoryQuery,
    historyStatus,
    setHistoryStatus,
    historyLoading,
    runDetailLoading,
    hasMoreRuns,
    fetchRuns,
    loadMoreRuns,
    fetchRunDetail,
    exportRun,
  };
}
