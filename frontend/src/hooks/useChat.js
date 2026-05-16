import { useState } from "react";

export function useChat({ apiRequest, clearMessages, setError, setSuccess }) {
  const [chatInput, setChatInput] = useState(
    "Explain a topic in a simple and practical way."
  );
  const [chatMessages, setChatMessages] = useState([]);
  const [chatModel, setChatModel] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  async function sendChatMessage() {
    clearMessages();

    if (!chatInput.trim()) {
      setError("Enter a message first.");
      return;
    }

    const message = chatInput.trim();
    const userMessage = {
      id: `${Date.now()}-user`,
      role: "user",
      content: message,
    };
    const chronologicalMessages = [...chatMessages].reverse();
    const messages = [...chronologicalMessages, userMessage].map(
      ({ role, content }) => ({ role, content })
    );

    setChatLoading(true);

    try {
      const data = await apiRequest("/chat", {
        method: "POST",
        body: JSON.stringify({ messages }),
      });

      setChatMessages((previous) => [
        {
          id: `${Date.now()}-assistant`,
          role: "assistant",
          content: data.response,
        },
        userMessage,
        ...previous,
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

  return {
    chatInput,
    setChatInput,
    chatMessages,
    setChatMessages,
    chatModel,
    setChatModel,
    chatLoading,
    sendChatMessage,
    clearChat,
  };
}
