import { createContext, useContext, useState, ReactNode, useEffect } from 'react'
import { getBaseUrl, fetchWithAuth } from '../utils/api'

export type UserRole = 'admin' | 'supervisor' | 'empleado'

export interface User {
  id: string
  name: string
  username: string
  role: UserRole
  avatar: string
  cedula?: string
  phone?: string
  cvData?: string
  photo?: string
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
  companyLogo?: string
  tunnelMode: string
  tunnelToken?: string
  customDomain?: string
  fidelityEnabled: boolean
  ptsPer10Usd: number
  defaultWarrantyDays: number
}

interface AuthContextType {
  user: User | null
  users: User[]
  needsSetup: boolean | null
  config: SystemConfig
  updateConfig: (patch: Partial<SystemConfig>) => void
  login: (username: string, password: string) => Promise<boolean>
  logout: () => void
  setupServer: (config: { mode: 'SERVER' | 'CLIENT', serverIp: string }) => Promise<void>
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
  catalogUrl: `${getBaseUrl()}/?catalog=true`,
  companyLogo: '',
  tunnelMode: 'auto',
  tunnelToken: '',
  customDomain: '',
  fidelityEnabled: false,
  ptsPer10Usd: 1,
  defaultWarrantyDays: 30
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
  const [setupConfig, setSetupConfig] = useState<{ mode: 'SERVER' | 'CLIENT', serverIp: string } | null>(() => {
    const saved = localStorage.getItem('rexermi_config')
    return saved ? JSON.parse(saved) : null
  })

  const refreshConfig = async () => {
    try {
      const resp = await fetchWithAuth('/api/config')
      const data = await resp.json()
      if (data && !data.error) {
        setConfig(data)
        // Resume custom tunnel on startup if configured
        if (data.tunnelMode === 'custom' && data.tunnelToken) {
          (window as any).electronAPI?.updateTunnelConfig({ 
            mode: 'custom', 
            token: data.tunnelToken 
          })
        }
      }
    } catch (e) {
      console.error('Error fetching config:', e)
    }
  }

  const refreshSetup = async () => {
    try {
      const resp = await fetchWithAuth('/api/auth/needs-setup')
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
      // If we don't have a setup config yet, we can't check the server properly
      if (!setupConfig) {
        setNeedsSetup(true)
        setIsServerReady(true) // Ready to show the SetupWizard
        return
      }

      const baseUrl = getBaseUrl()
      console.log(`[AUTH] Checking server at ${baseUrl} (Mode: ${setupConfig.mode})`)
      
      while (mounted) {
        try {
          const resp = await fetchWithAuth('/api/health')
          if (resp.ok) {
            if (mounted) {
              const setupResp = await fetchWithAuth('/api/auth/needs-setup')
              const setupData = await setupResp.json()
              const isSetupNeeded = setupData.needsSetup ?? true
              setNeedsSetup(isSetupNeeded)
              
              if (isSetupNeeded) {
                localStorage.removeItem('user')
                setUser(null)
              }
              
              await refreshConfig()
              
              if (user) {
                try {
                  const uResp = await fetchWithAuth(`/api/auth/${user.id}`)
                  if (!uResp.ok) logout()
                } catch (e) { logout() }
              }
              
              setIsServerReady(true)
            }
            break
          }
        } catch (e) {
          console.error('[Health Check Failed]', e)
          await new Promise(r => setTimeout(r, 1000))
        }
      }
    }
    checkServer()
    return () => { mounted = false }
  }, [setupConfig])

  const refreshUsers = async () => {
    try {
      const resp = await fetchWithAuth('/api/auth')
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
    const resp = await fetchWithAuth('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(userData)
    })
    const data = await resp.json()
    if (data.token) localStorage.setItem('auth_token', data.token)
    await refreshUsers()
  }

  const updateUser = async (id: string, userData: any) => {
    const resp = await fetchWithAuth(`/api/auth/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(userData)
    })
    
    if (resp.ok) {
      const updatedUser = await resp.json()
      // If we updated the current user, update the state and localStorage
      if (user && id === user.id) {
        setUser(updatedUser)
        localStorage.setItem('user', JSON.stringify(updatedUser))
      }
      await refreshUsers()
    }
  }

  const deleteUser = async (id: string) => {
    await fetchWithAuth(`/api/auth/${id}`, { method: 'DELETE' })
    await refreshUsers()
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      const resp = await fetchWithAuth('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      })
      if (!resp.ok) return false
      const data = await resp.json()
      
      // Save user and token
      setUser(data.user)
      localStorage.setItem('user', JSON.stringify(data.user))
      if (data.token) localStorage.setItem('auth_token', data.token)
      
      return true
    } catch (e) {
      console.error(e)
      return false
    }
  }
  const logout = async () => {
    try {
      await fetchWithAuth('/api/auth/logout', { method: 'POST' })
    } catch (e) { console.error(e) }
    setUser(null)
    localStorage.removeItem('user')
    localStorage.removeItem('auth_token')
  }

  const setupServer = async (config: { mode: 'SERVER' | 'CLIENT', serverIp: string }) => {
    localStorage.setItem('rexermi_config', JSON.stringify(config))
    setSetupConfig(config)
    setIsServerReady(false) // Trigger re-check
    setNeedsSetup(null)
  }
  const updateConfig = async (patch: Partial<SystemConfig>) => {
    try {
      const resp = await fetchWithAuth('/api/config', {
        method: 'PATCH',
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
      user, users, needsSetup, config, updateConfig, login, logout, setupServer,
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
