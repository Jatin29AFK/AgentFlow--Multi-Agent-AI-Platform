import {
  inputClass,
  primaryButtonClass,
  surfaceClass,
  textareaClass,
} from "../lib/constants";
import { EmptyState, MemoryCard } from "./shared";

export function MemoryTab({
  memories,
  memoryForm,
  setMemoryForm,
  addMemory,
  memorySearchQuery,
  setMemorySearchQuery,
  searchMemory,
  memorySearchResults,
  deleteMemory,
  loading,
  secondaryLoading,
}) {
  const shownSearchResults = memorySearchResults.length > 0;

  return (
    <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
      <section className="space-y-6">
        <div className={`${surfaceClass} p-6`}>
          <h2 className="text-xl font-semibold">Add Memory</h2>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Use this to manually teach AgentFlow useful long-term information,
            such as your style preference, project tech stack, or resume
            preferences.
          </p>

          <textarea
            value={memoryForm.content}
            onChange={(event) =>
              setMemoryForm((previous) => ({
                ...previous,
                content: event.target.value,
              }))
            }
            rows={5}
            className={`${textareaClass} mt-4`}
            placeholder="Example: User prefers simple, human-sounding resume bullets with measurable impact."
          />

          <input
            value={memoryForm.tags}
            onChange={(event) =>
              setMemoryForm((previous) => ({
                ...previous,
                tags: event.target.value,
              }))
            }
            className={`${inputClass} mt-3`}
            placeholder="tags comma separated"
          />

          <div className="mt-3">
            <label className="text-sm text-slate-400">
              Importance: {memoryForm.importance}
            </label>
            <input
              type="range"
              min="1"
              max="5"
              value={memoryForm.importance}
              onChange={(event) =>
                setMemoryForm((previous) => ({
                  ...previous,
                  importance: event.target.value,
                }))
              }
              className="mt-2 w-full accent-cyan-400"
            />
          </div>

          <button
            onClick={addMemory}
            disabled={loading}
            className={`${primaryButtonClass} mt-4`}
          >
            {loading ? "Saving..." : "Add Memory"}
          </button>
        </div>

        <div className={`${surfaceClass} p-6`}>
          <h2 className="text-xl font-semibold">Search Memory</h2>
          <p className="mt-2 text-sm text-slate-400">
            Search now uses semantic relevance, so related memories can match
            even when the exact words differ.
          </p>

          <div className="mt-4 flex gap-3">
            <input
              value={memorySearchQuery}
              onChange={(event) => setMemorySearchQuery(event.target.value)}
              className={inputClass}
              placeholder="Search memory..."
            />
            <button
              onClick={searchMemory}
              disabled={secondaryLoading}
              className={primaryButtonClass}
            >
              Search
            </button>
          </div>

          {shownSearchResults ? (
            <div className="mt-4 space-y-3">
              {memorySearchResults.map((memory) => (
                <MemoryCard
                  key={memory.id}
                  memory={memory}
                  deleteMemory={deleteMemory}
                  showSearchInfo
                />
              ))}
            </div>
          ) : null}

          {!shownSearchResults && memorySearchQuery.trim() && !secondaryLoading ? (
            <p className="mt-4 text-sm text-slate-500">
              Search to see matching memories and relevance scores here.
            </p>
          ) : null}
        </div>
      </section>

      <section className={`${surfaceClass} p-6`}>
        <h2 className="text-xl font-semibold">Saved Memories</h2>
        <p className="mt-2 text-sm text-slate-400">
          These memories are stored locally, embedded on save, and retrieved
          before each workflow run.
        </p>

        <div className="mt-4 space-y-3">
          {memories.length === 0 ? (
            <EmptyState
              title="No memories saved yet"
              description="Add a few stable facts, preferences, or project details so AgentFlow can reuse them in future tasks."
            />
          ) : null}

          {memories.map((memory) => (
            <MemoryCard
              key={memory.id}
              memory={memory}
              deleteMemory={deleteMemory}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
