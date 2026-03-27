import React, { useState, useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import { AuthProvider } from './auth/AuthContext'
import { SalesProvider } from './store/SalesContext'
import { ProductStoreProvider } from './store/ProductStore'
import { CustomerProvider } from './store/CustomerContext'
import { CatalogApp } from './catalog/CatalogApp'
import './index.css'

import { SetupWizard } from './components/SetupWizard'

function Root() {
  const hostname = window.location.hostname
  const isCatalog = hostname.includes('rexermidigital') || 
                    (hostname.includes('rexermi.uk') && !window.location.search.includes('admin=true')) || 
                    window.location.search.includes('catalog=true')

  const [config, setConfig] = useState(() => {
    const saved = localStorage.getItem('rexermi_config')
    return saved ? JSON.parse(saved) : null
  })

  // Start backend if in electron and intended to be local
  useEffect(() => {
    if (window.electronAPI) {
      if (config?.mode === 'SERVER' || config?.serverIp === 'localhost' || config?.serverIp === '127.0.0.1') {
        window.electronAPI.startBackend()
      }
    }
  }, [config])

  return (
    <ProductStoreProvider>
      {isCatalog ? (
        <CustomerProvider>
          <CatalogApp />
        </CustomerProvider>
      ) : (
        <AuthProvider>
          {!config ? (
            <SetupWizard onConfigured={setConfig} />
          ) : (
            <SalesProvider>
              <App />
            </SalesProvider>
          )}
        </AuthProvider>
      )}
    </ProductStoreProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
