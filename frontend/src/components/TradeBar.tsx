'use client'

import { useState } from 'react'
import type { WatchlistItem } from '@/types'

interface TradeBarProps {
  watchlist: WatchlistItem[]
  onTrade: (symbol: string, side: 'BUY' | 'SELL', quantity: number) => Promise<void>
  onAddWatchlist: (symbol: string) => void
}

export default function TradeBar({ watchlist, onTrade, onAddWatchlist }: TradeBarProps) {
  const [symbol, setSymbol] = useState('')
  const [quantity, setQuantity] = useState('')
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const clearStatus = () => {
    setTimeout(() => setStatus(null), 3000)
  }

  const handleTrade = async (side: 'BUY' | 'SELL') => {
    const qty = parseFloat(quantity)
    if (!symbol.trim() || !qty || qty <= 0) return

    setLoading(true)
    setStatus(null)
    try {
      await onTrade(symbol.toUpperCase(), side, qty)
      setStatus({ ok: true, msg: `${side} ${qty} ${symbol.toUpperCase()} executed` })
      setQuantity('')
    } catch {
      setStatus({ ok: false, msg: 'Trade failed. Check ticker and quantity.' })
    } finally {
      setLoading(false)
      clearStatus()
    }
  }

  const handleAddWatch = () => {
    const s = symbol.trim().toUpperCase()
    if (!s) return
    onAddWatchlist(s)
    setStatus({ ok: true, msg: `Added ${s} to watchlist` })
    clearStatus()
  }

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center gap-2 px-4 h-14 border-t"
      style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d3a' }}
    >
      <input
        type="text"
        placeholder="Ticker"
        value={symbol}
        onChange={(e) => setSymbol(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === 'Enter' && handleTrade('BUY')}
        className="w-24 px-2 py-1 text-sm font-mono rounded border bg-transparent text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1"
        style={{ borderColor: '#2d2d3a', '--tw-ring-color': '#209dd7' } as React.CSSProperties}
        maxLength={10}
      />
      <input
        type="number"
        placeholder="Qty"
        value={quantity}
        onChange={(e) => setQuantity(e.target.value)}
        className="w-20 px-2 py-1 text-sm font-mono rounded border bg-transparent text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1"
        style={{ borderColor: '#2d2d3a' }}
        min="0"
        step="1"
      />
      <button
        onClick={() => handleTrade('BUY')}
        disabled={loading}
        className="px-3 py-1 text-sm font-semibold rounded text-white disabled:opacity-40 transition-opacity"
        style={{ backgroundColor: '#209dd7' }}
      >
        BUY
      </button>
      <button
        onClick={() => handleTrade('SELL')}
        disabled={loading}
        className="px-3 py-1 text-sm font-semibold rounded text-white bg-red-600 disabled:opacity-40 transition-opacity hover:bg-red-700"
      >
        SELL
      </button>
      <button
        onClick={handleAddWatch}
        className="px-2.5 py-1 text-xs rounded border text-gray-400 hover:text-gray-200 hover:border-gray-500 transition-colors"
        style={{ borderColor: '#2d2d3a' }}
      >
        + Watch
      </button>

      {status && (
        <span className={`text-xs ml-1 ${status.ok ? 'text-green-400' : 'text-red-400'}`}>
          {status.msg}
        </span>
      )}

      {/* Ticker ticker */}
      <div className="ml-auto hidden lg:flex items-center gap-5 text-xs text-gray-500 overflow-hidden">
        {watchlist.slice(0, 6).map((item) => (
          <span key={item.symbol} className="font-mono whitespace-nowrap">
            <span className="text-gray-300">{item.symbol}</span>
            <span className="mx-1">${item.price.toFixed(2)}</span>
            <span className={item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'}>
              {item.changePercent >= 0 ? '+' : ''}
              {item.changePercent.toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  )
}
