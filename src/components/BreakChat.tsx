import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, Send, ThumbsUp, Ban, Zap, Sparkles } from "lucide-react";
import { getAnonymousUsername } from "@/lib/focus-streak";

type ChatMessage = {
  id: string;
  user: string;
  text: string;
  time: number;
};

const quickReactions = [
  { emoji: "🔥", label: "Locked in" },
  { emoji: "😮‍💨", label: "Exhausted" },
  { emoji: "💪", label: "Productive" },
  { emoji: "✨", label: "Need motivation" },
  { emoji: "🧠", label: "Brain full" },
  { emoji: "🎯", label: "On target" },
];

const breakMessages = [
  "How's your focus going?",
  "Taking a quick break too?",
  "One more session after this 💪",
  "You've got this. Keep going.",
  "The silence is golden in here.",
  "Great session so far!",
  "Stay consistent. It pays off.",
  "We're all in this together.",
  "Reset. Refocus. Repeat.",
  "Deep work changes everything.",
];

export const BreakChat = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [expanded, setExpanded] = useState(false);
  const [unread, setUnread] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const userName = getAnonymousUsername();

  // Simulate other users typing during break
  useEffect(() => {
    if (!expanded) return;
    const interval = setInterval(() => {
      if (Math.random() > 0.6) {
        const msg: ChatMessage = {
          id: `msg-${Date.now()}`,
          user: ["FocusFox", "ZenSeeker", "DeepDiver", "SilentWolf", "CalmVoyager"][
            Math.floor(Math.random() * 5)
          ],
          text: breakMessages[Math.floor(Math.random() * breakMessages.length)],
          time: Date.now(),
        };
        setMessages((prev) => [...prev.slice(-19), msg]);
      }
    }, 5000);
    return () => clearInterval(interval);
  }, [expanded]);

  // Track unread when collapsed
  useEffect(() => {
    if (!expanded && messages.length > 0) {
      setUnread(messages.length);
    }
  }, [messages, expanded]);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = () => {
    if (!input.trim()) return;
    const msg: ChatMessage = {
      id: `user-${Date.now()}`,
      user: userName,
      text: input.trim(),
      time: Date.now(),
    };
    setMessages((prev) => [...prev, msg]);
    setInput("");
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => { setExpanded(!expanded); setUnread(0); }}
        className="relative flex items-center gap-2 px-3 py-2 rounded-xl bg-card-elevated border border-border hover:border-primary/30 transition-all"
      >
        <MessageCircle className="w-3.5 h-3.5 text-primary" />
        <span className="text-[10px] text-muted-foreground">Break Chat</span>
        {unread > 0 && (
          <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary text-[8px] flex items-center justify-center text-primary-foreground font-medium">
            {unread}
          </span>
        )}
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.95 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="absolute top-full right-0 mt-2 z-30 w-72 rounded-2xl bg-card-elevated border border-border shadow-elegant overflow-hidden"
          >
            <div className="p-3 pb-2 border-b border-border/60">
              <p className="text-[10px] uppercase tracking-[0.2em] text-primary font-medium">Break Chat</p>
              <p className="text-[8px] text-muted-foreground">Talk to others during your break</p>
            </div>

            <div ref={listRef} className="h-48 overflow-y-auto p-3 space-y-2 scrollbar-none">
              {messages.length === 0 ? (
                <p className="text-[10px] text-muted-foreground text-center pt-8">
                  No messages yet. Say something during your break...
                </p>
              ) : (
                messages.map((msg) => (
                  <motion.div
                    key={msg.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-2 rounded-xl ${
                      msg.user === userName
                        ? "bg-primary/10 ml-6"
                        : "bg-secondary mr-6"
                    }`}
                  >
                    <p className="text-[9px] font-medium text-primary mb-0.5">
                      {msg.user === userName ? "You" : msg.user}
                    </p>
                    <p className="text-[10px] text-foreground leading-relaxed">{msg.text}</p>
                  </motion.div>
                ))
              )}
            </div>

            <div className="p-3 border-t border-border/60">
              {/* Emoji reactions */}
              <div className="flex flex-wrap gap-1 mb-2">
                {quickReactions.map((r) => (
                  <button
                    key={r.label}
                    type="button"
                    onClick={() => {
                      const msg: ChatMessage = {
                        id: `react-${Date.now()}`,
                        user: userName,
                        text: r.emoji,
                        time: Date.now(),
                      };
                      setMessages(prev => [...prev, msg]);
                    }}
                    className="flex items-center gap-1 px-2 py-1 rounded-full bg-secondary hover:bg-primary/10 transition-colors text-[9px]"
                    title={r.label}
                  >
                    <span>{r.emoji}</span>
                    <span className="text-muted-foreground hidden sm:inline">{r.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Message..."
                  className="flex-1 bg-background rounded-full px-3 py-1.5 text-[10px] outline-none border border-border focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!input.trim()}
                  className="p-1.5 rounded-full bg-primary text-primary-foreground disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-3 h-3" />
                </button>
              </div>
              <p className="text-[7px] text-muted-foreground/50 mt-1">You are: {userName}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};