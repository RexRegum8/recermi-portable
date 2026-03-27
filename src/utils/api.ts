export const getBaseUrl = () => {
  // Check if running in browser (Catalog) and NOT in Electron
  if (typeof window !== 'undefined' && !(window as any).electronAPI) {
    return ''; // Relative paths for web catalog (Cloudflare friendly)
  }

  const savedConfig = localStorage.getItem('rexermi_config')
  const serverIp = savedConfig ? JSON.parse(savedConfig).serverIp : 'localhost'
  return `http://${serverIp}:3001`
}

export const fetchWithAuth = async (url: string, options: RequestInit = {}) => {
  const baseUrl = getBaseUrl()
  const fullUrl = url.startsWith('http') ? url : `${baseUrl}${url.startsWith('/') ? '' : '/'}${url}`
  
  const token = localStorage.getItem('auth_token') || localStorage.getItem('customerToken')
  const authHeader = token ? { 'Authorization': `Bearer ${token}` } : {}

  return fetch(fullUrl, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...authHeader,
      ...options.headers,
    }
  })
}

