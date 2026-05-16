import { useState } from "react";

export function useHumanReview({
  apiRequest,
  selectedRun,
  setSelectedRun,
  refreshCollections,
  clearMessages,
  setError,
  setSuccess,
}) {
  const [humanAction, setHumanAction] = useState("approve");
  const [humanFeedback, setHumanFeedback] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);

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

    setReviewLoading(true);

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
      await refreshCollections();
    } catch (err) {
      setError(err.message);
    } finally {
      setReviewLoading(false);
    }
  }

  return {
    humanAction,
    setHumanAction,
    humanFeedback,
    setHumanFeedback,
    reviewLoading,
    submitHumanReview,
  };
}
