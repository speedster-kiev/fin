'use client'

import { useState, useRef, useEffect } from 'react'
import type { ChatMessage } from '@/types'

interface ChatPanelProps {
  open: boolean
  onToggle: () => void
  messages: ChatMessage[]
  onMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>
  onSend: (message: string) => Promise<string>
}

export default function ChatPanel({
  open,
  onToggle,
  messages,
  onMessages,
  onSend,
}: ChatPanelProps) {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  const handleSend = async () => {
    const msg = input.trim()
    if (!msg || loading) return

    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: 'user',
      content: msg,
    }
    onMessages((prev) => [...prev, userMsg])
    setInput('')
    setLoading(true)

    try {
      const reply = await onSend(msg)
      onMessages((prev) => [
        ...prev,
        { id: `${Date.now()}-a`, role: 'assistant', content: reply },
      ])
    } catch {
      onMessages((prev) => [
        ...prev,
        {
          id: `${Date.now()}-err`,
          role: 'assistant',
          content: '⚠️ Failed to reach AI. Please try again.',
        },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <>
      {/* Toggle tab */}
      <button
        onClick={onToggle}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-40 flex flex-col items-center justify-center gap-0.5 py-3 px-1.5 rounded-l text-xs font-semibold text-white"
        style={{ backgroundColor: '#753991', writingMode: 'vertical-rl' as const }}
        aria-label="Toggle AI chat"
      >
        {open ? '›' : '‹'} AI
      </button>

      {/* Sliding panel */}
      <aside
        className={`flex flex-col border-l transition-all duration-200 ease-in-out overflow-hidden flex-shrink-0 ${
          open ? 'w-72' : 'w-0'
        }`}
        style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d3a' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-3 py-2 border-b flex-shrink-0"
          style={{ borderColor: '#2d2d3a' }}
        >
          <span className="text-xs font-semibold text-gray-300">AI Assistant</span>
          <button
            onClick={onToggle}
            className="text-gray-500 hover:text-gray-300 text-lg leading-none w-5 h-5 flex items-center justify-center"
            aria-label="Close chat"
          >
            ×
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2 min-h-0">
          {messages.length === 0 && (
            <p className="text-xs text-gray-500 text-center mt-6 leading-relaxed">
              Ask me to place trades, add tickers,
              <br />
              or analyze your portfolio.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[88%] rounded px-2.5 py-1.5 text-xs leading-relaxed whitespace-pre-wrap break-words ${
                  msg.role === 'user' ? 'text-white' : 'text-gray-200 border'
                }`}
                style={
                  msg.role === 'user'
                    ? { backgroundColor: '#753991' }
                    : { backgroundColor: '#0d1117', borderColor: '#2d2d3a' }
                }
              >
                {msg.content}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div
                className="rounded px-2.5 py-1.5 text-xs border text-gray-400"
                style={{ backgroundColor: '#0d1117', borderColor: '#2d2d3a' }}
              >
                <span className="animate-pulse">Thinking…</span>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="border-t p-2 flex-shrink-0" style={{ borderColor: '#2d2d3a' }}>
          <div className="flex gap-1.5 items-end">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask AI… (Enter to send)"
              rows={2}
              className="flex-1 px-2 py-1.5 text-xs rounded border bg-transparent text-gray-100 placeholder-gray-600 resize-none focus:outline-none focus:ring-1"
              style={{ borderColor: '#2d2d3a', '--tw-ring-color': '#753991' } as React.CSSProperties}
            />
            <button
              onClick={handleSend}
              disabled={loading || !input.trim()}
              className="px-2.5 py-1.5 text-xs rounded font-semibold text-white disabled:opacity-40 transition-opacity"
              style={{ backgroundColor: '#753991' }}
            >
              Send
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
