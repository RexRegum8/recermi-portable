import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

export type UserRole = 'admin' | 'supervisor' | 'empleado'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  avatar: string
  pPOS: boolean
  pInventory: boolean
  pSales: boolean
  pService: boolean
  pOrders: boolean
  pCustomers: boolean
  pSettings: boolean
}

export interface SystemConfig {
  exchangeRateBCV: number
  exchangeRateUSDT: number
  ivaPercent: number
  storeName: string
  storeRIF: string
  storeAddress: string
  storePhone: string
  catalogUrl: string
}

interface AuthContextType {
  user: User | null
  users: User[]
  needsSetup: boolean | null
  config: SystemConfig
  updateConfig: (patch: Partial<SystemConfig>) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  refreshSetup: () => Promise<void>
  refreshConfig: () => Promise<void>
  refreshUsers: () => Promise<void>
  registerUser: (userData: any) => Promise<void>
  updateUser: (id: string, userData: any) => Promise<void>
  deleteUser: (id: string) => Promise<void>
  isAdmin: boolean
  isSupervisor: boolean
  canEdit: boolean // admin only
  canAdd: boolean  // admin + supervisor
  canSell: boolean // all roles
  canPOS: boolean
  canInventory: boolean
  canSales: boolean
  canService: boolean
  canOrders: boolean
  canCustomers: boolean
  canSettings: boolean
}

const DEFAULT_CONFIG: SystemConfig = {
  exchangeRateBCV: 36.50,
  exchangeRateUSDT: 37.20,
  ivaPercent: 16,
  storeName: 'Rexermi Tech',
  storeRIF: 'J-12345678-9',
  storeAddress: 'Av. Principal, Centro Comercial Plaza, Local 12',
  storePhone: '0414-1234567',
  catalogUrl: 'http://localhost:5173/?catalog=true',
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user')
    return saved ? JSON.parse(saved) : null
  })
  const [users, setUsers] = useState<User[]>([])
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null)
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG)
  const [isServerReady, setIsServerReady] = useState(false)

  const refreshConfig = async () => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/config`)
      const data = await resp.json()
      if (data && !data.error) setConfig(data)
    } catch (e) {
      console.error('Error fetching config:', e)
    }
  }

  const refreshSetup = async () => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/auth/needs-setup`)
      const data = await resp.json()
      setNeedsSetup(data.needsSetup ?? true)
    } catch (e) {
      console.error('Error checking setup:', e)
      setNeedsSetup(true) // Assume setup needed if server fails to answer
    }
  }

  useEffect(() => {
    let mounted = true
    const checkServer = async () => {
      const baseUrl = getBaseUrl()
      while (mounted) {
        try {
          const resp = await fetch(`${baseUrl}/api/health`)
          if (resp.ok) {
            if (mounted) {
              await Promise.all([refreshSetup(), refreshConfig()])
              setIsServerReady(true)
            }
            break
          }
        } catch (e) {
          console.error('[Health Check Failed]', e)
          // Wait 500ms before retrying if server is still starting
          await new Promise(r => setTimeout(r, 500))
        }
      }
    }
    checkServer()
    return () => { mounted = false }
  }, [])

  const refreshUsers = async () => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/auth`)
      const data = await resp.json()
      setUsers(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') refreshUsers()
  }, [user])

  const registerUser = async (userData: any) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    await refreshUsers()
  }

  const updateUser = async (id: string, userData: any) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/auth/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(userData)
    })
    await refreshUsers()
  }

  const deleteUser = async (id: string) => {
    const baseUrl = getBaseUrl()
    await fetch(`${baseUrl}/api/auth/${id}`, { method: 'DELETE' })
    await refreshUsers()
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    const baseUrl = getBaseUrl()
    
    try {
      const resp = await fetch(`${baseUrl}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      })
      if (!resp.ok) return false
      const data = await resp.json()
      setUser(data.user)
      localStorage.setItem('user', JSON.stringify(data.user))
      localStorage.setItem('token', data.token)
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('token')
  }
  const updateConfig = async (patch: Partial<SystemConfig>) => {
    const baseUrl = getBaseUrl()
    try {
      const resp = await fetch(`${baseUrl}/api/config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch)
      })
      const data = await resp.json()
      if (data && !data.error) setConfig(data)
    } catch (e) {
      console.error('Error updating config:', e)
    }
  }

  const role = user?.role

  if (!isServerReady) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-16 h-16 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin shadow-lg shadow-blue-500/20"></div>
        <p className="text-slate-400 font-bold tracking-widest uppercase text-sm animate-pulse">Iniciando Servidor...</p>
      </div>
    )
  }

  return (
    <AuthContext.Provider value={{
      user, users, needsSetup, config, updateConfig, login, logout, 
      refreshSetup, refreshConfig, refreshUsers, registerUser, updateUser, deleteUser,
      isAdmin: role === 'admin',
      isSupervisor: role === 'supervisor',
      canEdit: role === 'admin',
      canAdd: role === 'admin' || role === 'supervisor',
      canSell: true,
      canPOS: user?.pPOS || role === 'admin',
      canInventory: user?.pInventory || role === 'admin',
      canSales: user?.pSales || role === 'admin',
      canService: user?.pService || role === 'admin',
      canOrders: user?.pOrders || role === 'admin',
      canCustomers: user?.pCustomers || role === 'admin',
      canSettings: user?.pSettings || role === 'admin',
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
