import { useAuth, UserRole } from '../auth/AuthContext'
import { useProductStore } from '../store/ProductStore'
import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'

import { UserProfileModal } from './UserProfileModal'

export function AdminSettings() {
  const { config, updateConfig, users, registerUser, deleteUser, updateUser } = useAuth()
  const { products, updateProduct } = useProductStore()
  const [saved, setSaved] = useState(false)
  const [showAddUser, setShowAddUser] = useState(false)
  const [selectedUserForProfile, setSelectedUserForProfile] = useState<any | null>(null)
  const [activeAdminTab, setActiveAdminTab] = useState<'system'|'catalog'|'fidelity'|'users'>('system')
  const [formConfig, setFormConfig] = useState<any>(config)
  const [selectedLogoFile, setSelectedLogoFile] = useState<File | null>(null)

  useEffect(() => {
    setFormConfig(config)
  }, [config])
  
  // Auto-Update States
  const [updateStatus, setUpdateStatus] = useState<'idle' | 'checking' | 'available' | 'downloading' | 'downloaded' | 'error'>('idle')
  const [downloadProgress, setDownloadProgress] = useState(0)
  const [updateInfo, setUpdateInfo] = useState<any>(null)

  useEffect(() => {
    const api = (window as any).electronAPI
    if (!api) return

    const unsubAvailable = api.onUpdateAvailable((info: any) => {
      setUpdateInfo(info)
      setUpdateStatus('available')
    })

    const unsubProgress = api.onDownloadProgress((progress: any) => {
      setUpdateStatus('downloading')
      setDownloadProgress(Math.floor(progress.percent))
    })

    const unsubDownloaded = api.onUpdateDownloaded((info: any) => {
      setUpdateInfo(info)
      setUpdateStatus('downloaded')
    })

    return () => {
      if (typeof unsubAvailable === 'function') unsubAvailable()
      if (typeof unsubProgress === 'function') unsubProgress()
      if (typeof unsubDownloaded === 'function') unsubDownloaded()
    }
  }, [])

  useEffect(() => {
    // Escuchar el evento del túnel desde Electron y auto-configurar
    const api = (window as any).electronAPI;
    if (api) {
      if (api.getTunnelUrl && config.tunnelMode === 'auto') {
        const url = api.getTunnelUrl();
        if (url) {
          const fullUrl = `${url}/?catalog=true`;
          if (config.catalogUrl !== fullUrl) {
            updateConfig({ catalogUrl: fullUrl });
          }
        }
      }

      if (api.onTunnelReady) {
        const unsubscribe = api.onTunnelReady((url: string) => {
          if (config.tunnelMode === 'auto') {
            const fullUrl = `${url}/?catalog=true`;
            if (config.catalogUrl !== fullUrl) {
              updateConfig({ catalogUrl: fullUrl });
            }
          }
        });
        return () => unsubscribe();
      }
    }
  }, [config.tunnelMode, config.catalogUrl, updateConfig]);
  
  const [newUser, setNewUser] = useState({ 
    name: '', username: '', password: '', role: 'empleado' as UserRole, avatar: '👤',
    cedula: '', phone: '', cvData: '', photo: '', dataFile: '',
    pPOS: true, pInventory: false, pSales: true, pService: false, pOrders: false, pCustomers: false, pSettings: false 
  })

  const fetchBCV = async () => {
    console.log('[FRONTEND-ADMIN] Fetching BCV exchange rate...')
    try {
      const resp = await fetch(`${getBaseUrl()}/api/config/fetch-bcv`)
      const data = await resp.json()
      if (data.price) {
        console.log(`[FRONTEND-ADMIN] BCV rate obtained: ${data.price}`)
        setFormConfig({ ...formConfig, exchangeRateBCV: data.price })
        const dateStr = data.date ? ` (Fecha: ${data.date})` : ''
        alert(`Tasa BCV obtenida: ${data.price} Bs${dateStr}. Verifica con el portal oficial si es fin de semana.`)
      }
    } catch (e: any) { 
      console.error(`[FRONTEND-ADMIN] Error fetching BCV: ${e.message}`)
      alert('Error al obtener la tasa') 
    }
  }

  const fetchUSDT = async () => {
    console.log('[FRONTEND-ADMIN] Fetching USDT exchange rate...')
    try {
      const resp = await fetch(`${getBaseUrl()}/api/config/fetch-paralelo`)
      const data = await resp.json()
      if (data.price) {
        console.log(`[FRONTEND-ADMIN] USDT rate obtained: ${data.price}`)
        setFormConfig({ ...formConfig, exchangeRateUSDT: data.price })
        alert(`Tasa USDT actualizada: ${data.price} Bs`)
      }
    } catch (e: any) { 
      console.error(`[FRONTEND-ADMIN] Error fetching USDT: ${e.message}`)
      alert('Error al obtener la tasa USDT') 
    }
  }

  const handleAddUser = async () => {
    if (!newUser.name || !newUser.username || !newUser.password) return
    const formData = new FormData()
    Object.entries(newUser).forEach(([key, val]) => {
      if (val !== undefined && key !== 'photo') formData.append(key, val.toString())
    })
    
    // If we have a file in the new user (need to handle it in the modal/form)
    // For now assuming we just register with basic data and then edit profile
    await registerUser(formData)
    setShowAddUser(false)
    setNewUser({ 
      name: '', username: '', password: '', role: 'empleado', avatar: '👤',
      cedula: '', phone: '', cvData: '', photo: '', dataFile: '',
      pPOS: true, pInventory: false, pSales: true, pService: false, pOrders: false, pCustomers: false, pSettings: false
    })
  }

  const handleUpdateUserDetails = async (updatedData: any) => {
    const { id, ...data } = updatedData
    await updateUser(id, data)
    setSelectedUserForProfile(null)
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
          <h1 className="text-xl font-bold tracking-tight">⚙️ Panel de Control Administrador</h1>
          <p className="text-[11px] text-slate-500">Configuración global, marca y gestión de personal</p>
        </div>
        <div className="flex bg-slate-900/50 p-1 rounded-xl border border-slate-800">
           {(['system', 'catalog', 'fidelity', 'users'] as const).map(tab => (
             <button key={tab} onClick={() => setActiveAdminTab(tab)}
               className={`px-4 py-1.5 rounded-lg text-[10px] font-bold transition-all ${activeAdminTab === tab ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
               {tab === 'system' ? 'SISTEMA' : tab === 'catalog' ? 'CATÁLOGO' : tab === 'fidelity' ? 'FIDELIDAD' : 'USUARIOS'}
             </button>
           ))}
        </div>
      </header>

      <div className="flex-1 max-w-6xl">
        {activeAdminTab === 'system' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-6">
              <h2 className="font-bold text-sm mb-4 flex items-center gap-2">💱 Tasas y Moneda</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Tasa BCV (Bs)</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={formConfig.exchangeRateBCV} onChange={(e) => setFormConfig({ ...formConfig, exchangeRateBCV: Number(e.target.value) })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" />
                    <button onClick={fetchBCV} className="bg-slate-800 hover:bg-slate-700 px-3 rounded-xl border border-slate-700">🔄</button>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Tasa USDT (Bs)</label>
                  <div className="flex gap-2">
                    <input type="number" step="0.01" value={formConfig.exchangeRateUSDT} onChange={(e) => setFormConfig({ ...formConfig, exchangeRateUSDT: Number(e.target.value) })}
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono focus:ring-1 focus:ring-blue-500 outline-none" />
                    <button onClick={fetchUSDT} className="bg-slate-800 hover:bg-slate-700 px-3 rounded-xl border border-slate-700">🔄</button>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">IVA %</label>
                  <input type="number" value={formConfig.ivaPercent} onChange={(e) => setFormConfig({ ...formConfig, ivaPercent: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono outline-none" />
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Días Garantía (Def.)</label>
                  <input type="number" value={formConfig.defaultWarrantyDays || 30} onChange={(e) => setFormConfig({ ...formConfig, defaultWarrantyDays: Number(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="font-bold text-sm mb-4 flex items-center gap-2">🏪 Identidad de Marca</h2>
                <div className="space-y-4">
                  <div className="flex gap-4 items-end">
                    <div className="flex-1">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Logo de la Empresa</label>
                      <input type="file" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          setSelectedLogoFile(file)
                          const reader = new FileReader()
                          reader.onloadend = () => setFormConfig({ ...formConfig, companyLogo: reader.result as string })
                          reader.readAsDataURL(file)
                        }
                      }}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs font-mono outline-none" />
                    </div>
                    <div className="w-16 h-16 bg-slate-800 border border-slate-700 rounded-xl flex items-center justify-center overflow-hidden">
                      {formConfig.companyLogo?.startsWith('data:image') ? <img src={formConfig.companyLogo} className="max-w-full max-h-full" /> : 
                       formConfig.companyLogo?.startsWith('/uploads') ? <img src={`${getBaseUrl()}${formConfig.companyLogo}`} className="max-w-full max-h-full" /> :
                       <span className="text-xl">🖼️</span>}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="col-span-2">
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Nombre Comercial</label>
                      <input value={formConfig.storeName} onChange={(e) => setFormConfig({ ...formConfig, storeName: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">RIF / ID Fiscal</label>
                      <input value={formConfig.storeRIF} onChange={(e) => setFormConfig({ ...formConfig, storeRIF: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm font-mono outline-none" />
                    </div>
                    <div>
                      <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Teléfono Contacto</label>
                      <input value={formConfig.storePhone} onChange={(e) => setFormConfig({ ...formConfig, storePhone: e.target.value })}
                        className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-sm outline-none" />
                    </div>
                    <div className="col-span-2">
                       <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1.5 block">Dirección de la Tienda</label>
                       <textarea value={formConfig.storeAddress} onChange={(e) => setFormConfig({ ...formConfig, storeAddress: e.target.value })}
                         className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2.5 text-xs min-h-[60px] resize-none outline-none focus:ring-1 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
                <h2 className="font-bold text-sm mb-4 flex items-center gap-2">🔄 Mantenimiento y Actualizaciones</h2>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-slate-800">
                    <div>
                      <p className="text-xs font-bold">Versión del Sistema</p>
                      <p className="text-[10px] text-slate-500 font-mono">Build: {(window as any).electronAPI?.getAppVersion() || 'v1.0.0'} (Rexermi-OS)</p>
                    </div>
                    {updateStatus === 'idle' && (
                      <button 
                        onClick={() => {
                          setUpdateStatus('checking')
                          ;(window as any).electronAPI?.checkUpdates()
                        }}
                        className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg text-[10px] font-black transition-all"
                      >
                        BUSCAR ACTUALIZACIÓN
                      </button>
                    )}
                    {updateStatus === 'checking' && <span className="text-[10px] text-blue-400 animate-pulse font-bold">BUSCANDO...</span>}
                    {updateStatus === 'available' && (
                      <div className="text-right">
                         <p className="text-[10px] text-green-400 font-bold mb-1">Nueva Versión: {updateInfo?.version}</p>
                         <p className="text-[8px] text-slate-500">Descargando...</p>
                      </div>
                    )}
                  </div>

                  {updateStatus === 'downloading' && (
                    <div className="space-y-2">
                      <div className="flex justify-between text-[10px] font-bold">
                        <span className="text-blue-400">DESCARGANDO... {downloadProgress}%</span>
                      </div>
                      <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                        <div className="bg-blue-500 h-full transition-all" style={{ width: `${downloadProgress}%` }} />
                      </div>
                    </div>
                  )}

                  {updateStatus === 'downloaded' && (
                    <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl">
                      <p className="text-green-400 text-xs font-bold text-center mb-3">✅ ¡Versión {updateInfo?.version} lista!</p>
                      <button 
                        onClick={() => (window as any).electronAPI?.installUpdate()}
                        className="w-full bg-green-600 hover:bg-green-700 text-white font-black py-2.5 rounded-lg text-[10px]"
                      >
                        REINICIAR Y ACTUALIZAR
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'catalog' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
               <h2 className="font-bold text-sm uppercase tracking-widest text-slate-400">Escaparate Digital</h2>
               <div className="flex gap-2">
                  <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-800">
                    <p className="text-[10px] text-slate-400 mb-1">Tu dirección de acceso:</p>
                    <p className="text-[11px] font-mono font-bold text-amber-400 break-all">
                      {formConfig.tunnelMode === 'custom' 
                        ? (formConfig.customDomain ? `https://${formConfig.customDomain}` : 'https://tu-dominio-configurado.com') 
                        : ( (window as any).electronAPI?.getTunnelUrl() || 'Iniciando túnel...') }
                    </p>
                  </div>
                  <button onClick={() => window.open(formConfig.tunnelMode === 'custom' ? `https://${formConfig.customDomain}` : formConfig.catalogUrl, '_blank')} className="bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-xl text-[10px] font-black tracking-widest shadow-lg">VER PÁGINA EN VIVO</button>
               </div>

             {/* Configuración de Red Avanzada */}
             <div className="mb-6 p-4 bg-slate-800/20 border border-slate-800 rounded-2xl">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-500 mb-4">🌐 Configuración de Red Profesional</h3>
               <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div>
                   <label className="text-[9px] font-bold text-slate-500 uppercase mb-2 block">Modo de Conexión</label>
                   <div className="flex bg-slate-900 rounded-xl p-1 border border-slate-800">
                     <button onClick={() => {
                        setFormConfig({ ...formConfig, tunnelMode: 'auto' });
                     }} className={`flex-1 py-2 rounded-lg text-[9px] font-bold transition-all ${formConfig.tunnelMode !== 'custom' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                       TÚNEL AUTOMÁTICO
                     </button>
                     <button onClick={() => {
                        setFormConfig({ ...formConfig, tunnelMode: 'custom' });
                     }} className={`flex-1 py-2 rounded-lg text-[9px] font-bold transition-all ${formConfig.tunnelMode === 'custom' ? 'bg-amber-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}>
                       DOMINIO PROPIO
                     </button>
                   </div>
                   <p className="text-[8px] text-slate-600 mt-2 px-1">
                     {formConfig.tunnelMode === 'custom' 
                       ? 'Usa tu propio dominio permanente mediante un Cloudflare Tunnel Token.' 
                       : 'Usa una dirección temporal autogenerada (ideal para pruebas rápidas).'}
                   </p>
                 </div>
                 
                 {formConfig.tunnelMode === 'custom' && (
                   <div className="animate-in fade-in slide-in-from-left-2 space-y-4">
                     <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase mb-2 block">Cloudflare Tunnel Token</label>
                       <input 
                         type="password"
                         value={formConfig.tunnelToken || ''} 
                         onChange={(e) => setFormConfig({ ...formConfig, tunnelToken: e.target.value })}
                         className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-amber-400 outline-none focus:border-amber-500/50" 
                         placeholder="Pega tu token aquí..." 
                       />
                       <p className="text-[8px] text-amber-500/60 mt-2 px-1 font-bold">⚠️ IMPORTANTE: En Cloudflare, apunta a http://localhost:3001</p>
                     </div>
                     <div>
                       <label className="text-[9px] font-bold text-slate-500 uppercase mb-2 block">Nombre de tu Dominio</label>
                       <input 
                         type="text"
                         value={formConfig.customDomain || ''} 
                         onChange={(e) => setFormConfig({ ...formConfig, customDomain: e.target.value })}
                         className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 text-xs font-mono text-blue-400 outline-none focus:border-blue-500/50" 
                         placeholder="ej: rexermi.uk" 
                       />
                     </div>
                   </div>
                 )}
               </div>
             </div>

             <div className="space-y-3 max-h-[400px] overflow-auto custom-scrollbar pr-2">
               {products.map(p => (
                 <div key={p.id} className="bg-slate-800/40 p-3 rounded-2xl border border-slate-800 flex items-center justify-between group hover:border-blue-500/30 transition-all">
                    <div className="flex items-center gap-4">
                       <span className="text-2xl opacity-60 group-hover:opacity-100 transition-opacity">
                         {p.image?.startsWith('data:image') ? <img src={p.image} className="w-8 h-8 rounded-lg object-cover inline-block mr-2" /> : 
                          p.image?.startsWith('/uploads') ? <img src={`${getBaseUrl()}${p.image}`} className="w-8 h-8 rounded-lg object-cover inline-block mr-2" /> :
                          p.image}
                       </span>
                       <div>
                         <p className="font-bold text-sm tracking-tight">{p.name}</p>
                         <p className="text-[10px] text-slate-500 font-mono italic">{p.sku} | {p.category}</p>
                       </div>
                    </div>
                    <div className="flex items-center gap-6">
                       <div className="text-right">
                          <p className="text-green-400 font-bold text-sm">${p.price.toFixed(2)}</p>
                          <p className="text-[9px] text-slate-500 uppercase font-bold">Stock: {p.stock}</p>
                       </div>
                       <button onClick={() => updateProduct(p.id, { showInCatalog: !p.showInCatalog })}
                         className={`w-12 h-6 rounded-full relative transition-all duration-300 ${p.showInCatalog ? 'bg-blue-600' : 'bg-slate-700'}`}>
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all duration-300 ${p.showInCatalog ? 'left-7' : 'left-1'}`} />
                       </button>
                    </div>
                 </div>
               ))}
             </div>
          </div>
        )}

        {activeAdminTab === 'fidelity' && (
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl max-w-2xl">
            <h2 className="font-black text-sm uppercase tracking-widest text-blue-400 mb-6 flex items-center gap-2">💎 Sistema de Puntos y Fidelización</h2>
            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 bg-blue-600/10 border border-blue-500/20 rounded-2xl">
                <div>
                  <p className="font-bold text-sm">Habilitar Fidelización</p>
                  <p className="text-[10px] text-slate-500">Permitir que los clientes acumulen puntos por sus compras</p>
                </div>
                <button onClick={() => updateConfig({ fidelityEnabled: !config.fidelityEnabled })}
                  className={`w-14 h-7 rounded-full relative transition-all duration-300 ${config.fidelityEnabled ? 'bg-green-600 shadow-lg shadow-green-900/30' : 'bg-slate-700'}`}>
                  <div className={`absolute top-1 w-5 h-5 bg-white rounded-full transition-all duration-300 ${config.fidelityEnabled ? 'left-8' : 'left-1'}`} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-800/50 rounded-2xl border border-slate-800">
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-2 block">Puntos por cada $10</label>
                  <input type="number" value={formConfig.ptsPer10Usd || 1} onChange={e => setFormConfig({ ...formConfig, ptsPer10Usd: parseInt(e.target.value) })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-4 py-3 text-lg font-black font-mono text-blue-400 outline-none" />
                  <p className="text-[8px] text-slate-600 mt-2">Ej: Si es 1, una compra de $100 otorga 10 puntos.</p>
                </div>
                <div className="p-4 border-2 border-dashed border-slate-800 rounded-2xl flex flex-col items-center justify-center text-slate-700 text-center">
                  <span className="text-3xl mb-1">🎁</span>
                  <p className="text-[10px] font-bold uppercase tracking-widest">Tienda de Canjes</p>
                  <p className="text-[9px] mt-1">Configure recompensas en el módulo de Inventario</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeAdminTab === 'users' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex justify-between items-center mb-6">
                <h2 className="font-bold text-sm uppercase tracking-widest text-slate-400">Equipo de Trabajo</h2>
                <button onClick={() => setShowAddUser(true)} className="bg-blue-600 text-white px-4 py-1.5 rounded-lg text-[10px] font-black shadow-lg">NUEVO ACCESO</button>
              </div>
              <div className="space-y-2">
                {users.map(u => {
                   const cfg = roleLabel(u.role)
                   return (
                     <div key={u.id} className="flex justify-between items-center p-3 bg-slate-800/40 border border-slate-800 rounded-2xl group transition-all">
                        <div className="flex items-center gap-3">
                          <span className="text-2xl">{u.avatar}</span>
                          <div>
                            <p className="font-bold text-sm">{u.name}</p>
                            <div className="flex items-center gap-2">
                              <p className="text-[10px] text-indigo-400 font-mono">@{u.username}</p>
                              {u.cedula && <span className="text-[9px] text-slate-500 font-mono">| {u.cedula}</span>}
                              {u.phone && <span className="text-[9px] text-slate-500 font-mono">| 📞 {u.phone}</span>}
                              {u.cvData && <span className="text-[9px] text-slate-500 font-mono" title="Tiene CV registrado">| 📄 CV</span>}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className={`px-2 py-0.5 rounded-full text-[8px] font-black border ${cfg.color}`}>{cfg.label}</span>
                          <button onClick={() => setSelectedUserForProfile(u)} className="opacity-0 group-hover:opacity-100 p-2 text-slate-500 hover:text-white transition-all text-xs">✏️</button>
                        </div>
                     </div>
                   )
                })}
              </div>
            </div>

            <div className="bg-slate-900/30 border border-slate-800 border-dashed rounded-[3rem] p-8 flex flex-col items-center justify-center text-center">
               <span className="text-5xl opacity-20 mb-4">🔐</span>
               <h3 className="text-sm font-black uppercase tracking-tighter mb-2">Seguridad y Permisos</h3>
               <p className="text-xs text-slate-600">El Administrador tiene acceso total. Los Supervisores pueden editar inventario y ver reportes. El personal solo opera Ventas y Caja.</p>
            </div>
          </div>
        )}
      </div>

  <div className="fixed bottom-6 right-6">
        <button onClick={async () => { 
            const formData = new FormData()
            Object.entries(formConfig).forEach(([key, val]) => {
              if (val !== undefined && key !== 'companyLogo') {
                 formData.append(key, typeof val === 'object' ? JSON.stringify(val) : val.toString())
              }
            })
            if (selectedLogoFile) {
              formData.append('logoFile', selectedLogoFile)
            } else if (formConfig.companyLogo) {
              formData.append('companyLogo', formConfig.companyLogo)
            }

            await updateConfig(formData);
            setSelectedLogoFile(null)
            if (formConfig.tunnelMode !== config.tunnelMode || formConfig.tunnelToken !== config.tunnelToken) {
              (window as any).electronAPI?.updateTunnelConfig({ mode: formConfig.tunnelMode, token: formConfig.tunnelToken });
            }
            setSaved(true); 
            setTimeout(() => setSaved(false), 2000); 
          }}
          className={`flex items-center gap-3 px-8 py-4 rounded-full font-black text-sm uppercase tracking-widest transition-all shadow-2xl ${saved ? 'bg-green-600' : 'bg-blue-600 hover:scale-105 active:scale-95'}`}>
          {saved ? '✅ GUARDADO' : '💾 APLICAR CAMBIOS'}
        </button>
      </div>

      {showAddUser && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-6">
          <div className="bg-slate-900 border border-slate-800 p-8 rounded-[2.5rem] w-full max-w-sm shadow-2xl animate-in zoom-in-95">
             <div className="text-center mb-8">
               <span className="text-5xl block mb-2">👤</span>
               <h3 className="text-xl font-black">Nuevo Colaborador</h3>
             </div>
             <div className="space-y-4 max-h-[60vh] overflow-auto px-2 pb-2">
               <input placeholder="Nombre Real" value={newUser.name} onChange={e => setNewUser({...newUser, name: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm" />
               <div className="grid grid-cols-2 gap-3">
                 <input placeholder="Usuario" value={newUser.username} onChange={e => setNewUser({...newUser, username: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs font-mono" />
                 <input type="password" placeholder="Password" value={newUser.password} onChange={e => setNewUser({...newUser, password: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs" />
               </div>
               <div className="grid grid-cols-2 gap-3">
                 <input placeholder="Cédula" value={newUser.cedula} onChange={e => setNewUser({...newUser, cedula: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs font-mono" />
                 <input placeholder="Teléfono" value={newUser.phone} onChange={e => setNewUser({...newUser, phone: e.target.value})} className="bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs font-mono" />
               </div>
               <div>
                 <textarea placeholder="Currículum / Experiencia Laboral / Notas" value={newUser.cvData} onChange={e => setNewUser({...newUser, cvData: e.target.value})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-xs min-h-[100px] resize-none" />
               </div>
               <select value={newUser.role} onChange={e => setNewUser({...newUser, role: e.target.value as any})} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm">
                 <option value="empleado">Empleado</option>
                 <option value="supervisor">Supervisor</option>
                 <option value="admin">Administrador</option>
               </select>
             </div>
             <div className="flex gap-4 mt-8">
               <button onClick={() => setShowAddUser(false)} className="flex-1 py-4 text-xs font-bold bg-slate-800 rounded-2xl">Cerrar</button>
               <button onClick={handleAddUser} className="flex-1 py-4 text-xs font-black bg-blue-600 rounded-2xl">CREAR ACCESO</button>
             </div>
          </div>
        </div>
      )}

      {selectedUserForProfile && (
        <UserProfileModal 
          user={selectedUserForProfile} 
          onClose={() => setSelectedUserForProfile(null)}
          onSave={handleUpdateUserDetails}
        />
      )}
    </div>
  )
}
