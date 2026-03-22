import { createContext, useContext, useState, ReactNode } from 'react'

export interface Customer {
  id: string; name: string; email: string; phone: string; address: string; points: number; pendingDiscount: number
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

import { getBaseUrl } from '../utils/api'

const CustomerContext = createContext<CustomerContextType | null>(null)

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('customer')
    return saved ? JSON.parse(saved) : null
  })
  const [cart, setCart] = useState<CartItem[]>([])
  const [orders, setOrders] = useState<Order[]>([])
  const [config, setConfig] = useState<any>({ exchangeRateBCV: 36.50, storeName: 'Rexermi Tech' })

  const refreshConfig = async () => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/config`)
      const data = await resp.json()
      if (data && !data.error) setConfig(data)
    } catch (e) { console.error(e) }
  }

  useState(() => { refreshConfig() })

  const refreshProfile = async () => {
    const baseUrl = getBaseUrl()
    const token = localStorage.getItem('customerToken')
    if (!token) return
    try {
      const resp = await fetch(`${baseUrl}/api/customers/me`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (resp.ok) {
        const data = await resp.json()
        setCustomer({ id: data.id, name: data.name, email: data.email, phone: data.phone, address: data.address, points: data.points, pendingDiscount: data.pendingDiscount })
        if (data.orders) setOrders(data.orders)
      }
    } catch (e) { console.error(e) }
  }

  const registerCustomer = async (data: any): Promise<boolean> => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      return resp.ok
    } catch (e) { return false }
  }

  const loginCustomer = async (email: string, password: string): Promise<boolean> => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/customers/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      })
      if (!resp.ok) return false
      const data = await resp.json()
      setCustomer(data.customer)
      localStorage.setItem('customer', JSON.stringify(data.customer))
      localStorage.setItem('customerToken', data.token)
      await refreshProfile()
      return true
    } catch (e) { return false }
  }

  const logoutCustomer = () => { setCustomer(null); setCart([]) }

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
    const baseUrl = getBaseUrl()
    const token = localStorage.getItem('customerToken')
    try {
      const resp = await fetch(`${baseUrl}/api/customers/orders`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
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
        delete (window as any)._pendingPaymentRef
        delete (window as any)._pendingPaymentProof
        return null
      }
      const order = await resp.json()
      setOrders(prev => [order, ...prev])
      setCart([])
      // Clear pending
      delete (window as any)._pendingPaymentRef
      delete (window as any)._pendingPaymentProof
      return order
    } catch (e) {
      delete (window as any)._pendingPaymentRef
      delete (window as any)._pendingPaymentProof
      return null
    }
  }

  // Refresh profile on mount
  useState(() => { refreshProfile() })

  return (
    <CustomerContext.Provider value={{ 
      customer, cart, orders, config, refreshConfig,
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
