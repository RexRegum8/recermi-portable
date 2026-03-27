import { useState, useEffect } from 'react'

interface CustomerProfileModalProps {
  customer: any
  onClose: () => void
  onSave: (updatedData: any) => Promise<void>
  isAdmin?: boolean
}

export function CustomerProfileModal({ customer, onClose, onSave, isAdmin = false }: CustomerProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'loyalty' | 'history'>('info')
  const [formData, setFormData] = useState({ ...customer })
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setPhotoFile(file)
      // Visual feedback via temporary local URL
      handleChange('photo', URL.createObjectURL(file))
    }
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      if (photoFile) {
        const data = new FormData()
        Object.keys(formData).forEach(key => {
          if (key !== 'photo' && key !== 'orders' && key !== 'sales' && key !== 'tickets' && key !== 'loyaltyMovements') {
            data.append(key, (formData as any)[key])
          }
        })
        data.append('photoFile', photoFile)
        await onSave(data)
      } else {
        await onSave(formData)
      }
      onClose()
    } catch (e) {
      alert('Error al guardar cambios')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 scale-in-center">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header Tabs */}
        <div className="px-6 sm:px-10 pt-4 sm:pt-6 pb-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
                {[
                  { id: 'info', label: 'Registro' },
                  { id: 'loyalty', label: 'Fidelidad' },
                  { id: 'history', label: 'Historial' }
                ].map((tab: any) => (
                  <button 
                    key={tab.id} 
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`pb-2 text-xs sm:text-sm font-bold transition-all relative whitespace-nowrap ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {tab.label}
                    {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full" />}
                  </button>
                ))}
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors font-bold text-xl ml-2">✕</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row p-6 sm:p-10 gap-8 md:gap-12 overflow-hidden">
            {/* Left Column: Avatar & Actions */}
            <div className="w-full md:w-48 flex flex-col items-center flex-shrink-0">
                <div className="relative group">
                  <div className="w-32 h-32 sm:w-40 sm:h-40 bg-blue-50 rounded-full flex items-center justify-center text-6xl shadow-inner mb-6 relative overflow-hidden border-4 border-white ring-1 ring-slate-100">
                    {formData.photo ? <img src={formData.photo} className="w-full h-full object-cover" /> : '👤'}
                    <label className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center transition-opacity cursor-pointer">
                      <span className="text-white text-[10px] font-black tracking-widest uppercase">Cambiar</span>
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                    </label>
                  </div>
                </div>

                <div className="w-full space-y-2 hidden md:block">
                   <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl text-[10px] text-center font-black text-slate-500 shadow-sm uppercase tracking-widest">
                     {activeTab === 'info' ? 'Perfil Personal' : activeTab === 'loyalty' ? 'Mis Puntos' : 'Movimientos'}
                   </div>
                   <div className="bg-white border border-slate-200 p-3 rounded-2xl text-[10px] text-center font-bold text-slate-400 shadow-sm lowercase">
                     {customer.email}
                   </div>
                </div>
            </div>

            {/* Right Column: Form Grid / Content */}
            <div className="flex-1 min-h-0 overflow-y-auto pr-0 sm:pr-4 custom-scrollbar">
                {activeTab === 'info' && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pb-4">
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Identificador ID</label>
                      <input disabled value={customer.id.toUpperCase()} className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-400" />
                    </div>
                    <div className="col-span-1 flex items-center gap-3 pt-4 sm:pt-6">
                      <input type="checkbox" id="isCompany" checked={formData.isCompany} onChange={e => handleChange('isCompany', e.target.checked)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="isCompany" className="text-sm font-bold text-slate-700 cursor-pointer">Persona Jurídica (Empresa)</label>
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre del Cliente / Razón Social</label>
                      <input value={formData.name} onChange={e => handleChange('name', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none" placeholder="Nombre completo..." />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha de Nac.</label>
                      <input type="date" value={formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : ''} onChange={e => handleChange('birthday', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none" />
                    </div>
                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Género</label>
                      <select value={formData.gender || ''} onChange={e => handleChange('gender', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none">
                        <option value="">No definido</option>
                        <option value="M">Masculino</option>
                        <option value="F">Femenino</option>
                        <option value="O">Prefiero no decirlo</option>
                      </select>
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Teléfono Móvil o Local</label>
                      <input value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none" placeholder="+58 412 0000000" />
                    </div>

                    <div className="col-span-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Documento CI / RIF</label>
                      <input value={formData.ci || ''} onChange={e => handleChange('ci', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none" placeholder="V-00.000.000" />
                    </div>
                    <div className="col-span-1 flex items-center gap-3 pt-4 sm:pt-6">
                      <input type="checkbox" id="taxer" checked={formData.isSpecialTaxpayer} onChange={e => handleChange('isSpecialTaxpayer', e.target.checked)} className="w-5 h-5 rounded-lg border-slate-300 text-blue-600 focus:ring-blue-500" />
                      <label htmlFor="taxer" className="text-[10px] font-bold text-slate-500 uppercase leading-tight cursor-pointer">Contribuyente Especial / Rural</label>
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dirección Principal</label>
                      <input value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none" placeholder="Av, Calle, Edificio, Local..." />
                    </div>

                    <div className="col-span-1 sm:col-span-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Correo Electrónico de Contacto</label>
                      <input type="email" value={formData.email} onChange={e => handleChange('email', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 focus:bg-white focus:border-blue-500 transition-all outline-none" placeholder="correo@empresa.com" />
                    </div>
                  </div>
                )}

                {activeTab === 'loyalty' && (
                  <div className="space-y-6">
                    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 p-8 rounded-[2rem] text-white shadow-xl shadow-blue-900/10 flex flex-col sm:flex-row justify-between items-center gap-4">
                       <div className="text-center sm:text-left">
                         <p className="text-[10px] font-black tracking-[0.2em] text-blue-100 uppercase mb-2 opacity-80">Saldo Rexer-Points</p>
                         <h3 className="text-5xl font-black font-mono tracking-tighter">{customer.points} <span className="text-xl">PTS</span></h3>
                       </div>
                       <div className="bg-white/10 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/20 text-center sm:text-right">
                         <p className="text-[10px] text-blue-100 font-bold uppercase mb-1">Valor en Moneda</p>
                         <p className="text-2xl font-black">${(customer.points * 0.1).toFixed(2)} USD</p>
                       </div>
                    </div>
                    
                    <div className="space-y-4">
                       <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Movimientos Recientes</h4>
                       <div className="bg-white border border-slate-200 rounded-[1.5rem] divide-y divide-slate-100 overflow-hidden shadow-sm">
                          {(!customer.loyaltyMovements || customer.loyaltyMovements.length === 0) ? (
                            <div className="p-8 text-center text-slate-400 text-xs font-bold italic">No hay movimientos registrados</div>
                          ) : (
                            customer.loyaltyMovements.map((m: any) => (
                              <div key={m.id} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                                <div>
                                  <p className="font-black text-sm text-slate-800">{m.reason}</p>
                                  <p className="text-[10px] text-slate-400 font-bold uppercase">FECHA: {new Date(m.createdAt).toLocaleDateString()}</p>
                                </div>
                                <span className={`px-3 py-1 rounded-full text-xs font-black font-mono ${m.points > 0 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                  {m.points > 0 ? '+' : ''}{m.points} PTS
                                </span>
                              </div>
                            ))
                          )}
                       </div>
                    </div>
                  </div>
                )}

                {activeTab === 'history' && (
                   <div className="space-y-8">
                      {/* Pedidos Web */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                          <span>Pedidos Catalogo (Online)</span>
                          <span className="text-orange-500">{(customer.orders || []).length} Total</span>
                        </h4>
                        <div className="grid gap-3">
                          {(customer.orders || []).length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                              <p className="text-slate-400 italic text-xs font-bold">Sin pedidos web pendientes</p>
                            </div>
                          ) : (
                            customer.orders.map((o: any) => (
                              <div key={o.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-orange-200 transition-all shadow-sm border-l-4 border-l-orange-500">
                                <div className="flex gap-4 items-center w-full">
                                   <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center text-xl">🛒</div>
                                   <div>
                                      <p className="font-black text-sm text-slate-900">ID: {o.id.slice(0,8).toUpperCase()}</p>
                                      <div className="flex gap-3 text-[10px] text-slate-500 font-bold">
                                         <span>📅 {new Date(o.createdAt).toLocaleDateString()}</span>
                                         <span className={`uppercase ${o.status === 'PENDING' ? 'text-orange-500' : 'text-green-500'}`}>{o.status}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  <p className="font-black text-orange-600 font-mono text-lg">${o.total.toFixed(2)}</p>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Monto Online</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Ventas */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                          <span>Facturacion Local (POS)</span>
                          <span className="text-blue-500">{(customer.sales || []).length} Total</span>
                        </h4>
                        <div className="grid gap-3">
                          {(customer.sales || []).length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                              <p className="text-slate-400 italic text-xs font-bold">No hay transacciones de facturación</p>
                            </div>
                          ) : (
                            customer.sales.map((s: any) => (
                              <div key={s.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-blue-200 transition-all shadow-sm">
                                <div className="flex gap-4 items-center w-full">
                                   <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-xl">📄</div>
                                   <div>
                                      <p className="font-black text-sm text-slate-900">{s.saleNumber}</p>
                                      <div className="flex gap-3 text-[10px] text-slate-500 font-bold">
                                         <span>📅 {new Date(s.createdAt).toLocaleDateString()}</span>
                                         <span>💳 {s.paymentMethod}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  <p className="font-black text-green-600 font-mono text-lg">${s.total.toFixed(2)}</p>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Liquidado</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>

                      {/* Tickets / Servicios */}
                      <div className="space-y-4">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex justify-between">
                          <span>Servicios Técnicos</span>
                          <span className="text-indigo-500">{(customer.tickets || []).length} Total</span>
                        </h4>
                        <div className="grid gap-3">
                          {(customer.tickets || []).length === 0 ? (
                            <div className="text-center py-10 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                              <p className="text-slate-400 italic text-xs font-bold">Sin historial de servicio técnico</p>
                            </div>
                          ) : (
                            customer.tickets.map((t: any) => (
                              <div key={t.id} className="bg-white border border-slate-200 p-4 rounded-2xl flex flex-col sm:flex-row justify-between items-center gap-3 hover:border-indigo-200 transition-all shadow-sm border-l-4 border-l-indigo-500">
                                <div className="flex gap-4 items-center w-full">
                                   <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-xl">🛠️</div>
                                   <div>
                                      <p className="font-black text-sm text-indigo-900">{t.tkNumber}</p>
                                      <p className="text-[11px] font-bold text-slate-700">{t.device}</p>
                                      <div className="flex gap-3 text-[10px] text-slate-500 font-bold mt-0.5">
                                         <span>📅 {new Date(t.date || t.createdAt).toLocaleDateString()}</span>
                                         <span className="uppercase text-indigo-500">{t.status}</span>
                                      </div>
                                   </div>
                                </div>
                                <div className="flex flex-col items-end w-full sm:w-auto mt-2 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100">
                                  <p className="font-black text-indigo-600 font-mono text-lg">${(t.cost || 0).toFixed(2)}</p>
                                  <p className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">Costo Servicio</p>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                   </div>
                )}
            </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 sm:p-8 pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 bg-slate-50/50">
            <button 
              onClick={onClose} 
              className="px-6 py-3 font-black text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 hover:text-slate-600 uppercase transition-all text-center"
            >
              Cancelar
            </button>
            <div className="flex-1" />
            <button 
              disabled={loading}
              onClick={handleSave} 
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-blue-500/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                   <span>Guardando...</span>
                </div>
              ) : (
                <>
                  <span>GUARDAR CAMBIOS</span>
                  <span className="text-[10px] opacity-60 hidden sm:inline ml-2">F2</span>
                </>
              )}
            </button>
        </div>
      </div>
    </div>
  )
}
