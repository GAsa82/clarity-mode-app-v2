import { useState, useRef, useEffect, type ChangeEvent, type DragEvent } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import {
  healthCheck,
  uploadDiary,
  uploadFile,
  chatWithAI,
  getDashboard,
  getPatterns,
  getProviderStats,
  getProviderStatus,
  type HealthStatus,
  type DashboardStats,
  type ChatResponse,
  type ProviderStats,
} from "@/lib/clarity-ai-api";

// ─── Icons (inline to avoid dependency issues) ──────────────────────────────
const icons = {
  sparkles: "✨",
  brain: "🧠",
  upload: "📤",
  chart: "📊",
  chat: "💬",
  bot: "🤖",
  user: "👤",
  check: "✅",
  warning: "⚠️",
  error: "❌",
  lightbulb: "💡",
  heart: "❤️",
  clock: "⏱️",
  coin: "🪙",
  link: "🔗",
  graph: "📈",
};

// ─── Tab Navigation ──────────────────────────────────────────────────────────

type Tab = "chat" | "upload" | "insights" | "providers";

const tabs: { id: Tab; label: string; icon: string }[] = [
  { id: "chat", label: "AI Chat", icon: "💬" },
  { id: "upload", label: "Upload Diary", icon: "📤" },
  { id: "insights", label: "Insights", icon: "📊" },
  { id: "providers", label: "AI Engine", icon: "🧠" },
];

// ─── Suggested Prompts ──────────────────────────────────────────────────────

const suggestedPrompts = [
  { icon: "🔍", text: "What emotional patterns do you see in my entries?" },
  { icon: "📈", text: "How has my mood been trending lately?" },
  { icon: "💡", text: "What triggers my anxiety based on what I've written?" },
  { icon: "🔄", text: "Are there recurring themes or topics?" },
  { icon: "🌱", text: "What personal growth patterns do you notice?" },
  { icon: "❤️", text: "What makes me happiest according to my diary?" },
];

// ─── Main Page ───────────────────────────────────────────────────────────────

export default function AIPage() {
  const [activeTab, setActiveTab] = useState<Tab>("chat");
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [healthError, setHealthError] = useState(false);

  useEffect(() => {
    healthCheck()
      .then(setHealth)
      .catch(() => setHealthError(true));
  }, []);

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-medium mb-4">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              {health ? (
                <span>AI Online — {health.checks.providers === "ok" ? health.service : "Limited Mode"}</span>
              ) : healthError ? (
                <span>AI Offline — Start the backend</span>
              ) : (
                <span>Connecting...</span>
              )}
            </div>
            <h1 className="text-4xl md:text-5xl font-bold mb-3">
              Clarity{" "}
              <span className="bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 bg-clip-text text-transparent">
                AI
              </span>
            </h1>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              Your personal diary intelligence. Upload entries, discover emotional patterns,
              and chat with an AI that truly understands your journey.
            </p>
          </div>

          {/* Status Bar */}
          <div className="flex items-center justify-center gap-4 flex-wrap mb-6 text-xs text-muted-foreground">
            {health && (
              <>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${health.checks.chromadb === "ok" ? "bg-green-400" : "bg-red-400"}`} />
                  Vector Store
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${health.checks.embeddings === "ok" ? "bg-green-400" : "bg-red-400"}`} />
                  Embeddings
                </span>
                <span className="flex items-center gap-1">
                  <span className={`w-1.5 h-1.5 rounded-full ${health.checks.providers === "ok" ? "bg-green-400" : "bg-yellow-400"}`} />
                  AI Providers
                </span>
                <span className="text-muted-foreground/50">|</span>
                <span>{icons.clock} {Math.floor((health.uptime_seconds || 0) / 60)}m uptime</span>
                <span>{icons.graph} {health.stats.total_requests} requests</span>
              </>
            )}
          </div>

          {/* Tabs */}
          <div className="flex items-center justify-center gap-2 mb-6 flex-wrap">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-5 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white shadow-lg shadow-emerald-500/25"
                    : "bg-white/5 text-muted-foreground hover:text-foreground hover:bg-white/10 border border-white/10"
                }`}
              >
                <span className="mr-1.5">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="min-h-[600px]">
            {activeTab === "chat" && <ChatTab />}
            {activeTab === "upload" && <UploadTab />}
            {activeTab === "insights" && <InsightsTab />}
            {activeTab === "providers" && <ProvidersTab />}
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHAT TAB
// ═══════════════════════════════════════════════════════════════════════════════

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
  model_used?: string;
  provider_name?: string;
  tokens_in?: number;
  tokens_out?: number;
  latency_ms?: number;
  fallback_occurred?: boolean;
}

function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: `# 👋 Welcome to Clarity AI

