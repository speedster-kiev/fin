'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import Header from '@/components/Header'
import Watchlist from '@/components/Watchlist'
import ChartArea from '@/components/ChartArea'
import Portfolio from '@/components/Portfolio'
import TradeBar from '@/components/TradeBar'
import ChatPanel from '@/components/ChatPanel'
import type {
  WatchlistItem,
  PortfolioData,
  HistoryPoint,
  ChatMessage,
  ConnectionStatus,
  PriceEvent,
} from '@/types'

export default function Home() {
  const [watchlist, setWatchlist] = useState<Record<string, WatchlistItem>>({})
  const [selectedTicker, setSelectedTicker] = useState<string | null>(null)
  const [chartData, setChartData] = useState<Record<string, HistoryPoint[]>>({})
  const [portfolio, setPortfolio] = useState<PortfolioData>({
    totalValue: 0,
    cash: 0,
    positions: [],
  })
  const [portfolioHistory, setPortfolioHistory] = useState<HistoryPoint[]>([])
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting')
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([])
  const [chatOpen, setChatOpen] = useState(false)

  const flashTimers = useRef<Record<string, ReturnType<typeof setTimeout>>>({})

  // ── initial data load ──────────────────────────────────────────────────────

  const fetchWatchlist = useCallback(async () => {
    try {
      const res = await fetch('/api/watchlist')
      if (!res.ok) return
      const data = (await res.json()) as Array<{
        symbol: string
        price: number
        change: number
        changePercent: number
      }>
      const items: Record<string, WatchlistItem> = {}
      for (const item of data) {
        items[item.symbol] = {
          symbol: item.symbol,
          price: item.price,
          change: item.change,
          changePercent: item.changePercent,
          priceHistory: [item.price],
          flash: null,
        }
      }
      setWatchlist(items)
      if (data.length > 0) {
        setSelectedTicker((prev) => prev ?? data[0].symbol)
      }
    } catch {
      // network failure on initial load — non-fatal
    }
  }, [])

  const fetchPortfolio = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio')
      if (!res.ok) return
      const data = (await res.json()) as PortfolioData
      setPortfolio(data)
    } catch {
      // non-fatal
    }
  }, [])

  const fetchPortfolioHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/portfolio/history')
      if (!res.ok) return
      const data = (await res.json()) as HistoryPoint[]
      setPortfolioHistory(data)
    } catch {
      // non-fatal
    }
  }, [])

  useEffect(() => {
    fetchWatchlist()
    fetchPortfolio()
    fetchPortfolioHistory()
  }, [fetchWatchlist, fetchPortfolio, fetchPortfolioHistory])

  // ── SSE price stream ───────────────────────────────────────────────────────

  const handlePriceUpdate = useCallback((data: PriceEvent) => {
    setWatchlist((prev) => {
      const existing = prev[data.symbol]
      const direction =
        existing && data.price !== existing.price
          ? data.price > existing.price
            ? 'up'
            : 'down'
          : null

      if (direction) {
        clearTimeout(flashTimers.current[data.symbol])
        flashTimers.current[data.symbol] = setTimeout(() => {
          setWatchlist((p) =>
            p[data.symbol]
              ? { ...p, [data.symbol]: { ...p[data.symbol], flash: null } }
              : p
          )
        }, 500)
      }

      return {
        ...prev,
        [data.symbol]: {
          symbol: data.symbol,
          price: data.price,
          change: data.change ?? existing?.change ?? 0,
          changePercent: data.changePercent ?? existing?.changePercent ?? 0,
          priceHistory: existing
            ? [...existing.priceHistory.slice(-99), data.price]
            : [data.price],
          flash: direction,
        },
      }
    })

    setChartData((prev) => {
      const now = Math.floor(Date.now() / 1000)
      const existing = prev[data.symbol] ?? []
      // Keep up to 500 points; merge at the same second
      const last = existing[existing.length - 1]
      const next =
        last?.time === now
          ? [...existing.slice(0, -1), { time: now, value: data.price }]
          : [...existing.slice(-499), { time: now, value: data.price }]
      return { ...prev, [data.symbol]: next }
    })
  }, [])

  useEffect(() => {
    let es: EventSource | null = null
    let timer: ReturnType<typeof setTimeout>

    const connect = () => {
      setConnectionStatus('connecting')
      es = new EventSource('/api/stream/prices')

      es.onopen = () => setConnectionStatus('connected')

      es.onmessage = (event: MessageEvent<string>) => {
        try {
          const data = JSON.parse(event.data) as PriceEvent
          handlePriceUpdate(data)
        } catch {
          // malformed message — ignore
        }
      }

      es.onerror = () => {
        setConnectionStatus('disconnected')
        es?.close()
        timer = setTimeout(connect, 3000)
      }
    }

    connect()

    return () => {
      es?.close()
      clearTimeout(timer)
    }
  }, [handlePriceUpdate])

  // ── actions ────────────────────────────────────────────────────────────────

  const handleTrade = async (symbol: string, side: 'BUY' | 'SELL', quantity: number) => {
    const res = await fetch('/api/portfolio/trade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, side, quantity }),
    })
    if (!res.ok) throw new Error('Trade failed')
    await fetchPortfolio()
  }

  const handleAddWatchlist = async (symbol: string) => {
    try {
      await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol }),
      })
      await fetchWatchlist()
    } catch {
      // non-fatal
    }
  }

  const handleRemoveWatchlist = async (symbol: string) => {
    try {
      await fetch(`/api/watchlist/${symbol}`, { method: 'DELETE' })
      setWatchlist((prev) => {
        const next = { ...prev }
        delete next[symbol]
        return next
      })
      if (selectedTicker === symbol) setSelectedTicker(null)
    } catch {
      // non-fatal
    }
  }

  const handleChat = async (message: string): Promise<string> => {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message, history: chatMessages }),
    })
    if (!res.ok) throw new Error('Chat error')
    const data = (await res.json()) as { response: string }
    return data.response
  }

  // ── render ─────────────────────────────────────────────────────────────────

  const watchlistItems = Object.values(watchlist)

  return (
    <div className="flex flex-col h-screen overflow-hidden" style={{ backgroundColor: '#0d1117' }}>
      <Header
        totalValue={portfolio.totalValue}
        cash={portfolio.cash}
        connectionStatus={connectionStatus}
      />

      {/* Main content area between header and trade bar */}
      <div className="flex flex-1 overflow-hidden" style={{ paddingTop: '56px', paddingBottom: '56px' }}>
        <Watchlist
          items={watchlistItems}
          selectedTicker={selectedTicker}
          onSelectTicker={setSelectedTicker}
          onRemove={handleRemoveWatchlist}
        />

        <div className="flex flex-col flex-1 overflow-hidden min-w-0">
          <ChartArea
            ticker={selectedTicker}
            data={selectedTicker ? (chartData[selectedTicker] ?? []) : []}
            price={selectedTicker ? (watchlist[selectedTicker]?.price ?? 0) : 0}
          />
          <Portfolio portfolio={portfolio} history={portfolioHistory} />
        </div>

        <ChatPanel
          open={chatOpen}
          onToggle={() => setChatOpen((o) => !o)}
          messages={chatMessages}
          onMessages={setChatMessages}
          onSend={handleChat}
        />
      </div>

      <TradeBar
        watchlist={watchlistItems}
        onTrade={handleTrade}
        onAddWatchlist={handleAddWatchlist}
      />
    </div>
  )
}
