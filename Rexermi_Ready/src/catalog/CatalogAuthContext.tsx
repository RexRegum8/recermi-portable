import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  address?: string
}

interface CatalogAuthContextType {
  customer: Customer | null
  login: (email: string, password: string) => Promise<boolean>
  register: (data: any) => Promise<boolean>
  logout: () => void
  isAuthenticated: boolean
}

const CatalogAuthContext = createContext<CatalogAuthContextType | null>(null)

export function CatalogAuthProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<Customer | null>(() => {
    const saved = localStorage.getItem('customer')
    return saved ? JSON.parse(saved) : null
  })

  const login = async (email: string, password: string): Promise<boolean> => {
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
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const register = async (data: any): Promise<boolean> => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/customers/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      if (!resp.ok) return false
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }

  const logout = () => {
    setCustomer(null)
    localStorage.removeItem('customer')
    localStorage.removeItem('customerToken')
  }

  return (
    <CatalogAuthContext.Provider value={{
      customer, login, register, logout,
      isAuthenticated: !!customer
    }}>
      {children}
    </CatalogAuthContext.Provider>
  )
}

export function useCatalogAuth() {
  const ctx = useContext(CatalogAuthContext)
  if (!ctx) throw new Error('useCatalogAuth must be used inside CatalogAuthProvider')
  return ctx
}
