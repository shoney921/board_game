import { create } from 'zustand'
import { getSocket } from '@/lib/socket'

export interface GamePlayer {
  userId: number
  username: string
  displayName: string
  role?: string
  isAlive: boolean
}

export interface GameState {
  id: number | null
  gameType: string
  status: 'setup' | 'in_progress' | 'finished'
  currentRound: number
  phase: string
  players: GamePlayer[]
  publicState: Record<string, unknown>
  winnerTeam?: string
}

interface GameStore {
  game: GameState | null
  isLoading: boolean
  error: string | null

  setGame: (game: GameState | null) => void
  updateGameState: (state: Partial<GameState>) => void

  startGame: (roomId: string, gameType: string) => void
  sendAction: (roomId: string, action: string, payload: Record<string, unknown>) => void
  resetGame: () => void
}

export const useGameStore = create<GameStore>((set, get) => ({
  game: null,
  isLoading: false,
  error: null,

  setGame: (game) => set({ game }),

  updateGameState: (state) => {
    const { game } = get()
    if (game) {
      set({ game: { ...game, ...state } })
    }
  },

  startGame: (roomId, gameType) => {
    const socket = getSocket()
    socket.emit('start_game', { room_id: roomId, game_type: gameType })
  },

  sendAction: (roomId, action, payload) => {
    const socket = getSocket()
    socket.emit('game_action', {
      room_id: roomId,
      action,
      payload,
    })
  },

  resetGame: () => {
    set({
      game: null,
      isLoading: false,
      error: null,
    })
  },
}))
