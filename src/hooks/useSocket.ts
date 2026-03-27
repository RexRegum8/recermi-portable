import { useEffect, useCallback } from 'react'
import { io, Socket } from 'socket.io-client'
import { getBaseUrl } from '../utils/api'

let socket: Socket | null = null

export function useSocket() {
  useEffect(() => {
    if (!socket) {
      const baseUrl = getBaseUrl()
      console.log(`[SOCKET] Connecting to ${baseUrl}...`)
      socket = io(baseUrl, {
        withCredentials: true,
        transports: ['websocket', 'polling']
      })

      socket.on('connect', () => {
        console.log('[SOCKET] Connected to server')
      })

      socket.on('disconnect', () => {
        console.log('[SOCKET] Disconnected from server')
      })

      socket.on('connect_error', (err) => {
        console.error('[SOCKET] Connection error:', err)
      })
    }

    return () => {
      // We keep the socket alive across components for performance
      // but we could disconnect if needed on certain conditions
    }
  }, [])

  const subscribe = useCallback((event: string, callback: (data: any) => void) => {
    if (!socket) return
    socket.on(event, callback)
    return () => {
      socket?.off(event, callback)
    }
  }, [])

  const emit = useCallback((event: string, data: any) => {
    if (!socket) return
    socket.emit(event, data)
  }, [])

  return { socket, subscribe, emit }
}
