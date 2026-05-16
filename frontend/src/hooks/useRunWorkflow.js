import { useState } from "react";

import { API_BASE_URL } from "../lib/constants";
import { parseApiPayload, parseSseChunk } from "../lib/utils";

const initialStreamState = {
  active: false,
  runId: "",
  events: [],
  snapshot: null,
};

export function useRunWorkflow({
  workspaceId,
  task,
  refreshCollections,
  clearMessages,
  setError,
  setSuccess,
  setSelectedRun,
}) {
  const [runResult, setRunResult] = useState(null);
  const [workflowLoading, setWorkflowLoading] = useState(false);
  const [streamState, setStreamState] = useState(initialStreamState);

  function appendStreamEvent(event, data) {
    setStreamState((previous) => ({
      ...previous,
      runId: data?.run_id || data?.runId || previous.runId,
      snapshot:
        event === "state_snapshot"
          ? data
          : event === "run_saved"
            ? {
                status: data.status,
                selected_agent: data.selected_agent,
                tool_name: data.tool_name,
                score: data.score,
              }
            : previous.snapshot,
      events: [...previous.events, { id: data.id, event, data }],
    }));
  }

  async function runAgent() {
    clearMessages();
    setWorkflowLoading(true);
    setRunResult(null);
    setSelectedRun(null);
    setStreamState(initialStreamState);

    try {
      const response = await fetch(`${API_BASE_URL}/agent/run/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Workspace-Id": workspaceId,
        },
        body: JSON.stringify({ task }),
      });

      if (!response.ok) {
        const text = await response.text();
        const data = parseApiPayload(text);
        throw new Error(
          typeof data === "object" && data?.detail
            ? data.detail
            : "Unable to stream workflow."
        );
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("Streaming is not available in this browser.");
      }

      setStreamState({
        active: true,
        runId: "",
        events: [],
        snapshot: null,
      });

      const decoder = new TextDecoder();
      let buffer = "";
      let savedRun = null;

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        const rawEvents = buffer.split("\n\n");
        buffer = rawEvents.pop() || "";

        for (const rawEvent of rawEvents) {
          if (!rawEvent.trim()) {
            continue;
          }

          const { event, data } = parseSseChunk(rawEvent);

          if (event === "error") {
            throw new Error(data?.detail || "Workflow stream failed.");
          }

          appendStreamEvent(event, data);

          if (event === "run_saved") {
            savedRun = data;
            setRunResult(data);
          }
        }
      }

      if (buffer.trim()) {
        const { event, data } = parseSseChunk(buffer.trim());
        if (event === "error") {
          throw new Error(data?.detail || "Workflow stream failed.");
        }
        appendStreamEvent(event, data);
        if (event === "run_saved") {
          savedRun = data;
          setRunResult(data);
        }
      }

      if (!savedRun) {
        throw new Error("Workflow stream ended before the final result was saved.");
      }

      setSuccess("Agent workflow completed and saved.");
      setStreamState((previous) => ({ ...previous, active: false }));
      await refreshCollections();
    } catch (err) {
      setStreamState((previous) => ({ ...previous, active: false }));
      setError(err.message);
    } finally {
      setWorkflowLoading(false);
    }
  }

  return {
    runResult,
    setRunResult,
    workflowLoading,
    streamState,
    setStreamState,
    runAgent,
  };
}
