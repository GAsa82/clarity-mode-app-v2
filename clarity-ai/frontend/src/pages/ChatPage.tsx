import { useState, useRef, useEffect } from 'react'
import { chatWithAI } from '../api'

interface Message {
  role: 'user' | 'assistant'
  content: string
  sources?: { id?: string; text?: string; filename?: string; score?: number }[]
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content:
        'Hi! I am your Clarity AI assistant. Ask me anything about your diary entries — emotions, patterns, recurring themes, or specific memories.',
    },
  ])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const query = input.trim()
    if (!query || sending) return

    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: query }])
    setSending(true)

    try {
      const res = await chatWithAI(query)
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.answer,
          sources: res.sources,
        },
      ])
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Chat request failed'
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ Error: ${msg}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto flex flex-col h-[calc(100vh-12rem)]">
      <h1 className="text-2xl font-bold mb-2">Chat with Your Diary</h1>
      <p className="text-gray-400 mb-4">
        Ask questions about your entries, explore patterns, or reflect on your growth.
      </p>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2 mb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-xl px-4 py-3 text-sm ${
                msg.role === 'user'
                  ? 'bg-indigo-600 text-white'
                  : 'bg-gray-900 border border-gray-800 text-gray-200'
              }`}
            >
              <p className="whitespace-pre-wrap">{msg.content}</p>

              {/* Sources */}
              {msg.sources && msg.sources.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-300">
                    Sources ({msg.sources.length})
                  </summary>
                  <div className="mt-2 space-y-1 max-h-32 overflow-y-auto">
                    {msg.sources.map((s, j) => (
                      <div
                        key={j}
                        className="text-xs text-gray-500 bg-gray-800/50 rounded p-2"
                      >
                        {s.filename && (
                          <span className="text-gray-400 block">📄 {s.filename}</span>
                        )}
                        {s.text && (
                          <p className="line-clamp-2 mt-0.5">“{s.text}”</p>
                        )}
                        {s.score !== undefined && (
                          <span className="text-gray-600">
                            Score: {(s.score * 100).toFixed(0)}%
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
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your diary entries..."
          disabled={sending}
          className="flex-1 px-4 py-3 rounded-xl bg-gray-900 border border-gray-800 text-gray-100 placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={sending || !input.trim()}
          className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 transition-colors font-medium"
        >
          {sending ? (
            <span className="flex items-center gap-2">
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Thinking...
            </span>
          ) : (
            'Send'
          )}
        </button>
      </form>
    </div>
  )
}