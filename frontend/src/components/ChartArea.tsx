'use client'

import { useEffect, useRef } from 'react'
import type { IChartApi, ISeriesApi, UTCTimestamp } from 'lightweight-charts'
import type { HistoryPoint } from '@/types'

interface ChartAreaProps {
  ticker: string | null
  data: HistoryPoint[]
  price: number
}

function toChartData(data: HistoryPoint[]) {
  const map = new Map<number, number>()
  for (const p of data) map.set(p.time, p.value)
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([time, value]) => ({ time: time as UTCTimestamp, value }))
}

export default function ChartArea({ ticker, data, price }: ChartAreaProps) {
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
        timeScale: {
          borderColor: '#2d2d3a',
          timeVisible: true,
          secondsVisible: true,
        },
        crosshair: {
          vertLine: { color: '#209dd7', labelBackgroundColor: '#209dd7' },
          horzLine: { color: '#209dd7', labelBackgroundColor: '#209dd7' },
        },
        handleScale: { axisPressedMouseMove: true },
        handleScroll: { mouseWheel: true, pressedMouseMove: true },
      })

      const series = chart.addLineSeries({
        color: '#209dd7',
        lineWidth: 2,
        priceFormat: { type: 'price', precision: 2, minMove: 0.01 },
        lastValueVisible: true,
        priceLineVisible: true,
        priceLineColor: '#209dd7',
      })

      chartRef.current = chart
      seriesRef.current = series

      const initialData = toChartData(data)
      if (initialData.length > 0) {
        series.setData(initialData)
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
    const chartData = toChartData(data)
    if (chartData.length === 0) return
    seriesRef.current.setData(chartData)
    chartRef.current?.timeScale().scrollToRealTime()
  }, [data])

  return (
    <div
      className="flex flex-col flex-shrink-0 border-b"
      style={{ height: '220px', borderColor: '#2d2d3a' }}
    >
      <div
        className="flex items-center justify-between px-3 py-1.5 text-xs border-b flex-shrink-0"
        style={{ borderColor: '#2d2d3a', backgroundColor: '#1a1a2e' }}
      >
        <span className="font-semibold text-gray-200">{ticker ?? '—'}</span>
        {ticker && (
          <span className="font-mono font-semibold" style={{ color: '#ecad0a' }}>
            ${price.toFixed(2)}
          </span>
        )}
      </div>
      {ticker ? (
        <div ref={containerRef} className="flex-1 min-h-0" />
      ) : (
        <div className="flex-1 flex items-center justify-center text-gray-500 text-sm">
          Select a ticker from the watchlist
        </div>
      )}
    </div>
  )
}
