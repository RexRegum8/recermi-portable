import { useState, useEffect } from 'react'
import { QRCodeSVG } from 'qrcode.react'
import { useAuth } from '../auth/AuthContext'
import { useSales, SaleRecord } from '../store/SalesContext'
import { useProductStore } from '../store/ProductStore'
import { getBaseUrl } from '../utils/api'

interface CartItem {
  id: string; sku: string; name: string; price: number; quantity: number; discount: number; warrantyDays: number; stock: number
}

type PaymentMethod = 'efectivo_usd' | 'efectivo_bs' | 'tarjeta' | 'zelle' | 'pago_movil' | 'mixto'
const PAYMENT_METHODS: { id: PaymentMethod; label: string; icon: string }[] = [
  { id: 'efectivo_usd', label: 'Efectivo $', icon: '💵' },
  { id: 'efectivo_bs', label: 'Efectivo Bs', icon: '💴' },
  { id: 'tarjeta', label: 'Tarjeta', icon: '💳' },
  { id: 'zelle', label: 'Zelle', icon: '⚡' },
  { id: 'pago_movil', label: 'P. Móvil', icon: '📱' },
  { id: 'mixto', label: 'Mixto', icon: '🔀' },
]

export function POSComponent() {
  const { user, config, isAdmin, updateConfig } = useAuth()
  const { addSale, dailySales, activeSession, refreshSales } = useSales()
  const { products, refreshProducts } = useProductStore()
  
  const [cart, setCart] = useState<CartItem[]>([])
  const [query, setQuery] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('efectivo_usd')
  const [globalDiscount, setGlobalDiscount] = useState(0)
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showQR, setShowQR] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<string>('Todos')
  const [mixedBreakdown, setMixedBreakdown] = useState<{ usd: number; bs: number; methodBs: string }>({ usd: 0, bs: 0, methodBs: 'pago_movil' })

  // Customer Linking
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null)
  const [custQuery, setCustQuery] = useState('')
  const [customers, setCustomers] = useState<any[]>([])
  const [filteredCust, setFilteredCust] = useState<any[]>([])

  const categories = ['Todos', ...Array.from(new Set(products.map(p => p.category || 'Otros')))]

  // Quick Edit Rates
  const [isEditingBCV, setIsEditingBCV] = useState(false)
  const [isEditingUSDT, setIsEditingUSDT] = useState(false)
  const [tempRate, setTempRate] = useState('')

  const { exchangeRateBCV, exchangeRateUSDT, ivaPercent, storeName, storeRIF } = config

  const fetchCustomers = async () => {
    try {
      const res = await fetch(`${getBaseUrl()}/api/customers`)
      const data = await res.json()
      setCustomers(data)
    } catch (e) {
      console.error(e)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  useEffect(() => {
    if (custQuery.length > 1) {
      setFilteredCust(customers.filter((c: any) => c.name?.toLowerCase().includes(custQuery.toLowerCase()) || (c.cedula && c.cedula.includes(custQuery)) || (c.email && c.email?.toLowerCase().includes(custQuery.toLowerCase()))))
    } else {
      setFilteredCust([])
    }
  }, [custQuery, customers])

  const selectCustomer = async (c: any) => {
    // Show Optimistic UI
    setSelectedCustomer(c)
    setCustQuery('')
    
    // Auto-sync from backend to capture real-time pendingDiscount applied via web
    try {
      const res = await fetch(`${getBaseUrl()}/api/customers`)
      const data = await res.json()
      setCustomers(data)
      const updated = data.find((x: any) => x.id === c.id) || c
      setSelectedCustomer(updated)
      if (updated.pendingDiscount && updated.pendingDiscount > 0) {
        setGlobalDiscount(updated.pendingDiscount)
      } else {
        setGlobalDiscount(0)
      }
    } catch (e) {
      if (c.pendingDiscount && c.pendingDiscount > 0) setGlobalDiscount(c.pendingDiscount)
      else setGlobalDiscount(0)
    }
  }

  const removeCustomer = () => {
    setSelectedCustomer(null)
    setGlobalDiscount(0)
  }

  const handleUpdateBCV = () => {
    const val = parseFloat(tempRate)
    if (!isNaN(val) && val > 0) updateConfig({ exchangeRateBCV: val })
    setIsEditingBCV(false)
  }

  const handleUpdateUSDT = () => {
    const val = parseFloat(tempRate)
    if (!isNaN(val) && val > 0) updateConfig({ exchangeRateUSDT: val })
    setIsEditingUSDT(false)
  }

  const addToCart = (sku: string) => {
    const product = products.find((p) => p.sku?.toLowerCase() === sku.toLowerCase() || p.name?.toLowerCase().includes(sku.toLowerCase()))
    if (!product) return
    
    if (product.stock <= 0) {
      alert(`El producto ${product.name} no tiene stock disponible.`)
      return
    }

    setCart((prev) => {
      const ex = prev.find((i) => i.id === product.id)
      if (ex) {
        if (ex.quantity + 1 > product.stock) {
          alert(`Stock insuficiente para ${product.name}.`)
          return prev
        }
        return prev.map((i) => i.id === product.id ? { ...i, quantity: i.quantity + 1 } : i)
      }
      return [...prev, { ...product, quantity: 1, discount: 0, warrantyDays: 30, stock: product.stock } as CartItem]
    })
    setQuery('')
  }

  const updateCartItem = (id: string, updates: Partial<CartItem>) => {
    setCart((prev) => prev.map((i) => {
      if (i.id === id) {
        const prod = products.find(p => p.id === id)
        if (updates.quantity && prod && updates.quantity > prod.stock) {
          alert(`Solo hay ${prod.stock} disponibles.`)
          return i
        }
        return { ...i, ...updates }
      }
      return i
    }).filter((i) => i.quantity > 0))
  }

  const subtotal = cart.reduce((a, i) => a + i.price * i.quantity * (1 - i.discount / 100), 0)
  const discountAmt = subtotal * (globalDiscount / 100)
  const afterDiscount = subtotal - discountAmt
  const iva = afterDiscount * (ivaPercent / 100)
  const total = afterDiscount + iva
  
  // Correction: USDT Reference
  // Usually, if Total = 100 USD, Total Bs = 3600 (BCV 36).
  // If USDT = 38.5, then Total USDT = 3600 / 38.5 = 93.50 USDT.
  const totalBs = total * exchangeRateBCV
  const totalUSDT = totalBs / (exchangeRateUSDT || exchangeRateBCV)

  const processSale = async () => {
    if (cart.length === 0) return
    const now = new Date()
    const saleId = `V-${String(dailySales.length + 1).padStart(4, '0')}`

    let finalMethod = PAYMENT_METHODS.find((m) => m.id === paymentMethod)?.label || ''
    if (paymentMethod === 'mixto') {
      finalMethod = `Mixto ($${mixedBreakdown.usd} + ${mixedBreakdown.bs}Bs via ${mixedBreakdown.methodBs})`
    }

    const record: SaleRecord = {
      id: saleId,
      saleNumber: saleId,
      items: cart.map((i) => ({ 
        productId: i.id, sku: i.sku, name: i.name, qty: i.quantity, price: i.price, 
        discount: i.discount, warrantyDays: i.warrantyDays 
      })),
      subtotal, globalDiscount, iva, total,
      totalBs,
      paymentMethod: finalMethod,
      cashier: user?.name || '',
      date: now.toISOString().split('T')[0],
      time: now.toLocaleTimeString('es-VE', { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      customerId: selectedCustomer?.id || null
    }
    
    try {
      await addSale(record)
      await refreshProducts()
      setCart([])
      setGlobalDiscount(0)
      setSelectedCustomer(null)
      setShowPaymentModal(false)
      setShowQR(saleId)
    } catch (e: any) {
      alert(e.message || 'Error al procesar la venta.')
    }
  }

  const handlePrintTicket = () => {
    const printWindow = window.open('', '_blank')
    if (!printWindow) return
    const itemsHtml = cart.map(i => `
      <tr>
        <td style="padding: 4px 0;">${i.name} (x${i.quantity})<br><small>Garantía: ${i.warrantyDays} días</small></td>
        <td style="text-align: right; vertical-align: top;">$${(i.price * i.quantity * (1-i.discount/100)).toFixed(2)}</td>
      </tr>
    `).join('')

    printWindow.document.write(`
      <html>
        <head>
          <title>Ticket Rexermi</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #333; max-width: 300px; margin: 0 auto; line-height: 1.2; }
            h2 { text-align: center; margin-bottom: 5px; }
            .info { text-align: center; font-size: 10px; margin-bottom: 15px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            .total-row { font-weight: bold; border-top: 1px dashed #ccc; }
            .footer { text-align: center; font-size: 9px; margin-top: 20px; border-top: 1px solid #eee; padding-top: 10px; }
          </style>
        </head>
        <body>
          <h2>${config.storeName}</h2>
          <div class="info">${config.storeRIF}<br>${config.storeAddress}<br>${new Date().toLocaleString()}</div>
          ${selectedCustomer ? `<div style="font-size: 10px; margin-bottom: 10px;">Cliente: ${selectedCustomer.name}<br>CI: ${selectedCustomer.ci || 'N/A'}</div>` : ''}
          <table>
            <thead><tr><th align="left">Desc.</th><th align="right">Total</th></tr></thead>
            <tbody>${itemsHtml}</tbody>
            <tr class="total-row"><td style="padding-top: 10px;">TOTAL USD</td><td align="right" style="padding-top: 10px;">$${total.toFixed(2)}</td></tr>
            <tr><td>Total Bs (BCV)</td><td align="right">${totalBs.toFixed(2)}</td></tr>
            <tr><td>Total USDT</td><td align="right">${totalUSDT.toFixed(2)}</td></tr>
          </table>
          <div class="footer">¡Gracias por preferirnos!<br>Conserve su recibo para la garantía.</div>
          <script>window.print(); window.close();</script>
        </body>
      </html>
    `)
    printWindow.document.close()
  }

  const filteredItems = query.length > 0 ? products.filter((p) => 
    p.sku?.toLowerCase().includes(query.toLowerCase()) || 
    p.name?.toLowerCase().includes(query.toLowerCase()) || 
    p.tags?.some(t => t?.toLowerCase().includes(query.toLowerCase()))
  ) : []

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-slate-50 p-4">
      <header className="flex justify-between items-center mb-3">
        <div>
          <h1 className="text-lg font-bold tracking-tight">Punto de Venta <span className="text-blue-400 text-sm font-medium">Rexermi POS</span></h1>
          <p className="text-[10px] text-slate-500">Cajero: {user?.name} | {activeSession ? '✅ Sesión Abierta' : '❌ Sesión Cerrada'}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* BCV */}
          <div className="relative">
            <button onClick={() => { if (isAdmin) { setIsEditingBCV(true); setTempRate(exchangeRateBCV.toString()) } }}
              className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] flex items-center gap-2 hover:border-blue-500/50 transition-all">
              BCV: <span className="font-mono text-green-400 font-bold">{exchangeRateBCV.toFixed(2)}</span>
            </button>
            {isEditingBCV && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl w-40">
                <input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} autoFocus className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono outline-none mb-2" />
                <button onClick={handleUpdateBCV} className="w-full bg-blue-600 text-[10px] py-1 rounded font-bold">ACTUALIZAR</button>
              </div>
            )}
          </div>
          {/* USDT */}
          <div className="relative">
            <button onClick={() => { if (isAdmin) { setIsEditingUSDT(true); setTempRate(exchangeRateUSDT.toString()) } }}
              className="bg-slate-900 px-2.5 py-1.5 rounded-lg border border-slate-800 text-[10px] flex items-center gap-2 hover:border-blue-500/50 transition-all">
              USDT: <span className="font-mono text-cyan-400 font-bold">{exchangeRateUSDT.toFixed(2)}</span>
            </button>
            {isEditingUSDT && (
              <div className="absolute top-full right-0 mt-2 z-50 bg-slate-800 border border-slate-700 p-3 rounded-xl shadow-2xl w-40">
                <input type="number" step="0.01" value={tempRate} onChange={(e) => setTempRate(e.target.value)} autoFocus className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs font-mono outline-none mb-2" />
                <button onClick={handleUpdateUSDT} className="w-full bg-blue-600 text-[10px] py-1 rounded font-bold">ACTUALIZAR</button>
              </div>
            )}
          </div>
          <button onClick={async () => { await refreshSales(); await refreshProducts(); }} className="p-1.5 bg-slate-900 border border-slate-800 rounded-lg text-xs hover:text-blue-400">🔄</button>
        </div>
      </header>

      <div className="flex gap-3 flex-1 min-h-0">
        {/* Left: Cart & Catalog */}
        <section className="flex-1 flex flex-col bg-slate-900/40 rounded-xl border border-slate-800 overflow-hidden">
          <div className="p-3 border-b border-slate-800">
            <input type="text" placeholder="🔍 Buscar producto..." className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
              value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addToCart(query)} />
            {filteredItems.length > 0 && query.length > 1 && (
              <div className="absolute mt-1 left-0 right-0 mx-4 z-50 bg-slate-800 border border-slate-700 rounded-lg shadow-2xl overflow-hidden max-h-60 overflow-y-auto">
                {filteredItems.map(p => (
                  <div key={p.id} onClick={() => addToCart(p.sku)} className="p-2 hover:bg-blue-600/20 cursor-pointer flex justify-between border-b border-slate-700/50 last:border-0">
                    <div className="text-xs">
                      <div className="font-bold">{p.name}</div>
                      <div className="text-[9px] text-slate-500">{p.sku} | {p.category}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-green-400 font-bold">${p.price}</div>
                      <div className="text-[9px] text-slate-500">Stock: {p.stock}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          
          <div className="flex-1 overflow-auto p-3">
            {cart.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-700">
                <span className="text-5xl opacity-20 mb-2">🛒</span>
                <p className="text-xs font-bold uppercase tracking-widest opacity-30">Punto de Venta Vacío</p>
              </div>
            ) : (
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="text-slate-500 uppercase text-[9px] border-b border-slate-800 pb-2">
                    <th className="pb-2">Articulo</th>
                    <th className="pb-2 text-center">Cant</th>
                    <th className="pb-2 text-center">Garantía</th>
                    <th className="pb-2 text-right">Precio</th>
                    <th className="pb-2 text-right">Total</th>
                    <th className="pb-2"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/30">
                  {cart.map(i => (
                    <tr key={i.id} className="hover:bg-slate-800/10 group">
                      <td className="py-2.5">
                        <div className="font-bold text-[13px]">{i.name}</div>
                        <div className="text-[9px] text-slate-500 font-mono">{i.sku}</div>
                      </td>
                      <td className="py-2.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button onClick={() => updateCartItem(i.id, { quantity: i.quantity - 1 })} className="w-5 h-5 bg-slate-800 rounded">-</button>
                          <span className="w-6 font-bold">{i.quantity}</span>
                          <button onClick={() => updateCartItem(i.id, { quantity: i.quantity + 1 })} className="w-5 h-5 bg-slate-800 rounded">+</button>
                        </div>
                      </td>
                      <td className="py-2.5 text-center">
                        <input type="number" value={i.warrantyDays} onChange={e => updateCartItem(i.id, { warrantyDays: Number(e.target.value) })}
                          className="w-12 bg-slate-800 border border-slate-700 rounded px-1 text-center py-0.5 text-[10px]" />
                        <span className="text-[8px] text-slate-500 ml-1">días</span>
                      </td>
                      <td className="py-2.5 text-right font-mono text-slate-300">${i.price.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-mono font-bold text-blue-400">${(i.price * i.quantity * (1-i.discount/100)).toFixed(2)}</td>
                      <td className="py-2.5 text-right"><button onClick={() => updateCartItem(i.id, { quantity: 0 })} className="text-slate-700 hover:text-red-400 px-2 transition-colors">✕</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </section>

        {/* Right Sidebar: Totals & Customer */}
        <aside className="w-72 flex flex-col gap-3">
          {/* Total Panel */}
          <div className="bg-blue-600 rounded-2xl p-4 shadow-xl shadow-blue-900/40 text-white relative overflow-hidden">
             <div className="absolute top-0 right-0 -mr-4 -mt-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
             <div className="relative">
               <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Total Venta</p>
               <h2 className="text-3xl font-black font-mono tracking-tighter mt-1">${total.toFixed(2)}</h2>
               <div className="mt-2 space-y-1 opacity-80 font-mono text-xs">
                 <div className="flex justify-between"><span>Bs BCV:</span><span>{totalBs.toFixed(2)}</span></div>
                 <div className="flex justify-between"><span>USDT:</span><span>{totalUSDT.toFixed(2)}</span></div>
               </div>
               <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-2 gap-2 text-[10px]">
                 <div>Subtotal: ${subtotal.toFixed(2)}</div>
                 <div>IVA: ${iva.toFixed(2)}</div>
               </div>
             </div>
          </div>

          {/* Customer Selection */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Cliente / Fidelización</label>
            {!selectedCustomer ? (
              <div className="relative">
                <input value={custQuery} onChange={e => setCustQuery(e.target.value)} placeholder="🔍 Buscar cliente registrado..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs outline-none focus:ring-1 focus:ring-blue-500" />
                {filteredCust.length > 0 && (
                  <div className="absolute mt-1 w-full bg-slate-800 border border-slate-700 rounded-lg shadow-2xl z-[60] overflow-hidden">
                    {filteredCust.map(c => (
                      <div key={c.id} onClick={() => selectCustomer(c)} className="p-2 hover:bg-blue-600/20 cursor-pointer border-b border-slate-700/50 last:border-0">
                        <div className="text-xs font-bold text-slate-200">
                          {c.name}
                          {c.pendingDiscount > 0 && <span className="ml-2 text-[9px] bg-yellow-500/20 text-yellow-500 px-1 py-0.5 rounded uppercase font-black">-{c.pendingDiscount}%</span>}
                        </div>
                        <div className="flex justify-between text-[9px]">
                          <span className="text-slate-500">{c.ci || 'Sin CI'}</span>
                          <span className="text-blue-400 font-bold">{c.points} pts</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[8px] text-slate-600 mt-2 text-center">Deje en blanco para venta anónima</p>
              </div>
            ) : (
              <div className="flex items-center justify-between bg-blue-600/10 border border-blue-500/30 p-2 rounded-lg">
                <div className="flex-1">
                  <div className="text-xs font-bold text-blue-400 flex items-center gap-2">
                    {selectedCustomer.name}
                    {selectedCustomer.pendingDiscount > 0 && <span className="text-[9px] bg-yellow-500/20 text-yellow-500 px-1.5 py-0.5 rounded font-black uppercase">CUPÓN -{selectedCustomer.pendingDiscount}%</span>}
                  </div>
                  <div className="text-[10px] text-blue-500/80">{selectedCustomer.points} puntos actuales</div>
                </div>
                <button onClick={removeCustomer} className="text-blue-500 hover:text-blue-300">✕</button>
              </div>
            )}
          </div>

          {/* Payment Method */}
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-3">
            <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Método de Pago</label>
            <div className="grid grid-cols-3 gap-1.5">
              {PAYMENT_METHODS.map(m => (
                <button key={m.id} onClick={() => setPaymentMethod(m.id)}
                  className={`p-2 rounded-lg border text-center transition-all ${paymentMethod === m.id ? 'bg-blue-600/10 border-blue-500 text-blue-400' : 'bg-slate-950 border-slate-800 text-slate-600 hover:border-slate-700'}`}>
                  <span className="text-lg block mb-0.5">{m.icon}</span>
                  <span className="text-[8px] font-bold uppercase">{m.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2 mt-auto">
            <button onClick={() => setShowPaymentModal(true)} disabled={cart.length === 0 || !activeSession}
              className="w-full bg-slate-50 text-slate-950 font-black py-3.5 rounded-2xl shadow-xl hover:bg-white active:scale-95 transition-all disabled:opacity-20">
              💳 COBRAR AHORA
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={handlePrintTicket} disabled={cart.length === 0} className="bg-slate-900 border border-slate-800 py-2 rounded-xl text-xs font-bold hover:bg-slate-800">🖨️ Ticket</button>
              <button disabled className="bg-slate-900 border border-slate-800 py-2 rounded-xl text-xs font-bold opacity-30 cursor-not-allowed">🧾 Factura</button>
            </div>
            <button onClick={() => setCart([])} className="text-[9px] font-bold text-slate-600 hover:text-red-400 transition-colors uppercase tracking-widest mt-1">Vaciar Carrito</button>
          </div>
        </aside>
      </div>

      {/* Payment Confirmation Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-6">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-hidden animate-in zoom-in-95" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-black">Confirmar Pago</h2>
                <p className="text-xs text-slate-500 uppercase tracking-widest font-bold">Verificación de Transacción</p>
              </div>
              <button onClick={() => setShowPaymentModal(false)} className="text-slate-500 hover:text-white">✕</button>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex justify-between items-end border-b border-slate-800 pb-4">
                <span className="text-slate-500 text-xs font-bold uppercase">Total a Cobrar</span>
                <span className="text-4xl font-black font-mono text-green-400">${total.toFixed(2)}</span>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Equiv. BCV</p>
                  <p className="text-sm font-mono font-bold text-slate-200">{totalBs.toFixed(2)} Bs</p>
                </div>
                <div className="bg-slate-950/50 p-3 rounded-2xl border border-slate-800">
                  <p className="text-[9px] text-slate-500 uppercase font-bold mb-1">Equiv. USDT</p>
                  <p className="text-sm font-mono font-bold text-cyan-400">{totalUSDT.toFixed(2)} USDT</p>
                </div>
              </div>

              {paymentMethod === 'mixto' && (
                <div className="bg-slate-900 border-2 border-dashed border-blue-500/30 p-4 rounded-2xl space-y-3">
                   <p className="text-[10px] font-black text-blue-400 text-center uppercase tracking-widest">Desglose Pago Mixto</p>
                   <div className="flex gap-3">
                      <div className="flex-1">
                        <label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Monto USD</label>
                        <input type="number" value={mixedBreakdown.usd} onChange={e => setMixedBreakdown({...mixedBreakdown, usd: Number(e.target.value)})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-2 py-2 text-sm font-mono outline-none focus:ring-1 focus:ring-blue-500" />
                      </div>
                      <div className="flex-1">
                        <label className="text-[8px] text-slate-500 font-bold uppercase block mb-1">Método Bs</label>
                        <select value={mixedBreakdown.methodBs} onChange={e => setMixedBreakdown({...mixedBreakdown, methodBs: e.target.value})}
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg px-1 py-2 text-[10px] outline-none">
                          <option value="pago_movil">Pago Móvil</option>
                          <option value="tarjeta">Tarjeta (Punto)</option>
                          <option value="efectivo_bs">Efectivo Bs</option>
                        </select>
                      </div>
                   </div>
                   <div className="flex justify-between items-center text-xs font-bold pt-2 border-t border-slate-800">
                     <span className="text-slate-500 uppercase">Restante por cobrar:</span>
                     <span className="text-green-400 font-mono">{(totalBs - (mixedBreakdown.usd * exchangeRateBCV)).toFixed(2)} Bs</span>
                   </div>
                   <button onClick={() => setMixedBreakdown({...mixedBreakdown, bs: Number((totalBs - (mixedBreakdown.usd * exchangeRateBCV)).toFixed(2))})}
                     className="w-full py-1.5 bg-slate-800 hover:bg-blue-600/20 text-[9px] font-bold rounded-lg transition-all border border-slate-700">
                     AUTOCOMPLETAR EN BS
                   </button>
                </div>
              )}

              <div className="bg-slate-950/20 rounded-2xl p-4 space-y-2 border border-slate-800/50">
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Método de Pago:</span>
                  <span className="font-bold text-slate-200 uppercase">{PAYMENT_METHODS.find(m => m.id === paymentMethod)?.label}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-slate-500">Puntos a Ganar:</span>
                  <span className="font-bold text-blue-400">+{Math.floor(total / 10)} pts</span>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setShowPaymentModal(false)} className="flex-1 py-3.5 rounded-2xl bg-slate-800 font-bold text-sm hover:bg-slate-700 transition-all">CANCELAR</button>
              <button onClick={processSale} className="flex-1 py-3.5 rounded-2xl bg-green-600 font-black text-sm hover:bg-green-500 shadow-xl shadow-green-900/40 transition-all">FINALIZAR COBRO</button>
            </div>
          </div>
        </div>
      )}

      {/* Success QR Overlay */}
      {showQR && (
        <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-xl flex items-center justify-center z-50 animate-in fade-in" onClick={() => setShowQR(null)}>
          <div className="bg-white p-8 rounded-[2rem] text-center shadow-2xl max-w-xs w-full animate-in zoom-in-90 duration-300" onClick={e => e.stopPropagation()}>
            <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center text-3xl mx-auto mb-4">✓</div>
            <h3 className="text-xl font-black text-slate-900 mb-1">¡Pago Exitoso!</h3>
            <p className="text-slate-500 text-xs font-bold uppercase tracking-widest mb-6">{showQR}</p>
            <div className="bg-slate-50 p-4 rounded-2xl inline-block mb-6 border border-slate-100">
              <QRCodeSVG value={JSON.stringify({ saleId: showQR, date: new Date().toISOString() })} size={140} />
            </div>
            <div className="flex flex-col gap-2">
              <button onClick={() => { handlePrintTicket(); setShowQR(null) }} className="w-full bg-blue-600 text-white py-3 rounded-2xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700">🖨️ IMPRIMIR TICKET</button>
              <button onClick={() => setShowQR(null)} className="w-full py-2 text-slate-400 text-xs font-bold hover:text-slate-800">CERRAR</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
