export function isSubmitShortcut(event) {
  return (event.metaKey || event.ctrlKey) && event.key === "Enter";
}

export function getWorkspaceId() {
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

export function formatDateTime(value) {
  if (!value) {
    return "N/A";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString();
}

export function parseApiPayload(text) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return text || null;
  }
}

export function parseSseChunk(rawEvent) {
  const lines = rawEvent.split("\n").filter(Boolean);
  let event = "message";
  let data = "";

  for (const line of lines) {
    if (line.startsWith("event:")) {
      event = line.slice(6).trim();
    }
    if (line.startsWith("data:")) {
      data += line.slice(5).trim();
    }
  }

  const parsedData = data ? JSON.parse(data) : null;

  return {
    event,
    data: parsedData?.id
      ? parsedData
      : {
          id:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : `${event}-${Date.now()}-${Math.random()}`,
          ...(parsedData || {}),
        },
  };
}
