import { useState } from 'react'
import { useAuth } from './auth/AuthContext'
import { LoginScreen } from './components/LoginScreen'
import { POSComponent } from './components/POSComponent'
import { ServiceDashboard } from './components/ServiceDashboard'
import { InventoryManager } from './components/InventoryManager'
import { SalesHistory } from './components/SalesHistory'
import { AdminSettings } from './components/AdminSettings'
import { OrderManager } from './components/OrderManager'
import { CustomerManager } from './components/CustomerManager'

type TabType = 'pos' | 'sales' | 'service' | 'inventory' | 'settings' | 'orders' | 'customers'

function App() {
  const { user, logout, canPOS, canSales, canOrders, canService, canInventory, canCustomers, canSettings } = useAuth()
  const [activeTab, setActiveTab] = useState<TabType>('pos')

  if (!user) return <LoginScreen />

  const tabs: { id: TabType; icon: string; label: string; show: boolean }[] = [
    { id: 'pos', icon: '🛒', label: 'POS', show: canPOS },
    { id: 'sales', icon: '📊', label: 'Ventas', show: canSales },
    { id: 'orders', icon: '📦', label: 'Pedidos Web', show: canOrders },
    { id: 'service', icon: '🛠️', label: 'Servicio', show: canService },
    { id: 'inventory', icon: '📦', label: 'Inventario', show: canInventory },
    { id: 'customers', icon: '👥', label: 'Clientes', show: canCustomers },
    { id: 'settings', icon: '⚙️', label: 'Ajustes', show: canSettings },
  ]

  const visibleTabs = tabs.filter((t) => t.show)

  const roleLabel = user.role === 'admin' ? 'ADMIN' : user.role === 'supervisor' ? 'SUPERVISOR' : 'EMPLEADO'
  const roleColor = user.role === 'admin' ? 'text-amber-400 bg-amber-500/15 border-amber-500/30' : user.role === 'supervisor' ? 'text-purple-400 bg-purple-500/15 border-purple-500/30' : 'text-slate-400 bg-slate-600/15 border-slate-600/30'

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <aside className="w-[72px] bg-slate-900/80 backdrop-blur-xl border-r border-slate-800 flex flex-col items-center py-4 shrink-0">
        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-700 rounded-xl flex items-center justify-center font-black text-lg shadow-lg shadow-blue-900/40 select-none mb-1">R</div>
        <div className="w-7 h-px bg-slate-700 my-2" />
        <nav className="flex flex-col gap-1.5 flex-1">
          {visibleTabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)} title={tab.label}
              className={`w-10 h-10 rounded-xl flex items-center justify-center text-base transition-all duration-200 relative group ${
                activeTab === tab.id ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-lg shadow-blue-900/20' : 'text-slate-500 hover:bg-slate-800/80 hover:text-slate-300'
              }`}>
              {tab.icon}
              <span className="absolute left-12 bg-slate-800 text-white text-[10px] font-bold px-2 py-1 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 shadow-xl z-50">{tab.label}</span>
            </button>
          ))}
        </nav>
        <div className="mt-auto flex flex-col items-center gap-2">
          <div className="w-7 h-px bg-slate-700" />
          <div className="text-center group relative">
            <div className="w-9 h-9 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-base cursor-default">{user.avatar}</div>
            <span className="absolute left-12 bottom-0 bg-slate-800 text-white text-[10px] font-bold px-2 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap border border-slate-700 shadow-xl z-50">
              {user.name} <span className={`ml-1 px-1 py-0.5 rounded text-[8px] border ${roleColor}`}>{roleLabel}</span>
            </span>
          </div>
          <button onClick={logout} title="Cerrar Sesión" className="w-9 h-9 rounded-xl text-slate-600 hover:bg-red-500/10 hover:text-red-400 transition-all flex items-center justify-center text-base">🚪</button>
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        {activeTab === 'pos' && <POSComponent />}
        {activeTab === 'sales' && <SalesHistory />}
        {activeTab === 'orders' && <OrderManager />}
        {activeTab === 'service' && <ServiceDashboard />}
        {activeTab === 'inventory' && <InventoryManager />}
        {activeTab === 'customers' && <CustomerManager />}
        {activeTab === 'settings' && <AdminSettings />}
      </main>
    </div>
  )
}

export default App
