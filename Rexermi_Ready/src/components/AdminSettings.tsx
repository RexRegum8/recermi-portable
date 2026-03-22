import { useAuth, UserRole } from '../auth/AuthContext'
import { useProductStore } from '../store/ProductStore'
import { useState } from 'react'

export function AdminSettings() {
  const { config, updateConfig, users, registerUser, deleteUser } = useAuth()
  const { products, updateProduct } = useProductStore()
  const [saved, setSaved] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<any | null>(null)
  const [activeAdminTab, setActiveAdminTab] = useState<'system'|'catalog'|'users'>('system')
  const [newUser, setNewUser] = useState({ 
    name: '', username: '', password: '', role: 'empleado' as UserRole, avatar: '👤',
    pPOS: true, pInventory: false, pSales: true, pService: false, pOrders: false, pCustomers: false, pSettings: false 
  })
  const { updateUser } = useAuth()

  const save = () => { 
    setSaved(true)
    setTimeout(() => setSaved(false), 2000) 
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) return
    await registerUser(newUser)
    setShowAddUser(false)
    setNewUser({ 
      name: '', username: '', password: '', role: 'empleado', avatar: '👤',
      pPOS: true, pInventory: false, pSales: true, pService: false, pOrders: false, pCustomers: false, pSettings: false
    })
  }

  const handleUpdateUserDetails = async () => {
    if (!editingUser) return
    const { id, ...data } = editingUser
    await updateUser(id, data)
    setEditingUser(null)
  }

  const roleLabel = (role: string) => {
    if (role === 'admin') return { label: 'ADMIN', color: 'text-amber-400 bg-amber-500/15 border-amber-500/30' }
    if (role === 'supervisor') return { label: 'SUPERVISOR', color: 'text-purple-400 bg-purple-500/15 border-purple-500/30' }
    return { label: 'EMPLEADO', color: 'text-slate-400 bg-slate-600/15 border-slate-600/30' }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5 overflow-auto">
      <header className="mb-6 flex justify-between items-end">
        <div>
          <h1 className="text-xl font-bold tracking-tight">⚙️ Panel de Administración</h1>
          <p className="text-[11px] text-slate-500">Configuración general y gestión de personal</p>
        </div>
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
           {(['system', 'catalog', 'users'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveAdminTab(tab)}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeAdminTab === tab ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-slate-300'}`}>
               {tab === 'system' ? 'SISTEMA' : tab === 'catalog' ? 'CATÁLOGO' : 'USUARIOS'}
             </button>
           ))}
        </div>
      </header>

      <div className="flex-1 max-w-5xl">
        {activeAdminTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Exchange Rates */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">💱 Tasas de Cambio</h2>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Tasa BCV (Bs)</label>
                    <input type="number" step="0.01" value={config.exchangeRateBCV} onChange={(e) => updateConfig({ exchangeRateBCV: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Tasa USDT (Bs)</label>
                    <input type="number" step="0.01" value={config.exchangeRateUSDT} onChange={(e) => updateConfig({ exchangeRateUSDT: Number(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">IVA %</label>
                  <input type="number" step="1" value={config.ivaPercent} onChange={(e) => updateConfig({ ivaPercent: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>

            {/* Store Info */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">🏪 Datos de la Empresa</h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Nombre de la Tienda</label>
                  <input value={config.storeName} onChange={(e) => updateConfig({ storeName: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">RIF / Documento</label>
                  <input value={config.storeRIF} onChange={(e) => updateConfig({ storeRIF: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Teléfono</label>
                  <input value={config.storePhone} onChange={(e) => updateConfig({ storePhone: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Dirección Fiscal</label>
                  <input value={config.storeAddress} onChange={(e) => updateConfig({ storeAddress: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'catalog' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-bold text-sm flex items-center gap-2">🛒 Visibilidad en Catálogo Online</h2>
              <button onClick={() => {
                if (window.electronAPI) {
                  window.electronAPI.openExternal(config.catalogUrl)
                } else {
                  window.open(config.catalogUrl, '_blank')
                }
              }} className="bg-blue-600/15 text-blue-400 border border-blue-500/30 px-3 py-1.5 rounded-lg font-bold text-[10px] hover:bg-blue-600 hover:text-white transition-all">
                🌐 VER PÁGINA WEB
              </button>
            </div>
            <div className="mt-4 p-4 bg-slate-800/50 rounded-xl border border-slate-700">
              <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">URL del Catálogo Online</label>
              <input value={config.catalogUrl} onChange={(e) => updateConfig({ catalogUrl: e.target.value })}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              <p className="text-[9px] text-slate-500 mt-2 italic">⚠️ Este enlace es externo y se abrirá en su navegador predeterminado (Chrome, Edge, etc).</p>
            </div>
            
            <div className="space-y-2 mt-6 max-h-[400px] overflow-auto pr-1">
              {products.length === 0 ? (
                <p className="text-center py-10 text-slate-600 italic">No hay productos registrados en el inventario.</p>
              ) : products.map(p => (
                <div key={p.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group hover:border-slate-600 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl">{p.image}</div>
                    <div>
                      <div className="font-bold text-sm">{p.name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{p.sku} | {p.category}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                       <div className="text-[10px] font-bold text-blue-400">${p.price.toFixed(2)}</div>
                       <div className="text-[8px] text-slate-500">Stock: {p.stock}</div>
                    </div>
                    <button onClick={() => updateProduct(p.id, { showInCatalog: !p.showInCatalog })}
                      className={`w-12 h-6 rounded-full relative transition-all duration-300 ${p.showInCatalog ? 'bg-blue-600 shadow-lg shadow-blue-900/30' : 'bg-slate-700'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${p.showInCatalog ? 'left-7' : 'left-1'}`} />
                    </button>
                    <span className={`text-[9px] font-black w-10 ${p.showInCatalog ? 'text-blue-400' : 'text-slate-600'}`}>
                      {p.showInCatalog ? 'WEB' : 'Oculto'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* User Management */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
              <div className="flex justify-between items-center mb-4">
                <h2 className="font-bold text-sm flex items-center gap-2">👥 Gestión de Personal</h2>
                <button onClick={() => setShowAddUser(true)} className="bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-lg font-bold text-[10px] transition-all shadow-lg shadow-blue-900/20">
                  + AGREGAR USUARIO
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-auto pr-1">
                {users.map((u) => {
                  const cfg = roleLabel(u.role)
                  return (
                    <div key={u.id} className="bg-slate-800/40 border border-slate-700/50 rounded-xl p-3 flex items-center justify-between group hover:border-slate-600 transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-slate-700 rounded-xl flex items-center justify-center text-xl shadow-inner">{u.avatar}</div>
                        <div>
                          <div className="font-bold text-sm">{u.name}</div>
                          <div className="text-[10px] text-slate-500 font-mono">@{u.username}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 rounded-md text-[9px] font-bold border ${cfg.color}`}>{cfg.label}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => setEditingUser(u)} className="w-8 h-8 rounded-lg bg-blue-500/10 text-blue-400 hover:bg-blue-500 hover:text-white transition-all flex items-center justify-center shadow-lg">
                            ✏️
                          </button>
                          {u.username !== 'admin' && (
                            <button onClick={() => deleteUser(u.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center shadow-lg">
                              🗑️
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            {/* Permissions Preview */}
            <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-5 shadow-xl">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">🔐 Matriz de Permisos</h2>
              <div className="overflow-hidden rounded-xl border border-slate-800">
                <table className="w-full text-[10px]">
                  <thead className="bg-slate-800/50">
                    <tr className="text-slate-500 uppercase tracking-widest">
                      <th className="p-2 text-left">Función</th>
                      <th className="p-2 text-center">Adm</th>
                      <th className="p-2 text-center">Sup</th>
                      <th className="p-2 text-center">Emp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {[
                      ['Ventas / POS', '✅', '✅', '✅'],
                      ['Ver Historial', '✅', '✅', '✅'],
                      ['Cierre Caja', '✅', '❌', '❌'],
                      ['Servicio Téc.', '✅', '✅', '❌'],
                      ['Inventario', '✅', '✅', '❌'],
                      ['Ajustes Sist.', '✅', '❌', '❌'],
                    ].map(([label, adm, sup, emp], i) => (
                      <tr key={i} className="hover:bg-slate-800/30">
                        <td className="p-2 text-slate-300 font-medium">{label}</td>
                        <td className="p-2 text-center">{adm}</td>
                        <td className="p-2 text-center">{sup}</td>
                        <td className="p-2 text-center">{emp}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Save Button */}
      <div className="mt-8 mb-4">
        <button onClick={save} 
          className={`flex items-center gap-2 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${
            saved ? 'bg-green-600 shadow-green-900/40 ' : 'bg-blue-600 hover:bg-blue-700 shadow-blue-900/40 hover:scale-[1.02]'
          }`}>
          {saved ? '✅ Configuración Guardada' : '💾 Confirmar Cambios'}
        </button>
      </div>

      {/* Edit User Modal */}
      {editingUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[10000] p-4">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
               <div className="text-4xl mb-3">{editingUser.avatar}</div>
               <h3 className="font-black text-xl">Editar Colaborador</h3>
               <p className="text-xs text-slate-500 mt-1">Modifique los datos de {editingUser.username}</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Nombre Real</label>
                <input value={editingUser.name} onChange={e => setEditingUser({...editingUser, name: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Password (Dejar en blanco para no cambiar)</label>
                <input type="password" placeholder="••••••" value={editingUser.password || ''} onChange={e => setEditingUser({...editingUser, password: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              {editingUser.username !== 'admin' && (
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Rol / Cargo</label>
                  <select value={editingUser.role} onChange={e => setEditingUser({...editingUser, role: e.target.value as any})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                    <option value="empleado">Empleado de Ventas</option>
                    <option value="supervisor">Supervisor de Tienda</option>
                    <option value="admin">Administrador Total</option>
                  </select>
                </div>
              )}

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">Módulos Permitidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pPOS', label: '🛒 POS' },
                    { id: 'pSales', label: '📊 Ventas' },
                    { id: 'pOrders', label: '📦 Pedidos' },
                    { id: 'pCustomers', label: '👥 Clientes' },
                    { id: 'pService', label: '🛠️ Servicio' },
                    { id: 'pInventory', label: '📦 Inventario' },
                    { id: 'pSettings', label: '⚙️ Ajustes' },
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={editingUser[p.id]} onChange={e => setEditingUser({...editingUser, [p.id]: e.target.checked})}
                        className="w-3.5 h-3.5 rounded accent-blue-500 bg-slate-700 border-slate-600" />
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setEditingUser(null)} className="flex-1 py-4 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all">CANCELAR</button>
              <button onClick={handleUpdateUserDetails} className="flex-1 py-4 text-xs font-black bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-900/30">GUARDAR CAMBIOS</button>
            </div>
          </div>
        </div>
      )}

      {/* New User Modal */}
      {showAddUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[10000] p-4 animate-in fade-in duration-300">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-3xl w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-300" onClick={e => e.stopPropagation()}>
            <div className="text-center mb-6">
               <div className="text-4xl mb-3">{newUser.avatar}</div>
               <h3 className="font-black text-xl">Nuevo Colaborador</h3>
               <p className="text-xs text-slate-500 mt-1">Configure las credenciales de acceso</p>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Nombre Real</label>
                <input placeholder="Ej: Pedro Pérez" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Usuario</label>
                  <input placeholder="vendedor1" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Password</label>
                  <input type="password" placeholder="••••••" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} 
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all" />
                </div>
              </div>
              <div>
                <label className="text-[10px] uppercase tracking-widest text-slate-600 font-bold mb-1.5 block ml-1">Rol / Cargo</label>
                <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} 
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all appearance-none">
                  <option value="empleado">Empleado de Ventas</option>
                  <option value="supervisor">Supervisor de Tienda</option>
                  <option value="admin">Administrador Total</option>
                </select>
              </div>

              <div className="bg-slate-800/50 p-3 rounded-xl border border-slate-700">
                <label className="text-[9px] uppercase tracking-widest text-slate-500 font-bold mb-3 block">Módulos Permitidos</label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: 'pPOS', label: '🛒 POS' },
                    { id: 'pSales', label: '📊 Ventas' },
                    { id: 'pOrders', label: '📦 Pedidos' },
                    { id: 'pCustomers', label: '👥 Clientes' },
                    { id: 'pService', label: '🛠️ Servicio' },
                    { id: 'pInventory', label: '📦 Inventario' },
                    { id: 'pSettings', label: '⚙️ Ajustes' },
                  ].map(p => (
                    <label key={p.id} className="flex items-center gap-2 cursor-pointer group">
                      <input type="checkbox" checked={(newUser as any)[p.id]} onChange={e => setNewUser({...newUser, [p.id]: e.target.checked})}
                        className="w-3.5 h-3.5 rounded accent-blue-500 bg-slate-700 border-slate-600" />
                      <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">{p.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAddUser(false)} className="flex-1 py-4 text-xs font-bold bg-slate-800 hover:bg-slate-700 rounded-2xl transition-all">CANCELAR</button>
              <button onClick={handleAddUser} className="flex-1 py-4 text-xs font-black bg-blue-600 hover:bg-blue-700 rounded-2xl transition-all shadow-lg shadow-blue-900/30">CREAR ACCESO</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
