import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'
import { getBaseUrl } from '../utils/api'
import { useProductStore } from '../store/ProductStore'

export function QuotationManager() {
  const { user, config, canEdit } = useAuth()
  const { products } = useProductStore()
  const [quotations, setQuotations] = useState<any[]>([])
  const [selected, setSelected] = useState<any | null>(null)
  const [showNew, setShowNew] = useState(false)
  
  // New Q form
  const [customerName, setCustomerName] = useState('')
  const [customerEmail, setCustomerEmail] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [validDays, setValidDays] = useState(7)
  const [items, setItems] = useState<any[]>([])
  const [query, setQuery] = useState('')
  const [discount, setDiscount] = useState(0)

  // Customer search
  const [custQuery, setCustQuery] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [filteredCust, setFilteredCust] = useState<any[]>([])

  const fetchQuotations = async () => {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/quotations`)
      const data = await res.json()
      setQuotations(Array.isArray(data) ? data : [])
    } catch (e) {
      console.error(e)
    }
  }

  const fetchCustomers = async () => {
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/customers`)
      const data = await res.json()
      setCustomers(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchQuotations()
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (custQuery.length > 1) {
      setFilteredCust(customers.filter(c => c.name?.toLowerCase().includes(custQuery.toLowerCase()) || (c.ci && c.ci.includes(custQuery))))
    } else {
      setFilteredCust([])
    }
  }, [custQuery, customers])

  const selectCustomer = (c: any) => {
    setCustomerName(c.name)
    setCustomerEmail(c.email || '')
    setCustomerPhone(c.phone || '')
    setCustQuery('')
    setFilteredCust([])
  }

  const addItem = (p: any) => {
    setItems(prev => {
      const ex = prev.find(i => i.productId === p.id)
      if (ex) {
        if (ex.qty + 1 > p.stock) {
          alert(`Stock insuficiente. Solo hay ${p.stock} disponibles.`)
          return prev
        }
        return prev.map(i => i.productId === p.id ? { ...i, qty: i.qty + 1 } : i)
      }
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, qty: 1, price: p.price, discount: 0, stock: p.stock }]
    })
    setQuery('')
  }

  const removeItem = (id: string) => setItems(prev => prev.filter(i => i.productId !== id))
  
  const updateQty = (id: string, qty: number) => {
    setItems(prev => prev.map(i => {
      if (i.productId === id) {
        if (qty > i.stock) {
          alert(`Solo puedes agregar hasta ${i.stock} unidades.`)
          return i
        }
        return { ...i, qty: Math.max(1, qty) }
      }
      return i
    }))
  }

  const subtotal = items.reduce((a, i) => a + (i.price * i.qty), 0)
  const discountAmt = subtotal * (discount / 100)
  const iva = (subtotal - discountAmt) * (config.ivaPercent / 100)
  const total = subtotal - discountAmt + iva

  const handleCreate = async () => {
    if (!customerName || items.length === 0) return
    const baseUrl = getBaseUrl()
    const validUntil = new Date()
    validUntil.setDate(validUntil.getDate() + validDays)

    try {
      const res = await fetch(`${baseUrl}/api/quotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName, customerEmail, customerPhone,
          items, subtotal, globalDiscount: discount, iva, total,
          notes,
          validUntil: validUntil.toISOString()
        })
      })
      if (res.ok) {
        setShowNew(false)
        setItems([]); setCustomerName(''); setCustomerEmail(''); setCustomerPhone(''); setNotes(''); setDiscount(0)
        fetchQuotations()
      } else {
        const err = await res.json()
        alert(err.error || 'Error al guardar')
      }
    } catch (e) {
      alert('Error de conexión')
    }
  }

  const handleSync = async (id: string) => {
    if (!confirm('Esta acción actualizará los precios a los valores actuales y renovará la validez por 7 días. ¿Continuar?')) return
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/quotations/${id}/sync`, { method: 'PATCH' })
      if (res.ok) {
        alert('Presupuesto actualizado')
        fetchQuotations()
        setSelected(null)
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handleConvert = async (id: string) => {
    if (!confirm('¿Convertir este presupuesto en una venta real? Se descontará del stock.')) return
    const baseUrl = getBaseUrl()
    try {
      const res = await fetch(`${baseUrl}/api/quotations/${id}/convert`, { method: 'POST' })
      if (res.ok) {
        alert('Venta procesada con éxito')
        fetchQuotations()
        setSelected(null)
      } else {
        const err = await res.json()
        alert(err.error || 'Error al convertir')
      }
    } catch (e) {
      console.error(e)
    }
  }

  const handlePrint = (q: any) => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const itemsHtml = q.items.map((i: any) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${i.product?.name || i.name} (x${i.qty})</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${i.price.toFixed(2)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${(i.price * i.qty).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Presupuesto ${q.number}</title>
          <style>
            body { font-family: sans-serif; padding: 40px; color: #333; }
            .header { display: flex; justify-content: space-between; margin-bottom: 40px; }
            .store-info h1 { margin: 0; color: #1e293b; }
            .logo { height: 60px; margin-bottom: 10px; }
            .q-info { text-align: right; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th { background: #f8fafc; text-align: left; padding: 12px; border-bottom: 2px solid #e2e8f0; }
            .totals { margin-left: auto; width: 250px; margin-top: 20px; }
            .totals div { display: flex; justify-content: space-between; padding: 4px 0; }
            .footer { margin-top: 50px; font-size: 12px; color: #64748b; text-align: center; border-top: 1px solid #e2e8f0; padding-top: 20px; }
          </style>
        </head>
        <body>
          <div class="header">
            <div class="store-info">
              ${config.companyLogo ? `<img src="${config.companyLogo}" class="logo" />` : ''}
              <h1>${config.storeName}</h1>
              <p>${config.storeRIF}<br>${config.storeAddress}<br>${config.storePhone}</p>
            </div>
            <div class="q-info">
              <h2 style="margin:0; color: #3b82f6;">PRESUPUESTO</h2>
              <p style="font-weight: bold; font-size: 1.2em;">${q.number}</p>
              <p>Fecha: ${new Date(q.createdAt).toLocaleDateString()}</p>
              <p>Validez: ${q.validUntil ? new Date(q.validUntil).toLocaleDateString() : 'N/A'}</p>
            </div>
          </div>
          <div style="margin-bottom: 30px;">
            <p><strong>Cliente:</strong> ${q.customerName}</p>
            ${q.customerEmail ? `<p><strong>Email:</strong> ${q.customerEmail}</p>` : ''}
            ${q.customerPhone ? `<p><strong>Teléfono:</strong> ${q.customerPhone}</p>` : ''}
          </div>
          <table>
            <thead><tr><th>Producto</th><th style="text-align: right;">Precio Unit.</th><th style="text-align: right;">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
          </table>
          <div class="totals">
            <div><span>Subtotal:</span><span>$${q.subtotal.toFixed(2)}</span></div>
            ${q.globalDiscount > 0 ? `<div style="color: #16a34a;"><span>Descuento (${q.globalDiscount}%):</span><span>-$${(q.subtotal * q.globalDiscount / 100).toFixed(2)}</span></div>` : ''}
            <div><span>IVA (${config.ivaPercent}%):</span><span>$${q.iva.toFixed(2)}</span></div>
            <div style="font-size: 1.2em; font-weight: bold; border-top: 1px solid #ccc; margin-top: 5px; padding-top: 10px;">
              <span>TOTAL USD:</span><span>$${q.total.toFixed(2)}</span>
            </div>
            <div style="color: #64748b; font-size: 11px;">
              <span>Total Bs:</span><span>${(q.total * config.exchangeRateBCV).toFixed(2)}</span>
            </div>
          </div>
          ${q.notes ? `<div style="margin-top: 30px; font-size: 13px;"><strong>Notas:</strong><br>${q.notes}</div>` : ''}
          <div class="footer">Este documento no representa una factura fiscal. Precios sujetos a cambio sin previo aviso.</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filteredProducts = query.length > 1 ? products.filter(p => p.name?.toLowerCase().includes(query.toLowerCase()) || p.sku?.toLowerCase().includes(query.toLowerCase())) : []

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-5">
      <header className="flex justify-between items-center mb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Presupuestos y Cotizaciones</h1>
          <p className="text-xs text-slate-500">Gestione cotizaciones para clientes y viértalas en ventas</p>
        </div>
        <button onClick={() => setShowNew(true)} className="bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded-lg font-bold text-sm transition-all shadow-lg">+ Nuevo Presupuesto</button>
      </header>

      <div className="flex gap-4 flex-1 min-h-0">
        <div className="flex-1 overflow-auto bg-slate-900/40 rounded-xl border border-slate-800 p-4 shadow-inner">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-slate-500 text-[10px] uppercase tracking-wider border-b border-slate-800">
                <th className="pb-3 px-2">Número</th>
                <th className="pb-3">Cliente</th>
                <th className="pb-3">Fecha</th>
                <th className="pb-3">Total</th>
                <th className="pb-3">Estado</th>
                <th className="pb-3 text-right pr-2">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {quotations.map(q => {
                const isExpired = q.status === 'EXPIRED' || (q.status === 'PENDING' && q.validUntil && new Date(q.validUntil) < new Date())
                return (
                  <tr key={q.id} className="hover:bg-slate-800/20 cursor-pointer group" onClick={() => setSelected(q)}>
                    <td className="py-4 px-2 font-mono text-blue-400 font-bold">{q.number}</td>
                    <td className="py-4">
                      <div className="font-semibold">{q.customerName}</div>
                      <div className="text-[10px] text-slate-500">{q.customerEmail || q.customerPhone}</div>
                    </td>
                    <td className="py-4 text-slate-400">{new Date(q.createdAt).toLocaleDateString()}</td>
                    <td className="py-4 font-mono font-bold text-green-400">${q.total.toFixed(2)}</td>
                    <td className="py-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${
                        q.status === 'CONVERTED' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 
                        isExpired ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                        'bg-yellow-500/10 text-yellow-400 border-yellow-500/20'
                      }`}>
                        {q.status === 'CONVERTED' ? 'Convertido' : isExpired ? 'Vencido' : 'Pendiente'}
                      </span>
                    </td>
                    <td className="py-4 text-right pr-2">
                      <button onClick={(e) => { e.stopPropagation(); handlePrint(q) }} className="p-1 px-2 bg-slate-800 hover:bg-slate-700 rounded text-xs mr-2 transition-colors">🖨️</button>
                      {q.status !== 'CONVERTED' && isExpired && (
                        <button onClick={(e) => { e.stopPropagation(); handleSync(q.id) }} className="p-1 px-2 bg-amber-600/20 text-amber-400 hover:bg-amber-600/30 rounded text-xs font-bold mr-2">🔄 Sinc</button>
                      )}
                      {q.status === 'PENDING' && !isExpired && canEdit && (
                        <button onClick={(e) => { e.stopPropagation(); handleConvert(q.id) }} className="p-1 px-2 bg-blue-600 hover:bg-blue-700 rounded text-xs font-bold shadow-lg shadow-blue-900/40">🛒 Cobrar</button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {selected && (
          <aside className="w-96 bg-slate-900 border border-slate-800 rounded-xl p-5 flex flex-col gap-4 overflow-auto shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="flex justify-between items-start">
              <div>
                <h2 className="text-lg font-bold text-blue-400">{selected.number}</h2>
                <p className="text-xs text-slate-400">{selected.customerName}</p>
              </div>
              <button onClick={() => setSelected(null)} className="text-slate-500 hover:text-white transition-colors">✕</button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-800/50 p-3 rounded-lg border border-slate-700/50">
                <p className="text-[10px] text-slate-500 uppercase font-bold mb-2 tracking-widest">Detalle de Artículos</p>
                <div className="space-y-2">
                  {selected.items.map((it: any) => (
                    <div key={it.id} className="flex justify-between items-center text-xs">
                      <div className="flex-1 pr-2">
                        <div className="font-medium text-slate-200">{it.product?.name || 'Producto'}</div>
                        <div className="text-[9px] text-slate-500 font-mono">SKU: {it.product?.sku} | x{it.qty} de ${it.price}</div>
                      </div>
                      <div className="font-mono text-blue-300">${(it.price * it.qty).toFixed(2)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 px-1">
                <div className="flex justify-between text-xs text-slate-400"><span>Subtotal</span><span className="font-mono">${selected.subtotal.toFixed(2)}</span></div>
                {selected.globalDiscount > 0 && <div className="flex justify-between text-xs text-green-400"><span>Descuento ({selected.globalDiscount}%)</span><span className="font-mono">-${(selected.subtotal * selected.globalDiscount / 100).toFixed(2)}</span></div>}
                <div className="flex justify-between text-xs text-slate-400"><span>IVA ({config.ivaPercent}%)</span><span className="font-mono">${selected.iva.toFixed(2)}</span></div>
                <div className="flex justify-between text-lg font-black text-green-400 pt-2 border-t border-slate-800 mt-1">
                  <span>TOTAL USD</span><span>${selected.total.toFixed(2)}</span>
                </div>
                <div className="text-right text-[10px] text-slate-500 font-mono tracking-tight">≈ {(selected.total * config.exchangeRateBCV).toFixed(2)} Bs (BCV)</div>
              </div>

              {selected.notes && (
                <div className="bg-slate-800/30 p-2.5 rounded-lg text-[11px] text-slate-400 italic border-l-2 border-slate-600">
                  "{selected.notes}"
                </div>
              )}
            </div>

            <div className="mt-auto flex flex-col gap-2">
              <button onClick={() => handlePrint(selected)} className="w-full bg-slate-800 hover:bg-slate-700 py-2.5 rounded-lg text-sm font-bold transition-all border border-slate-700">🖨️ Imprimir PDF</button>
              {selected.status !== 'CONVERTED' && canEdit && (
                <button onClick={() => handleConvert(selected.id)} className="w-full bg-blue-600 hover:bg-blue-700 py-2.5 rounded-lg text-sm font-bold transition-all shadow-xl shadow-blue-900/40">🛒 Procesar como Venta</button>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* New Quotation Modal */}
      {showNew && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-6 md:p-10">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl h-full flex flex-col shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200" onClick={e => e.stopPropagation()}>
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
              <div>
                <h2 className="text-xl font-bold">Crear Nuevo Presupuesto</h2>
                <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Generación de Cotización Formal</p>
              </div>
              <button onClick={() => setShowNew(false)} className="text-slate-500 hover:text-white p-2">✕</button>
            </div>
            
            <div className="flex-1 flex overflow-hidden">
              {/* Left: Client & Items */}
              <div className="flex-1 p-6 overflow-auto flex flex-col gap-6 border-r border-slate-800 bg-slate-950/20">
                <div className="relative">
                  <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Datos del Cliente</label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="relative col-span-1">
                      <input value={custQuery} onChange={e => { setCustQuery(e.target.value); setCustomerName(e.target.value) }} 
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500/50 transition-all" placeholder="Buscar o escribir nombre..." />
                      {filteredCust.length > 0 && (
                        <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[60] overflow-hidden">
                          {filteredCust.map(c => (
                            <div key={c.id} onClick={() => selectCustomer(c)} className="p-2.5 hover:bg-blue-600/20 cursor-pointer border-b border-slate-700/50 last:border-0 transition-colors">
                              <div className="text-xs font-bold text-slate-200">{c.name}</div>
                              <div className="text-[9px] text-slate-500 font-mono">{c.ci || 'Sin CI'} | {c.email || 'Sin correo'}</div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                    <input value={customerEmail} onChange={e => setCustomerEmail(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="Email (Opcional)" />
                    <input value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none" placeholder="Teléfono" />
                  </div>
                </div>

                <div className="flex-1 flex flex-col bg-slate-950/50 rounded-xl border border-slate-800 overflow-hidden shadow-inner">
                  <div className="p-3 border-b border-slate-800 bg-slate-900/80 sticky top-0 z-10 backdrop-blur-sm">
                    <input value={query} onChange={e => setQuery(e.target.value)} placeholder="🔍 Buscar producto por nombre o SKU..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500/20" />
                    {filteredProducts.length > 0 && (
                      <div className="absolute mt-1 left-3 right-3 max-h-48 overflow-auto bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-50">
                        {filteredProducts.map(p => (
                          <div key={p.id} onClick={() => addItem(p)} className="p-2.5 hover:bg-blue-600/20 cursor-pointer flex justify-between items-center text-xs border-b border-slate-700/50 transition-colors">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-200">{p.name} <span className="text-[9px] text-slate-500 font-mono ml-1">({p.sku})</span></span>
                              <span className="text-[9px] text-slate-400 capitalize">{p.category} | Almacén: {p.warehouse}</span>
                            </div>
                            <div className="flex flex-col text-right">
                              <span className="font-mono text-green-400 font-bold text-sm">${p.price}</span>
                              <span className={`text-[8px] font-bold ${p.stock < 5 ? 'text-red-400' : 'text-slate-500'}`}>Stock: {p.stock}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 p-3 overflow-auto">
                    {items.length === 0 ? (
                      <div className="h-full flex flex-col items-center justify-center text-slate-700 gap-2 opacity-50">
                        <span className="text-3xl">🧺</span>
                        <span className="text-[10px] uppercase font-bold tracking-widest">El presupuesto está vacío</span>
                      </div>
                    ) : (
                      <table className="w-full text-left text-xs">
                        <thead><tr className="text-slate-600 border-b border-slate-800 pb-2 uppercase text-[9px] font-bold tracking-wider"><th className="pb-3 px-1">Producto</th><th className="pb-3 text-center">Cant</th><th className="pb-3 text-right">Precio</th><th className="pb-3 text-right">Total</th><th className="pb-3"></th></tr></thead>
                        <tbody className="divide-y divide-slate-800/30">
                          {items.map(it => (
                            <tr key={it.productId} className="hover:bg-slate-800/20 transition-colors group">
                              <td className="py-3 px-1">
                                <div className="font-bold text-slate-200">{it.name}</div>
                                <div className="text-[9px] text-slate-500 font-mono">{it.sku}</div>
                              </td>
                              <td className="py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                  <button onClick={() => updateQty(it.productId, it.qty - 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]">-</button>
                                  <input type="number" value={it.qty} onChange={e => updateQty(it.productId, Number(e.target.value))} className="w-10 bg-slate-800 border border-slate-700 rounded px-1 outline-none text-center h-6 font-mono text-xs" />
                                  <button onClick={() => updateQty(it.productId, it.qty + 1)} className="w-5 h-5 bg-slate-800 hover:bg-slate-700 rounded text-[10px]">+</button>
                                </div>
                              </td>
                              <td className="py-3 text-right font-mono text-slate-300">
                                <input type="number" value={it.price} onChange={e => setItems(items.map(x => x.productId === it.productId ? {...x, price: Number(e.target.value)} : x))} className="w-16 bg-transparent border-b border-transparent hover:border-slate-700 focus:border-blue-500 text-right outline-none h-6 px-1" />
                              </td>
                              <td className="py-3 text-right font-mono font-bold text-blue-300">${(it.price * it.qty).toFixed(2)}</td>
                              <td className="py-3 text-right"><button onClick={() => removeItem(it.productId)} className="text-slate-700 hover:text-red-400 transition-colors p-1 px-2">✕</button></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>

              {/* Right: Summary & Action */}
              <div className="w-80 p-6 bg-slate-900 flex flex-col gap-5 border-l border-slate-800 shadow-2xl">
                <div className="space-y-4">
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Descuento Global (%)</label>
                    <input type="number" min="0" max="100" value={discount} onChange={e => setDiscount(Math.min(100, Math.max(0, Number(e.target.value))))} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm font-mono text-green-400 outline-none focus:ring-1 focus:ring-green-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Vigencia (Días)</label>
                    <input type="number" value={validDays} onChange={e => setValidDays(Math.max(1, Number(e.target.value)))} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2.5 text-sm outline-none focus:ring-1 focus:ring-blue-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] uppercase font-bold text-slate-500 block mb-2 tracking-widest">Notas / Observaciones</label>
                    <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} 
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-3 text-xs outline-none focus:ring-1 focus:ring-blue-500/30 resize-none" placeholder="Garantía, condiciones de pago..." />
                  </div>
                </div>

                <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 space-y-3 mt-auto shadow-inner">
                  <div className="flex justify-between text-xs text-slate-500"><span>Subtotal Bruto</span><span className="font-mono text-slate-300">${subtotal.toFixed(2)}</span></div>
                  {discount > 0 && <div className="flex justify-between text-xs text-green-400"><span>Descuento ({discount}%)</span><span className="font-mono">-${discountAmt.toFixed(2)}</span></div>}
                  <div className="flex justify-between text-xs text-slate-500"><span>IVA ({config.ivaPercent}%)</span><span className="font-mono text-slate-300">${iva.toFixed(2)}</span></div>
                  <div className="flex justify-between text-xl font-black text-green-400 pt-3 border-t border-slate-800 mt-2">
                    <span className="tracking-tighter">TOTAL $</span><span className="font-mono">${total.toFixed(2)}</span>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  <button onClick={handleCreate} disabled={!customerName || items.length === 0}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-30 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] transform flex items-center justify-center gap-2">
                    <span>✅ Confirmar Presupuesto</span>
                  </button>
                  <button onClick={() => setShowNew(false)} className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-300 transition-colors font-bold">CANCELAR</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