I'm your personal diary intelligence assistant. I can help you:

- **Understand emotional patterns** from your diary entries
- **Track personal growth** over time
- **Identify recurring themes** and triggers
- **Provide insights** you might have missed

**To get started:** Upload some diary entries in the Upload tab, then come back here and ask me anything!

Try one of the suggested questions below or type your own.`,
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async (text?: string) => {
    const query = (text || input).trim();
    if (!query || sending) return;

    setInput("");
    setMessages((prev) => [...prev, { role: "user", content: query }]);
    setSending(true);

    try {
      const res = await chatWithAI(query);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: res.answer,
          sources: res.sources,
          model_used: res.model_used,
          provider_name: res.provider_name,
          tokens_in: res.tokens_in,
          tokens_out: res.tokens_out,
          latency_ms: res.latency_ms,
          fallback_occurred: res.fallback_occurred,
        },
      ]);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: `**${icons.error} Error:** ${msg}\n\nMake sure the AI backend is running and try again.`,
        },
      ]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  return (
    <div className="glass rounded-2xl border border-white/10 overflow-hidden flex flex-col h-[calc(100vh-20rem)]">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}>
            <div className={`max-w-[85%] md:max-w-[75%] ${msg.role === "user" ? "order-1" : "order-1"}`}>
              {/* Message bubble */}
              <div
                className={`rounded-2xl px-5 py-3 text-sm leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-r from-emerald-600 to-cyan-600 text-white rounded-br-md"
                    : "bg-white/5 border border-white/10 text-foreground/90 rounded-bl-md"
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-lg mt-0.5 shrink-0">
                    {msg.role === "assistant" ? icons.bot : icons.user}
                  </span>
                  <div className="whitespace-pre-wrap [&_h1]:text-lg [&_h1]:font-bold [&_h2]:text-base [&_h2]:font-semibold [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-4 [&_li]:mb-1">
                    {msg.content}
                  </div>
                </div>
              </div>

              {/* Meta bar: model, tokens, latency */}
              {msg.role === "assistant" && msg.model_used && (
                <div className="flex items-center gap-3 mt-1.5 px-2">
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {icons.brain} {msg.provider_name || "AI"}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {msg.tokens_in ? `${msg.tokens_in}→${msg.tokens_out} tok` : ""}
                  </span>
                  <span className="text-[10px] text-muted-foreground/50 font-mono">
                    {msg.latency_ms ? `${msg.latency_ms.toFixed(0)}ms` : ""}
                  </span>
                  {msg.fallback_occurred && (
                    <span className="text-[10px] text-yellow-400/70 font-mono" title="Fallback provider was used">
                      ⚠ fallback
                    </span>
                  )}
                  {msg.model_used && !msg.model_used.includes("(via") && (
                    <span className="text-[10px] text-muted-foreground/50 font-mono truncate max-w-[200px]">
                      {msg.model_used.length > 30 ? msg.model_used.slice(0, 30) + "..." : msg.model_used}
                    </span>
                  )}
                </div>
              )}

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <details className="mt-1.5 px-2">
                  <summary className="text-[11px] text-muted-foreground/50 cursor-pointer hover:text-foreground/70 transition-colors">
                    {icons.link} {msg.sources.length} diary source{msg.sources.length > 1 ? "s" : ""}
                  </summary>
                  <div className="mt-1.5 space-y-1 max-h-40 overflow-y-auto">
                    {msg.sources.map((s, j) => (
                      <div key={j} className="text-[11px] text-muted-foreground/60 bg-white/[0.03] rounded-lg p-2 border border-white/5">
                        {s.filename && (
                          <span className="text-foreground/60 block mb-0.5 font-medium">
                            📄 {s.filename}
                          </span>
                        )}
                        {s.text && (
                          <p className="line-clamp-2 italic">"{s.text}"</p>
                        )}
                        {s.score !== undefined && (
                          <span className="text-muted-foreground/40 text-[10px]">
                            Relevance: {(s.score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {sending && (
          <div className="flex justify-start">
            <div className="bg-white/5 border border-white/10 rounded-2xl rounded-bl-md px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="text-lg">{icons.bot}</span>
                <div className="flex gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 rounded-full bg-emerald-400/60 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
                <span className="text-xs text-muted-foreground/50">Thinking</span>
              </div>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested prompts (show only at start) */}
      {messages.length <= 1 && !sending && (
        <div className="px-4 md:px-6 pb-2">
          <div className="flex flex-wrap gap-2">
            {suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSend(prompt.text)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-white/[0.06] transition-all hover:border-emerald-500/30"
              >
                <span>{prompt.icon}</span>
                <span className="max-w-[180px] truncate">{prompt.text}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input */}
      <div className="p-4 border-t border-white/10">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSend(); }}
          className="flex gap-2"
        >
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your emotional patterns, growth, or anything..."
            disabled={sending}
            className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground/50 focus:outline-none focus:border-emerald-500/50 transition-colors disabled:opacity-50 text-sm"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition-all font-medium shadow-lg shadow-emerald-500/20"
          >
            {sending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              </span>
            ) : (
              <span className="flex items-center gap-2">
                Send
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
              </span>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPLOAD TAB
// ═══════════════════════════════════════════════════════════════════════════════

function UploadTab() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string; details: Record<string, string> } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (f: File) => {
    const allowed = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".pdf", ".txt"];
    const ext = "." + f.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      setError(`Unsupported: ${ext}. Use: ${allowed.join(", ")}`);
      setFile(null);
      return;
    }
    setFile(f);
    setError(null);
    setResult(null);
  };

  const onChange = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) handleFile(f);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  };

  const onSubmit = async () => {
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    try {
      const r = await uploadFile(file);
      setResult({
        success: r.status === "completed",
        message: r.status === "completed" ? "Diary entry processed successfully!" : r.error || "Upload completed with issues",
        details: {
          "File": r.filename,
          "Status": r.status === "completed" ? "✅ Analyzed" : r.status,
          "Chunks": String(r.chunks_count ?? 0),
          "Preview": r.extracted_text ? r.extracted_text.slice(0, 100) + "..." : "N/A",
        },
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">Upload Diary Entry</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Upload handwritten diary pages (images, PDFs, or text files). Our AI will extract the text,
          analyze emotions and themes, and store everything in the vector database for chat.
        </p>

        {/* Pipeline steps */}
        <div className="grid grid-cols-4 gap-3 mb-8">
          {[
            { step: "1", label: "Upload", icon: "📤", desc: "File received" },
            { step: "2", label: "OCR", icon: "📝", desc: "Text extracted" },
            { step: "3", label: "Analyze", icon: "🧠", desc: "Entities & themes" },
            { step: "4", label: "Vectorize", icon: "💾", desc: "Stored for AI" },
          ].map((s) => (
            <div key={s.step} className="text-center p-3 rounded-xl bg-white/[0.03] border border-white/10">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div className="text-xs font-medium text-foreground/80">{s.label}</div>
              <div className="text-[10px] text-muted-foreground/50">{s.desc}</div>
            </div>
          ))}
        </div>

        {/* Drop zone */}
        <div
          className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all duration-200 ${
            dragOver
              ? "border-emerald-400 bg-emerald-500/10"
              : "border-white/20 hover:border-white/40 hover:bg-white/[0.02]"
          }`}
          onDrop={onDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => inputRef.current?.click()}
        >
          <input
            ref={inputRef}
            type="file"
            accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.txt"
            onChange={onChange}
            className="hidden"
          />
          <div className="text-5xl mb-4">{file ? "📄" : "📁"}</div>
          <p className="text-foreground font-medium text-lg">
            {file ? file.name : "Drop your diary entry here"}
          </p>
          <p className="text-muted-foreground text-sm mt-1">
            {file
              ? `${(file.size / 1024).toFixed(1)} KB — ${file.type || "unknown type"}`
              : "or click to browse — JPG, PNG, PDF, TXT supported"}
          </p>
        </div>

        {/* Action buttons */}
        {file && (
          <div className="mt-4 flex gap-3">
            <button
              onClick={() => { setFile(null); setResult(null); setError(null); }}
              disabled={uploading}
              className="px-4 py-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 disabled:opacity-50 transition-colors text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSubmit}
              disabled={uploading}
              className="flex-1 px-4 py-2.5 rounded-lg bg-gradient-to-r from-emerald-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 disabled:opacity-50 transition-all font-medium shadow-lg shadow-emerald-500/20"
            >
              {uploading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Processing...
                </span>
              ) : (
                "Upload & Analyze"
              )}
            </button>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="mt-4 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
            {icons.error} {error}
          </div>
        )}

        {/* Result */}
        {result && (
          <div className="mt-4 p-5 rounded-xl bg-white/[0.03] border border-emerald-500/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xl">{result.success ? icons.check : icons.warning}</span>
              <span className={`font-semibold ${result.success ? "text-emerald-400" : "text-yellow-400"}`}>
                {result.message}
              </span>
            </div>
            <div className="space-y-1.5">
              {Object.entries(result.details).map(([key, val]) => (
                <div key={key} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground/60 w-16 shrink-0">{key}:</span>
                  <span className="text-foreground/80 font-mono text-xs break-all">{val}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// INSIGHTS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function InsightsTab() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [patterns, setPatterns] = useState<{
    period: string;
    patterns: { type: string; data: Record<string, number> }[];
    emotional_trends: Record<string, unknown>;
    insights: string[];
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getDashboard(), getPatterns()])
      .then(([s, p]) => { setStats(s); setPatterns(p); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass rounded-2xl border border-white/10 p-12 flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading insights...</div></div>;
  if (error) return (
    <div className="glass rounded-2xl border border-white/10 p-12">
      <div className="max-w-md mx-auto text-center">
        <div className="text-4xl mb-4">📊</div>
        <p className="text-red-400 mb-2">{icons.error} {error}</p>
        <p className="text-muted-foreground text-sm">Upload some diary entries first to see insights!</p>
      </div>
    </div>
  );

  const hasData = stats && stats.total_entries > 0;

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
      {!hasData ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📊</div>
          <h3 className="text-xl font-bold mb-2">No Data Yet</h3>
          <p className="text-muted-foreground">Upload diary entries to unlock personalized insights about your emotional patterns and growth.</p>
        </div>
      ) : (
        <div className="space-y-6">
          <h2 className="text-2xl font-bold">Your Diary Insights</h2>

          {/* Summary cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20">
              <p className="text-xs text-muted-foreground mb-1">Total Entries</p>
              <p className="text-3xl font-bold text-emerald-400">{stats?.total_entries ?? 0}</p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20">
              <p className="text-xs text-muted-foreground mb-1">Chunks</p>
              <p className="text-3xl font-bold text-cyan-400">{stats?.total_chunks ?? 0}</p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-purple-500/10 to-purple-500/5 border border-purple-500/20">
              <p className="text-xs text-muted-foreground mb-1">Top Emotion</p>
              <p className="text-xl font-bold text-purple-400">{stats?.top_emotions?.[0]?.emotion || "—"}</p>
            </div>
            <div className="p-5 rounded-xl bg-gradient-to-br from-orange-500/10 to-orange-500/5 border border-orange-500/20">
              <p className="text-xs text-muted-foreground mb-1">Top Theme</p>
              <p className="text-xl font-bold text-orange-400">{stats?.top_themes?.[0]?.theme || "—"}</p>
            </div>
          </div>

          {/* Emotions + Themes */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{icons.heart} Top Emotions</h3>
              {stats?.top_emotions?.length ? (
                <div className="space-y-2">
                  {stats.top_emotions.map((e) => (
                    <div key={e.emotion} className="flex items-center gap-3">
                      <span className="text-sm flex-1 text-foreground/80">{e.emotion}</span>
                      <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-gradient-to-r from-emerald-400 to-cyan-400" style={{ width: `${Math.min(100, (e.count / stats.top_emotions[0].count) * 100)}%` }} />
                      </div>
                      <span className="text-xs text-muted-foreground/60 w-8 text-right">{e.count}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No emotions detected yet.</p>
              )}
            </div>

            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">🎯 Top Themes</h3>
              {stats?.top_themes?.length ? (
                <div className="flex flex-wrap gap-2">
                  {stats.top_themes.map((t) => (
                    <span key={t.theme} className="px-3 py-1.5 rounded-full bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/20 text-cyan-300 text-sm">
                      {t.theme} <span className="text-cyan-400 ml-1">{t.count}</span>
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">No themes detected yet.</p>
              )}
            </div>
          </div>

          {/* Patterns & Insights */}
          {patterns && (
            <div className="space-y-4">
              {patterns.patterns.length > 0 && (
                <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
                  <h3 className="text-sm font-semibold text-foreground/80 mb-3">🔄 Recurring Patterns</h3>
                  {patterns.patterns.map((p, i) => (
                    <div key={i} className="text-sm text-foreground/80">
                      <span className="font-medium capitalize">{p.type.replace(/_/g, " ")}:</span>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {Object.entries(p.data).map(([key, val]) => (
                          <span key={key} className="px-2 py-1 rounded bg-white/5 text-foreground/70 text-xs">{key}: {val}</span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {patterns.insights.length > 0 && (
                <div className="p-5 rounded-xl bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 border border-emerald-500/10">
                  <h3 className="text-sm font-semibold text-emerald-400 mb-3">{icons.lightbulb} AI Insights</h3>
                  <ul className="space-y-2">
                    {patterns.insights.map((insight, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-foreground/80">{insight}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Recent entries */}
          {stats?.recent_entries && stats.recent_entries.length > 0 && (
            <div className="p-5 rounded-xl bg-white/[0.03] border border-white/10">
              <h3 className="text-sm font-semibold text-foreground/80 mb-3">{icons.clock} Recent Entries</h3>
              <div className="space-y-2">
                {stats.recent_entries.map((entry) => (
                  <div key={entry.id} className="p-3 rounded-lg bg-white/5 border border-white/10 text-sm">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-foreground font-medium">{entry.filename}</span>
                      <span className="text-muted-foreground text-xs">{entry.uploaded_at}</span>
                    </div>
                    <p className="text-muted-foreground text-xs line-clamp-2">{entry.text || "No preview"}</p>
                    {entry.emotions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {entry.emotions.map((em) => (
                          <span key={em} className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-300 text-[10px]">{em}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════════
// PROVIDERS TAB
// ═══════════════════════════════════════════════════════════════════════════════

function ProvidersTab() {
  const [providerStats, setProviderStats] = useState<Record<string, ProviderStats> | null>(null);
  const [providerStatus, setProviderStatus] = useState<{
    providers: { name: string; model: string; enabled: boolean; is_free: boolean; priority: number }[];
    chain_description: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getProviderStats(), getProviderStatus()])
      .then(([stats, status]) => { setProviderStats(stats); setProviderStatus(status); })
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="glass rounded-2xl border border-white/10 p-12 flex items-center justify-center"><div className="animate-pulse text-muted-foreground">Loading AI engine status...</div></div>;
  if (error) return <div className="glass rounded-2xl border border-white/10 p-12 text-center text-red-400">{icons.error} {error}</div>;

  return (
    <div className="glass rounded-2xl border border-white/10 p-6 md:p-8">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold mb-2">AI Engine</h2>
        <p className="text-muted-foreground text-sm mb-6">
          Clarity AI uses a provider-agnostic layer with automatic fallback. Free providers are tried first,
          and if one fails the next in chain is used automatically.
        </p>

        {/* Fallback chain visualization */}
        {providerStatus && (
          <div className="mb-8 p-5 rounded-xl bg-white/[0.03] border border-white/10">
            <h3 className="text-sm font-semibold text-foreground/80 mb-3">🔗 Fallback Chain</h3>
            <div className="flex items-center gap-2 flex-wrap text-xs">
              {providerStatus.providers
                .sort((a, b) => a.priority - b.priority)
                .map((p, i) => (
                  <span key={p.name} className="flex items-center gap-1.5">
                    <span className={`px-2.5 py-1.5 rounded-lg ${
                      p.enabled
                        ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                        : "bg-white/5 border border-white/10 text-muted-foreground/50"
                    }`}>
                      <span className={p.is_free ? "text-yellow-400 mr-1" : ""}>{p.is_free ? "🆓" : "💳"}</span>
                      {p.name}
                    </span>
                    {i < providerStatus.providers.length - 1 && (
                      <span className="text-muted-foreground/30">→</span>
                    )}
                  </span>
                ))}
            </div>
            <p className="text-[10px] text-muted-foreground/40 mt-2">{providerStatus.chain_description}</p>
          </div>
        )}

        {/* Provider cards */}
        <div className="grid gap-4">
          {providerStats && Object.entries(providerStats)
            .sort(([, a], [, b]) => a.priority - b.priority)
            .map(([name, stat]) => {
              const isActive = stat.active && stat.enabled;
              return (
                <div key={name} className={`p-4 rounded-xl border transition-all ${
                  isActive ? "bg-emerald-500/[0.03] border-emerald-500/20" : "bg-white/[0.02] border-white/10 opacity-60"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${isActive ? "bg-emerald-400 animate-pulse" : "bg-muted-foreground/30"}`} />
                      <span className="font-semibold text-sm">{name}</span>
                      {stat.is_free && <span className="px-1.5 py-0.5 rounded text-[10px] bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">FREE</span>}
                      {!stat.enabled && <span className="px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-400 border border-red-500/20">NO KEY</span>}
                    </div>
                    <span className="text-xs text-muted-foreground/50 font-mono">Priority {stat.priority}</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    <div>
                      <span className="text-muted-foreground/50">Model</span>
                      <p className="text-foreground/80 font-mono truncate">{stat.model}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Requests</span>
                      <p className="text-foreground/80">{stat.total_requests}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Error Rate</span>
                      <p className={stat.error_rate > 0.1 ? "text-red-400" : "text-emerald-400"}>
                        {(stat.error_rate * 100).toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Avg Latency</span>
                      <p className="text-foreground/80">{stat.avg_latency_ms.toFixed(0)}ms</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Tokens In</span>
                      <p className="text-foreground/80">{stat.tokens_in.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Tokens Out</span>
                      <p className="text-foreground/80">{stat.tokens_out.toLocaleString()}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Failures</span>
                      <p className={stat.consecutive_failures > 0 ? "text-red-400" : "text-emerald-400"}>
                        {stat.consecutive_failures}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground/50">Status</span>
                      <p className={stat.active ? "text-emerald-400" : "text-red-400"}>
                        {stat.active ? "Active" : "Disabled"}
                      </p>
                    </div>
                  </div>
                  {stat.last_error && (
                    <p className="mt-2 text-[11px] text-red-400/70 bg-red-500/5 rounded p-2">
                      Last error: {stat.last_error}
                    </p>
                  )}
                </div>
              );
            })}
        </div>

        {/* Summary */}
        {providerStats && (
          <div className="mt-6 p-4 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-muted-foreground/60">
            <p className="flex items-center gap-4 flex-wrap">
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> Active providers</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-yellow-400" /> Free tier</span>
              <span className="flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> Not configured</span>
              <span className="flex items-center gap-1">{icons.clock} Stats reset daily</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}