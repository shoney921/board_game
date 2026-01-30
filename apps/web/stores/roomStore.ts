import { create } from 'zustand'
import { api, Room, PlayerInRoom } from '@/lib/api'
import { getSocket } from '@/lib/socket'
import { useUserStore } from './userStore'

interface RoomState {
  room: Room | null
  players: PlayerInRoom[]
  isLoading: boolean
  error: string | null

  setRoom: (room: Room | null) => void
  setPlayers: (players: PlayerInRoom[]) => void
  addPlayer: (player: PlayerInRoom) => void
  removePlayer: (userId: number) => void
  updatePlayerReady: (userId: number, isReady: boolean) => void

  createRoom: (gameType: string) => Promise<void>
  joinRoom: (code: string) => Promise<void>
  leaveRoom: () => void
}

export const useRoomStore = create<RoomState>((set, get) => ({
  room: null,
  players: [],
  isLoading: false,
  error: null,

  setRoom: (room) => set({ room }),
  setPlayers: (players) => set({ players }),

  addPlayer: (player) => {
    const { players } = get()
    if (!players.find(p => p.id === player.id)) {
      set({ players: [...players, player] })
    }
  },

  removePlayer: (userId) => {
    const { players } = get()
    set({ players: players.filter(p => p.id !== userId) })
  },

  updatePlayerReady: (userId, isReady) => {
    const { players } = get()
    set({
      players: players.map(p =>
        p.id === userId ? { ...p, isReady } : p
      ),
    })
  },

  createRoom: async (gameType) => {
    const { user } = useUserStore.getState()
    if (!user) return

    set({ isLoading: true, error: null })
    try {
      const room = await api.createRoom(
        {
          name: `${user.displayName}'s Room`,
          gameType,
          maxPlayers: 10,
          minPlayers: 2, // TODO: 테스트용 임시 설정 (원래 5)
        },
        user.id
      )

      set({
        room: {
          ...room,
          code: room.code,
          name: room.name,
          hostId: (room as any).host_id,
          gameType: (room as any).game_type,
          maxPlayers: (room as any).max_players,
          minPlayers: (room as any).min_players,
        } as Room,
        players: [{
          id: user.id,
          username: user.username,
          displayName: user.displayName,
          isReady: false,
          isHost: true,
        }],
        isLoading: false,
      })

      // Navigate to room
      if (typeof window !== 'undefined') {
        window.location.href = `/room/${room.code}`
      }
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to create room',
        isLoading: false,
      })
    }
  },

  joinRoom: async (code) => {
    const { user } = useUserStore.getState()
    if (!user) return

    set({ isLoading: true, error: null })
    try {
      const room = await api.joinRoom(code)

      set({
        room: {
          ...room,
          code: room.code,
          name: room.name,
          hostId: (room as any).host_id,
          gameType: (room as any).game_type,
          maxPlayers: (room as any).max_players,
          minPlayers: (room as any).min_players,
        } as Room,
        isLoading: false,
      })
      // Note: Socket join_room is emitted in room page after socket is connected
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to join room',
        isLoading: false,
      })
    }
  },

  leaveRoom: () => {
    const { room } = get()
    const { user } = useUserStore.getState()

    if (room && user) {
      const socket = getSocket()
      socket.emit('leave_room', {
        room_id: room.code,
        user_id: user.id,
        username: user.username,
      })
    }

    set({ room: null, players: [] })
  },
}))
