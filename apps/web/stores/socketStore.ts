import { create } from 'zustand'
import { connectSocket, disconnectSocket, getSocket } from '@/lib/socket'
import { useUserStore } from './userStore'
import { useRoomStore } from './roomStore'
import { useGameStore } from './gameStore'

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

      // ============================================
      // Room listeners
      // ============================================

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

      socket.on('host_changed', (data: { new_host_id: number }) => {
        console.log('Host changed:', data)
        const { setRoom, room } = useRoomStore.getState()
        if (room) {
          setRoom({ ...room, hostId: data.new_host_id })
        }
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

      // ============================================
      // Avalon game listeners
      // ============================================

      socket.on('game_started', (data) => {
        console.log('Game started:', data)
        if (data.game_type === 'avalon' && data.game_id && data.game_state) {
          useGameStore.getState().setGameStarted(
            data.game_id,
            data.room_id,
            data.game_state
          )
        }
      })

      socket.on('role_assigned', (data) => {
        console.log('Role assigned:', data)
        useGameStore.getState().setRoleAssigned(
          data.role,
          data.team,
          (data.known_info || []).map((info: any) => ({
            userId: info.user_id,
            displayName: info.display_name,
            info: info.info,
          }))
        )
      })

      socket.on('game_state_update', (data) => {
        console.log('[Socket] game_state_update received:', data)
        if (data.state) {
          console.log('[Socket] Calling updateGameState with phase:', data.state.phase, 'round:', data.state.current_round)
          useGameStore.getState().updateGameState(data.state)
          console.log('[Socket] After updateGameState - phase:', useGameStore.getState().game.phase)
        }
      })

      socket.on('team_proposed', (data) => {
        console.log('[Socket] team_proposed received:', data)
        console.log('[Socket] Current game state before update:', {
          phase: useGameStore.getState().game.phase,
          proposedTeam: useGameStore.getState().game.proposedTeam,
        })
        useGameStore.getState().setTeamProposed(
          data.leader_id,
          data.proposed_team
        )
        console.log('[Socket] Game state after setTeamProposed:', {
          phase: useGameStore.getState().game.phase,
          proposedTeam: useGameStore.getState().game.proposedTeam,
        })
      })

      socket.on('team_vote_update', (data) => {
        console.log('Team vote update:', data)
        useGameStore.getState().setTeamVoteUpdate(data.votes_count)
      })

      socket.on('team_vote_result', (data) => {
        console.log('Team vote result:', data)
        useGameStore.getState().setTeamVoteResult(data)
      })

      socket.on('mission_vote_update', (data) => {
        console.log('Mission vote update:', data)
        useGameStore.getState().setMissionVoteUpdate(data.votes_count)
      })

      socket.on('mission_result', (data) => {
        console.log('[Socket] mission_result received:', data)
        console.log('[Socket] Current game state before setMissionResult:', {
          phase: useGameStore.getState().game.phase,
          currentRound: useGameStore.getState().game.currentRound,
          missionResults: useGameStore.getState().game.missionResults,
        })
        useGameStore.getState().setMissionResult(data)
        console.log('[Socket] Game state after setMissionResult:', {
          phase: useGameStore.getState().game.phase,
          currentRound: useGameStore.getState().game.currentRound,
          missionResults: useGameStore.getState().game.missionResults,
        })
      })

      socket.on('assassination_result', (data) => {
        console.log('Assassination result:', data)
        useGameStore.getState().setAssassinationResult(data)
      })

      socket.on('game_ended', (data) => {
        console.log('Game ended:', data)
        useGameStore.getState().setGameEnded(data)
      })

      // ============================================
      // Error handling
      // ============================================

      socket.on('error', (data) => {
        console.log('Socket error:', data)
        set({ error: data.message })
        useGameStore.getState().setError(data.message)
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
