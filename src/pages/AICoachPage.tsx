import { useState, useRef, useEffect, useCallback } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import {
  Sparkles, Send, Bot, User, BookOpen, TrendingUp,
  Heart, Target, Brain, RefreshCw, Copy, Trash2, ChevronDown,
  ChevronUp, Zap,
} from "lucide-react";
import {
  chatWithAI, getDailyReflection, getProactiveInsights,
  type ChatResponse,
} from "@/lib/clarity-ai-api";
import { PremiumGate } from "@/components/PremiumGate";

// ─── Types ───────────────────────────────────────────────────────────────────

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
  model?: string;
  latency?: number;
  timestamp: number;
}

// ─── Markdown renderer ───────────────────────────────────────────────────────

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: string[] = [];
  let orderedBuf: string[] = [];
  let key = 0;

  const flushList = () => {
    if (listBuf.length) {
      nodes.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-2">
          {listBuf.map((item, i) => (
            <li key={i} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listBuf = [];
    }
    if (orderedBuf.length) {
      nodes.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1 my-2">
          {orderedBuf.map((item, i) => (
            <li key={i} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      orderedBuf = [];
    }
  };

  for (const line of lines) {
    const bulletMatch = line.match(/^[-*•]\s+(.*)/);
    const orderedMatch = line.match(/^\d+\.\s+(.*)/);

    if (bulletMatch) {
      flushOrdered();
      listBuf.push(bulletMatch[1]);
    } else if (orderedMatch) {
      flushList2();
      orderedBuf.push(orderedMatch[1]);
    } else {
      flushList();
      if (line.trim() === "") {
        nodes.push(<div key={key++} className="h-2" />);
      } else if (line.startsWith("### ")) {
        nodes.push(<p key={key++} className="text-sm font-semibold mt-3 mb-1 text-primary/90">{inlineMarkdown(line.slice(4))}</p>);
      } else if (line.startsWith("## ")) {
        nodes.push(<p key={key++} className="text-sm font-bold mt-3 mb-1">{inlineMarkdown(line.slice(3))}</p>);
      } else {
        nodes.push(<p key={key++} className="text-sm leading-relaxed">{inlineMarkdown(line)}</p>);
      }
    }
  }
  flushList();

  function flushList2() {
    if (listBuf.length) {
      nodes.push(
        <ul key={key++} className="list-disc pl-5 space-y-1 my-2">
          {listBuf.map((item, i) => (
            <li key={i} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ul>
      );
      listBuf = [];
    }
  }
  function flushOrdered() {
    if (orderedBuf.length) {
      nodes.push(
        <ol key={key++} className="list-decimal pl-5 space-y-1 my-2">
          {orderedBuf.map((item, i) => (
            <li key={i} className="text-sm">{inlineMarkdown(item)}</li>
          ))}
        </ol>
      );
      orderedBuf = [];
    }
  }

  return <>{nodes}</>;
}

function inlineMarkdown(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={k++}>{text.slice(last, m.index)}</span>);
    if (m[2]) parts.push(<strong key={k++} className="font-semibold">{m[2]}</strong>);
    else if (m[3]) parts.push(<em key={k++} className="italic">{m[3]}</em>);
    else if (m[4]) parts.push(<code key={k++} className="bg-white/10 rounded px-1 font-mono text-xs">{m[4]}</code>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={k++}>{text.slice(last)}</span>);
  return <>{parts}</>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

const PROMPT_CATEGORIES = [
  {
    label: "Patterns",
    icon: TrendingUp,
    color: "text-blue-400",
    prompts: [
      "What emotional patterns do you see across my entries?",
      "Am I repeating any self-limiting thoughts?",
    ],
  },
  {
    label: "Emotions",
    icon: Heart,
    color: "text-rose-400",
    prompts: [
      "Help me understand my emotional triggers",
      "Why do I feel stuck even when things are going well?",
    ],
  },
  {
    label: "Growth",
    icon: Sparkles,
    color: "text-purple-400",
    prompts: [
      "How have I grown in the past few months?",
      "What strengths am I not using fully?",
    ],
  },
  {
    label: "Goals",
    icon: Target,
    color: "text-emerald-400",
    prompts: [
      "Help me identify what I truly want",
      "What's holding me back from my goals?",
    ],
  },
  {
    label: "Mind",
    icon: Brain,
    color: "text-amber-400",
    prompts: [
      "How can I build a calmer mind?",
      "What thinking habits do I need to change?",
    ],
  },
];

const THINKING_MESSAGES = [
  "Reading your diary...",
  "Finding patterns...",
  "Reflecting deeply...",
  "Connecting the dots...",
  "Crafting insights...",
];

const STORAGE_KEY = "clarity_chat_history";

// ─── Component ───────────────────────────────────────────────────────────────

export default function AICoachPage() {
  const { session } = useAuth();
  const [messages, setMessages] = useState<Message[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {}
    return [
      {
        id: "welcome",
        role: "assistant",
        content:
          "Welcome to your AI Coach. I can help you understand your emotional patterns, reflect on your growth, and gain clarity — whether or not you've uploaded diary entries.\n\nWhat would you like to explore today?",
        timestamp: Date.now(),
      },
    ];
  });
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [thinkingMsg, setThinkingMsg] = useState(THINKING_MESSAGES[0]);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const [activeCategory, setActiveCategory] = useState(0);
  const [insight, setInsight] = useState<string | null>(null);
  const [loadingInsight, setLoadingInsight] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist chat
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages.slice(-40)));
    } catch {}
  }, [messages]);

  // Scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, sending]);

  // Rotate thinking messages
  useEffect(() => {
    if (sending) {
      let i = 0;
      thinkingInterval.current = setInterval(() => {
        i = (i + 1) % THINKING_MESSAGES.length;
        setThinkingMsg(THINKING_MESSAGES[i]);
      }, 1800);
    } else {
      if (thinkingInterval.current) clearInterval(thinkingInterval.current);
    }
    return () => { if (thinkingInterval.current) clearInterval(thinkingInterval.current); };
  }, [sending]);

  // Load proactive insight once
  useEffect(() => {
    setLoadingInsight(true);
    getProactiveInsights()
      .then((r) => setInsight(r.insight))
      .catch(() => setInsight(null))
      .finally(() => setLoadingInsight(false));
  }, []);

  const handleSend = useCallback(async (text?: string) => {
    const query = (text || input).trim();
    if (!query || sending) return;

    setInput("");
    setShowSuggestions(false);
    const userMsg: Message = { id: `u${Date.now()}`, role: "user", content: query, timestamp: Date.now() };
    setMessages((prev) => [...prev, userMsg]);
    setSending(true);

    try {
      const res = await chatWithAI(query, 10, session?.access_token ?? undefined);
      const botMsg: Message = {
        id: `a${Date.now()}`,
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        model: res.model_used,
        latency: res.latency_ms,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `err${Date.now()}`,
          role: "assistant",
          content: "I'm having trouble reaching the AI engine right now. It may be waking up — please wait 30 seconds and try again.",
          timestamp: Date.now(),
        },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [input, sending]);

  const handleDailyReflect = async () => {
    setSending(true);
    setShowSuggestions(false);
    try {
      const r = await getDailyReflection();
      const botMsg: Message = {
        id: `r${Date.now()}`,
        role: "assistant",
        content: `**Today's Reflection Prompt:**\n\n${r.prompt}\n\n*Take 5–10 minutes to journal your answer. I'm here when you're ready to discuss.*`,
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      // silent
    } finally {
      setSending(false);
    }
  };

  const handleClear = () => {
    setMessages([
      {
        id: "welcome",
        role: "assistant",
        content: "Conversation cleared. I'm here whenever you're ready to reflect.",
        timestamp: Date.now(),
      },
    ]);
    setShowSuggestions(true);
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(id);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const toggleSources = (id: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const currentPrompts = PROMPT_CATEGORIES[activeCategory].prompts;

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />
      <PremiumGate feature="AI Coach">
        <div className="pt-24 pb-12 px-4">
          <div className="max-w-3xl mx-auto">

            {/* Header */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium mb-4">
                <Sparkles className="w-4 h-4" />
                AI Coach
              </div>
              <h1 className="text-3xl md:text-4xl font-bold mb-3">
                Your Personal{" "}
                <span className="bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">
                  Clarity Coach
                </span>
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto text-sm">
                Understands your diary. Spots your patterns. Helps you grow.
              </p>
            </div>

            {/* Proactive insight card */}
            {(insight || loadingInsight) && (
              <div className="mb-4 px-4 py-3 rounded-xl bg-primary/5 border border-primary/20 flex items-start gap-3">
                <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {loadingInsight ? "Analysing your patterns…" : insight}
                </p>
              </div>
            )}

            {/* Chat container */}
            <div className="glass rounded-2xl border border-white/10 overflow-hidden">

              {/* Toolbar */}
              <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                <div className="flex items-center gap-2">
                  <Bot className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-muted-foreground">Clarity Coach</span>
                  <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary">AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDailyReflect}
                    disabled={sending}
                    title="Get today's reflection prompt"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all disabled:opacity-40"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Daily Reflect
                  </button>
                  <button
                    onClick={handleClear}
                    title="Clear conversation"
                    className="p-1.5 rounded-lg bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="h-[calc(100vh-28rem)] min-h-[320px] overflow-y-auto p-5 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} group`}
                  >
                    <div className={`max-w-[88%] ${msg.role === "user" ? "" : "w-full"}`}>
                      <div
                        className={`rounded-2xl px-4 py-3 ${
                          msg.role === "user"
                            ? "bg-primary text-primary-foreground"
                            : "bg-white/5 border border-white/10"
                        }`}
                      >
                        <div className="flex items-start gap-2">
                          {msg.role === "assistant" && (
                            <Bot className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                          )}
                          {msg.role === "user" && (
                            <User className="w-4 h-4 text-primary-foreground/70 mt-0.5 shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            {msg.role === "assistant"
                              ? renderMarkdown(msg.content)
                              : <p className="text-sm">{msg.content}</p>
                            }
                          </div>
                        </div>

                        {/* Sources */}
                        {msg.sources && msg.sources.length > 0 && (
                          <div className="mt-2 pl-6">
                            <button
                              onClick={() => toggleSources(msg.id)}
                              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground/70 transition-colors"
                            >
                              <BookOpen className="w-3 h-3" />
                              {msg.sources.length} source{msg.sources.length > 1 ? "s" : ""}
                              {expandedSources.has(msg.id)
                                ? <ChevronUp className="w-3 h-3" />
                                : <ChevronDown className="w-3 h-3" />
                              }
                            </button>
                            {expandedSources.has(msg.id) && (
                              <div className="mt-2 space-y-1 max-h-36 overflow-y-auto">
                                {msg.sources.map((s, j) => (
                                  <div key={j} className="text-xs text-muted-foreground bg-white/5 rounded-lg p-2">
                                    {s.filename && (
                                      <span className="flex items-center gap-1 font-medium text-foreground/60 mb-0.5">
                                        📄 {s.filename}
                                        {(s as any).relevance > 0 && (
                                          <span className="ml-auto text-primary/60">
                                            {Math.round((s as any).relevance * 100)}% match
                                          </span>
                                        )}
                                      </span>
                                    )}
                                    {s.text && <p className="line-clamp-2 italic">"{s.text}"</p>}
                                    {(s as any).emotions && (
                                      <p className="mt-0.5 text-primary/60">
                                        Emotions: {(s as any).emotions}
                                      </p>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Message actions */}
                      {msg.role === "assistant" && (
                        <div className="flex items-center gap-2 mt-1 pl-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleCopy(msg.id, msg.content)}
                            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                          >
                            <Copy className="w-3 h-3" />
                            {copied === msg.id ? "Copied!" : "Copy"}
                          </button>
                          {msg.model && (
                            <span className="text-xs text-muted-foreground/40">
                              · {msg.model.split(" ")[0]}
                            </span>
                          )}
                          {msg.latency && (
                            <span className="text-xs text-muted-foreground/40">
                              · {(msg.latency / 1000).toFixed(1)}s
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* Thinking indicator */}
                {sending && (
                  <div className="flex justify-start">
                    <div className="bg-white/5 border border-white/10 rounded-2xl px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Bot className="w-4 h-4 text-primary" />
                        <span className="text-xs text-muted-foreground animate-pulse">{thinkingMsg}</span>
                        <span className="flex gap-1 ml-1">
                          {[0, 150, 300].map((d) => (
                            <span
                              key={d}
                              className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce"
                              style={{ animationDelay: `${d}ms` }}
                            />
                          ))}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Suggestions */}
              {showSuggestions && messages.length <= 2 && (
                <div className="px-5 pb-3 space-y-2">
                  {/* Category tabs */}
                  <div className="flex gap-1.5 flex-wrap">
                    {PROMPT_CATEGORIES.map((cat, i) => {
                      const Icon = cat.icon;
                      return (
                        <button
                          key={i}
                          onClick={() => setActiveCategory(i)}
                          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs transition-all ${
                            activeCategory === i
                              ? "bg-primary/20 border border-primary/30 text-primary"
                              : "bg-white/5 border border-white/10 text-muted-foreground hover:bg-white/10"
                          }`}
                        >
                          <Icon className={`w-3 h-3 ${activeCategory === i ? "text-primary" : cat.color}`} />
                          {cat.label}
                        </button>
                      );
                    })}
                  </div>
                  {/* Prompts for active category */}
                  <div className="flex flex-wrap gap-2">
                    {currentPrompts.map((text, i) => (
                      <button
                        key={i}
                        onClick={() => handleSend(text)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all text-left"
                      >
                        {text}
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
                  <div className="relative flex-1">
                    <input
                      ref={inputRef}
                      type="text"
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Ask about your patterns, emotions, or anything on your mind…"
                      disabled={sending}
                      maxLength={500}
                      className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50 pr-12 text-sm"
                    />
                    {input.length > 350 && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground/60">
                        {500 - input.length}
                      </span>
                    )}
                  </div>
                  <button
                    type="submit"
                    disabled={sending || !input.trim()}
                    className="px-4 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors shrink-0"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
                <p className="text-xs text-muted-foreground/40 mt-2 text-center">
                  Works best with uploaded diary entries · Answers general questions too
                </p>
              </div>
            </div>
          </div>
        </div>
      </PremiumGate>
      <Footer />
      <WhatsAppChat />
    </main>
  );
}
