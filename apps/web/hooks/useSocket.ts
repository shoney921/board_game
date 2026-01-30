import { useEffect, useCallback } from 'react'
import { useSocketStore } from '@/stores/socketStore'
import { getSocket } from '@/lib/socket'

export function useSocket() {
  const { isConnected, connect, disconnect } = useSocketStore()

  useEffect(() => {
    connect()
    return () => disconnect()
  }, [connect, disconnect])

  const emit = useCallback(
    <T extends Record<string, unknown>>(event: string, data: T) => {
      const socket = getSocket()
      if (socket.connected) {
        socket.emit(event, data)
      }
    },
    []
  )

  const on = useCallback(
    <T>(event: string, callback: (data: T) => void) => {
      const socket = getSocket()
      socket.on(event, callback)
      return () => {
        socket.off(event, callback)
      }
    },
    []
  )

  return {
    isConnected,
    emit,
    on,
  }
}
