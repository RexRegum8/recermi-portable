import { useState } from 'react'

export function SetupWizard({ onConfigured }: { onConfigured: (config: { mode: 'SERVER' | 'CLIENT', serverIp: string }) => void }) {
  const [mode, setMode] = useState<'SERVER' | 'CLIENT' | null>(null)
  const [ip, setIp] = useState('localhost')

  const handleFinish = () => {
    if (!mode) return
    const config = { mode, serverIp: mode === 'SERVER' ? 'localhost' : ip }
    localStorage.setItem('rexermi_config', JSON.stringify(config))
    onConfigured(config)
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center z-[9999] text-slate-100">
      <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-blue-500/10 rounded-2xl mb-4">
            <span className="text-4xl text-blue-400 font-bold">R</span>
          </div>
          <h1 className="text-2xl font-bold">Bienvenido a Rexermi OS</h1>
          <p className="text-sm text-slate-400 mt-2">Configure su terminal de trabajo para comenzar</p>
        </div>

        <div className="space-y-4">
          <div 
            onClick={() => setMode('SERVER')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${mode === 'SERVER' ? 'bg-blue-600/15 border-blue-500 scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-500/20 rounded-xl text-xl">🖥️</div>
              <div>
                <h3 className="font-bold text-sm">Este es el SERVIDOR</h3>
                <p className="text-[11px] text-slate-400">PC Principal que guarda los datos y los comparte en la red.</p>
              </div>
            </div>
          </div>

          <div 
            onClick={() => setMode('CLIENT')}
            className={`cursor-pointer p-4 rounded-2xl border transition-all ${mode === 'CLIENT' ? 'bg-blue-600/15 border-blue-500 scale-[1.02]' : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}`}
          >
            <div className="flex items-center gap-4">
              <div className="p-3 bg-purple-500/20 rounded-xl text-xl">💻</div>
              <div>
                <h3 className="font-bold text-sm">Esta es una TERMINAL</h3>
                <p className="text-[11px] text-slate-400">PC de empleado que se conectará al servidor de la red.</p>
              </div>
            </div>
          </div>
        </div>

        {mode === 'CLIENT' && (
          <div className="mt-6 animate-in fade-in slide-in-from-top-4 duration-300">
            <label className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-2 block">IP del Servidor (Red Local)</label>
            <input 
              value={ip} 
              onChange={(e) => setIp(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-blue-500 outline-none font-mono"
              placeholder="Ej: 192.168.1.10"
            />
          </div>
        )}

        {mode && (
          <button 
            onClick={handleFinish}
            className="w-full mt-8 bg-blue-600 hover:bg-blue-700 py-4 rounded-2xl font-bold text-sm transition-all shadow-lg shadow-blue-900/40"
          >
            Continuar y Guardar →
          </button>
        )}
      </div>
    </div>
  )
}
