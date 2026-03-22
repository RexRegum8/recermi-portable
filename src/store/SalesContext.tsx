import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

export interface SaleRecord {
  id: string
  saleNumber?: string
  paymentMethod: string
  paymentRef?: string
  paymentProof?: string
  items: { productId?: string; sku: string; name: string; qty: number; price: number; discount: number }[]
  subtotal: number
  globalDiscount: number
  iva: number
  total: number
  totalBs: number
  cashier: string
  date: string
  time: string
  customerName?: string
  customerId?: string
}

export interface CashSession {
  id: string
  openedAt: string
  closedAt?: string
  openingBalance: number
  closingBalance?: number
  cashier: string
  status: 'OPEN' | 'CLOSED'
}

interface SalesContextType {
  sales: SaleRecord[]
  activeSession: CashSession | null
  sessionHistory: CashSession[]
  addSale: (sale: SaleRecord) => Promise<void>
  openSession: (openingBalance: number, cashier: string) => Promise<void>
  closeSession: (id: string, closingBalance: number, details?: any) => Promise<void>
  refreshSales: () => Promise<void>
  refreshSessions: () => Promise<void>
  getSessionSales: (sessionId: string) => Promise<SaleRecord[]>
  dailyTotal: number
  dailySales: SaleRecord[]
}

const SalesContext = createContext<SalesContextType | null>(null)

export function SalesProvider({ children }: { children: ReactNode }) {
  const [sales, setSales] = useState<SaleRecord[]>([])
  const [activeSession, setActiveSession] = useState<CashSession | null>(null)
  const [sessionHistory, setSessionHistory] = useState<CashSession[]>([])

  const refreshSales = async () => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/sessions/active/sales`)
      if (resp.ok) setSales(await resp.json())
    } catch (e) { console.error(e) }
  }

  const getSessionSales = async (sessionId: string): Promise<SaleRecord[]> => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/sales/session/${sessionId}`)
      if (resp.ok) return await resp.json()
    } catch (e) { console.error(e) }
    return []
  }

  const refreshSessions = async () => {
    const baseUrl = getBaseUrl()
    try {
      const activeResp = await fetch(`${baseUrl}/api/sessions/active`)
      if (activeResp.ok) {
        const active = await activeResp.json()
        setActiveSession(active)
      } else {
        setActiveSession(null)
      }
      
      const histResp = await fetch(`${baseUrl}/api/sessions/history`)
      if (histResp.ok) setSessionHistory(await histResp.json())
    } catch (e) { console.error(e) }
  }

  useEffect(() => {
    refreshSessions()

    const handleRefresh = () => {
      // When 'refreshSales' event is dispatched, refresh both sales and sessions
      // refreshSales will now depend on the activeSession state
      refreshSessions() 
    }
    window.addEventListener('refreshSales', handleRefresh)
    return () => window.removeEventListener('refreshSales', handleRefresh)
  }, [])

  const addSale = async (sale: SaleRecord) => {
    const baseUrl = getBaseUrl()
    const resp = await fetch(`${baseUrl}/api/sales`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sale)
    })
    
    if (!resp.ok) {
      const err = await resp.json()
      throw new Error(err.error || 'Error al registrar la venta')
    }
    
    await refreshSales()
  }

  const openSession = async (openingBalance: number, cashier: string) => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/sessions/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openingBalance, cashier })
      })
      if (resp.ok) refreshSessions()
    } catch (e) { console.error(e) }
  }

  const closeSession = async (id: string, closingBalance: number, details?: any) => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/sessions/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, closingBalance, details })
      })
      if (resp.ok) refreshSessions()
      
      // Also register in Closure table if details are provided
      if (details) {
        await fetch(`${baseUrl}/api/sales/closure`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            totalSales: sales.length,
            totalItems: sales.reduce((a, s) => a + s.items.length, 0),
            totalAmountUsd: dailyTotal,
            totalAmountBs: sales.reduce((a, s) => a + s.totalBs, 0),
            ivaTotal: sales.reduce((a, s) => a + s.iva, 0),
            details: details,
            cashier: activeSession?.cashier || 'Admin'
          })
        })
      }
    } catch (e) { console.error(e) }
  }

  const dailyTotal = sales.reduce((acc, s) => acc + s.total, 0)
  const dailySales = sales

  return (
    <SalesContext.Provider value={{ 
      sales, activeSession, sessionHistory, addSale, 
      openSession, closeSession, refreshSales, refreshSessions,
      getSessionSales, dailyTotal, dailySales
    }}>
      {children}
    </SalesContext.Provider>
  )
}

export function useSales() {
  const ctx = useContext(SalesContext)
  if (!ctx) throw new Error('useSales must be used inside SalesProvider')
  return ctx
}
