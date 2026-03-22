import { useState } from 'react'
import { useAuth } from '../auth/AuthContext'

export function LoginScreen() {
  const { login, needsSetup, registerUser, refreshSetup, updateConfig } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [storeName, setStoreName] = useState('Rexermi Tech')
  const [storeRIF, setStoreRIF] = useState('')
  const [error, setError] = useState('')
  const [shake, setShake] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    try {
      if (needsSetup) {
        if (!name || !username || !password || !storeName || !storeRIF || !confirmPassword) {
          setError('Todos los campos son obligatorios')
          return
        }
        if (password !== confirmPassword) {
          setError('Las contraseñas no coinciden')
          return
        }
        // Save store config first
        await updateConfig({ storeName, storeRIF })
        // Create admin user
        await registerUser({ name, username, password, role: 'admin', avatar: '👨‍💼' })
        await refreshSetup() // This should set needsSetup to false
        setError('')
        // Auto-login
        await login(username, password)
      } else {
        if (await login(username, password)) {
          // success
        } else {
          setError('Credenciales inválidas')
          setShake(true)
          setTimeout(() => setShake(false), 500)
        }
      }
    } catch (e) {
      setError('Error al conectar con el servidor')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6 relative overflow-hidden">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-600/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-indigo-600/8 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
      </div>

      <div className={`relative w-full max-w-md transition-transform ${shake ? 'animate-[shake_0.5s_ease]' : ''}`}>
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-2xl shadow-2xl shadow-blue-900/40 mb-5">
            <span className="text-4xl font-black text-white">R</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white">Rexermi OS</h1>
          <p className="text-slate-400 mt-1.5 text-sm">
            {needsSetup ? 'Configuración de Administrador Inicial' : 'ERP/POS para Tecnología y Servicio Técnico'}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-slate-900/80 backdrop-blur-xl border border-slate-800 rounded-2xl p-7 shadow-2xl">
          <div className="space-y-4">
            {needsSetup && (
              <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-2">
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-widest mb-1">Primer Inicio Detectado</p>
                <p className="text-xs text-slate-400">Por favor, cree la cuenta del administrador principal para comenzar.</p>
              </div>
            )}
            
            {needsSetup && (
              <div className="grid grid-cols-2 gap-3 pb-2 border-b border-slate-800">
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">Nombre de la Empresa</label>
                  <input type="text" value={storeName} onChange={(e) => setStoreName(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-bold"
                    placeholder="Ej. Rexermi Digital" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-[10px] font-bold text-blue-400 uppercase tracking-wider mb-1.5">RIF / Documento Fiscal</label>
                  <input type="text" value={storeRIF} onChange={(e) => setStoreRIF(e.target.value)}
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600 font-mono"
                    placeholder="Ej. J-12345678-0" required />
                </div>
              </div>
            )}

            {needsSetup && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Nombre del Administrador</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                  placeholder="Ej. Juan Pérez" required />
              </div>
            )}

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                {needsSetup ? 'Correo Electrónico (Administrador)' : 'Usuario o Correo'}
              </label>
              <input type={needsSetup ? "email" : "text"} value={username} onChange={(e) => { setUsername(e.target.value); setError('') }}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                placeholder={needsSetup ? "admin@empresa.com" : "ej. admin@empresa.com o cajero1"} autoFocus required />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Contraseña</label>
              <input type="password" value={password} onChange={(e) => { setPassword(e.target.value); setError('') }}
                className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                placeholder="••••••••" required />
            </div>

            {needsSetup && (
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Confirmar Contraseña</label>
                <input type="password" value={confirmPassword} onChange={(e) => { setConfirmPassword(e.target.value); setError('') }}
                  className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder-slate-600"
                  placeholder="••••••••" required />
              </div>
            )}
            
            {error && <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-sm px-4 py-2.5 rounded-xl text-center font-medium">{error}</div>}
            
            <button type="submit" disabled={isSubmitting}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold py-3 rounded-xl hover:from-blue-500 hover:to-blue-600 transition-all active:scale-[0.98] shadow-lg shadow-blue-900/30 text-sm disabled:opacity-50">
              {isSubmitting ? 'PROCESANDO...' : needsSetup ? 'CREAR ADMINISTRADOR' : 'INGRESAR AL SISTEMA'}
            </button>
          </div>
        </form>
        
        <div className="text-center mt-6 flex flex-col gap-2">
          <p className="text-[10px] text-slate-500 font-medium">
            &copy; 2024 Rexermi Technology. Todos los derechos reservados.
          </p>
          <button 
            onClick={() => { localStorage.removeItem('rexermi_config'); window.location.reload() }}
            className="text-[9px] text-slate-600 hover:text-blue-400 transition-colors bg-white/5 w-fit mx-auto px-2 py-1 rounded"
          >
            🔄 Reiniciar Selección (Terminal/Servidor)
          </button>
        </div>
      </div>

      <style>{`@keyframes shake { 0%,100%{transform:translateX(0)} 10%,30%,50%,70%,90%{transform:translateX(-4px)} 20%,40%,60%,80%{transform:translateX(4px)} }`}</style>
    </div>
  )
}
