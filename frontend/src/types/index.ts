export interface WatchlistItem {
  symbol: string
  price: number
  change: number
  changePercent: number
  priceHistory: number[]
  flash: 'up' | 'down' | null
}

export interface Position {
  symbol: string
  quantity: number
  avgCost: number
  currentPrice: number
  unrealizedPnl: number
  pnlPercent: number
}

export interface PortfolioData {
  totalValue: number
  cash: number
  positions: Position[]
}

export interface HistoryPoint {
  time: number
  value: number
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export interface PriceEvent {
  symbol: string
  price: number
  change?: number
  changePercent?: number
  timestamp?: string
}

export type ConnectionStatus = 'connected' | 'connecting' | 'disconnected'
