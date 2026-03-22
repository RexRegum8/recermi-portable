export const getBaseUrl = () => {
  const savedConfig = localStorage.getItem('rexermi_config')
  const serverIp = savedConfig ? JSON.parse(savedConfig).serverIp : 'localhost'
  return `http://${serverIp}:3001`
}
