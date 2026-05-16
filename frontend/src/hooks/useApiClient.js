import { API_BASE_URL } from "../lib/constants";
import { parseApiPayload } from "../lib/utils";
import { useCallback } from "react";

export function useApiClient(workspaceId) {
  const apiRequest = useCallback(async function apiRequest(path, options = {}) {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        "X-Workspace-Id": workspaceId,
        ...(options.headers || {}),
      },
    });

    const text = await response.text();
    const data = parseApiPayload(text);

    if (!response.ok) {
      const message =
        typeof data === "object" && data?.detail
          ? data.detail
          : "API request failed";

      throw new Error(message);
    }

    return data;
  }, [workspaceId]);

  return { apiRequest };
}
