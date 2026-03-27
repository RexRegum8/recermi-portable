import jwt from 'jsonwebtoken'
import { prisma } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'rexermi-secret-key-2024'

// JWT Cookie Middleware
export const authenticate = async (req, res, next) => {
  let token = req.cookies.auth_token
  
  // Check Authorization header if cookie is missing
  if (!token && req.headers.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.split(' ')[1]
  }

  if (!token) return res.status(401).json({ error: 'No autorizado - Sesión no encontrada' })

  try {
    const decoded = jwt.verify(token, JWT_SECRET)
    const user = await prisma.user.findUnique({ where: { id: decoded.id } })
    if (!user) return res.status(401).json({ error: 'Usuario no válido' })
    
    req.user = user
    next()
  } catch (e) {
    return res.status(401).json({ error: 'Sesión expirada o inválida' })
  }
}

// IP Filtering Middleware (Admin Only)
export const ipFilter = (req, res, next) => {
  const allowedIPs = ['127.0.0.1', '::1', 'localhost']
  const clientIP = req.ip || req.connection.remoteAddress
  
  // Allow local network (192.168.x.x)
  const isLocal = clientIP.startsWith('::ffff:192.168.') || clientIP.startsWith('192.168.') || allowedIPs.includes(clientIP)

  if (!isLocal && req.user?.role === 'ADMIN') {
    console.warn(`[SECURITY] Blocked admin access from external IP: ${clientIP}`)
    return res.status(403).json({ error: 'Acceso administrativo restringido a la red local' })
  }
  
  next()
}
