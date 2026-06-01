import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { MessageCircle, X, Send, Sparkles } from "lucide-react";

const PHONE_NUMBER = "+919871927402";
const WHATSAPP_URL = `https://wa.me/${PHONE_NUMBER.replace("+", "")}`;

const quickQuestions = [
  "I need help with my clarity routine",
  "How do I get started?",
  "I want the premium membership",
  "Tell me about the focus tools",
];

export const WhatsAppChat = () => {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");

  const handleSend = () => {
    if (!message.trim()) return;
    const text = encodeURIComponent(message.trim());
    window.open(`${WHATSAPP_URL}?text=${text}`, "_blank", "noopener,noreferrer");
    setMessage("");
    setOpen(false);
  };

  const handleQuickQuestion = (q: string) => {
    const text = encodeURIComponent(q);
    window.open(`${WHATSAPP_URL}?text=${text}`, "_blank", "noopener,noreferrer");
    setOpen(false);
  };

  return (
    <>
      {/* Chat Button */}
      <motion.button
        type="button"
        onClick={() => setOpen(!open)}
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg hover:shadow-xl transition-shadow"
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Chat with us on WhatsApp"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span
              key="close"
              initial={{ rotate: -90, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 90, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span
              key="chat"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              <MessageCircle className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-2xl bg-card-elevated border border-border shadow-elegant overflow-hidden"
          >
            {/* Header */}
            <div className="relative bg-[#25D366] p-4 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/20">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="font-display text-sm font-medium">Clarity Chat</p>
                  <p className="text-[11px] opacity-80">Premium support via WhatsApp</p>
                </div>
                <div className="ml-auto">
                  <span className="flex h-2 w-2 rounded-full bg-green-300 animate-pulse" />
                </div>
              </div>
            </div>

            {/* Messages area */}
            <div className="p-4 space-y-4">
              <div className="rounded-2xl bg-card border border-border p-3.5">
                <p className="text-xs text-muted-foreground leading-relaxed">
                  👋 Hey! I'm your Clarity assistant. Message me directly on WhatsApp and I'll help you with:
                </p>
                <ul className="mt-2 text-xs text-muted-foreground space-y-1">
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✦</span>
                    Personalized clarity routines
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✦</span>
                    Premium membership queries
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✦</span>
                    Product recommendations
                  </li>
                  <li className="flex items-start gap-2">
                    <span className="text-primary mt-0.5">✦</span>
                    Direct 1-on-1 coaching
                  </li>
                </ul>
              </div>

              {/* Quick questions */}
              <div>
                <p className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground mb-2">
                  Quick questions
                </p>
                <div className="flex flex-wrap gap-2">
                  {quickQuestions.map((q) => (
                    <button
                      key={q}
                      type="button"
                      onClick={() => handleQuickQuestion(q)}
                      className="text-[11px] px-3 py-1.5 rounded-full bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Input */}
            <div className="border-t border-border p-3">
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  placeholder="Type your message..."
                  className="flex-1 bg-background rounded-full px-4 py-2.5 text-sm outline-none border border-border focus:border-primary transition-colors"
                />
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!message.trim()}
                  className="flex h-9 w-9 items-center justify-center rounded-full bg-[#25D366] text-white disabled:opacity-40 transition-opacity"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="mt-1.5 text-[9px] text-muted-foreground/60 text-center">
                Messages are sent via WhatsApp. Standard rates may apply.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};