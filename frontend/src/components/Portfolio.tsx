'use client'

import { useEffect, useRef } from 'react'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import type { PortfolioData, HistoryPoint, Position } from '@/types'

function fmtUsd(v: number) {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function PnlValue({ value, percent }: { value: number; percent?: number }) {
  const color = value >= 0 ? 'text-green-400' : 'text-red-400'
  return (
    <span className={color}>
      {value >= 0 ? '+' : ''}
      {fmtUsd(value)}
      {percent !== undefined && (
        <span className="ml-1 text-xs opacity-75">
          ({percent >= 0 ? '+' : ''}
          {percent.toFixed(2)}%)
        </span>
      )}
    </span>
  )
}

function Heatmap({ positions }: { positions: Position[] }) {
  if (positions.length === 0) {
    return (
      <div className="h-24 flex items-center justify-center text-xs text-gray-500">
        No positions
      </div>
    )
  }

  const totalAbs = positions.reduce(
    (s, p) => s + Math.abs(p.quantity * p.currentPrice),
    0
  )

  return (
    <div className="flex gap-0.5 h-24">
      {positions.map((pos) => {
        const weight =
          totalAbs > 0
            ? Math.abs(pos.quantity * pos.currentPrice) / totalAbs
            : 1 / positions.length
        const intensity = Math.min(Math.abs(pos.pnlPercent) / 5, 1)
        const bgColor =
          pos.unrealizedPnl >= 0
            ? `rgba(34,197,94,${0.15 + 0.5 * intensity})`
            : `rgba(239,68,68,${0.15 + 0.5 * intensity})`

        return (
          <div
            key={pos.symbol}
            className="flex flex-col items-center justify-center text-xs rounded overflow-hidden min-w-0"
            style={{ flex: weight, backgroundColor: bgColor, border: '1px solid #2d2d3a' }}
          >
            <span className="font-semibold text-gray-100 truncate px-1">{pos.symbol}</span>
            <span
              className={`font-mono ${
                pos.pnlPercent >= 0 ? 'text-green-300' : 'text-red-300'
              }`}
            >
              {pos.pnlPercent >= 0 ? '+' : ''}
              {pos.pnlPercent.toFixed(1)}%
            </span>
          </div>
        )
      })}
    </div>
  )
}

function toChartData(data: HistoryPoint[]) {
  const map = new Map<number, number>()
  for (const p of data) map.set(p.time, p.value)
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }))
}

function PnlChart({ data }: { data: HistoryPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const roRef = useRef<ResizeObserver | null>(null)

  useEffect(() => {
    if (!containerRef.current) return
    let active = true

    import('lightweight-charts').then(({ createChart, ColorType }) => {
      if (!active || !containerRef.current) return

      const chart = createChart(containerRef.current, {
        width: containerRef.current.clientWidth,
        height: containerRef.current.clientHeight,
        layout: {
          background: { type: ColorType.Solid, color: '#0d1117' },
          textColor: '#9ca3af',
        },
        grid: {
          vertLines: { color: '#1f2937' },
          horzLines: { color: '#1f2937' },
        },
        rightPriceScale: { borderColor: '#2d2d3a' },
        timeScale: { borderColor: '#2d2d3a', timeVisible: true },
        handleScale: false,
        handleScroll: false,
      })

      const series = chart.addLineSeries({
        color: '#ecad0a',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        lastValueVisible: true,
      })

      chartRef.current = chart
      seriesRef.current = series

      const dd = toChartData(data)
      if (dd.length > 0) {
        series.setData(dd)
        chart.timeScale().fitContent()
      }

      const ro = new ResizeObserver(() => {
        if (containerRef.current) {
          chart.applyOptions({
            width: containerRef.current.clientWidth,
            height: containerRef.current.clientHeight,
          })
        }
      })
      ro.observe(containerRef.current)
      roRef.current = ro
    })

    return () => {
      active = false
      roRef.current?.disconnect()
      roRef.current = null
      chartRef.current?.remove()
      chartRef.current = null
      seriesRef.current = null
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (!seriesRef.current) return
    const dd = toChartData(data)
    if (dd.length === 0) return
    seriesRef.current.setData(dd)
    chartRef.current?.timeScale().fitContent()
  }, [data])

  return <div ref={containerRef} className="flex-1 min-h-0" />
}

interface PortfolioProps {
  portfolio: PortfolioData
  history: HistoryPoint[]
}

export default function Portfolio({ portfolio, history }: PortfolioProps) {
  return (
    <div
      className="flex-1 flex flex-col overflow-hidden min-h-0"
      style={{ backgroundColor: '#0d1117' }}
    >
      {/* Top row: heatmap + P&L chart */}
      <div className="flex border-b flex-shrink-0" style={{ borderColor: '#2d2d3a', height: '130px' }}>
        <div className="flex-1 border-r p-2 flex flex-col min-w-0" style={{ borderColor: '#2d2d3a' }}>
          <div className="text-xs text-gray-400 mb-1 flex-shrink-0">Positions Heatmap</div>
          <div className="flex-1 min-h-0">
            <Heatmap positions={portfolio.positions} />
          </div>
        </div>
        <div className="flex-1 flex flex-col p-2 min-w-0">
          <div className="text-xs text-gray-400 mb-1 flex-shrink-0">Portfolio Value</div>
          <PnlChart data={history} />
        </div>
      </div>

      {/* Positions table */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <table className="w-full text-xs border-collapse">
          <thead className="sticky top-0" style={{ backgroundColor: '#1a1a2e' }}>
            <tr>
              {['Ticker', 'Qty', 'Avg Cost', 'Price', 'Unr. P&L', '% Chg'].map((h, i) => (
                <th
                  key={h}
                  className={`py-1.5 px-3 text-gray-400 font-medium border-b ${
                    i === 0 ? 'text-left' : 'text-right'
                  }`}
                  style={{ borderColor: '#2d2d3a' }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {portfolio.positions.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-6 text-center text-gray-500">
                  No open positions
                </td>
              </tr>
            ) : (
              portfolio.positions.map((pos) => (
                <tr
                  key={pos.symbol}
                  className="border-b hover:bg-white/5 transition-colors"
                  style={{ borderColor: '#2d2d3a' }}
                >
                  <td className="px-3 py-1.5 font-semibold text-gray-200">{pos.symbol}</td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-300">
                    {pos.quantity}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-300">
                    {fmtUsd(pos.avgCost)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-gray-300">
                    {fmtUsd(pos.currentPrice)}
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    <PnlValue value={pos.unrealizedPnl} />
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono">
                    <span className={pos.pnlPercent >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {pos.pnlPercent >= 0 ? '+' : ''}
                      {pos.pnlPercent.toFixed(2)}%
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
