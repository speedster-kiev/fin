'use client'

import type { ConnectionStatus } from '@/types'

interface HeaderProps {
  totalValue: number
  cash: number
  connectionStatus: ConnectionStatus
}

const statusDot: Record<ConnectionStatus, string> = {
  connected: 'bg-green-500',
  connecting: 'bg-yellow-400 animate-pulse',
  disconnected: 'bg-red-500',
}

function fmt(v: number) {
  return v.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

export default function Header({ totalValue, cash, connectionStatus }: HeaderProps) {
  return (
    <header
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-4 h-14 border-b"
      style={{ backgroundColor: '#1a1a2e', borderColor: '#2d2d3a' }}
    >
      <div className="flex items-center gap-3">
        <span className="text-lg font-bold tracking-tight" style={{ color: '#ecad0a' }}>
          FinAlly
        </span>
        <span className="hidden sm:block text-xs text-gray-500 uppercase tracking-widest">
          AI Trading Terminal
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 leading-none mb-0.5">Portfolio</span>
          <span className="font-mono font-semibold text-sm" style={{ color: '#ecad0a' }}>
            {fmt(totalValue)}
          </span>
        </div>
        <div className="flex flex-col items-end">
          <span className="text-xs text-gray-500 leading-none mb-0.5">Cash</span>
          <span className="font-mono text-sm text-gray-200">{fmt(cash)}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className={`w-2 h-2 rounded-full ${statusDot[connectionStatus]}`} />
          <span className="text-xs text-gray-400 capitalize hidden sm:block">
            {connectionStatus}
          </span>
        </div>
      </div>
    </header>
  )
}
