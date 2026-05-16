import {
  demoChats,
  primaryButtonClass,
  secondaryButtonClass,
  surfaceClass,
  textareaClass,
} from "../lib/constants";
import { isSubmitShortcut } from "../lib/utils";
import { EmptyState, StructuredText } from "./shared";

export function ChatPlaygroundTab({
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
              Use this for direct model conversation. It does not run the full
              agent system, and it is better for quick drafting, exploration,
              and back-and-forth prompting.
            </p>
          </div>
          {chatModel ? (
            <span className="rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-300">
              {chatModel}
            </span>
          ) : null}
        </div>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-emerald-300">
              Best For
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-200">
              Fast drafts, asking follow-up questions, testing prompts, and
              iterating on an idea without saving a full workflow.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800/80 bg-slate-950/70 p-4">
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-slate-400">
              What It Skips
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              No supervisor routing, no tool loop, no reviewer scoring, and no
              workflow trace timeline.
            </p>
          </div>
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
          onChange={(event) => setChatInput(event.target.value)}
          onKeyDown={(event) => {
            if (isSubmitShortcut(event) && !chatLoading && chatInput.trim()) {
              event.preventDefault();
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

        {chatMessages.length === 0 ? (
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
        ) : null}

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
                  {message.role === "user" ? (
                    <button
                      type="button"
                      onClick={() => reuseTask(message.content)}
                      className="text-xs text-slate-400 transition hover:text-cyan-200"
                    >
                      Use as Task
                    </button>
                  ) : null}
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
