import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export interface Customer {
  id: string; 
  name: string; 
  email: string; 
  phone: string; 
  address: string; 
  points: number; 
  pendingDiscount: number;
  photo?: string;
  ci?: string;
  birthday?: string;
  gender?: string;
  isCompany?: boolean;
  isSpecialTaxpayer?: boolean;
  orders?: any[];
  sales?: any[];
  tickets?: any[];
  loyaltyMovements?: any[];
}

export interface CartItem {
  productId: string; name: string; sku: string; price: number; quantity: number; image: string; stock: number
}

export interface Order {
  id: string; customerId: string; items: any[]; total: number;
  status: 'PENDING' | 'COMPLETED' | 'CANCELLED'
  createdAt: string; paymentMethod: string; paymentRef?: string; paymentProof?: string
}

interface CustomerContextType {
  customer: Customer | null
  cart: CartItem[]
  orders: Order[]
  config: any
  updateCustomer: (data: Customer) => void
  refreshConfig: () => Promise<void>
  registerCustomer: (data: any) => Promise<boolean>
  loginCustomer: (email: string, password: string) => Promise<boolean>
  refreshProfile: () => Promise<void>
  logoutCustomer: () => void
  addToCart: (item: Omit<CartItem, 'quantity'>) => void
  removeFromCart: (productId: string) => void
  updateCartQty: (productId: string, qty: number) => void
  clearCart: () => void
  cartSubtotal: number
  cartTotal: number
  cartCount: number
  placeOrder: (paymentMethod: string) => Promise<Order | null>
}

import { getBaseUrl, fetchWithAuth } from '../utils/api'

const CustomerContext = createContext<CustomerContextType | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('customer')
    return saved ? JSON.parse(saved) : null
  })
  const [cart, setCart] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [config, setConfig] = useState<any>({ exchangeRateBCV: 36.50, storeName: 'Rexermi' })

  const refreshConfig = async () => {
    try {
      const resp = await fetchWithAuth('/api/config')
      const data = await resp.json()
      if (data && !data.error) setConfig(data)
    } catch (e: any) { 
      console.error(`[FRONTEND-CUST] Error refreshing config: ${e.message}`) 
    }
  }

  useEffect(() => {
    refreshConfig()
    if (localStorage.getItem('customerToken')) {
      refreshProfile()
    }
  }, [])

  const refreshProfile = async () => {
    try {
      const resp = await fetchWithAuth('/api/customers/me')
      if (resp.ok) {
        const data = await resp.json()
        const { password: _, ...customerData } = data
        setCustomer(customerData as Customer)
        localStorage.setItem('customer', JSON.stringify(customerData))
        if (data.orders) setOrders(data.orders)
      }
    } catch (e: any) { 
        console.error(`[FRONTEND-CUST] Error refreshing profile: ${e.message}`) 
    }
  }

  const registerCustomer = async (data: any): Promise<boolean> => {
    try {
      const resp = await fetchWithAuth('/api/customers/register', {
        method: 'POST',
        body: JSON.stringify(data)
      })
      return resp.ok
    } catch (e) { return false }
  }

  const loginCustomer = async (email: string, password: string): Promise<boolean> => {
    try {
      const resp = await fetchWithAuth('/api/customers/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      })
      const data = await resp.json()
      if (data.customer) setCustomer(data.customer)
      if (data.token) localStorage.setItem('customerToken', data.token)
      await refreshProfile()
      return true
    } catch (e) { return false }
  }

  const logoutCustomer = async () => { 
    try {
      await fetchWithAuth('/api/customers/logout', { method: 'POST' })
    } catch (e) { console.error(e) }
    setCustomer(null); 
    setCart([]) 
    localStorage.removeItem('customer')
    localStorage.removeItem('customerToken')
  }

  const addToCart = (item: Omit<CartItem, 'quantity'>) => {
    setCart((prev) => {
      const ex = prev.find((i) => i.productId === item.productId)
      const currentQty = ex ? ex.quantity : 0
      if (currentQty + 1 > item.stock) {
        alert(`Solo quedan ${item.stock} unidades disponibles`)
        return prev
      }
      if (ex) return prev.map((i) => i.productId === item.productId ? { ...i, quantity: i.quantity + 1 } : i)
      return [...prev, { ...item, quantity: 1 }]
    })
  }

  const removeFromCart = (productId: string) => setCart((prev) => prev.filter((i) => i.productId !== productId))
  const updateCartQty = (productId: string, qty: number) => setCart((prev) => {
    if (qty <= 0) return prev.filter((i) => i.productId !== productId)
    return prev.map((i) => {
      if (i.productId === productId) {
        if (qty > i.stock) {
          alert(`Solo quedan ${i.stock} unidades disponibles`)
          return i
        }
        return { ...i, quantity: qty }
      }
      return i
    })
  })
  const clearCart = () => setCart([])
  const cartSubtotal = cart.reduce((a, i) => a + i.price * i.quantity, 0)
  const cartTotal = customer?.pendingDiscount && customer.pendingDiscount > 0 ? cartSubtotal * (1 - customer.pendingDiscount / 100) : cartSubtotal
  const cartCount = cart.reduce((a, i) => a + i.quantity, 0)

  const placeOrder = async (paymentMethod: string): Promise<Order | null> => {
    if (!customer || cart.length === 0) return null
    try {
      const resp = await fetchWithAuth('/api/customers/orders', {
        method: 'POST',
        body: JSON.stringify({
          items: cart.map(i => ({ productId: i.productId, qty: i.quantity, price: i.price })),
          total: cartTotal,
          paymentMethod,
          paymentRef: (window as any)._pendingPaymentRef || '',
          paymentProof: (window as any)._pendingPaymentProof || ''
        })
      })
      if (!resp.ok) {
        const err = await resp.json()
        alert(err.error || 'Error al procesar el pedido')
        return null
      }
      const order = await resp.json()
      setOrders(prev => [order, ...prev])
      setCart([])
      return order
    } catch (e) { return null }
  }

  const updateCustomer = (data: Customer) => {
    setCustomer(data)
    localStorage.setItem('customer', JSON.stringify(data))
  }

  // Refresh profile on mount
  useState(() => { refreshProfile() })

  return (
    <CustomerContext.Provider value={{ 
      customer, cart, orders, config, updateCustomer, refreshConfig,
      registerCustomer, loginCustomer, logoutCustomer, 
      addToCart, removeFromCart, updateCartQty, clearCart, cartSubtotal, cartTotal, cartCount, 
      placeOrder, refreshProfile 
    }}>
      {children}
    </CustomerContext.Provider>
  )
}

export function useCustomer() {
  const ctx = useContext(CustomerContext)
  if (!ctx) throw new Error('useCustomer must be inside CustomerProvider')
  return ctx
}
