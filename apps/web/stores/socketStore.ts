import { create } from 'zustand'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useUserStore } from './userStore'
import { useRoomStore } from './roomStore'

interface SocketState {
  isConnected: boolean
  error: string | null

  connect: () => void
  disconnect: () => void
  setupListeners: () => void
}

let listenersSetup = false

export const useSocketStore = create<SocketState>((set) => ({
  isConnected: false,
  error: null,

  connect: () => {
    const { user, token } = useUserStore.getState()

    const socket = connectSocket({
      user_id: user?.id,
      username: user?.username,
      token,
    })

    // Only set up listeners once to avoid duplicates
    if (!listenersSetup) {
      listenersSetup = true

      socket.on('connect', () => {
        console.log('Socket connected')
        set({ isConnected: true, error: null })
      })

      socket.on('disconnect', () => {
        console.log('Socket disconnected')
        set({ isConnected: false })
      })

      socket.on('connect_error', (error) => {
        console.log('Socket connect error:', error.message)
        set({ error: error.message, isConnected: false })
      })

      // Setup room listeners
      socket.on('user_joined', (data) => {
        console.log('User joined:', data)
        useRoomStore.getState().addPlayer({
          id: data.user_id,
          username: data.username,
          displayName: data.display_name,
          isReady: false,
          isHost: false,
        })
      })

      socket.on('user_left', (data) => {
        console.log('User left:', data)
        useRoomStore.getState().removePlayer(data.user_id)
      })

      socket.on('player_ready', (data) => {
        useRoomStore.getState().updatePlayerReady(data.user_id, data.is_ready)
      })

      socket.on('room_users', (data) => {
        console.log('Room users received:', data)
        // data.players is array of { user_id, username, display_name }
        if (data.players && Array.isArray(data.players)) {
          const room = useRoomStore.getState().room
          const hostId = room?.hostId
          // Remove duplicates by user_id
          const uniquePlayers = new Map()
          data.players.forEach((p: any) => {
            if (p.user_id && !uniquePlayers.has(p.user_id)) {
              uniquePlayers.set(p.user_id, {
                id: p.user_id,
                username: p.username,
                displayName: p.display_name,
                isReady: false,
                isHost: p.user_id === hostId,
              })
            }
          })
          useRoomStore.getState().setPlayers(Array.from(uniquePlayers.values()))
        }
      })

      socket.on('game_started', (data) => {
        console.log('Game started:', data)
        // Navigate to game page or update state
      })

      socket.on('error', (data) => {
        console.log('Socket error:', data)
        set({ error: data.message })
      })
    }

    // Update isConnected state if already connected
    if (socket.connected) {
      set({ isConnected: true, error: null })
    }
  },

  disconnect: () => {
    disconnectSocket()
    set({ isConnected: false })
  },

  setupListeners: () => {
    const socket = getSocket()

    socket.on('chat_message', (data) => {
      console.log('Chat message:', data)
      // Handle chat messages
    })

    socket.on('game_action', (data) => {
      console.log('Game action:', data)
      // Handle game actions
    })
  },
}))
