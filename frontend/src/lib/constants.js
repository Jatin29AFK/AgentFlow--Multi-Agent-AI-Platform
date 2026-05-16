export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000";

export const surfaceClass =
  "rounded-3xl border border-slate-800/80 bg-slate-900/65 shadow-[0_24px_80px_rgba(2,6,23,0.45)] backdrop-blur-xl";

export const mutedSurfaceClass =
  "rounded-2xl border border-slate-800/70 bg-slate-950/75 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] backdrop-blur";

export const inputClass =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-950/90 px-4 py-3 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20";

export const textareaClass =
  "w-full rounded-2xl border border-slate-700/70 bg-slate-950/90 p-4 text-sm text-slate-100 outline-none transition duration-200 placeholder:text-slate-500 focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20";

export const primaryButtonClass =
  "rounded-2xl bg-gradient-to-r from-cyan-400 via-sky-400 to-blue-500 px-5 py-2.5 font-semibold text-slate-950 shadow-[0_12px_30px_rgba(34,211,238,0.25)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(34,211,238,0.3)] disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const secondaryButtonClass =
  "rounded-2xl border border-slate-700/80 bg-slate-900/80 px-4 py-2.5 text-sm font-semibold text-slate-200 transition duration-200 hover:-translate-y-0.5 hover:border-cyan-400/70 hover:text-cyan-200 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0";

export const tabs = [
  { id: "run", label: "Run Agent" },
  { id: "history", label: "Run History" },
  { id: "reviews", label: "Human Reviews" },
  { id: "memory", label: "Memory" },
  { id: "chat", label: "Chat Playground" },
];

export const taskSuggestions = [
  "Summarize this topic in clear bullet points.",
  "Draft a concise professional email reply.",
  "Explain a technical concept in simple language.",
  "Create a step-by-step action plan for this task.",
];

export const demoWorkflows = [
  {
    title: "Summaries",
    prompt: "Summarize this article in 5 short bullet points.",
  },
  {
    title: "Writing",
    prompt: "Draft a polite follow-up email after an interview.",
  },
  {
    title: "Planning",
    prompt: "Break this project into a clear weekly action plan.",
  },
];

export const demoChats = [
  {
    title: "Explainer",
    prompt: "Explain REST APIs like I am a beginner developer.",
  },
  {
    title: "Refinement",
    prompt: "Rewrite this paragraph to sound more confident and concise.",
  },
  {
    title: "Brainstorm",
    prompt: "Give me 5 practical feature ideas for a productivity app.",
  },
];
