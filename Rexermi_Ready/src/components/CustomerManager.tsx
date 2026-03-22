import { useState, useEffect } from 'react'
import { getBaseUrl } from '../utils/api'
import { useAuth } from '../auth/AuthContext'

export function CustomerManager() {
  const [customers, setCustomers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const { user } = useAuth()

  const fetchCustomers = async () => {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/customers`)
      if (!res.ok) throw new Error('Error al cargar clientes')
      const data = await res.json()
      setCustomers(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleDelete = async (id: string) => {
    if (!confirm('¿Está seguro de eliminar este cliente? Se perderán sus datos de acceso.')) return
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/customers/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar cliente')
      setCustomers(customers.filter(c => c.id !== id))
    } catch (e: any) {
      alert(e.message)
    }
  }

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5 overflow-auto">
      <header className="mb-6">
        <h1 className="text-xl font-bold tracking-tight text-white">👥 Gestión de Clientes</h1>
        <p className="text-[11px] text-slate-500">Usuarios registrados desde el catálogo online</p>
      </header>

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-slate-500 italic">Cargando clientes...</div>
      ) : error ? (
        <div className="flex-1 flex items-center justify-center text-red-400 bg-red-500/10 rounded-xl border border-red-500/20">{error}</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {customers.length === 0 ? (
            <div className="col-span-full py-20 text-center text-slate-700 italic border-2 border-dashed border-slate-900 rounded-3xl">
              No hay clientes registrados en el catálogo aún.
            </div>
          ) : customers.map(c => (
            <div key={c.id} className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all group shadow-xl">
              <div className="flex items-center gap-4 mb-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-500/20 to-blue-600/10 rounded-xl flex items-center justify-center text-2xl border border-blue-500/20">👤</div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-sm text-white truncate">{c.name}</h3>
                  <p className="text-[11px] text-slate-500 truncate">{c.email}</p>
                </div>
              </div>
              
              <div className="space-y-2.5 mb-5">
                <div className="flex justify-between text-[10px]"><span className="text-slate-600 font-bold uppercase tracking-wider">Teléfono</span><span className="text-slate-300">{c.phone || 'N/A'}</span></div>
                <div className="flex justify-between text-[10px]"><span className="text-slate-600 font-bold uppercase tracking-wider">Pedidos</span><span className="bg-blue-600/20 text-blue-400 px-2 rounded-full font-mono">{c._count.orders} realizados</span></div>
                <div className="flex flex-col gap-1 mt-2">
                   <span className="text-[9px] text-slate-600 font-bold uppercase">Dirección</span>
                   <p className="text-[10px] text-slate-400 leading-relaxed italic">"{c.address || 'Sin dirección registrada'}"</p>
                </div>
              </div>

              <div className="flex justify-between items-center pt-4 border-t border-slate-800/50">
                <span className="text-[9px] text-slate-600 font-mono">ID: {c.id.substring(0,8)}...</span>
                <button onClick={() => handleDelete(c.id)} className="w-8 h-8 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center opacity-0 group-hover:opacity-100 shadow-lg">
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
