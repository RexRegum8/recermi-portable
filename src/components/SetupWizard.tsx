import { useState, useEffect } from 'react'
import { useAuth } from '../auth/AuthContext'

interface SetupConfig {
  mode: 'SERVER' | 'CLIENT'
  serverIp: string
  dbPath?: string
}

export function SetupWizard({ onConfigured }: { onConfigured: (config: SetupConfig) => void }) {
  const { setupServer } = useAuth()
  const [step, setStep] = useState<'ROLE' | 'SERVER_DB' | 'CLIENT_CONFIG'>('ROLE')
  const [mode, setMode] = useState<'SERVER' | 'CLIENT' | null>(null)
  
  // Server states
  const [detectedDb, setDetectedDb] = useState<string | null>(null)
  const [selectedDb, setSelectedDb] = useState<string | null>(null)
  
  // Client states
  const [ip, setIp] = useState('localhost')
  const [isTestingConn, setIsTestingConn] = useState(false)

  useEffect(() => {
    if (mode === 'SERVER') {
      // Auto-scan for DB
      (window as any).electronAPI?.checkDbExists().then((exists: boolean) => {
        if (exists) setDetectedDb('DEFAULT')
      })
    }
  }, [mode])

  const handleRoleSelect = (m: 'SERVER' | 'CLIENT') => {
    setMode(m)
    if (m === 'SERVER') setStep('SERVER_DB')
    else setStep('CLIENT_CONFIG')
  }

  const handleExtendSearch = async () => {
    const path = await (window as any).electronAPI.selectDbFile()
    if (path) {
      setSelectedDb(path)
      alert(`Base de datos seleccionada: ${path}`)
    }
  }

  const handleTestConnection = async () => {
    setIsTestingConn(true)
    try {
      const resp = await fetch(`http://${ip}:3001/api/health`)
      if (resp.ok) alert('¡Conexión exitosa con el servidor!')
      else alert('El servidor respondió pero con un error.')
    } catch (e) {
      alert('No se pudo conectar al servidor. Verifica la IP y que el servidor esté encendido.')
    } finally {
      setIsTestingConn(false)
    }
  }

  const handleFinishServer = () => {
    const dbPath = selectedDb || (detectedDb === 'DEFAULT' ? undefined : undefined)
    const config: SetupConfig = { mode: 'SERVER', serverIp: 'localhost', dbPath }
    
    // If a custom path was picked, we need to tell Electron to restart/start the backend with it
    if (dbPath && window.electronAPI) {
      window.electronAPI.startBackend(dbPath)
    }
    
    localStorage.setItem('rexermi_config', JSON.stringify(config))
    setupServer(config)
    onConfigured(config)
  }

  const handleFinishClient = () => {
    const config: SetupConfig = { mode: 'CLIENT', serverIp: ip }
    localStorage.setItem('rexermi_config', JSON.stringify(config))
    setupServer(config)
    onConfigured(config)
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9999] text-slate-100 p-4">
      <div className="max-w-xl w-full p-10 bg-slate-900 border border-slate-800 rounded-[3rem] shadow-2xl overflow-hidden relative">
        
        {/* PROGRESS DECORATION */}
        <div className="absolute top-0 left-0 w-full h-1 bg-slate-800">
           <div className={`h-full bg-blue-600 transition-all duration-500 ${step === 'ROLE' ? 'w-1/3' : 'w-2/3'}`} />
        </div>

        {step === 'ROLE' && (
          <div className="animate-in fade-in zoom-in-95 duration-500">
            <header className="text-center mb-10">
              <div className="w-20 h-20 bg-blue-600/10 rounded-3xl flex items-center justify-center mx-auto mb-6 border border-blue-500/20">
                <span className="text-5xl font-black text-blue-500">R</span>
              </div>
              <h1 className="text-3xl font-black tracking-tight">Configuración de Inicio</h1>
              <p className="text-slate-400 mt-2 text-sm italic">¿Cómo usarás Rexermi en esta computadora?</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div 
                onClick={() => handleRoleSelect('SERVER')}
                className="group cursor-pointer p-8 rounded-[2.5rem] bg-slate-800/40 border border-slate-700 hover:border-blue-500 hover:bg-blue-600/5 transition-all text-center"
              >
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">🖥️</div>
                <h3 className="text-lg font-black mb-2">SERVIDOR</h3>
                <p className="text-xs text-slate-500 leading-relaxed">PC Maestro que gestiona la base de datos y ventas principales.</p>
              </div>

              <div 
                onClick={() => handleRoleSelect('CLIENT')}
                className="group cursor-pointer p-8 rounded-[2.5rem] bg-slate-800/40 border border-slate-700 hover:border-purple-500 hover:bg-purple-600/5 transition-all text-center"
              >
                <div className="text-5xl mb-6 group-hover:scale-110 transition-transform">💻</div>
                <h3 className="text-lg font-black mb-2">TERMINAL</h3>
                <p className="text-xs text-slate-500 leading-relaxed">PC de Empleado que se conecta al servidor mediante la red local.</p>
              </div>
            </div>
          </div>
        )}

        {step === 'SERVER_DB' && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <button onClick={() => setStep('ROLE')} className="text-slate-500 hover:text-white text-xs font-bold mb-6 flex items-center gap-2">← VOLVER</button>
            <h2 className="text-2xl font-black mb-2">Base de Datos</h2>
            <p className="text-sm text-slate-400 mb-8">Detectando información del sistema...</p>

            <div className="space-y-4">
              {detectedDb === 'DEFAULT' && !selectedDb && (
                <div className="p-6 bg-green-500/10 border border-green-500/20 rounded-[2rem] flex items-center justify-between">
                   <div>
                     <p className="text-[10px] font-black text-green-500 uppercase tracking-widest mb-1">¡SISTEMA DETECTADO!</p>
                     <p className="text-sm font-bold">Rexermi DB en la carpeta de usuario</p>
                   </div>
                   <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center text-white">✓</div>
                </div>
              )}

              {selectedDb && (
                <div className="p-6 bg-blue-500/10 border border-blue-500/20 rounded-[2rem]">
                   <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">BASE DE DATOS SELECCIONADA</p>
                   <p className="text-[11px] font-mono break-all opacity-70">{selectedDb}</p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <button 
                   onClick={handleExtendSearch}
                   className="p-5 rounded-3xl bg-slate-800 border border-slate-700 hover:border-slate-500 text-xs font-black transition-all"
                 >
                   🔍 Búsqueda Extendida
                 </button>
                 <button 
                   onClick={() => { setSelectedDb(null); setDetectedDb(null); }}
                   className="p-5 rounded-3xl bg-slate-800 border border-slate-700 hover:border-red-500 hover:text-red-400 text-xs font-black transition-all"
                 >
                   ✨ Crear Nueva App
                 </button>
              </div>
            </div>

            <button 
              onClick={handleFinishServer}
              className="w-full mt-10 bg-blue-600 hover:bg-blue-700 py-5 rounded-[2rem] font-black text-sm transition-all shadow-xl shadow-blue-900/40"
            >
              FINALIZAR Y COMENZAR →
            </button>
          </div>
        )}

        {step === 'CLIENT_CONFIG' && (
          <div className="animate-in slide-in-from-right-10 fade-in duration-500">
            <button onClick={() => setStep('ROLE')} className="text-slate-500 hover:text-white text-xs font-bold mb-6 flex items-center gap-2">← VOLVER</button>
            <h2 className="text-2xl font-black mb-2">Conectar a Servidor</h2>
            <p className="text-sm text-slate-400 mb-8">Ingresa la dirección IP del equipo principal en tu red.</p>

            <div className="space-y-6">
               <div className="bg-slate-800/50 p-6 rounded-[2rem] border border-slate-700">
                  <label className="text-[10px] font-black uppercase text-slate-500 mb-2 block">Dirección IP del Servidor</label>
                  <input 
                    value={ip} 
                    onChange={e => setIp(e.target.value)}
                    placeholder="Ej: 192.168.1.10"
                    className="w-full bg-slate-900 border border-slate-700 rounded-2xl px-6 py-4 text-xl font-mono text-blue-400 outline-none focus:ring-2 focus:ring-blue-500"
                  />
               </div>

               <button 
                 onClick={handleTestConnection}
                 disabled={isTestingConn}
                 className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-[10px] font-black tracking-widest uppercase transition-all"
               >
                 {isTestingConn ? 'Probando...' : '⚡ Probar Conexión'}
               </button>
            </div>

            <button 
              onClick={handleFinishClient}
              className="w-full mt-10 bg-purple-600 hover:bg-purple-700 py-5 rounded-[2rem] font-black text-sm transition-all shadow-xl shadow-purple-900/40"
            >
              GUARDAR CONFIGURACIÓN →
            </button>
          </div>
        )}

      </div>
    </div>
  )
}
