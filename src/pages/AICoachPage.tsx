import { useState, useRef, useEffect } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { WhatsAppChat } from "@/components/WhatsAppChat";
import { Sparkles, Send, Bot, User, BookOpen, Lightbulb, TrendingUp } from "lucide-react";
import { chatWithAI, type ChatResponse } from "@/lib/clarity-ai-api";

interface Message {
  role: "user" | "assistant";
  content: string;
  sources?: ChatResponse["sources"];
}

const suggestedPrompts = [
  { icon: BookOpen, text: "What patterns do you see in my recent entries?" },
  { icon: Lightbulb, text: "Help me understand my emotional triggers" },
  { icon: TrendingUp, text: "How has my mood changed over the past month?" },
];

export default function AICoachPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Welcome to your AI Coach. I can help you understand your emotional patterns, reflect on your growth, and gain clarity from your diary entries. What would you like to explore?",
    },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

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
        { role: "assistant", content: res.answer, sources: res.sources },
      ]);
    } catch (err: unknown) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "I'm having trouble connecting to the AI backend. Please make sure the clarity-ai server is running, or try again later.",
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="relative z-0 min-h-screen bg-transparent overflow-x-hidden">
      <Navbar />

      <div className="pt-24 pb-12 px-4">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
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
            <p className="text-muted-foreground max-w-lg mx-auto">
              Chat with an AI that understands your journey. Ask about patterns, emotions,
              growth, or anything on your mind.
            </p>
          </div>

          {/* Chat Container */}
          <div className="glass rounded-2xl border border-white/10 overflow-hidden">
            {/* Messages */}
            <div className="h-[calc(100vh-22rem)] overflow-y-auto p-6 space-y-4">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-5 py-3 ${
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
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    </div>
                    {msg.sources && msg.sources.length > 0 && (
                      <details className="mt-2">
                        <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground/70">
                          Sources ({msg.sources.length})
                        </summary>
                        <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                          {msg.sources.map((s, j) => (
                            <div
                              key={j}
                              className="text-xs text-muted-foreground bg-white/5 rounded p-2"
                            >
                              {s.filename && <span className="block">📄 {s.filename}</span>}
                              {s.text && <p className="line-clamp-2 mt-0.5">"{s.text}"</p>}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </div>
                </div>
              ))}
              {sending && (
                <div className="flex justify-start">
                  <div className="bg-white/5 border border-white/10 rounded-2xl px-5 py-3">
                    <div className="flex items-center gap-2">
                      <Bot className="w-4 h-4 text-primary" />
                      <span className="flex gap-1">
                        <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Suggested Prompts */}
            {messages.length === 1 && (
              <div className="px-6 pb-4">
                <div className="flex flex-wrap gap-2">
                  {suggestedPrompts.map((prompt, i) => {
                    const Icon = prompt.icon;
                    return (
                      <button
                        key={i}
                        onClick={() => handleSend(prompt.text)}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-muted-foreground hover:text-foreground hover:bg-white/10 transition-all"
                      >
                        <Icon className="w-3.5 h-3.5" />
                        {prompt.text}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="p-4 border-t border-white/10">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSend();
                }}
                className="flex gap-2"
              >
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about your emotional patterns, growth, or anything..."
                  disabled={sending}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary transition-colors disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={sending || !input.trim()}
                  className="px-5 py-3 rounded-xl bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <WhatsAppChat />
    </main>
  );
}