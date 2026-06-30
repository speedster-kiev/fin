'use client'

import { useEffect, useRef } from 'react'
import type { WatchlistItem } from '@/types'

function Sparkline({ data }: { data: number[] }) {
  if (data.length < 2) return <div className="w-16 h-8" />

  const min = Math.min(...data)
  const max = Math.max(...data)
  const range = max - min || 1
  const w = 64
  const h = 32
  const pad = 2

  const points = data
    .map((v, i) => {
      const x = pad + (i / (data.length - 1)) * (w - pad * 2)
      const y = pad + (1 - (v - min) / range) * (h - pad * 2)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const isUp = data[data.length - 1] >= data[0]
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={isUp ? '#22c55e' : '#ef4444'}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

interface WatchlistProps {
  items: WatchlistItem[]
  selectedTicker: string | null
  onSelectTicker: (ticker: string) => void
  onRemove: (ticker: string) => void
}

export default function Watchlist({
  items,
  selectedTicker,
  onSelectTicker,
  onRemove,
}: WatchlistProps) {
  const rowRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const prevFlash = useRef<Record<string, WatchlistItem['flash']>>({})

  useEffect(() => {
    for (const item of items) {
      const el = rowRefs.current[item.symbol]
      if (!el) continue
      if (item.flash && item.flash !== prevFlash.current[item.symbol]) {
        el.classList.remove('price-flash-up', 'price-flash-down')
        void el.offsetWidth // force reflow
        el.classList.add(item.flash === 'up' ? 'price-flash-up' : 'price-flash-down')
      }
      prevFlash.current[item.symbol] = item.flash
    }
  })

  return (
    <aside
      className="w-52 flex-shrink-0 flex flex-col overflow-y-auto border-r"
      style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d3a' }}
    >
      <div
        className="px-3 py-2 border-b text-xs font-semibold uppercase tracking-wider text-gray-400 flex-shrink-0"
        style={{ borderColor: '#2d2d3a' }}
      >
        Watchlist
      </div>

      {items.length === 0 && (
        <div className="px-3 py-6 text-xs text-gray-500 text-center">
          Add tickers below
        </div>
      )}

      {items.map((item) => (
        <div
          key={item.symbol}
          ref={(el) => {
            rowRefs.current[item.symbol] = el
          }}
          onClick={() => onSelectTicker(item.symbol)}
          className="px-3 py-2 border-b cursor-pointer hover:bg-white/5 transition-colors"
          style={{
            borderColor: '#2d2d3a',
            borderLeftWidth: selectedTicker === item.symbol ? 2 : 0,
            borderLeftColor: '#209dd7',
            borderLeftStyle: 'solid',
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <span className="font-semibold text-sm text-gray-100">{item.symbol}</span>
            <button
              onClick={(e) => {
                e.stopPropagation()
                onRemove(item.symbol)
              }}
              className="text-gray-600 hover:text-gray-300 text-base leading-none w-4 h-4 flex items-center justify-center"
              aria-label={`Remove ${item.symbol}`}
            >
              ×
            </button>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <div className="font-mono text-sm text-gray-100">${item.price.toFixed(2)}</div>
              <div
                className={`text-xs font-mono ${
                  item.changePercent >= 0 ? 'text-green-400' : 'text-red-400'
                }`}
              >
                {item.changePercent >= 0 ? '+' : ''}
                {item.changePercent.toFixed(2)}%
              </div>
            </div>
            <Sparkline data={item.priceHistory} />
          </div>
        </div>
      ))}
    </aside>
  )
}
