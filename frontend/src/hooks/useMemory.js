import { startTransition, useState } from "react";

export function useMemory({ apiRequest, clearMessages, setError, setSuccess }) {
  const [memories, setMemories] = useState([]);
  const [memorySearchQuery, setMemorySearchQuery] = useState("");
  const [memorySearchResults, setMemorySearchResults] = useState([]);
  const [memoryForm, setMemoryForm] = useState({
    content: "",
    tags: "agentflow,project",
    importance: 3,
  });
  const [memoryLoading, setMemoryLoading] = useState(false);
  const [memorySecondaryLoading, setMemorySecondaryLoading] = useState(false);

  async function fetchMemories() {
    const data = await apiRequest("/memory?limit=50");
    const normalized = Array.isArray(data) ? data : [];
    setMemories(normalized);
    return normalized;
  }

  async function addMemory() {
    clearMessages();

    if (!memoryForm.content.trim()) {
      setError("Memory content is required.");
      return;
    }

    setMemoryLoading(true);

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
      const memoriesData = await fetchMemories();
      startTransition(() => setMemories(memoriesData));
    } catch (err) {
      setError(err.message);
    } finally {
      setMemoryLoading(false);
    }
  }

  async function searchMemory() {
    clearMessages();

    if (!memorySearchQuery.trim()) {
      setError("Enter a search query first.");
      return;
    }

    setMemorySecondaryLoading(true);

    try {
      const query = encodeURIComponent(memorySearchQuery);
      const data = await apiRequest(`/memory/search?query=${query}&limit=10`);
      setMemorySearchResults(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message);
    } finally {
      setMemorySecondaryLoading(false);
    }
  }

  async function deleteMemory(memoryId) {
    clearMessages();
    setMemorySecondaryLoading(true);

    try {
      if (!window.confirm("Delete this memory? This action cannot be undone.")) {
        setMemorySecondaryLoading(false);
        return;
      }

      await apiRequest(`/memory/${memoryId}`, {
        method: "DELETE",
      });

      setSuccess("Memory deleted successfully.");
      const memoriesData = await fetchMemories();
      startTransition(() => setMemories(memoriesData));
      setMemorySearchResults((previous) =>
        previous.filter((memory) => memory.id !== memoryId)
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setMemorySecondaryLoading(false);
    }
  }

  return {
    memories,
    setMemories,
    memorySearchQuery,
    setMemorySearchQuery,
    memorySearchResults,
    setMemorySearchResults,
    memoryForm,
    setMemoryForm,
    memoryLoading,
    memorySecondaryLoading,
    fetchMemories,
    addMemory,
    searchMemory,
    deleteMemory,
  };
}
