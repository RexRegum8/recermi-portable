import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { fetchWithAuth } from '../utils/api'
import { useSocket } from '../hooks/useSocket'

export interface SaleRecord {
  id: string
  saleNumber?: string
  paymentMethod: string
  paymentRef?: string
  paymentProof?: string
  items: { productId?: string; sku: string; name: string; qty: number; price: number; discount: number; warrantyDays?: number }[]
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
  
  const { subscribe } = useSocket()

  const refreshSales = async () => {
    console.log('[FRONTEND-SALES] Refreshing active session sales...')
    try {
      const resp = await fetchWithAuth('/api/sessions/active/sales')
      if (resp.ok) {
        const data = await resp.json()
        setSales(data)
        console.log(`[FRONTEND-SALES] Successfully refreshed ${data.length} sales`)
      } else {
        setSales([])
      }
    } catch (e: any) { 
      console.error(`[FRONTEND-SALES] Error refreshing sales: ${e.message}`) 
    }
  }

  const getSessionSales = async (sessionId: string): Promise<SaleRecord[]> => {
    try {
      const resp = await fetchWithAuth(`/api/sales/session/${sessionId}`)
      if (resp.ok) return await resp.json()
    } catch (e) { console.error(e) }
    return []
  }

  const refreshSessions = async () => {
    try {
      const activeResp = await fetchWithAuth('/api/sessions/active')
      if (activeResp.ok) {
        const active = await activeResp.json()
        setActiveSession(active)
      } else {
        setActiveSession(null)
      }
      
      const histResp = await fetchWithAuth('/api/sessions/history')
      if (histResp.ok) {
        const history = await histResp.json()
        setSessionHistory(history)
      }
    } catch (e: any) { 
      console.error(`[FRONTEND-SALES] Error refreshing sessions: ${e.message}`) 
    }
  }

  useEffect(() => {
    refreshSessions()
  }, [])

  useEffect(() => {
    const unsubSale = subscribe('sale-created', (newSale: SaleRecord) => {
      console.log(`[SOCKET] New sale received: ${newSale.saleNumber}`)
      setSales(prev => [newSale, ...prev])
    })
    const unsubSession = subscribe('session-updated', () => { refreshSessions() })
    return () => {
      unsubSale?.()
      unsubSession?.()
    }
  }, [subscribe])

  const addSale = async (data: SaleRecord | FormData) => {
    try {
      const resp = await fetchWithAuth('/api/sales', {
        method: 'POST',
        body: data instanceof FormData ? data : JSON.stringify(data)
      })
      if (!resp.ok) {
        const err = await resp.json()
        throw new Error(err.error || 'Error al registrar la venta')
      }
      await refreshSales()
    } catch (e: any) { throw e }
  }

  const openSession = async (openingBalance: number, cashier: string) => {
    try {
      const resp = await fetchWithAuth('/api/sessions/open', {
        method: 'POST',
        body: JSON.stringify({ openingBalance, cashier })
      })
      if (resp.ok) await refreshSessions()
    } catch (e) { console.error(e) }
  }

  const closeSession = async (id: string, closingBalance: number, details?: any) => {
    try {
      const resp = await fetchWithAuth('/api/sessions/close', {
        method: 'POST',
        body: JSON.stringify({ id, closingBalance, details })
      })
      if (resp.ok) {
          await refreshSessions()
          if (details) {
            await fetchWithAuth('/api/sales/closure', {
              method: 'POST',
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
  if (!ctx) throw new Error('useSales must be inside SalesProvider')
  return ctx
}

