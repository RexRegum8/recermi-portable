import { useState, useEffect, useRef } from 'react'
import { getBaseUrl } from '../utils/api'

interface UserProfileModalProps {
  user: any
  onClose: () => void
  onSave: (updatedData: any) => Promise<void>
  readOnly?: boolean
}

export function UserProfileModal({ user, onClose, onSave, readOnly = false }: UserProfileModalProps) {
  const [activeTab, setActiveTab] = useState<'info' | 'perms' | 'attendance'>('info')
  const [formData, setFormData] = useState({ ...user })
  const [fullUser, setFullUser] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [attLoading, setAttLoading] = useState(false)
  const [showAbsenceForm, setShowAbsenceForm] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)
  const [newAbsence, setNewAbsence] = useState({ date: new Date().toISOString().split('T')[0], reason: '', isJustified: false })
  const [selectedPhoto, setSelectedPhoto] = useState<File | null>(null)
  const [selectedDoc, setSelectedDoc] = useState<File | null>(null)

  const fetchFullDetails = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/auth/${user.id}`)
      const data = await res.json()
      setFullUser(data)
    } catch (e) {
      console.error('Error fetching user details:', e)
    }
  }

  useEffect(() => {
    fetchFullDetails()
  }, [user.id])

  const handleChange = (field: string, value: any) => {
    setFormData((prev: any) => ({ ...prev, [field]: value }))
  }

  const handleTogglePerm = (perm: string) => {
    setFormData((prev: any) => ({ ...prev, [perm]: !prev[perm] }))
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'photo' | 'dataFile') => {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 10 * 1024 * 1024) { // Increase to 10MB
      alert('El archivo es demasiado grande (máx 10MB)')
      return
    }
    
    if (type === 'photo') setSelectedPhoto(file)
    else setSelectedDoc(file)

    const reader = new FileReader()
    reader.onload = (event) => {
      const base64 = event.target?.result as string
      setFormData((prev: any) => ({ ...prev, [type]: base64 }))
    }
    reader.readAsDataURL(file)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const formDataToSend = new FormData()
      Object.entries(formData).forEach(([key, val]) => {
         if (val !== undefined && key !== 'photo' && key !== 'dataFile') {
           formDataToSend.append(key, typeof val === 'object' ? JSON.stringify(val) : String(val))
         }
      })
      if (selectedPhoto) formDataToSend.append('photoFile', selectedPhoto)
      else if (formData.photo) formDataToSend.append('photo', formData.photo)

      if (selectedDoc) formDataToSend.append('dataFileFile', selectedDoc)
      else if (formData.dataFile) formDataToSend.append('dataFile', formData.dataFile)

      await onSave(formDataToSend)
      onClose()
    } catch (e) {
      alert('Error al guardar cambios')
    } finally {
      setLoading(false)
    }
  }

  const handleAttendance = async (type: 'IN' | 'OUT') => {
    setAttLoading(true)
    try {
      const resp = await fetch(`${getBaseUrl()}/api/auth/${user.id}/attendance`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type })
      })
      if (!resp.ok) throw new Error()
      fetchFullDetails()
    } catch (e) {
      alert('Error registrando asistencia')
    } finally {
      setAttLoading(false)
    }
  }

  const handleAddAbsence = async () => {
    if (!newAbsence.reason) return
    setAttLoading(true)
    try {
      const resp = await fetch(`${getBaseUrl()}/api/auth/${user.id}/absences`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newAbsence)
      })
      if (!resp.ok) throw new Error()
      setShowAbsenceForm(false)
      setNewAbsence({ date: new Date().toISOString().split('T')[0], reason: '', isJustified: false })
      fetchFullDetails()
    } catch (e) {
      alert('Error al registrar falta')
    } finally {
      setAttLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-[100] p-2 sm:p-4 scale-in-center">
      <div className="bg-white text-slate-900 w-full max-w-4xl rounded-[2rem] sm:rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        {/* Header Tabs */}
        <div className="px-6 sm:px-10 pt-4 sm:pt-6 pb-3 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
          <div className="flex gap-4 sm:gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: 'info', label: 'Datos de Empleado' },
              { id: 'perms', label: 'Permisos y Seguridad' },
              { id: 'attendance', label: 'Asistencia y Faltas' }
            ].map((tab: any) => (
              <button 
                key={tab.id} 
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2 text-xs sm:text-sm font-black transition-all relative whitespace-nowrap uppercase tracking-widest ${activeTab === tab.id ? 'text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}
              >
                {tab.label}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-600 rounded-full" />}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors font-bold text-xl ml-2">✕</button>
        </div>

        <div className="flex-1 flex flex-col md:flex-row p-6 sm:p-10 gap-8 md:gap-12 overflow-hidden">
          {/* Avatar & Side Info */}
          <div className="w-full md:w-48 flex flex-col items-center flex-shrink-0">
            <div className="w-32 h-32 sm:w-40 sm:h-40 bg-slate-100 rounded-[2.5rem] flex items-center justify-center text-6xl shadow-inner mb-6 relative group overflow-hidden border-4 border-white ring-1 ring-slate-100">
              {formData.photo?.startsWith('data:image') ? <img src={formData.photo} className="w-full h-full object-cover" /> : 
               formData.photo?.startsWith('/uploads') ? <img src={`${getBaseUrl()}${formData.photo}`} className="w-full h-full object-cover" /> :
               formData.avatar}
              {!readOnly && (
                <button 
                  onClick={() => photoInputRef.current?.click()}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-3xl"
                >
                  📷
                </button>
              )}
              <input type="file" ref={photoInputRef} hidden onChange={e => handleFileChange(e, 'photo')} accept="image/*" />
            </div>
            <div className="w-full space-y-2">
              <div className="bg-slate-900 text-white p-3 rounded-2xl text-[10px] text-center font-black uppercase tracking-widest shadow-lg">
                {formData.role}
              </div>
              <div className="bg-slate-100 border border-slate-200 p-3 rounded-2xl text-[10px] text-center font-bold text-slate-500 shadow-sm flex items-center justify-center gap-2">
                <span>@{formData.username}</span>
                {!readOnly && (
                    <select 
                      value={formData.avatar} 
                      onChange={e => handleChange('avatar', e.target.value)}
                      className="bg-transparent border-none outline-none cursor-pointer text-sm"
                    >
                        {['👤', '👨‍💼', '👩‍💼', '👨‍🔧', '👩‍🔧', '👨‍💻', '👩‍💻', '🛒', '📦', '🛠️', '💎'].map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-h-0 overflow-y-auto pr-0 sm:pr-4 custom-scrollbar">
            {activeTab === 'info' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5 pb-4">
                <div className="col-span-1 sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre Completo</label>
                    <input readOnly={readOnly} value={formData.name} onChange={e => handleChange('name', e.target.value)} className={`w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none ${readOnly ? 'opacity-70' : 'focus:bg-white focus:border-blue-500'} transition-all`} />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nombre de Usuario (Login)</label>
                    <input readOnly={readOnly} value={formData.username} onChange={e => handleChange('username', e.target.value)} className={`w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none ${readOnly ? 'opacity-70' : 'focus:bg-white focus:border-blue-500'} transition-all`} />
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Cédula / ID</label>
                  <input readOnly={readOnly} value={formData.cedula || ''} onChange={e => handleChange('cedula', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Teléfono</label>
                  <input readOnly={readOnly} value={formData.phone || ''} onChange={e => handleChange('phone', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha de Nacimiento</label>
                  <input readOnly={readOnly} type="date" value={formData.birthday ? new Date(formData.birthday).toISOString().split('T')[0] : ''} onChange={e => handleChange('birthday', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Género</label>
                  <select disabled={readOnly} value={formData.gender || ''} onChange={e => handleChange('gender', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800 outline-none">
                    <option value="">No definido</option>
                    <option value="M">Masculino</option>
                    <option value="F">Femenino</option>
                  </select>
                </div>
                <div className="col-span-1 sm:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Dirección de Habitación</label>
                  <input readOnly={readOnly} value={formData.address || ''} onChange={e => handleChange('address', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Salario Mensual ($)</label>
                  <input readOnly={readOnly} type="number" value={formData.salary || 0} onChange={e => handleChange('salary', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                <div>
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Fecha de Ingreso</label>
                  <input readOnly={readOnly} type="date" value={formData.hiredAt ? new Date(formData.hiredAt).toISOString().split('T')[0] : ''} onChange={e => handleChange('hiredAt', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm font-bold text-slate-800" />
                </div>
                {!readOnly && (
                  <div className="col-span-1 sm:col-span-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Nueva Contraseña (Dejar en blanco para no cambiar)</label>
                    <input type="password" value={formData.password || ''} onChange={e => handleChange('password', e.target.value)} className="w-full bg-slate-50/50 border border-slate-300 rounded-xl px-4 py-2.5 text-sm" placeholder="••••••••" />
                  </div>
                )}
                <div className="col-span-1 sm:col-span-2 pt-4 border-t border-slate-200">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5 block">Documento de Datos (Opcional)</label>
                  <p className="text-[10px] text-slate-500 mb-3">Sube un archivo con los datos del empleado (PDF, Imagen o Documento)</p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    {!readOnly && (
                      <button onClick={() => fileInputRef.current?.click()} className="flex-1 bg-slate-800 hover:bg-slate-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        <span>{formData.dataFile ? '🔄 CAMBIAR ARCHIVO' : '📂 SUBIR DOCUMENTO'}</span>
                      </button>
                    )}
                    {formData.dataFile && (
                      <button onClick={() => {
                        const win = window.open()
                        const docUrl = formData.dataFile?.startsWith('/uploads') ? `${getBaseUrl()}${formData.dataFile}` : formData.dataFile;
                        win?.document.write(`<iframe src="${docUrl}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`)
                      }} className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest py-3 rounded-xl transition-all flex items-center justify-center gap-2">
                        <span>👁️ VER DOCUMENTO</span>
                      </button>
                    )}
                    <input type="file" ref={fileInputRef} hidden onChange={e => handleFileChange(e, 'dataFile')} accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'perms' && (
              <div className="space-y-6">
                <div className={`bg-slate-900 p-6 rounded-3xl text-white ${readOnly ? 'opacity-80' : ''}`}>
                  <h4 className="text-xs font-black uppercase tracking-widest mb-1">Nivel de Acceso</h4>
                  <p className="text-[10px] text-slate-400 mb-4 font-bold">Define el rol principal y privilegios específicos</p>
                  <select disabled={readOnly} value={formData.role} onChange={e => handleChange('role', e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm font-bold outline-none">
                    <option value="empleado">Empleado</option>
                    <option value="supervisor">Supervisor</option>
                    <option value="admin">Administrador (Acceso Total)</option>
                  </select>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { id: 'pPOS', label: 'Ventas y POS', icon: '🛒' },
                    { id: 'pInventory', label: 'Inventario y Almacén', icon: '📦' },
                    { id: 'pSales', label: 'Historial de Ventas', icon: '📊' },
                    { id: 'pService', label: 'Servicio Técnico', icon: '🛠️' },
                    { id: 'pOrders', label: 'Pedidos Catálogo', icon: '🌐' },
                    { id: 'pCustomers', label: 'Gestión de Clientes', icon: '👥' },
                    { id: 'pSettings', label: 'Configuración / Admin', icon: '⚙️' }
                  ].map(p => (
                    <button key={p.id} disabled={readOnly} onClick={() => handleTogglePerm(p.id)}
                      className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${formData[p.id] ? 'bg-blue-50 border-blue-200 shadow-sm' : 'bg-white border-slate-200 opacity-50'}`}>
                      <div className="flex items-center gap-3">
                        <span className="text-xl">{p.icon}</span>
                        <span className="text-[10px] font-black uppercase text-slate-700 tracking-tighter">{p.label}</span>
                      </div>
                      {!readOnly && (
                        <div className={`w-10 h-5 rounded-full relative transition-all ${formData[p.id] ? 'bg-blue-600' : 'bg-slate-300'}`}>
                          <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${formData[p.id] ? 'left-5.5' : 'left-0.5'}`} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'attendance' && (
              <div className="space-y-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <button onClick={() => handleAttendance('IN')} disabled={attLoading} className="flex-1 bg-green-600 hover:bg-green-700 text-white p-6 rounded-3xl shadow-lg shadow-green-900/10 transition-all active:scale-95 flex flex-col items-center">
                    <span className="text-3xl mb-1">⏰</span>
                    <span className="text-xs font-black uppercase tracking-widest text-center">Registrar Entrada</span>
                  </button>
                  <button onClick={() => handleAttendance('OUT')} disabled={attLoading} className="flex-1 bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-3xl shadow-lg shadow-orange-900/10 transition-all active:scale-95 flex flex-col items-center">
                    <span className="text-3xl mb-1">🚪</span>
                    <span className="text-xs font-black uppercase tracking-widest text-center">Registrar Salida</span>
                  </button>
                  {!readOnly && (
                    <button onClick={() => setShowAbsenceForm(!showAbsenceForm)} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-6 rounded-3xl shadow-lg shadow-red-900/10 transition-all active:scale-95 flex flex-col items-center">
                      <span className="text-3xl mb-1">❌</span>
                      <span className="text-xs font-black uppercase tracking-widest text-center">Reportar Falta</span>
                    </button>
                  )}
                </div>

                {showAbsenceForm && (
                  <div className="bg-red-50 border border-red-200 p-6 rounded-3xl animate-in zoom-in-95">
                    <h4 className="text-[10px] font-black text-red-700 uppercase tracking-widest mb-4">Registro de Falta</h4>
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                         <div>
                            <label className="text-[9px] font-bold text-red-900 uppercase mb-1 block">Fecha</label>
                            <input type="date" value={newAbsence.date} onChange={e => setNewAbsence({...newAbsence, date: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl px-4 py-2 text-xs" />
                         </div>
                         <div className="flex items-center gap-2 pt-5">
                            <input type="checkbox" id="justified" checked={newAbsence.isJustified} onChange={e => setNewAbsence({...newAbsence, isJustified: e.target.checked})} className="w-4 h-4 rounded text-red-600" />
                            <label htmlFor="justified" className="text-[10px] font-bold text-red-900 uppercase">Justificada</label>
                         </div>
                       </div>
                       <div>
                          <label className="text-[9px] font-bold text-red-900 uppercase mb-1 block">Motivo / Descripción</label>
                          <textarea value={newAbsence.reason} onChange={e => setNewAbsence({...newAbsence, reason: e.target.value})} className="w-full bg-white border border-red-200 rounded-xl px-4 py-2 text-xs h-20 resize-none" placeholder="Ej: Enfermedad, Personal, etc." />
                       </div>
                       <div className="flex gap-2 pt-2">
                          <button onClick={() => setShowAbsenceForm(false)} className="px-4 py-2 text-[10px] font-bold text-red-700 uppercase">Cancelar</button>
                          <button onClick={handleAddAbsence} disabled={attLoading} className="bg-red-600 text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase shadow-lg shadow-red-900/20 flex-1">GUARDAR FALTA</button>
                       </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Historial Reciente</h4>
                  <div className="bg-slate-50 border border-slate-200 rounded-3xl p-2 max-h-[300px] overflow-auto custom-scrollbar">
                    {fullUser?.attendances?.length === 0 && fullUser?.absences?.length === 0 ? (
                      <div className="p-8 text-center text-slate-400 text-xs italic font-bold">No hay registros de asistencia</div>
                    ) : (
                      <div className="divide-y divide-slate-200">
                        {fullUser?.absences?.map((a: any) => (
                          <div key={a.id} className="p-4 flex justify-between items-center bg-red-50/50">
                            <div>
                              <p className="font-black text-xs text-red-600 uppercase tracking-tighter">FALTA: {a.reason}</p>
                              <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">{a.date}</p>
                            </div>
                            <span className={`px-2 py-1 rounded-lg text-[8px] font-black ${a.isJustified ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {a.isJustified ? 'JUSTIFICADA' : 'INJUSTIFICADA'}
                            </span>
                          </div>
                        ))}
                        {fullUser?.attendances?.map((a: any) => (
                          <div key={a.id} className="p-4 flex justify-between items-center bg-white">
                            <div>
                              <p className="font-black text-xs text-slate-800">ASISTENCIA (DÍA: {a.date})</p>
                              <div className="flex gap-3 text-[10px] text-slate-500 font-bold uppercase tracking-tighter">
                                <span>IN: {new Date(a.checkIn).toLocaleTimeString()}</span>
                                {a.checkOut && <span>OUT: {new Date(a.checkOut).toLocaleTimeString()}</span>}
                              </div>
                            </div>
                            <div className="text-right">
                              {a.notes && <p className="text-[9px] text-slate-400 font-medium">{a.notes}</p>}
                              {!a.checkOut && <span className="text-[9px] font-black text-green-600 animate-pulse uppercase tracking-widest">EN TURNO</span>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 sm:p-8 pt-3 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-3 bg-slate-50/50">
          <button onClick={onClose} className="px-6 py-3 font-black text-[10px] sm:text-xs tracking-[0.2em] text-slate-400 hover:text-slate-600 uppercase transition-all">
            {readOnly ? 'Cerrar' : 'Cancelar'}
          </button>
          <div className="flex-1" />
          {!readOnly && (
            <button disabled={loading} onClick={handleSave} className="bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 text-white px-8 sm:px-12 py-3.5 sm:py-4 rounded-2xl font-black text-xs sm:text-sm shadow-xl shadow-blue-500/20 transition-all flex items-center justify-center gap-2">
              {loading ? 'GUARDANDO...' : 'GUARDAR PERFIL'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
